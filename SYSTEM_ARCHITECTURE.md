# MOVT - System Architecture & Configuration Guide

MOVT is a modern, high-performance web application designed to seamlessly bridge metadata discovery (TMDB) with instant torrent streaming (TorBox).

## 🏗️ Technology Stack

- **Frontend**: React 18, Vite
- **Data Fetching & Caching**: `@tanstack/react-query`
- **Routing**: `react-router-dom`
- **Video Player**: `video.js` (HTML5 Video)
- **UI & Styling**: Vanilla CSS, `lucide-react` (icons), `react-slick` (sliders)
- **Backend / Proxy**: Node.js with Express (`server.js`)

---

## ⚙️ How It's Configured

### Environment Variables
The system relies on API keys to communicate with external services. These are stored in a `.env` file at the root of the project:
- `VITE_TMDB_API_KEY`: Authenticates with The Movie Database to pull posters, plots, and episode data.
- `VITE_TORBOX_API_KEY`: Authenticates with TorBox to initiate downloads, check cloud storage, and stream cached torrents.

### The Backend Proxy (`server.js`)
Browsers strictly enforce CORS (Cross-Origin Resource Sharing) policies, which normally prevents a frontend app from directly scraping torrent sites. 
To bypass this, MOVT runs a lightweight Node.js Express proxy. All requests to external APIs (YTS, EZTV, APIBay) are routed through this local proxy.

---

## 🧠 How The System Works (The Data Flow)

### 1. Discovery & Browsing
When a user visits the homepage or searches for a title, the app communicates with the **TMDB API** via `src/services/tmdb.js`. 
To ensure maximum performance, the `Home.jsx` page uses **IntersectionObserver** to lazily load horizontal movie sliders. The API is only called when a specific genre or row is scrolled into the user's viewport.

### 2. Torrent Scraping
When a user clicks on a movie or TV show, they are routed to `MovieDetails.jsx`. In the background, `useTorboxSearch.js` fires parallel requests to the Node proxy, which scrapes:
- **YTS** (for high-quality, small-size movie encodes)
- **EZTV** (for TV shows)
- **APIBay / The Pirate Bay** (for global fallback)

### 3. The Smart Parser & Sorter
Because torrent uploaders use messy and inconsistent naming conventions, MOVT uses a custom **Regex Engine** (`qualityParser.js`) to extract metadata from the raw torrent names. 

The system then sorts these torrents (`StreamList.jsx`) based on a highly optimized **Web-Playability Scoring System**:
1. **Cache Status**: Torrents already cached on TorBox's servers are bumped to the top for instant streaming.
2. **Video Codec**: Heavily prioritizes `x264` and `x265` (HEVC) as they are universally supported by modern browsers and Apple devices. `AV1` and `XviD` are penalized due to poor native Safari support.
3. **Audio Codec**: Heavily prioritizes web-friendly audio like `AAC` and `AC3` (Dolby Digital). High-end home theater codecs like `TrueHD` or `DTS` are severely punished, as standard web browsers cannot decode them, resulting in silent video.
4. **Seeders**: Used as the ultimate tie-breaker.

### 4. Library Mapping Engine
To prevent duplicate downloads and seamlessly connect torrents to TMDB episodes, `mapper.js` runs a **Normalization Engine**.
It aggressively strips release group tags (e.g., `[YTS]`), domain names (e.g., `www.1tamilmv.cz`), and all punctuation from the torrent names. It then matches these sanitized names against the TMDB title in O(1) time complexity. If a match is found, the UI updates to show a green "Instant Play" button.

### 5. Instant Streaming
When a user clicks "Play", the Magnet link is sent to the TorBox API. 
TorBox returns a direct `.mp4` or `.mkv` stream URL. MOVT then mounts a custom `VideoPlayer.jsx` component (powered by `video.js`). The player is configured with `playsinline` attributes to ensure flawless full-screen and Picture-in-Picture (PiP) support across desktops, iPhones, and iPads.
