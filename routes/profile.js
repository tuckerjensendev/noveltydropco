const express = require('express');
const router = express.Router();

router.get('/profile', (req, res) => {
  if (req.isAuthenticated()) {
    res.render('profile', { user: req.user });
  } else {
    res.redirect('/');
  }
});

module.exports = router;
