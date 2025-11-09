/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import React, { useState, useEffect } from 'react';
import {
  loadPreferences,
  savePreferences,
  getStorageInfo,
  formatBytes,
  clearSavedGraph,
  saveGraphToStorage,
  loadGraphFromStorage,
  importGraphFromJSON,
  type UserPreferences,
} from '../utils/persistence';
import useStore from '../store';

interface SettingsPanelProps {
  onClose: () => void;
}

const SettingsPanel: React.FC<SettingsPanelProps> = ({ onClose }) => {
  const nodes = useStore(s => s.nodes);
  const edges = useStore(s => s.edges);

  const [preferences, setPreferences] = useState<UserPreferences>(loadPreferences());
  const [storageInfo, setStorageInfo] = useState(getStorageInfo());
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [importStatus, setImportStatus] = useState<string>('');

  useEffect(() => {
    setStorageInfo(getStorageInfo());
  }, []);

  const showMessage = (type: 'success' | 'error', text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 3000);
  };

  const handlePreferenceChange = (key: keyof UserPreferences, value: any) => {
    const updated = { ...preferences, [key]: value };
    setPreferences(updated);
    savePreferences(updated);
    showMessage('success', 'Settings saved');
  };

  const handleManualSave = () => {
    const success = saveGraphToStorage(nodes, edges);
    if (success) {
      setStorageInfo(getStorageInfo());
      showMessage('success', 'Graph saved successfully');
    } else {
      showMessage('error', 'Failed to save graph');
    }
  };

  const handleLoadFromStorage = () => {
    const data = loadGraphFromStorage();
    if (data) {
      // Update the store with loaded data
      const set = useStore.setState as any;
      set((state: any) => {
        state.nodes = data.nodes;
        state.edges = data.edges;
      });
      showMessage('success', `Loaded graph from ${new Date(data.timestamp).toLocaleString()}`);
    } else {
      showMessage('error', 'No saved graph found');
    }
  };

  const handleClearSaved = () => {
    if (confirm('Are you sure you want to clear saved data? This cannot be undone.')) {
      const success = clearSavedGraph();
      if (success) {
        setStorageInfo(getStorageInfo());
        showMessage('success', 'Saved graph cleared');
      } else {
        showMessage('error', 'Failed to clear saved graph');
      }
    }
  };

  const handleFileImport = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      const data = importGraphFromJSON(content);

      if (data) {
        // Update the store with imported data
        const set = useStore.setState as any;
        set((state: any) => {
          state.nodes = data.nodes;
          state.edges = data.edges;
        });
        setImportStatus('success');
        showMessage('success', `Imported ${Object.keys(data.nodes).length} nodes and ${data.edges.length} edges`);
      } else {
        setImportStatus('error');
        showMessage('error', 'Failed to import graph - invalid format');
      }
    };
    reader.onerror = () => {
      setImportStatus('error');
      showMessage('error', 'Failed to read file');
    };
    reader.readAsText(file);

    // Reset file input
    event.target.value = '';
  };

  const savedGraph = loadGraphFromStorage();

  return (
    <div className="settings-panel">
      <div className="settings-header">
        <h2>Settings</h2>
        <button className="close-button" onClick={onClose} aria-label="Close settings">
          <span className="icon">close</span>
        </button>
      </div>

      <div className="settings-content">
        {/* Preferences Section */}
        <section className="settings-section">
          <h3>Preferences</h3>

          <div className="setting-item">
            <label>
              <input
                type="checkbox"
                checked={preferences.autoSave}
                onChange={(e) => handlePreferenceChange('autoSave', e.target.checked)}
              />
              <span>Enable auto-save</span>
            </label>
            <p className="setting-description">Automatically save your graph to browser storage</p>
          </div>

          <div className="setting-item">
            <label htmlFor="save-interval">Auto-save interval</label>
            <div className="setting-control">
              <input
                id="save-interval"
                type="range"
                min="1"
                max="30"
                value={preferences.saveInterval}
                onChange={(e) => handlePreferenceChange('saveInterval', Number(e.target.value))}
                disabled={!preferences.autoSave}
              />
              <span className="setting-value">{preferences.saveInterval} min</span>
            </div>
          </div>

          <div className="setting-item">
            <label>
              <input
                type="checkbox"
                checked={preferences.showJourneySuggestionsOnStart}
                onChange={(e) => handlePreferenceChange('showJourneySuggestionsOnStart', e.target.checked)}
              />
              <span>Show journey suggestions on start</span>
            </label>
          </div>
        </section>

        {/* Data Management Section */}
        <section className="settings-section">
          <h3>Data Management</h3>

          <div className="storage-info">
            <div className="storage-bar">
              <div
                className="storage-bar-fill"
                style={{ width: `${storageInfo.percentage}%` }}
              />
            </div>
            <p className="storage-text">
              {formatBytes(storageInfo.used)} / {formatBytes(storageInfo.available)} used
              ({Math.round(storageInfo.percentage)}%)
            </p>
          </div>

          <div className="setting-actions">
            <button
              className="setting-button"
              onClick={handleManualSave}
              title="Save current graph to browser storage"
            >
              <span className="icon">save</span>
              Save Graph
            </button>

            {savedGraph && (
              <button
                className="setting-button"
                onClick={handleLoadFromStorage}
                title={`Load saved graph from ${new Date(savedGraph.timestamp).toLocaleString()}`}
              >
                <span className="icon">restore</span>
                Load Saved
              </button>
            )}

            <button
              className="setting-button danger"
              onClick={handleClearSaved}
              title="Clear saved graph data"
              disabled={!savedGraph}
            >
              <span className="icon">delete</span>
              Clear Saved
            </button>
          </div>

          {savedGraph && (
            <p className="saved-info">
              Last saved: {new Date(savedGraph.timestamp).toLocaleString()}
            </p>
          )}
        </section>

        {/* Import/Export Section */}
        <section className="settings-section">
          <h3>Import Graph</h3>
          <p className="setting-description">
            Import a previously exported graph from a JSON file
          </p>

          <div className="file-import">
            <label htmlFor="file-import" className="file-import-label">
              <span className="icon">upload_file</span>
              Choose JSON File
            </label>
            <input
              id="file-import"
              type="file"
              accept=".json,application/json"
              onChange={handleFileImport}
              className="file-import-input"
            />
          </div>

          {importStatus && (
            <p className={`import-status ${importStatus}`}>
              {importStatus === 'success' ? 'Import successful!' : 'Import failed'}
            </p>
          )}
        </section>

        {/* Message Display */}
        {message && (
          <div className={`settings-message ${message.type}`}>
            {message.text}
          </div>
        )}
      </div>
    </div>
  );
};

export default SettingsPanel;
