import express from 'express';
import { createProxyMiddleware } from 'http-proxy-middleware';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables if present, enforcing absolute path for cPanel/Passenger
dotenv.config({ path: path.join(__dirname, '.env') });

const app = express();
const PORT = process.env.PORT || 3000;

const allowedOrigins = ['https://mov.bespo.et', 'http://localhost:5173', 'http://localhost:3000'];
app.use(cors({
  origin: function (origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true
}));
app.use(express.json());

// --- Rate Limiting ---
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 200, // Limit each IP to 200 requests per windowMs
  message: { error: 'Too many requests from this IP, please try again after 15 minutes' }
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // Limit each IP to 10 login/register requests per windowMs
  message: { error: 'Too many authentication attempts, please try again later' }
});

// Apply general limiter to all /api routes
app.use('/api/', apiLimiter);


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
app.post('/api/auth/register', authLimiter, async (req, res) => {
  try {
    const user = await createUser(req.body.username, req.body.password);
    const token = jwt.sign({ id: user.id, username: user.username }, JWT_SECRET, { expiresIn: '30d' });
    res.json({ token, user });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.post('/api/auth/login', authLimiter, async (req, res) => {
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

app.get('/api/test-env', (req, res) => {
  res.json({ 
    hasTorbox: !!process.env.VITE_TORBOX_API_KEY,
    keyLength: process.env.VITE_TORBOX_API_KEY ? process.env.VITE_TORBOX_API_KEY.length : 0,
    dirname: __dirname
  });
});

app.get('/api/watchlist', authenticate, async (req, res) => {
  try {
    res.json(await getWatchlist(req.user.id));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/watchlist', authenticate, async (req, res) => {
  try {
    res.json(await addToWatchlist(req.user.id, req.body.item));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/watchlist/:mediaType/:itemId', authenticate, async (req, res) => {
  try {
    res.json(await removeFromWatchlist(req.user.id, req.params.itemId, req.params.mediaType));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/history', authenticate, async (req, res) => {
  try {
    res.json(await getHistory(req.user.id));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/history', authenticate, async (req, res) => {
  try {
    res.json(await updateHistory(req.user.id, req.body.item, req.body.progress, req.body.duration, req.body.season, req.body.episode));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/history/:mediaType/:itemId', authenticate, async (req, res) => {
  try {
    res.json(await removeFromHistory(req.user.id, req.params.itemId, req.params.mediaType));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
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
    
    // TorBox's 'requestdl' endpoint explicitly requires the token in the query string
    if (proxyReq.path.includes('/requestdl')) {
      const separator = proxyReq.path.includes('?') ? '&' : '?';
      proxyReq.path = proxyReq.path + separator + 'token=' + process.env.VITE_TORBOX_API_KEY;
    }
  }
};

const proxyOptions = {
  timeout: 10000,
  proxyTimeout: 10000,
  on: {
    error: (err, req, res) => {
      console.error('Proxy Error:', err.message);
      if (!res.headersSent) {
        res.status(502).json({ error: 'Bad Gateway: Upstream server timed out or failed.' });
      }
    }
  }
};

app.use('/api/apibay', createProxyMiddleware({
  target: 'https://apibay.org',
  changeOrigin: true,
  pathRewrite: { '^/api/apibay': '' },
  ...proxyOptions
}));

app.use('/api/torbox', createProxyMiddleware({
  target: 'https://api.torbox.app/v1/api/torrents',
  changeOrigin: true,
  pathRewrite: { '^/api/torbox': '' },
  timeout: 10000,
  proxyTimeout: 10000,
  on: {
    proxyReq: (proxyReq, req, res) => onProxyReq(proxyReq, req, res, 'torbox'),
    error: proxyOptions.on.error
  }
}));

app.use('/api/tmdb', createProxyMiddleware({
  target: 'https://api.themoviedb.org/3',
  changeOrigin: true,
  pathRewrite: { '^/api/tmdb': '' },
  timeout: 10000,
  proxyTimeout: 10000,
  on: {
    proxyReq: (proxyReq, req, res) => onProxyReq(proxyReq, req, res, 'tmdb'),
    error: proxyOptions.on.error
  }
}));

app.use('/api/yts', createProxyMiddleware({
  target: 'https://yts.mx/api/v2',
  changeOrigin: true,
  pathRewrite: { '^/api/yts': '' },
  ...proxyOptions
}));

// Serve static frontend files from the "dist" directory
app.use(express.static(path.join(__dirname, 'dist')));

// Fallback for React Router - ALWAYS return index.html for unknown routes
app.use((req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});


// --- Global Error Handling ---
app.use((err, req, res, next) => {
  console.error('Unhandled Express Error:', err.stack || err.message);
  res.status(500).json({ error: 'Internal Server Error' });
});

process.on('uncaughtException', (err) => {
  console.error('UNCAUGHT EXCEPTION! Shutting down...', err.stack || err.message);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('UNHANDLED REJECTION! Shutting down...', reason);
  process.exit(1);
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
