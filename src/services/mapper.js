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
    const libraryMap = { tv: {}, movies: {} };
    if (!torboxList || !Array.isArray(torboxList)) return libraryMap;

    for (const torrent of torboxList) {
        if (!torrent.files) continue;
        
        const rawName = torrent.name || '';
        const tvMatch = rawName.match(/[sS]\d{1,2}\s?[-\\.]?\s?[eE]\d{1,2}|\d{1,2}x\d{1,2}|[sS]eason\s?\d{1,2}|[sS]\d{1,2}\b/i);
        
        if (tvMatch) {
            let showKey = rawName.substring(0, tvMatch.index);
            showKey = showKey.replace(/[\\._]/g, ' ').replace(/[^a-zA-Z0-9\\s]/g, '').trim().toLowerCase();
            
            for (const file of torrent.files) {
                const parsed = parseEpisodeFile(file.name);
                if (parsed) {
                    if (!libraryMap.tv[showKey]) libraryMap.tv[showKey] = {};
                    if (!libraryMap.tv[showKey][parsed.season]) libraryMap.tv[showKey][parsed.season] = {};
                    
                    libraryMap.tv[showKey][parsed.season][parsed.episode] = {
                        torrent_id: torrent.id,
                        file_id: file.id
                    };
                }
            }
        } else {
            // Movie mapping
            const movieSplitMatch = rawName.match(/(19|20)\d{2}\b|1080p|720p|2160p|4k|bluray|web-?dl|webrip|x264|x265/i);
            let movieKey = rawName;
            if (movieSplitMatch) {
               movieKey = rawName.substring(0, movieSplitMatch.index);
            }
            movieKey = movieKey.replace(/[\\._]/g, ' ').replace(/[^a-zA-Z0-9\\s]/g, '').trim().toLowerCase();
            if (!libraryMap.movies[movieKey]) {
                libraryMap.movies[movieKey] = {
                    torrent_id: torrent.id,
                    files: torrent.files
                };
            }
        }
    }
    return libraryMap;
}

export function isTvSeasonMapped(mappedLibrary, showTitle, season) {
    if (!mappedLibrary || !mappedLibrary.tv || !showTitle) return false;
    const cleanName = showTitle.replace(/[\\._]/g, ' ').replace(/[^a-zA-Z0-9\\s]/g, '').trim().toLowerCase();
    const matchedKeys = Object.keys(mappedLibrary.tv).filter(k => k === cleanName || cleanName.includes(k) || k.includes(cleanName));
    return matchedKeys.some(k => mappedLibrary.tv[k]?.[season] && Object.keys(mappedLibrary.tv[k][season]).length > 0);
}

export function isTvEpisodeMapped(mappedLibrary, showTitle, season, episode) {
    if (!mappedLibrary || !mappedLibrary.tv || !showTitle) return false;
    const cleanName = showTitle.replace(/[\\._]/g, ' ').replace(/[^a-zA-Z0-9\\s]/g, '').trim().toLowerCase();
    const matchedKeys = Object.keys(mappedLibrary.tv).filter(k => k === cleanName || cleanName.includes(k) || k.includes(cleanName));
    return matchedKeys.some(k => mappedLibrary.tv[k]?.[season]?.[episode]);
}

export function isMovieMapped(mappedLibrary, movieTitle) {
    if (!mappedLibrary || !mappedLibrary.movies || !movieTitle) return false;
    const cleanName = movieTitle.replace(/[\\._]/g, ' ').replace(/[^a-zA-Z0-9\\s]/g, '').trim().toLowerCase();
    const matchedKeys = Object.keys(mappedLibrary.movies).filter(k => k === cleanName || cleanName.includes(k) || k.includes(cleanName));
    return matchedKeys.length > 0;
}
