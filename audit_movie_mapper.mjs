import https from 'https';

const TORBOX_API_KEY = '44e44710-b122-412b-8202-70bf570841bf';

async function fetchMyList() {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'api.torbox.app',
      path: '/v1/api/torrents/mylist?bypass_sp=false',
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${TORBOX_API_KEY}`
      }
    };
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => resolve(JSON.parse(data)));
    });
    req.on('error', reject);
    req.end();
  });
}

async function run() {
  const res = await fetchMyList();
  const torrents = res.data || [];
  
  const library = { movies: {}, tv: {} };
  
  for (const t of torrents) {
    const rawName = t.name || '';
    
    // Check if it matches TV show patterns (S01E01, S01, Season 1, 1x01)
    const tvMatch = rawName.match(/[sS]\d{1,2}\s?[-\.]?\s?[eE]\d{1,2}|\d{1,2}x\d{1,2}|[sS]eason\s?\d{1,2}|[sS]\d{1,2}\b/i);
    
    if (tvMatch) {
      let showKey = rawName.substring(0, tvMatch.index);
      showKey = showKey.replace(/[\._]/g, ' ').replace(/[^a-zA-Z0-9\s]/g, '').trim().toLowerCase();
      if (!library.tv[showKey]) library.tv[showKey] = [];
      library.tv[showKey].push(rawName);
    } else {
      // Movie parser
      // Split by year (19xx or 20xx) or by resolution (1080p, 720p, etc.)
      const movieSplitMatch = rawName.match(/(19|20)\d{2}\b|1080p|720p|2160p|4k|bluray|web-?dl|webrip|x264|x265/i);
      let movieKey = rawName;
      if (movieSplitMatch) {
         movieKey = rawName.substring(0, movieSplitMatch.index);
      }
      movieKey = movieKey.replace(/[\._]/g, ' ').replace(/[^a-zA-Z0-9\s]/g, '').trim().toLowerCase();
      if (!library.movies[movieKey]) library.movies[movieKey] = [];
      library.movies[movieKey].push(rawName);
    }
  }

  console.log("📺 TV SHOWS DETECTED:");
  for (const [key, names] of Object.entries(library.tv)) {
    console.log(`  - [${key}] (${names.length} torrents)`);
  }
  
  console.log("\n🍿 MOVIES DETECTED:");
  for (const [key, names] of Object.entries(library.movies)) {
    console.log(`  - [${key}] => ${names[0]}`);
  }
}

run();
