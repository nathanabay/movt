import React, { useEffect, useRef, useState } from 'react';
import videojs from 'video.js';
import 'video.js/dist/video-js.css';
import { Play, Pause } from 'lucide-react';
import './VideoPlayer.css';

export const VideoPlayer = ({ options, onReady }) => {
  const videoRef = useRef(null);
  const playerRef = useRef(null);
  const [ripple, setRipple] = useState(null); // 'play' or 'pause'
  const rippleTimerRef = useRef(null);

  useEffect(() => {
    if (!playerRef.current) {
      const videoElement = document.createElement("video");
      videoElement.classList.add('video-js');
      videoElement.classList.add('vjs-big-play-centered');

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
};

export default VideoPlayer;
