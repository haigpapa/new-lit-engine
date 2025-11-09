/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import React, { useState, useEffect } from 'react';
import useStore from '../store';
import {
  getSavedFilters,
  saveFilter,
  deleteFilter,
  getFilterStats,
  updateFilterLastUsed,
  createDefaultFilter,
  filterNodes,
  type SavedFilter,
  type FilterCriteria,
  type NodeTypeFilterConfig,
  type PublicationYearFilterConfig,
} from '../utils/advancedFilters';

interface AdvancedFiltersPanelProps {
  onClose: () => void;
  onApplyFilter?: (criteria: FilterCriteria[]) => void;
}

const AdvancedFiltersPanel: React.FC<AdvancedFiltersPanelProps> = ({ onClose, onApplyFilter }) => {
  const nodes = useStore(s => s.nodes);

  const [savedFilters, setSavedFilters] = useState<SavedFilter[]>(getSavedFilters());
  const [selectedFilter, setSelectedFilter] = useState<SavedFilter | null>(null);
  const [isCreatingNew, setIsCreatingNew] = useState(false);
  const [newFilterName, setNewFilterName] = useState('');
  const [newFilterDesc, setNewFilterDesc] = useState('');
  const [activeCriteria, setActiveCriteria] = useState<FilterCriteria[]>([]);

  useEffect(() => {
    if (selectedFilter) {
      setActiveCriteria(selectedFilter.criteria);
    }
  }, [selectedFilter]);

  const handleCreateNew = () => {
    if (!newFilterName.trim()) return;

    const newFilter = createDefaultFilter(newFilterName.trim());
    newFilter.description = newFilterDesc.trim();

    if (saveFilter(newFilter)) {
      setSavedFilters(getSavedFilters());
      setSelectedFilter(newFilter);
      setIsCreatingNew(false);
      setNewFilterName('');
      setNewFilterDesc('');
    }
  };

  const handleApplyFilter = (filter: SavedFilter) => {
    updateFilterLastUsed(filter.id);
    setSavedFilters(getSavedFilters());

    if (onApplyFilter) {
      onApplyFilter(filter.criteria);
    }
  };

  const handleDeleteFilter = (filterId: string) => {
    if (confirm('Are you sure you want to delete this filter?')) {
      deleteFilter(filterId);
      setSavedFilters(getSavedFilters());
      if (selectedFilter?.id === filterId) {
        setSelectedFilter(null);
        setActiveCriteria([]);
      }
    }
  };

  const handleToggleCriterion = (criterionId: string) => {
    setActiveCriteria(prev =>
      prev.map(c =>
        c.id === criterionId ? { ...c, enabled: !c.enabled } : c
      )
    );
  };

  const handleUpdateCriterion = (criterionId: string, config: any) => {
    setActiveCriteria(prev =>
      prev.map(c =>
        c.id === criterionId ? { ...c, config } : c
      )
    );
  };

  const handleSaveCurrentFilter = () => {
    if (!selectedFilter) return;

    const updated = {
      ...selectedFilter,
      criteria: activeCriteria,
    };

    if (saveFilter(updated)) {
      setSavedFilters(getSavedFilters());
    }
  };

  const stats = selectedFilter ? getFilterStats(nodes, activeCriteria) : null;

  return (
    <div className="advanced-filters-panel" role="dialog" aria-labelledby="filters-title" aria-modal="true">
      <div className="filters-header">
        <h2 id="filters-title">Advanced Filters</h2>
        <button className="close-button" onClick={onClose} aria-label="Close filters panel">
          <span className="icon" aria-hidden="true">close</span>
        </button>
      </div>

      <div className="filters-content">
        {/* Saved Filters List */}
        <section className="filters-section">
          <div className="section-header">
            <h3>Saved Filters</h3>
            <button
              className="create-filter-btn"
              onClick={() => setIsCreatingNew(true)}
              aria-label="Create new filter"
            >
              <span className="icon" aria-hidden="true">add</span>
              New
            </button>
          </div>

          {isCreatingNew && (
            <div className="create-filter-form">
              <input
                type="text"
                placeholder="Filter name"
                value={newFilterName}
                onChange={(e) => setNewFilterName(e.target.value)}
                className="filter-name-input"
                aria-label="Filter name"
              />
              <textarea
                placeholder="Description (optional)"
                value={newFilterDesc}
                onChange={(e) => setNewFilterDesc(e.target.value)}
                className="filter-desc-input"
                rows={2}
                aria-label="Filter description"
              />
              <div className="form-actions">
                <button onClick={handleCreateNew} className="btn-primary">
                  Create
                </button>
                <button onClick={() => setIsCreatingNew(false)} className="btn-secondary">
                  Cancel
                </button>
              </div>
            </div>
          )}

          <div className="filters-list">
            {savedFilters.length === 0 ? (
              <p className="empty-message">No saved filters yet. Create one to get started!</p>
            ) : (
              savedFilters.map(filter => (
                <div
                  key={filter.id}
                  className={`filter-item ${selectedFilter?.id === filter.id ? 'selected' : ''}`}
                  onClick={() => setSelectedFilter(filter)}
                >
                  <div className="filter-info">
                    <div className="filter-name">{filter.name}</div>
                    {filter.description && (
                      <div className="filter-description">{filter.description}</div>
                    )}
                    {filter.lastUsed && (
                      <div className="filter-meta">
                        Last used: {new Date(filter.lastUsed).toLocaleDateString()}
                      </div>
                    )}
                  </div>
                  <div className="filter-actions">
                    <button
                      className="filter-action-btn"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleApplyFilter(filter);
                      }}
                      title="Apply filter"
                      aria-label="Apply filter"
                    >
                      <span className="icon" aria-hidden="true">filter_alt</span>
                    </button>
                    <button
                      className="filter-action-btn danger"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteFilter(filter.id);
                      }}
                      title="Delete filter"
                      aria-label="Delete filter"
                    >
                      <span className="icon" aria-hidden="true">delete</span>
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </section>

        {/* Filter Editor */}
        {selectedFilter && (
          <>
            <section className="filters-section">
              <h3>Filter Criteria</h3>

              <div className="criteria-list">
                {activeCriteria.map(criterion => (
                  <div key={criterion.id} className="criterion-item">
                    <div className="criterion-header">
                      <label className="criterion-toggle">
                        <input
                          type="checkbox"
                          checked={criterion.enabled}
                          onChange={() => handleToggleCriterion(criterion.id)}
                        />
                        <span>{criterion.name}</span>
                      </label>
                    </div>

                    {criterion.enabled && criterion.type === 'nodeType' && (
                      <div className="criterion-config">
                        {Object.entries((criterion.config as NodeTypeFilterConfig).types).map(([type, enabled]) => (
                          <label key={type} className="checkbox-label">
                            <input
                              type="checkbox"
                              checked={enabled}
                              onChange={(e) => {
                                const config = criterion.config as NodeTypeFilterConfig;
                                handleUpdateCriterion(criterion.id, {
                                  types: {
                                    ...config.types,
                                    [type]: e.target.checked,
                                  },
                                });
                              }}
                            />
                            <span className="capitalize">{type}s</span>
                          </label>
                        ))}
                      </div>
                    )}

                    {criterion.enabled && criterion.type === 'publicationYear' && (
                      <div className="criterion-config">
                        <select
                          value={(criterion.config as PublicationYearFilterConfig).mode}
                          onChange={(e) => {
                            const config = criterion.config as PublicationYearFilterConfig;
                            handleUpdateCriterion(criterion.id, {
                              ...config,
                              mode: e.target.value as any,
                            });
                          }}
                          className="filter-select"
                        >
                          <option value="range">Year Range</option>
                          <option value="before">Before Year</option>
                          <option value="after">After Year</option>
                          <option value="exact">Exact Year</option>
                        </select>

                        {((criterion.config as PublicationYearFilterConfig).mode === 'range') && (
                          <div className="year-range">
                            <input
                              type="number"
                              placeholder="Start year"
                              value={(criterion.config as PublicationYearFilterConfig).minYear || ''}
                              onChange={(e) => {
                                const config = criterion.config as PublicationYearFilterConfig;
                                handleUpdateCriterion(criterion.id, {
                                  ...config,
                                  minYear: parseInt(e.target.value) || undefined,
                                });
                              }}
                              className="year-input"
                            />
                            <span>to</span>
                            <input
                              type="number"
                              placeholder="End year"
                              value={(criterion.config as PublicationYearFilterConfig).maxYear || ''}
                              onChange={(e) => {
                                const config = criterion.config as PublicationYearFilterConfig;
                                handleUpdateCriterion(criterion.id, {
                                  ...config,
                                  maxYear: parseInt(e.target.value) || undefined,
                                });
                              }}
                              className="year-input"
                            />
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>

              <button
                className="save-filter-btn"
                onClick={handleSaveCurrentFilter}
              >
                <span className="icon" aria-hidden="true">save</span>
                Save Changes
              </button>
            </section>

            {/* Filter Preview */}
            {stats && (
              <section className="filters-section">
                <h3>Preview</h3>
                <div className="filter-preview">
                  <div className="preview-stat">
                    <span className="preview-label">Total Nodes:</span>
                    <span className="preview-value">{stats.total}</span>
                  </div>
                  <div className="preview-stat">
                    <span className="preview-label">Filtered Nodes:</span>
                    <span className="preview-value">{stats.filtered}</span>
                  </div>
                  <div className="preview-stat">
                    <span className="preview-label">Match Percentage:</span>
                    <span className="preview-value">{stats.percentage.toFixed(1)}%</span>
                  </div>
                  <div className="preview-bar">
                    <div
                      className="preview-bar-fill"
                      style={{ width: `${stats.percentage}%` }}
                    />
                  </div>
                </div>
              </section>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default AdvancedFiltersPanel;
