// routes/auth.js
const express = require('express');
const bcrypt = require('bcrypt');
const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;
const db = require('../models/User');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const csurf = require('csurf');
const csrfProtection = csurf({ cookie: true });

// Middleware to restrict superadmin-only routes
function requireSuperAdmin(req, res, next) {
  if (req.isAuthenticated() && req.user.superadmin) {
    return next();
  } else {
    res.status(403).send('Access denied');
  }
}

// Route to render login page or redirect if already authenticated
router.get('/login', csrfProtection, (req, res) => {
  if (req.isAuthenticated()) {
    if (req.user.superadmin) {
      return res.redirect('/admin/superadmin-dashboard');
    } else {
      return res.redirect('/admin/staff-dashboard');
    }
  }

  const products = [
    { name: 'Product 1', description: 'Description for Product 1' },
    { name: 'Product 2', description: 'Description for Product 2' },
    { name: 'Product 3', description: 'Description for Product 3' }
  ];
  res.render('home', { products, csrfToken: req.csrfToken() });
});

// Client Registration - Open to any user
router.post('/customer-register', csrfProtection, [
  body('first_name').isAlpha().trim().escape().withMessage('First name must contain only letters.'),
  body('last_name').isAlpha().trim().escape().withMessage('Last name must contain only letters.'),
  body('personal_email').isEmail().normalizeEmail().withMessage('Invalid email format.'),
  body('password').isLength({ min: 8 }).matches(/\d/).matches(/[A-Z]/).withMessage('Password must contain at least 8 characters, including one uppercase letter and one number.')
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    console.log("Validation errors during registration:", errors.array());
    return res.status(400).json({ errors: errors.array() });
  }

  const { first_name, last_name, personal_email, password } = req.body;
  try {
    db.get('SELECT * FROM users WHERE personal_email = ?', [personal_email], async (err, row) => {
      if (err) {
        console.error("Database error during email check:", err.message);
        return res.status(500).json({ error: 'Database error during email check' });
      }
      if (row) {
        console.warn("Email already registered:", personal_email);
        return res.status(400).json({ error: 'Email already registered' });
      }

      const hashedPassword = await bcrypt.hash(password, 10);
      db.run(
        `INSERT INTO users (first_name, last_name, personal_email, password, role, created_at) VALUES (?, ?, ?, ?, ?, datetime('now', 'localtime'))`,
        [first_name, last_name, personal_email, hashedPassword, 'client'],
        (err) => {
          if (err) {
            console.error("Error creating customer in database:", err.message);
            return res.status(500).json({ error: 'Error creating account in database' });
          }
          console.log("Customer account created successfully:", personal_email);
          res.status(200).json({ message: 'Registration successful' });
        }
      );
    });
  } catch (error) {
    console.error("Unexpected error during registration:", error.message);
    res.status(500).json({ error: 'Unexpected server error' });
  }
});

// Login Route with CSRF
router.post('/login', csrfProtection, (req, res, next) => {
  passport.authenticate('local', async (err, user, info) => {
    if (err) {
      console.error("Passport authentication error:", err);
      return res.status(500).json({ error: 'Internal Server Error' });
    }
    if (!user) {
      return res.status(401).json({ error: 'Login failed' });
    }

    req.logIn(user, (err) => {
      if (err) {
        console.error("Error during login:", err);
        return res.status(500).json({ error: 'Internal Server Error' });
      }

      // Set role_id for session consistency
      req.session.role_id = user.role_id;

      res.json({ role: user.role, superadmin: user.superadmin });
    });
  })(req, res, next);
});

// Local Strategy for Authentication
passport.use(new LocalStrategy({ usernameField: 'email', passwordField: 'password' }, (email, password, done) => {
  db.get('SELECT * FROM users WHERE (personal_email = ? OR work_email = ?)', [email, email], (err, user) => {
    if (err) return done(err);
    if (!user) return done(null, false, { message: 'User not found' });

    bcrypt.compare(password, user.password, (err, isMatch) => {
      if (err) return done(err);
      if (isMatch) return done(null, user);
      return done(null, false, { message: 'Incorrect password' });
    });
  });
}));

// Logout Route with CSRF
router.post('/logout', csrfProtection, (req, res) => {
  req.logout((err) => {
    if (err) return res.status(500).send("Logout error");
    res.redirect('/');
  });
});

passport.serializeUser((user, done) => done(null, user.id));

passport.deserializeUser((id, done) => {
  db.get('SELECT * FROM users WHERE id = ?', [id], (err, user) => {
    if (err) return done(err);
    
    // If the user does not exist (e.g., was deleted), clear the session
    if (!user) return done(null, false); // `false` clears the session automatically
    
    user.id = id; // Explicitly ensure `user.id` is always set if the user is found
    done(null, user);
  });
});


module.exports = router;
