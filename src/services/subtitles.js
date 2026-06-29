const OS_API_KEY = import.meta.env.VITE_OPENSUBTITLES_API_KEY;

export const fetchSubtitles = async (imdbId, type, season = null, episode = null) => {
  try {
    if (!OS_API_KEY || !imdbId) {
      console.warn("No OpenSubtitles API Key found or missing IMDB ID. Returning placeholder subtitles.");
      return generateMockSubtitles(type, season, episode);
    }
    
    // 1. Search OpenSubtitles REST API
    const rawImdbId = imdbId.replace('tt', '');
    const searchUrl = type === 'tv' 
      ? `https://api.opensubtitles.com/api/v1/subtitles?imdb_id=${rawImdbId}&season_number=${season}&episode_number=${episode}&languages=en`
      : `https://api.opensubtitles.com/api/v1/subtitles?imdb_id=${rawImdbId}&languages=en`;
      
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
  let titleContext = type === 'tv' ? `TV Show (S${season}E${episode})` : 'Movie';
  
  const vttContent = `WEBVTT

1
00:00:02.000 --> 00:00:06.000
[English Subtitles: Generated for ${titleContext}]

2
00:00:07.000 --> 00:00:12.000
Enjoy your premium streaming experience!
`;
  
  const blob = new Blob([vttContent], { type: 'text/vtt' });
  return URL.createObjectURL(blob);
};
