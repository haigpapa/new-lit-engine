/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import useStore from './store'
import {queryLlm} from './llm'
import {queryPrompt, findConnectionPrompt, createExpansionPrompt, createSummaryPrompt, createBookGridPrompt} from './prompts'
import * as THREE from 'three'
import { searchLiterary, findApiKeyForNode, ensureBookImage, ensureAuthorImage, findBookForGrid } from './libraryApi';

const get = useStore.getState
const set = useStore.setState

const nodeColors = {
  book: '#0891b2',
  author: '#f59e0b',
  theme: '#2dd4bf',
}

/**
 * Robustly parses a JSON object from a string that may contain markdown code fences.
 * @param {string} text The text from the LLM response.
 * @returns {object} The parsed JSON object.
 */
function parseLlmJson(text) {
    if (!text) throw new Error("LLM response is empty.");
    // Look for a JSON block inside markdown fences or a raw JSON object.
    const match = text.match(/```json\s*([\s\S]*?)\s*```|({[\s\S]*})/);
    if (!match) {
        // Fallback for cases where the LLM might just return the JSON without fences.
        try {
            return JSON.parse(text);
        } catch (e) {
            console.error("Failed to parse LLM response:", text);
            throw new Error("No valid JSON found in LLM response.");
        }
    }
    // Use the first capturing group that matched (either from the markdown block or the raw object)
    const jsonString = match[1] || match[2];
    return JSON.parse(jsonString);
}


/**
 * Enriches a list of nodes in the background by fetching API keys and image URLs.
 * This allows the UI to update instantly while data loads progressively.
 * @param {string[]} nodeIds An array of node IDs to enrich.
 */
export const backgroundEnrichNodes = async (nodeIds) => {
    const nodesToEnrich = nodeIds.map(id => get().nodes[id]).filter(Boolean);

    for (const node of nodesToEnrich) {
        // Create a copy to work with, to avoid issues with stale state in the loop
        let currentNodeState = get().nodes[node.id];
        if (!currentNodeState) continue; // Node might have been removed

        // 1. Enrich with API Key
        if ((currentNodeState.type === 'book' || currentNodeState.type === 'author') && !currentNodeState.api_key) {
            const apiKey = await findApiKeyForNode(currentNodeState);
            if (apiKey) {
                set(state => { if(state.nodes[node.id]) state.nodes[node.id].api_key = apiKey; });
                currentNodeState.api_key = apiKey; // Update local copy for next step
            }
        }

        // 2. Fetch Image URL
        if (!currentNodeState.imageUrl) {
            let imageUrl = null;
            if (currentNodeState.type === 'author') {
                imageUrl = await ensureAuthorImage(currentNodeState);
            } else if (currentNodeState.type === 'book') {
                imageUrl = await ensureBookImage(currentNodeState);
            }
            if (imageUrl) {
                 set(state => { if(state.nodes[node.id]) state.nodes[node.id].imageUrl = imageUrl; });
            }
        }
    }
};


