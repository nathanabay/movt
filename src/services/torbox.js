
const searchCache = new Map();
const MAX_CACHE_SIZE = 50;
const CACHE_TTL = 1000 * 60 * 15; // 15 mins

export const searchTorbox = async (imdbId, title) => {
  const cacheKey = `${imdbId}-${title}`;
  if (searchCache.has(cacheKey)) {
    const cached = searchCache.get(cacheKey);
    if (Date.now() - cached.timestamp < CACHE_TTL) {
      return JSON.parse(JSON.stringify(cached.data));
    }
    searchCache.delete(cacheKey);
  }

  let allTorrents = [];
  
  // 1. Try YTS
  if (imdbId) {
    try {
      const res = await fetch(`/api/yts/list_movies.json?query_term=${imdbId}`);
      if (res.ok) {
        const data = await res.json();
        if (data.data && data.data.movies && data.data.movies.length > 0) {
          const movie = data.data.movies[0];
          const ytsTorrents = movie.torrents || [];
          
          allTorrents = ytsTorrents.map(t => {
            const trackers = [
              'udp://open.demonii.com:1337/announce',
              'udp://tracker.openbittorrent.com:80',
              'udp://tracker.coppersurfer.tk:6969',
              'udp://glotorrents.pw:6969/announce',
              'udp://tracker.opentrackr.org:1337/announce'
            ];
            const trackersString = trackers.map(tr => `&tr=${encodeURIComponent(tr)}`).join('');
            const magnetLink = `magnet:?xt=urn:btih:${t.hash}&dn=${encodeURIComponent(movie.title)}%20${t.quality}${trackersString}`;
            
            return {
              name: `[YTS] ${movie.title} [${t.quality}]`,
              size: t.size_bytes,
              seeders: t.seeds,
              peers: t.peers,
              magnet: magnetLink
            };
          });
        }
      }
    } catch (ytsErr) {
      console.warn('YTS search failed:', ytsErr);
    }
  }

  // 2. Try APIBay (The Pirate Bay) if YTS didn't find much, or just combine
  if (title && allTorrents.length === 0) {
    try {
      const bayRes = await fetch(`/api/apibay/q.php?q=${encodeURIComponent(title)}`);
      if (bayRes.ok) {
        const bayData = await bayRes.json();
        // Filter out the "No results returned" dummy object
        const validBay = bayData.filter(t => t.id !== '0' && t.info_hash !== '0000000000000000000000000000000000000000');
        
        const bayTorrents = validBay.map(t => {
          const trackersString = '&tr=udp%3A%2F%2Ftracker.coppersurfer.tk%3A6969%2Fannounce&tr=udp%3A%2F%2Ftracker.openbittorrent.com%3A80%2Fannounce&tr=udp%3A%2F%2F9.rarbg.to%3A2710%2Fannounce&tr=udp%3A%2F%2F9.rarbg.me%3A2780%2Fannounce&tr=udp%3A%2F%2Fopen.demonii.com%3A1337%2Fannounce&tr=udp%3A%2F%2Ftracker.opentrackr.org%3A1337%2Fannounce';
          return {
            name: `[TPB] ${t.name}`,
            size: parseInt(t.size, 10) || 0,
            seeders: parseInt(t.seeders, 10) || 0,
            peers: parseInt(t.leechers, 10) || 0,
            magnet: `magnet:?xt=urn:btih:${t.info_hash}&dn=${encodeURIComponent(t.name)}${trackersString}`
          };
        });
        
        allTorrents = [...allTorrents, ...bayTorrents.slice(0, 10)]; // top 10
      }
    } catch (bayErr) {
      console.error('APIBay search failed:', bayErr);
    }
  }

  // Feature 1: Check Cached Torrents
  if (allTorrents.length > 0) {
    try {
      const hashes = allTorrents.map(t => {
        const match = t.magnet.match(/urn:btih:([^&]+)/i);
        return match ? match[1].toLowerCase() : null;
      }).filter(Boolean);

      if (hashes.length > 0) {
        // TorBox /checkcached takes a comma-separated list of hashes
        const checkRes = await fetch(`/api/torbox/checkcached?hash=${hashes.join(',')}&format=list`);
        if (checkRes.ok) {
          const checkData = await checkRes.json();
          const cachedList = checkData.data || [];
          // Some versions of API return an array, some return an object mapped by hash.
          // Let's handle both.
          let cachedHashes = new Set();
          if (Array.isArray(cachedList)) {
            // usually it's an array of objects or strings, let's assume objects with hash or just strings
            cachedList.forEach(item => {
              if (typeof item === 'string') cachedHashes.add(item.toLowerCase());
              else if (item.hash) cachedHashes.add(item.hash.toLowerCase());
            });
          } else if (typeof cachedList === 'object') {
            Object.keys(cachedList).forEach(k => {
              if (cachedList[k]) cachedHashes.add(k.toLowerCase());
            });
          }

          allTorrents.forEach(t => {
            const match = t.magnet.match(/urn:btih:([^&]+)/i);
            if (match && cachedHashes.has(match[1].toLowerCase())) {
              t.isCached = true;
            } else {
              t.isCached = false;
            }
          });
        }
      }
    } catch (err) {
      console.error('Failed to check cache:', err);
    }
  }

  // Smart Audio/Video Codec Sorting (Prioritize MP4/AAC, Deprioritize AC3/MKV)
  if (allTorrents.length > 0) {
    allTorrents = allTorrents.sort((a, b) => {
      if (a.isCached && !b.isCached) return -1;
      if (!a.isCached && b.isCached) return 1;

      const aName = a.name.toLowerCase();
      const bName = b.name.toLowerCase();

      const getScore = (name) => {
        let score = 0;
        if (name.includes('mp4')) score += 10;
        if (name.includes('aac')) score += 10;
        if (name.includes('webrip') || name.includes('web-dl')) score += 5;
        if (name.includes('ac3') || name.includes('eac3')) score -= 20;
        if (name.includes('dts') || name.includes('truehd')) score -= 20;
        if (name.includes('mkv')) score -= 10;
        if (name.includes('hevc') || name.includes('x265') || name.includes('h265')) score -= 15;
        return score;
      };

      const scoreA = getScore(aName);
      const scoreB = getScore(bName);

      if (scoreA !== scoreB) return scoreB - scoreA;
      return b.seeders - a.seeders;
    });

    if (searchCache.size >= MAX_CACHE_SIZE) {
      const oldestKey = searchCache.keys().next().value;
      searchCache.delete(oldestKey);
    }
    searchCache.set(cacheKey, { data: allTorrents, timestamp: Date.now() });
  }
  
  return JSON.parse(JSON.stringify(allTorrents));
};

