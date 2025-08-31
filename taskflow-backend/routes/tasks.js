// routes/tasks.js - UPDATED WITH WORKSPACE ROUTES
const express = require("express");
const router = express.Router();
const {
  getUserTasks,
  getTask,
  createTask,
  updateTask,
  deleteTask,
  addCompletionReport,
  getWorkspaceTasks, // ✅ ADD: Import new function
} = require("../controllers/taskController");

const { protect } = require("../middleware/auth");

router.use(protect);

// ✅ ADD: Workspace-specific route for ManagerDashboard
router.get("/workspace/:workspaceId", getWorkspaceTasks);

// Existing user task routes
router.route("/").get(getUserTasks).post(createTask);
router.route("/:id").get(getTask).put(updateTask).delete(deleteTask);
router.post("/:id/reports", addCompletionReport);

module.exports = router;
