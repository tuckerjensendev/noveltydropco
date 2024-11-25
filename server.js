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
const expressLayouts = require('express-ejs-layouts');
const { enforceRoleAccess, attachPermissions } = require('./middleware/authMiddleware');
const { setCache, getCache } = require('./cache');
const flash = require('connect-flash');
const contentRoutes = require('./routes/contentRoutes');
const db = require('./db');
const RedisStore = require('connect-redis')(session);
const redis = require('redis');
const socketIo = require('socket.io'); // Import Socket.IO

// Create Redis client
const redisClient = redis.createClient({
  legacyMode: true,
});

redisClient.connect().catch(console.error);

// Logs directory and CSP log file
const logsDir = path.join(__dirname, 'logs');
const cspLogFile = path.join(logsDir, 'csp-violations.log');

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

// Serve static files
app.use(express.static(isProduction ? 'dist' : 'public'));

// Additional static routes for development
if (!isProduction) {
  app.use('/scripts', express.static(path.join(__dirname, 'public', 'scripts')));
  app.use('/scripts/gridstack', express.static(path.join(__dirname, 'node_modules', 'gridstack', 'dist')));
  app.use('/styles', express.static(path.join(__dirname, 'public', 'styles')));
}

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use((req, res, next) => {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
  next();
});

// Set EJS as the view engine
app.set('view engine', 'ejs');
app.use(expressLayouts);
app.set('layout', 'layouts/main');

// Initialize connect-flash
app.use(flash());

// Configure Session to Use Redis Store
app.use(
  session({
    store: new RedisStore({ client: redisClient }),
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: isProduction,
      sameSite: 'strict',
    },
  })
);

app.use(passport.initialize());
app.use(passport.session());

// Session Timeout Middleware
const STAFF_ROLES = ['staff1', 'staff2', 'manager1', 'manager2', 'superadmin'];
const SESSION_TIMEOUT = 15 * 60 * 1000; // 15 minutes in milliseconds

app.use((req, res, next) => {
  if (req.session && STAFF_ROLES.includes(req.user?.role)) {
    const currentTime = Date.now();

    if (!req.session.lastActivity) {
      req.session.lastActivity = currentTime;
      console.log(`[Session Middleware] Initializing lastActivity for user ID: ${req.user.id}`);
    }

    const elapsedTime = currentTime - req.session.lastActivity;
    console.log(`[Session Middleware] User ID: ${req.user.id}, Elapsed Time: ${elapsedTime}ms`);

    if (elapsedTime > SESSION_TIMEOUT) {
      console.log(`[Session Middleware] Session timeout exceeded for user ID: ${req.user.id}. Destroying session.`);
      req.session.destroy((err) => {
        if (err) {
          console.error('Error destroying session:', err);
          return next(err);
        }
        return res.redirect('/'); // Redirect to home after session timeout
      });
    } else {
      req.session.lastActivity = currentTime;
      console.log(`[Session Middleware] Session active for user ID: ${req.user.id}. Updating lastActivity.`);
    }
  }
  next();
});


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
  res.locals.showStaffHeader = req.user && staffRoles.includes(req.user.role);
  res.locals.flashMessage = req.flash('flashMessage');
  res.locals.flashType = req.flash('flashType');

  res.locals.styleNonce = crypto.randomBytes(16).toString('base64');
  res.locals.scriptNonce = crypto.randomBytes(16).toString('base64');

  res.locals.headExtra = '';
  res.locals.bodyExtra = '';

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

    blocks = contentBlocks.map(block => ({
      block_id: block.block_id,
      type: block.type,
      content: block.content || '',
      style: block.style || '',
      page_id: block.page_id
    }));
  } catch (error) {
    console.error('Error fetching content blocks:', error);
  }

  res.render('home', { 
    products: cachedData || [], 
    blocks,
    title: 'Home Page - Novelty Drop Co.'
  });
});

// Admin Routes
app.get('/admin/superadmin-dashboard', enforceRoleAccess, (req, res) => {
  res.render('admin/superadmin-dashboard', { 
    title: 'Super Admin Dashboard'
  });
});

app.get('/admin/staff-dashboard', enforceRoleAccess, (req, res) => {
  res.render('admin/staff-dashboard', { 
    title: 'Staff Dashboard'
  });
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

    const sanitizedBlocks = blocks.map(block => ({
      block_id: block.block_id,
      type: block.type,
      content: block.content || '',
      style: block.style || '',
      page_id: block.page_id
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

  const validBlockTypes = ['text-block', 'image-block', 'block-spacer'];
  if (!type || !validBlockTypes.includes(type)) {
    return res.status(400).json({ error: 'Invalid or missing block type.' });
  }

  const blockId = crypto.randomUUID();
  const defaultContent = content || '';
  const pageId = 'home';

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
      content: defaultContent,
      style: '',
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
  res.status(404).render('404', { 
    title: '404 - Page Not Found'
  });
});

// Global error handler
app.use((err, req, res, next) => {
  if (err.status === 400) {
    req.flash('flashMessage', err.message);
    req.flash('flashType', 'error');
    return res.redirect('back');
  }
  console.error("[DEBUG] Unhandled error:", err);
  res.status(500).render('500', { 
    title: '500 - Server Error',
    error: isProduction ? null : err, 
    isProduction: isProduction 
  });
});

// Initialize Socket.IO
const server = https.createServer(httpsOptions, app);
const io = socketIo(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

// Handle Socket.IO connections
io.on('connection', (socket) => {
  console.log(`Client connected: ${socket.id}`);

  socket.on('disconnect', (reason) => {
    console.log(`Client disconnected: ${socket.id} | Reason: ${reason}`);
  });
});

// Graceful Shutdown Handler
const gracefulShutdown = () => {
  console.log('Initiating graceful shutdown...');

  // Notify all connected clients about the shutdown
  io.emit('serverShutdown', {
    message: 'Server is shutting down. You will be logged out.',
  });

  // Close Socket.IO connections
  io.close(() => {
    console.log('Socket.IO connections closed.');
  });

  // Close the HTTPS server
  server.close(() => {
    console.log('HTTPS server closed.');
    process.exit(0);
  });

  // Force shutdown after 10 seconds
  setTimeout(() => {
    console.error('Forced shutdown.');
    process.exit(1);
  }, 10000);
};

// Listen for termination signals
process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);

// Start the server
server.listen(PORT, '0.0.0.0', () => {
  console.log(`HTTPS server running on https://0.0.0.0:${PORT}`);
});
