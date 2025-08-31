const mongoose = require("mongoose");
const Task = require("../models/Task");
const User = require("../models/User");
const Workspace = require("../models/Workspace");

const getWorkspaceTasks = async (req, res) => {
  try {
    const { workspaceId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(workspaceId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid workspace ID",
      });
    }

    // Check if user has access to this workspace
    const workspace = await Workspace.findById(workspaceId);
    if (!workspace) {
      return res.status(404).json({
        success: false,
        message: "Workspace not found",
      });
    }

    const isMember = workspace.members.some(
      (m) => m.userId.toString() === req.user._id.toString() && m.isActive
    );
    const isOwner = workspace.owner.toString() === req.user._id.toString();

    if (!isMember && !isOwner) {
      return res.status(403).json({
        success: false,
        message: "Access denied",
      });
    }

    // Get tasks for this workspace
    const tasks = await Task.find({
      workspace: workspaceId,
    })
      .populate("user", "name email")
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      data: { tasks },
      message: "Workspace tasks retrieved successfully",
    });
  } catch (error) {
    console.error("Get workspace tasks error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to retrieve workspace tasks",
      error: error.message,
    });
  }
};

// ✅ KEEP: Your existing getTasks function (rename to getUserTasks)
const getUserTasks = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      status,
      priority,
      category,
      sortBy = "createdAt",
      sortOrder = "desc",
    } = req.query;

    const user = await User.findById(req.user._id);
    if (!user.currentWorkspace) {
      return res.status(400).json({
        success: false,
        message: "User is not assigned to any workspace.",
      });
    }

    const filter = { user: req.user._id, workspace: user.currentWorkspace };
    if (status) filter.status = status;
    if (priority) filter.priority = priority;
    if (category) filter.category = category;

    const sort = {};
    sort[sortBy] = sortOrder === "desc" ? -1 : 1;

    const tasks = await Task.find(filter)
      .sort(sort)
      .limit(parseInt(limit))
      .skip((parseInt(page) - 1) * parseInt(limit))
      .populate("sessions.sessionId", "name status");

    const total = await Task.countDocuments(filter);

    res.json({
      success: true,
      data: {
        tasks,
        pagination: {
          current: parseInt(page),
          total: Math.ceil(total / limit),
          hasNext: parseInt(page) < Math.ceil(total / limit),
          hasPrev: parseInt(page) > 1,
          totalItems: total,
        },
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error fetching tasks",
      error: error.message,
    });
  }
};

// @desc    Get single task (within workspace)
const getTask = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    const task = await Task.findOne({
      _id: req.params.id,
      user: req.user._id,
      workspace: user.workspace,
    }).populate("sessions.sessionId", "name status");

    if (!task) {
      return res.status(404).json({
        success: false,
        message: "Task not found",
      });
    }

    res.json({
      success: true,
      data: {
        task,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error fetching task",
      error: error.message,
    });
  }
};

// @desc    Create new task (with workspace)
const createTask = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).populate("workspace");
    if (!user.workspace) {
      return res.status(400).json({
        success: false,
        message: "User is not assigned to any workspace.",
      });
    }

    if (
      req.body.assignedTo &&
      req.body.assignedTo !== req.user._id.toString()
    ) {
      const assignedUser = await User.findById(req.body.assignedTo);
      if (
        !assignedUser ||
        assignedUser.workspace.toString() !== user.workspace._id.toString()
      ) {
        return res.status(400).json({
          success: false,
          message: "Assigned user is not in your workspace.",
        });
      }
    } else {
      req.body.assignedTo = req.user._id;
    }

    const taskData = {
      ...req.body,
      user: req.user._id,
      workspace: user.workspace._id,
      assignedBy: req.user._id,
      status: "pending",
    };

    const task = await Task.create(taskData);

    await User.findByIdAndUpdate(req.user._id, {
      $inc: { "stats.totalTasks": 1 },
      "stats.lastActive": new Date(),
    });

    await Workspace.findByIdAndUpdate(user.workspace._id, {
      $inc: { "stats.totalTasks": 1 },
    });

    res.status(201).json({
      success: true,
      message: "Task created successfully",
      data: { task },
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: "Error creating task",
      error: error.message,
    });
  }
};

// @desc    Update task (with workspace check)
const updateTask = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    const task = await Task.findOne({
      _id: req.params.id,
      user: req.user._id,
      workspace: user.workspace,
    });

    if (!task) {
      return res.status(404).json({
        success: false,
        message: "Task not found",
      });
    }

    Object.assign(task, req.body);
    task.updatedAt = Date.now();

    if (req.body.status === "completed" && task.status !== "completed") {
      await Workspace.findByIdAndUpdate(user.workspace, {
        $inc: { "stats.completedTasks": 1 },
      });

      await User.findByIdAndUpdate(req.user._id, {
        $inc: { "stats.completedTasks": 1 },
        "stats.lastActive": new Date(),
      });

      task.status = "completed";
      task.completedAt = new Date();
    }

    await task.save();

    res.json({
      success: true,
      message: "Task updated successfully",
      data: { task },
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: "Error updating task",
      error: error.message,
    });
  }
};

// @desc    Delete task (with workspace check)
const deleteTask = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    const task = await Task.findOneAndDelete({
      _id: req.params.id,
      user: req.user._id,
      workspace: user.workspace,
    });

    if (!task) {
      return res.status(404).json({
        success: false,
        message: "Task not found",
      });
    }

    let updateObj = { $inc: { "stats.totalTasks": -1 } };
    if (task.status === "completed") {
      updateObj.$inc["stats.completedTasks"] = -1;
    }

    await User.findByIdAndUpdate(req.user._id, updateObj);

    await Workspace.findByIdAndUpdate(user.workspace, updateObj);

    res.json({
      success: true,
      message: "Task deleted successfully",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error deleting task",
      error: error.message,
    });
  }
};

// @desc    Add completion report to task (with workspace)
const addCompletionReport = async (req, res) => {
  try {
    const task = await Task.findOne({
      _id: req.params.id,
      user: req.user._id,
      workspace: req.user.workspace,
    });

    if (!task) {
      return res.status(404).json({
        success: false,
        message: "Task not found",
      });
    }

    const report = { ...req.body, completedAt: new Date() };

    task.completionReports.push(report);

    if (req.body.timeSpent) {
      task.actualTime = (task.actualTime || 0) + req.body.timeSpent;
      await User.findByIdAndUpdate(req.user._id, {
        $inc: {
          "stats.totalTasks": 1,
          "stats.completedTasks": 1,
          "stats.totalFocusTime": Math.round(req.body.timeSpent / 60),
        },
        "stats.lastActive": new Date(),
      });
    }

    await task.save();

    res.json({
      success: true,
      message: "Completion report added successfully",
      data: { task },
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: "Error adding completion report",
      error: error.message,
    });
  }
};

module.exports = {
  getUserTasks,
  getTask,
  createTask,
  updateTask,
  deleteTask,
  addCompletionReport,
  getWorkspaceTasks
};
