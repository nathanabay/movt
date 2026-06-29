import { useState, useEffect } from 'react';
import { searchTorbox } from '../services/torbox';

export const useTorboxSearch = (movie, type) => {
  const [torrents, setTorrents] = useState([]);
  const [loadingTorrents, setLoadingTorrents] = useState(false);
  const [currentSearchTitle, setCurrentSearchTitle] = useState('');
  
  const [torboxList, setTorboxList] = useState([]);
  const [downloadedMagnets, setDownloadedMagnets] = useState(new Set());

  const fetchTorrents = async (imdbId, title, customQuery = null) => {
    try {
      setLoadingTorrents(true);
      const rawQuery = customQuery || title;
      const queryToUse = rawQuery.replace(/[:']/g, '').replace(/[^a-zA-Z0-9\s-]/g, ' ').replace(/\s+/g, ' ').trim();
      const idToUse = customQuery ? null : imdbId;
      const data = await searchTorbox(idToUse, queryToUse);
      setTorrents(data || []);
      if (customQuery) {
        setCurrentSearchTitle(`Streams for "${customQuery}"`);
      } else {
        setCurrentSearchTitle(type === 'tv' ? 'Global TorBox Streams (Whole Show)' : 'Streams');
      }
    } catch (err) {
      console.error('Failed to fetch TorBox torrents:', err);
      setTorrents([]);
    } finally {
      setLoadingTorrents(false);
    }
  };

  useEffect(() => {
    if (movie) {
      const imdbId = movie.imdb_id || (movie.external_ids && movie.external_ids.imdb_id);
      if (imdbId) {
        const year = movie.release_date ? movie.release_date.substring(0, 4) : '';
        const searchName = type === 'tv' ? (movie.title || movie.name).trim() : `${movie.title || movie.name} ${year}`.trim();
        fetchTorrents(imdbId, searchName);
      }
    }
  }, [movie, type]);

  const fetchMyTorboxList = async () => {
    try {
      const { getMyTorboxList } = await import('../services/torbox');
      const list = await getMyTorboxList();
      setTorboxList(list);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchMyTorboxList();
  }, []);

  return { torrents, loadingTorrents, currentSearchTitle, fetchTorrents, torboxList, fetchMyTorboxList, downloadedMagnets, setDownloadedMagnets };
};
