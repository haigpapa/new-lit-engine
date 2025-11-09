/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import React, { useState, useMemo } from 'react';
import useStore from '../store';
import { filterNodes, type FilterCriteria } from '../utils/advancedFilters';
import { setSelectedNode } from '../actions';
import type { Node } from '../types';

interface AdvancedSearchPanelProps {
  onClose: () => void;
  onSelectNode?: (nodeId: string) => void;
}

const AdvancedSearchPanel: React.FC<AdvancedSearchPanelProps> = ({ onClose, onSelectNode }) => {
  const nodes = useStore(s => s.nodes);

  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'book' | 'author' | 'theme'>('all');
  const [yearRange, setYearRange] = useState<{ min?: number; max?: number }>({});
  const [hasSeries, setHasSeries] = useState<'all' | 'yes' | 'no'>('all');
  const [hasImage, setHasImage] = useState<'all' | 'yes' | 'no'>('all');
  const [sortBy, setSortBy] = useState<'relevance' | 'name' | 'year'>('relevance');

  // Build filter criteria
  const criteria: FilterCriteria[] = useMemo(() => {
    const crit: FilterCriteria[] = [];

    // Type filter
    if (filterType !== 'all') {
      crit.push({
        id: 'type-filter',
        name: 'Type Filter',
        enabled: true,
        type: 'nodeType',
        config: {
          types: {
            book: filterType === 'book',
            author: filterType === 'author',
            theme: filterType === 'theme',
          },
        },
      });
    }

    // Year range filter
    if (yearRange.min || yearRange.max) {
      crit.push({
        id: 'year-filter',
        name: 'Year Filter',
        enabled: true,
        type: 'publicationYear',
        config: {
          mode: 'range' as const,
          minYear: yearRange.min || 0,
          maxYear: yearRange.max || 9999,
        },
      });
    }

    return crit;
  }, [filterType, yearRange]);

  // Filter and search nodes
  const results = useMemo(() => {
    let filtered = Object.values(nodes);

    // Apply advanced filters
    if (criteria.length > 0) {
      const filteredDict = filterNodes(nodes, criteria);
      filtered = Object.values(filteredDict);
    }

    // Apply search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(node =>
        node.label.toLowerCase().includes(query) ||
        node.description?.toLowerCase().includes(query) ||
        node.series?.toLowerCase().includes(query)
      );
    }

    // Apply series filter
    if (hasSeries !== 'all') {
      filtered = filtered.filter(node =>
        hasSeries === 'yes' ? !!node.series : !node.series
      );
    }

    // Apply image filter
    if (hasImage !== 'all') {
      filtered = filtered.filter(node =>
        hasImage === 'yes' ? !!node.imageUrl : !node.imageUrl
      );
    }

    // Sort results
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return a.label.localeCompare(b.label);
        case 'year':
          return (a.publicationYear || 0) - (b.publicationYear || 0);
        case 'relevance':
        default:
          // Relevance based on query match
          if (!searchQuery) return 0;
          const aMatch = a.label.toLowerCase().indexOf(searchQuery.toLowerCase());
          const bMatch = b.label.toLowerCase().indexOf(searchQuery.toLowerCase());
          return aMatch - bMatch;
      }
    });

    return filtered;
  }, [nodes, criteria, searchQuery, hasSeries, hasImage, sortBy]);

  const handleSelectNode = (node: Node) => {
    if (onSelectNode) {
      onSelectNode(node.label);
    } else {
      setSelectedNode(node.label);
    }
    onClose();
  };

  return (
    <div className="advanced-search-panel" role="dialog" aria-labelledby="search-title" aria-modal="true">
      <div className="search-header">
        <h2 id="search-title">Advanced Search</h2>
        <button className="close-button" onClick={onClose} aria-label="Close search panel">
          <span className="icon" aria-hidden="true">close</span>
        </button>
      </div>

      <div className="search-content">
        {/* Search Input */}
        <div className="search-input-section">
          <div className="search-input-wrapper">
            <span className="icon search-icon" aria-hidden="true">search</span>
            <input
              type="text"
              className="search-input"
              placeholder="Search books, authors, themes..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              autoFocus
              aria-label="Search query"
            />
            {searchQuery && (
              <button
                className="clear-search-btn"
                onClick={() => setSearchQuery('')}
                aria-label="Clear search"
              >
                <span className="icon" aria-hidden="true">close</span>
              </button>
            )}
          </div>
        </div>

        {/* Filters */}
        <div className="search-filters">
          <div className="filter-group">
            <label htmlFor="type-filter">Type:</label>
            <select
              id="type-filter"
              value={filterType}
              onChange={(e) => setFilterType(e.target.value as any)}
              className="filter-select"
            >
              <option value="all">All Types</option>
              <option value="book">Books</option>
              <option value="author">Authors</option>
              <option value="theme">Themes</option>
            </select>
          </div>

          <div className="filter-group">
            <label htmlFor="year-min">Year Range:</label>
            <div className="year-range-inputs">
              <input
                id="year-min"
                type="number"
                placeholder="From"
                value={yearRange.min || ''}
                onChange={(e) => setYearRange(prev => ({
                  ...prev,
                  min: e.target.value ? parseInt(e.target.value) : undefined
                }))}
                className="year-input"
                aria-label="Minimum year"
              />
              <span>-</span>
              <input
                type="number"
                placeholder="To"
                value={yearRange.max || ''}
                onChange={(e) => setYearRange(prev => ({
                  ...prev,
                  max: e.target.value ? parseInt(e.target.value) : undefined
                }))}
                className="year-input"
                aria-label="Maximum year"
              />
            </div>
          </div>

          <div className="filter-group">
            <label htmlFor="series-filter">Series:</label>
            <select
              id="series-filter"
              value={hasSeries}
              onChange={(e) => setHasSeries(e.target.value as any)}
              className="filter-select"
            >
              <option value="all">All</option>
              <option value="yes">Has Series</option>
              <option value="no">No Series</option>
            </select>
          </div>

          <div className="filter-group">
            <label htmlFor="image-filter">Image:</label>
            <select
              id="image-filter"
              value={hasImage}
              onChange={(e) => setHasImage(e.target.value as any)}
              className="filter-select"
            >
              <option value="all">All</option>
              <option value="yes">Has Image</option>
              <option value="no">No Image</option>
            </select>
          </div>

          <div className="filter-group">
            <label htmlFor="sort-filter">Sort By:</label>
            <select
              id="sort-filter"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="filter-select"
            >
              <option value="relevance">Relevance</option>
              <option value="name">Name (A-Z)</option>
              <option value="year">Year</option>
            </select>
          </div>
        </div>

        {/* Results Count */}
        <div className="results-summary">
          <span className="results-count">
            {results.length} {results.length === 1 ? 'result' : 'results'}
          </span>
          {(searchQuery || criteria.length > 0) && (
            <button
              className="clear-filters-btn"
              onClick={() => {
                setSearchQuery('');
                setFilterType('all');
                setYearRange({});
                setHasSeries('all');
                setHasImage('all');
              }}
              aria-label="Clear all filters"
            >
              Clear All
            </button>
          )}
        </div>

        {/* Results List */}
        <div className="search-results">
          {results.length === 0 ? (
            <div className="no-results">
              <span className="icon" aria-hidden="true">search_off</span>
              <p>No results found</p>
              <p className="hint">Try adjusting your filters or search query</p>
            </div>
          ) : (
            results.map(node => (
              <div
                key={node.label}
                className="search-result-item"
                onClick={() => handleSelectNode(node)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    handleSelectNode(node);
                  }
                }}
              >
                {node.imageUrl && (
                  <div className="result-image">
                    <img src={node.imageUrl} alt={node.label} />
                  </div>
                )}
                <div className="result-info">
                  <div className="result-title">{node.label}</div>
                  <div className="result-meta">
                    <span className={`result-type ${node.type}`}>{node.type}</span>
                    {node.publicationYear && (
                      <span className="result-year">{node.publicationYear}</span>
                    )}
                    {node.series && (
                      <span className="result-series">{node.series}</span>
                    )}
                  </div>
                  {node.description && (
                    <div className="result-description">
                      {node.description.length > 150
                        ? `${node.description.slice(0, 150)}...`
                        : node.description
                      }
                    </div>
                  )}
                </div>
                <span className="icon result-arrow" aria-hidden="true">chevron_right</span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default AdvancedSearchPanel;
