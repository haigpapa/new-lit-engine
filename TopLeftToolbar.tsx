/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import { useState } from "react";
import c from "clsx";
import useStore from "./store";
import {
    setActivePanel,
    toggleConnectionMode,
    toggleTimelineFilter,
    toggleResetPanel,
    toggleVisualizationMode,
} from "./actions";

const TopLeftToolbar: React.FC = () => {
    const [isExpanded, setIsExpanded] = useState(false);

    const activePanel = useStore(s => s.activePanel);
    const selectedNode = useStore(s => s.selectedNode);
    const connectionMode = useStore(s => s.connectionMode);
    const isTimelineActive = useStore(s => s.isTimelineActive);
    const isResetPanelVisible = useStore(s => s.isResetPanelVisible);
    const visualizationMode = useStore(s => s.visualizationMode);
    const isGraphMode = visualizationMode === 'graph';

    return (
        <aside className="top-left-toolbar">
            <button
                className="toolbar-button toolbar-logo"
                title="About Storylines"
                onClick={() => setActivePanel('help')}
            >
                <span className="icon">public</span>
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
                    title="Graph Nodes"
                    onClick={() => setActivePanel('nodes')}
                    className={c('toolbar-button', { active: activePanel === 'nodes' })}
                >
                    <span className="icon">list</span>
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
            </div>
        </aside>
    );
};

export default TopLeftToolbar;
