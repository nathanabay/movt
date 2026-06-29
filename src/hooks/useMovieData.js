import { useState, useEffect } from 'react';
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
