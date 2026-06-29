import React from 'react';
import { Play, Download, Check } from 'lucide-react';

const EpisodesList = ({ 
  movie, selectedSeason, setSelectedSeason, fetchTorrents, 
  loadingSeason, seasonData, torboxList, handleWatchEpisode 
}) => {
  return (
    <div className="episodes-section">
      <div className="episodes-header">
        <h3>Episodes</h3>
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
          <select 
            value={selectedSeason} 
            onChange={(e) => setSelectedSeason(Number(e.target.value))}
            className="season-select"
          >
            {Array.from({ length: movie.number_of_seasons || 1 }).map((_, i) => (
              <option key={i + 1} value={i + 1}>
                Season {i + 1}
              </option>
            ))}
          </select>
          <button 
            className="btn-download-netflix" 
            style={{ width: 'auto', padding: '0 1rem', borderRadius: '4px', height: '38px', fontSize: '0.9rem', gap: '0.5rem' }}
            onClick={() => {
              const seasonStr = selectedSeason < 10 ? `S0${selectedSeason}` : `S${selectedSeason}`;
              const query = `${movie.title || movie.name} ${seasonStr}`.trim();
              fetchTorrents(movie.imdb_id || (movie.external_ids && movie.external_ids.imdb_id), movie.title || movie.name, query);
              document.getElementById('torbox-streams-section')?.scrollIntoView({ behavior: 'smooth' });
            }}
          >
            <Download size={16} /> Season
          </button>
        </div>
      </div>
      
      {loadingSeason ? (
        <div className="spinner-small"></div>
      ) : seasonData && seasonData.episodes ? (
        <div className="episodes-list">
          {seasonData.episodes.map((episode) => {
            
            // Check if this specific episode is available in TorBox cloud
            let isDownloaded = false;
            if (torboxList && torboxList.length > 0 && movie) {
              const showName = movie.title || movie.name;
              const nameRegex = new RegExp((showName || '').replace(/[^a-zA-Z0-9]/g, '.*'), 'i');
              const sStr = selectedSeason < 10 ? `S0${selectedSeason}` : `S${selectedSeason}`;
              const eStr = episode.episode_number < 10 ? `E0${episode.episode_number}` : `E${episode.episode_number}`;
              const epRegex = new RegExp(`[S]?0?${selectedSeason}[Ex]0?${episode.episode_number}`, 'i');
              
              for (const t of torboxList) {
                if (nameRegex.test(t.name) || (t.files && t.files.length > 0 && nameRegex.test(t.files[0].name))) {
                  for (const f of t.files || []) {
                    if (!f.name.match(/\\.(mp4|mkv|avi|webm)$/i)) continue;
                    if (epRegex.test(f.name) || f.name.includes(`${sStr}${eStr}`)) {
                      isDownloaded = true;
                      break;
                    }
                  }
                }
                if (isDownloaded) break;
              }
            }

            return (
              <div 
                key={episode.id} 
                className="episode-item"
                onClick={() => handleWatchEpisode(selectedSeason, episode.episode_number)}
              >
                <div className="episode-number">{episode.episode_number}</div>
                <div className="episode-thumbnail">
                  {episode.still_path ? (
                    <img src={`https://image.tmdb.org/t/p/w300${episode.still_path}`} alt={episode.name} />
                  ) : (
                    <div className="episode-no-image">No Image</div>
                  )}
                  <Play className="episode-play-icon" size={32} />
                </div>
                <div className="episode-info">
                  <div className="episode-title-row">
                    <h4>{episode.name}</h4>
                    <span className="episode-runtime">{episode.runtime}m</span>
                  </div>
                  <p className="episode-overview">{episode.overview || 'No description available.'}</p>
                </div>
                <button 
                  className="btn-download-netflix"
                  disabled={isDownloaded}
                  style={{ opacity: isDownloaded ? 0.5 : 1, cursor: isDownloaded ? 'default' : 'pointer' }}
                  title={isDownloaded ? "Available in TorBox Cloud" : "Find Torrents"}
                  onClick={(e) => {
                    e.stopPropagation();
                    if (isDownloaded) return;
                    const s = selectedSeason < 10 ? `S0${selectedSeason}` : `S${selectedSeason}`;
                    const ep = episode.episode_number < 10 ? `E0${episode.episode_number}` : `E${episode.episode_number}`;
                    const query = `${movie.title || movie.name} ${s}${ep}`.trim();
                    fetchTorrents(movie.imdb_id || (movie.external_ids && movie.external_ids.imdb_id), movie.title || movie.name, query);
                    document.getElementById('torbox-streams-section')?.scrollIntoView({ behavior: 'smooth' });
                  }}
                >
                  {isDownloaded ? <Check size={20} color="#46d369" /> : <Download size={20} />}
                </button>
              </div>
            );
          })}
        </div>
      ) : null}
    </div>
  );
};

export default React.memo(EpisodesList);
