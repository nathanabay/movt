import { useEffect, useState, useRef, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import VideoPlayer from '../components/VideoPlayer';
import { Play, Download, X, Plus, ArrowLeft, Check, List, PictureInPicture } from 'lucide-react';
import toast from 'react-hot-toast';
import './MovieDetails.css';
import './TorboxStreams.css';
import './EpisodesList.css';
import './SimilarGrid.css';
import './FullScreenPlayer.css';
import '../components/Skeleton.css';

import HeroBanner from '../components/movie-details/HeroBanner';
import EpisodesList from '../components/movie-details/EpisodesList';
import StreamList from '../components/movie-details/StreamList';
import CastSpotlight from '../components/movie-details/CastSpotlight';
import SmartCollections from '../components/movie-details/SmartCollections';
import SimilarGrid from '../components/movie-details/SimilarGrid';

import { useWatchlist, useWatchHistory } from '../hooks/useUserData';
import { useMovieData } from '../hooks/useMovieData';
import { useTvSeasons } from '../hooks/useTvSeasons';
import { useTorboxSearch } from '../hooks/useTorboxSearch';
import { useCastSpotlight } from '../hooks/useCastSpotlight';
import { useTorboxStream } from '../hooks/useTorboxStream';
import { buildLibraryMap } from '../services/mapper';

const MovieDetails = ({ type }) => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { watchlist, toggleWatchlist, isInWatchlist } = useWatchlist();
  const { saveProgress, getProgress } = useWatchHistory();
  const inList = isInWatchlist(Number(id));

  const { movie, loading, error, themeColor, collectionData, introData } = useMovieData(id, type);
  const [selectedSeason, setSelectedSeason] = useState(1);
  const { seasonData, loadingSeason } = useTvSeasons(id, type, selectedSeason);
  const { torrents, loadingTorrents, currentSearchTitle, fetchTorrents, torboxList, fetchMyTorboxList, downloadedMagnets, setDownloadedMagnets } = useTorboxSearch(movie, type);
  const { selectedActor, actorCredits, handleActorClick } = useCastSpotlight();

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
  const [isPiPActive, setIsPiPActive] = useState(false);

  const mappedLibrary = useMemo(() => buildLibraryMap(torboxList), [torboxList]);

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
    
    // PiP Event Listeners
    const videoNode = player.el().querySelector('video');
    if (videoNode) {
      videoNode.addEventListener('enterpictureinpicture', () => setIsPiPActive(true));
      videoNode.addEventListener('leavepictureinpicture', () => setIsPiPActive(false));
    }

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
                      document.exitPictureInPicture().catch(()=>toast.error("Failed to exit PiP"));
                    } else {
                      videoElement.requestPictureInPicture().catch(()=>toast.error("Failed to enter PiP"));
                    }
                  }
                }}
              >
                <PictureInPicture size={20} /> {isPiPActive ? 'Exit PiP' : 'PiP'}
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
        <HeroBanner 
          movie={movie} 
          themeColor={themeColor} 
          type={type} 
          handleWatchMovie={handleWatchMovie} 
          streamLoading={streamLoading} 
          getProgress={getProgress} 
          toggleWatchlist={toggleWatchlist} 
          inList={inList} 
        />

        {type === 'tv' && (
          <EpisodesList 
            movie={movie}
            selectedSeason={selectedSeason}
            setSelectedSeason={setSelectedSeason}
            fetchTorrents={fetchTorrents}
            loadingSeason={loadingSeason}
            seasonData={seasonData}
            mappedLibrary={mappedLibrary}
            handleWatchEpisode={handleWatchEpisode}
          />
        )}

        <StreamList 
          currentSearchTitle={currentSearchTitle}
          type={type}
          loadingTorrents={loadingTorrents}
          torrents={torrents}
          isMagnetDownloaded={isMagnetDownloaded}
          handleDownload={handleDownload}
        />

        <CastSpotlight 
          movie={movie}
          selectedActor={selectedActor}
          actorCredits={actorCredits}
          handleActorClick={handleActorClick}
        />

        <SmartCollections collectionData={collectionData} />

        <SimilarGrid movie={movie} type={type} />
      </div>
    </div>
  );
};

export default MovieDetails;