export const addNewDataToGraph = async (data, timestamp, sourcePosition = [0, 0, 0], options = {}) => {
  const { skipEnrichment = false } = options;

  if (!data || !data.nodes || data.nodes.length === 0) return { primaryNodeId: null, newNodeIds: [] };

  const {nodes: newNodes, edges: newEdges, commentary, groundingSources } = data;
  const primaryNode = newNodes[0];
  const primaryNodeId = primaryNode ? `${primaryNode.type}:${primaryNode.label}` : null;
  const newNodeIds = [];

  set(state => {
    state.caption = commentary;

    const queryTimestamp = timestamp ?? state.latestQueryTimestamp ?? Date.now()

    newNodes.forEach((node, index) => {
      const id = `${node.type}:${node.label}`;
      if (!state.nodes[id]) {
        newNodeIds.push(id);
        
        let position;
        const nodeIndex = Object.keys(state.nodes).length;
        const totalNodesEstimate = nodeIndex + newNodes.length;
        const radius = 15 + Math.cbrt(nodeIndex) * 5;

        const y = 1 - (nodeIndex / (Math.max(1, totalNodesEstimate - 1))) * 2;
        const radiusAtY = Math.sqrt(1 - y * y);
        const theta = (Math.PI * (3 - Math.sqrt(5))) * nodeIndex;

        position = [
          Math.cos(theta) * radiusAtY * radius,
          y * radius,
          Math.sin(theta) * radiusAtY * radius
        ];
        
        state.nodes[id] = {
          id,
          label: node.label,
          type: node.type,
          description: node.description,
          publicationYear: node.publicationYear,
          series: node.series,
          api_key: node.api_key,
          imageUrl: node.imageUrl,
          aiSummary: null,
          position,
          initialPosition: timestamp === 0 ? undefined : sourcePosition,
          color: nodeColors[node.type] || '#ffffff',
          lastUpdated: queryTimestamp,
          groundingSources: (index === 0 && groundingSources) ? groundingSources : null,
        }
      } else {
        state.nodes[id].lastUpdated = queryTimestamp;
        if (node.publicationYear && !state.nodes[id].publicationYear) state.nodes[id].publicationYear = node.publicationYear;
        if (node.series && !state.nodes[id].series) state.nodes[id].series = node.series;
        if (node.api_key && !state.nodes[id].api_key) state.nodes[id].api_key = node.api_key;
        if (node.imageUrl && !state.nodes[id].imageUrl) state.nodes[id].imageUrl = node.imageUrl;
      }
    })

    const existingEdges = new Set(state.edges.map(e => `${e.source}->${e.target}`));
    newEdges.forEach(edge => {
      const sourceNode = Object.values(state.nodes).find(n => n.label === edge.source);
      const targetNode = Object.values(state.nodes).find(n => n.label === edge.target);

      if (sourceNode && targetNode) {
        const edgeId1 = `${sourceNode.id}->${targetNode.id}`;
        const edgeId2 = `${targetNode.id}->${sourceNode.id}`;
        if (!existingEdges.has(edgeId1) && !existingEdges.has(edgeId2)) {
          state.edges.push({source: sourceNode.id, target: targetNode.id});
          existingEdges.add(edgeId1);
          existingEdges.add(edgeId2);
        }
      }
    });

    const connectionCounts = {};
    Object.keys(state.nodes).forEach(nodeId => { connectionCounts[nodeId] = 0; });
    state.edges.forEach(edge => {
      if (connectionCounts[edge.source] !== undefined) connectionCounts[edge.source]++;
      if (connectionCounts[edge.target] !== undefined) connectionCounts[edge.target]++;
    });

    const baseSize = 0.6;
    const maxSize = 1.6;
    const minSize = 0.6;
    Object.keys(state.nodes).forEach(nodeId => {
      const connections = connectionCounts[nodeId] || 0;
      const calculatedSize = baseSize + Math.sqrt(connections) * 0.18;
      state.nodes[nodeId].size = Math.max(minSize, Math.min(maxSize, calculatedSize));
    });
  });

  if (!skipEnrichment && newNodeIds.length > 0) {
      backgroundEnrichNodes(newNodeIds);
  }

  return { primaryNodeId, newNodeIds };
}

const resetConnectionState = () => {
    set(state => {
      state.connectionMode = 'inactive';
      state.connectionStartNode = null;
      state.connectionEndNode = null;
      state.connectionPath = [];
      if (state.caption?.startsWith('Connecting from')) {
        state.caption = null;
      }
    });
}

export const init = async () => {
    if (get().didInit) return;
    
    const minDisplayTime = 1500;
    const startTime = Date.now();
    let success = false;
    let errorMsg = null;

    set(state => { 
        state.loadingMessage = 'Fetching the initial universe...'; 
        state.visualizationMode = 'graph';
    });
    
    try {
        const response = await fetch('/initial-graph.json');
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        const initialData = await response.json();
        await addNewDataToGraph(initialData, 0, undefined, { skipEnrichment: true });
        success = true;
    } catch (error) {
        console.error("Failed to load initial graph data:", error);
        errorMsg = "Could not load the initial literary universe.";
    }

    const elapsedTime = Date.now() - startTime;
    const remainingTime = minDisplayTime - elapsedTime;
    if (remainingTime > 0) await new Promise(resolve => setTimeout(resolve, remainingTime));

    set(state => {
        if (errorMsg) state.caption = errorMsg;
        state.didInit = true;
        if (success) state.resetCam = true;
        state.activePanel = 'help';
        state.loadingMessage = '';
        state.loadingProgress = 0;
    });

    setTimeout(() => {
        if (get().activePanel === 'help') setActivePanel(null);
    }, 6000);
};

