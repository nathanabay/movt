import { useState, useEffect } from 'react';

// Keys
const WATCHLIST_KEY = 'movt_watchlist';
const HISTORY_KEY = 'movt_watch_history';

export const useWatchlist = () => {
  const [watchlist, setWatchlist] = useState(() => {
    try {
      const saved = localStorage.getItem(WATCHLIST_KEY);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    localStorage.setItem(WATCHLIST_KEY, JSON.stringify(watchlist));
  }, [watchlist]);

  const toggleWatchlist = (movie) => {
    setWatchlist(prev => {
      const exists = prev.find(m => m.id === movie.id);
      if (exists) {
        return prev.filter(m => m.id !== movie.id);
      } else {
        return [movie, ...prev];
      }
    });
  };

  const isInWatchlist = (id) => {
    return watchlist.some(m => m.id === id);
  };

  return { watchlist, toggleWatchlist, isInWatchlist };
};

export const useWatchHistory = () => {
  const [history, setHistory] = useState(() => {
    try {
      const saved = localStorage.getItem(HISTORY_KEY);
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  useEffect(() => {
    localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
  }, [history]);

  const saveProgress = (id, progressData) => {
    setHistory(prev => ({
      ...prev,
      [id]: {
        ...prev[id],
        ...progressData,
        lastWatched: Date.now()
      }
    }));
  };

  const getProgress = (id) => {
    return history[id];
  };

  const getContinueWatchingList = () => {
    return Object.values(history)
      .sort((a, b) => b.lastWatched - a.lastWatched)
      .filter(item => {
         if (!item.currentTime) return false;
         // If duration is unknown, missing, or 0, we assume it's valid and they are still watching
         if (!item.duration || item.duration <= 0) return true; 
         
         const percentage = item.currentTime / item.duration;
         return percentage > 0.01 && percentage < 0.95; // Between 1% and 95%
      });
  };

  return { history, saveProgress, getProgress, getContinueWatchingList };
};
