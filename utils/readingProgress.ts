/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type ReadingStatus = 'to-read' | 'reading' | 'completed' | 'abandoned';

export interface BookProgress {
  bookId: string;
  bookTitle: string;
  status: ReadingStatus;
  rating?: number; // 1-5 stars
  progress?: number; // 0-100 percentage
  startedAt?: string;
  completedAt?: string;
  notes?: string;
  lastUpdated: string;
}

export interface ReadingStats {
  totalBooks: number;
  completed: number;
  reading: number;
  toRead: number;
  abandoned: number;
  averageRating: number;
  booksThisYear: number;
  booksThisMonth: number;
}

const STORAGE_KEY = 'literary-explorer:reading-progress';

/**
 * Get all reading progress entries
 */
export const getAllProgress = (): BookProgress[] => {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  } catch (error) {
    console.error('Failed to load reading progress:', error);
    return [];
  }
};

/**
 * Get progress for a specific book
 */
export const getBookProgress = (bookId: string): BookProgress | null => {
  const progress = getAllProgress();
  return progress.find(p => p.bookId === bookId) || null;
};

/**
 * Update or create progress entry
 */
export const updateProgress = (entry: BookProgress): boolean => {
  try {
    const progress = getAllProgress();
    const index = progress.findIndex(p => p.bookId === entry.bookId);

    entry.lastUpdated = new Date().toISOString();

    // Auto-set dates based on status changes
    if (entry.status === 'reading' && !entry.startedAt) {
      entry.startedAt = new Date().toISOString();
    }
    if (entry.status === 'completed' && !entry.completedAt) {
      entry.completedAt = new Date().toISOString();
      entry.progress = 100;
    }

    if (index >= 0) {
      progress[index] = entry;
    } else {
      progress.push(entry);
    }

    localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
    return true;
  } catch (error) {
    console.error('Failed to update reading progress:', error);
    return false;
  }
};

/**
 * Delete progress entry
 */
export const deleteProgress = (bookId: string): boolean => {
  try {
    const progress = getAllProgress();
    const filtered = progress.filter(p => p.bookId !== bookId);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
    return true;
  } catch (error) {
    console.error('Failed to delete reading progress:', error);
    return false;
  }
};

/**
 * Get reading statistics
 */
export const getReadingStats = (): ReadingStats => {
  const progress = getAllProgress();
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth();

  const completed = progress.filter(p => p.status === 'completed');
  const ratings = completed.filter(p => p.rating !== undefined).map(p => p.rating!);

  const booksThisYear = completed.filter(p => {
    if (!p.completedAt) return false;
    const date = new Date(p.completedAt);
    return date.getFullYear() === currentYear;
  }).length;

  const booksThisMonth = completed.filter(p => {
    if (!p.completedAt) return false;
    const date = new Date(p.completedAt);
    return date.getFullYear() === currentYear && date.getMonth() === currentMonth;
  }).length;

  return {
    totalBooks: progress.length,
    completed: completed.length,
    reading: progress.filter(p => p.status === 'reading').length,
    toRead: progress.filter(p => p.status === 'to-read').length,
    abandoned: progress.filter(p => p.status === 'abandoned').length,
    averageRating: ratings.length > 0
      ? Math.round((ratings.reduce((a, b) => a + b, 0) / ratings.length) * 10) / 10
      : 0,
    booksThisYear,
    booksThisMonth,
  };
};

/**
 * Get books by status
 */
export const getBooksByStatus = (status: ReadingStatus): BookProgress[] => {
  return getAllProgress().filter(p => p.status === status);
};

/**
 * Get recently updated books
 */
export const getRecentlyUpdated = (limit: number = 10): BookProgress[] => {
  const progress = getAllProgress();
  return progress
    .sort((a, b) => new Date(b.lastUpdated).getTime() - new Date(a.lastUpdated).getTime())
    .slice(0, limit);
};

/**
 * Get currently reading books
 */
