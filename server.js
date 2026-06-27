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

// Configure proxies (matching vite.config.js behavior for production)
app.use('/api/apibay', createProxyMiddleware({
  target: 'https://apibay.org',
  changeOrigin: true,
  pathRewrite: {
    '^/api/apibay': '',
  },
}));

app.use('/api/torbox', createProxyMiddleware({
  target: 'https://api.torbox.app/v1/api/torrents',
  changeOrigin: true,
  pathRewrite: {
    '^/api/torbox': '',
  },
}));

app.use('/api/tmdb', createProxyMiddleware({
  target: 'https://api.themoviedb.org',
  changeOrigin: true,
  pathRewrite: {
    '^/api/tmdb': '/3',
  },
}));

app.use('/api/yts', createProxyMiddleware({
  target: 'https://yts.mx/api/v2',
  changeOrigin: true,
  pathRewrite: {
    '^/api/yts': '',
  },
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
