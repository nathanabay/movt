import { useEffect, useState, useRef, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import VideoPlayer from '../components/VideoPlayer';
import { Play, Download, X, Plus, ArrowLeft, Check, List } from 'lucide-react';
import toast from 'react-hot-toast';
import './MovieDetails.css';
import '../components/Skeleton.css';

import { useWatchlist, useWatchHistory } from '../hooks/useUserData';
import { useMovieDetails } from '../hooks/useMovieDetails';
import { useTorboxStream } from '../hooks/useTorboxStream';

const MovieDetails = ({ type }) => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { watchlist, toggleWatchlist, isInWatchlist } = useWatchlist();
  const { saveProgress, getProgress } = useWatchHistory();
  const inList = isInWatchlist(Number(id));

  const {
    movie, loading, error, themeColor, 
    torrents, loadingTorrents, currentSearchTitle, fetchTorrents,
    torboxList, fetchMyTorboxList, downloadedMagnets, setDownloadedMagnets,
    selectedSeason, setSelectedSeason, seasonData, loadingSeason,
    collectionData, selectedActor, actorCredits, handleActorClick,
    introData
  } = useMovieDetails(id, type);

  const {
    streamUrl, setStreamUrl, subtitleUrl, streamLoading, activeStreamInfo,
    downloadStats, playingTvContext, autoplayCountdown, setAutoplayCountdown,
    handleWatchMovie, handleWatchEpisode, startAutoplayCountdown,
    precachedNext, setPrecachedNext, countdownTimerRef, precacheNextEpisode
  } = useTorboxStream(movie, type);

  const [showResolutions, setShowResolutions] = useState(false);
  const playerRef = useRef(null);
  
  // Binge Mode State
  const [showEpisodesDropdown, setShowEpisodesDropdown] = useState(false);
  
  // Skip Intro State
  const [showSkipIntro, setShowSkipIntro] = useState(false);

  const handleDownload = async (magnet) => {
    try {
      toast('Adding torrent to TorBox...', { icon: '⏳' });
      const result = await import('../services/torbox').then(m => m.addTorrent(magnet));
      toast.success('Success! Torrent added to TorBox: ' + (result?.torrent_id || ''));
      setDownloadedMagnets(prev => {
        const next = new Set(prev);
        next.add(magnet);
        return next;
      });
      setTimeout(() => fetchMyTorboxList(), 1500);
    } catch (err) {
      toast.error('Error adding torrent: ' + err.message);
    }
  };

  const isMagnetDownloaded = (magnet) => {
    if (downloadedMagnets.has(magnet)) return true;
    const match = magnet.match(/urn:btih:([^&]+)/i);
    if (!match) return false;
    const hash = match[1].toLowerCase();
    return torboxList.some(t => t.hash && t.hash.toLowerCase() === hash);
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
    sources: [{ src: streamUrl, type: 'video/mp4' }],
    subtitleUrl: subtitleUrl
  }), [streamUrl, subtitleUrl]);



  const getCachedBadge = (titleStr) => {
    if (!torboxList || torboxList.length === 0 || !titleStr) return false;
    const nameRegex = new RegExp(titleStr.replace(/[^a-zA-Z0-9]/g, '.*'), 'i');
    for (const t of torboxList) {
      if (nameRegex.test(t.name) || (t.files && t.files.length > 0 && nameRegex.test(t.files[0].name))) {
        return true;
      }
    }
    return false;
  };

  if (loading) return (
    <div className="movie-details-modal-wrapper fade-in">
      <div className="skeleton-modal skeleton" style={{backgroundColor: '#181818'}}>
        <div className="skeleton-title skeleton" style={{background: '#333'}}></div>
        <div className="skeleton-overview skeleton" style={{background: '#333'}}></div>
      </div>
    </div>
  );
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
      
      if (type === 'tv' && introData) {
        if (ct >= introData.start && ct <= introData.end) {
          setShowSkipIntro(true);
        } else {
          setShowSkipIntro(false);
        }
      }

      // Feature: Background Episode Pre-Caching (Zero Buffering)
      if (type === 'tv' && playingTvContext && !precachedNext) {
        const dur = player.duration();
        if (!isNaN(dur) && ct > 0 && dur - ct <= 300) {
          setPrecachedNext(true);
          const showName = movie.title || movie.name;
          import('../services/torbox').then(m => {
            m.getEpisodeStreamUrl(showName, playingTvContext.season, playingTvContext.episode + 1)
              .catch(() => {}); // silently fail if no next ep
          });
        }
      }
    });

    player.on('ended', () => {
      if (type === 'tv' && playingTvContext) {
        if (document.fullscreenElement) {
          document.exitFullscreen().catch(e => console.log(e));
        }
        startAutoplayCountdown(playingTvContext.season, playingTvContext.episode, seasonData);
      }
    });
  };

  if (streamLoading) {
    return (
      <div className="full-screen-player player-loading-overlay fade-in" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#000', zIndex: 3000 }}>
        <div style={{ textAlign: 'center' }}>
          <div className="spinner-large" style={{ margin: '0 auto 20px auto' }}></div>
          <h2 style={{ color: 'white', fontSize: '1.8rem', fontWeight: 500, margin: 0 }}>Connecting to TorBox...</h2>
          <p style={{ color: '#a3a3a3', marginTop: '10px' }}>Initializing Secure Stream</p>
        </div>
      </div>
    );
  }

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

            <div className="player-top-right-controls" onClick={(e) => e.stopPropagation()} style={{display:'flex', gap:'10px', alignItems:'center'}}>
              
              {downloadStats && (
                <div className="live-stats-badge" style={{display:'flex', gap:'10px', background:'rgba(0,0,0,0.6)', padding:'5px 10px', borderRadius:'4px', border:'1px solid rgba(255,255,255,0.2)', fontSize:'0.9rem', color:'#46d369'}}>
                  <span>⬇ {(downloadStats.speed / 1024 / 1024).toFixed(1)} MB/s</span>
                  <span>{Math.round(downloadStats.progress * 100)}%</span>
                  <span>S: {downloadStats.seeders}</span>
                </div>
              )}

              {activeStreamInfo && activeStreamInfo.files && activeStreamInfo.files.length > 1 && (
                <div style={{position: 'relative'}}>
                  <button className="btn-player-episodes" onClick={() => setShowResolutions(!showResolutions)}>
                    ⚙ Quality
                  </button>
                  {showResolutions && (
                    <div className="episodes-dropdown-menu fade-in" style={{width: '200px'}}>
                      <div className="episodes-dropdown-list">
                        {activeStreamInfo.files.map(f => {
                          const resMatch = f.name.match(/(4K|2160p|1080p|720p|480p)/i);
                          const label = resMatch ? resMatch[0] : f.name.substring(0, 20) + '...';
                          return (
                            <div key={f.id} className="episode-dropdown-item" onClick={async () => {
                              setShowResolutions(false);
                              const { getDirectStreamUrl } = await import('../services/torbox');
                              try {
                                const url = await getDirectStreamUrl(activeStreamInfo.torrentId, f.id);
                                if (playerRef.current) {
                                  const p = playerRef.current;
                                  const currentTime = p.currentTime();
                                  setStreamUrl(url);
                                  setTimeout(() => p.currentTime(currentTime), 500);
                                }
                              } catch(e) { toast.error("Failed to switch quality"); }
                            }}>
                              <span className="ep-name">{label}</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              )}

              <button 
                className="btn-player-episodes" 
                onClick={() => {
                  const videoElement = document.querySelector('.video-js video');
                  if (videoElement && document.pictureInPictureEnabled) {
                    if (document.pictureInPictureElement) {
                      document.exitPictureInPicture();
                    } else {
                      videoElement.requestPictureInPicture();
                    }
                  }
                }}
              >
                🪟 PiP
              </button>

            {type === 'tv' && playingTvContext && seasonData && (
                <>
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
                </>
            )}
            </div>
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

            {!isPlayerIdle && (
              <div className="next-up-matrix fade-in">
                <h4>Next Up / Recommended</h4>
                <div className="next-up-scroll">
                  {(movie.recommendations?.results || movie.similar?.results || []).slice(0, 5).map(rec => {
                    const isCached = getCachedBadge(rec.title || rec.name);
                    return (
                      <div key={rec.id} className="next-up-card" onClick={(e) => {
                        e.stopPropagation();
                        setStreamUrl(null);
                        navigate(`/${rec.media_type || type}/${rec.id}`);
                        window.scrollTo(0, 0);
                      }}>
                        <img src={`https://image.tmdb.org/t/p/w300${rec.backdrop_path || rec.poster_path}`} alt={rec.title || rec.name} />
                        <div className="next-up-info">
                          <span>{rec.title || rec.name}</span>
                          {isCached && <span className="badge-instant-play">⚡ Instant</span>}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {type === 'tv' && showSkipIntro && autoplayCountdown === null && (
            <button 
              className="btn-skip-intro fade-in"
              onClick={(e) => {
                e.stopPropagation();
                if (playerRef.current && introData) {
                  const p = playerRef.current;
                  p.currentTime(introData.end);
                  setShowSkipIntro(false);
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
      <div className="movie-details-modal" style={{ backgroundColor: themeColor }}>
        <button className="modal-close-btn" onClick={() => navigate(-1)} style={{ backgroundColor: themeColor }}>
          <X size={24} />
        </button>
        
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
              <div key={idx} className="torrent-item-netflix" style={{ backgroundColor: 'rgba(0,0,0,0.2)', borderBottomColor: 'rgba(255,255,255,0.05)' }}>
                <div className="torrent-index">{idx + 1}</div>
                <div className="torrent-info-netflix">
                  <h4 className="torrent-name-netflix">
                    {t.name}
                    {t.isCached && <span style={{marginLeft: '8px', color: '#46d369', fontSize: '0.8rem', fontWeight: 'bold'}}>⚡ Instant Play</span>}
                  </h4>
                  <div className="torrent-meta-netflix">
                    <span>{(t.size / 1024 / 1024 / 1024).toFixed(2)} GB</span>
                    <span className="torrent-seeders-netflix">S: {t.seeders}</span>
                  </div>
                </div>
                <button 
                  className="btn-download-netflix" 
                  disabled={isMagnetDownloaded(t.magnet)}
                  style={{ opacity: isMagnetDownloaded(t.magnet) ? 0.5 : 1, cursor: isMagnetDownloaded(t.magnet) ? 'default' : 'pointer' }}
                  onClick={() => handleDownload(t.magnet)}
                  title={isMagnetDownloaded(t.magnet) ? "Already in TorBox Downloads" : "Download to TorBox"}
                >
                  {isMagnetDownloaded(t.magnet) ? <Check size={20} color="#46d369" /> : <Download size={20} />}
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Cast Spotlight */}
        {movie.credits && movie.credits.cast && movie.credits.cast.length > 0 && (
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
        )}

        {/* Smart Collections Hub */}
        {collectionData && collectionData.parts && collectionData.parts.length > 0 && (
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
        )}

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
