import React, { useState, useMemo } from 'react';
import { Download, Check } from 'lucide-react';
import { parseReleaseName } from '../../utils/qualityParser';

const StreamList = ({ currentSearchTitle, type, loadingTorrents, torrents, isMagnetDownloaded, handleDownload }) => {
  // Parse all torrents and derive available qualities
  const { parsedTorrents, availableQualities } = useMemo(() => {
    if (!torrents) return { parsedTorrents: [], availableQualities: [] };
    
    const parsed = torrents.map(t => {
      const parsedData = parseReleaseName(t.name);
      return { ...t, ...parsedData };
    });

    const qualities = new Set(parsed.map(t => t.resolution).filter(r => r && r !== 'Unknown'));
    
    // Sort qualities: 4K > 1080p > 720p > etc.
    const sortedQualities = Array.from(qualities).sort((a, b) => {
      if (a === '4K') return -1;
      if (b === '4K') return 1;
      return parseInt(b) - parseInt(a);
    });

    // Sonarr/Radarr Custom Format Audio Scoring System
    const getAudioScore = (audio) => {
      switch(audio) {
        case 'TrueHD': return 100; // Uncompressed high-fidelity
        case 'DTS': return 80;    // Usually DTS-HD MA
        case 'FLAC': return 70;   // Lossless
        case 'AC3': return 40;    // Standard Dolby Digital / E-AC3
        case 'AAC': return 20;    // Web standard compressed
        default: return 0;        // Unknown
      }
    };

    // Sonarr/Radarr Custom Format Codec Scoring System
    const getCodecScore = (codec) => {
      switch(codec) {
        case 'AV1': return 100;    // Highly advanced, smallest size
        case 'x265': return 80;    // Modern standard, half size
        case 'x264': return 40;    // Universal standard
        case 'XviD': return -100;  // Legacy, penalize heavily
        default: return 0;         // Unknown
      }
    };

    // Sort logic for "Best" torrent:
    // 1. Prioritize TorBox Cached torrents
    // 2. Radarr Total Score (Audio + Codec)
    // 3. Fallback to highest seeders
    parsed.sort((a, b) => {
      // 1. Cached
      if (a.isCached && !b.isCached) return -1;
      if (!a.isCached && b.isCached) return 1;

      // 2. Radarr Total Score
      const aTotal = getAudioScore(a.audio) + getCodecScore(a.codec);
      const bTotal = getAudioScore(b.audio) + getCodecScore(b.codec);
      if (aTotal !== bTotal) {
        return bTotal - aTotal;
      }

      // 3. Seeders
      return b.seeders - a.seeders;
    });

    return { parsedTorrents: parsed, availableQualities: sortedQualities };
  }, [torrents]);

  return (
    <div id="torbox-streams-section" className="torbox-section">
      <div className="torbox-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <h3>{currentSearchTitle || (type === 'tv' ? 'Global TorBox Streams (Whole Show)' : 'Streams')}</h3>
          {loadingTorrents && <div className="spinner-small"></div>}
        </div>
        
        {torrents && torrents.length > 0 && availableQualities.length > 0 && (
          <div className="quality-selector" style={{ display: 'flex', alignItems: 'center', gap: '8px', overflowX: 'auto', paddingBottom: '4px' }}>
            <span style={{ fontSize: '0.9rem', color: '#ccc', marginRight: '4px' }}>Auto-Download Best:</span>
            {availableQualities.map(q => {
              const bestTorrent = parsedTorrents.find(t => t.resolution === q);
              if (!bestTorrent) return null;
              const isDownloaded = isMagnetDownloaded(bestTorrent.magnet);
              
              return (
                <button
                  key={q}
                  disabled={isDownloaded}
                  onClick={(e) => {
                    e.stopPropagation();
                    if (!isDownloaded) handleDownload(bestTorrent.magnet);
                  }}
                  title={isDownloaded ? "Already Downloaded" : `Auto-download the most seeded ${q} torrent`}
                  style={{
                    backgroundColor: isDownloaded ? 'rgba(255,255,255,0.1)' : '#e50914',
                    color: isDownloaded ? '#888' : '#fff',
                    border: 'none',
                    padding: '6px 14px',
                    borderRadius: '20px',
                    outline: 'none',
                    cursor: isDownloaded ? 'default' : 'pointer',
                    fontWeight: 'bold',
                    whiteSpace: 'nowrap',
                    transition: 'all 0.2s ease',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}
                >
                  {isDownloaded ? <Check size={14} /> : <Download size={14} />} {q}
                </button>
              );
            })}
          </div>
        )}
      </div>
      
      <div className="torrents-list" style={{ marginTop: '16px' }}>
        {!loadingTorrents && torrents.length === 0 && (
          <p className="no-torrents">No TorBox streams found for this title.</p>
        )}
        
        {parsedTorrents.map((t, idx) => (
          <div key={idx} className="torrent-item-netflix" style={{ backgroundColor: 'rgba(0,0,0,0.2)', borderBottomColor: 'rgba(255,255,255,0.05)' }}>
            <div className="torrent-index">{idx + 1}</div>
            <div className="torrent-info-netflix">
              <h4 className="torrent-name-netflix">
                {t.name}
                {t.isCached && <span style={{marginLeft: '8px', color: '#46d369', fontSize: '0.8rem', fontWeight: 'bold'}}>⚡ Instant Play</span>}
              </h4>
              <div className="torrent-meta-netflix" style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', marginTop: '6px' }}>
                <span>{(t.size / 1024 / 1024 / 1024).toFixed(2)} GB</span>
                <span className="torrent-seeders-netflix">S: {t.seeders}</span>
                
                {/* Quality Badges */}
                <div style={{ display: 'flex', gap: '6px', marginLeft: 'auto' }}>
                  {t.resolution !== 'Unknown' && (
                    <span style={{ padding: '2px 6px', backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: '4px', fontSize: '0.75rem' }}>{t.resolution}</span>
                  )}
                  {t.source !== 'Unknown' && (
                    <span style={{ padding: '2px 6px', backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: '4px', fontSize: '0.75rem' }}>{t.source}</span>
                  )}
                  {t.codec !== 'Unknown' && (
                    <span style={{ padding: '2px 6px', backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: '4px', fontSize: '0.75rem' }}>{t.codec}</span>
                  )}
                  {t.audio !== 'Unknown' && (
                    <span style={{ padding: '2px 6px', backgroundColor: 'rgba(155,89,182,0.3)', color: '#d2b4de', borderRadius: '4px', fontSize: '0.75rem' }}>🎵 {t.audio}</span>
                  )}
                  {t.isCamOrTs && (
                    <span style={{ padding: '2px 6px', backgroundColor: 'rgba(231, 76, 60, 0.2)', color: '#e74c3c', borderRadius: '4px', fontSize: '0.75rem' }}>CAM/TS</span>
                  )}
                </div>
              </div>
            </div>
            <button 
              className="btn-download-netflix" 
              disabled={isMagnetDownloaded(t.magnet)}
              style={{ opacity: isMagnetDownloaded(t.magnet) ? 0.5 : 1, cursor: isMagnetDownloaded(t.magnet) ? 'default' : 'pointer' }}
              onClick={() => handleDownload(t.magnet)}
              title={isMagnetDownloaded(t.magnet) ? "Already in TorBox Downloads" : "Download to TorBox"}
            >
              {isMagnetDownloaded(t.magnet) ? <Check size={20} color="#46d369" /> : <Download size={20} />}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

export default React.memo(StreamList);
