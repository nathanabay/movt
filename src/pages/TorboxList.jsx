import { useState, useEffect } from 'react';
import { getMyTorboxList } from '../services/torbox';
import './TorboxList.css';

const TorboxList = () => {
  const [torrents, setTorrents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchList = async () => {
      try {
        const list = await getMyTorboxList();
        setTorrents(list);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    
    fetchList();
  }, []);

  if (loading) {
    return (
      <div className="torbox-page fade-in">
        <h1 className="page-title">My TorBox List</h1>
        <div className="loader" style={{margin: '2rem auto'}}></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="torbox-page fade-in">
        <h1 className="page-title">My TorBox List</h1>
        <div className="error-message">Failed to load: {error}</div>
      </div>
    );
  }

  return (
    <div className="torbox-page fade-in">
      <h1 className="page-title">My TorBox List</h1>
      
      {torrents.length === 0 ? (
        <p className="no-torrents">You don't have any torrents in your TorBox account yet.</p>
      ) : (
        <div className="torrents-grid">
          {torrents.map(torrent => (
            <div key={torrent.id} className="torrent-card">
              <h3 className="torrent-name" title={torrent.name}>{torrent.name}</h3>
              <div className="torrent-details">
                <span className={`status-badge status-${torrent.download_state || 'unknown'}`}>
                  {torrent.download_state || 'Unknown'}
                </span>
                <span className="torrent-size">
                  {(torrent.size / (1024 * 1024 * 1024)).toFixed(2)} GB
                </span>
                {torrent.download_state === 'downloading' && (
                  <span className="torrent-progress">
                    {(torrent.progress * 100).toFixed(1)}%
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default TorboxList;
