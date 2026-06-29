import React from 'react';
import { useNavigate } from 'react-router-dom';

const CastSpotlight = ({ movie, selectedActor, actorCredits, handleActorClick }) => {
  const navigate = useNavigate();

  if (!movie.credits || !movie.credits.cast || movie.credits.cast.length === 0) {
    return null;
  }

  return (
    <div className="cast-section">
      <h3 className="section-header">Cast Spotlight</h3>
      <div className="cast-scroll">
        {movie.credits.cast.slice(0, 10).map(actor => (
          <div 
            key={actor.id} 
            className={`cast-card ${selectedActor === actor.id ? 'active' : ''}`}
            onClick={() => handleActorClick(actor)}
          >
            <img 
              src={actor.profile_path ? `https://image.tmdb.org/t/p/w185${actor.profile_path}` : 'https://via.placeholder.com/185x278?text=No+Image'} 
              alt={actor.name} 
              className="cast-photo"
            />
            <p className="cast-name">{actor.name}</p>
            <p className="cast-character">{actor.character}</p>
          </div>
        ))}
      </div>
      
      {selectedActor && actorCredits.length > 0 && (
        <div className="actor-filmography fade-in">
          <h4>More from {movie.credits.cast.find(a => a.id === selectedActor)?.name}</h4>
          <div className="similar-grid">
            {actorCredits.slice(0, 6).map(credit => (
              <div key={credit.credit_id || credit.id} className="similar-card" onClick={() => {
                navigate(`/${credit.media_type || 'movie'}/${credit.id}`);
                window.scrollTo(0, 0);
              }}>
                <div className="similar-poster">
                  <img 
                    src={`https://image.tmdb.org/t/p/w500${credit.backdrop_path || credit.poster_path}`} 
                    alt={credit.title || credit.name} 
                  />
                </div>
                <div className="similar-info">
                  <div className="similar-meta-top">
                    <span className="match-score">{(credit.vote_average * 10).toFixed(0)}% Match</span>
                  </div>
                  <p className="similar-title">{credit.title || credit.name}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default React.memo(CastSpotlight);
