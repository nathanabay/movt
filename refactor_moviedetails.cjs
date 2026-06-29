const fs = require('fs');

let content = fs.readFileSync('src/pages/MovieDetails.jsx', 'utf8');

// 1. Add Imports
content = content.replace(
  "import '../components/Skeleton.css';",
  `import '../components/Skeleton.css';\n\nimport HeroBanner from '../components/movie-details/HeroBanner';\nimport EpisodesList from '../components/movie-details/EpisodesList';\nimport StreamList from '../components/movie-details/StreamList';\nimport CastSpotlight from '../components/movie-details/CastSpotlight';\nimport SmartCollections from '../components/movie-details/SmartCollections';\nimport SimilarGrid from '../components/movie-details/SimilarGrid';`
);

// 2. Replace the JSX body
const jsxStart = `<div className="movie-details-modal" style={{ backgroundColor: themeColor }}>`;

// Find where the modal-close-btn ends
const buttonEndRegex = /<button className="modal-close-btn"[\s\S]*?<\/button>/;
const buttonMatch = content.match(buttonEndRegex);

if (buttonMatch) {
  const beforeSection = content.substring(0, buttonMatch.index + buttonMatch[0].length);
  
  // Create the new injected components string
  const newJsx = `
        <HeroBanner 
          movie={movie} 
          themeColor={themeColor} 
          type={type} 
          handleWatchMovie={handleWatchMovie} 
          streamLoading={streamLoading} 
          getProgress={getProgress} 
          toggleWatchlist={toggleWatchlist} 
          inList={inList} 
        />

        {type === 'tv' && (
          <EpisodesList 
            movie={movie}
            selectedSeason={selectedSeason}
            setSelectedSeason={setSelectedSeason}
            fetchTorrents={fetchTorrents}
            loadingSeason={loadingSeason}
            seasonData={seasonData}
            torboxList={torboxList}
            handleWatchEpisode={handleWatchEpisode}
          />
        )}

        <StreamList 
          currentSearchTitle={currentSearchTitle}
          type={type}
          loadingTorrents={loadingTorrents}
          torrents={torrents}
          isMagnetDownloaded={isMagnetDownloaded}
          handleDownload={handleDownload}
        />

        <CastSpotlight 
          movie={movie}
          selectedActor={selectedActor}
          actorCredits={actorCredits}
          handleActorClick={handleActorClick}
        />

        <SmartCollections collectionData={collectionData} />

        <SimilarGrid movie={movie} type={type} />
      </div>
    </div>
  );
};

export default MovieDetails;
`;

  // We are going to slice `content` from `beforeSection` and just append the new JSX.
  fs.writeFileSync('src/pages/MovieDetails.jsx', beforeSection + newJsx);
  console.log("Refactored successfully!");
} else {
  console.error("Could not find the insertion point.");
}
