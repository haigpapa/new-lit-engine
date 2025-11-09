/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import React from 'react';

const GraphLoadingSkeleton: React.FC = () => {
  return (
    <div className="graph-loading-skeleton">
      <div className="skeleton-nodes">
        <div className="skeleton-node skeleton-node-1" />
        <div className="skeleton-node skeleton-node-2" />
        <div className="skeleton-node skeleton-node-3" />
        <div className="skeleton-node skeleton-node-4" />
        <div className="skeleton-node skeleton-node-5" />
        <div className="skeleton-node skeleton-node-6" />
        <div className="skeleton-node skeleton-node-7" />
        <div className="skeleton-node skeleton-node-8" />
      </div>
      <div className="skeleton-text">
        <p>Building your literary universe...</p>
      </div>
    </div>
  );
};

export default GraphLoadingSkeleton;
