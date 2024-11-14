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

// Client Registration Route
router.post('/customer-register', csrfProtection, [
  body('confirm_password').custom((value, { req }) => {
    if (value !== req.body.password) {
      throw new Error('Passwords do not match');
    }
    return true;
  }),
  body('first_name').isAlpha().withMessage('First name must contain only letters').trim().escape(),
  body('last_name').isAlpha().withMessage('Last name must contain only letters').trim().escape(),
  body('personal_email').isEmail().withMessage('Invalid email format').normalizeEmail(),
  body('password')
    .isLength({ min: 6 }).withMessage('Password must contain at least 6 characters')
    .matches(/\d/).withMessage('Password must contain at least one number')
    .matches(/[A-Z]/).withMessage('Password must contain at least one uppercase letter')
], async (req, res) => {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    return res.status(400).render('home', {
      flashMessage: errors.array().map(error => error.msg).join(', '),
      flashType: 'error',
      csrfToken: req.csrfToken()
    });
  }

  const { first_name, last_name, personal_email, password } = req.body;
  try {
    db.get('SELECT * FROM users WHERE personal_email = ?', [personal_email], async (err, row) => {
      if (err) {
        return res.status(500).render('home', {
          flashMessage: 'Database error during email check',
          flashType: 'error',
          csrfToken: req.csrfToken()
        });
      }
      if (row) {
        return res.status(400).render('home', {
          flashMessage: 'Email already registered',
          flashType: 'error',
          csrfToken: req.csrfToken()
        });
      }

      const hashedPassword = await bcrypt.hash(password, 10);
      db.run(
        `INSERT INTO users (first_name, last_name, personal_email, password, role, created_at) VALUES (?, ?, ?, ?, ?, datetime('now', 'localtime'))`,
        [first_name, last_name, personal_email, hashedPassword, 'client'],
        (err) => {
          if (err) {
            return res.status(500).render('home', {
              flashMessage: 'Error creating account in database',
              flashType: 'error',
              csrfToken: req.csrfToken()
            });
          }
          res.status(200).render('home', {
            flashMessage: 'Registration successful',
            flashType: 'success',
            csrfToken: req.csrfToken()
          });
        }
      );
    });
  } catch (error) {
    res.status(500).render('home', {
      flashMessage: 'Unexpected server error',
      flashType: 'error',
      csrfToken: req.csrfToken()
    });
  }
});

// Login Route
router.post('/login', csrfProtection, (req, res, next) => {
  passport.authenticate('local', async (err, user, info) => {
    if (err) {
      return res.status(500).render('home', {
        flashMessage: 'Internal Server Error',
        flashType: 'error',
        csrfToken: req.csrfToken()
      });
    }
    if (!user) {
      return res.status(401).render('home', {
        flashMessage: info.message || 'Login failed. Please check your email and password.',
        flashType: 'error',
        csrfToken: req.csrfToken()
      });
    }

    req.logIn(user, (err) => {
      if (err) {
        return res.status(500).render('home', {
          flashMessage: 'Internal Server Error',
          flashType: 'error',
          csrfToken: req.csrfToken()
        });
      }
      const redirectUrl = user.role === 'client' ? '/' :
                          user.role === 'superadmin' ? '/admin/superadmin-dashboard' :
                          '/admin/staff-dashboard';
      return res.redirect(redirectUrl);
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

    req.session.destroy((sessionErr) => {
      if (sessionErr) {
        console.error("Session destruction error:", sessionErr);
        return res.status(500).send("Session destruction error");
      }
      res.redirect('/');
    });
  });
});


passport.serializeUser((user, done) => done(null, user.id));

passport.deserializeUser((id, done) => {
  db.get('SELECT * FROM users WHERE id = ?', [id], (err, user) => {
    if (err) return done(err);
    if (!user) return done(null, false);
    user.id = id;
    done(null, user);
  });
});

module.exports = router;
