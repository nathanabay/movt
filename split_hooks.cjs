const fs = require('fs');

// 1. Create useMovieData.js
fs.writeFileSync('src/hooks/useMovieData.js', `import { useState, useEffect } from 'react';
import { getDetails, getCollectionDetails } from '../services/tmdb';

export const useMovieData = (id, type) => {
  const [movie, setMovie] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [themeColor, setThemeColor] = useState('#181818');
  const [collectionData, setCollectionData] = useState(null);
  const [introData, setIntroData] = useState(null);

  useEffect(() => {
    const fetchDetails = async () => {
      try {
        setLoading(true);
        const data = await getDetails(id, type);
        setMovie(data);

        const backdropUrl = data.backdrop_path ? \`https://image.tmdb.org/t/p/w780\${data.backdrop_path}\` : null;
        if (backdropUrl) {
          import('../utils/colorExtractor').then(m => {
            m.extractDominantColor(backdropUrl).then(color => setThemeColor(color));
          });
        }

        if (type === 'tv') {
          setIntroData({ start: 5, end: 85 });
        }

        if (data.belongs_to_collection) {
          getCollectionDetails(data.belongs_to_collection.id).then(cData => {
            if (cData && cData.parts) {
              cData.parts.sort((a,b) => new Date(a.release_date) - new Date(b.release_date));
            }
            setCollectionData(cData);
          }).catch(console.error);
        }
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    
    fetchDetails();
  }, [id, type]);

  return { movie, loading, error, themeColor, collectionData, introData };
};
`);

// 2. Create useTvSeasons.js
fs.writeFileSync('src/hooks/useTvSeasons.js', `import { useState, useEffect } from 'react';
import { getTvSeasonDetails } from '../services/tmdb';

export const useTvSeasons = (id, type, selectedSeason) => {
  const [seasonData, setSeasonData] = useState(null);
  const [loadingSeason, setLoadingSeason] = useState(false);

  useEffect(() => {
    if (type === 'tv' && id) {
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
  }, [selectedSeason, type, id]);

  return { seasonData, loadingSeason };
};
`);

// 3. Create useTorboxSearch.js
fs.writeFileSync('src/hooks/useTorboxSearch.js', `import { useState, useEffect } from 'react';
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
      const queryToUse = rawQuery.replace(/[:']/g, '').replace(/[^a-zA-Z0-9\\s-]/g, ' ').replace(/\\s+/g, ' ').trim();
      const idToUse = customQuery ? null : imdbId;
      const data = await searchTorbox(idToUse, queryToUse);
      setTorrents(data || []);
      if (customQuery) {
        setCurrentSearchTitle(\`Streams for "\${customQuery}"\`);
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
        const searchName = type === 'tv' ? (movie.title || movie.name).trim() : \`\${movie.title || movie.name} \${year}\`.trim();
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
`);

// 4. Create useCastSpotlight.js
fs.writeFileSync('src/hooks/useCastSpotlight.js', `import { useState } from 'react';

export const useCastSpotlight = () => {
  const [selectedActor, setSelectedActor] = useState(null);
  const [actorCredits, setActorCredits] = useState([]);

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

  return { selectedActor, actorCredits, handleActorClick };
};
`);

// 5. Update MovieDetails.jsx
let jsx = fs.readFileSync('src/pages/MovieDetails.jsx', 'utf8');

jsx = jsx.replace(
  "import { useMovieDetails } from '../hooks/useMovieDetails';", 
  `import { useMovieData } from '../hooks/useMovieData';
import { useTvSeasons } from '../hooks/useTvSeasons';
import { useTorboxSearch } from '../hooks/useTorboxSearch';
import { useCastSpotlight } from '../hooks/useCastSpotlight';`
);

jsx = jsx.replace(
  /const {\s*movie,\s*loading,\s*error,\s*themeColor,\s*torrents,\s*loadingTorrents,\s*currentSearchTitle,\s*fetchTorrents,\s*torboxList,\s*fetchMyTorboxList,\s*downloadedMagnets,\s*setDownloadedMagnets,\s*selectedSeason,\s*setSelectedSeason,\s*seasonData,\s*loadingSeason,\s*collectionData,\s*selectedActor,\s*actorCredits,\s*handleActorClick,\s*introData\s*} = useMovieDetails\(id, type\);/,
  `const { movie, loading, error, themeColor, collectionData, introData } = useMovieData(id, type);
  const [selectedSeason, setSelectedSeason] = useState(1);
  const { seasonData, loadingSeason } = useTvSeasons(id, type, selectedSeason);
  const { torrents, loadingTorrents, currentSearchTitle, fetchTorrents, torboxList, fetchMyTorboxList, downloadedMagnets, setDownloadedMagnets } = useTorboxSearch(movie, type);
  const { selectedActor, actorCredits, handleActorClick } = useCastSpotlight();`
);

fs.writeFileSync('src/pages/MovieDetails.jsx', jsx);
fs.unlinkSync('src/hooks/useMovieDetails.js'); // delete the god hook

console.log('Hooks refactored successfully!');
