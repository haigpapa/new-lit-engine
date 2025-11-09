/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import 'immer'
import {create} from 'zustand'
import {immer} from 'zustand/middleware/immer'
import {createSelectorFunctions} from 'auto-zustand-selectors-hook'

export default createSelectorFunctions(
  create(
    immer(() => ({
      didInit: false,
      nodes: {},
      edges: [],
      isFetching: false,
      activePanel: null, // null, 'details', 'filters', 'nodes', 'help'
      selectedNode: null,
      expandingNodeId: null, // ID of the node currently being expanded
      caption: null,
      resetCam: false,
      latestQueryTimestamp: null,
      nodeFilters: {
        book: true,
        author: true,
        theme: true,
      },
      isTimelineActive: false,
      timelineRange: { start: 1500, end: new Date().getFullYear() },
      isResetPanelVisible: false,
      areJourneySuggestionsVisible: true,
      loadingProgress: 0,
      loadingMessage: '',
      isGroundedSearchActive: false, // For Search Grounding toggle
      visualizationMode: 'graph', // 'graph' or 'bookgrid'
      // State for "Find Connection" feature
      connectionMode: 'inactive', // 'inactive', 'selectingStart', 'selectingEnd'
      connectionStartNode: null,
      connectionEndNode: null,
      connectionPath: [], // Array of node IDs representing the path
      // NEW: State for "Book Recommendation Wall"
      bookGrid: {
        slots: [], // Array of 100 slot objects { index, status, bookData }
        isSeeded: false, // Has the user searched for the first book?
        isLoading: false, // Is the AI generating suggestions?
        dismissedBooks: [], // Array of strings like "Title by Author"
      },
    }))
  )
)