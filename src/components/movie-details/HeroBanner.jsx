import React from 'react';
import { Play, Plus, Check } from 'lucide-react';

const HeroBanner = ({ 
  movie, themeColor, type, handleWatchMovie, streamLoading, getProgress, toggleWatchlist, inList 
}) => {
  const backdropUrl = movie.backdrop_path 
    ? `https://image.tmdb.org/t/p/original${movie.backdrop_path}`
    : '';

  return (
    <>
      <div className="modal-hero" style={{ backgroundImage: `url(${backdropUrl})` }}>
        <div className="modal-hero-gradient" style={{ background: `linear-gradient(to top, ${themeColor} 0%, transparent 100%)` }}></div>
        <div className="modal-hero-content">
          <h1 className="modal-title">{movie.title || movie.name}</h1>
          <div className="modal-buttons">
            <button 
              className="btn-hero btn-play" 
              onClick={handleWatchMovie} 
              disabled={streamLoading}
            >
              <Play fill="black" size={24} /> 
              {streamLoading ? 'Connecting...' : (
                getProgress(movie.id)?.currentTime > 60 
                ? `Resume from ${Math.floor(getProgress(movie.id).currentTime / 60)}:${('0' + Math.floor(getProgress(movie.id).currentTime % 60)).slice(-2)}` 
                : 'Play'
              )}
            </button>
            <button 
              className="btn-icon" 
              onClick={() => toggleWatchlist({ ...movie, media_type: type })}
              title={inList ? "Remove from My List" : "Add to My List"}
            >
              {inList ? <Check size={24} /> : <Plus size={24} />}
            </button>
          </div>
        </div>
      </div>
      
      <div className="modal-info-section">
        <div className="modal-meta-row">
          <span className="match-score">{(movie.vote_average * 10).toFixed(0)}% Match</span>
          <span className="release-year">{(movie.release_date || movie.first_air_date)?.substring(0, 4)}</span>
          <span className="runtime-badge">
            {type === 'tv' 
              ? `${movie.number_of_seasons} Season${movie.number_of_seasons > 1 ? 's' : ''}` 
              : `${movie.runtime}m`
            }
          </span>
          <span className="hd-badge">HD</span>
        </div>
        
        <div className="modal-overview-grid">
          <div className="modal-overview-text">
            <p>{movie.overview}</p>
          </div>
          <div className="modal-overview-metadata">
            <p><strong>Genres:</strong> {movie.genres?.map(g => g.name).join(', ')}</p>
          </div>
        </div>
      </div>
    </>
  );
};

export default React.memo(HeroBanner);
