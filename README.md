# Literary Explorer 📚

<div align="center">

An AI-powered interactive 3D visualization engine that maps the complex relationships between books, authors, and literary themes.

[![License](https://img.shields.io/badge/license-Apache%202.0-blue.svg)](LICENSE)
[![React](https://img.shields.io/badge/React-19.1.0-61dafb.svg)](https://reactjs.org/)
[![Three.js](https://img.shields.io/badge/Three.js-0.176.0-000000.svg)](https://threejs.org/)

[Live Demo](#) | [Features](#features) | [Getting Started](#getting-started) | [Architecture](ARCHITECTURE.md) | [Documentation](#documentation)

</div>

---

## 🌟 Overview

Literary Explorer transforms the way you discover and explore literature. Using cutting-edge 3D visualization powered by Three.js and AI-driven insights from Google's Gemini, it creates an interactive universe where books, authors, and themes connect in meaningful, surprising ways.

### ✨ Key Features

#### 🎨 **Dual Visualization Modes**
- **Graph Mode**: Interactive 3D force-directed graph revealing literary connections
- **Book Grid Mode**: AI-powered recommendation wall (100-book curated collection)

#### 🤖 **AI-Powered Intelligence**
- **Smart Search**: Leverages Google Gemini 2.5 for deep literary analysis
- **Grounded Search**: Web-connected search for comprehensive results
- **Connection Finder**: Discover surprising paths between any two literary entities
- **Auto-Expansion**: Click any node to explore related works automatically

#### 🗺️ **Curated Journeys**
Pre-built thematic explorations:
- Magical Realism
- Experimental Fiction
- Autofiction
- Mythology
- The Beat Generation
- Gothic Literature
- Cyberpunk
- Existentialism

#### 📖 **Rich Data Integration**
- **Open Library API**: Real book metadata, covers, and author information
- **AI Summaries**: On-demand analysis and insights for any work
- **Timeline Filtering**: Explore literature across centuries
- **Theme Extraction**: Automatic discovery of literary themes and movements

#### 🎯 **Interactive Features**
- Physics-based 3D navigation with intuitive controls
- Node filtering by type (books, authors, themes)
- Visual connection paths with animated highlights
- Comprehensive keyboard shortcuts for power users
- Export & share graphs (JSON, clipboard, native share)
- Node search with real-time filtering
- Fully responsive design (desktop, tablet, mobile)
- Loading skeletons for better UX
- Touch-optimized interface for mobile devices

#### 📊 **Analytics & Insights**
- Comprehensive graph analytics dashboard
- Real-time performance monitoring with FPS tracking
- Node statistics and breakdowns
- Connectivity metrics and cluster analysis
- Temporal distribution analysis
- Content quality metrics
- Export analytics as CSV
- Advanced filtering with saved presets
- Multi-criteria filtering (type, year, series, description)
- Graph clustering visualization (connected components, series, types)
- Advanced search with real-time filtering
- Reading progress tracking with statistics
- Yearly reading goals and streaks
- Book ratings and personal notes

---

## 🚀 Getting Started

### Prerequisites

- **Node.js** (v18+ recommended)
- **Google Gemini API Key** ([Get one here](https://ai.google.dev/))

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/haigpapa/new-lit-engine.git
   cd new-lit-engine
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure environment**

   Create a `.env.local` file in the root directory:
   ```env
   GEMINI_API_KEY=your_api_key_here
   ```

4. **Start the development server**
   ```bash
   npm run dev
   ```

5. **Open your browser**

   Navigate to `http://localhost:3000`

### Build for Production

```bash
npm run build
npm run preview
```

---

## 🎮 Usage Guide

### Basic Navigation

1. **Search**: Enter a book title, author name, or literary theme in the search bar
2. **Explore**: Click on any node to expand and discover connections
3. **Navigate**: Use mouse/trackpad to rotate, zoom, and pan the 3D space
4. **Filter**: Toggle node types (books/authors/themes) from the toolbar
5. **Timeline**: Activate timeline mode to filter by publication year

### Advanced Features

#### Keyboard Shortcuts ⌨️

| Key | Action |
|-----|--------|
| `/` | Focus search input |
| `Esc` | Close panels / Clear selection / Blur input |
| `?` or `h` | Show help panel |
| `d` | Show details panel (when node selected) |
| `f` | Show filters panel |
| `n` | Show nodes panel |
| `r` | Reset camera view |
| `j` | Toggle journey suggestions |
| `←` `→` `↑` `↓` | Navigate between connected nodes |

#### Find Connections
1. Click the "Connect" button in the toolbar
2. Select a starting node
3. Select an ending node
4. Watch as the AI finds and highlights a meaningful path between them

#### Export & Share 📤
- **Download JSON**: Export your entire graph for backup or sharing
- **Copy to Clipboard**: Quick copy of graph data
- **Native Share**: Use device share menu (mobile-friendly)
- **Generate Summary**: Create readable text summaries of your graph

#### Book Grid Mode
1. Toggle to Grid Mode from the toolbar
2. Search for your favorite book to seed the grid
3. The AI will generate personalized recommendations
4. Lock books you love, dismiss ones you don't
5. Build your curated top-100 library

#### Journey Mode
- Click the sparkle icon to reveal journey suggestions
- Select a theme to load a pre-curated literary universe
- Great for discovery and education

#### Graph Analytics 📊
Access comprehensive analytics from the toolbar:
- **Overview**: Total nodes, connections, density
- **Node Breakdown**: Distribution by type (books, authors, themes)
- **Connectivity**: Clusters, isolated nodes, average degree
- **Most Connected**: Top nodes by connection count
- **Temporal Analysis**: Books per decade, time span
- **Content Quality**: Images and descriptions coverage
- **Export**: Download analytics as CSV

#### Performance Monitoring ⚡
Real-time performance dashboard with:
- **FPS Tracking**: Monitor frame rate in real-time
- **Render Time**: Track visualization performance
- **Memory Usage**: Monitor browser memory consumption
- **Graph Metrics**: Node/edge count and update times
- **API Performance**: Track API call success rate and response times
- **Performance Grade**: Overall system health score with recommendations
- **Compact Mode**: Minimized view that expands on demand

---

## 🏗️ Architecture

### Tech Stack

**Frontend Framework**
- React 19.1.0 with hooks-based architecture
- TypeScript 5.8.2 (100% migration complete)

**3D Graphics**
- Three.js 0.176.0 for 3D rendering
- React Three Fiber for React integration
- React Three Drei for utilities
- React Three Rapier for physics simulation

**State Management**
- Zustand 5.0 with Immer for immutable updates
- Auto-generated selector hooks for performance

**AI & APIs**
- Google Gemini 2.5 (Flash, Pro, Flash-Lite)
- Open Library API for book metadata
- Grounded search with web integration

**Build & Dev Tools**
- Vite 6.2 for blazing-fast builds
- ESM-based architecture
- Hot module replacement (HMR)
- Vitest for unit testing (38 tests)
- TypeScript type checking

### Project Structure

```
new-lit-engine/
├── public/                 # Static assets and journey data
│   ├── initial-graph.json
│   ├── journey-*.json      # Pre-curated literary journeys
│   └── meta.json
├── components/             # Reusable components
│   ├── GraphLoadingSkeleton.tsx
│   ├── BookGridSkeleton.tsx
│   ├── SettingsPanel.tsx
│   ├── AnalyticsPanel.tsx
│   ├── PerformanceDashboard.tsx
│   ├── AdvancedFiltersPanel.tsx
│   ├── AdvancedSearchPanel.tsx
│   └── ReadingProgressPanel.tsx
├── hooks/                  # Custom React hooks
│   └── useKeyboardShortcuts.ts
├── utils/                  # Utility functions
│   ├── export.ts          # Export & share utilities
│   ├── cache.ts           # Caching layer
│   ├── rateLimiter.ts     # API rate limiting
│   ├── validation.ts      # Input validation
│   ├── advancedFilters.ts # Multi-criteria filtering
│   ├── analytics.ts       # Graph analytics & statistics
│   ├── performance.ts     # Performance monitoring
│   ├── clustering.ts      # Graph clustering algorithms
│   └── readingProgress.ts # Reading progress tracking
├── App.tsx                # Main application component
├── GraphViz.tsx           # 3D graph visualization
├── BookGridViz.tsx        # Book grid recommendation wall
├── LiteraryNode.tsx       # Individual node renderer
├── SidePanel.tsx          # Details panel
├── TopLeftToolbar.tsx     # Main toolbar
├── Intro.tsx              # Loading screen
├── ErrorBoundary.tsx      # Error handling
├── store.ts               # Zustand state management
├── actions.ts             # State actions and business logic
├── llm.ts                 # AI model integration
├── libraryApi.ts          # Open Library API client
├── prompts.ts             # AI prompt engineering
├── types.ts               # TypeScript type definitions
└── index.css              # Global styles
├── vite.config.ts         # Vite configuration
├── tsconfig.json          # TypeScript configuration
└── package.json           # Dependencies and scripts
```

### Key Components

#### State Management (`store.js`)
- Global application state using Zustand
- Immutable updates via Immer
- Auto-generated selector hooks for optimal re-renders

#### Actions (`actions.js`)
- Business logic for all user interactions
- API orchestration (LLM + Open Library)
- Graph manipulation algorithms
- Background enrichment pipeline

#### Library API (`libraryApi.js`)
- Open Library integration
- API throttling (100ms between calls)
- Image fetching and caching
- Theme extraction from descriptions

#### LLM Integration (`llm.js`)
- Google Gemini API client
- Exponential backoff retry logic
- Rate limit handling
- Support for multiple model variants

---

## 🔧 Configuration

### Environment Variables

```env
# Required
GEMINI_API_KEY=your_gemini_api_key

# Optional (coming soon)
# FIREBASE_API_KEY=...
# FIREBASE_PROJECT_ID=...
```

### Customization

#### Add Custom Journeys

Create a new JSON file in `/public/journey-your-theme.json`:

```json
{
  "nodes": [
    {
      "label": "Your Book Title",
      "type": "book",
      "description": "A compelling description",
      "publicationYear": 2024,
      "api_key": "/works/OL123W"
    }
  ],
  "edges": [
    {"source": "Author Name", "target": "Your Book Title"}
  ],
  "commentary": "Your journey description"
}
```

Then add it to the journey suggestions in `App.jsx`.

#### Modify AI Prompts

Edit `/prompts.js` to customize how the AI interprets queries and generates connections.

#### Adjust Graph Physics

In `GraphViz.jsx`, tune the force-directed layout parameters:
- Node repulsion strength
- Edge spring constants
- Damping factors

---

## 📊 Performance Considerations

### Optimization Strategies

1. **Background Enrichment**: Node images and metadata load progressively without blocking UI
2. **API Throttling**: Rate-limited requests to Open Library (100ms interval)
3. **Retry Logic**: Exponential backoff for API failures
4. **Memoization**: Cached computations for timeline ranges and filters
5. **Instance Culling**: Nodes outside viewport are optimized

### Known Limitations

- **Large Graphs**: Performance may degrade beyond 200+ nodes (use filtering and search)
- **API Quotas**: Gemini has rate limits; heavy use may require paid tier
- **3D on Older Devices**: Requires WebGL 2.0 support

---

## 🐛 Troubleshooting

### Common Issues

**"API Key not found" error**
- Ensure `.env.local` exists with valid `GEMINI_API_KEY`
- Restart dev server after creating/modifying `.env.local`

**Blank screen on load**
- Check browser console for errors
- Verify WebGL support in your browser
- Try clearing browser cache

**Slow searches**
- Check network tab for failed API calls
- Verify API key quota hasn't been exceeded
- Disable "Grounded Search" for faster results

**3D visualization not rendering**
- Update graphics drivers
- Try a different browser (Chrome/Firefox recommended)
- Disable browser extensions that might block WebGL

---

## 🗺️ Roadmap

### Phase 1: MVP & Core Features ✅
- [x] Core 3D graph visualization
- [x] AI-powered search and expansion
- [x] Open Library integration
- [x] Journey mode
- [x] Book grid recommendations

### Phase 2: TypeScript & Testing ✅
- [x] Complete TypeScript migration (100% coverage)
- [x] Unit testing with Vitest (38 tests)
- [x] Type-safe API integrations
- [x] Error boundary implementation

### Phase 3: UX Polish ✅
- [x] Keyboard shortcuts for all major actions
- [x] Node search with real-time filtering
- [x] Export & share functionality (JSON, clipboard, native share)
- [x] Loading skeletons for graph and book grid
- [x] Comprehensive mobile responsiveness
- [x] Touch-optimized interface

### Phase 4: Advanced Features & Documentation ✅
- [x] Data persistence (localStorage with auto-save)
- [x] Import graphs from JSON files
- [x] User preferences/settings panel
- [x] Storage management and monitoring
- [x] Comprehensive architecture documentation

### Phase 5: Analytics, Performance & Accessibility ✅
- [x] Graph analytics with comprehensive statistics
- [x] Real-time performance monitoring dashboard
- [x] Performance grading and recommendations
- [x] Advanced filtering utilities (multi-criteria support)
- [x] ARIA labels and screen reader support
- [x] Keyboard navigation enhancements
- [x] Export analytics as CSV

### Phase 6: Advanced Search & Progress Tracking ✅
- [x] Saved filter presets with management UI
- [x] Advanced filters panel with live preview
- [x] Graph clustering visualization algorithms
- [x] Cluster detection (connected components, by series, by type)
- [x] Advanced search panel with multi-criteria filtering
- [x] Real-time search results with sort options
- [x] Reading progress tracking system
- [x] Book status management (to-read, reading, completed, abandoned)
- [x] Yearly reading goals with progress tracking
- [x] Reading streaks calculation
- [x] Book ratings and personal notes
- [x] Import/export reading progress

### Future Features 🔮
- [ ] User accounts and saved explorations
- [ ] Social sharing and collaboration
- [ ] Reading list integration (Goodreads, LibraryThing)
- [ ] Export graphs as images/SVG
- [ ] Custom journey builder
- [ ] Multi-language support
- [ ] Mobile app (React Native)
- [ ] Browser extension
- [ ] Educational mode for teachers/students

---

## 🤝 Contributing

Contributions are welcome! This project is in active development.

### How to Contribute

1. **Fork the repository**
2. **Create a feature branch** (`git checkout -b feature/amazing-feature`)
3. **Commit your changes** (`git commit -m 'Add amazing feature'`)
4. **Push to the branch** (`git push origin feature/amazing-feature`)
5. **Open a Pull Request**

### Development Guidelines

- Follow existing code style and conventions
- Add comments for complex logic
- Update documentation for new features
- Test thoroughly before submitting PR
- Keep commits atomic and well-described

### Areas Needing Help

- Accessibility enhancements (ARIA labels, screen readers)
- Additional test coverage (integration and E2E tests)
- Performance optimization for very large graphs
- Additional journey themes
- Documentation and video tutorials
- Internationalization (i18n)

---

## 📝 License

This project is licensed under the **Apache License 2.0** - see the [LICENSE](LICENSE) file for details.

```
Copyright 2024 Literary Explorer Contributors

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
```

---

## 🙏 Acknowledgments

- **Google Gemini** for powerful AI capabilities
- **Open Library** for comprehensive book data
- **Three.js** community for incredible 3D tools
- **React Three Fiber** for seamless React integration
- All contributors and users of this project

---

## 📧 Contact & Support

- **Issues**: [GitHub Issues](https://github.com/haigpapa/new-lit-engine/issues)
- **Discussions**: [GitHub Discussions](https://github.com/haigpapa/new-lit-engine/discussions)
- **AI Studio**: [View Original App](https://ai.studio/apps/drive/1cqlwODkeU1JvEEHtP4L3tceedQMBQbpr)

---

## 🌟 Star History

If you find this project useful, please consider giving it a star! It helps others discover it too.

---

<div align="center">

**Built with ❤️ for book lovers and literary explorers**

[⬆ Back to Top](#literary-explorer-)

</div>
