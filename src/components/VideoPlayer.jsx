import React, { useEffect, useRef, useState } from 'react';
import videojs from 'video.js';
import 'video.js/dist/video-js.css';
import { Play, Pause } from 'lucide-react';
import toast from 'react-hot-toast';
import './VideoPlayer.css';

// Register VLC Button natively in video.js
const Button = videojs.getComponent('Button');
class VlcButton extends Button {
  constructor(player, options) {
    super(player, options);
    this.controlText('No Audio? Play in VLC');
  }
  buildCSSClass() {
    return `vjs-vlc-btn ${super.buildCSSClass()}`;
  }
  createEl() {
    const el = super.createEl();
    el.innerHTML = `<span class="vjs-icon-placeholder" style="font-size: 1.1rem; font-weight: 600; font-family: inherit; display: flex; align-items: center; justify-content: center; width: 100%; height: 100%;">VLC</span>`;
    return el;
  }
  handleClick() {
    const src = this.player().currentSrc();
    if (src) {
      navigator.clipboard.writeText(src)
        .then(() => toast.success("Stream link copied! Open VLC -> File -> Open Network..."))
        .catch(() => toast.error("Failed to copy link"));
    }
  }
}
if (!videojs.getComponent('VlcButton')) {
  videojs.registerComponent('VlcButton', VlcButton);
}

export const VideoPlayer = React.memo(({ options, onReady }) => {
  const videoRef = useRef(null);
  const playerRef = useRef(null);
  const [ripple, setRipple] = useState(null); // 'play' or 'pause'
  const rippleTimerRef = useRef(null);

  useEffect(() => {
    if (!playerRef.current) {
      const videoElement = document.createElement("video");
      videoElement.classList.add('video-js');
      videoElement.classList.add('vjs-big-play-centered');
      videoElement.classList.add('vjs-theme-netflix');
      videoElement.setAttribute('playsinline', 'playsinline');
      videoElement.setAttribute('webkit-playsinline', 'webkit-playsinline');

      videoRef.current.appendChild(videoElement);

      const player = playerRef.current = videojs(videoElement, options, () => {
        if (options.subtitleUrl) {
          player.addRemoteTextTrack({
            kind: 'captions',
            src: options.subtitleUrl,
            srclang: 'en',
            label: 'English',
            default: true
          }, false);
        }
        onReady && onReady(player);
      });

      // Add VLC button to control bar before the fullscreen toggle
      const controlBar = player.getChild('controlBar');
      if (controlBar) {
        const length = controlBar.children().length;
        controlBar.addChild('VlcButton', {}, length - 1);
      }

      player.on('play', () => triggerRipple('play'));
      player.on('pause', () => triggerRipple('pause'));
    } else {
      const player = playerRef.current;
      player.autoplay(options.autoplay);
      player.src(options.sources);
    }
  }, [options, videoRef]);

  const triggerRipple = (type) => {
    setRipple(type);
    if (rippleTimerRef.current) clearTimeout(rippleTimerRef.current);
    rippleTimerRef.current = setTimeout(() => {
      setRipple(null);
    }, 500); // 500ms fade animation
  };

  useEffect(() => {
    return () => {
      if (playerRef.current && !playerRef.current.isDisposed()) {
        playerRef.current.dispose();
        playerRef.current = null;
      }
      if (rippleTimerRef.current) clearTimeout(rippleTimerRef.current);
    };
  }, []);

  return (
    <div data-vjs-player style={{ width: '100%', height: '100%', position: 'relative' }}>
      <div ref={videoRef} style={{ width: '100%', height: '100%' }} />
      
      {/* Ripple Animation Overlay */}
      {ripple && (
        <div className="player-ripple-overlay">
          <div className="ripple-icon-container ripple-animate">
            {ripple === 'play' ? <Play size={64} fill="white" /> : <Pause size={64} fill="white" />}
          </div>
        </div>
      )}
    </div>
  );
});

export default VideoPlayer;
