/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import React from 'react';
import c from 'clsx';
import useStore from './store';

const Intro = () => {
  const loadingProgress = useStore(s => s.loadingProgress);
  const loadingMessage = useStore(s => s.loadingMessage);
  const isProcessing = !!loadingMessage;

  return (
    <div className="intro-container">
      <div className={c("intro-loader-pill", { "processing": isProcessing })}>
        <div className="intro-loader-progress" style={{ width: `${isProcessing ? loadingProgress : 0}%` }} />
        <div className="intro-loader-content">
            <span className={c("icon", { spinning: isProcessing })}>public</span>
            <h1>Storylines</h1>
        </div>
      </div>
    </div>
  );
};

export default Intro;