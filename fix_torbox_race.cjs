const fs = require('fs');

let code = fs.readFileSync('src/services/torbox.js', 'utf8');

const oldFunc = `let myTorboxListCache = null;
let myTorboxListCacheTime = 0;

export const getMyTorboxList = async () => {
  try {
    if (myTorboxListCache && Date.now() - myTorboxListCacheTime < 60000) {
      return myTorboxListCache; // Cache for 60 seconds
    }
    const res = await fetch(\`/api/torbox/mylist\`);
    if (!res.ok) throw new Error(await res.text());
    
    const data = await res.json();
    myTorboxListCache = data.data || [];
    myTorboxListCacheTime = Date.now();
    return myTorboxListCache;
  } catch (err) {
    console.error("Failed to fetch TorBox list:", err);
    throw new Error("Failed to load your TorBox torrents. Please check your API key or TorBox server status.");
  }
};`;

const newFunc = `let myTorboxListCache = null;
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
      const res = await fetch(\`/api/torbox/mylist\`);
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
};`;

code = code.replace(oldFunc, newFunc);
fs.writeFileSync('src/services/torbox.js', code);
console.log("Promise cache implemented.");
