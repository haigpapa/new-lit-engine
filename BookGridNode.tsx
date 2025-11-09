/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import React from 'react';
import c from 'clsx';
import { lockGridSlot, dismissGridSlot } from './actions';
import type { BookGridSlot } from './types';

interface BookGridNodeProps {
    slot: BookGridSlot;
}

const BookGridNode: React.FC<BookGridNodeProps> = ({ slot }) => {
    const { status, bookData, index } = slot;

    if (status === 'empty') {
        return <div className="book-grid-slot empty" />;
    }

    const handleLock = (e: React.MouseEvent) => {
        e.stopPropagation();
        lockGridSlot(index);
    };

    const handleDismiss = (e: React.MouseEvent) => {
        e.stopPropagation();
        dismissGridSlot(index);
    };

    return (
        <div className={c('book-grid-slot', status)}>
            {bookData?.coverUrl ? (
                <img src={bookData.coverUrl} alt={`${bookData.title} cover`} loading="lazy" />
            ) : (
                <div className="book-placeholder">
                    <p className="title">{bookData?.title}</p>
                    <p className="author">{bookData?.author}</p>
                </div>
            )}
            <div className="slot-overlay">
                <div className="book-info">
                    <p className="title">{bookData?.title}</p>
                    <p className="author">{bookData?.author}</p>
                </div>
                {status === 'suggested' && (
                    <div className="slot-actions">
                        <button onClick={handleLock} title="Lock in this recommendation">
                            <span className="icon">lock_open</span> Lock
                        </button>
                        <button onClick={handleDismiss} title="Get a different suggestion">
                            <span className="icon">close</span> Dismiss
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default BookGridNode;
