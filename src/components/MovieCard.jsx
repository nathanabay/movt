import { Link } from 'react-router-dom';
import { Star, Play, Plus, ThumbsUp, ChevronDown } from 'lucide-react';
import { useState, useRef } from 'react';
import './MovieCard.css';

const MovieCard = ({ movie }) => {
  const [isHovered, setIsHovered] = useState(false);
  const hoverTimeoutRef = useRef(null);

  const handleMouseEnter = () => {
    hoverTimeoutRef.current = setTimeout(() => {
      setIsHovered(true);
    }, 500); // 500ms delay like Netflix
  };

  const handleMouseLeave = () => {
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
    }
    setIsHovered(false);
  };

  const imageUrl = movie.poster_path 
    ? `https://image.tmdb.org/t/p/w500${movie.poster_path}`
    : 'https://via.placeholder.com/500x750?text=No+Image';
    
  const backdropUrl = movie.backdrop_path 
    ? `https://image.tmdb.org/t/p/w500${movie.backdrop_path}`
    : imageUrl;

  const linkPath = movie.media_type === 'tv' ? `/tv/${movie.id}` : `/movie/${movie.id}`;

  return (
    <div 
      className={`movie-card-container ${isHovered ? 'hovered' : ''}`}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <Link to={linkPath} className="movie-card fade-in">
        <div className="movie-poster-container">
          <img src={imageUrl} alt={movie.title} className="movie-poster" loading="lazy" />
          <div className="movie-title-overlay">
            <span className="movie-title-text">{movie.title || movie.name}</span>
          </div>
        </div>
      </Link>
      
      {isHovered && (
        <div className="movie-card-portal fade-in">
          <Link to={linkPath} style={{textDecoration: 'none'}}>
            <div className="portal-backdrop-container">
              <img src={backdropUrl} alt={movie.title} className="portal-backdrop" />
              <div className="portal-title-overlay">
                <span className="movie-title-text">{movie.title || movie.name}</span>
              </div>
            </div>
            <div className="portal-content">
              <div className="portal-buttons">
                <div className="portal-buttons-left">
                  <button className="btn-icon btn-icon-play"><Play size={18} fill="black" /></button>
                  <button className="btn-icon btn-icon-secondary"><Plus size={20} /></button>
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