export const addTorrent = async (magnetLink) => {
  try {
    const formData = new FormData();
    formData.append('magnet', magnetLink);
    
    const response = await fetch('/api/torbox/createtorrent', {
      method: 'POST',
      body: formData
    });
    
    if (!response.ok) {
      throw new Error(await response.text());
    }
    
    const data = await response.json();
    return data.data;
  } catch (err) {
    console.error('Failed to add torrent to TorBox:', err);
    throw err;
  }
};

export const getStreamUrl = async (magnetLink, signal = null) => {
  try {
    // 1. Add Torrent via raw fetch (bypassing SDK FormData bug)
    const formData = new FormData();
    formData.append('magnet', magnetLink);
    
    const addRes = await fetch('/api/torbox/createtorrent', {
      signal,
      method: 'POST',
      body: formData
    });
    
    const addData = await addRes.json();
    let torrentId = addData.data?.torrent_id || addData.data?.torrentId;
    if (!torrentId) {
      throw new Error(addData.detail || "Could not get torrent ID from TorBox");
    }

    // 2. Fetch Torrent List to find the file ID with polling
    let torrent = null;
    let retries = 0;
    const maxRetries = 30; // 60 seconds
    
    while (retries < maxRetries) {
      if (signal && signal.aborted) throw new Error('Aborted');
      const listRes = await fetch(`/api/torbox/mylist?id=${torrentId}`, { signal });
      if (!listRes.ok) {
        retries++;
        await new Promise(resolve => setTimeout(resolve, 4000));
        if (signal && signal.aborted) throw new Error('Aborted');
        continue;
      }
      
      const listData = await listRes.json();
      torrent = listData.data; // TorBox returns the single object if id is provided
      
      // Fallback if TorBox ignored the id parameter and returned an array
      if (Array.isArray(torrent)) {
        torrent = torrent.find(t => t.id === torrentId || t.id === Number(torrentId));
      }
      
      if (torrent && (torrent.download_state === 'cached' || torrent.download_state === 'completed' || torrent.download_state === 'downloading') && torrent.files && torrent.files.length > 0) {
        break;
      }
      
      retries++;
      if (retries < maxRetries) {
        await new Promise(resolve => setTimeout(resolve, 4000));
        if (signal && signal.aborted) throw new Error('Aborted');
      }
    }
    
    if (!torrent || !torrent.files || torrent.files.length === 0) {
      throw new Error("Torrent files not found or still downloading. Please check your TorBox dashboard.");
    }

    // Filter for valid video files
    const validVideoFiles = torrent.files.filter(f => f.name.match(/\.(mp4|mkv|avi|webm)$/i));
    if (validVideoFiles.length === 0) {
      throw new Error("No playable video files found in this torrent.");
    }

    // Find the largest video file, heavily prioritizing .mp4 over .mkv to avoid AC3 audio issues
    const videoFile = validVideoFiles.sort((a,b) => {
      const aIsMp4 = a.name.toLowerCase().endsWith('.mp4');
      const bIsMp4 = b.name.toLowerCase().endsWith('.mp4');
      if (aIsMp4 && !bIsMp4) return -1;
      if (!aIsMp4 && bIsMp4) return 1;
      return b.size - a.size; // fallback to largest file
    })[0];

    // 3. Request Stream Link
    if (signal && signal.aborted) throw new Error('Aborted');
    const streamRes = await fetch(`/api/torbox/requestdl?torrent_id=${torrentId}&file_id=${videoFile.id}&zip=false&torrent_file=false`, { signal });
    const streamData = await streamRes.json();
    
    if (!streamData.success) {
      const detailMsg = typeof streamData.detail === 'string' ? streamData.detail : JSON.stringify(streamData.detail);
      throw new Error(detailMsg || "Failed to get stream link");
    }

    return {
      url: streamData.data,
      torrentId: torrentId,
      files: validVideoFiles
    };
  } catch (err) {
    console.error("Stream generation error:", err);
    throw err;
  }
};

