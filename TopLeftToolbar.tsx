/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import { useState } from "react";
import c from "clsx";
import useStore from "./store";
import SettingsPanel from "./components/SettingsPanel";
import AnalyticsPanel from "./components/AnalyticsPanel";
import PerformanceDashboard from "./components/PerformanceDashboard";
import AdvancedFiltersPanel from "./components/AdvancedFiltersPanel";
import AdvancedSearchPanel from "./components/AdvancedSearchPanel";
import ReadingProgressPanel from "./components/ReadingProgressPanel";
import {
    setActivePanel,
    toggleConnectionMode,
    toggleTimelineFilter,
    toggleResetPanel,
    toggleVisualizationMode,
} from "./actions";

const TopLeftToolbar: React.FC = () => {
    const [isExpanded, setIsExpanded] = useState(false);
    const [showSettings, setShowSettings] = useState(false);
    const [showAnalytics, setShowAnalytics] = useState(false);
    const [showPerformance, setShowPerformance] = useState(false);
    const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
    const [showAdvancedSearch, setShowAdvancedSearch] = useState(false);
    const [showReadingProgress, setShowReadingProgress] = useState(false);

    const activePanel = useStore(s => s.activePanel);
    const selectedNode = useStore(s => s.selectedNode);
    const connectionMode = useStore(s => s.connectionMode);
    const isTimelineActive = useStore(s => s.isTimelineActive);
    const isResetPanelVisible = useStore(s => s.isResetPanelVisible);
    const visualizationMode = useStore(s => s.visualizationMode);
    const isGraphMode = visualizationMode === 'graph';

    return (
        <>
            <aside className="top-left-toolbar">
                <button
                    className="toolbar-button toolbar-logo"
                    title="About Storylines"
                    onClick={() => setActivePanel('help')}
                >
                    <span className="icon">public</span>
                </button>
                <button
                    className={c("toolbar-button", { active: showAnalytics })}
                    title="Analytics"
                    onClick={() => setShowAnalytics(prev => !prev)}
                >
                    <span className="icon">bar_chart</span>
                </button>
                <button
                    className={c("toolbar-button", { active: showSettings })}
                    title="Settings"
                    onClick={() => setShowSettings(prev => !prev)}
                >
                    <span className="icon">settings</span>
                </button>
                <button
                    className={c("toolbar-button", { active: !isGraphMode })}
                    title={isGraphMode ? "Switch to Book Grid View" : "Switch to Graph View"}
                    onClick={toggleVisualizationMode}
                >
                    <span className="icon">grid_view</span>
                </button>
            <button
                className={c("toolbar-button", { active: isExpanded })}
                title={isExpanded ? "Collapse actions" : "Expand actions"}
                onClick={() => setIsExpanded(prev => !prev)}
            >
                <span className="icon">menu</span>
            </button>

            <div className={c("toolbar-expansion", { expanded: isExpanded })}>
                 {/* Data Tools */}
                <button
                    title="Selection Details"
                    onClick={() => setActivePanel('details')}
                    className={c('toolbar-button', { active: activePanel === 'details' })}
                    disabled={!selectedNode || !isGraphMode}
                >
                    <span className="icon">info</span>
                </button>
                <button
                    title="Filters"
                    onClick={() => setActivePanel('filters')}
                    className={c('toolbar-button', { active: activePanel === 'filters' })}
                >
                    <span className="icon">filter_alt</span>
                </button>
                <button
                    title="Advanced Filters"
                    onClick={() => setShowAdvancedFilters(prev => !prev)}
                    className={c('toolbar-button', { active: showAdvancedFilters })}
                >
                    <span className="icon">filter_list</span>
                </button>
                <button
                    title="Graph Nodes"
                    onClick={() => setActivePanel('nodes')}
                    className={c('toolbar-button', { active: activePanel === 'nodes' })}
                >
                    <span className="icon">list</span>
                </button>
                <button
                    title="Advanced Search"
                    onClick={() => setShowAdvancedSearch(prev => !prev)}
                    className={c('toolbar-button', { active: showAdvancedSearch })}
                >
                    <span className="icon">travel_explore</span>
                </button>
                <button
                    title="Reading Progress"
                    onClick={() => setShowReadingProgress(prev => !prev)}
                    className={c('toolbar-button', { active: showReadingProgress })}
                >
                    <span className="icon">auto_stories</span>
                </button>

                 {/* Action Tools */}
                <button
                    title="Find Connection Path"
                    onClick={toggleConnectionMode}
                    className={c('toolbar-button', { active: connectionMode !== 'inactive' })}
                    disabled={!isGraphMode}
                >
                    <span className="icon">timeline</span>
                </button>
                <button
                    title="Filter by Timeline"
                    onClick={toggleTimelineFilter}
                    className={c('toolbar-button', { active: isTimelineActive })}
                     disabled={!isGraphMode}
                >
                    <span className="icon">calendar_month</span>
                </button>
                     <button
                    title="Reset Universe"
                    onClick={toggleResetPanel}
                    className={c('toolbar-button', { active: isResetPanelVisible })}
                >
                    <span className="icon">refresh</span>
                </button>
                <button
                    title="Performance Monitor"
                    onClick={() => setShowPerformance(prev => !prev)}
                    className={c('toolbar-button', { active: showPerformance })}
                >
                    <span className="icon">speed</span>
                </button>
            </div>
        </aside>

        {showSettings && (
            <>
                <div
                    className="settings-overlay"
                    onClick={() => setShowSettings(false)}
                />
                <SettingsPanel onClose={() => setShowSettings(false)} />
            </>
        )}

        {showAnalytics && (
            <>
                <div
                    className="settings-overlay"
                    onClick={() => setShowAnalytics(false)}
                />
                <AnalyticsPanel onClose={() => setShowAnalytics(false)} />
            </>
        )}

        {showAdvancedFilters && (
            <>
                <div
                    className="settings-overlay"
                    onClick={() => setShowAdvancedFilters(false)}
                />
                <AdvancedFiltersPanel
                    onClose={() => setShowAdvancedFilters(false)}
                    onApplyFilter={(filterId) => {
                        console.log('Applied filter:', filterId);
                    }}
                />
            </>
        )}

        {showAdvancedSearch && (
            <>
                <div
                    className="settings-overlay"
                    onClick={() => setShowAdvancedSearch(false)}
                />
                <AdvancedSearchPanel onClose={() => setShowAdvancedSearch(false)} />
            </>
        )}

        {showReadingProgress && (
            <>
                <div
                    className="settings-overlay"
                    onClick={() => setShowReadingProgress(false)}
                />
                <ReadingProgressPanel onClose={() => setShowReadingProgress(false)} />
            </>
        )}

        {showPerformance && <PerformanceDashboard compact={true} />}
        </>
    );
};

export default TopLeftToolbar;
