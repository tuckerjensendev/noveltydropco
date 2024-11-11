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

// Client Registration Route with EJS rendering on errors
router.post('/customer-register', csrfProtection, [
  body('confirm_password').custom((value, { req }) => {
    if (value !== req.body.password) {
      throw new Error('Passwords do not match.');
    }
    return true;
  }),
  body('first_name').isAlpha().withMessage('First name must contain only letters.').trim().escape(),
  body('last_name').isAlpha().withMessage('Last name must contain only letters.').trim().escape(),
  body('personal_email').isEmail().withMessage('Invalid email format.').normalizeEmail(),
  body('password')
    .isLength({ min: 8 }).withMessage('Password must contain at least 8 characters.')
    .matches(/\d/).withMessage('Password must contain at least one number.')
    .matches(/[A-Z]/).withMessage('Password must contain at least one uppercase letter.')
], async (req, res) => {
  const errors = validationResult(req);
  const products = [
    { name: 'Product 1', description: 'Description for Product 1' },
    { name: 'Product 2', description: 'Description for Product 2' },
    { name: 'Product 3', description: 'Description for Product 3' }
  ];

  if (!errors.isEmpty()) {
    const firstErrors = {};
    errors.array().forEach(error => {
      if (!firstErrors[error.param]) {
        firstErrors[error.param] = error.msg;
      }
    });

    return res.status(400).render('home', {
      flashMessage: Object.values(firstErrors).join(', '),
      flashType: 'error',
      products,
      csrfToken: req.csrfToken(),
      showRegisterForm: true, // Keeps the register form open
      registerData: req.body // Retains registration input data
    });
  }

  const { first_name, last_name, personal_email, password } = req.body;
  try {
    db.get('SELECT * FROM users WHERE personal_email = ?', [personal_email], async (err, row) => {
      if (err) {
        console.error("Database error during email check:", err.message);
        return res.status(500).render('home', {
          flashMessage: 'Database error during email check',
          flashType: 'error',
          products,
          csrfToken: req.csrfToken(),
          showRegisterForm: true, // Keep the registration form open on error
          registerData: req.body // Retain user input data
        });
      }
      if (row) {
        return res.status(400).render('home', {
          flashMessage: 'Email already registered',
          flashType: 'error',
          products,
          csrfToken: req.csrfToken(),
          showRegisterForm: true, // Keep the registration form open on error
          registerData: req.body // Retain user input data
        });
      }

      const hashedPassword = await bcrypt.hash(password, 10);
      db.run(
        `INSERT INTO users (first_name, last_name, personal_email, password, role, created_at) VALUES (?, ?, ?, ?, ?, datetime('now', 'localtime'))`,
        [first_name, last_name, personal_email, hashedPassword, 'client'],
        (err) => {
          if (err) {
            console.error("Error creating customer in database:", err.message);
            return res.status(500).render('home', {
              flashMessage: 'Error creating account in database',
              flashType: 'error',
              products,
              csrfToken: req.csrfToken(),
              showRegisterForm: true // Keep the registration form open on error
            });
          }
          res.status(200).render('home', {
            flashMessage: 'Registration successful',
            flashType: 'success',
            products,
            csrfToken: req.csrfToken()
          });
        }
      );
    });
  } catch (error) {
    console.error("Unexpected error during registration:", error.message);
    res.status(500).render('home', {
      flashMessage: 'Unexpected server error',
      flashType: 'error',
      products,
      csrfToken: req.csrfToken(),
      showRegisterForm: true // Keep the registration form open on error
    });
  }
});

