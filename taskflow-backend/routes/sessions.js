// routes/sessions.js - UPDATED WITH WORKSPACE ROUTES
const express = require("express");
const router = express.Router();
const {
  getSessions,
  getSession,
  createSession,
  updateSession,
  deleteSession,
  startSession,
  completeSessionTask,
  addSessionReport,
  getSessionAnalytics,
  getWorkspaceSessions, // ✅ ADD: Import new function
} = require("../controllers/sessionController");

const { protect } = require("../middleware/auth");

router.use(protect);

// ✅ ADD: Workspace-specific route for ManagerDashboard  
router.get("/workspace/:workspaceId", getWorkspaceSessions);

// Existing routes
router.get("/analytics", getSessionAnalytics);
router.route("/").get(getSessions).post(createSession);
router.route("/:id").get(getSession).put(updateSession).delete(deleteSession);
router.post("/:id/start", startSession);
router.post("/:id/tasks/:taskIndex/complete", completeSessionTask);
router.post("/:id/report", addSessionReport); // Note: you had "report" not "reports"

module.exports = router;
