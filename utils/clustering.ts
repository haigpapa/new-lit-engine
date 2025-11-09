/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import type { Node, Edge } from '../types';

export interface Cluster {
  id: string;
  nodes: string[];
  center: { x: number; y: number; z: number };
  color: string;
  label: string;
}

export interface ClusteringResult {
  clusters: Cluster[];
  nodeToCluster: Map<string, string>;
}

/**
 * Detect connected components (clusters) in the graph
 */
export const detectClusters = (
  nodes: Record<string, Node>,
  edges: Edge[]
): ClusteringResult => {
  const nodeIds = Object.keys(nodes);
  const adjacency = new Map<string, Set<string>>();

  // Build adjacency list
  nodeIds.forEach(id => adjacency.set(id, new Set()));
  edges.forEach(edge => {
    adjacency.get(edge.source)?.add(edge.target);
    adjacency.get(edge.target)?.add(edge.source);
  });

  const visited = new Set<string>();
  const clusters: Cluster[] = [];
  const nodeToCluster = new Map<string, string>();

  const colors = [
    '#a78bfa', // purple
    '#10b981', // green
    '#06b6d4', // cyan
    '#f59e0b', // amber
    '#ef4444', // red
    '#8b5cf6', // violet
    '#ec4899', // pink
    '#14b8a6', // teal
  ];

  // DFS to find connected components
  const dfs = (nodeId: string, clusterNodes: string[]) => {
    visited.add(nodeId);
    clusterNodes.push(nodeId);

    adjacency.get(nodeId)?.forEach(neighbor => {
      if (!visited.has(neighbor)) {
        dfs(neighbor, clusterNodes);
      }
    });
  };

  let clusterIndex = 0;
  nodeIds.forEach(nodeId => {
    if (!visited.has(nodeId)) {
      const clusterNodes: string[] = [];
      dfs(nodeId, clusterNodes);

      if (clusterNodes.length > 0) {
        const clusterId = `cluster-${clusterIndex}`;
        const color = colors[clusterIndex % colors.length];

        // Calculate cluster center (average position)
        let sumX = 0, sumY = 0, sumZ = 0;
        clusterNodes.forEach(id => {
          const node = nodes[id];
          if (node.position) {
            sumX += node.position[0];
            sumY += node.position[1];
            sumZ += node.position[2];
          }
        });

        const center = {
          x: sumX / clusterNodes.length,
          y: sumY / clusterNodes.length,
          z: sumZ / clusterNodes.length,
        };

        // Generate cluster label
        const label = generateClusterLabel(nodes, clusterNodes);

        clusters.push({
          id: clusterId,
          nodes: clusterNodes,
          center,
          color,
          label,
        });

        clusterNodes.forEach(id => nodeToCluster.set(id, clusterId));
        clusterIndex++;
      }
    }
  });

  return { clusters, nodeToCluster };
};

/**
 * Generate a meaningful label for a cluster based on its nodes
 */
const generateClusterLabel = (
  nodes: Record<string, Node>,
  clusterNodes: string[]
): string => {
  // Count node types
  const typeCounts = { book: 0, author: 0, theme: 0 };
  clusterNodes.forEach(id => {
    const node = nodes[id];
    if (node && node.type in typeCounts) {
      typeCounts[node.type as keyof typeof typeCounts]++;
    }
  });

  // Find most common type
  const maxType = Object.entries(typeCounts).reduce((a, b) =>
    b[1] > a[1] ? b : a
  )[0];

  // Try to find a representative theme or author
  const themes = clusterNodes
    .map(id => nodes[id])
    .filter(n => n && n.type === 'theme');

  const authors = clusterNodes
    .map(id => nodes[id])
    .filter(n => n && n.type === 'author');

  if (themes.length > 0) {
    return themes[0].label;
  } else if (authors.length > 0) {
    return `${authors[0].label} cluster`;
  } else {
    return `${maxType.charAt(0).toUpperCase() + maxType.slice(1)} cluster`;
  }
};

/**
 * Get cluster statistics
 */
