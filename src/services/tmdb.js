const TMDB_API_KEY = import.meta.env.VITE_TMDB_API_KEY || 'your_tmdb_api_key'; // Replace or use .env
const BASE_URL = '/api/tmdb';

export const fetchTrending = async (type = 'movie') => {
  const res = await fetch(`${BASE_URL}/trending/${type}/week?api_key=${TMDB_API_KEY}`);
  if (!res.ok) throw new Error(`Failed to fetch trending ${type}s`);
  const data = await res.json();
  data.results = data.results.map(item => ({ ...item, media_type: item.media_type || type }));
  return data;
};

export const searchMulti = async (query) => {
  const res = await fetch(`${BASE_URL}/search/multi?api_key=${TMDB_API_KEY}&query=${encodeURIComponent(query)}`);
  if (!res.ok) throw new Error('Failed to search');
  const data = await res.json();
  data.results = data.results.filter(item => item.media_type === 'movie' || item.media_type === 'tv');
  return data;
};

export const getDetails = async (id, type = 'movie') => {
  const res = await fetch(`${BASE_URL}/${type}/${id}?api_key=${TMDB_API_KEY}&append_to_response=credits,videos,similar,external_ids`);
  if (!res.ok) throw new Error(`Failed to fetch ${type} details`);
  return res.json();
};

export const fetchProviderContent = async (providerId, type = 'movie') => {
  const res = await fetch(`${BASE_URL}/discover/${type}?api_key=${TMDB_API_KEY}&with_watch_providers=${providerId}&watch_region=US&sort_by=popularity.desc`);
  if (!res.ok) throw new Error(`Failed to fetch ${type}s for provider ${providerId}`);
  const data = await res.json();
  data.results = data.results.map(item => ({ ...item, media_type: type }));
  return data;
};

export const getTvSeasonDetails = async (tvId, seasonNumber) => {
  const res = await fetch(`${BASE_URL}/tv/${tvId}/season/${seasonNumber}?api_key=${TMDB_API_KEY}`);
  if (!res.ok) throw new Error('Failed to fetch season details');
  return res.json();
};
