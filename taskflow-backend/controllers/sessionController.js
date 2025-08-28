// controllers/sessionController.js
const Session = require("../models/Session");
const User = require("../models/User");
const Task = require("../models/Task"); // If you need to reference tasks

// @desc    Get all sessions for user
// @route   GET /api/sessions
// @access  Private
const getSessions = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      status,
      sortBy = "createdAt",
      sortOrder = "desc",
    } = req.query;

    // Build filter
    const filter = { user: req.user._id };
    if (status) filter.status = status;

    // Build sort
    const sort = {};
    sort[sortBy] = sortOrder === "desc" ? -1 : 1;

    const sessions = await Session.find(filter)
      .sort(sort)
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .populate("tasks.task", "name status priority") // Populate referenced tasks
      .populate("user", "name email");

    const total = await Session.countDocuments(filter);

    res.json({
      success: true,
      data: {
        sessions,
        pagination: {
          current: parseInt(page),
          total: Math.ceil(total / limit),
          hasNext: page < Math.ceil(total / limit),
          hasPrev: page > 1,
          totalItems: total,
        },
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error fetching sessions",
      error: error.message,
    });
  }
};

// @desc    Get single session
// @route   GET /api/sessions/:id
// @access  Private
const getSession = async (req, res) => {
  try {
    const session = await Session.findOne({
      _id: req.params.id,
      user: req.user._id,
    }).populate("tasks.task", "name status priority estimatedDuration");

    if (!session) {
      return res.status(404).json({
        success: false,
        message: "Session not found",
      });
    }

    res.json({
      success: true,
      data: {
        session,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error fetching session",
      error: error.message,
    });
  }
};

// @desc    Create new session
// @route   POST /api/sessions
// @access  Private
const createSession = async (req, res) => {
  try {
    const { name, description, tasks } = req.body;

    // Validate session data
    if (!name || !name.trim()) {
      return res.status(400).json({
        success: false,
        message: "Session name is required",
      });
    }

    if (!tasks || tasks.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Session must have at least one task",
      });
    }

    // Calculate total time from tasks
    const totalTime = tasks.reduce((sum, task) => sum + task.duration * 60, 0);

    const sessionData = {
      user: req.user._id,
      name: name.trim(),
      description: description?.trim(),
      tasks: tasks.map((task) => ({
        name: task.name,
        duration: task.duration,
        priority: task.priority || "medium",
        completed: false,
      })),
      totalTime,
      completedTasks: 0,
      status: "pending",
    };

    const session = await Session.create(sessionData);

    // Update user stats
    await User.findByIdAndUpdate(req.user._id, {
      $inc: { "stats.totalSessions": 1 },
      "stats.lastActive": new Date(),
    });

    res.status(201).json({
      success: true,
      message: "Session created successfully",
      data: {
        session,
      },
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: "Error creating session",
      error: error.message,
    });
  }
};

// @desc    Update session
// @route   PUT /api/sessions/:id
// @access  Private
const updateSession = async (req, res) => {
  try {
    // ✅ ADD DEBUG LOGGING
    console.log("🔍 Update Session Debug:", {
      paramsId: req.params.id,
      paramsIdType: typeof req.params.id,
      fullParams: req.params,
      url: req.url,
      method: req.method,
      userId: req.user._id,
    });

    // ✅ ADD VALIDATION
    if (!req.params.id || req.params.id === "undefined") {
      return res.status(400).json({
        success: false,
        message: "Session ID is required",
        debug: {
          receivedId: req.params.id,
          params: req.params,
          url: req.url,
        },
      });
    }

    const session = await Session.findOneAndUpdate(
      { _id: req.params.id, user: req.user._id },
      {
        ...req.body,
        updatedAt: Date.now(),
      },
      { new: true, runValidators: true }
    );

    if (!session) {
      return res.status(404).json({
        success: false,
        message: "Session not found",
      });
    }

    // Update user stats if status changed to completed
    if (req.body.status === "completed" && session.status !== "completed") {
      await User.findByIdAndUpdate(req.user._id, {
        $inc: {
          "stats.completedSessions": 1,
          "stats.totalFocusTime": Math.round((session.actualTime || 0) / 60),
        },
        "stats.lastActive": new Date(),
      });

      // Set completion timestamp
      session.completedAt = new Date();
      await session.save();
    }

    res.json({
      success: true,
      message: "Session updated successfully",
      data: {
        session,
      },
    });
  } catch (error) {
    console.error("❌ Update session error:", error);
    res.status(400).json({
      success: false,
      message: "Error updating session",
      error: error.message,
    });
  }
};

// @desc    Start session
// @route   POST /api/sessions/:id/start
// @access  Private
const startSession = async (req, res) => {
  try {
    const session = await Session.findOneAndUpdate(
      { _id: req.params.id, user: req.user._id },
      {
        status: "in-progress",
        startedAt: new Date(),
        updatedAt: Date.now(),
      },
      { new: true }
    );

    if (!session) {
      return res.status(404).json({
        success: false,
        message: "Session not found",
      });
    }

    res.json({
      success: true,
      message: "Session started successfully",
      data: {
        session,
      },
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: "Error starting session",
      error: error.message,
    });
  }
};

