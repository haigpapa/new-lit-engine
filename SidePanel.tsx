/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import c from "clsx";
import { useMemo, useState } from "react";
import useStore from "./store";
import { setActivePanel, focusNode, toggleNodeTypeFilter, generateAiSummary, addBookToGrid } from "./actions";
import type { Node, NodeType } from "./types";
import { exportGraphAsJSON, copyGraphToClipboard, shareGraph, generateGraphSummary } from "./utils/export";

const nodeIcons: Record<NodeType, string> = {
  book: "menu_book",
  author: "person",
  theme: "lightbulb",
};

const nodeTypeColors: Record<NodeType, string> = {
  book: '#0891b2',
  author: '#f59e0b',
  theme: '#2dd4bf',
};

const DetailsContent: React.FC = () => {
    const selectedNodeId = useStore(s => s.selectedNode);
    const nodes = useStore(s => s.nodes);
    const isFetching = useStore(s => s.isFetching);
    const bookGridSlots = useStore(s => s.bookGrid.slots);
    const selectedNode = selectedNodeId ? nodes[selectedNodeId] : null;

    const isBookInGrid = useMemo(() => {
        if (!selectedNode || selectedNode.type !== 'book') return false;
        return bookGridSlots.some(slot =>
            (slot.bookData?.apiKey && slot.bookData.apiKey === selectedNode.api_key) ||
            slot.bookData?.title === selectedNode.label
        );
    }, [selectedNode, bookGridSlots]);

    if (!selectedNode) {
        return (
          <div className="details-panel placeholder">
            <p>Select a node in the graph to see details.</p>
          </div>
        );
    }

    const handleGenerateClick = () => {
        if (selectedNode && !isFetching) {
            generateAiSummary(selectedNode.id);
        }
    };

    const handleAddBookToGrid = () => {
        if (selectedNode) {
            addBookToGrid(selectedNode.id);
        }
    };

    return (
      <div className="details-panel">
        <h3>
          {selectedNode.label}
          <img
            src="https://storage.googleapis.com/experiments-uploads/g2demos/photo-applet/spinner.svg"
            className={c("spinner-icon", { active: isFetching && !selectedNode.aiSummary })}
            alt="Loading..."
          />
        </h3>
        <p className="node-type">{selectedNode.type}</p>
        {selectedNode.publicationYear && (
          <p className="node-publication-year">Published: {selectedNode.publicationYear}</p>
        )}
        {selectedNode.series && (
          <p className="node-series">Part of: {selectedNode.series}</p>
        )}
        <p className="node-description">{selectedNode.description}</p>

        {selectedNode.type === 'book' && (
            <div className="add-to-grid-section">
                <button
                    className="add-to-grid-button"
                    onClick={handleAddBookToGrid}
                    disabled={isBookInGrid}
                >
                    <span className="icon">library_add</span>
                    {isBookInGrid ? 'Added to Wall' : 'Add to Book Wall'}
                </button>
            </div>
        )}

        {/* --- New AI Summary Section --- */}
        <div className="ai-summary-section">
            {!selectedNode.aiSummary && (
                <button className="ai-summary-button" onClick={handleGenerateClick} disabled={isFetching}>
                    <span className="icon">auto_awesome</span>
                    Generate AI Analysis
                </button>
            )}

            {selectedNode.aiSummary === 'loading...' && (
                 <div className="ai-summary-loading">
                    <img
                        src="https://storage.googleapis.com/experiments-uploads/g2demos/photo-applet/spinner.svg"
                        className="spinner-icon active"
                        alt="Loading..."
                    />
                    <span>Generating analysis...</span>
                 </div>
            )}

            {selectedNode.aiSummary && typeof selectedNode.aiSummary === 'object' && !selectedNode.aiSummary.error && (
                <div className="ai-summary-content">
                    <h4>Summary</h4>
                    <p>{selectedNode.aiSummary.summary}</p>
                    <h4>Analysis</h4>
                    <p>{selectedNode.aiSummary.analysis}</p>
                </div>
            )}

            {selectedNode.aiSummary && typeof selectedNode.aiSummary === 'object' && selectedNode.aiSummary.error && (
                <p className="ai-summary-error">{selectedNode.aiSummary.error}</p>
            )}
        </div>


        {selectedNode.groundingSources && selectedNode.groundingSources.length > 0 && (
            <div className="grounding-sources">
                <h4>Sources from the web:</h4>
                <ul>
                    {selectedNode.groundingSources.map((source, index) => (
                        source.web && <li key={index}>
                            <a href={source.web.uri} target="_blank" rel="noopener noreferrer">
                                {source.web.title || source.web.uri}
                            </a>
                        </li>
                    ))}
                </ul>
            </div>
        )}
      </div>
    );
};

