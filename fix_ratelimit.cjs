const fs = require('fs');

let content = fs.readFileSync('server.js', 'utf8');

if (!content.includes('express-rate-limit')) {
  // Add import
  content = content.replace("import cors from 'cors';", "import cors from 'cors';\nimport rateLimit from 'express-rate-limit';");
  
  // Add rate limiters after app.use(express.json());
  const rateLimitSetup = `
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
`;
  
  content = content.replace("app.use(express.json());", "app.use(express.json());\n" + rateLimitSetup);
  
  // Apply auth limiter
  content = content.replace("app.post('/api/auth/register',", "app.post('/api/auth/register', authLimiter,");
  content = content.replace("app.post('/api/auth/login',", "app.post('/api/auth/login', authLimiter,");
  
  fs.writeFileSync('server.js', content);
  console.log("Rate limiting implemented.");
} else {
  console.log("Rate limiting already implemented.");
}
