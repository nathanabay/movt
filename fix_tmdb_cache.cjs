const fs = require('fs');
let code = fs.readFileSync('src/services/tmdb.js', 'utf8');

// Replace the cache initialization and fetchWithCache function
const oldCacheBlock = `// In-memory cache for very fast repeated loads with TTL and Size Limit
const cache = new Map();
const MAX_CACHE_SIZE = 100;
const CACHE_TTL = 1000 * 60 * 10; // 10 minutes

const fetchWithCache = async (url) => {
  if (cache.has(url)) {
    const cached = cache.get(url);
    if (Date.now() - cached.timestamp < CACHE_TTL) {
      return cached.data;
    }
    cache.delete(url); // Expired
  }
  const res = await fetch(url);
  if (!res.ok) throw new Error('API request failed');
  const data = await res.json();
  
  if (cache.size >= MAX_CACHE_SIZE) {
    const oldestKey = cache.keys().next().value;
    cache.delete(oldestKey);
  }
  
  cache.set(url, { data, timestamp: Date.now() });
  return data;
};`;

const newFetchBlock = `// Use a simple fetch wrapper since React Query handles all caching natively
const fetchTmdb = async (url) => {
  const res = await fetch(url);
  if (!res.ok) throw new Error('API request failed');
  return await res.json();
};`;

code = code.replace(oldCacheBlock, newFetchBlock);

// Replace all usages of fetchWithCache with fetchTmdb
code = code.replaceAll('fetchWithCache', 'fetchTmdb');

// Also remove JSON.parse(JSON.stringify(data)) since data is no longer pulled from a shared mutable cache
code = code.replaceAll('const copy = JSON.parse(JSON.stringify(data)); // prevent mutating cached object', 'const copy = data;');
code = code.replaceAll('const copy = JSON.parse(JSON.stringify(data));', 'const copy = data;');

fs.writeFileSync('src/services/tmdb.js', code);
console.log("TMDB cache removed.");
