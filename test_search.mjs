const TORBOX_API_KEY = 'de060e0f-17e0-4d03-aa55-a3296398e1fb';
const torrentId = 45498586; // The Sheep Detectives BONE.mkv

async function test() {
  const listRes = await fetch(`https://api.torbox.app/v1/api/torrents/mylist?bypass_cache=true`, {
    headers: { 'Authorization': `Bearer ${TORBOX_API_KEY}` }
  });
  const listData = await listRes.json();
  const torrent = listData.data.find(t => t.id === torrentId);
  
  if (!torrent) { console.log("Torrent not found"); return; }
  
  const videoFile = torrent.files.sort((a,b) => b.size - a.size)[0];
  console.log("File ID:", videoFile.id);
  
  const streamRes = await fetch(`https://api.torbox.app/v1/api/torrents/requestdl?torrent_id=${torrentId}&file_id=${videoFile.id}&zip=false&torrent_file=false`, {
    headers: { 'Authorization': `Bearer ${TORBOX_API_KEY}` }
  });
  const streamData = await streamRes.json();
  console.log("Stream Request:", JSON.stringify(streamData, null, 2));
}

test();