// @desc    Complete task in session
// @route   POST /api/sessions/:id/tasks/:taskIndex/complete
// @access  Private
const completeSessionTask = async (req, res) => {
  try {
    const { id, taskIndex } = req.params;
    const {
      isCompleted = true,
      completionPercentage = 100,
      reason,
      wasDelayed = false,
      taskStatus = 'Completed',
      notes,
    } = req.body;

    const session = await Session.findOne({
      _id: id,
      user: req.user._id,
    });

    if (!session) {
      return res.status(404).json({
        success: false,
        message: "Session not found",
      });
    }

    const taskIdx = parseInt(taskIndex);
    if (taskIdx < 0 || taskIdx >= session.tasks.length) {
      return res.status(400).json({
        success: false,
        message: "Invalid task index",
      });
    }

    // Update task completion
    session.tasks[taskIdx].completed = isCompleted;
    session.tasks[taskIdx].completedAt = new Date();
    session.tasks[taskIdx].wasDelayed = wasDelayed;
    session.tasks[taskIdx].taskStatus = taskStatus;


    // Add task report
    const taskReport = {
      taskId: session.tasks[taskIdx]._id,
      taskName: session.tasks[taskIdx].name,
      isCompleted,
      completionPercentage,
      reason,
      notes,
      reportedAt: new Date(),
      wasDelayed,
      taskStatus,
    };

    session.taskReports.push(taskReport);

    // Update completed tasks count
    session.completedTasks = session.tasks.filter(
      (task) => task.completed
    ).length;

    // Check if all tasks are completed
    if (session.completedTasks === session.tasks.length) {
      session.status = "completed";
      session.completedAt = new Date();
    }

    await session.save();

    res.json({
      success: true,
      message: "Task completed successfully",
      data: {
        session,
        taskReport,
      },
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: "Error completing task",
      error: error.message,
    });
  }
};

// @desc    Delete session
// @route   DELETE /api/sessions/:id
// @access  Private
const deleteSession = async (req, res) => {
  try {
    const session = await Session.findOneAndDelete({
      _id: req.params.id,
      user: req.user._id,
    });

    if (!session) {
      return res.status(404).json({
        success: false,
        message: "Session not found",
      });
    }

    // Update user stats
    const updateData = {
      $inc: { "stats.totalSessions": -1 },
      "stats.lastActive": new Date(),
    };

    if (session.status === "completed") {
      updateData.$inc["stats.completedSessions"] = -1;
      if (session.actualTime) {
        updateData.$inc["stats.totalFocusTime"] = -Math.round(
          session.actualTime / 60
        );
      }
    }

    await User.findByIdAndUpdate(req.user._id, updateData);

    res.json({
      success: true,
      message: "Session deleted successfully",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error deleting session",
      error: error.message,
    });
  }
};

// @desc    Add completion report to session
// @route   POST /api/sessions/:id/reports
// @access  Private
const addSessionReport = async (req, res) => {
  try {
    const session = await Session.findOne({
      _id: req.params.id,
      user: req.user._id,
    });

    if (!session) {
      return res.status(404).json({
        success: false,
        message: "Session not found",
      });
    }

    const {
      actualTime,
      productivity,
      overallRating,
      notes,
      sessionCompleted = false,
    } = req.body;

    // Update session with actual time
    if (actualTime) {
      session.actualTime = actualTime;
    }

    // Mark as completed if requested
    if (sessionCompleted) {
      session.status = "completed";
      session.completedAt = new Date();
    }

    await session.save();

    // Update user stats
    if (actualTime) {
      await User.findByIdAndUpdate(req.user._id, {
        $inc: { "stats.totalFocusTime": Math.round(actualTime / 60) },
        "stats.lastActive": new Date(),
      });
    }

    res.json({
      success: true,
      message: "Session report added successfully",
      data: {
        session,
      },
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: "Error adding session report",
      error: error.message,
    });
  }
};

// @desc    Get session analytics
// @route   GET /api/sessions/analytics
// @access  Private
const getSessionAnalytics = async (req, res) => {
  try {
    const userId = req.user._id;

    const analytics = await Session.aggregate([
      { $match: { user: userId } },
      {
        $group: {
          _id: null,
          totalSessions: { $sum: 1 },
          completedSessions: {
            $sum: { $cond: [{ $eq: ["$status", "completed"] }, 1, 0] },
          },
          totalPlannedTime: { $sum: "$totalTime" },
          totalActualTime: { $sum: "$actualTime" },
          avgCompletionRate: { $avg: "$completionRate" },
        },
      },
    ]);

    const statusBreakdown = await Session.aggregate([
      { $match: { user: userId } },
      { $group: { _id: "$status", count: { $sum: 1 } } },
    ]);

    res.json({
      success: true,
      data: {
        overview: analytics[0] || {
          totalSessions: 0,
          completedSessions: 0,
          totalPlannedTime: 0,
          totalActualTime: 0,
          avgCompletionRate: 0,
        },
        statusBreakdown,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error fetching analytics",
      error: error.message,
    });
  }
};

module.exports = {
  getSessions,
  getSession,
  createSession,
  updateSession,
  deleteSession,
  startSession,
  completeSessionTask,
  addSessionReport,
  getSessionAnalytics,
};