export const sendQuery = async query => {
  const currentMode = get().visualizationMode;
  if (currentMode === 'bookgrid') {
    seedGrid(query);
    return;
  }
  
  resetConnectionState();
  const queryTimestamp = Date.now();
  const isGrounded = get().isGroundedSearchActive;

  set(state => {
    state.isFetching = true;
    state.selectedNode = null;
    state.caption = isGrounded ? `Searching the web for "${query}"...` : `Searching for "${query}"...`;
    state.latestQueryTimestamp = queryTimestamp;
    state.areJourneySuggestionsVisible = false;
    state.activePanel = 'help';
  })
  try {
    let primaryNodeId = null;

    if (isGrounded) {
        const response = await queryLlm({
            model: 'gemini-2.5-flash',
            prompt: queryPrompt(query),
            config: { tools: [{googleSearch: {}}] }
        });
        const groundingSources = response.candidates?.[0]?.groundingMetadata?.groundingChunks;
        const resJ = parseLlmJson(response.text);
        if (groundingSources) resJ.groundingSources = groundingSources;
        ({ primaryNodeId } = await addNewDataToGraph(resJ, queryTimestamp));
    } else {
        const apiData = await searchLiterary(query);
        if (apiData && apiData.nodes.length > 0) {
            ({ primaryNodeId } = await addNewDataToGraph(apiData, queryTimestamp));
            set(state => { state.caption = apiData.commentary });
        } else {
            set(state => { state.caption = 'No results from public libraries, asking AI...' });
            const response = await queryLlm({
                prompt: queryPrompt(query),
                config: { responseMimeType: 'application/json' }
            });
            const resJ = parseLlmJson(response.text);
            ({ primaryNodeId } = await addNewDataToGraph(resJ, queryTimestamp));
        }
    }
    
    if (primaryNodeId) set(state => { state.selectedNode = primaryNodeId; });

  } catch (e) {
    console.error(e)
    set(state => { state.caption = 'Sorry, I had trouble with that request.' })
  } finally {
    set(state => { state.isFetching = false })
    setTimeout(() => {
        if (get().activePanel === 'help') setActivePanel(null);
    }, 6000);
  }
}

export const clearQuery = () => {
  resetConnectionState();
  set(state => {
    state.nodes = {};
    state.edges = [];
    state.caption = 'Universe reset. Choose a journey or start a new search.';
    state.selectedNode = null;
    state.latestQueryTimestamp = null;
    state.activePanel = null;
    state.isResetPanelVisible = false;
    state.areJourneySuggestionsVisible = true;
    state.resetCam = true;
    state.visualizationMode = 'graph';
    // Also reset book grid
    state.bookGrid = {
        slots: [],
        isSeeded: false,
        isLoading: false,
        dismissedBooks: [],
    };
  });
}

export const startJourney = async (journeyName) => {
    resetConnectionState();
    const journeyFile = journeyName.toLowerCase().replace(/\s/g, '-');
  
    set(state => {
      state.isFetching = true;
      state.nodes = {};
      state.edges = [];
      state.caption = null;
      state.selectedNode = null;
      state.didInit = false;
      state.latestQueryTimestamp = null;
      state.areJourneySuggestionsVisible = false;
      state.visualizationMode = 'graph';
    });
  
    const minDisplayTime = 1000;
    const startTime = Date.now();

    try {
      set(state => {
        state.loadingMessage = `Loading the "${journeyName}" universe...`;
        state.loadingProgress = 0;
      });

      const response = await fetch(`/journey-${journeyFile}.json`);
      if (!response.ok) throw new Error(`Failed to fetch journey data: ${response.statusText}`);
      const journeyData = await response.json();
      
      set(state => { state.loadingProgress = 30; });
      
      await addNewDataToGraph(journeyData, 0, undefined, { skipEnrichment: true });
      
      set(state => { state.loadingProgress = 80; });

      const elapsedTime = Date.now() - startTime;
      const remainingTime = minDisplayTime - elapsedTime;
      if (remainingTime > 0) await new Promise(resolve => setTimeout(resolve, remainingTime));
      
      set(state => {
        state.loadingProgress = 100;
        state.didInit = true;
        state.resetCam = true;
      });
    } catch (error) {
      console.error(`Failed to load journey "${journeyName}":`, error);
      set(state => {
        state.caption = `Could not load the ${journeyName} journey. Please try again.`;
        init();
      });
    } finally {
      setTimeout(() => {
        set(state => {
            state.isFetching = false;
            state.loadingMessage = '';
            state.loadingProgress = 0;
        });
      }, 800);
    }
  };

