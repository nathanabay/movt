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