export const getCurrentlyReading = (): BookProgress[] => {
  return getAllProgress()
    .filter(p => p.status === 'reading')
    .sort((a, b) => {
      const aDate = a.startedAt ? new Date(a.startedAt).getTime() : 0;
      const bDate = b.startedAt ? new Date(b.startedAt).getTime() : 0;
      return bDate - aDate;
    });
};

/**
 * Get reading goal progress
 */
export const getYearlyGoalProgress = (goal: number): {
  goal: number;
  completed: number;
  remaining: number;
  percentage: number;
  onTrack: boolean;
} => {
  const stats = getReadingStats();
  const remaining = Math.max(0, goal - stats.booksThisYear);
  const percentage = goal > 0 ? (stats.booksThisYear / goal) * 100 : 0;

  // Calculate if on track
  const now = new Date();
  const startOfYear = new Date(now.getFullYear(), 0, 1);
  const endOfYear = new Date(now.getFullYear(), 11, 31);
  const yearProgress = (now.getTime() - startOfYear.getTime()) / (endOfYear.getTime() - startOfYear.getTime());
  const expectedBooks = goal * yearProgress;
  const onTrack = stats.booksThisYear >= expectedBooks;

  return {
    goal,
    completed: stats.booksThisYear,
    remaining,
    percentage: Math.min(percentage, 100),
    onTrack,
  };
};

/**
 * Export reading progress as JSON
 */
export const exportProgress = (): string => {
  const progress = getAllProgress();
  const stats = getReadingStats();

  return JSON.stringify({
    exportedAt: new Date().toISOString(),
    version: '1.0',
    statistics: stats,
    progress,
  }, null, 2);
};

/**
 * Import reading progress from JSON
 */
export const importProgress = (jsonString: string): boolean => {
  try {
    const data = JSON.parse(jsonString);

    if (!data.progress || !Array.isArray(data.progress)) {
      throw new Error('Invalid progress data format');
    }

    // Validate each entry
    const valid = data.progress.every((p: any) =>
      p.bookId && p.bookTitle && p.status && p.lastUpdated
    );

    if (!valid) {
      throw new Error('Invalid progress entries');
    }

    localStorage.setItem(STORAGE_KEY, JSON.stringify(data.progress));
    return true;
  } catch (error) {
    console.error('Failed to import reading progress:', error);
    return false;
  }
};

/**
 * Get reading streaks
 */
export const getReadingStreak = (): {
  currentStreak: number;
  longestStreak: number;
} => {
  const completed = getAllProgress()
    .filter(p => p.status === 'completed' && p.completedAt)
    .sort((a, b) => {
      const aDate = new Date(a.completedAt!).getTime();
      const bDate = new Date(b.completedAt!).getTime();
      return aDate - bDate;
    });

  if (completed.length === 0) {
    return { currentStreak: 0, longestStreak: 0 };
  }

  let currentStreak = 0;
  let longestStreak = 0;
  let tempStreak = 1;
  let lastDate = new Date(completed[0].completedAt!);

  for (let i = 1; i < completed.length; i++) {
    const currentDate = new Date(completed[i].completedAt!);
    const daysDiff = Math.floor((currentDate.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24));

    if (daysDiff <= 7) {
      // Within a week counts as streak
      tempStreak++;
    } else {
      longestStreak = Math.max(longestStreak, tempStreak);
      tempStreak = 1;
    }

    lastDate = currentDate;
  }

  longestStreak = Math.max(longestStreak, tempStreak);

  // Calculate current streak
  const now = new Date();
  const lastBook = completed[completed.length - 1];
  const daysSinceLastBook = Math.floor((now.getTime() - new Date(lastBook.completedAt!).getTime()) / (1000 * 60 * 60 * 24));

  if (daysSinceLastBook <= 7) {
    currentStreak = tempStreak;
  } else {
    currentStreak = 0;
  }

  return { currentStreak, longestStreak };
};
