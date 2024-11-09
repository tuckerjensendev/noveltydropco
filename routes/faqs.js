const express = require('express');
const router = express.Router();

router.get('/', (req, res) => {
  res.send('Frequently Asked Questions');
});

module.exports = router;
