// routes/workspace.js

const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth'); // Your authentication middleware
const workspaceController = require('../controllers/workSpaceController');

// Create a new workspace (only manager users)
router.post('/', auth, workspaceController.createWorkspace);

// Get the workspace of the logged-in user (single workspace)
router.get('/me', auth, workspaceController.getMyWorkspace);

// Get detailed info about a specific workspace (by ID)
router.get('/:id', auth, workspaceController.getWorkspaceDetails);

// Add a member to the workspace
router.post('/:id/members', auth, workspaceController.addWorkspaceMember);

// Remove a member from the workspace
router.delete('/:id/members/:memberId', auth, workspaceController.removeWorkspaceMember);

module.exports = router;
