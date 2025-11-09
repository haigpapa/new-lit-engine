/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import { useEffect } from 'react';
import useStore from '../store';
import { setActivePanel, setSelectedNode, toggleJourneySuggestions, resetCamera } from '../actions';

interface KeyboardShortcutsOptions {
  inputRef: React.RefObject<HTMLInputElement>;
}

export const useKeyboardShortcuts = ({ inputRef }: KeyboardShortcutsOptions) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger shortcuts when typing in input
      const isTyping = document.activeElement === inputRef.current;

      // ESC - Close panels, clear selection, blur input
      if (e.key === 'Escape') {
        e.preventDefault();
        const state = useStore.getState();

        if (state.activePanel) {
          setActivePanel(null);
        } else if (state.selectedNode) {
          setSelectedNode(null);
        } else if (state.areJourneySuggestionsVisible) {
          toggleJourneySuggestions();
        } else if (isTyping) {
          inputRef.current?.blur();
        }
      }

      // / - Focus search input
      if (e.key === '/' && !isTyping) {
        e.preventDefault();
        inputRef.current?.focus();
      }

      // ? - Show help panel
      if (e.key === '?' && !isTyping) {
        e.preventDefault();
        setActivePanel('help');
      }

      // h - Show help panel (alternative)
      if (e.key === 'h' && !isTyping) {
        e.preventDefault();
        setActivePanel('help');
      }

      // d - Show details panel (if node selected)
      if (e.key === 'd' && !isTyping) {
        e.preventDefault();
        const state = useStore.getState();
        if (state.selectedNode) {
          setActivePanel('details');
        }
      }

      // f - Show filters panel
      if (e.key === 'f' && !isTyping) {
        e.preventDefault();
        setActivePanel('filters');
      }

      // n - Show nodes panel
      if (e.key === 'n' && !isTyping) {
        e.preventDefault();
        setActivePanel('nodes');
      }

      // r - Reset camera view
      if (e.key === 'r' && !isTyping) {
        e.preventDefault();
        resetCamera();
      }

      // j - Toggle journey suggestions
      if (e.key === 'j' && !isTyping) {
        e.preventDefault();
        toggleJourneySuggestions();
      }

      // Arrow keys - Navigate between connected nodes
      if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(e.key) && !isTyping) {
        const state = useStore.getState();
        const { selectedNode, nodes, edges } = state;

        if (!selectedNode) return;

        e.preventDefault();

        // Get connected nodes
        const connectedNodeIds = edges
          .filter(edge => edge.source === selectedNode || edge.target === selectedNode)
          .map(edge => edge.source === selectedNode ? edge.target : edge.source);

        if (connectedNodeIds.length === 0) return;

        // Simple navigation: cycle through connected nodes
        const currentIndex = connectedNodeIds.indexOf(selectedNode);
        let nextIndex = 0;

        if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
          nextIndex = (currentIndex + 1) % connectedNodeIds.length;
        } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
          nextIndex = (currentIndex - 1 + connectedNodeIds.length) % connectedNodeIds.length;
        }

        setSelectedNode(connectedNodeIds[nextIndex]);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [inputRef]);
};
