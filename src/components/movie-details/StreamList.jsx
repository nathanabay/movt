import React, { useState, useMemo } from 'react';
import { Download, Check } from 'lucide-react';
import { parseReleaseName } from '../../utils/qualityParser';

const StreamList = ({ currentSearchTitle, type, loadingTorrents, torrents, isMagnetDownloaded, handleDownload }) => {
  const [selectedQuality, setSelectedQuality] = useState('All');

  // Parse all torrents and derive available qualities
  const { filteredTorrents, availableQualities } = useMemo(() => {
    if (!torrents) return { filteredTorrents: [], availableQualities: ['All'] };
    
    const parsed = torrents.map(t => {
      const parsedData = parseReleaseName(t.name);
      return { ...t, ...parsedData };
    });

    const qualities = new Set(parsed.map(t => t.resolution).filter(r => r && r !== 'Unknown'));
    
    // Sort qualities: 4K > 1080p > 720p > etc.
    const sortedQualities = ['All', ...Array.from(qualities).sort((a, b) => {
      if (a === '4K') return -1;
      if (b === '4K') return 1;
      return parseInt(b) - parseInt(a);
    })];

    const filtered = selectedQuality === 'All' 
      ? parsed 
      : parsed.filter(t => t.resolution === selectedQuality);

    return { filteredTorrents: filtered, availableQualities: sortedQualities };
  }, [torrents, selectedQuality]);

  return (
    <div id="torbox-streams-section" className="torbox-section">
      <div className="torbox-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <h3>{currentSearchTitle || (type === 'tv' ? 'Global TorBox Streams (Whole Show)' : 'Streams')}</h3>
          {loadingTorrents && <div className="spinner-small"></div>}
        </div>
        
        {torrents && torrents.length > 0 && (
          <div className="quality-selector" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <label style={{ fontSize: '0.9rem', color: '#ccc' }}>Quality:</label>
            <select 
              value={selectedQuality}
              onChange={(e) => setSelectedQuality(e.target.value)}
              style={{
                backgroundColor: 'rgba(255,255,255,0.1)',
                color: '#fff',
                border: '1px solid rgba(255,255,255,0.2)',
                padding: '6px 12px',
                borderRadius: '8px',
                outline: 'none',
                cursor: 'pointer'
              }}
            >
              {availableQualities.map(q => (
                <option key={q} value={q} style={{ color: '#000' }}>{q === 'All' ? 'All Qualities' : q}</option>
              ))}
            </select>
          </div>
        )}
      </div>
      
      <div className="torrents-list" style={{ marginTop: '16px' }}>
        {!loadingTorrents && torrents.length === 0 && (
          <p className="no-torrents">No TorBox streams found for this title.</p>
        )}
        
        {filteredTorrents.map((t, idx) => (
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