export const findConnection = async (startNodeId, endNodeId) => {
  const startNode = get().nodes[startNodeId];
  const endNode = get().nodes[endNodeId];

  if (!startNode || !endNode) {
    console.error("Start or end node not found for connection.");
    resetConnectionState();
    return;
  }
  
  const queryTimestamp = Date.now();
  set(state => {
    state.isFetching = true;
    state.caption = `Thinking of a connection between "${startNode.label}" and "${endNode.label}"...`;
    state.selectedNode = null;
    state.latestQueryTimestamp = queryTimestamp;
    state.activePanel = 'help';
    state.visualizationMode = 'graph';
  });

  try {
    const prompt = findConnectionPrompt(startNode, endNode);
    const response = await queryLlm({
      model: 'gemini-2.5-pro',
      prompt,
      config: {
        responseMimeType: 'application/json',
        thinkingConfig: { thinkingBudget: 32768 }
      }
    });
    const resJ = parseLlmJson(response.text);
    
    const startPos = new THREE.Vector3(...startNode.position);
    const endPos = new THREE.Vector3(...endNode.position);
    const midPoint = new THREE.Vector3().lerpVectors(startPos, endPos, 0.5);

    await addNewDataToGraph(resJ, queryTimestamp, midPoint.toArray());
    
    const currentNodes = get().nodes;
    const nodesByLabel = Object.values(currentNodes).reduce((acc, node) => {
      acc[node.label] = node;
      return acc;
    }, {});
    
    const pathIds = resJ.path.map(label => nodesByLabel[label]?.id).filter(Boolean);

    set(state => {
      state.connectionPath = pathIds;
      state.caption = resJ.commentary;
    });

  } catch (e) {
    console.error(e);
    set(state => { state.caption = 'Sorry, I could not find a connection.' });
  } finally {
    set(state => {
      state.isFetching = false;
      state.connectionMode = 'inactive';
      state.connectionStartNode = null;
      state.connectionEndNode = null;
    });
    setTimeout(() => {
        if (get().activePanel === 'help') setActivePanel(null);
    }, 6000);
  }
};

export const expandNode = async (nodeId) => {
    if (get().visualizationMode === 'bookgrid') return; // Don't expand in book grid mode
    const nodeToExpand = get().nodes[nodeId];
    if (!nodeToExpand) return;

    const queryTimestamp = Date.now();

    set(state => {
        state.isFetching = true;
        state.expandingNodeId = nodeId;
        state.caption = `Expanding on "${nodeToExpand.label}"...`;
        state.latestQueryTimestamp = queryTimestamp;
        state.activePanel = 'help';
    });

    try {
        const prompt = createExpansionPrompt(nodeToExpand);
        const response = await queryLlm({
            prompt,
            config: { responseMimeType: 'application/json' }
        });
        const resJ = parseLlmJson(response.text);
        
        await addNewDataToGraph(resJ, queryTimestamp, nodeToExpand.position);

    } catch (e) {
        console.error(e);
        set(state => {
            state.caption = 'Sorry, I had trouble expanding on that.';
        });
    } finally {
        set(state => {
            state.isFetching = false;
            state.expandingNodeId = null; // Clear loading state
        });
        setTimeout(() => {
            if (get().activePanel === 'help') {
                setActivePanel(null);
            }
        }, 6000);
    }
};

export const setSelectedNode = async (nodeId) => {
  if (get().isFetching && get().expandingNodeId !== nodeId) return;

  const currentSelected = get().selectedNode;

  const connectionMode = get().connectionMode;
  if (connectionMode !== 'inactive') {
    if (connectionMode === 'selectingStart') {
      set(state => {
        state.connectionStartNode = nodeId;
        state.connectionMode = 'selectingEnd';
        state.selectedNode = nodeId;
      });
    } else if (connectionMode === 'selectingEnd') {
      const startNodeId = get().connectionStartNode;
      if (startNodeId && startNodeId !== nodeId) {
        set(state => { state.connectionEndNode = nodeId; });
        findConnection(startNodeId, nodeId);
      }
    }
    return;
  }

  if (nodeId === currentSelected) {
    set(state => { state.selectedNode = null; });
    return;
  }

  set(state => { state.selectedNode = nodeId; });
  
  if (nodeId) {
    expandNode(nodeId);
  }
};


