const fs = require('fs');

// 1. Update VideoPlayer.jsx
let jsx = fs.readFileSync('src/components/VideoPlayer.jsx', 'utf8');
jsx = jsx.replace(
  "import { Play, Pause } from 'lucide-react';",
  "import { Play, Pause, ExternalLink } from 'lucide-react';\nimport toast from 'react-hot-toast';"
);

const jsxOldReturn = `  return (
    <div data-vjs-player style={{ width: '100%', height: '100%', position: 'relative' }}>
      <div ref={videoRef} style={{ width: '100%', height: '100%' }} />
      
      {/* Ripple Animation Overlay */}`;

const jsxNewReturn = `  const handleCopyStream = (e) => {
    e.stopPropagation();
    if (options.sources && options.sources.length > 0) {
      navigator.clipboard.writeText(options.sources[0].src)
        .then(() => toast.success("Stream link copied! Open VLC -> File -> Open Network..."))
        .catch(() => toast.error("Failed to copy link"));
    }
  };

  return (
    <div data-vjs-player style={{ width: '100%', height: '100%', position: 'relative' }}>
      <div ref={videoRef} style={{ width: '100%', height: '100%' }} />
      
      <button 
        onClick={handleCopyStream}
        className="vlc-fallback-btn"
        title="If audio is not playing (AC3/EAC3 codec issue), click to copy link and play in VLC"
      >
        <ExternalLink size={16} style={{ marginRight: '6px' }} />
        No Audio? Play in VLC
      </button>

      {/* Ripple Animation Overlay */}`;

jsx = jsx.replace(jsxOldReturn, jsxNewReturn);
fs.writeFileSync('src/components/VideoPlayer.jsx', jsx);

// 2. Update VideoPlayer.css
const cssAddition = `
/* VLC Fallback Button */
.vlc-fallback-btn {
  position: absolute;
  top: 15px;
  right: 15px;
  z-index: 101;
  background-color: rgba(0, 0, 0, 0.6);
  color: #fff;
  border: 1px solid rgba(255,255,255,0.2);
  border-radius: 6px;
  padding: 8px 12px;
  display: flex;
  align-items: center;
  font-size: 0.9rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  backdrop-filter: blur(4px);
  opacity: 0.7;
}

.vlc-fallback-btn:hover {
  background-color: rgba(229, 9, 20, 0.9); /* Netflix Red hover */
  border-color: rgba(229, 9, 20, 1);
  opacity: 1;
  transform: scale(1.05);
}
`;
fs.appendFileSync('src/components/VideoPlayer.css', cssAddition);

console.log("VLC Fallback added");