export const getClusterStats = (clusters: Cluster[]) => {
  const totalNodes = clusters.reduce((sum, c) => sum + c.nodes.length, 0);
  const avgSize = totalNodes / clusters.length;

  const largest = clusters.reduce((max, c) =>
    c.nodes.length > max.nodes.length ? c : max
  , clusters[0]);

  const smallest = clusters.reduce((min, c) =>
    c.nodes.length < min.nodes.length ? c : min
  , clusters[0]);

  return {
    totalClusters: clusters.length,
    totalNodes,
    averageSize: Math.round(avgSize * 10) / 10,
    largest: {
      label: largest.label,
      size: largest.nodes.length,
    },
    smallest: {
      label: smallest.label,
      size: smallest.nodes.length,
    },
  };
};

/**
 * Cluster nodes by type (books, authors, themes)
 */
export const clusterByType = (
  nodes: Record<string, Node>
): ClusteringResult => {
  const nodesByType = new Map<string, string[]>();

  Object.entries(nodes).forEach(([id, node]) => {
    if (!nodesByType.has(node.type)) {
      nodesByType.set(node.type, []);
    }
    nodesByType.get(node.type)!.push(id);
  });

  const colors = {
    book: '#a78bfa',
    author: '#10b981',
    theme: '#06b6d4',
  };

  const clusters: Cluster[] = [];
  const nodeToCluster = new Map<string, string>();

  nodesByType.forEach((nodeIds, type) => {
    if (nodeIds.length > 0) {
      const clusterId = `type-${type}`;

      // Calculate center
      let sumX = 0, sumY = 0, sumZ = 0;
      nodeIds.forEach(id => {
        const node = nodes[id];
        if (node.position) {
          sumX += node.position[0];
          sumY += node.position[1];
          sumZ += node.position[2];
        }
      });

      const center = {
        x: sumX / nodeIds.length,
        y: sumY / nodeIds.length,
        z: sumZ / nodeIds.length,
      };

      clusters.push({
        id: clusterId,
        nodes: nodeIds,
        center,
        color: colors[type as keyof typeof colors] || '#888',
        label: `${type.charAt(0).toUpperCase() + type.slice(1)}s`,
      });

      nodeIds.forEach(id => nodeToCluster.set(id, clusterId));
    }
  });

  return { clusters, nodeToCluster };
};

/**
 * Cluster nodes by series
 */
export const clusterBySeries = (
  nodes: Record<string, Node>
): ClusteringResult => {
  const nodesBySeries = new Map<string, string[]>();

  Object.entries(nodes).forEach(([id, node]) => {
    if (node.series) {
      if (!nodesBySeries.has(node.series)) {
        nodesBySeries.set(node.series, []);
      }
      nodesBySeries.get(node.series)!.push(id);
    }
  });

  const colors = [
    '#a78bfa', '#10b981', '#06b6d4', '#f59e0b',
    '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6',
  ];

  const clusters: Cluster[] = [];
  const nodeToCluster = new Map<string, string>();
  let colorIndex = 0;

  nodesBySeries.forEach((nodeIds, series) => {
    if (nodeIds.length > 1) { // Only create cluster if multiple books
      const clusterId = `series-${series.replace(/\s+/g, '-')}`;

      // Calculate center
      let sumX = 0, sumY = 0, sumZ = 0;
      nodeIds.forEach(id => {
        const node = nodes[id];
        if (node.position) {
          sumX += node.position[0];
          sumY += node.position[1];
          sumZ += node.position[2];
        }
      });

      const center = {
        x: sumX / nodeIds.length,
        y: sumY / nodeIds.length,
        z: sumZ / nodeIds.length,
      };

      clusters.push({
        id: clusterId,
        nodes: nodeIds,
        center,
        color: colors[colorIndex % colors.length],
        label: series,
      });

      nodeIds.forEach(id => nodeToCluster.set(id, clusterId));
      colorIndex++;
    }
  });

  return { clusters, nodeToCluster };
};

/**
 * Export clustering visualization data for Three.js
 */
export const exportClusterVisualization = (
  clusters: Cluster[]
): Array<{
  position: [number, number, number];
  radius: number;
  color: string;
  label: string;
}> => {
  return clusters.map(cluster => ({
    position: [cluster.center.x, cluster.center.y, cluster.center.z] as [number, number, number],
    radius: Math.max(5, Math.sqrt(cluster.nodes.length) * 2),
    color: cluster.color,
    label: cluster.label,
  }));
};
