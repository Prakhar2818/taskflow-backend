// routes/workspace.js

const express = require("express");
const router = express.Router();
const auth = require("../middleware/auth"); // Your authentication middleware
const {
  createWorkspace,
  getMyWorkspace,
  getWorkspaceDetails,
  addWorkspaceMember,
  removeWorkspaceMember,
} = require("../controllers/workspaceController");

// Create a new workspace (only manager users)
router.post("/",  createWorkspace);

// Get the workspace of the logged-in user (single workspace)
router.get("/me",  getMyWorkspace);

// Get detailed info about a specific workspace (by ID)
router.get("/:id", getWorkspaceDetails);

// Add a member to the workspace
router.post("/:id/members", addWorkspaceMember);

// Remove a member from the workspace
router.delete("/:id/members/:memberId", removeWorkspaceMember);

module.exports = router;
