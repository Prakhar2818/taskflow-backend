// models/Session.js - UPDATED for required workspace
const mongoose = require("mongoose");

const sessionSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  name: {
    type: String,
    required: [true, "Session name is required"],
    trim: true,
    maxlength: [200, "Session name cannot exceed 200 characters"],
  },
  description: {
    type: String,
    trim: true,
    maxlength: [1000, "Description cannot exceed 1000 characters"],
  },
  tasks: [
    {
      task: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Task",
      },
      name: String,
      duration: Number, // in minutes
      priority: {
        type: String,
        enum: ["low", "medium", "high", "urgent"],
        default: "medium",
      },
      completed: { type: Boolean, default: false },
      completedAt: Date,
      wasDelayed: { type: Boolean, default: false },
      taskStatus: { type: String, default: 'Pending' }
    },
  ],
  status: {
    type: String,
    enum: ["pending", "in-progress", "completed", "cancelled"],
    default: "pending",
  },

  // ✅ WORKSPACE FIELDS - REQUIRED
  workspace: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Workspace",
    required: true, // Every session MUST belong to a workspace
  },
  assignedTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true, // Every session is assigned to someone
  },
  assignedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true, // Every session is assigned by someone
  },
  sessionType: {
    type: String,
    enum: ['individual', 'collaborative'],
    default: 'individual'  // individual = personal, collaborative = team
  },

  totalTime: Number, // in minutes (changed from seconds for consistency)
  actualTime: Number, // in minutes (changed from seconds for consistency)
  completedTasks: { type: Number, default: 0 },
  startedAt: Date,
  completedAt: Date,
  
  taskReports: [
    {
      taskId: mongoose.Schema.Types.ObjectId,
      taskName: String,
      isCompleted: Boolean,
      completionPercentage: Number,
      reason: String,
      notes: String,
      reportedAt: { type: Date, default: Date.now },
      wasDelayed: { type: Boolean, default: false },
      taskStatus: String,
    },
  ],
}, {
  timestamps: true, // ✅ ADD: Use built-in timestamps
  strictPopulate: false, // ✅ ADD: Disable strict populate to avoid errors
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Calculate completion rate
sessionSchema.virtual("completionRate").get(function () {
  if (this.tasks.length === 0) return 0;
  return Math.round((this.completedTasks / this.tasks.length) * 100);
});

// Calculate efficiency
sessionSchema.virtual("efficiency").get(function () {
  if (!this.totalTime || !this.actualTime) return 0;
  return Math.round((this.totalTime / this.actualTime) * 100);
});

module.exports = mongoose.model("Session", sessionSchema);
