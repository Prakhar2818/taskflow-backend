// routes/auth.js
const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const {
  register,
  login,
  logout,
  refreshToken,
  getMe,
  updateProfile
} = require('../controllers/authController');

// @desc    Register new user
// @route   POST /api/auth/register
// @access  Public
router.post('/register', register);

// @desc    Login user
// @route   POST /api/auth/login
// @access  Public
router.post('/login', login);

// @desc    Refresh access token
// @route   POST /api/auth/refresh
// @access  Public (uses refresh token from cookies)
router.post('/refresh', refreshToken);

// @desc    Logout user
// @route   POST /api/auth/logout
// @access  Private
router.post('/logout', protect, logout);

// @desc    Get current logged in user
// @route   GET /api/auth/me
// @access  Private
router.get('/me', protect, getMe);

// @desc    Update user profile
// @route   PUT /api/auth/profile
// @access  Private
router.put('/profile', protect, updateProfile);

// @desc    Change password
// @route   PUT /api/auth/password
// @access  Private
router.put('/password', protect, (req, res) => {
  // TODO: Implement password change
  res.json({ message: 'Password change endpoint - to be implemented' });
});

// @desc    Get user statistics
// @route   GET /api/auth/stats
// @access  Private
router.get('/stats', protect, async (req, res) => {
  try {
    const user = req.user;
    res.json({
      success: true,
      data: {
        stats: user.stats,
        joinedDate: user.createdAt,
        lastLogin: user.lastLogin,
        preferences: user.preferences
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching user stats',
      error: error.message
    });
  }
});

module.exports = router;
