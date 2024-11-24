// server.js

require('dotenv').config();
const crypto = require('crypto');
const fs = require('fs');
const https = require('https');
const express = require('express');
const app = express();
const passport = require('passport');
const session = require('express-session');
const helmet = require('helmet');
const csurf = require('csurf');
const cookieParser = require('cookie-parser');
const path = require('path');
const { enforceRoleAccess, attachPermissions } = require('./middleware/authMiddleware');
const { setCache, getCache } = require('./cache');
const flash = require('connect-flash');
const contentRoutes = require('./routes/contentRoutes');
const db = require('./db'); // Ensure this points to your db.js

// Import connect-redis version 6.1.3 correctly
const RedisStore = require('connect-redis')(session);
const redis = require('redis');

// Create Redis client
const redisClient = redis.createClient({
  legacyMode: true, // Required for compatibility with connect-redis v6
});

// Connect to Redis
redisClient.connect().catch(console.error);

// Logs directory and CSP log file
const logsDir = path.join(__dirname, 'logs');
const cspLogFile = path.join(logsDir, 'csp-violations.log');

// Ensure logs directory exists
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir);
}

// Middleware to block all prefetch requests globally
app.use((req, res, next) => {
  const isPrefetchRequest =
    req.headers['purpose'] === 'prefetch' ||
    req.headers['x-moz'] === 'prefetch' ||
    req.headers['sec-fetch-mode'] === 'prefetch';
  if (isPrefetchRequest) {
    return res.status(403).send('Prefetch requests are disabled on this server.');
  }
  next();
});

// Load HTTPS certificate and key
const httpsOptions = {
  key: fs.readFileSync('server.key'),
  cert: fs.readFileSync('server.crt'),
};

const PORT = process.env.PORT || 3000;
const isProduction = process.env.NODE_ENV === 'production';

// Serve static files from 'public' (development) or 'dist' (production)
app.use(express.static(isProduction ? 'dist' : 'public'));

// Additional static routes for development
if (!isProduction) {
  // Serve custom scripts
  app.use('/scripts', express.static(path.join(__dirname, 'public', 'scripts')));

  // Serve third-party scripts like Gridstack
  app.use('/scripts/gridstack', express.static(path.join(__dirname, 'node_modules', 'gridstack', 'dist')));

  // Serve styles
  app.use('/styles', express.static(path.join(__dirname, 'public', 'styles')));
}

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use((req, res, next) => {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
  next();
});

app.set('view engine', 'ejs');

// Middleware to generate nonces for CSP
app.use((req, res, next) => {
  res.locals.styleNonce = crypto.randomBytes(16).toString('base64');
  res.locals.scriptNonce = crypto.randomBytes(16).toString('base64');
  next();
});

// Update Helmet to use nonce-based CSP and report violations
app.use(
  helmet({
    contentSecurityPolicy: {
      useDefaults: true,
      directives: {
        "default-src": ["'self'"],
        "script-src": ["'self'", (req, res) => `'nonce-${res.locals.scriptNonce}'`],
        "style-src": ["'self'", (req, res) => `'nonce-${res.locals.styleNonce}'`],
        "connect-src": ["'self'"],
        "report-uri": "/csp-violation" // Adds the violation reporting endpoint
      }
    }
  })
);

// Endpoint to handle CSP violations and log them
app.post('/csp-violation', express.json({ type: ['application/json', 'application/csp-report'] }), (req, res) => {
  const violationReport = req.body?.["csp-report"]; // Extract CSP report if available

  const violationDetails = {
    timestamp: new Date().toISOString(),
    ...(violationReport || req.body) // Log the full report or body for debugging
  };

  // Log violation details
  fs.appendFile(cspLogFile, JSON.stringify(violationDetails, null, 2) + '\n', (err) => {
    if (err) console.error('Failed to write CSP violation to log:', err);
  });

  console.error('CSP Violation Logged:', violationDetails);

  res.status(204).end(); // Respond with No Content
});

// Configure Session to Use Redis Store
app.use(
  session({
    store: new RedisStore({ client: redisClient }), // Use RedisStore
    secret: process.env.SESSION_SECRET, // Ensure you have SESSION_SECRET in your .env file
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: isProduction, // true if in production
      sameSite: 'strict',
    },
  })
);

app.use(passport.initialize());
app.use(passport.session());

const csrfProtection = csurf({ cookie: true });
app.use((req, res, next) => {
  if (req.path.startsWith('/api/')) {
    return next();
  }
  csrfProtection(req, res, next);
});

app.use(attachPermissions);

// Redirect HTTP to HTTPS
app.use((req, res, next) => {
  if (req.protocol === 'http') {
    return res.redirect(`https://${req.headers.host}${req.url}`);
  }
  next();
});

// Define Staff Roles
const staffRoles = ['staff1', 'staff2', 'manager1', 'manager2', 'superadmin'];

