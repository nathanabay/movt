const TMDB_API_KEY = import.meta.env.VITE_TMDB_API_KEY || 'ad135a8e5c5b0915dd7a498e5416ca26'; 
const BASE_URL = 'https://api.themoviedb.org/3';

// In-memory cache for very fast repeated loads
const cache = new Map();

const fetchWithCache = async (url) => {
  if (cache.has(url)) {
    return cache.get(url);
  }
  const res = await fetch(url);
  if (!res.ok) throw new Error('API request failed');
  const data = await res.json();
  cache.set(url, data);
  return data;
};

export const fetchTrending = async (type = 'movie') => {
  const data = await fetchWithCache(`${BASE_URL}/trending/${type}/week?api_key=${TMDB_API_KEY}`);
  const copy = JSON.parse(JSON.stringify(data)); // prevent mutating cached object
  copy.results = copy.results.map(item => ({ ...item, media_type: item.media_type || type }));
  return copy;
};

export const searchMulti = async (query) => {
  const data = await fetchWithCache(`${BASE_URL}/search/multi?api_key=${TMDB_API_KEY}&query=${encodeURIComponent(query)}`);
  const copy = JSON.parse(JSON.stringify(data));
  copy.results = copy.results.filter(item => item.media_type === 'movie' || item.media_type === 'tv');
  return copy;
};

export const getDetails = async (id, type = 'movie') => {
  return await fetchWithCache(`${BASE_URL}/${type}/${id}?api_key=${TMDB_API_KEY}&append_to_response=credits,videos,similar,external_ids`);
};

export const fetchProviderContent = async (providerId, type = 'movie') => {
  const data = await fetchWithCache(`${BASE_URL}/discover/${type}?api_key=${TMDB_API_KEY}&with_watch_providers=${providerId}&watch_region=US&sort_by=popularity.desc`);
  const copy = JSON.parse(JSON.stringify(data));
  copy.results = copy.results.map(item => ({ ...item, media_type: type }));
  return copy;
};

export const getTvSeasonDetails = async (tvId, seasonNumber) => {
  return await fetchWithCache(`${BASE_URL}/tv/${tvId}/season/${seasonNumber}?api_key=${TMDB_API_KEY}`);
};

export const fetchMovieVideos = async (id, type = 'movie') => {
  const data = await fetchWithCache(`${BASE_URL}/${type}/${id}/videos?api_key=${TMDB_API_KEY}`);
  return data.results;
};
