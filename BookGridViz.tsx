/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import React from 'react';
import c from 'clsx';
import useStore from './store';
import BookGridNode from './BookGridNode';

const BookGridViz: React.FC = () => {
    const slots = useStore(state => state.bookGrid.slots);
    const isSeeded = useStore(state => state.bookGrid.isSeeded);
    const isLoading = useStore(state => state.bookGrid.isLoading);

    if (!isSeeded) {
        return (
            <div className="book-grid-container empty">
                <div className="prompt">
                    <span className="icon">search</span>
                    <h2>Build Your Library</h2>
                    <p>Search for a book you love to get started.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="book-grid-container">
            {isLoading && (
                 <div className="grid-loader">
                    <img src="https://storage.googleapis.com/experiments-uploads/g2demos/photo-applet/spinner.svg" alt="Loading..." />
                    <p>Discovering new books for you...</p>
                 </div>
            )}
            <div className={c("grid", { loading: isLoading })}>
                {slots.map(slot => (
                    <BookGridNode key={slot.index} slot={slot} />
                ))}
            </div>
        </div>
    );
};

export default BookGridViz;
