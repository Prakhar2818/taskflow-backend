// routes/workspace.js - UPDATED FOR MULTIPLE WORKSPACES
const express = require("express");
const router = express.Router();
const {
  createWorkspace,
  getCurrentWorkspace,      // Updated name
  getWorkspaceDetails,
  addWorkspaceMember,
  removeWorkspaceMember,
  generateInviteLink,
  getInviteInfo,
  joinByInviteToken,
  disableInviteLink,
  getAllUserWorkspaces,     // New
  setCurrentWorkspace       // New
} = require("../controllers/workspaceController");

const { protect } = require("../middleware/auth");

router.use(protect);

// ✅ WORKSPACE MANAGEMENT ROUTES

// Create new workspace
router.post("/", createWorkspace);

// Get all user's workspaces (manager or member)
router.get("/", getAllUserWorkspaces);

// Get current active workspace
router.get("/current", getCurrentWorkspace);

// Get workspace details by ID
router.get("/:id", getWorkspaceDetails);

// Set current active workspace
router.put("/:workspaceId/set-current", setCurrentWorkspace);

// ✅ MEMBER MANAGEMENT ROUTES

// Add member to workspace
router.post("/:id/members", addWorkspaceMember);

// Remove member from workspace
router.delete("/:id/members/:memberId", removeWorkspaceMember);

// ✅ INVITE SYSTEM ROUTES

// Generate invite link for workspace
router.post("/:id/generate-invite", generateInviteLink);

// Get invite link info for workspace
router.get("/:id/invite-info", getInviteInfo);

// Join workspace using invite token
router.post("/join/:inviteToken", joinByInviteToken);

// Disable invite link for workspace
router.put("/:id/disable-invite", disableInviteLink);

module.exports = router;
