import express from 'express';
import { createProxyMiddleware } from 'http-proxy-middleware';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

// Load environment variables if present
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// Enable CORS
app.use(cors());
app.use(express.json());

import jwt from 'jsonwebtoken';
import { 
  createUser, verifyUser, 
  getWatchlist, addToWatchlist, removeFromWatchlist,
  getHistory, updateHistory, removeFromHistory 
} from './db.js';

const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-key-change-me';

// Auth Middleware
const authenticate = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Unauthorized' });
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    req.user = payload;
    next();
  } catch (err) {
    res.status(401).json({ error: 'Invalid token' });
  }
};

// --- API Routes ---
app.post('/api/auth/register', (req, res) => {
  try {
    const user = createUser(req.body.username, req.body.password);
    const token = jwt.sign({ id: user.id, username: user.username }, JWT_SECRET, { expiresIn: '30d' });
    res.json({ token, user });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.post('/api/auth/login', (req, res) => {
  try {
    const user = verifyUser(req.body.username, req.body.password);
    const token = jwt.sign({ id: user.id, username: user.username }, JWT_SECRET, { expiresIn: '30d' });
    res.json({ token, user });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.get('/api/auth/me', authenticate, (req, res) => {
  res.json({ user: req.user });
});

app.get('/api/watchlist', authenticate, (req, res) => {
  res.json(getWatchlist(req.user.id));
});

app.post('/api/watchlist', authenticate, (req, res) => {
  res.json(addToWatchlist(req.user.id, req.body.item));
});

app.delete('/api/watchlist/:mediaType/:itemId', authenticate, (req, res) => {
  res.json(removeFromWatchlist(req.user.id, req.params.itemId, req.params.mediaType));
});

app.get('/api/history', authenticate, (req, res) => {
  res.json(getHistory(req.user.id));
});

app.post('/api/history', authenticate, (req, res) => {
  res.json(updateHistory(req.user.id, req.body.item, req.body.progress, req.body.duration, req.body.season, req.body.episode));
});

app.delete('/api/history/:mediaType/:itemId', authenticate, (req, res) => {
  res.json(removeFromHistory(req.user.id, req.params.itemId, req.params.mediaType));
});

// Configure robust native proxies
const proxyRequest = async (req, res, targetBase, apiType) => {
  try {
    const path = req.originalUrl.replace(/^\/api\/[^/]+/, '');
    let targetUrl = targetBase + path;
    
    // Securely inject API keys on the backend so they aren't exposed in the frontend
    if (apiType === 'tmdb' && process.env.VITE_TMDB_API_KEY) {
      targetUrl = targetUrl.replace(/api_key=[^&]+/, `api_key=${process.env.VITE_TMDB_API_KEY}`);
      if (!targetUrl.includes('api_key=')) {
        targetUrl += (targetUrl.includes('?') ? '&' : '?') + `api_key=${process.env.VITE_TMDB_API_KEY}`;
      }
    }

    const headers = {
      'Accept': req.headers.accept || '*/*',
      'User-Agent': 'Mozilla/5.0 (Node.js Proxy)'
    };

    if (apiType === 'torbox' && process.env.VITE_TORBOX_API_KEY) {
      headers['Authorization'] = `Bearer ${process.env.VITE_TORBOX_API_KEY}`;
    }

    const response = await fetch(targetUrl, {
      method: req.method,
      headers
    });

    if (!response.ok) {
      return res.status(response.status).send(await response.text());
    }

    const data = await response.text();
    res.set('Content-Type', response.headers.get('content-type'));
    res.send(data);
  } catch (error) {
    console.error('Proxy Error:', error);
    res.status(500).json({ error: 'Proxy failed' });
  }
};

app.use('/api/apibay', (req, res) => proxyRequest(req, res, 'https://apibay.org', 'apibay'));
app.use('/api/torbox', (req, res) => proxyRequest(req, res, 'https://api.torbox.app/v1/api/torrents', 'torbox'));
app.use('/api/tmdb', (req, res) => proxyRequest(req, res, 'https://api.themoviedb.org/3', 'tmdb'));
app.use('/api/yts', (req, res) => proxyRequest(req, res, 'https://yts.mx/api/v2', 'yts'));

// Serve static frontend files from the "dist" directory
app.use(express.static(path.join(__dirname, 'dist')));

// Fallback for React Router - ALWAYS return index.html for unknown routes
app.use((req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
