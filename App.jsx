/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import { useRef, useState, useEffect, useMemo } from "react";
import c from "clsx";
import GraphViz from "./GraphViz";
import BookGridViz from "./BookGridViz";
import useStore from "./store";
import SidePanel from "./SidePanel";
import TopLeftToolbar from "./TopLeftToolbar";
import Intro from "./Intro";

import {
  sendQuery,
  resetCamera,
  startJourney,
  setTimelineRange,
  setActivePanel,
  toggleResetPanel,
  clearQuery,
  toggleJourneySuggestions,
  toggleGroundedSearch,
} from "./actions";

const JourneySuggestions = () => (
    <div className="journey-suggestions">
      <button onClick={() => startJourney('Magical Realism')}>Magical Realism</button>
      <button onClick={() => startJourney('Experimental Fiction')}>Experimental Fiction</button>
      <button onClick={() => startJourney('Autofiction')}>Autofiction</button>
      <button onClick={() => startJourney('Mythology')}>Mythology</button>
      <button onClick={() => startJourney('The Beat Generation')}>The Beat Generation</button>
    </div>
  );
  
const TimelineFilter = () => {
    const isTimelineActive = useStore(state => state.isTimelineActive);
    const nodes = useStore(state => state.nodes);

    const { min, max } = useMemo(() => {
        const years = Object.values(nodes)
            .map(n => n.publicationYear)
            .filter(Boolean);
        if (years.length < 2) return { min: 1500, max: new Date().getFullYear() };
        const minYear = Math.min(...years);
        const maxYear = Math.max(...years);
        return { min: minYear, max: maxYear };
    }, [nodes]);

    const [startYear, setStartYear] = useState(min);
    const [endYear, setEndYear] = useState(max);

    const handleStartChange = (e) => {
        const newStart = Math.min(Number(e.target.value), endYear - 1);
        setStartYear(newStart);
    };

    const handleEndChange = (e) => {
        const newEnd = Math.max(Number(e.target.value), startYear + 1);
        setEndYear(newEnd);
    };
    
    // Update global state when sliders stop moving
    const handleMouseUp = () => {
        setTimelineRange({ start: startYear, end: endYear });
    };

    // Initialize/update local state when range or active status changes
    useEffect(() => {
        setStartYear(min);
        setEndYear(max);
        setTimelineRange({ start: min, end: max });
    }, [min, max]);

    if (!isTimelineActive) return null;

    const range = max - min;
    const startPercentage = range > 0 ? ((startYear - min) / range) * 100 : 0;
    const endPercentage = range > 0 ? ((endYear - min) / range) * 100 : 100;

    return (
        <div className="bottom-panel">
            <div className="timeline-labels">
                <span>{startYear}</span>
                <span>Timeline</span>
                <span>{endYear}</span>
            </div>
             <div className="timeline-slider-container">
                 <div className="timeline-track"/>
                 <div className="timeline-track-highlight" style={{ left: `${startPercentage}%`, right: `${100 - endPercentage}%`}}/>
                 <input
                    type="range"
                    min={min}
                    max={max}
                    value={startYear}
                    onChange={handleStartChange}
                    onMouseUp={handleMouseUp}
                    onTouchEnd={handleMouseUp}
                    className="timeline-slider"
                    aria-label="Start year"
                />
                 <input
                    type="range"
                    min={min}
                    max={max}
                    value={endYear}
                    onChange={handleEndChange}
                    onMouseUp={handleMouseUp}
                    onTouchEnd={handleMouseUp}
                    className="timeline-slider"
                    aria-label="End year"
                />
            </div>
        </div>
    );
};

const ResetPanel = () => {
    const isResetPanelVisible = useStore(state => state.isResetPanelVisible);
    if (!isResetPanelVisible) return null;
    return (
      <div className="bottom-panel reset-panel">
        <p>Reset the universe to its start?</p>
        <button onClick={clearQuery}>
          Yes, Reset
        </button>
        <button onClick={toggleResetPanel}>Cancel</button>
      </div>
    );
  };


export default function App() {
  const didInit = useStore(s => s.didInit);
  const isFetching = useStore(s => s.isFetching);
  const selectedNode = useStore(s => s.selectedNode);
  const activePanel = useStore(s => s.activePanel);
  const areJourneySuggestionsVisible = useStore(s => s.areJourneySuggestionsVisible);
  const isGroundedSearchActive = useStore(s => s.isGroundedSearchActive);
  const visualizationMode = useStore(s => s.visualizationMode);
  const isGridLoading = useStore(s => s.bookGrid.isLoading);
  const isTimelineActive = useStore(s => s.isTimelineActive);


  const [value, setValue] = useState("");
  const inputRef = useRef(null);

  const handleSendQuery = () => {
    if (value) {
      sendQuery(value);
      setValue("");
      inputRef.current.blur();
    }
  };
  
  if (!didInit) {
    return (
        <main>
            <Intro />
            {/* Render GraphViz in background so physics can init, but keep it hidden */}
            <div style={{ opacity: 0, pointerEvents: 'none' }}>
              <GraphViz />
            </div>
        </main>
    );
  }

  const isGraphMode = visualizationMode === 'graph';
  const showTimeline = isGraphMode && isTimelineActive;

  return (
    <main className="app-loaded">
      <TopLeftToolbar />
      
      {isGraphMode ? <GraphViz /> : <BookGridViz />}

      <div 
        className={c('panel-overlay', { active: activePanel })}
        onClick={() => setActivePanel(null)} 
      />
      <SidePanel />

      <footer>
        {areJourneySuggestionsVisible && isGraphMode && <JourneySuggestions />}
        <ResetPanel />
        {showTimeline && <TimelineFilter />}
        
        <div className="input-wrapper">
          <div className="command-pill">
            {isGraphMode && (
                <button
                onClick={toggleJourneySuggestions}
                className={c("command-pill-icon", { active: areJourneySuggestionsVisible })}
                title="Start a Journey"
                >
                    <span className="icon">auto_awesome</span>
                </button>
            )}
            <input
              value={value}
              onChange={(e) => setValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleSendQuery();
              }}
              ref={inputRef}
              placeholder={isGraphMode ? "search books, authors, themes" : "search for a book to start"}
            />
            <img
              src="https://storage.googleapis.com/experiments-uploads/g2demos/photo-applet/spinner.svg"
              className={c("spinner", { active: isFetching || isGridLoading })}
            />
             {isGraphMode && (
                <button
                onClick={toggleGroundedSearch}
                className={c("command-pill-icon", { active: isGroundedSearchActive })}
                title="Toggle Web Search"
                >
                <span className="icon">language</span>
                </button>
            )}
            <button
              onClick={() => setValue("")}
              className={c("command-pill-icon", "clear-button", { active: value.length > 0 })}
              title="Clear search"
            >
              <span className="icon">close</span>
            </button>
            <button
                onClick={resetCamera}
                className={c("command-pill-icon", "zoom-out-button", { active: !!selectedNode && isGraphMode })}
                aria-label="Reset view"
                title="Reset view"
            >
                <span className="icon">zoom_out_map</span>
            </button>
            
            {!(isFetching || isGridLoading) && value.length > 0 && (
                <button
                  onClick={handleSendQuery}
                  className="command-pill-icon"
                  title="Search"
                >
                    <span className="icon">search</span>
                </button>
            )}
          </div>
        </div>
      </footer>
    </main>
  );
}