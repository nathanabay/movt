import Database from 'better-sqlite3';
import bcrypt from 'bcrypt';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// The database will be stored in a local file called 'movt.sqlite'
const dbPath = path.join(__dirname, 'movt.sqlite');
const db = new Database(dbPath);

// Enable WAL mode for better concurrency and performance
db.pragma('journal_mode = WAL');

// Initialize schema
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS watchlists (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    item_id TEXT NOT NULL,
    media_type TEXT NOT NULL,
    title TEXT NOT NULL,
    poster_path TEXT,
    added_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
    UNIQUE(user_id, item_id, media_type)
  );

  CREATE TABLE IF NOT EXISTS history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    item_id TEXT NOT NULL,
    media_type TEXT NOT NULL,
    title TEXT NOT NULL,
    poster_path TEXT,
    season_number INTEGER,
    episode_number INTEGER,
    progress REAL DEFAULT 0,
    duration REAL DEFAULT 0,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
    UNIQUE(user_id, item_id, media_type)
  );
`);

// --- User Operations ---
export const createUser = (username, password) => {
  const hash = bcrypt.hashSync(password, 10);
  try {
    const stmt = db.prepare('INSERT INTO users (username, password_hash) VALUES (?, ?)');
    const info = stmt.run(username, hash);
    return { id: info.lastInsertRowid, username };
  } catch (err) {
    if (err.code === 'SQLITE_CONSTRAINT_UNIQUE') {
      throw new Error('Username already exists');
    }
    throw err;
  }
};

export const verifyUser = (username, password) => {
  const stmt = db.prepare('SELECT * FROM users WHERE username = ?');
  const user = stmt.get(username);
  if (!user) throw new Error('Invalid username or password');
  
  const valid = bcrypt.compareSync(password, user.password_hash);
  if (!valid) throw new Error('Invalid username or password');
  
  return { id: user.id, username: user.username };
};

// --- Watchlist Operations ---
export const getWatchlist = (userId) => {
  return db.prepare('SELECT * FROM watchlists WHERE user_id = ? ORDER BY added_at DESC').all(userId);
};

export const addToWatchlist = (userId, item) => {
  const stmt = db.prepare(`
    INSERT OR IGNORE INTO watchlists (user_id, item_id, media_type, title, poster_path)
    VALUES (?, ?, ?, ?, ?)
  `);
  stmt.run(userId, item.id, item.media_type, item.title || item.name, item.poster_path);
  return getWatchlist(userId);
};

export const removeFromWatchlist = (userId, itemId, mediaType) => {
  const stmt = db.prepare('DELETE FROM watchlists WHERE user_id = ? AND item_id = ? AND media_type = ?');
  stmt.run(userId, itemId, mediaType);
  return getWatchlist(userId);
};

// --- History Operations ---
export const getHistory = (userId) => {
  return db.prepare('SELECT * FROM history WHERE user_id = ? ORDER BY updated_at DESC').all(userId);
};

export const updateHistory = (userId, item, progress, duration, season = null, episode = null) => {
  const stmt = db.prepare(`
    INSERT INTO history (user_id, item_id, media_type, title, poster_path, season_number, episode_number, progress, duration)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(user_id, item_id, media_type) DO UPDATE SET
      progress = excluded.progress,
      duration = excluded.duration,
      season_number = excluded.season_number,
      episode_number = excluded.episode_number,
      updated_at = CURRENT_TIMESTAMP
  `);
  stmt.run(userId, item.id, item.media_type, item.title || item.name, item.poster_path, season, episode, progress, duration);
  return getHistory(userId);
};

export const removeFromHistory = (userId, itemId, mediaType) => {
  const stmt = db.prepare('DELETE FROM history WHERE user_id = ? AND item_id = ? AND media_type = ?');
  stmt.run(userId, itemId, mediaType);
  return getHistory(userId);
};
