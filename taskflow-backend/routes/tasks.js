const express = require("express");
const router = express.Router();
const {
  getTasks,
  getTask,
  createTask,
  updateTask,
  deleteTask,
  addCompletionReport,
} = require("../controllers/taskController");

const { protect } = require("../middleware/auth");

router.use(protect);

router.route("/").get(getTasks).post(createTask);

router.route("/:id").get(getTask).put(updateTask).delete(deleteTask);

router.post("/:id/reports", addCompletionReport);

module.exports = router;
