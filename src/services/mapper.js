export function parseEpisodeFile(filename) {
    if (!filename) return null;
    const lower = filename.toLowerCase();
    
    // Ignore non-video or sample files
    if (lower.includes('sample')) return null;
    const videoExts = ['.mp4', '.mkv', '.avi', '.webm'];
    if (!videoExts.some(ext => lower.endsWith(ext))) return null;

    let match = filename.match(/[sS](\d{1,2})[eE](\d{1,2})/i);
    if (!match) match = filename.match(/[sS](\d{1,2})\s?[-\.]?\s?[eE](\d{1,2})/i);
    if (!match) match = filename.match(/(\d{1,2})x(\d{1,2})/i);
    if (!match) match = filename.match(/[sS]eason\s?(\d{1,2})\s?[eE]pisode\s?(\d{1,2})/i);

    if (match) {
        return {
            season: parseInt(match[1], 10),
            episode: parseInt(match[2], 10),
            isMapped: true
        };
    }
    return null;
}

export function buildLibraryMap(torboxList) {
    const libraryMap = {};
    if (!torboxList || !Array.isArray(torboxList)) return libraryMap;

    for (const torrent of torboxList) {
        if (!torrent.files) continue;
        
        let showKey = (torrent.name || '').split(/[sS]\d{1,2}\s?[-\.]?\s?[eE]\d{1,2}|\d{1,2}x\d{1,2}|[sS]eason\s?\d{1,2}/i)[0];
        showKey = showKey.replace(/[\._]/g, ' ').replace(/[^a-zA-Z0-9\s]/g, '').trim().toLowerCase();

        for (const file of torrent.files) {
            const parsed = parseEpisodeFile(file.name);
            if (parsed) {
                if (!libraryMap[showKey]) libraryMap[showKey] = {};
                if (!libraryMap[showKey][parsed.season]) libraryMap[showKey][parsed.season] = {};
                
                libraryMap[showKey][parsed.season][parsed.episode] = {
                    torrent_id: torrent.id,
                    file_id: file.id
                };
            }
        }
    }
    return libraryMap;
}
