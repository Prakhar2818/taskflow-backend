// routes/sessions.js - WORKING VERSION
const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');

// Test route
router.get('/test', (req, res) => {
  res.json({ 
    success: true,
    message: 'Session routes are working!' 
  });
});

// Basic CRUD routes with inline functions (no external controller needed)
router.get('/', protect, (req, res) => {
  res.json({ 
    success: true,
    message: 'Get sessions endpoint',
    data: { sessions: [] }
  });
});

router.post('/', protect, (req, res) => {
  res.json({ 
    success: true,
    message: 'Create session endpoint',
    data: { session: req.body }
  });
});

router.get('/:id', protect, (req, res) => {
  res.json({ 
    success: true,
    message: 'Get single session endpoint',
    data: { sessionId: req.params.id }
  });
});

router.put('/:id', protect, (req, res) => {
  res.json({ 
    success: true,
    message: 'Update session endpoint',
    data: { sessionId: req.params.id, updates: req.body }
  });
});

router.delete('/:id', protect, (req, res) => {
  res.json({ 
    success: true,
    message: 'Delete session endpoint',
    data: { sessionId: req.params.id }
  });
});

// Additional session routes
router.post('/:id/start', protect, (req, res) => {
  res.json({
    success: true,
    message: 'Session started',
    data: { sessionId: req.params.id }
  });
});

router.post('/:id/complete', protect, (req, res) => {
  res.json({
    success: true,
    message: 'Session completed',
    data: { sessionId: req.params.id }
  });
});

module.exports = router;
