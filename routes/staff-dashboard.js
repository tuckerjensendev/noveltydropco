// routes/staff-dashboard.js
const express = require('express');
const router = express.Router();

// Middleware to check if user is authenticated and has an employee role
const ensureEmployeeOrSuperadmin = (req, res, next) => {
  if (req.isAuthenticated() && (req.user.role === 'superadmin' || (req.user.role && (req.user.role.includes('staff') || req.user.role.includes('manager'))))) {
    return next();
  }
  res.redirect('/');
};

// Staff Dashboard Route
router.get('/staff-dashboard', ensureEmployeeOrSuperadmin, (req, res) => {
  res.render('staff-dashboard', { user: req.user });
});

module.exports = router;
