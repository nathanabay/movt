import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';

// Keys
const WATCHLIST_KEY = 'movt_watchlist';
const HISTORY_KEY = 'movt_watch_history';

export const useWatchlist = () => {
  const { user, token } = useAuth() || {};
  const [watchlist, setWatchlist] = useState(() => {
    try {
      const saved = localStorage.getItem(WATCHLIST_KEY);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Sync from backend on login
  useEffect(() => {
    if (user && token) {
      fetch('/api/watchlist', { headers: { Authorization: `Bearer ${token}` } })
        .then(res => res.json())
        .then(data => {
          if (Array.isArray(data)) {
            // Convert backend format to frontend format if necessary
            const formatted = data.map(i => ({ id: i.item_id, media_type: i.media_type, title: i.title, name: i.title, poster_path: i.poster_path }));
            setWatchlist(formatted);
          }
        })
        .catch(console.error);
    }
  }, [user, token]);

  useEffect(() => {
    localStorage.setItem(WATCHLIST_KEY, JSON.stringify(watchlist));
  }, [watchlist]);

  const toggleWatchlist = async (movie) => {
    setWatchlist(prev => {
      const exists = prev.find(m => m.id === movie.id || m.id === String(movie.id));
      if (exists) {
        return prev.filter(m => m.id !== movie.id && m.id !== String(movie.id));
      } else {
        return [movie, ...prev];
      }
    });

    if (user && token) {
      const exists = watchlist.find(m => m.id === movie.id || m.id === String(movie.id));
      if (exists) {
        await fetch(`/api/watchlist/${movie.media_type || 'movie'}/${movie.id}`, {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${token}` }
        });
      } else {
        await fetch('/api/watchlist', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ item: movie })
        });
      }
    }
  };

  const isInWatchlist = (id) => {
    return watchlist.some(m => m.id === id || m.id === String(id));
  };

  return { watchlist, toggleWatchlist, isInWatchlist };
};

export const useWatchHistory = () => {
  const { user, token } = useAuth() || {};
  const [history, setHistory] = useState(() => {
    try {
      const saved = localStorage.getItem(HISTORY_KEY);
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  // Sync from backend on login
  useEffect(() => {
    if (user && token) {
      fetch('/api/history', { headers: { Authorization: `Bearer ${token}` } })
        .then(res => res.json())
        .then(data => {
          if (Array.isArray(data)) {
            const histObj = {};
            data.forEach(i => {
              histObj[i.item_id] = {
                currentTime: i.progress,
                duration: i.duration,
                season: i.season_number,
                episode: i.episode_number,
                lastWatched: new Date(i.updated_at).getTime()
              };
            });
            setHistory(histObj);
          }
        })
        .catch(console.error);
    }
  }, [user, token]);

  useEffect(() => {
    localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
  }, [history]);

  const saveProgress = async (id, progressData, movieData = null) => {
    setHistory(prev => ({
      ...prev,
      [id]: {
        ...prev[id],
        ...progressData,
        lastWatched: Date.now()
      }
    }));

    if (user && token && movieData) {
      await fetch('/api/history', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          item: movieData,
          progress: progressData.currentTime || 0,
          duration: progressData.duration || 0,
          season: progressData.season || null,
          episode: progressData.episode || null
        })
      });
    }
  };

  const getProgress = (id) => {
    return history[id];
  };

  const getContinueWatchingList = () => {
    return Object.entries(history)
      .map(([id, data]) => ({ id, ...data }))
      .sort((a, b) => b.lastWatched - a.lastWatched)
      .filter(item => {
         if (!item.currentTime) return false;
         if (!item.duration || item.duration <= 0) return true; 
         
         const percentage = item.currentTime / item.duration;
         return percentage > 0.01 && percentage < 0.95;
      });
  };

  return { history, saveProgress, getProgress, getContinueWatchingList };
};
