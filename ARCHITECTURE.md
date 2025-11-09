# Literary Explorer - Technical Architecture

## Table of Contents
- [Overview](#overview)
- [Technology Stack](#technology-stack)
- [Project Structure](#project-structure)
- [Core Systems](#core-systems)
- [Data Flow](#data-flow)
- [State Management](#state-management)
- [API Integration](#api-integration)
- [3D Visualization](#3d-visualization)
- [Performance Considerations](#performance-considerations)
- [Security & Privacy](#security--privacy)

---

## Overview

Literary Explorer is a client-side React application that combines 3D visualization, AI-powered search, and real-time data fetching to create an interactive literary discovery experience. The architecture emphasizes:

- **Performance**: Optimized rendering, lazy loading, and efficient state updates
- **Modularity**: Clear separation of concerns between visualization, state, and business logic
- **Type Safety**: 100% TypeScript coverage for reliability
- **Offline-First**: localStorage persistence for data and preferences

---

## Technology Stack

### Core Framework
- **React 19.1.0**: Latest React with automatic batching and concurrent features
- **TypeScript 5.8.2**: Full type safety across the codebase
- **Vite 6.2**: Build tool with HMR and optimized production builds

### 3D Graphics
- **Three.js 0.176.0**: WebGL rendering engine
- **React Three Fiber 9.1.2**: React renderer for Three.js
- **React Three Drei 10.0.7**: Useful helpers and abstractions
- **React Three Rapier 1.4.0**: Physics simulation for force-directed layout

### State & Data
- **Zustand 5.0.4**: Lightweight state management
- **Immer 10.1.1**: Immutable state updates
- **auto-zustand-selectors-hook 3.0.1**: Auto-generated selector hooks

### AI & APIs
- **@google/genai 0.12.0**: Google Gemini AI integration
- **Open Library API**: Book metadata and images
- **Motion 10.18.0**: Animation library for smooth transitions

### Testing & Quality
- **Vitest 1.0.4**: Unit testing framework
- **@testing-library/react 16.0.1**: Component testing utilities
- **TypeScript**: Compile-time type checking

---

## Project Structure

```
new-lit-engine/
├── components/              # Reusable React components
│   ├── BookGridSkeleton.tsx      # Loading skeleton for book grid
│   ├── GraphLoadingSkeleton.tsx  # Loading skeleton for 3D graph
│   └── SettingsPanel.tsx         # Settings and preferences UI
│
├── hooks/                   # Custom React hooks
│   └── useKeyboardShortcuts.ts   # Global keyboard shortcut handler
│
├── utils/                   # Utility functions and helpers
│   ├── cache.ts                  # Caching layer for API responses
│   ├── export.ts                 # Export/share functionality
│   ├── persistence.ts            # localStorage management
│   ├── rateLimiter.ts            # API rate limiting
│   └── validation.ts             # Input validation
│
├── public/                  # Static assets
│   ├── initial-graph.json        # Default graph data
│   ├── journey-*.json            # Pre-curated journeys
│   └── meta.json                 # Metadata
│
├── Core Components/         # Main application components
│   ├── App.tsx                   # Root component and layout
│   ├── GraphViz.tsx              # 3D graph visualization
│   ├── BookGridViz.tsx           # Book grid view
│   ├── LiteraryNode.tsx          # Individual 3D node renderer
│   ├── SidePanel.tsx             # Slide-out panel (help, details, filters, nodes)
│   ├── TopLeftToolbar.tsx        # Main toolbar with actions
│   ├── Intro.tsx                 # Loading screen
│   └── ErrorBoundary.tsx         # Error handling
│
├── State & Logic/           # State management and business logic
│   ├── store.ts                  # Zustand store definition
│   ├── actions.ts                # State actions and business logic
│   ├── types.ts                  # TypeScript type definitions
│
├── AI Integration/          # AI and API clients
│   ├── llm.ts                    # Gemini AI client
│   ├── libraryApi.ts             # Open Library API client
│   └── prompts.ts                # AI prompt templates
│
├── Styles/
│   └── index.css                 # Global styles and CSS
│
├── Configuration/
│   ├── vite.config.ts            # Vite build configuration
│   ├── tsconfig.json             # TypeScript configuration
│   └── package.json              # Dependencies and scripts
│
└── Tests/
    └── utils/__tests__/          # Unit tests
```

---

## Core Systems

### 1. Visualization System

**Components**: `GraphViz.tsx`, `LiteraryNode.tsx`, `BookGridViz.tsx`

**Responsibilities**:
- Render 3D nodes and edges using Three.js
- Handle physics-based layout with Rapier
- Manage camera controls and animations
- Optimize rendering performance

**Key Features**:
- **Force-Directed Layout**: Physics simulation for natural node positioning
- **Dynamic Edge Rendering**: Curved edges with adaptive styling
- **Node Instancing**: Efficient rendering of hundreds of nodes
- **Camera Animations**: Smooth focus transitions using Motion library

### 2. State Management System

**Files**: `store.ts`, `actions.ts`

**Responsibilities**:
- Global application state
- State mutations via actions
- Reactive UI updates
- Persistence integration

**Store Structure**:
```typescript
{
  // Graph data
  nodes: Record<string, Node>
  edges: Edge[]

  // UI state
  activePanel: 'help' | 'details' | 'filters' | 'nodes' | null
  selectedNode: string | null
  visualizationMode: 'graph' | 'grid'

  // Features
  connectionMode: 'inactive' | 'selecting_source' | 'selecting_target'
  connectionPath: string[]
  nodeFilters: { book: boolean, author: boolean, theme: boolean }
  isTimelineActive: boolean
  timelineRange: { start: number, end: number }

  // Loading states
  isFetching: boolean
  expandingNodeId: string | null

  // Journey mode
  areJourneySuggestionsVisible: boolean

  // Book grid
  bookGrid: {
    slots: Slot[]
    isSeeded: boolean
    isLoading: boolean
  }
}
```

**Action Pattern**:
```typescript
// Synchronous action
export const setSelectedNode = (nodeId: string | null) => {
  const set = useStore.setState as any;
  set((state: any) => {
    state.selectedNode = nodeId;
  });
};

// Asynchronous action with API calls
export const sendQuery = async (query: string) => {
  set((state: any) => { state.isFetching = true });

  const result = await queryGemini(query);

  set((state: any) => {
    state.nodes = { ...state.nodes, ...newNodes };
    state.edges = [...state.edges, ...newEdges];
    state.isFetching = false;
  });
};
```

### 3. AI Integration System

**Files**: `llm.ts`, `prompts.ts`

**Responsibilities**:
- Interface with Google Gemini API
- Prompt engineering and management
- Response parsing and validation
- Error handling and retries

**Flow**:
1. User query → prompt template
2. Call Gemini API with retry logic
3. Parse JSON response
4. Validate and normalize data
5. Update state with new nodes/edges

**Retry Strategy**:
```typescript
const RETRY_CONFIG = {
  maxRetries: 3,
  baseDelay: 1000,
  maxDelay: 10000,
  backoffMultiplier: 2
};
```

### 4. Data Persistence System

**File**: `utils/persistence.ts`

**Responsibilities**:
- Save/load graph data to localStorage
- Manage user preferences
- Import/export functionality
- Storage quota management

**Features**:
- **Auto-save**: Configurable interval (1-30 minutes)
- **Manual save/load**: User-triggered operations
- **Import/Export**: JSON file support
- **Storage monitoring**: Track usage and limits

---

## Data Flow

### User Interaction Flow

```
User Action (e.g., search)
    ↓
Action Function (actions.ts)
    ↓
API Call (llm.ts / libraryApi.ts)
    ↓
Response Processing
    ↓
State Update (store.ts)
    ↓
Component Re-render (React)
    ↓
UI Update (Three.js / DOM)
```

### Graph Expansion Flow

```
1. User clicks node
    → setSelectedNode(nodeId)

2. User triggers expansion
    → expandNode(nodeId)
    → setExpandingNodeId(nodeId)

3. Fetch related data
    → queryGemini(prompt)
    → enrichNodesWithLibraryData(nodes)

4. Update graph
    → Add nodes to state
    → Add edges to state
    → setExpandingNodeId(null)

5. Visual update
    → Physics simulation repositions nodes
    → Camera animates to focused node
```

### Search Flow

```
1. User enters query
    → setValue(query)

2. User submits
    → sendQuery(query)
    → setIsFetching(true)

3. AI processing
    → buildSearchPrompt(query, context)
    → callGeminiAPI(prompt)
    → parseResponse(response)

4. Data enrichment
    → enrichNodesWithLibraryData(nodes)
    → Fetch covers, metadata, etc.

5. State update
    → Update nodes and edges
    → setIsFetching(false)

6. Visual feedback
    → Hide loading skeleton
    → Render new nodes
    → Animate camera
```

---

## State Management

### Zustand with Immer

**Why Zustand?**
- Minimal boilerplate
- No context provider wrapping
- Excellent TypeScript support
- Easy to test

**Why Immer?**
- Immutable updates with mutable syntax
- Prevents accidental mutations
- Simplifies complex nested updates

**Example**:
```typescript
// Without Immer (error-prone)
set((state) => ({
  ...state,
  nodes: {
    ...state.nodes,
    [nodeId]: {
      ...state.nodes[nodeId],
      expanded: true
    }
  }
}));

// With Immer (clean and safe)
set((state) => {
  state.nodes[nodeId].expanded = true;
});
```

### Selector Pattern

Auto-generated selectors for optimized re-renders:

```typescript
// Auto-generated by auto-zustand-selectors-hook
const nodes = useStore(s => s.nodes);
const edges = useStore(s => s.edges);

// Only re-renders when nodes change, not edges
```

---

## API Integration

### Google Gemini API

**Models Used**:
- **gemini-2.0-flash-exp**: Fast, primary model
- **gemini-exp-1206**: Experimental features
- **gemini-2.0-flash-thinking-exp**: Deep analysis

**Rate Limiting**:
- Exponential backoff on failures
- Configurable retry attempts
- Request queuing for API limits

**Prompt Strategy**:
```typescript
// Context-aware prompts
const prompt = buildSearchPrompt(query, {
  existingNodes: Object.values(nodes),
  connectionMode: state.connectionMode,
  filters: state.nodeFilters
});
```

### Open Library API

**Endpoints**:
- `/search.json`: Search books
- `/works/{id}.json`: Book metadata
- `/authors/{id}.json`: Author info
- Cover images: `covers.openlibrary.org`

**Throttling**:
- 100ms minimum between requests
- Queue-based request management
- Graceful degradation on failures

**Enrichment Pipeline**:
1. Get basic node data from AI
2. Queue library API requests
3. Fetch metadata in background
4. Update nodes incrementally
5. Fetch images last (lowest priority)

---

## 3D Visualization

### Three.js Architecture

**Scene Setup**:
```typescript
<Canvas>
  <ambientLight />
  <pointLight />
  <TrackballControls />
  <Physics>
    {visibleNodes.map(node => (
      <LiteraryNode key={node.id} {...node} />
    ))}
    {visibleEdges.map(edge => (
      <GraphEdge key={edge.id} {...edge} />
    ))}
  </Physics>
</Canvas>
```

**Node Rendering**:
- Books: 3D boxes with cover textures
- Authors: Spheres with optional images
- Themes: Teal-colored spheres

**Edge Rendering**:
- Quadratic Bezier curves
- Dynamic positioning via useFrame
- Adaptive opacity based on selection
- Theme-aware coloring

**Physics Simulation**:
- Rapier physics engine
- Configurable forces and damping
- Collision avoidance
- Natural clustering

### Performance Optimizations

1. **Instancing**: Reuse geometries and materials
2. **Frustum Culling**: Only render visible nodes
3. **Level of Detail**: Simplify distant nodes
4. **Lazy Loading**: Load textures on demand
5. **Memoization**: Cache expensive calculations

---

## Performance Considerations

### Rendering Performance

**Strategies**:
- React.memo on expensive components
- useMemo for derived state
- useCallback for event handlers
- Debouncing on rapid state changes

**Three.js**:
- Limit draw calls via instancing
- Use BufferGeometry for efficiency
- Dispose of unused resources
- Optimize shader complexity

### Network Performance

**API Optimization**:
- Request deduplication
- Response caching
- Background enrichment
- Progressive loading

**Asset Loading**:
- Lazy load cover images
- Compress textures
- Use CDN for static assets
- Preload critical resources

### Memory Management

**Cleanup**:
```typescript
useEffect(() => {
  // Setup
  const texture = textureLoader.load(url);

  return () => {
    // Cleanup
    texture.dispose();
  };
}, [url]);
```

**Limits**:
- Max 500 nodes recommended
- Periodic garbage collection hints
- Clear unused textures
- Reset physics world on major changes

---

## Security & Privacy

### Data Privacy

- **No Backend**: All processing client-side
- **No User Tracking**: No analytics or telemetry
- **LocalStorage Only**: Data stays on device
- **Optional Features**: User controls all API calls

### API Security

**Environment Variables**:
```env
GEMINI_API_KEY=your_key_here
```

**Best Practices**:
- API keys in `.env.local` (gitignored)
- No keys in client code
- User-provided keys option (future)
- Rate limiting to prevent abuse

### Input Validation

**User Input**:
```typescript
export const sanitizeInput = (input: string): string => {
  return input
    .trim()
    .replace(/<script>/gi, '')
    .substring(0, MAX_INPUT_LENGTH);
};
```

**API Responses**:
```typescript
export const validateGraphData = (data: any): boolean => {
  return (
    data &&
    typeof data === 'object' &&
    Array.isArray(data.nodes) &&
    Array.isArray(data.edges)
  );
};
```

---

## Future Architecture Considerations

### Scalability

- **Database Backend**: For user accounts and social features
- **CDN**: For cover images and static assets
- **Service Workers**: Offline support
- **WebAssembly**: Performance-critical operations

### Features

- **Real-time Collaboration**: WebSockets for multi-user
- **Cloud Sync**: Cross-device graph sync
- **Advanced Analytics**: Graph metrics and insights
- **Mobile App**: React Native port

---

## Development Workflow

### Local Development

```bash
npm run dev        # Start dev server
npm run type-check # TypeScript validation
npm test          # Run unit tests
npm run build     # Production build
```

### Code Quality

- **TypeScript**: Strict mode enabled
- **ESLint**: Code linting (when configured)
- **Prettier**: Code formatting (when configured)
- **Vitest**: Unit and integration tests

### Deployment

```bash
npm run build      # Build for production
npm run preview    # Preview production build
```

**Deployment Targets**:
- Vercel (recommended)
- Netlify
- GitHub Pages
- Any static host

---

## Conclusion

Literary Explorer's architecture prioritizes:
1. **User Experience**: Fast, responsive, beautiful
2. **Developer Experience**: Type-safe, testable, maintainable
3. **Performance**: Optimized rendering and data fetching
4. **Privacy**: Client-side, no tracking

The modular design allows for easy extension and modification while maintaining code quality and performance.