const FiltersContent: React.FC = () => {
    const nodeFilters = useStore(s => s.nodeFilters);
    const filterTypes = Object.keys(nodeFilters) as NodeType[];

    return (
        <div className="filters">
            {filterTypes.map(type => (
            <div key={type} className="filter-item">
                <input
                type="checkbox"
                id={`filter-${type}`}
                checked={nodeFilters[type]}
                onChange={() => toggleNodeTypeFilter(type)}
                />
                <label htmlFor={`filter-${type}`}>
                <span className="icon" style={{ color: nodeTypeColors[type] }}>{nodeIcons[type]}</span>
                {type.charAt(0).toUpperCase() + type.slice(1)}s
                </label>
            </div>
            ))}
        </div>
    );
}

const NodesContent: React.FC = () => {
    const nodes = useStore(s => s.nodes);
    const nodeFilters = useStore(s => s.nodeFilters);
    const visualizationMode = useStore(s => s.visualizationMode);
    const [searchQuery, setSearchQuery] = useState('');

    const filteredNodes = Object.values(nodes).filter(node => {
        // Filter by type
        if (!nodeFilters[node.type]) return false;

        // Filter by search query
        if (searchQuery.trim()) {
            const query = searchQuery.toLowerCase();
            return node.label.toLowerCase().includes(query) ||
                   node.description?.toLowerCase().includes(query) ||
                   node.series?.toLowerCase().includes(query);
        }

        return true;
    });

    const sortedNodes = filteredNodes.sort((a, b) => (a.label || '').localeCompare(b.label || ''));

    const totalNodeCount = Object.keys(nodes).length;
    const visibleNodeCount = sortedNodes.length;

    const handleNodeClick = (node: Node) => {
        if (visualizationMode === 'graph') {
            focusNode(node.id);
            setActivePanel('details');
        }
    };

    return (
        <>
            <h2>Graph Nodes ({visibleNodeCount} / {totalNodeCount})</h2>
            <div className="panel-content list-panel">
                <div className="node-search">
                    <span className="icon">search</span>
                    <input
                        type="text"
                        placeholder="Search nodes..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="node-search-input"
                    />
                    {searchQuery && (
                        <button
                            className="clear-search"
                            onClick={() => setSearchQuery('')}
                            aria-label="Clear search"
                        >
                            <span className="icon">close</span>
                        </button>
                    )}
                </div>
                <ul>
                    {sortedNodes.map((node) => (
                    <li key={node.id} onClick={() => handleNodeClick(node)}>
                        <p>
                            <span className="icon" style={{color: nodeTypeColors[node.type]}}>
                                {nodeIcons[node.type] || 'circle'}
                            </span>
                            {node.label}
                        </p>
                    </li>
                    ))}
                    {totalNodeCount > 0 && visibleNodeCount === 0 && <li>No nodes match {searchQuery ? 'search' : 'filters'}.</li>}
                    {totalNodeCount === 0 && <li>Search to begin exploring.</li>}
                </ul>
            </div>
        </>
    );
}

