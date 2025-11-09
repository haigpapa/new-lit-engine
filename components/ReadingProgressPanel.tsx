/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import React, { useState, useMemo } from 'react';
import useStore from '../store';
import {
  getAllProgress,
  updateProgress,
  deleteProgress,
  getReadingStats,
  getYearlyGoalProgress,
  getReadingStreak,
  getCurrentlyReading,
  exportProgress,
  importProgress,
  type BookProgress,
  type ReadingStatus,
} from '../utils/readingProgress';

interface ReadingProgressPanelProps {
  onClose: () => void;
}

const ReadingProgressPanel: React.FC<ReadingProgressPanelProps> = ({ onClose }) => {
  const nodes = useStore(s => s.nodes);

  const [progress, setProgress] = useState<BookProgress[]>(getAllProgress());
  const [editingBook, setEditingBook] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [yearlyGoal, setYearlyGoal] = useState(50);
  const [filterStatus, setFilterStatus] = useState<ReadingStatus | 'all'>('all');

  const stats = useMemo(() => getReadingStats(), [progress]);
  const goalProgress = useMemo(() => getYearlyGoalProgress(yearlyGoal), [yearlyGoal, progress]);
  const streak = useMemo(() => getReadingStreak(), [progress]);
  const currentlyReading = useMemo(() => getCurrentlyReading(), [progress]);

  const filteredProgress = useMemo(() => {
    if (filterStatus === 'all') return progress;
    return progress.filter(p => p.status === filterStatus);
  }, [progress, filterStatus]);

  const handleUpdateProgress = (bookId: string, updates: Partial<BookProgress>) => {
    const existing = progress.find(p => p.bookId === bookId);
    if (existing) {
      const updated = { ...existing, ...updates };
      if (updateProgress(updated)) {
        setProgress(getAllProgress());
        setEditingBook(null);
      }
    }
  };

  const handleAddProgress = (bookId: string, bookTitle: string) => {
    const newProgress: BookProgress = {
      bookId,
      bookTitle,
      status: 'to-read',
      lastUpdated: new Date().toISOString(),
    };
    if (updateProgress(newProgress)) {
      setProgress(getAllProgress());
      setShowAddForm(false);
    }
  };

  const handleDeleteProgress = (bookId: string) => {
    if (confirm('Are you sure you want to delete this reading progress?')) {
      if (deleteProgress(bookId)) {
        setProgress(getAllProgress());
      }
    }
  };

  const handleExport = () => {
    const json = exportProgress();
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `reading-progress-${Date.now()}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleImport = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'application/json';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (event) => {
          const content = event.target?.result as string;
          if (importProgress(content)) {
            setProgress(getAllProgress());
            alert('Reading progress imported successfully!');
          } else {
            alert('Failed to import reading progress. Please check the file format.');
          }
        };
        reader.readAsText(file);
      }
    };
    input.click();
  };

  const getStatusColor = (status: ReadingStatus): string => {
    switch (status) {
      case 'reading': return '#3b82f6';
      case 'completed': return '#10b981';
      case 'to-read': return '#f59e0b';
      case 'abandoned': return '#6b7280';
      default: return '#6b7280';
    }
  };

  const renderStars = (rating?: number) => {
    if (!rating) return null;
    return (
      <div className="star-rating">
        {[1, 2, 3, 4, 5].map(star => (
          <span
            key={star}
            className={`star ${star <= rating ? 'filled' : ''}`}
            aria-hidden="true"
          >
            {star <= rating ? '★' : '☆'}
          </span>
        ))}
      </div>
    );
  };

  return (
    <div className="reading-progress-panel" role="dialog" aria-labelledby="progress-title" aria-modal="true">
      <div className="progress-header">
        <h2 id="progress-title">Reading Progress</h2>
        <div className="progress-header-actions">
          <button
            className="progress-action-btn"
            onClick={handleExport}
            title="Export reading progress"
            aria-label="Export progress as JSON"
          >
            <span className="icon" aria-hidden="true">download</span>
            Export
          </button>
          <button
            className="progress-action-btn"
            onClick={handleImport}
            title="Import reading progress"
            aria-label="Import progress from JSON"
          >
            <span className="icon" aria-hidden="true">upload</span>
            Import
          </button>
          <button className="close-button" onClick={onClose} aria-label="Close reading progress panel">
            <span className="icon" aria-hidden="true">close</span>
          </button>
        </div>
      </div>

      <div className="progress-content">
        {/* Overview Stats */}
        <section className="progress-section">
          <h3>Overview</h3>
          <div className="progress-stats-grid">
            <div className="progress-stat-card">
              <div className="stat-icon" style={{ backgroundColor: '#10b981' }}>
                <span className="icon" aria-hidden="true">check_circle</span>
              </div>
              <div className="stat-info">
                <div className="stat-label">Completed</div>
                <div className="stat-value">{stats.completed}</div>
              </div>
            </div>
            <div className="progress-stat-card">
              <div className="stat-icon" style={{ backgroundColor: '#3b82f6' }}>
                <span className="icon" aria-hidden="true">menu_book</span>
              </div>
              <div className="stat-info">
                <div className="stat-label">Currently Reading</div>
                <div className="stat-value">{stats.reading}</div>
              </div>
            </div>
            <div className="progress-stat-card">
              <div className="stat-icon" style={{ backgroundColor: '#f59e0b' }}>
                <span className="icon" aria-hidden="true">bookmark</span>
              </div>
              <div className="stat-info">
                <div className="stat-label">To Read</div>
                <div className="stat-value">{stats.toRead}</div>
              </div>
            </div>
            <div className="progress-stat-card">
              <div className="stat-icon" style={{ backgroundColor: '#eab308' }}>
                <span className="icon" aria-hidden="true">star</span>
              </div>
              <div className="stat-info">
                <div className="stat-label">Avg Rating</div>
                <div className="stat-value">{stats.averageRating.toFixed(1)}</div>
              </div>
            </div>
          </div>
        </section>

        {/* Yearly Goal */}
        <section className="progress-section">
          <h3>Yearly Reading Goal</h3>
          <div className="goal-settings">
            <label htmlFor="yearly-goal">
              Goal for {new Date().getFullYear()}:
            </label>
            <input
              id="yearly-goal"
              type="number"
              min="1"
              value={yearlyGoal}
              onChange={(e) => setYearlyGoal(parseInt(e.target.value) || 50)}
              className="goal-input"
              aria-label="Set yearly reading goal"
            />
            <span>books</span>
          </div>
          <div className="goal-progress">
            <div className="goal-bar">
              <div
                className="goal-bar-fill"
                style={{
                  width: `${goalProgress.percentage}%`,
                  backgroundColor: goalProgress.onTrack ? '#10b981' : '#f59e0b',
                }}
              />
            </div>
            <div className="goal-info">
              <span>
                {goalProgress.completed} / {goalProgress.goal} books
                ({goalProgress.percentage.toFixed(0)}%)
              </span>
              <span className={goalProgress.onTrack ? 'on-track' : 'behind'}>
                {goalProgress.onTrack ? '✓ On track' : '⚠ Behind schedule'}
              </span>
            </div>
            {goalProgress.remaining > 0 && (
              <div className="goal-remaining">
                {goalProgress.remaining} books remaining
              </div>
            )}
          </div>
        </section>

        {/* Reading Streak */}
        {streak.currentStreak > 0 && (
          <section className="progress-section">
            <h3>Reading Streak</h3>
            <div className="streak-info">
              <div className="streak-current">
                <span className="icon" aria-hidden="true">local_fire_department</span>
                <span className="streak-value">{streak.currentStreak}</span>
                <span className="streak-label">Current Streak</span>
              </div>
              <div className="streak-longest">
                <span className="icon" aria-hidden="true">emoji_events</span>
                <span className="streak-value">{streak.longestStreak}</span>
                <span className="streak-label">Longest Streak</span>
              </div>
            </div>
          </section>
        )}

        {/* Currently Reading */}
        {currentlyReading.length > 0 && (
          <section className="progress-section">
            <h3>Currently Reading</h3>
            <div className="currently-reading-list">
              {currentlyReading.map(book => (
                <div key={book.bookId} className="currently-reading-item">
                  <div className="reading-book-info">
                    <div className="reading-book-title">{book.bookTitle}</div>
                    {book.progress !== undefined && (
                      <div className="reading-progress-bar">
                        <div
                          className="reading-progress-fill"
                          style={{ width: `${book.progress}%` }}
                        />
                        <span className="reading-progress-text">{book.progress}%</span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Filter */}
        <section className="progress-section">
          <div className="progress-filter">
            <label htmlFor="status-filter">Filter by status:</label>
            <select
              id="status-filter"
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value as ReadingStatus | 'all')}
              className="filter-select"
            >
              <option value="all">All ({stats.totalBooks})</option>
              <option value="reading">Reading ({stats.reading})</option>
              <option value="completed">Completed ({stats.completed})</option>
              <option value="to-read">To Read ({stats.toRead})</option>
              <option value="abandoned">Abandoned ({stats.abandoned})</option>
            </select>
          </div>
        </section>

        {/* Books List */}
        <section className="progress-section">
          <div className="progress-books-header">
            <h3>Books</h3>
            <button
              className="add-progress-btn"
              onClick={() => setShowAddForm(!showAddForm)}
              aria-label="Add new book to reading list"
            >
              <span className="icon" aria-hidden="true">add</span>
              Add Book
            </button>
          </div>

          {/* Add Form */}
          {showAddForm && (
            <div className="add-progress-form">
              <select
                className="book-select"
                onChange={(e) => {
                  const bookId = e.target.value;
                  if (bookId) {
                    const node = nodes[bookId];
                    if (node && node.type === 'book') {
                      handleAddProgress(bookId, node.label);
                    }
                  }
                }}
                aria-label="Select book to add"
              >
                <option value="">Select a book...</option>
                {Object.values(nodes)
                  .filter(node => node.type === 'book')
                  .filter(node => !progress.find(p => p.bookId === node.label))
                  .map(node => (
                    <option key={node.label} value={node.label}>
                      {node.label}
                    </option>
                  ))}
              </select>
            </div>
          )}

          {/* Books List */}
          <div className="progress-books-list">
            {filteredProgress.length === 0 ? (
              <div className="no-progress">
                <span className="icon" aria-hidden="true">menu_book</span>
                <p>No books found</p>
                <p className="hint">Add books to start tracking your reading progress</p>
              </div>
            ) : (
              filteredProgress.map(book => (
                <div key={book.bookId} className="progress-book-item">
                  <div className="book-header">
                    <div className="book-title-section">
                      <div className="book-title">{book.bookTitle}</div>
                      <span
                        className="book-status-badge"
                        style={{ backgroundColor: getStatusColor(book.status) }}
                      >
                        {book.status}
                      </span>
                    </div>
                    <div className="book-actions">
                      <button
                        className="book-action-btn"
                        onClick={() => setEditingBook(editingBook === book.bookId ? null : book.bookId)}
                        aria-label={editingBook === book.bookId ? 'Close editor' : 'Edit progress'}
                      >
                        <span className="icon" aria-hidden="true">
                          {editingBook === book.bookId ? 'expand_less' : 'expand_more'}
                        </span>
                      </button>
                      <button
                        className="book-action-btn delete"
                        onClick={() => handleDeleteProgress(book.bookId)}
                        aria-label="Delete progress"
                      >
                        <span className="icon" aria-hidden="true">delete</span>
                      </button>
                    </div>
                  </div>

                  {/* Book Metadata */}
                  <div className="book-metadata">
                    {book.rating && (
                      <div className="book-rating">
                        {renderStars(book.rating)}
                      </div>
                    )}
                    {book.progress !== undefined && book.status === 'reading' && (
                      <div className="book-progress-text">
                        {book.progress}% complete
                      </div>
                    )}
                    {book.startedAt && (
                      <div className="book-date">
                        Started: {new Date(book.startedAt).toLocaleDateString()}
                      </div>
                    )}
                    {book.completedAt && (
                      <div className="book-date">
                        Completed: {new Date(book.completedAt).toLocaleDateString()}
                      </div>
                    )}
                  </div>

                  {/* Editor */}
                  {editingBook === book.bookId && (
                    <div className="book-editor">
                      <div className="editor-field">
                        <label htmlFor={`status-${book.bookId}`}>Status:</label>
                        <select
                          id={`status-${book.bookId}`}
                          value={book.status}
                          onChange={(e) => handleUpdateProgress(book.bookId, { status: e.target.value as ReadingStatus })}
                          className="editor-select"
                        >
                          <option value="to-read">To Read</option>
                          <option value="reading">Reading</option>
                          <option value="completed">Completed</option>
                          <option value="abandoned">Abandoned</option>
                        </select>
                      </div>

                      {book.status === 'reading' && (
                        <div className="editor-field">
                          <label htmlFor={`progress-${book.bookId}`}>
                            Progress: {book.progress || 0}%
                          </label>
                          <input
                            id={`progress-${book.bookId}`}
                            type="range"
                            min="0"
                            max="100"
                            value={book.progress || 0}
                            onChange={(e) => handleUpdateProgress(book.bookId, { progress: parseInt(e.target.value) })}
                            className="editor-range"
                            aria-label="Reading progress percentage"
                          />
                        </div>
                      )}

                      <div className="editor-field">
                        <label htmlFor={`rating-${book.bookId}`}>Rating:</label>
                        <select
                          id={`rating-${book.bookId}`}
                          value={book.rating || ''}
                          onChange={(e) => handleUpdateProgress(book.bookId, { rating: e.target.value ? parseInt(e.target.value) : undefined })}
                          className="editor-select"
                        >
                          <option value="">No rating</option>
                          <option value="1">★ (1 star)</option>
                          <option value="2">★★ (2 stars)</option>
                          <option value="3">★★★ (3 stars)</option>
                          <option value="4">★★★★ (4 stars)</option>
                          <option value="5">★★★★★ (5 stars)</option>
                        </select>
                      </div>

                      <div className="editor-field">
                        <label htmlFor={`notes-${book.bookId}`}>Notes:</label>
                        <textarea
                          id={`notes-${book.bookId}`}
                          value={book.notes || ''}
                          onChange={(e) => handleUpdateProgress(book.bookId, { notes: e.target.value })}
                          className="editor-textarea"
                          placeholder="Add your thoughts, notes, or reflections..."
                          rows={3}
                          aria-label="Reading notes"
                        />
                      </div>
                    </div>
                  )}

                  {/* Notes Display */}
                  {book.notes && editingBook !== book.bookId && (
                    <div className="book-notes">
                      <span className="icon" aria-hidden="true">note</span>
                      {book.notes}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </section>
      </div>
    </div>
  );
};

export default ReadingProgressPanel;
