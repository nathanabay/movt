const fs = require('fs');

// --- Update torbox.js ---
let torboxCode = fs.readFileSync('src/services/torbox.js', 'utf8');

// getStreamUrl signature
torboxCode = torboxCode.replace(
  "export const getStreamUrl = async (magnetLink) => {",
  "export const getStreamUrl = async (magnetLink, signal = null) => {"
);
torboxCode = torboxCode.replace(
  "const addRes = await fetch('/api/torbox/createtorrent', {",
  "const addRes = await fetch('/api/torbox/createtorrent', {\n      signal,"
);
torboxCode = torboxCode.replace(
  "const listRes = await fetch(`/api/torbox/mylist?id=${torrentId}`);",
  "if (signal && signal.aborted) throw new Error('Aborted');\n      const listRes = await fetch(`/api/torbox/mylist?id=${torrentId}`, { signal });"
);
torboxCode = torboxCode.replace(
  "await new Promise(resolve => setTimeout(resolve, 4000));\n        continue;",
  "await new Promise(resolve => setTimeout(resolve, 4000));\n        if (signal && signal.aborted) throw new Error('Aborted');\n        continue;"
);
torboxCode = torboxCode.replace(
  "await new Promise(resolve => setTimeout(resolve, 4000));\n      }",
  "await new Promise(resolve => setTimeout(resolve, 4000));\n        if (signal && signal.aborted) throw new Error('Aborted');\n      }"
);
torboxCode = torboxCode.replace(
  "const streamRes = await fetch(`/api/torbox/requestdl?torrent_id=${torrentId}&file_id=${videoFile.id}&zip=false&torrent_file=false`);",
  "if (signal && signal.aborted) throw new Error('Aborted');\n    const streamRes = await fetch(`/api/torbox/requestdl?torrent_id=${torrentId}&file_id=${videoFile.id}&zip=false&torrent_file=false`, { signal });"
);

// getEpisodeStreamUrl signature
torboxCode = torboxCode.replace(
  "export const getEpisodeStreamUrl = async (showName, seasonNum, episodeNum) => {",
  "export const getEpisodeStreamUrl = async (showName, seasonNum, episodeNum, signal = null) => {"
);
torboxCode = torboxCode.replace(
  "const listRes = await fetch(`/api/torbox/mylist`);",
  "const listRes = await fetch(`/api/torbox/mylist`, { signal });"
);
torboxCode = torboxCode.replace(
  "const streamRes = await fetch(`/api/torbox/requestdl?torrent_id=${matchedTorrentId}&file_id=${matchedFileId}&zip=false&torrent_file=false`);",
  "const streamRes = await fetch(`/api/torbox/requestdl?torrent_id=${matchedTorrentId}&file_id=${matchedFileId}&zip=false&torrent_file=false`, { signal });"
);
torboxCode = torboxCode.replace(
  "return getStreamUrl(searchData[0].magnet);",
  "return getStreamUrl(searchData[0].magnet, signal);"
);

fs.writeFileSync('src/services/torbox.js', torboxCode);


// --- Update useTorboxStream.js ---
let hookCode = fs.readFileSync('src/hooks/useTorboxStream.js', 'utf8');

hookCode = hookCode.replace(
  "const countdownTimerRef = useRef(null);",
  "const countdownTimerRef = useRef(null);\n  const requestAbortController = useRef(null);"
);

hookCode = hookCode.replace(
  "let interval;",
  "let interval;\n    let pollAbortController = null;"
);
hookCode = hookCode.replace(
  "interval = setInterval(async () => {",
  "interval = setInterval(async () => {\n        if (pollAbortController) pollAbortController.abort();\n        pollAbortController = new AbortController();"
);
hookCode = hookCode.replace(
  "const res = await fetch(`/api/torbox/mylist`);",
  "const res = await fetch(`/api/torbox/mylist`, { signal: pollAbortController.signal });"
);
hookCode = hookCode.replace(
  "return () => clearInterval(interval);",
  "return () => {\n      clearInterval(interval);\n      if (pollAbortController) pollAbortController.abort();\n    };"
);

hookCode = hookCode.replace(
  "if (countdownTimerRef.current) clearInterval(countdownTimerRef.current);",
  "if (countdownTimerRef.current) clearInterval(countdownTimerRef.current);\n      if (requestAbortController.current) requestAbortController.current.abort();"
);

hookCode = hookCode.replace(
  "setStreamLoading(true);",
  "if (requestAbortController.current) requestAbortController.current.abort();\n      requestAbortController.current = new AbortController();\n      const signal = requestAbortController.current.signal;\n      setStreamLoading(true);"
);

// getStreamUrl call in handleWatchMovie
hookCode = hookCode.replace(
  "const data = await getStreamUrl(targetMagnet);",
  "const data = await getStreamUrl(targetMagnet, signal);"
);

// getEpisodeStreamUrl call in handleWatchEpisode
hookCode = hookCode.replace(
  "const data = await getEpisodeStreamUrl(showName, seasonNum, episodeNum);",
  "const data = await getEpisodeStreamUrl(showName, seasonNum, episodeNum, signal);"
);

// suppress AbortError toasts
hookCode = hookCode.replace(
  "toast.error('Failed to stream movie: ' + err.message);",
  "if (err.name !== 'AbortError' && err.message !== 'Aborted') toast.error('Failed to stream movie: ' + err.message);"
);
hookCode = hookCode.replace(
  "toast.error('Failed to stream episode: ' + err.message);",
  "if (err.name !== 'AbortError' && err.message !== 'Aborted') toast.error('Failed to stream episode: ' + err.message);"
);

fs.writeFileSync('src/hooks/useTorboxStream.js', hookCode);

console.log("Zombie polling killed successfully.");
