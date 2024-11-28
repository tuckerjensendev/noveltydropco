// routes/auth.js
const { getShutdownState } = require('../src/private/shutdownState');
const express = require('express');
const bcrypt = require('bcrypt');
const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;
const db = require('../models/User');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const csurf = require('csurf');
const csrfProtection = csurf({ cookie: true });
const rateLimit = require('express-rate-limit');

// Middleware to restrict superadmin-only routes
function requireSuperAdmin(req, res, next) {
  if (req.isAuthenticated() && req.user.superadmin) {
    return next();
  } else {
    res.status(403).send('Access denied');
  }
}

// Rate Limiter for Login Route
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // limit each IP to 10 login requests per windowMs
  message: 'Too many login attempts from this IP, please try again after 15 minutes.',
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
});

// Client Registration Route
router.post(
  '/customer-register',
  csrfProtection,
  [
    body('confirm_password').custom((value, { req }) => {
      if (value !== req.body.password) {
        throw new Error('Passwords do not match');
      }
      return true;
    }),
    body('first_name')
      .isAlpha()
      .withMessage('First name must contain only letters')
      .trim()
      .escape(),
    body('last_name')
      .isAlpha()
      .withMessage('Last name must contain only letters')
      .trim()
      .escape(),
    body('personal_email').isEmail().withMessage('Invalid email format').normalizeEmail(),
    body('password')
      .isLength({ min: 6 })
      .withMessage('Password must contain at least 6 characters')
      .matches(/\d/)
      .withMessage('Password must contain at least one number')
      .matches(/[A-Z]/)
      .withMessage('Password must contain at least one uppercase letter'),
  ],
  async (req, res) => {
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
      return res.status(400).render('home', {
        flashMessage: errors.array().map((error) => error.msg).join(', '),
        flashType: 'error',
        csrfToken: req.csrfToken(),
      });
    }

    const { first_name, last_name, personal_email, password } = req.body;
    try {
      db.get('SELECT * FROM users WHERE personal_email = ?', [personal_email], async (err, row) => {
        if (err) {
          return res.status(500).render('home', {
            flashMessage: 'Database error during email check',
            flashType: 'error',
            csrfToken: req.csrfToken(),
          });
        }
        if (row) {
          return res.status(400).render('home', {
            flashMessage: 'Email already registered',
            flashType: 'error',
            csrfToken: req.csrfToken(),
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
                csrfToken: req.csrfToken(),
              });
            }
            res.status(200).render('home', {
              flashMessage: 'Registration successful',
              flashType: 'success',
              csrfToken: req.csrfToken(),
            });
          }
        );
      });
    } catch (error) {
      res.status(500).render('home', {
        flashMessage: 'Unexpected server error',
        flashType: 'error',
        csrfToken: req.csrfToken(),
      });
    }
  }
);

// Login Route with Rate Limiting and Account Lockout
router.post('/login', loginLimiter, csrfProtection, async (req, res, next) => {
  passport.authenticate('local', async (err, user, info) => {
    if (err) {
      return res.status(500).render('home', {
        flashMessage: 'Internal Server Error',
        flashType: 'error',
        csrfToken: req.csrfToken(),
      });
    }

    if (!user) {
      // Authentication failed; respond with an error message
      return res.status(401).render('home', {
        flashMessage: info.message || 'Login failed. Please check your email and password.',
        flashType: 'error',
        csrfToken: req.csrfToken(),
      });
    }

    // Check if account is locked
    if (user.lock_until && new Date(user.lock_until) > new Date()) {
      return res.status(403).render('home', {
        flashMessage: 'Account is locked. Please try again later.',
        flashType: 'error',
        csrfToken: req.csrfToken(),
      });
    }

    // Proceed to log the user in
    req.logIn(user, async (err) => {
      if (err) {
        return res.status(500).render('home', {
          flashMessage: 'Internal Server Error',
          flashType: 'error',
          csrfToken: req.csrfToken(),
        });
      }

      // Reset failed login attempts and lock_until on successful login
      db.run('UPDATE users SET failed_login_attempts = 0, lock_until = NULL WHERE id = ?', [user.id], (err) => {
        if (err) console.error('Error resetting failed login attempts:', err);
      });

      // Redirect based on user role
      const redirectUrl =
        user.role === 'client'
          ? '/'
          : user.role === 'superadmin'
          ? '/admin/superadmin-dashboard'
          : '/admin/staff-dashboard';
      return res.redirect(redirectUrl);
    });
  })(req, res, next);
});

// Passport Strategy with Account Lockout Handling
passport.use(
  new LocalStrategy({ usernameField: 'email', passwordField: 'password' }, (email, password, done) => {
    db.get('SELECT * FROM users WHERE (personal_email = ? OR work_email = ?)', [email, email], async (err, user) => {
      if (err) return done(err);
      if (!user) return done(null, false, { message: 'User not found' });

      // Check if account is locked
      if (user.lock_until && new Date(user.lock_until) > new Date()) {
        return done(null, false, { message: 'Account is locked. Please try again later.' });
      }

      // Compare the provided password with the hashed password
      const isMatch = await bcrypt.compare(password, user.password);
      if (isMatch) {
        return done(null, user);
      } else {
        // Increment failed login attempts
        const failedAttempts = user.failed_login_attempts + 1;
        let lockUntil = user.lock_until;

        if (failedAttempts >= 5 && !lockUntil) {
          // Lock account for 15 minutes
          lockUntil = new Date(Date.now() + 15 * 60 * 1000).toISOString();
        }

        // Update the user's failed_login_attempts and lock_until in the database
        db.run(
          'UPDATE users SET failed_login_attempts = ?, lock_until = ? WHERE id = ?',
          [failedAttempts, lockUntil, user.id],
          (err) => {
            if (err) console.error('Error updating failed login attempts:', err);
          }
        );

        // Determine the appropriate error message
        let message = 'Incorrect password.';
        if (lockUntil) {
          message = 'Account is locked due to multiple failed login attempts. Please try again later.';
        }

        return done(null, false, { message });
      }
    });
  })
);

// Logout Route with CSRF and Complete Session Destruction
router.post('/logout', (req, res, next) => {
    // Bypass CSRF protection during shutdown
    if (!getShutdownState()) {
        return csrfProtection(req, res, next); // Enforce CSRF normally
    }
    console.log('Bypassing CSRF protection during shutdown');
    next();
}, (req, res) => {
    req.logout((err) => {
        if (err) {
            console.error('Logout error:', err);
            return res.status(500).send('Logout error');
        }

        req.session.destroy((sessionErr) => {
            if (sessionErr) {
                console.error('Session destruction error:', sessionErr);
                return res.status(500).send('Session destruction error');
            }

            res.clearCookie('connect.sid', {
                path: '/',
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                sameSite: 'strict',
            });

            setTimeout(() => {
                res.redirect('/');
            }, 2000); // Small delay for consistency
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
