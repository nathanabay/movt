const fs = require('fs');

let content = fs.readFileSync('src/services/torbox.js', 'utf8');

// 1. Sort torrent results in searchTorbox
const oldCacheSet = `  if (allTorrents.length > 0) {
    if (searchCache.size >= MAX_CACHE_SIZE) {
      const oldestKey = searchCache.keys().next().value;
      searchCache.delete(oldestKey);
    }
    searchCache.set(cacheKey, { data: allTorrents, timestamp: Date.now() });
  }`;

const newCacheSet = `  // Smart Audio/Video Codec Sorting (Prioritize MP4/AAC, Deprioritize AC3/MKV)
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
  }`;

content = content.replace(oldCacheSet, newCacheSet);

// 2. Prioritize .mp4 over .mkv inside getStreamUrl when picking a file
const oldFilePicker = `    // Find the largest video file to default to
    const videoFile = validVideoFiles.sort((a,b) => b.size - a.size)[0];`;

const newFilePicker = `    // Find the largest video file, heavily prioritizing .mp4 over .mkv to avoid AC3 audio issues
    const videoFile = validVideoFiles.sort((a,b) => {
      const aIsMp4 = a.name.toLowerCase().endsWith('.mp4');
      const bIsMp4 = b.name.toLowerCase().endsWith('.mp4');
      if (aIsMp4 && !bIsMp4) return -1;
      if (!aIsMp4 && bIsMp4) return 1;
      return b.size - a.size; // fallback to largest file
    })[0];`;

content = content.replace(oldFilePicker, newFilePicker);

fs.writeFileSync('src/services/torbox.js', content);
console.log('TorBox Audio Fixes applied.');