export const getEpisodeStreamUrl = async (showName, seasonNum, episodeNum, signal = null) => {
  try {
    const sStr = seasonNum < 10 ? `S0${seasonNum}` : `S${seasonNum}`;
    const eStr = episodeNum < 10 ? `E0${episodeNum}` : `E${episodeNum}`;
    
    // 1. Fetch user's torrent list to see if they already have the season pack or episode
    const listRes = await fetch(`/api/torbox/mylist`, { signal });
    const listData = await listRes.json();
    const torrents = listData.data || [];

    let matchedTorrentId = null;
    let matchedFileId = null;

    // Build regexes to loosely match show name and strictly match episode
    const nameRegex = new RegExp(showName.replace(/[^a-zA-Z0-9]/g, '.*'), 'i');
    const epRegex = new RegExp(`(S0*${seasonNum}[Ex]0*${episodeNum}|${seasonNum}x0*${episodeNum}|Episode\\\\s*0*${episodeNum})`, 'i');
    
    // Search TorBox cache first
    for (const t of torrents) {
      if (nameRegex.test(t.name) || (t.files && t.files.length > 0 && nameRegex.test(t.files[0].name))) {
        // If it's a season pack or episode pack, look through files
        for (const f of t.files || []) {
          // Check if file is video
          if (!f.name.match(/\.(mp4|mkv|avi|webm)$/i)) continue;
          
          if (epRegex.test(f.name) || f.name.includes(`${sStr}${eStr}`)) {
            matchedTorrentId = t.id;
            matchedFileId = f.id;
            break;
          }
        }
      }
      if (matchedFileId) break;
    }

    // 2. If found in cache, stream it instantly!
    if (matchedTorrentId && matchedFileId) {
      const streamRes = await fetch(`/api/torbox/requestdl?torrent_id=${matchedTorrentId}&file_id=${matchedFileId}&zip=false&torrent_file=false`, { signal });
      const streamData = await streamRes.json();
      if (streamData.success) {
        return {
          url: streamData.data,
          torrentId: matchedTorrentId,
          files: torrents.find(t => t.id === matchedTorrentId)?.files || []
        };
      }
    }

    // 3. Fallback: Search APIBay for the individual episode magnet
    const fallbackQuery = `${showName} ${sStr}${eStr}`.trim();
    const searchData = await searchTorbox(null, fallbackQuery);
    if (!searchData || searchData.length === 0) {
      throw new Error(`No streams available for ${sStr}${eStr}`);
    }
    
    return getStreamUrl(searchData[0].magnet, signal);
  } catch (err) {
    console.error("Episode stream generation error:", err);
    throw err;
  }
};

let myTorboxListCache = null;
let myTorboxListCacheTime = 0;
let myTorboxListPromise = null;

export const getMyTorboxList = async () => {
  if (myTorboxListCache && Date.now() - myTorboxListCacheTime < 60000) {
    return myTorboxListCache;
  }
  
  if (myTorboxListPromise) {
    return myTorboxListPromise;
  }

  myTorboxListPromise = (async () => {
    try {
      const res = await fetch(`/api/torbox/mylist`);
      if (!res.ok) throw new Error(await res.text());
      
      const data = await res.json();
      myTorboxListCache = data.data || [];
      myTorboxListCacheTime = Date.now();
      return myTorboxListCache;
    } catch (err) {
      console.error("Failed to fetch TorBox list:", err);
      throw new Error("Failed to load your TorBox torrents. Please check your API key or TorBox server status.");
    } finally {
      myTorboxListPromise = null;
    }
  })();
  
  return myTorboxListPromise;
};

export const getDirectStreamUrl = async (torrentId, fileId) => {
  const streamRes = await fetch(`/api/torbox/requestdl?torrent_id=${torrentId}&file_id=${fileId}&zip=false&torrent_file=false`);
  const streamData = await streamRes.json();
  if (streamData.success) {
    return streamData.data;
  }
  throw new Error("Failed to get direct stream link");
};
