/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import type { Node, Edge } from '../types';

export interface PersistedGraphData {
  nodes: Record<string, Node>;
  edges: Edge[];
  timestamp: string;
  version: string;
}

export interface UserPreferences {
  autoSave: boolean;
  saveInterval: number; // in minutes
  theme: 'dark' | 'light' | 'auto';
  defaultVisualizationMode: 'graph' | 'grid';
  showJourneySuggestionsOnStart: boolean;
}

const STORAGE_KEYS = {
  GRAPH_DATA: 'literary-explorer:graph-data',
  PREFERENCES: 'literary-explorer:preferences',
  AUTOSAVE_ENABLED: 'literary-explorer:autosave-enabled',
} as const;

const DEFAULT_PREFERENCES: UserPreferences = {
  autoSave: true,
  saveInterval: 5,
  theme: 'dark',
  defaultVisualizationMode: 'graph',
  showJourneySuggestionsOnStart: true,
};

/**
 * Check if localStorage is available
 */
export const isLocalStorageAvailable = (): boolean => {
  try {
    const test = '__storage_test__';
    localStorage.setItem(test, test);
    localStorage.removeItem(test);
    return true;
  } catch (e) {
    return false;
  }
};

/**
 * Save graph data to localStorage
 */
export const saveGraphToStorage = (
  nodes: Record<string, Node>,
  edges: Edge[]
): boolean => {
  if (!isLocalStorageAvailable()) {
    console.warn('localStorage is not available');
    return false;
  }

  try {
    const data: PersistedGraphData = {
      nodes,
      edges,
      timestamp: new Date().toISOString(),
      version: '1.0',
    };

    localStorage.setItem(STORAGE_KEYS.GRAPH_DATA, JSON.stringify(data));
    return true;
  } catch (error) {
    console.error('Failed to save graph to localStorage:', error);
    return false;
  }
};

/**
 * Load graph data from localStorage
 */
export const loadGraphFromStorage = (): PersistedGraphData | null => {
  if (!isLocalStorageAvailable()) {
    return null;
  }

  try {
    const data = localStorage.getItem(STORAGE_KEYS.GRAPH_DATA);
    if (!data) return null;

    const parsed: PersistedGraphData = JSON.parse(data);

    // Validate the structure
    if (!parsed.nodes || !parsed.edges || !parsed.timestamp) {
      console.warn('Invalid graph data structure in localStorage');
      return null;
    }

    return parsed;
  } catch (error) {
    console.error('Failed to load graph from localStorage:', error);
    return null;
  }
};

/**
 * Clear saved graph data
 */
export const clearSavedGraph = (): boolean => {
  if (!isLocalStorageAvailable()) {
    return false;
  }

  try {
    localStorage.removeItem(STORAGE_KEYS.GRAPH_DATA);
    return true;
  } catch (error) {
    console.error('Failed to clear saved graph:', error);
    return false;
  }
};

/**
 * Save user preferences
 */
export const savePreferences = (preferences: Partial<UserPreferences>): boolean => {
  if (!isLocalStorageAvailable()) {
    return false;
  }

  try {
    const current = loadPreferences();
    const updated = { ...current, ...preferences };
    localStorage.setItem(STORAGE_KEYS.PREFERENCES, JSON.stringify(updated));
    return true;
  } catch (error) {
    console.error('Failed to save preferences:', error);
    return false;
  }
};

/**
 * Load user preferences
 */
export const loadPreferences = (): UserPreferences => {
  if (!isLocalStorageAvailable()) {
    return DEFAULT_PREFERENCES;
  }

  try {
    const data = localStorage.getItem(STORAGE_KEYS.PREFERENCES);
    if (!data) return DEFAULT_PREFERENCES;

    const parsed = JSON.parse(data);
    return { ...DEFAULT_PREFERENCES, ...parsed };
  } catch (error) {
    console.error('Failed to load preferences:', error);
    return DEFAULT_PREFERENCES;
  }
};

/**
 * Get storage usage information
 */
export const getStorageInfo = (): { used: number; available: number; percentage: number } => {
  if (!isLocalStorageAvailable()) {
    return { used: 0, available: 0, percentage: 0 };
  }

  try {
    let used = 0;
    for (const key in localStorage) {
      if (localStorage.hasOwnProperty(key)) {
        used += localStorage[key].length + key.length;
      }
    }

    // Most browsers allow 5-10MB, we'll estimate 5MB
    const available = 5 * 1024 * 1024;
    const percentage = (used / available) * 100;

    return {
      used,
      available,
      percentage: Math.min(percentage, 100),
    };
  } catch (error) {
    console.error('Failed to calculate storage info:', error);
    return { used: 0, available: 0, percentage: 0 };
  }
};

/**
 * Import graph from JSON file
 */
export const importGraphFromJSON = (jsonString: string): PersistedGraphData | null => {
  try {
    const data = JSON.parse(jsonString);

    // Validate structure
    if (!data.nodes || !data.edges) {
      throw new Error('Invalid graph data: missing nodes or edges');
    }

    // Check if it's the export format
    if (data.metadata) {
      return {
        nodes: data.nodes,
        edges: data.edges,
        timestamp: data.metadata.exportedAt || new Date().toISOString(),
        version: data.metadata.version || '1.0',
      };
    }

    // Otherwise, assume it's raw graph data
    return {
      nodes: data.nodes,
      edges: data.edges,
      timestamp: new Date().toISOString(),
      version: '1.0',
    };
  } catch (error) {
    console.error('Failed to import graph from JSON:', error);
    return null;
  }
};

/**
 * Format bytes to human-readable string
 */
export const formatBytes = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
};
