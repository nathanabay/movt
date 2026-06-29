const fs = require('fs');

// --- Fix 3: Robust DB Initialization (db.js) ---
let dbContent = fs.readFileSync('db.js', 'utf8');

const originalInitDB = `const initDB = async () => {
  let connection;
  try {
    connection = await pool.getConnection();
    
    await connection.execute(\`
      CREATE TABLE IF NOT EXISTS users (`;

const newInitDB = `const initDB = async (retries = 5, delay = 5000) => {
  let connection;
  while (retries > 0) {
    try {
      connection = await pool.getConnection();
      
      await connection.execute(\`
        CREATE TABLE IF NOT EXISTS users (`;

dbContent = dbContent.replace(originalInitDB, newInitDB);

const originalInitDbEnd = `    console.log('MySQL Database initialized successfully');
  } catch (err) {
    console.error('Database Initialization failed:', err.message);
  } finally {
    if (connection) connection.release();
  }
};`;

const newInitDbEnd = `    console.log('MySQL Database initialized successfully');
      return; // Exit loop on success
    } catch (err) {
      console.error(\`Database Initialization failed: \${err.message}. Retries left: \${retries - 1}\`);
      retries -= 1;
      if (retries === 0) {
        console.error('Fatal: Could not connect to database after maximum retries. Exiting process.');
        process.exit(1);
      }
      await new Promise(resolve => setTimeout(resolve, delay));
    } finally {
      if (connection) connection.release();
    }
  }
};`;

dbContent = dbContent.replace(originalInitDbEnd, newInitDbEnd);
fs.writeFileSync('db.js', dbContent);


// --- Fix 4: Global Error Handling (server.js) ---
let serverContent = fs.readFileSync('server.js', 'utf8');

const globalErrorBlock = `
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

// Start the server`;

serverContent = serverContent.replace('// Start the server', globalErrorBlock);
fs.writeFileSync('server.js', serverContent);

console.log("Both resiliency fixes applied.");
