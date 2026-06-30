import { buildLibraryMap } from './src/services/mapper.js';
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
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          reject(e);
        }
      });
    });

    req.on('error', reject);
    req.end();
  });
}

async function run() {
  try {
    console.log("Fetching TorBox downloads...");
    const res = await fetchMyList();
    if (!res.success) {
      console.log("Failed to fetch TorBox list", res);
      return;
    }
    const torrents = res.data || [];
    console.log(`Found ${torrents.length} torrents in your account.\n`);
    
    console.log("Running Sonarr-style Remap Engine...\n");
    const mappedLibrary = buildLibraryMap(torrents);
    
    let totalShows = 0;
    let totalMappedEpisodes = 0;

    for (const [showKey, seasons] of Object.entries(mappedLibrary)) {
      totalShows++;
      console.log(`🎬 Show Key: "${showKey}"`);
      for (const [seasonNum, episodes] of Object.entries(seasons)) {
        const epKeys = Object.keys(episodes);
        totalMappedEpisodes += epKeys.length;
        console.log(`   └─ Season ${seasonNum}: ${epKeys.length} episodes mapped (${epKeys.join(', ')})`);
      }
    }
    
    console.log(`\n✅ Remapping Complete! Successfully mapped ${totalMappedEpisodes} episodes across ${totalShows} unique shows.`);
  } catch(e) {
    console.error("Audit failed:", e);
  }
}

run();
