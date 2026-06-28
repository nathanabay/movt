import { Link } from 'react-router-dom';
import { Star, Play, Plus, ThumbsUp, ChevronDown, Check } from 'lucide-react';
import { useState, useRef } from 'react';
import { fetchMovieVideos } from '../services/tmdb';
import { useWatchlist } from '../hooks/useUserData';
import './MovieCard.css';

const MovieCard = ({ movie }) => {
  const [isHovered, setIsHovered] = useState(false);
  const [trailerKey, setTrailerKey] = useState(null);
  const hoverTimeoutRef = useRef(null);
  
  const { watchlist, toggleWatchlist, isInWatchlist } = useWatchlist();
  const inList = isInWatchlist(movie.id);

  const handleMouseEnter = () => {
    hoverTimeoutRef.current = setTimeout(async () => {
      setIsHovered(true);
      try {
        const videos = await fetchMovieVideos(movie.id, movie.media_type || 'movie');
        const trailer = videos.find(v => v.type === 'Trailer' && v.site === 'YouTube');
        if (trailer) {
          setTrailerKey(trailer.key);
        }
      } catch (err) {
        // ignore silently
      }
    }, 500); // 500ms delay like Netflix
  };

  const handleMouseLeave = () => {
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
    }
    setIsHovered(false);
    setTrailerKey(null);
  };

  const imageUrl = movie.poster_path 
    ? `https://image.tmdb.org/t/p/w154${movie.poster_path}`
    : 'https://via.placeholder.com/154x231?text=No+Image';
    
  const backdropUrl = movie.backdrop_path 
    ? `https://image.tmdb.org/t/p/w780${movie.backdrop_path}`
    : imageUrl;

  const linkPath = movie.media_type === 'tv' ? `/tv/${movie.id}` : `/movie/${movie.id}`;

  return (
    <div 
      className={`movie-card-container ${isHovered ? 'hovered' : ''}`}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <Link to={linkPath} className="movie-card fade-in" tabIndex={-1}>
        <div className="movie-poster-container">
          <img src={imageUrl} alt={movie.title || movie.name || 'Movie Poster'} className="movie-poster" loading="lazy" />
          <div className="movie-title-overlay">
            <span className="movie-title-text">{movie.title || movie.name}</span>
          </div>
        </div>
      </Link>
      
      {isHovered && (
        <div className="movie-card-portal fade-in">
          <Link to={linkPath} style={{textDecoration: 'none'}}>
            <div className="portal-backdrop-container">
              {isHovered && trailerKey ? (
                <div className="movie-card-trailer" style={{ width: '100%', height: '100%' }}>
                  <iframe
                    src={`https://www.youtube.com/embed/${trailerKey}?autoplay=1&mute=1&controls=0&modestbranding=1&loop=1&playlist=${trailerKey}&playsinline=1`}
                    allow="autoplay; encrypted-media"
                    frameBorder="0"
                    style={{ width: '100%', height: '100%', objectFit: 'cover', transform: 'scale(1.2)' }}
                  ></iframe>
                </div>
              ) : (
                <img src={backdropUrl} alt={movie.title || movie.name} className="portal-backdrop" />
              )}
              <div className="portal-title-overlay">
                <span className="movie-title-text">{movie.title || movie.name}</span>
              </div>
            </div>
            <div className="portal-content">
              <div className="portal-buttons">
                <div className="portal-buttons-left">
                  <button className="btn-icon btn-icon-play"><Play size={18} fill="black" /></button>
                  <button 
                    className="btn-icon btn-icon-secondary"
                    onClick={(e) => {
                      e.preventDefault(); // Don't trigger the Link
                      toggleWatchlist(movie);
                    }}
                    title={inList ? "Remove from My List" : "Add to My List"}
                  >
                    {inList ? <Check size={20} /> : <Plus size={20} />}
                  </button>
                  <button className="btn-icon btn-icon-secondary"><ThumbsUp size={16} /></button>
                </div>
                <div className="portal-buttons-right">
                  <button className="btn-icon btn-icon-secondary"><ChevronDown size={20} /></button>
                </div>
              </div>
              <div className="portal-meta">
                <span className="match-score">98% Match</span>
                <span className="age-limit">18+</span>
                <span className="runtime">1h 45m</span>
                <span className="hd-badge">HD</span>
              </div>
              <div className="portal-genres">
                <span>Exciting</span> • <span>Action</span> • <span>Sci-Fi</span>
              </div>
            </div>
          </Link>
        </div>
      )}
    </div>
  );
};

export default MovieCard;
