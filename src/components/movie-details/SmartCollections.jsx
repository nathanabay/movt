import React from 'react';
import { Play } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const SmartCollections = ({ collectionData }) => {
  const navigate = useNavigate();

  if (!collectionData || !collectionData.parts || collectionData.parts.length === 0) {
    return null;
  }

  return (
    <div className="collection-section">
      <h3 className="section-header">{collectionData.name}</h3>
      <p className="collection-overview">{collectionData.overview}</p>
      <div className="similar-grid">
        {collectionData.parts.map(part => (
          <div key={part.id} className="similar-card" onClick={() => {
            navigate(`/movie/${part.id}`);
            window.scrollTo(0, 0);
          }}>
            <div className="similar-poster">
              <img 
                src={`https://image.tmdb.org/t/p/w500${part.backdrop_path || part.poster_path}`} 
                alt={part.title} 
              />
              <div className="similar-play-icon">
                <Play fill="white" size={24} />
              </div>
            </div>
            <div className="similar-info">
              <div className="similar-meta-top">
                <span className="match-score">{(part.vote_average * 10).toFixed(0)}% Match</span>
                <div className="similar-badge">
                  {part.release_date?.substring(0,4)}
                </div>
              </div>
              <p className="similar-title" style={{fontWeight: 'bold', margin: '0 0 0.5rem 0'}}>{part.title}</p>
              <p className="similar-overview">
                {part.overview 
                  ? (part.overview.length > 80 ? part.overview.substring(0, 80) + '...' : part.overview) 
                  : 'No description available.'}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default React.memo(SmartCollections);
