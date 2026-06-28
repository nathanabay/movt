import { useEffect, useState, useRef, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import VideoPlayer from '../components/VideoPlayer';
import { Play, Download, X, Plus, ArrowLeft, Check, List } from 'lucide-react';
import { getDetails, getTvSeasonDetails } from '../services/tmdb';
import { searchTorbox } from '../services/torbox';
import './MovieDetails.css';

import { useWatchlist, useWatchHistory } from '../hooks/useUserData';

const MovieDetails = ({ type }) => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { watchlist, toggleWatchlist, isInWatchlist } = useWatchlist();
  const { saveProgress, getProgress } = useWatchHistory();
  const inList = isInWatchlist(Number(id));
  const [movie, setMovie] = useState(null);
  const [torrents, setTorrents] = useState([]);
  const [loadingTorrents, setLoadingTorrents] = useState(false);
  const [downloadedMagnets, setDownloadedMagnets] = useState(new Set());
  const [currentSearchTitle, setCurrentSearchTitle] = useState('');
  
  const [torboxList, setTorboxList] = useState([]);


  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [streamUrl, setStreamUrl] = useState(null);
  const [streamLoading, setStreamLoading] = useState(false);
  const playerRef = useRef(null);
  
  // Binge Mode State
  const [playingTvContext, setPlayingTvContext] = useState(null);
  const [autoplayCountdown, setAutoplayCountdown] = useState(null);
  const [showEpisodesDropdown, setShowEpisodesDropdown] = useState(false);
  const countdownTimerRef = useRef(null);
  
  // TV Show specific state
  const [selectedSeason, setSelectedSeason] = useState(1);
  const [seasonData, setSeasonData] = useState(null);
  const [loadingSeason, setLoadingSeason] = useState(false);

  useEffect(() => {
    const fetchDetails = async () => {
      try {
        setLoading(true);
        const data = await getDetails(id, type);
        setMovie(data);
        
        const imdbId = data.imdb_id || (data.external_ids && data.external_ids.imdb_id);
        if (data && imdbId) {
          const year = data.release_date ? data.release_date.substring(0, 4) : (data.first_air_date ? data.first_air_date.substring(0, 4) : '');
          const searchName = `${data.title || data.name} ${year}`.trim();
          fetchTorrents(imdbId, searchName);
          setCurrentSearchTitle(type === 'tv' ? 'Global TorBox Streams (Whole Show)' : 'Streams');
        }
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    
    fetchDetails();
  }, [id, type]);

  useEffect(() => {
    if (type === 'tv' && movie) {
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
  }, [selectedSeason, type, id, movie]);

  const fetchTorrents = async (imdbId, title, customQuery = null) => {
    try {
      setLoadingTorrents(true);
      const rawQuery = customQuery || title;
      const queryToUse = rawQuery.replace(/[:']/g, '').replace(/[^a-zA-Z0-9\s-]/g, ' ').replace(/\s+/g, ' ').trim();
      // If we're using a custom query (like "Show S01"), don't pass imdbId to force APIBay search
      const idToUse = customQuery ? null : imdbId;
      const data = await searchTorbox(idToUse, queryToUse);
      if (data) {
        setTorrents(data);
      } else {
        setTorrents([]);
      }
      
      if (customQuery) {
        setCurrentSearchTitle(`Streams for "${customQuery}"`);
      }
    } catch (err) {
      console.error('Failed to fetch TorBox torrents:', err);
      setTorrents([]);
    } finally {
      setLoadingTorrents(false);
    }
  };

  const fetchMyTorboxList = async () => {
    try {
      const { getMyTorboxList } = await import('../services/torbox');
      const list = await getMyTorboxList();
      setTorboxList(list);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchMyTorboxList();
  }, []);

  const handleDownload = async (magnet) => {
    try {
      alert('Adding torrent to TorBox...');
      const result = await import('../services/torbox').then(m => m.addTorrent(magnet));
      alert('Success! Torrent added to TorBox: ' + (result?.torrent_id || ''));
      setDownloadedMagnets(prev => {
        const next = new Set(prev);
        next.add(magnet);
        return next;
      });
      // Refresh torbox list so episodes reflect the download instantly
      setTimeout(() => fetchMyTorboxList(), 1500);
    } catch (err) {
      alert('Error adding torrent: ' + err.message);
    }
  };

  const handleWatchMovie = async () => {
    try {
      setStreamLoading(true);
      let targetMagnet = null;
      if (torrents && torrents.length > 0) {
        targetMagnet = torrents[0].magnet;
      } else {
        const imdbId = movie.imdb_id || (movie.external_ids && movie.external_ids.imdb_id);
        const year = movie.release_date ? movie.release_date.substring(0, 4) : (movie.first_air_date ? movie.first_air_date.substring(0, 4) : '');
        const searchName = `${movie.title || movie.name} ${year}`.trim();
        const data = await searchTorbox(imdbId, searchName);
        if (data && data.length > 0) {
          targetMagnet = data[0].magnet;
        }
      }

      if (!targetMagnet) {
        alert("No streams available to watch.");
        return;
      }

      const { getStreamUrl } = await import('../services/torbox');
      const url = await getStreamUrl(targetMagnet);
      setStreamUrl(url);
    } catch (err) {
      alert('Failed to stream movie: ' + err.message);
    } finally {
      setStreamLoading(false);
    }
  };
  const handleWatchEpisode = async (seasonNum, episodeNum) => {
    try {
      if (autoplayCountdown !== null) setAutoplayCountdown(null);
      if (countdownTimerRef.current) clearInterval(countdownTimerRef.current);
      
      setStreamLoading(true);
      const showName = movie.title || movie.name;
      const { getEpisodeStreamUrl } = await import('../services/torbox');
      const url = await getEpisodeStreamUrl(showName, seasonNum, episodeNum);
      setPlayingTvContext({ season: seasonNum, episode: episodeNum });
      setStreamUrl(url);
    } catch (err) {
      alert('Failed to stream episode: ' + err.message);
      setAutoplayCountdown(null);
    } finally {
      setStreamLoading(false);
    }
  };

  const startAutoplayCountdown = (currentSeason, currentEpisode) => {
    let nextSeason = currentSeason;
    let nextEpisode = currentEpisode + 1;
    
    // Very basic check if we crossed season boundary (assumes current seasonData is loaded)
    if (seasonData && seasonData.episodes && currentEpisode >= seasonData.episodes.length) {
      nextSeason = currentSeason + 1;
      nextEpisode = 1;
    }

    setAutoplayCountdown(5);
    
    countdownTimerRef.current = setInterval(() => {
      setAutoplayCountdown(prev => {
        if (prev <= 1) {
          clearInterval(countdownTimerRef.current);
          handleWatchEpisode(nextSeason, nextEpisode);
          return null;
        }
        return prev - 1;
      });
    }, 1000);
  };
  const [isPlayerIdle, setIsPlayerIdle] = useState(false);
  const idleTimerRef = useRef(null);

  const handlePlayerMouseMove = () => {
    setIsPlayerIdle(false);
    if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    idleTimerRef.current = setTimeout(() => {
      setIsPlayerIdle((prev) => {
        // If dropdown is open, do not idle
        if (showEpisodesDropdown) return false;
        return true;
      });
    }, 3000);
  };

  useEffect(() => {
    if (streamUrl) {
      handlePlayerMouseMove(); // start timer when player mounts
    }
    return () => {
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
      if (countdownTimerRef.current) clearInterval(countdownTimerRef.current);
    };
  }, [streamUrl]);

  const playerOptions = useMemo(() => ({
    autoplay: true,
    controls: true,
    fill: true,
    controlBar: {
      skipButtons: {
        forward: 10,
        backward: 10
      }
    },
    sources: [{ src: streamUrl, type: 'video/mp4' }]
  }), [streamUrl]);

  if (loading) return <div className="page-loader"><div className="spinner"></div></div>;
  if (error) return <div className="error-message">{error}</div>;
  if (!movie) return <div className="error-message">Movie not found.</div>;

  const handlePlayerReady = (player) => {
    playerRef.current = player;
    // Attempt to resume playback
    const history = getProgress(movie.id);
    if (history && history.currentTime && history.currentTime > 5) {
      player.currentTime(history.currentTime);
    }
    
    // Save progress periodically
    let lastSavedTime = history?.currentTime || 0;
    player.on('timeupdate', () => {
      const ct = player.currentTime();
      if (Math.abs(ct - lastSavedTime) > 5) { // Save roughly every 5 seconds
        saveProgress(movie.id, {
          id: movie.id,
          title: movie.title || movie.name,
          media_type: type,
          poster_path: movie.poster_path,
          backdrop_path: movie.backdrop_path,
          overview: movie.overview,
          currentTime: ct,
          duration: isNaN(player.duration()) ? 0 : player.duration()
        });
        lastSavedTime = ct;
      }
    });

    player.on('ended', () => {
      if (type === 'tv' && playingTvContext) {
        // Exit fullscreen to show overlay safely, or just show overlay
        if (document.fullscreenElement) {
          document.exitFullscreen().catch(e => console.log(e));
        }
        startAutoplayCountdown(playingTvContext.season, playingTvContext.episode);
      }
    });
  };

  if (streamUrl) {
    return (
      <div 
        className={`full-screen-player ${isPlayerIdle ? 'player-idle' : ''}`}
        onMouseMove={handlePlayerMouseMove}
        onClick={handlePlayerMouseMove}
      >
        <div className={`player-top-overlay ${isPlayerIdle ? 'hidden' : ''}`}>
            <button className="close-player-btn-new" onClick={() => {
              setStreamUrl(null);
              setAutoplayCountdown(null);
              if (countdownTimerRef.current) clearInterval(countdownTimerRef.current);
            }}>
              <ArrowLeft size={44} />
            </button>
            <div className="player-title-overlay">
              {movie.title || movie.name} {playingTvContext ? `(S${playingTvContext.season} E${playingTvContext.episode})` : ''}
            </div>

            {type === 'tv' && playingTvContext && seasonData && (
              <div className="player-top-right-controls" onClick={(e) => e.stopPropagation()}>
                <button 
                  className="btn-player-episodes"
                  onClick={() => setShowEpisodesDropdown(!showEpisodesDropdown)}
                >
                  <List size={20} /> Episodes
                </button>
                
                {showEpisodesDropdown && (
                  <div className="episodes-dropdown-menu fade-in">
                    <div className="episodes-dropdown-header">
                      <h4>Season {playingTvContext.season}</h4>
                    </div>
                    <div className="episodes-dropdown-list">
                      {seasonData.episodes.map(ep => (
                        <div 
                          key={ep.id} 
                          className={`episode-dropdown-item ${playingTvContext.episode === ep.episode_number ? 'active' : ''}`}
                          onClick={() => {
                            setShowEpisodesDropdown(false);
                            if (playingTvContext.episode !== ep.episode_number) {
                              handleWatchEpisode(playingTvContext.season, ep.episode_number);
                            }
                          }}
                        >
                          <span className="ep-num">{ep.episode_number}</span>
                          <span className="ep-name">{ep.name}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
          
          <div className="movie-player-container-fullscreen">
            <VideoPlayer options={playerOptions} onReady={handlePlayerReady} />
            
            {autoplayCountdown !== null && (
              <div className="autoplay-overlay fade-in">
                <div className="autoplay-content">
                  <h2>Next Episode playing in {autoplayCountdown}...</h2>
                  <div className="autoplay-buttons">
                    <button className="btn-play-now" onClick={() => {
                      if (countdownTimerRef.current) clearInterval(countdownTimerRef.current);
                      // Instantly jump to 0 to trigger the switch
                      setAutoplayCountdown(0);
                      const nextEp = playingTvContext.episode + 1;
                      handleWatchEpisode(playingTvContext.season, nextEp);
                    }}>
                      <Play fill="black" size={20} /> Play Now
                    </button>
                    <button className="btn-cancel" onClick={() => {
                      if (countdownTimerRef.current) clearInterval(countdownTimerRef.current);
                      setAutoplayCountdown(null);
                      setStreamUrl(null);
                    }}>
                      Cancel
                    </button>
                  </div>
                </div>
              </div>
            )}

            {type === 'tv' && !isPlayerIdle && autoplayCountdown === null && (
            <button 
              className="btn-skip-intro fade-in"
              onClick={(e) => {
                e.stopPropagation();
                if (playerRef.current) {
                  const p = playerRef.current;
                  p.currentTime(p.currentTime() + 85);
                }
              }}
            >
              Skip Intro
            </button>
          )}
        </div>
      </div>
    );
  }

  const backdropUrl = movie.backdrop_path 
    ? `https://image.tmdb.org/t/p/original${movie.backdrop_path}`
    : '';

  return (
    <div className="movie-details-modal-wrapper fade-in">
      <div className="movie-details-modal">
        <button className="modal-close-btn" onClick={() => navigate(-1)}>
          <X size={24} />
        </button>
        
        <div className="modal-hero" style={{ backgroundImage: `url(${backdropUrl})` }}>
          <div className="modal-hero-gradient"></div>
          <div className="modal-hero-content">
            <h1 className="modal-title">{movie.title || movie.name}</h1>
            <div className="modal-buttons">
              <button 
                className="btn-hero btn-play" 
                onClick={handleWatchMovie} 
                disabled={streamLoading}
              >
                <Play fill="black" size={24} /> {streamLoading ? 'Connecting...' : 'Play'}
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

        {type === 'tv' && (
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
                    const query = `${movie.title || movie.name} ${seasonStr}`;
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
                          if (!f.name.match(/\.(mp4|mkv|avi|webm)$/i)) continue;
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
                          const query = `${movie.title || movie.name} ${s}${ep}`;
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
        )}

        <div id="torbox-streams-section" className="torbox-section">
          <div className="torbox-header">
            <h3>{currentSearchTitle || (type === 'tv' ? 'Global TorBox Streams (Whole Show)' : 'Streams')}</h3>
            {loadingTorrents && <div className="spinner-small"></div>}
          </div>
          
          <div className="torrents-list">
            {!loadingTorrents && torrents.length === 0 && (
              <p className="no-torrents">No TorBox streams found for this title.</p>
            )}
            
            {torrents.map((t, idx) => (
              <div key={idx} className="torrent-item-netflix">
                <div className="torrent-index">{idx + 1}</div>
                <div className="torrent-info-netflix">
                  <h4 className="torrent-name-netflix">{t.name}</h4>
                  <div className="torrent-meta-netflix">
                    <span>{(t.size / 1024 / 1024 / 1024).toFixed(2)} GB</span>
                    <span className="torrent-seeders-netflix">S: {t.seeders}</span>
                  </div>
                </div>
                <button 
                  className="btn-download-netflix" 
                  disabled={downloadedMagnets.has(t.magnet)}
                  style={{ opacity: downloadedMagnets.has(t.magnet) ? 0.5 : 1, cursor: downloadedMagnets.has(t.magnet) ? 'default' : 'pointer' }}
                  onClick={() => handleDownload(t.magnet)}
                >
                  {downloadedMagnets.has(t.magnet) ? <Check size={20} color="#46d369" /> : <Download size={20} />}
                </button>
              </div>
            ))}
          </div>
        </div>

        {movie.similar && movie.similar.results && movie.similar.results.length > 0 && (
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
        )}
      </div>
    </div>
  );
};

export default MovieDetails;
