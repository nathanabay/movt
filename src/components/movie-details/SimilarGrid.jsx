import React from 'react';
import { Play, Plus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const SimilarGrid = ({ movie, type }) => {
  const navigate = useNavigate();

  if (!movie.similar || !movie.similar.results || movie.similar.results.length === 0) {
    return null;
  }

  return (
    <div className="similar-section">
      <h3 className="similar-header">More Like This</h3>
      <div className="similar-grid">
        {movie.similar.results.slice(0, 12).map((similarItem) => {
          const similarMatch = (similarItem.vote_average * 10).toFixed(0);
          const isTv = type === 'tv';
          return (
            <div key={similarItem.id} className="similar-card" onClick={() => {
              navigate(`/${isTv ? 'tv' : 'movie'}/${similarItem.id}`);
              window.scrollTo(0, 0);
            }}>
              <div className="similar-poster">
                <img 
                  src={`https://image.tmdb.org/t/p/w500${similarItem.backdrop_path || similarItem.poster_path}`} 
                  alt={similarItem.title || similarItem.name} 
                />
                <div className="similar-play-icon">
                  <Play fill="white" size={24} />
                </div>
              </div>
              <div className="similar-info">
                <div className="similar-meta-top">
                  <span className="match-score">{similarMatch}% Match</span>
                  <div className="similar-badge">
                    {isTv ? (similarItem.number_of_episodes ? `${similarItem.number_of_episodes} Episodes` : 'TV Series') : (similarItem.release_date?.substring(0,4))}
                  </div>
                  <Plus className="similar-add-btn" size={24} />
                </div>
                <p className="similar-overview">
                  {similarItem.overview 
                    ? (similarItem.overview.length > 100 ? similarItem.overview.substring(0, 100) + '...' : similarItem.overview) 
                    : 'No description available.'}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default React.memo(SimilarGrid);
