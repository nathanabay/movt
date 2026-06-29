import { useState } from 'react';

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
