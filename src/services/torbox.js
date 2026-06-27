import { TorboxApi } from 'torbox-api';

const TORBOX_API_KEY = import.meta.env.VITE_TORBOX_API_KEY || 'your_torbox_api_key';

const sdk = new TorboxApi({
  token: TORBOX_API_KEY,
});

export const searchTorbox = async (imdbId, title) => {
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

  return allTorrents;
};

export const addTorrent = async (magnetLink) => {
  try {
    const formData = new FormData();
    formData.append('magnet', magnetLink);
    
    const response = await fetch('/api/torbox/createtorrent', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${TORBOX_API_KEY}`
      },
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

export const getStreamUrl = async (magnetLink) => {
  try {
    // 1. Add Torrent via raw fetch (bypassing SDK FormData bug)
    const formData = new FormData();
    formData.append('magnet', magnetLink);
    
    const addRes = await fetch('/api/torbox/createtorrent', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${TORBOX_API_KEY}` },
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
    const maxRetries = 5;
    
    while (retries < maxRetries) {
      const listRes = await fetch(`/api/torbox/mylist`, {
        headers: { 'Authorization': `Bearer ${TORBOX_API_KEY}` }
      });
      const listData = await listRes.json();
      const torrents = listData.data || [];
      torrent = torrents.find(t => t.id === torrentId || t.id === Number(torrentId));
      
      if (torrent && torrent.files && torrent.files.length > 0) {
        break;
      }
      
      retries++;
      if (retries < maxRetries) {
        // Wait 2 seconds before polling again
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }
    
    if (!torrent || !torrent.files || torrent.files.length === 0) {
      throw new Error("Torrent files not found. The torrent might be dead, or TorBox is still downloading metadata. Please check your TorBox dashboard.");
    }

    // Find the largest file (likely the video)
    const videoFile = torrent.files.sort((a,b) => b.size - a.size)[0];

    // 3. Request Stream Link
    const streamRes = await fetch(`/api/torbox/requestdl?token=${TORBOX_API_KEY}&torrent_id=${torrentId}&file_id=${videoFile.id}&zip=false&torrent_file=false`, {
      headers: { 'Authorization': `Bearer ${TORBOX_API_KEY}` }
    });
    const streamData = await streamRes.json();
    
    if (!streamData.success) {
      const detailMsg = typeof streamData.detail === 'string' ? streamData.detail : JSON.stringify(streamData.detail);
      throw new Error(detailMsg || "Failed to get stream link");
    }

    return streamData.data; // This is the direct stream URL
  } catch (err) {
    console.error("Stream generation error:", err);
    throw err;
  }
};

export const getEpisodeStreamUrl = async (showName, seasonNum, episodeNum) => {
  try {
    const sStr = seasonNum < 10 ? `S0${seasonNum}` : `S${seasonNum}`;
    const eStr = episodeNum < 10 ? `E0${episodeNum}` : `E${episodeNum}`;
    
    // 1. Fetch user's torrent list to see if they already have the season pack or episode
    const listRes = await fetch(`/api/torbox/mylist`, {
      headers: { 'Authorization': `Bearer ${TORBOX_API_KEY}` }
    });
    const listData = await listRes.json();
    const torrents = listData.data || [];

    let matchedTorrentId = null;
    let matchedFileId = null;

    // Build regexes to loosely match show name and strictly match episode
    const nameRegex = new RegExp(showName.replace(/[^a-zA-Z0-9]/g, '.*'), 'i');
    const epRegex = new RegExp(`[S]?0?${seasonNum}[Ex]0?${episodeNum}`, 'i');
    
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
      const streamRes = await fetch(`/api/torbox/requestdl?token=${TORBOX_API_KEY}&torrent_id=${matchedTorrentId}&file_id=${matchedFileId}&zip=false&torrent_file=false`, {
        headers: { 'Authorization': `Bearer ${TORBOX_API_KEY}` }
      });
      const streamData = await streamRes.json();
      if (streamData.success) {
        return streamData.data;
      }
    }

    // 3. Fallback: Search APIBay for the individual episode magnet
    const fallbackQuery = `${showName} ${sStr}${eStr}`;
    const searchData = await searchTorbox(null, fallbackQuery);
    if (!searchData || searchData.length === 0) {
      throw new Error(`No streams available for ${sStr}${eStr}`);
    }
    
    return getStreamUrl(searchData[0].magnet);
  } catch (err) {
    console.error("Episode stream generation error:", err);
    throw err;
  }
};

export const getMyTorboxList = async () => {
  try {
    const res = await fetch(`/api/torbox/mylist`, {
      headers: { 'Authorization': `Bearer ${TORBOX_API_KEY}` }
    });
    const data = await res.json();
    return data.data || [];
  } catch (err) {
    console.error("Failed to fetch TorBox list:", err);
    return [];
  }
};
