import React from 'react';
import { Download, Check } from 'lucide-react';

const StreamList = ({ currentSearchTitle, type, loadingTorrents, torrents, isMagnetDownloaded, handleDownload }) => {
  return (
    <div id="torbox-streams-section" className="torbox-section">
      <div className="torbox-header">
        <h3>{currentSearchTitle || (type === 'tv' ? 'Global TorBox Streams (Whole Show)' : 'Streams')}</h3>
        {loadingTorrents && <div className="spinner-small"></div>}
      </div>
      
      <div className="torrents-list">
        {!loadingTorrents && torrents.length === 0 && (
          <p className="no-torrents">No TorBox streams found for this title.</p>
        )}
        
        {torrents.map((t, idx) => (
          <div key={idx} className="torrent-item-netflix" style={{ backgroundColor: 'rgba(0,0,0,0.2)', borderBottomColor: 'rgba(255,255,255,0.05)' }}>
            <div className="torrent-index">{idx + 1}</div>
            <div className="torrent-info-netflix">
              <h4 className="torrent-name-netflix">
                {t.name}
                {t.isCached && <span style={{marginLeft: '8px', color: '#46d369', fontSize: '0.8rem', fontWeight: 'bold'}}>⚡ Instant Play</span>}
              </h4>
              <div className="torrent-meta-netflix">
                <span>{(t.size / 1024 / 1024 / 1024).toFixed(2)} GB</span>
                <span className="torrent-seeders-netflix">S: {t.seeders}</span>
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
