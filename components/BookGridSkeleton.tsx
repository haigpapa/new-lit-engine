/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import React from 'react';

const BookGridSkeleton: React.FC = () => {
  return (
    <div className="book-grid-skeleton">
      {Array.from({ length: 12 }).map((_, i) => (
        <div key={i} className="skeleton-book-card" style={{ animationDelay: `${i * 0.1}s` }}>
          <div className="skeleton-book-cover" />
          <div className="skeleton-book-title" />
          <div className="skeleton-book-author" />
        </div>
      ))}
    </div>
  );
};

export default BookGridSkeleton;
