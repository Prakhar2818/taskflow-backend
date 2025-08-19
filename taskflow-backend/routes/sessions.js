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
} = require("../controllers/sessionController");

const { protect } = require("../middleware/auth");

router.use(protect);

router.get("/analytics", getSessionAnalytics);

router.route("/").get(getSessions).post(createSession);

router.route("/:id").get(getSession).put(updateSession).delete(deleteSession);

router.post("/:id/start", startSession);
router.post("/:id/tasks/:taskIndex/complete", completeSessionTask);
router.post(":id/report", addSessionReport);

module.exports = router;