// Middleware to set local variables for views
app.use((req, res, next) => {
  res.locals.user = req.user;
  res.locals.csrfToken = req.csrfToken ? req.csrfToken() : null;
  res.locals.isProduction = isProduction;
  // Update showStaffHeader to check if user role is in staffRoles
  res.locals.showStaffHeader = req.user && staffRoles.includes(req.user.role);
  next();
});

// Main Route - Homepage with dynamic content blocks
app.get('/', async (req, res) => {
  const cacheKey = 'homepage-products';
  const cachedData = await getCache(cacheKey);

  let blocks = [];
  try {
    const contentBlocks = await new Promise((resolve, reject) => {
      db.all('SELECT * FROM content_blocks WHERE page_id = ? ORDER BY order_index ASC', ['home'], (err, rows) => {
        if (err) return reject(err);
        resolve(rows);
      });
    });

    // Remove position-related properties since CSS handles layout
    blocks = contentBlocks.map(block => ({
      block_id: block.block_id,
      type: block.type,
      content: block.content || '',
      style: block.style || '',
      page_id: block.page_id
      // Removed: x, y, width, height
    }));
  } catch (error) {
    console.error('Error fetching content blocks:', error);
  }

  res.render('home', { products: cachedData || [], blocks });
});

// Admin Routes
app.get('/admin/superadmin-dashboard', enforceRoleAccess, (req, res) => {
  res.render('admin/superadmin-dashboard');
});

app.get('/admin/staff-dashboard', enforceRoleAccess, (req, res) => {
  res.render('admin/staff-dashboard');
});

const authRoutes = require('./routes/auth');
app.use(authRoutes);

const adminRoutes = require('./routes/admin');
app.use('/admin', adminRoutes);

app.use(contentRoutes);

// **New /api/blocks Routes**

// GET /api/blocks?type=blockType - Fetch blocks by type
app.get('/api/blocks', async (req, res) => {
  const { type } = req.query;
  if (!type) {
    return res.status(400).json({ error: 'Block type is required.' });
  }

  try {
    const blocks = await new Promise((resolve, reject) => {
      db.all('SELECT * FROM content_blocks WHERE type = ? ORDER BY order_index ASC', [type], (err, rows) => {
        if (err) return reject(err);
        resolve(rows);
      });
    });

    // Remove position-related properties
    const sanitizedBlocks = blocks.map(block => ({
      block_id: block.block_id,
      type: block.type,
      content: block.content || '',
      style: block.style || '',
      page_id: block.page_id
      // Removed: x, y, width, height
    }));

    res.status(200).json(sanitizedBlocks);
  } catch (error) {
    console.error("[DEBUG] Error fetching blocks:", error);
    res.status(500).json({ error: 'Failed to fetch blocks.' });
  }
});

// POST /api/blocks - Add a new block
app.post('/api/blocks', async (req, res) => {
  const { type, content } = req.body;

  // Validate the block type
  const validBlockTypes = ['text-block', 'image-block', 'block-spacer']; // Add other valid types if necessary
  if (!type || !validBlockTypes.includes(type)) {
    return res.status(400).json({ error: 'Invalid or missing block type.' });
  }

  // Generate a unique block ID
  const blockId = crypto.randomUUID();

  // Use the provided content or default to an empty string
  const defaultContent = content || ''; // Default to empty content if not provided
  const pageId = 'home'; // Assign a default page ID or determine dynamically if needed

  // Insert the new block into the database
  try {
    await new Promise((resolve, reject) => {
      const stmt = db.prepare(`INSERT INTO content_blocks 
          (block_id, type, content, page_id) 
          VALUES (?, ?, ?, ?)`);
      stmt.run([blockId, type, defaultContent, pageId], function (err) {
        if (err) return reject(err);
        resolve();
      });
      stmt.finalize();
    });

    const newBlock = {
      block_id: blockId,
      type,
      content: defaultContent, // Send back the default content if no content was provided
      style: '', // Initialize with empty style or allow customization later
      page_id: pageId
    };

    res.status(201).json({ message: 'Block added successfully.', block: newBlock });
  } catch (error) {
    console.error('[DEBUG] Error adding new block:', error);
    res.status(500).json({ error: 'Failed to add block.' });
  }
});

// **Handle 404 for API Routes**
app.use('/api/*', (req, res) => {
  res.status(404).json({ error: 'API route not found.' });
});

// Handle all other 404 routes
app.use((req, res) => {
  res.status(404).render('404');
});

// Global error handler
app.use((err, req, res, next) => {
  if (err.status === 400) {
    return res.status(400).render('admin/create-staff', {
      user: req.user,
      csrfToken: req.csrfToken(),
      flashMessage: err.message,
      flashType: 'error'
    });
  }
  // For other types of errors, render the 500 error page
  console.error("[DEBUG] Unhandled error:", err);
  res.status(500).render('500', { 
    error: isProduction ? null : err, 
    isProduction: isProduction 
  });
});


// Start the HTTPS server
https.createServer(httpsOptions, app).listen(PORT, '0.0.0.0', () => {
  console.log(`HTTPS server running on https://0.0.0.0:${PORT}`);
});