export const generateAiSummary = async (nodeId) => {
    const node = get().nodes[nodeId];
    if (!node || node.aiSummary) return;

    set(state => {
        state.nodes[nodeId].aiSummary = 'loading...';
    });

    try {
        const prompt = createSummaryPrompt(node);
        const response = await queryLlm({
            model: 'gemini-2.5-flash',
            prompt,
            config: { responseMimeType: 'application/json' }
        });
        const resJ = parseLlmJson(response.text);

        set(state => {
            state.nodes[nodeId].aiSummary = resJ;
        });
    } catch (e) {
        console.error("AI summary generation failed:", e);
        set(state => {
            state.nodes[nodeId].aiSummary = { error: 'Failed to generate analysis. Please try again.' };
        });
    }
};

export const focusNode = nodeId =>
  set(state => {
    if (get().selectedNode === nodeId) {
      state.selectedNode = null
    } else {
      state.selectedNode = nodeId
    }
  })

export const setActivePanel = panelName => {
    set(state => {
        if (state.activePanel === panelName) {
            state.activePanel = null;
        } else {
            state.activePanel = panelName;
        }
    });
}


export const toggleNodeTypeFilter = nodeType =>
  set(state => {
    if (state.nodeFilters[nodeType] !== undefined) {
      state.nodeFilters[nodeType] = !state.nodeFilters[nodeType];
    }
  });

export const toggleConnectionMode = () => {
    const currentMode = get().connectionMode;
    if (currentMode === 'inactive') {
      set(state => {
        state.connectionMode = 'selectingStart';
        state.selectedNode = null;
        state.connectionPath = [];
      });
    } else {
      resetConnectionState();
       set(state => {
        state.selectedNode = null;
        state.caption = null;
      });
    }
}

export const setTimelineRange = (range) => {
    set(state => {
        state.timelineRange = { ...state.timelineRange, ...range };
    });
};

export const toggleTimelineFilter = () => {
    set(state => {
        state.isTimelineActive = !state.isTimelineActive;
    });
};

export const toggleResetPanel = () => {
    set(state => {
        state.isResetPanelVisible = !state.isResetPanelVisible;
    });
};

export const toggleJourneySuggestions = () => {
    set(state => {
        state.areJourneySuggestionsVisible = !state.areJourneySuggestionsVisible;
    });
};

export const toggleGroundedSearch = () => {
    set(state => {
        state.isGroundedSearchActive = !state.isGroundedSearchActive;
    });
};

export const toggleVisualizationMode = () => {
    const currentMode = get().visualizationMode;
    if (currentMode === 'graph') {
        set(state => {
            state.visualizationMode = 'bookgrid';
            state.activePanel = null;
            state.selectedNode = null;
        });
        initBookGrid();
    } else {
        set(state => {
            state.visualizationMode = 'graph';
            state.activePanel = null;
        });
    }
};

export const resetCamera = () => {
    set(state => {
        state.selectedNode = null;
        state.resetCam = true;
    });
};


// --- BOOK GRID ACTIONS ---

export const initBookGrid = () => {
    if (get().bookGrid.slots.length > 0) return; // Already initialized
    const slots = Array.from({ length: 100 }, (_, i) => ({
        index: i,
        status: 'empty',
        bookData: null,
    }));
    set(state => {
        state.bookGrid.slots = slots;
    });
};

export const seedGrid = async (query) => {
    set(state => {
        state.bookGrid.isLoading = true;
        // Reset grid for new seed
        state.bookGrid.slots = Array.from({ length: 100 }, (_, i) => ({
            index: i, status: 'empty', bookData: null
        }));
        state.bookGrid.dismissedBooks = [];
    });

    const bookData = await findBookForGrid(query);

    if (bookData) {
        set(state => {
            state.bookGrid.slots[45] = { index: 45, status: 'locked', bookData };
            state.bookGrid.isSeeded = true;
        });
        populateGridSuggestions();
    } else {
        // Handle book not found
        console.error("Seed book not found");
        set(state => { state.bookGrid.isLoading = false; });
    }
};

