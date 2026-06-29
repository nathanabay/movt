import { useState, useEffect } from 'react';
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
