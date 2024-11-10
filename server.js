// server.js
require('dotenv').config();
const fs = require('fs');
const https = require('https');
const express = require('express');
const app = express();
const passport = require('passport');
const session = require('express-session');
const db = require('./models/User');
const helmet = require('helmet');
const csurf = require('csurf');
const cookieParser = require('cookie-parser');
const { enforceRoleAccess, attachPermissions } = require('./middleware/authMiddleware');
const { setCache, getCache } = require('./cache'); // Import caching functions

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

// Conditional static folder setup based on environment
app.use(express.static(isProduction ? 'dist' : 'public'));

// Serve additional /public/scripts/main.js and /public/styles.css in development mode only
if (!isProduction) {
  app.use('/scripts', express.static('public/scripts'));
  app.use('/styles', express.static('public'));
}

// Middleware setup
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.set('view engine', 'ejs');

// Helmet for setting security headers, including CSP
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

// Session configuration with secure cookies for HTTPS
app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    secure: isProduction, // Only secure in production
    sameSite: 'strict'
  }
}));

// Initialize Passport
app.use(passport.initialize());
app.use(passport.session());

// CSRF protection middleware
app.use(csurf({ cookie: true }));

// Attach permissions to user object
app.use(attachPermissions);

// Redirect HTTP requests to HTTPS
app.use((req, res, next) => {
  if (req.protocol === 'http') {
    return res.redirect(`https://${req.headers.host}${req.url}`);
  }
  next();
});

// Make `user` and `csrfToken` available globally in views
app.use((req, res, next) => {
  res.locals.user = req.user;
  res.locals.csrfToken = req.csrfToken();
  res.locals.isProduction = isProduction; // Make production flag available to views
  next();
});

// Main Route - Homepage with caching
app.get('/', async (req, res) => {
  const cacheKey = 'homepage-products';
  const cachedData = await getCache(cacheKey);

  if (cachedData) {
    return res.render('home', { products: cachedData });
  }

  // Otherwise, fetch fresh data, cache it, and return
  const products = [
    { name: 'Product 1', description: 'Description for Product 1' },
    { name: 'Product 2', description: 'Description for Product 2' },
    { name: 'Product 3', description: 'Description for Product 3' }
  ];

  await setCache(cacheKey, products);
  res.render('home', { products });
});

// Routes for Staff and Superadmin Dashboards, restricted with enforceRoleAccess
app.get('/admin/superadmin-dashboard', enforceRoleAccess, (req, res) => {
  res.render('admin/superadmin-dashboard');
});

app.get('/admin/staff-dashboard', enforceRoleAccess, (req, res) => {
  res.render('admin/staff-dashboard');
});

// Logout route to terminate the session and redirect to home page
app.post('/logout', (req, res) => {
  req.logout((err) => {
    if (err) {
      console.error('Error during logout:', err);
      return res.status(500).json({ error: 'Error logging out. Please try again later.' });
    }
    req.session.destroy((err) => {
      if (err) {
        console.error('Session destruction error:', err);
        return res.status(500).json({ error: 'Error ending session.' });
      }
      res.clearCookie('connect.sid');
      res.redirect('/');
    });
  });
});

// Import and use routes
const authRoutes = require('./routes/auth');
app.use(authRoutes);

const adminRoutes = require('./routes/admin');
app.use('/admin', adminRoutes);

// Catch-all route for undefined paths
app.use((req, res) => {
  res.status(404).render('404');
});

// Start HTTPS server
https.createServer(httpsOptions, app).listen(PORT, '0.0.0.0', () => {
  console.log(`HTTPS server running on https://0.0.0.0:${PORT}`);
});
