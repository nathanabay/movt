import { useState, useEffect } from 'react';
import { getDetails, getTvSeasonDetails } from '../services/tmdb';
import { searchTorbox } from '../services/torbox';

export const useMovieDetails = (id, type) => {
  const [movie, setMovie] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [themeColor, setThemeColor] = useState('#181818');
  
  const [torrents, setTorrents] = useState([]);
  const [loadingTorrents, setLoadingTorrents] = useState(false);
  const [currentSearchTitle, setCurrentSearchTitle] = useState('');
  
  const [torboxList, setTorboxList] = useState([]);
  const [downloadedMagnets, setDownloadedMagnets] = useState(new Set());
  
  const [selectedSeason, setSelectedSeason] = useState(1);
  const [seasonData, setSeasonData] = useState(null);
  const [loadingSeason, setLoadingSeason] = useState(false);

  const [collectionData, setCollectionData] = useState(null);
  const [selectedActor, setSelectedActor] = useState(null);
  const [actorCredits, setActorCredits] = useState([]);
  
  const [introData, setIntroData] = useState(null);

  useEffect(() => {
    const fetchDetails = async () => {
      try {
        setLoading(true);
        const data = await getDetails(id, type);
        setMovie(data);
        
        const imdbId = data.imdb_id || (data.external_ids && data.external_ids.imdb_id);
        if (data && imdbId) {
          const year = data.release_date ? data.release_date.substring(0, 4) : '';
          const searchName = type === 'tv' ? (data.title || data.name).trim() : `${data.title || data.name} ${year}`.trim();
          fetchTorrents(imdbId, searchName);
          setCurrentSearchTitle(type === 'tv' ? 'Global TorBox Streams (Whole Show)' : 'Streams');
        }

        const backdropUrl = data.backdrop_path ? `https://image.tmdb.org/t/p/w780${data.backdrop_path}` : null;
        if (backdropUrl) {
          import('../utils/colorExtractor').then(m => {
            m.extractDominantColor(backdropUrl).then(color => setThemeColor(color));
          });
        }

        if (type === 'tv') {
          setIntroData({ start: 5, end: 85 });
        }

        if (data.belongs_to_collection) {
          import('../services/tmdb').then(m => {
            m.getCollectionDetails(data.belongs_to_collection.id).then(cData => {
              if (cData && cData.parts) {
                cData.parts.sort((a,b) => new Date(a.release_date) - new Date(b.release_date));
              }
              setCollectionData(cData);
            }).catch(console.error);
          });
        }
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    
    fetchDetails();
  }, [id, type]);

  useEffect(() => {
    if (type === 'tv' && movie) {
      const fetchSeason = async () => {
        try {
          setLoadingSeason(true);
          const data = await getTvSeasonDetails(id, selectedSeason);
          setSeasonData(data);
        } catch (err) {
          console.error(err);
        } finally {
          setLoadingSeason(false);
        }
      };
      fetchSeason();
    }
  }, [selectedSeason, type, id, movie]);

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
      }
    } catch (err) {
      console.error('Failed to fetch TorBox torrents:', err);
      setTorrents([]);
    } finally {
      setLoadingTorrents(false);
    }
  };

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

  const handleActorClick = async (actor) => {
    if (selectedActor === actor.id) {
      setSelectedActor(null);
      setActorCredits([]);
      return;
    }
    setSelectedActor(actor.id);
    try {
      const { getPersonCredits } = await import('../services/tmdb');
      const data = await getPersonCredits(actor.id);
      const validCredits = data.cast
        .filter(c => (c.release_date || c.first_air_date) && new Date(c.release_date || c.first_air_date) <= new Date())
        .sort((a, b) => b.popularity - a.popularity);
      setActorCredits(validCredits);
    } catch (e) {
      console.error(e);
    }
  };

  return {
    movie, loading, error, themeColor, 
    torrents, loadingTorrents, currentSearchTitle, fetchTorrents,
    torboxList, fetchMyTorboxList, downloadedMagnets, setDownloadedMagnets,
    selectedSeason, setSelectedSeason, seasonData, loadingSeason,
    collectionData, selectedActor, actorCredits, handleActorClick,
    introData
  };
};
