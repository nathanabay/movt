const fs = require('fs');

let content = fs.readFileSync('src/pages/MovieDetails.jsx', 'utf8');

// 1. Add PictureInPicture to imports
content = content.replace(
  "import { Play, Download, X, Plus, ArrowLeft, Check, List } from 'lucide-react';",
  "import { Play, Download, X, Plus, ArrowLeft, Check, List, PictureInPicture } from 'lucide-react';"
);

// 2. Add isPiPActive state
content = content.replace(
  "const [showSkipIntro, setShowSkipIntro] = useState(false);",
  "const [showSkipIntro, setShowSkipIntro] = useState(false);\n  const [isPiPActive, setIsPiPActive] = useState(false);"
);

// 3. Add event listeners inside handlePlayerReady
const handlePlayerReadyCode = `  const handlePlayerReady = (player) => {
    playerRef.current = player;
    
    // PiP Event Listeners
    const videoNode = player.el().querySelector('video');
    if (videoNode) {
      videoNode.addEventListener('enterpictureinpicture', () => setIsPiPActive(true));
      videoNode.addEventListener('leavepictureinpicture', () => setIsPiPActive(false));
    }
`;
content = content.replace("  const handlePlayerReady = (player) => {\n    playerRef.current = player;", handlePlayerReadyCode);

// 4. Update the PiP Button
const oldButton = `<button 
                className="btn-player-episodes" 
                onClick={() => {
                  const videoElement = document.querySelector('.video-js video');
                  if (videoElement && document.pictureInPictureEnabled) {
                    if (document.pictureInPictureElement) {
                      document.exitPictureInPicture();
                    } else {
                      videoElement.requestPictureInPicture();
                    }
                  }
                }}
              >
                🪟 PiP
              </button>`;

const newButton = `<button 
                className="btn-player-episodes" 
                onClick={() => {
                  const videoElement = document.querySelector('.video-js video');
                  if (videoElement && document.pictureInPictureEnabled) {
                    if (document.pictureInPictureElement) {
                      document.exitPictureInPicture().catch(()=>toast.error("Failed to exit PiP"));
                    } else {
                      videoElement.requestPictureInPicture().catch(()=>toast.error("Failed to enter PiP"));
                    }
                  }
                }}
              >
                <PictureInPicture size={20} /> {isPiPActive ? 'Exit PiP' : 'PiP'}
              </button>`;
              
content = content.replace(oldButton, newButton);

fs.writeFileSync('src/pages/MovieDetails.jsx', content);
console.log('PiP Fixes applied.');