export const populateGridSuggestions = async () => {
    set(state => { state.bookGrid.isLoading = true; });

    const { slots, dismissedBooks } = get().bookGrid;
    const lockedBooks = slots.filter(s => s.status === 'locked').map(s => s.bookData);
    const existingBooks = slots.filter(s => s.status !== 'empty').map(s => `${s.bookData.title} by ${s.bookData.author}`);
    const excludedBooks = [...existingBooks, ...dismissedBooks];
    const emptySlots = slots.filter(s => s.status === 'empty');
    
    if (lockedBooks.length === 0 || emptySlots.length === 0) {
        set(state => { state.bookGrid.isLoading = false; });
        return;
    }

    try {
        const prompt = createBookGridPrompt(lockedBooks, excludedBooks, emptySlots.length);
        const response = await queryLlm({ model: 'gemini-2.5-pro', prompt, config: { responseMimeType: 'application/json' } });
        const { recommendations } = parseLlmJson(response.text);

        if (recommendations && recommendations.length > 0) {
            // Fill slots as book data becomes available
            const bookPromises = recommendations.map(rec => findBookForGrid(rec.title, rec.author));
            
            for (let i = 0; i < bookPromises.length; i++) {
                const bookData = await bookPromises[i];
                if (bookData) {
                    const slotIndex = emptySlots[i]?.index;
                    if (slotIndex !== undefined) {
                        set(state => {
                            if (state.bookGrid.slots[slotIndex]) {
                                state.bookGrid.slots[slotIndex] = { index: slotIndex, status: 'suggested', bookData };
                            }
                        });
                    }
                }
            }
        }
    } catch (e) {
        console.error("Failed to populate grid suggestions:", e);
    } finally {
        set(state => { state.bookGrid.isLoading = false; });
    }
};


export const lockGridSlot = (index) => {
    set(state => {
        state.bookGrid.slots[index].status = 'locked';
    });
    populateGridSuggestions();
};

export const dismissGridSlot = (index) => {
    const slot = get().bookGrid.slots[index];
    if (!slot || !slot.bookData) return;
    
    const dismissedId = `${slot.bookData.title} by ${slot.bookData.author}`;

    set(state => {
        state.bookGrid.dismissedBooks.push(dismissedId);
        state.bookGrid.slots[index] = { index, status: 'empty', bookData: null };
    });
    populateGridSuggestions();
};

export const addBookToGrid = (nodeId) => {
    const { nodes, edges, bookGrid } = get();
    const node = nodes[nodeId];

    if (!node || node.type !== 'book') {
        console.error("Node is not a book or doesn't exist.");
        return;
    }

    // Check if book is already in grid to prevent duplicates
    const isAlreadyInGrid = bookGrid.slots.some(slot => slot.bookData?.apiKey === node.api_key || slot.bookData?.title === node.label);
    if (isAlreadyInGrid) {
        console.log("Book is already in the grid.");
        return;
    }

    // Find a connected author to get the name
    let authorName = 'Unknown Author';
    const connectedAuthorEdge = edges.find(edge => {
        if (edge.source === nodeId && nodes[edge.target]?.type === 'author') return true;
        if (edge.target === nodeId && nodes[edge.source]?.type === 'author') return true;
        return false;
    });

    if (connectedAuthorEdge) {
        const authorNodeId = connectedAuthorEdge.source === nodeId ? connectedAuthorEdge.target : connectedAuthorEdge.source;
        authorName = nodes[authorNodeId]?.label || 'Unknown Author';
    }

    const bookData = {
        title: node.label,
        author: authorName,
        coverUrl: node.imageUrl,
        apiKey: node.api_key,
    };

    // Initialize grid if it's empty
    if (get().bookGrid.slots.length === 0) {
        initBookGrid();
    }

    let slotFound = false;
    set(state => {
        // If not seeded, place in the center.
        if (!state.bookGrid.isSeeded) {
            state.bookGrid.slots[45] = { index: 45, status: 'locked', bookData };
            slotFound = true;
            state.bookGrid.isSeeded = true;
        } else {
            // Find the first empty slot.
            const emptySlotIndex = state.bookGrid.slots.findIndex(s => s.status === 'empty');
            if (emptySlotIndex !== -1) {
                state.bookGrid.slots[emptySlotIndex] = { index: emptySlotIndex, status: 'locked', bookData };
                slotFound = true;
            }
        }
        
        if (!slotFound) {
            console.log("Book grid is full.");
        }
    });
    
    // If a slot was successfully filled, repopulate suggestions.
    if (slotFound) {
        populateGridSuggestions();
    }
};


init();