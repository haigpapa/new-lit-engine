/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import type { Node, Edge } from '../types';

export interface ExportData {
  nodes: Record<string, Node>;
  edges: Edge[];
  metadata: {
    exportedAt: string;
    version: string;
    nodeCount: number;
    edgeCount: number;
  };
}

/**
 * Export the current graph data as JSON
 */
export const exportGraphAsJSON = (nodes: Record<string, Node>, edges: Edge[]): void => {
  const data: ExportData = {
    nodes,
    edges,
    metadata: {
      exportedAt: new Date().toISOString(),
      version: '1.0',
      nodeCount: Object.keys(nodes).length,
      edgeCount: edges.length,
    },
  };

  const json = JSON.stringify(data, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `storylines-graph-${Date.now()}.json`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

/**
 * Copy the current graph state to clipboard as shareable JSON
 */
export const copyGraphToClipboard = async (
  nodes: Record<string, Node>,
  edges: Edge[]
): Promise<boolean> => {
  try {
    const data: ExportData = {
      nodes,
      edges,
      metadata: {
        exportedAt: new Date().toISOString(),
        version: '1.0',
        nodeCount: Object.keys(nodes).length,
        edgeCount: edges.length,
      },
    };

    await navigator.clipboard.writeText(JSON.stringify(data));
    return true;
  } catch (error) {
    console.error('Failed to copy to clipboard:', error);
    return false;
  }
};

/**
 * Generate a shareable text summary of the graph
 */
export const generateGraphSummary = (nodes: Record<string, Node>, edges: Edge[]): string => {
  const nodeList = Object.values(nodes);
  const books = nodeList.filter(n => n.type === 'book');
  const authors = nodeList.filter(n => n.type === 'author');
  const themes = nodeList.filter(n => n.type === 'theme');

  let summary = '📚 My Storylines Graph\n\n';
  summary += `Total: ${nodeList.length} nodes, ${edges.length} connections\n`;
  summary += `📖 Books: ${books.length}\n`;
  summary += `✍️ Authors: ${authors.length}\n`;
  summary += `💡 Themes: ${themes.length}\n\n`;

  if (books.length > 0) {
    summary += 'Featured Books:\n';
    books.slice(0, 10).forEach(book => {
      summary += `  • ${book.label}`;
      if (book.publicationYear) summary += ` (${book.publicationYear})`;
      summary += '\n';
    });
    if (books.length > 10) {
      summary += `  ... and ${books.length - 10} more\n`;
    }
  }

  return summary;
};

/**
 * Share the graph via Web Share API (mobile-friendly)
 */
export const shareGraph = async (nodes: Record<string, Node>, edges: Edge[]): Promise<boolean> => {
  if (!navigator.share) {
    return false;
  }

  try {
    const summary = generateGraphSummary(nodes, edges);
    await navigator.share({
      title: 'My Storylines Graph',
      text: summary,
      url: window.location.href,
    });
    return true;
  } catch (error) {
    if ((error as Error).name !== 'AbortError') {
      console.error('Failed to share:', error);
    }
    return false;
  }
};
