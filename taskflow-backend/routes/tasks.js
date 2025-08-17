const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');

router.get('/test', (req, res) => {
  res.json({ message: 'Task routes working!' });
});

router.get('/', protect, (req, res) => {
  res.json({ message: 'Get tasks - placeholder' });
});

router.post('/', protect, (req, res) => {
  res.json({ message: 'Create task - placeholder' });
});

module.exports = router;
