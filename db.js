import mysql from 'mysql2/promise';
import bcrypt from 'bcrypt';
import dotenv from 'dotenv';

dotenv.config();

// Default pool falls back to env vars
// For cPanel, the host is usually localhost or 127.0.0.1
const pool = mysql.createPool({
  host: process.env.DB_HOST || '127.0.0.1',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'movt',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

// Initialize Schema
const initDB = async (retries = 5, delay = 5000) => {
  let connection;
  while (retries > 0) {
    try {
      connection = await pool.getConnection();
      
      await connection.execute(`
        CREATE TABLE IF NOT EXISTS users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        username VARCHAR(255) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await connection.execute(`
      CREATE TABLE IF NOT EXISTS watchlists (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        item_id VARCHAR(255) NOT NULL,
        media_type VARCHAR(50) NOT NULL,
        title VARCHAR(255) NOT NULL,
        poster_path VARCHAR(255),
        added_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        UNIQUE KEY unique_watchlist_item (user_id, item_id, media_type)
      )
    `);

    await connection.execute(`
      CREATE TABLE IF NOT EXISTS history (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        item_id VARCHAR(255) NOT NULL,
        media_type VARCHAR(50) NOT NULL,
        title VARCHAR(255) NOT NULL,
        poster_path VARCHAR(255),
        season_number INT,
        episode_number INT,
        progress FLOAT DEFAULT 0,
        duration FLOAT DEFAULT 0,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        UNIQUE KEY unique_history_item (user_id, item_id, media_type)
      )
    `);
    
    console.log('MySQL Database initialized successfully');
      return; // Exit loop on success
    } catch (err) {
      console.error(`Database Initialization failed: ${err.message}. Retries left: ${retries - 1}`);
      retries -= 1;
      if (retries === 0) {
        console.error('Fatal: Could not connect to database after maximum retries. Continuing anyway, but queries will fail.');
      } else {
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    } finally {
      if (connection) connection.release();
    }
  }
};

// Call init on load
initDB();

// --- User Operations ---
export const createUser = async (username, password) => {
  const hash = await bcrypt.hash(password, 10);
  try {
    const [result] = await pool.execute(
      'INSERT INTO users (username, password_hash) VALUES (?, ?)',
      [username, hash]
    );
    return { id: result.insertId, username };
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') {
      throw new Error('Username already exists');
    }
    throw err;
  }
};

export const verifyUser = async (username, password) => {
  const [rows] = await pool.execute('SELECT * FROM users WHERE username = ?', [username]);
  const user = rows[0];
  if (!user) throw new Error('Invalid username or password');
  
  const valid = await bcrypt.compare(password, user.password_hash);
  if (!valid) throw new Error('Invalid username or password');
  
  return { id: user.id, username: user.username };
};

// --- Watchlist Operations ---
export const getWatchlist = async (userId) => {
  const [rows] = await pool.execute('SELECT * FROM watchlists WHERE user_id = ? ORDER BY added_at DESC', [userId]);
  return rows;
};

export const addToWatchlist = async (userId, item) => {
  await pool.execute(`
    INSERT IGNORE INTO watchlists (user_id, item_id, media_type, title, poster_path)
    VALUES (?, ?, ?, ?, ?)
  `, [userId, item.id, item.media_type, item.title || item.name, item.poster_path]);
  return getWatchlist(userId);
};

export const removeFromWatchlist = async (userId, itemId, mediaType) => {
  await pool.execute('DELETE FROM watchlists WHERE user_id = ? AND item_id = ? AND media_type = ?', [userId, itemId, mediaType]);
  return getWatchlist(userId);
};

// --- History Operations ---
export const getHistory = async (userId) => {
  const [rows] = await pool.execute('SELECT * FROM history WHERE user_id = ? ORDER BY updated_at DESC', [userId]);
  return rows;
};

export const updateHistory = async (userId, item, progress, duration, season = null, episode = null) => {
  await pool.execute(`
    INSERT INTO history (user_id, item_id, media_type, title, poster_path, season_number, episode_number, progress, duration)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON DUPLICATE KEY UPDATE
      progress = VALUES(progress),
      duration = VALUES(duration),
      season_number = VALUES(season_number),
      episode_number = VALUES(episode_number),
      updated_at = CURRENT_TIMESTAMP
  `, [userId, item.id, item.media_type, item.title || item.name, item.poster_path, season, episode, progress, duration]);
  return getHistory(userId);
};

export const removeFromHistory = async (userId, itemId, mediaType) => {
  await pool.execute('DELETE FROM history WHERE user_id = ? AND item_id = ? AND media_type = ?', [userId, itemId, mediaType]);
  return getHistory(userId);
};
