// server.js

require('dotenv').config();
const fs = require('fs');
const https = require('https');
const express = require('express');
const app = express();
const passport = require('passport');
const session = require('express-session');
const helmet = require('helmet');
const csurf = require('csurf');
const cookieParser = require('cookie-parser');
const { enforceRoleAccess, attachPermissions } = require('./middleware/authMiddleware');
const { setCache, getCache } = require('./cache');
const flash = require('connect-flash');
const contentRoutes = require('./routes/contentRoutes');
const db = require('./db'); // Assuming db.js handles database connections

// Middleware to block all prefetch requests globally
app.use((req, res, next) => {
  const isPrefetchRequest = req.headers['purpose'] === 'prefetch' || req.headers['x-moz'] === 'prefetch' || req.headers['sec-fetch-mode'] === 'prefetch';
  if (isPrefetchRequest) {
    return res.status(403).send('Prefetch requests are disabled on this server.');
  }
  next();
});

// Load HTTPS certificate and key
const httpsOptions = {
  key: fs.readFileSync('server.key'),
  cert: fs.readFileSync('server.crt')
};

const PORT = process.env.PORT || 3000;
const isProduction = process.env.NODE_ENV === 'production';

app.use(express.static(isProduction ? 'dist' : 'public'));

if (!isProduction) {
  app.use('/scripts', express.static('public/scripts'));
  app.use('/scripts', express.static('node_modules/gridstack/dist'));
  app.use('/styles', express.static('public'));
}

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use((req, res, next) => {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
  next();
});

app.set('view engine', 'ejs');

app.use(
  helmet({
    contentSecurityPolicy: {
      useDefaults: true,
      directives: {
        "script-src": ["'self'"],
        "style-src": ["'self'", "'unsafe-inline'"],
        "connect-src": ["'self'"]
      },
    },
  })
);

app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    secure: isProduction,
    sameSite: 'strict'
  }
}));

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

app.use((req, res, next) => {
  if (req.protocol === 'http') {
    return res.redirect(`https://${req.headers.host}${req.url}`);
  }
  next();
});

app.use((req, res, next) => {
  res.locals.user = req.user;
  res.locals.csrfToken = req.csrfToken ? req.csrfToken() : null;
  res.locals.isProduction = isProduction;
  res.locals.showStaffHeader = req.user && req.user.role === 'staff';
  next();
});

// Main Route - Homepage with dynamic content blocks
app.get('/', async (req, res) => {
  const cacheKey = 'homepage-products';
  const cachedData = await getCache(cacheKey);

  // Fetch content blocks from the database
  let blocks = [];
  try {
    const contentBlocks = await new Promise((resolve, reject) => {
      db.all('SELECT * FROM content_blocks WHERE page_id = ?', ['home'], (err, rows) => {
        if (err) return reject(err);
        resolve(rows);
      });
    });

    // Map content blocks to CSS classes for styling
    blocks = contentBlocks.map(block => ({
      ...block,
      style: block.style || '',
      x: block.position_x || block.col,
      y: block.position_y || block.row,
      width: block.width || 'auto',
      height: block.height || 'auto'
  }));  
  } catch (error) {
    console.error('Error fetching content blocks:', error);
  }

  // Render the homepage with products from cache and dynamic content blocks
  res.render('home', { products: cachedData || [], blocks });
});


// Routes for Staff and Superadmin Dashboards, restricted with enforceRoleAccess
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

// Catch-all route for undefined paths
app.use((req, res) => {
  res.status(404).render('404');
});

// Catch-all route for 400 errors
app.use((err, req, res, next) => {
  if (err.status === 400) {
    // Render the page with error details without redirecting
    return res.status(400).render('admin/create-staff', {
      user: req.user,
      csrfToken: req.csrfToken(),
      flashMessage: err.message,
      flashType: 'error'
    });
  }
  
  next(err);
});

// Start HTTPS server
https.createServer(httpsOptions, app).listen(PORT, '0.0.0.0', () => {
  console.log(`HTTPS server running on https://0.0.0.0:${PORT}`);
});
