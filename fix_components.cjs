const fs = require('fs');

// 1. Update useUserData.jsx to split contexts
let userData = fs.readFileSync('src/hooks/useUserData.jsx', 'utf8');

userData = userData.replace('const UserDataContext = createContext();', 
`const WatchlistContext = createContext();
const HistoryContext = createContext();`);

userData = userData.replace(
  /const value = useMemo\(\(\) => \(\{[\s\S]*?\}\), \[watchlist, history\]\);\s*return \(\s*<UserDataContext.Provider value=\{value\}>\s*\{children\}\s*<\/UserDataContext.Provider>\s*\);/,
  `const watchlistValue = useMemo(() => ({
    watchlist,
    toggleWatchlist,
    isInWatchlist
  }), [watchlist]);

  const historyValue = useMemo(() => ({
    history,
    saveProgress,
    getProgress,
    getContinueWatchingList
  }), [history]);

  return (
    <WatchlistContext.Provider value={watchlistValue}>
      <HistoryContext.Provider value={historyValue}>
        {children}
      </HistoryContext.Provider>
    </WatchlistContext.Provider>
  );`
);

userData = userData.replace(
  /const context = useContext\(UserDataContext\);\s*if \(\!context\) throw new Error\('useWatchlist must be used within UserDataProvider'\);\s*return \{ \s*watchlist: context.watchlist, \s*toggleWatchlist: context.toggleWatchlist, \s*isInWatchlist: context.isInWatchlist \s*\};/,
  `const context = useContext(WatchlistContext);
  if (!context) throw new Error('useWatchlist must be used within UserDataProvider');
  return context;`
);

userData = userData.replace(
  /const context = useContext\(UserDataContext\);\s*if \(\!context\) throw new Error\('useWatchHistory must be used within UserDataProvider'\);\s*return \{ \s*history: context.history, \s*saveProgress: context.saveProgress, \s*getProgress: context.getProgress, \s*getContinueWatchingList: context.getContinueWatchingList \s*\};/,
  `const context = useContext(HistoryContext);
  if (!context) throw new Error('useWatchHistory must be used within UserDataProvider');
  return context;`
);

fs.writeFileSync('src/hooks/useUserData.jsx', userData);


// 2. Memoize MovieCard
let movieCard = fs.readFileSync('src/components/MovieCard.jsx', 'utf8');
movieCard = movieCard.replace('import { useState, useRef } from \'react\';', 'import React, { useState, useRef } from \'react\';');
movieCard = movieCard.replace('export default MovieCard;', 'export default React.memo(MovieCard, (prev, next) => prev.movie.id === next.movie.id);');
fs.writeFileSync('src/components/MovieCard.jsx', movieCard);


// 3. Memoize VideoPlayer
let videoPlayer = fs.readFileSync('src/components/VideoPlayer.jsx', 'utf8');
videoPlayer = videoPlayer.replace('export const VideoPlayer = ({ options, onReady }) => {', 'export const VideoPlayer = React.memo(({ options, onReady }) => {');
// Find the end of VideoPlayer to close the memo
videoPlayer = videoPlayer.replace('  );\n};\n\nexport default VideoPlayer;', '  );\n});\n\nexport default VideoPlayer;');
fs.writeFileSync('src/components/VideoPlayer.jsx', videoPlayer);

console.log('Components fixed and memoized successfully!');
