const fs = require('fs');

// --- Fix 2: Handle TMDB 429 Errors ---
let tmdbCode = fs.readFileSync('src/services/tmdb.js', 'utf8');

const oldFetchTmdb = `// Use a simple fetch wrapper since React Query handles all caching natively
const fetchTmdb = async (url) => {
  const res = await fetch(url);
  if (!res.ok) throw new Error('API request failed');
  return await res.json();
};`;

const newFetchTmdb = `// Use a simple fetch wrapper since React Query handles all caching natively
const fetchTmdb = async (url) => {
  let retries = 3;
  let delay = 1000;
  
  while (retries > 0) {
    const res = await fetch(url);
    
    if (res.status === 429) {
      const retryAfter = res.headers.get('Retry-After');
      const waitTime = retryAfter ? parseInt(retryAfter) * 1000 : delay;
      console.warn(\`TMDB Rate Limit Hit. Retrying in \${waitTime}ms...\`);
      await new Promise(resolve => setTimeout(resolve, waitTime));
      retries -= 1;
      delay *= 2; // Exponential backoff fallback
      continue;
    }
    
    if (!res.ok) throw new Error('API request failed');
    return await res.json();
  }
  
  throw new Error('TMDB API is currently busy. Please try again later.');
};`;

tmdbCode = tmdbCode.replace(oldFetchTmdb, newFetchTmdb);
fs.writeFileSync('src/services/tmdb.js', tmdbCode);


// --- Fix 3: Real Subtitle Integration ---
const subCode = `const OS_API_KEY = import.meta.env.VITE_OPENSUBTITLES_API_KEY;

export const fetchSubtitles = async (imdbId, type, season = null, episode = null) => {
  try {
    if (!OS_API_KEY || !imdbId) {
      console.warn("No OpenSubtitles API Key found or missing IMDB ID. Returning placeholder subtitles.");
      return generateMockSubtitles(type, season, episode);
    }
    
    // 1. Search OpenSubtitles REST API
    const rawImdbId = imdbId.replace('tt', '');
    const searchUrl = type === 'tv' 
      ? \`https://api.opensubtitles.com/api/v1/subtitles?imdb_id=\${rawImdbId}&season_number=\${season}&episode_number=\${episode}&languages=en\`
      : \`https://api.opensubtitles.com/api/v1/subtitles?imdb_id=\${rawImdbId}&languages=en\`;
      
    const searchRes = await fetch(searchUrl, {
      headers: { 
        'Api-Key': OS_API_KEY, 
        'Content-Type': 'application/json',
        'User-Agent': 'movt-app-v1'
      }
    });
    
    const searchData = await searchRes.json();
    
    if (searchData.data && searchData.data.length > 0) {
       const fileId = searchData.data[0].attributes.files[0].file_id;
       
       // 2. Request Download Link
       const dlRes = await fetch('https://api.opensubtitles.com/api/v1/download', {
         method: 'POST',
         headers: { 
           'Api-Key': OS_API_KEY, 
           'Content-Type': 'application/json', 
           'Accept': 'application/json',
           'User-Agent': 'movt-app-v1'
         },
         body: JSON.stringify({ file_id: fileId })
       });
       
       const dlData = await dlRes.json();
       if (dlData.link) {
         return dlData.link;
       }
    }
    
    console.warn("No subtitles found on OpenSubtitles. Falling back to mock.");
    return generateMockSubtitles(type, season, episode);
    
  } catch (err) {
    console.error("Subtitle fetch failed:", err);
    return generateMockSubtitles(type, season, episode);
  }
};

// Fallback logic for when the API key is missing or no subs are found
const generateMockSubtitles = (type, season, episode) => {
  let titleContext = type === 'tv' ? \`TV Show (S\${season}E\${episode})\` : 'Movie';
  
  const vttContent = \`WEBVTT

1
00:00:02.000 --> 00:00:06.000
[English Subtitles: Generated for \${titleContext}]

2
00:00:07.000 --> 00:00:12.000
Enjoy your premium streaming experience!
\`;
  
  const blob = new Blob([vttContent], { type: 'text/vtt' });
  return URL.createObjectURL(blob);
};
`;

fs.writeFileSync('src/services/subtitles.js', subCode);

console.log("TMDB 429 Handler and OpenSubtitles Integration applied.");
