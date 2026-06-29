import { useState, useRef, useEffect } from 'react';
import toast from 'react-hot-toast';
import { searchTorbox } from '../services/torbox';
import { fetchSubtitles } from '../services/subtitles';

export const useTorboxStream = (movie, type) => {
  const [streamUrl, setStreamUrl] = useState(null);
  const [subtitleUrl, setSubtitleUrl] = useState(null);
  const [streamLoading, setStreamLoading] = useState(false);
  const [activeStreamInfo, setActiveStreamInfo] = useState(null);
  const [downloadStats, setDownloadStats] = useState(null);
  
  // Binge Mode State
  const [playingTvContext, setPlayingTvContext] = useState(null);
  const [autoplayCountdown, setAutoplayCountdown] = useState(null);
  const [precachedNext, setPrecachedNext] = useState(false);
  const countdownTimerRef = useRef(null);
  const requestAbortController = useRef(null);

  // Live Stats Polling
  useEffect(() => {
    let interval;
    let pollAbortController = null;
    if (activeStreamInfo && activeStreamInfo.torrentId) {
      interval = setInterval(async () => {
        if (pollAbortController) pollAbortController.abort();
        pollAbortController = new AbortController();
        try {
          const res = await fetch(`/api/torbox/mylist`, { signal: pollAbortController.signal });
          const d = await res.json();
          const t = (d.data || []).find(x => x.id === activeStreamInfo.torrentId);
          if (t && t.download_state === 'downloading') {
            setDownloadStats({
              speed: t.download_speed || 0,
              progress: t.progress || 0,
              seeders: t.seeds || 0
            });
          } else {
            setDownloadStats(null);
          }
        } catch (e) {}
      }, 3000);
    }
    return () => {
      clearInterval(interval);
      if (pollAbortController) pollAbortController.abort();
    };
  }, [activeStreamInfo]);

  useEffect(() => {
    return () => {
      if (countdownTimerRef.current) clearInterval(countdownTimerRef.current);
      if (requestAbortController.current) requestAbortController.current.abort();
    };
  }, []);

  const handleWatchMovie = async (torrents) => {
    try {
      if (requestAbortController.current) requestAbortController.current.abort();
      requestAbortController.current = new AbortController();
      const signal = requestAbortController.current.signal;
      setStreamLoading(true);
      let targetMagnet = null;
      if (torrents && torrents.length > 0) {
        targetMagnet = torrents[0].magnet;
      } else {
        const imdbId = movie.imdb_id || (movie.external_ids && movie.external_ids.imdb_id);
        const year = movie.release_date ? movie.release_date.substring(0, 4) : '';
        const searchName = type === 'tv' ? (movie.title || movie.name).trim() : `${movie.title || movie.name} ${year}`.trim();
        const data = await searchTorbox(imdbId, searchName);
        if (data && data.length > 0) {
          targetMagnet = data[0].magnet;
        }
      }

      if (!targetMagnet) {
        toast.error("No streams available to watch.");
        setStreamLoading(false);
        return;
      }

      const { getStreamUrl } = await import('../services/torbox');
      const data = await getStreamUrl(targetMagnet, signal);
      
      setActiveStreamInfo(data);
      const subUrl = await fetchSubtitles(movie.imdb_id || (movie.external_ids && movie.external_ids.imdb_id), 'movie');
      setSubtitleUrl(subUrl);
      
      setStreamUrl(data.url);
    } catch (err) {
      if (err.name !== 'AbortError' && err.message !== 'Aborted') toast.error('Failed to stream movie: ' + err.message);
    } finally {
      setStreamLoading(false);
    }
  };

  const handleWatchEpisode = async (seasonNum, episodeNum) => {
    try {
      if (autoplayCountdown !== null) setAutoplayCountdown(null);
      if (countdownTimerRef.current) clearInterval(countdownTimerRef.current);
      
      if (requestAbortController.current) requestAbortController.current.abort();
      requestAbortController.current = new AbortController();
      const signal = requestAbortController.current.signal;
      
      setStreamLoading(true);
      const showName = movie.title || movie.name;
      const { getEpisodeStreamUrl } = await import('../services/torbox');
      const data = await getEpisodeStreamUrl(showName, seasonNum, episodeNum, signal);
      setPlayingTvContext({ season: seasonNum, episode: episodeNum });
      setPrecachedNext(false);
      setActiveStreamInfo(data);
      
      const subUrl = await fetchSubtitles(movie.imdb_id || (movie.external_ids && movie.external_ids.imdb_id), 'tv', seasonNum, episodeNum);
      setSubtitleUrl(subUrl);
      
      setStreamUrl(data.url);
    } catch (err) {
      if (err.name !== 'AbortError' && err.message !== 'Aborted') toast.error('Failed to stream episode: ' + err.message);
      setAutoplayCountdown(null);
    } finally {
      setStreamLoading(false);
    }
  };

  const startAutoplayCountdown = (currentSeason, currentEpisode, seasonData) => {
    let nextSeason = currentSeason;
    let nextEpisode = currentEpisode + 1;
    
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

  return {
    streamUrl, setStreamUrl, subtitleUrl, streamLoading, activeStreamInfo,
    downloadStats, playingTvContext, autoplayCountdown, setAutoplayCountdown,
    handleWatchMovie, handleWatchEpisode, startAutoplayCountdown,
    precachedNext, setPrecachedNext, countdownTimerRef
  };
};