const HelpContent: React.FC = () => {
    const caption = useStore(s => s.caption);
    const connectionMode = useStore(s => s.connectionMode);
    const connectionStartNode = useStore(s => s.connectionStartNode);
    const nodes = useStore(s => s.nodes);
    const edges = useStore(s => s.edges);
    const visualizationMode = useStore(s => s.visualizationMode);
    const [copyMessage, setCopyMessage] = useState<string | null>(null);

    const getCaption = () => {
        if (connectionMode === 'selectingStart') return 'Select a starting node to find a path.';
        if (connectionMode === 'selectingEnd' && connectionStartNode) {
            return `Connecting from "${nodes[connectionStartNode]?.label}". Select an ending node.`
        }
        if (visualizationMode === 'bookgrid') {
            return "Build your Top 100 library. Start by searching for a book you love."
        }
        return caption || 'Welcome to Storylines! Search for a book, author, or theme to begin your journey, or select a curated path below.';
    };

    const getHelpText = () => {
        if (visualizationMode === 'bookgrid') {
            return "Your first search will 'seed' the grid. The AI will then suggest related books. Click a suggestion to 'Lock' it into your collection or 'Dismiss' it for a new one. Each choice refines your future recommendations!"
        }
        return "Use the mouse or touch to rotate, pan, and zoom the graph. Click on a node to select it and discover new connections. The toolbar contains tools to filter nodes, find paths, and more."
    }

    return (
        <>
            <h2>Storylines</h2>
            <div className="panel-content help-panel">
                <h3>{getCaption()}</h3>
                <p>
                    {getHelpText()}
                </p>

                <div className="keyboard-shortcuts">
                    <h4>Keyboard Shortcuts</h4>
                    <div className="shortcut-grid">
                        <div className="shortcut-row">
                            <kbd>/</kbd>
                            <span>Focus search</span>
                        </div>
                        <div className="shortcut-row">
                            <kbd>Esc</kbd>
                            <span>Close panels</span>
                        </div>
                        <div className="shortcut-row">
                            <kbd>?</kbd>
                            <span>Show help</span>
                        </div>
                        <div className="shortcut-row">
                            <kbd>d</kbd>
                            <span>Show details</span>
                        </div>
                        <div className="shortcut-row">
                            <kbd>f</kbd>
                            <span>Show filters</span>
                        </div>
                        <div className="shortcut-row">
                            <kbd>n</kbd>
                            <span>Show nodes</span>
                        </div>
                        <div className="shortcut-row">
                            <kbd>j</kbd>
                            <span>Toggle journeys</span>
                        </div>
                        <div className="shortcut-row">
                            <kbd>r</kbd>
                            <span>Reset camera</span>
                        </div>
                        <div className="shortcut-row">
                            <kbd>←→↑↓</kbd>
                            <span>Navigate nodes</span>
                        </div>
                    </div>
                </div>

                {Object.keys(nodes).length > 0 && (
                    <div className="export-section">
                        <h4>Export & Share</h4>
                        <div className="export-buttons">
                            <button
                                className="export-button"
                                onClick={() => exportGraphAsJSON(nodes, edges)}
                                title="Download graph as JSON"
                            >
                                <span className="icon">download</span>
                                Download JSON
                            </button>
                            <button
                                className="export-button"
                                onClick={async () => {
                                    const success = await copyGraphToClipboard(nodes, edges);
                                    if (success) {
                                        setCopyMessage('Copied to clipboard!');
                                        setTimeout(() => setCopyMessage(null), 2000);
                                    } else {
                                        setCopyMessage('Failed to copy');
                                        setTimeout(() => setCopyMessage(null), 2000);
                                    }
                                }}
                                title="Copy graph data to clipboard"
                            >
                                <span className="icon">content_copy</span>
                                Copy Data
                            </button>
                            {navigator.share && (
                                <button
                                    className="export-button"
                                    onClick={() => shareGraph(nodes, edges)}
                                    title="Share via system dialog"
                                >
                                    <span className="icon">share</span>
                                    Share
                                </button>
                            )}
                        </div>
                        {copyMessage && (
                            <div className="copy-message">{copyMessage}</div>
                        )}
                    </div>
                )}
            </div>
        </>
    )
};

const panelConfig = {
    details: { title: 'Selection Details', content: <DetailsContent /> },
    filters: { title: 'Filters', content: <FiltersContent /> },
    nodes: { title: 'Graph Nodes', content: <NodesContent /> }, // Title is handled internally
    help: { title: 'Storylines', content: <HelpContent /> }, // Title is handled internally
};

export default function SidePanel() {
  const activePanel = useStore(s => s.activePanel);

  const { title, content } = panelConfig[activePanel || 'help'] || {};

  return (
    <aside className={c("side-panel", { open: !!activePanel })}>
      <button
        className="closeButton"
        onClick={() => setActivePanel(null)}
        aria-label="Close panel"
      >
        <span className="icon">close</span>
      </button>

      {activePanel === 'nodes' || activePanel === 'help' ? (
        content
      ) : (
        <>
          {title && <h2>{title}</h2>}
          <div className="panel-content">
            {content}
          </div>
        </>
      )}
    </aside>
  );
};
