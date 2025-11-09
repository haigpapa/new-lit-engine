/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Type definitions for the Literary Explorer application
 */

export type NodeType = 'book' | 'author' | 'theme';

export interface Node {
  id: string;
  label: string;
  type: NodeType;
  description: string;
  publicationYear: number | null;
  series?: string | null;
  api_key?: string | null;
  imageUrl?: string | null;
  aiSummary?: AISummary | 'loading...' | null;
  position: [number, number, number];
  initialPosition?: [number, number, number];
  color: string;
  size?: number;
  lastUpdated: number;
  groundingSources?: GroundingSource[] | null;
}

export interface Edge {
  source: string; // Node ID
  target: string; // Node ID
}

export interface GroundingSource {
  web?: {
    uri: string;
    title?: string;
  };
}

export interface AISummary {
  summary: string;
  analysis: string;
  error?: string;
}

export interface Journey {
  nodes: Omit<Node, 'id' | 'position' | 'initialPosition' | 'color' | 'size' | 'lastUpdated'>[];
  edges: { source: string; target: string }[]; // edges use labels, not IDs
  commentary: string;
}

export interface BookGridSlot {
  index: number;
  status: 'empty' | 'suggested' | 'locked';
  bookData: BookData | null;
}

export interface BookData {
  title: string;
  author: string;
  coverUrl: string | null;
  apiKey?: string;
}

export interface AppState {
  didInit: boolean;
  nodes: Record<string, Node>;
  edges: Edge[];
  isFetching: boolean;
  activePanel: PanelType | null;
  selectedNode: string | null;
  expandingNodeId: string | null;
  caption: string | null;
  resetCam: boolean;
  latestQueryTimestamp: number | null;
  nodeFilters: {
    book: boolean;
    author: boolean;
    theme: boolean;
  };
  isTimelineActive: boolean;
  timelineRange: {
    start: number;
    end: number;
  };
  isResetPanelVisible: boolean;
  areJourneySuggestionsVisible: boolean;
  loadingProgress: number;
  loadingMessage: string;
  isGroundedSearchActive: boolean;
  visualizationMode: 'graph' | 'bookgrid';
  connectionMode: 'inactive' | 'selectingStart' | 'selectingEnd';
  connectionStartNode: string | null;
  connectionEndNode: string | null;
  connectionPath: string[];
  bookGrid: {
    slots: BookGridSlot[];
    isSeeded: boolean;
    isLoading: boolean;
    dismissedBooks: string[];
  };
}

export type PanelType = 'details' | 'filters' | 'nodes' | 'help';

export interface ValidationResult {
  valid: boolean;
  error?: string;
}

export interface RateLimitResult {
  allowed: boolean;
  retryAfter?: number;
}

export interface LLMConfig {
  responseMimeType?: string;
  tools?: any[];
  thinkingConfig?: {
    thinkingBudget: number;
  };
  generationConfig?: {
    responseMimeType?: string;
    responseSchema?: any;
    temperature?: number;
    topP?: number;
    topK?: number;
    maxOutputTokens?: number;
  };
}

export interface LLMRequest {
  model?: string;
  prompt: string;
  config?: LLMConfig;
}

export interface LLMResponse {
  text: string;
  candidates?: Array<{
    groundingMetadata?: {
      groundingChunks?: GroundingSource[];
    };
  }>;
}

export interface OpenLibraryWork {
  key: string;
  title: string;
  author_name?: string[];
  author_key?: string[];
  first_publish_year?: number;
  first_sentence?: string[] | string;
  cover_i?: number;
  covers?: number[];
  description?: string | { value: string };
  subjects?: string[];
  series?: string[];
  authors?: Array<{
    author?: {
      key: string;
    };
  }>;
}

export interface OpenLibraryAuthor {
  key: string;
  name: string;
  bio?: string | { value: string };
  photos?: number[];
}
