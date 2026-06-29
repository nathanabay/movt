const fs = require('fs');

const css = fs.readFileSync('src/pages/MovieDetails.css', 'utf8');

const sTorbox = css.indexOf('.modal-overview-metada.torbox-section {');
const sEpisodes = css.indexOf('/* Episodes Section Styling */');
const sSimilar = css.indexOf('/* Similar Section Styling */');
const sFullscreen = css.indexOf('/* Full Screen Player */');
const sMedia = css.indexOf('@media (max-width: 768px) {', sFullscreen);
const sSkipIntro = css.indexOf('/* Skip Intro Button */', sMedia);

const modalCore = css.substring(0, sTorbox);
const torbox = css.substring(sTorbox, sEpisodes);
const episodes = css.substring(sEpisodes, sSimilar);
const similar = css.substring(sSimilar, sFullscreen);
const fullscreenTop = css.substring(sFullscreen, sMedia);
const mediaBlock = css.substring(sMedia, sSkipIntro);
const fullscreenBottom = css.substring(sSkipIntro);

// We should move media queries into their respective files
let newModalCore = modalCore.trim() + `

@media (max-width: 768px) {
  .modal-hero { height: 300px; }
  .modal-info-section { padding: 0 1rem; }
}
`;

let newTorbox = torbox.trim() + `

@media (max-width: 768px) {
  .torbox-section { padding: 1.5rem 1rem !important; }
  .torrent-item-netflix { flex-wrap: wrap; gap: 1rem; }
  .torrent-info-netflix { min-width: 100%; order: 3; }
  .btn-download-netflix { margin-left: auto; }
}
`;

let newEpisodes = episodes.trim() + `

@media (max-width: 768px) {
  .episodes-section { padding: 1.5rem 1rem !important; }
}
`;

let newFullscreen = fullscreenTop.trim() + `

@media (max-width: 768px) {
  .player-top-overlay { padding: 15px; }
  .player-top-right-controls { top: 15px; right: 15px; }
  .btn-skip-intro { bottom: 100px; right: 15px; padding: 8px 16px; font-size: 0.9rem; }
  .autoplay-content h2 { font-size: var(--text-2xl); }
  .autoplay-buttons { flex-direction: column; }
}
` + '\n' + fullscreenBottom.trim();

fs.writeFileSync('src/pages/MovieDetails.css', newModalCore);
fs.writeFileSync('src/pages/TorboxStreams.css', newTorbox);
fs.writeFileSync('src/pages/EpisodesList.css', newEpisodes);
fs.writeFileSync('src/pages/SimilarGrid.css', similar.trim());
fs.writeFileSync('src/pages/FullScreenPlayer.css', newFullscreen);

const jsxPath = 'src/pages/MovieDetails.jsx';
let jsx = fs.readFileSync(jsxPath, 'utf8');
jsx = jsx.replace("import './MovieDetails.css';", "import './MovieDetails.css';\nimport './TorboxStreams.css';\nimport './EpisodesList.css';\nimport './SimilarGrid.css';\nimport './FullScreenPlayer.css';");
fs.writeFileSync(jsxPath, jsx);

console.log("Splitting complete!");