// Login Route with EJS rendering on errors
router.post('/login', csrfProtection, (req, res, next) => {
  passport.authenticate('local', async (err, user, info) => {
    const products = [
      { name: 'Product 1', description: 'Description for Product 1' },
      { name: 'Product 2', description: 'Description for Product 2' },
      { name: 'Product 3', description: 'Description for Product 3' }
    ];

    if (err) {
      console.error("Passport authentication error:", err);
      return res.status(500).render('home', {
        flashMessage: 'Internal Server Error',
        flashType: 'error',
        products,
        csrfToken: req.csrfToken(),
        showLoginForm: true, // Keeps login form open
        loginData: req.body // Retain user input data
      });
    }
    if (!user) {
      return res.status(401).render('home', {
        flashMessage: info.message || 'Login failed. Please check your email and password.',
        flashType: 'error',
        products,
        csrfToken: req.csrfToken(),
        showLoginForm: true, // Keeps login form open
        loginData: req.body // Retain user input data
      });
    }

    req.logIn(user, (err) => {
      if (err) {
        console.error("Error during login:", err);
        return res.status(500).render('home', {
          flashMessage: 'Internal Server Error',
          flashType: 'error',
          products,
          csrfToken: req.csrfToken(),
          showLoginForm: true, // Keeps login form open
          loginData: req.body // Retain user input data
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
    if (!user) return done(null, false, { message: 'User not found' }); // Specific message for non-existent user

    bcrypt.compare(password, user.password, (err, isMatch) => {
      if (err) return done(err);
      if (isMatch) return done(null, user);
      return done(null, false, { message: 'Incorrect password' }); // Specific message for incorrect password
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

// Staff Registration Route with EJS rendering on errors
router.post('/admin/create-staff', csrfProtection, [
  body('first_name').isAlpha().trim().escape().withMessage('First name must contain only letters.'),
  body('last_name').isAlpha().trim().escape().withMessage('Last name must contain only letters.'),
  body('personal_email').optional({ checkFalsy: true }).isEmail().normalizeEmail().withMessage('Invalid personal email format.'),
  body('email').isEmail().normalizeEmail().withMessage('Invalid work email format.'),
  body('password').isLength({ min: 8 }).matches(/\d/).matches(/[A-Z]/).withMessage('Password must be at least 8 characters, including one uppercase letter and one number.'),
  body('role').isIn(['staff1', 'staff2', 'manager1', 'manager2']).withMessage('Invalid role selected.')
], async (req, res) => {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    return res.status(400).render('admin/create-staff', {
      user: req.user,
      csrfToken: req.csrfToken(),
      flashMessage: errors.array()[0].msg,
      flashType: 'error'
    });
  }

  const { first_name, last_name, personal_email, email, password, role } = req.body;
  try {
    db.get('SELECT * FROM users WHERE work_email = ?', [email], async (err, row) => {
      if (err) {
        return res.status(500).render('admin/create-staff', {
          user: req.user,
          csrfToken: req.csrfToken(),
          flashMessage: 'Database error during email check',
          flashType: 'error'
        });
      }
      if (row) {
        return res.status(400).render('admin/create-staff', {
          user: req.user,
          csrfToken: req.csrfToken(),
          flashMessage: 'Email already registered',
          flashType: 'error'
        });
      }

      const hashedPassword = await bcrypt.hash(password, 10);
      db.run(
        `INSERT INTO users (first_name, last_name, personal_email, work_email, password, role, created_at) VALUES (?, ?, ?, ?, ?, ?, datetime('now', 'localtime'))`,
        [first_name, last_name, personal_email || null, email, hashedPassword, role],
        (err) => {
          if (err) {
            return res.status(500).render('admin/create-staff', {
              user: req.user,
              csrfToken: req.csrfToken(),
              flashMessage: 'Error creating staff in database',
              flashType: 'error'
            });
          }
          return res.status(200).render('admin/create-staff', {
            user: req.user,
            csrfToken: req.csrfToken(),
            flashMessage: 'Staff created successfully',
            flashType: 'success',
            flashDuration: 10000
          });
        }
      );
    });
  } catch (error) {
    res.status(500).render('admin/create-staff', {
      user: req.user,
      csrfToken: req.csrfToken(),
      flashMessage: 'Unexpected server error',
      flashType: 'error'
    });
  }
});

module.exports = router;
