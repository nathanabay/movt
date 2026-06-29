import express from 'express';
import { createProxyMiddleware } from 'http-proxy-middleware';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables if present, enforcing absolute path for cPanel/Passenger
dotenv.config({ path: path.join(__dirname, '.env') });

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
app.post('/api/auth/register', async (req, res) => {
  try {
    const user = await createUser(req.body.username, req.body.password);
    const token = jwt.sign({ id: user.id, username: user.username }, JWT_SECRET, { expiresIn: '30d' });
    res.json({ token, user });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const user = await verifyUser(req.body.username, req.body.password);
    const token = jwt.sign({ id: user.id, username: user.username }, JWT_SECRET, { expiresIn: '30d' });
    res.json({ token, user });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.get('/api/auth/me', authenticate, (req, res) => {
  res.json({ user: req.user });
});

app.get('/api/watchlist', authenticate, async (req, res) => {
  res.json(await getWatchlist(req.user.id));
});

app.post('/api/watchlist', authenticate, async (req, res) => {
  res.json(await addToWatchlist(req.user.id, req.body.item));
});

app.delete('/api/watchlist/:mediaType/:itemId', authenticate, async (req, res) => {
  res.json(await removeFromWatchlist(req.user.id, req.params.itemId, req.params.mediaType));
});

app.get('/api/history', authenticate, async (req, res) => {
  res.json(await getHistory(req.user.id));
});

app.post('/api/history', authenticate, async (req, res) => {
  res.json(await updateHistory(req.user.id, req.body.item, req.body.progress, req.body.duration, req.body.season, req.body.episode));
});

app.delete('/api/history/:mediaType/:itemId', authenticate, async (req, res) => {
  res.json(await removeFromHistory(req.user.id, req.params.itemId, req.params.mediaType));
});

// Configure robust native proxies using http-proxy-middleware
const onProxyReq = (proxyReq, req, res, apiType) => {
  if (apiType === 'tmdb' && process.env.VITE_TMDB_API_KEY) {
    const url = new URL(proxyReq.path, 'http://localhost');
    url.searchParams.set('api_key', process.env.VITE_TMDB_API_KEY);
    proxyReq.path = url.pathname + url.search;
  }
  if (apiType === 'torbox' && process.env.VITE_TORBOX_API_KEY) {
    proxyReq.setHeader('Authorization', `Bearer ${process.env.VITE_TORBOX_API_KEY}`);
  }
};

app.use('/api/apibay', createProxyMiddleware({
  target: 'https://apibay.org',
  changeOrigin: true,
  pathRewrite: { '^/api/apibay': '' }
}));

app.use('/api/torbox', createProxyMiddleware({
  target: 'https://api.torbox.app/v1/api/torrents',
  changeOrigin: true,
  pathRewrite: { '^/api/torbox': '' },
  on: {
    proxyReq: (proxyReq, req, res) => onProxyReq(proxyReq, req, res, 'torbox')
  }
}));

app.use('/api/tmdb', createProxyMiddleware({
  target: 'https://api.themoviedb.org/3',
  changeOrigin: true,
  pathRewrite: { '^/api/tmdb': '' },
  on: {
    proxyReq: (proxyReq, req, res) => onProxyReq(proxyReq, req, res, 'tmdb')
  }
}));

app.use('/api/yts', createProxyMiddleware({
  target: 'https://yts.mx/api/v2',
  changeOrigin: true,
  pathRewrite: { '^/api/yts': '' }
}));

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
