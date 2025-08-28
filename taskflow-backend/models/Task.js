// models/Task.js - UPDATED for required workspace
const mongoose = require('mongoose');

const taskSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  name: {
    type: String,
    required: [true, 'Task name is required'],
    trim: true,
    maxlength: [200, 'Task name cannot exceed 200 characters']
  },
  description: {
    type: String,
    trim: true,
    maxlength: [1000, 'Description cannot exceed 1000 characters']
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'urgent'],
    default: 'medium'
  },
  status: {
    type: String,
    enum: ['pending', 'in-progress', 'completed', 'cancelled'],
    default: 'pending'
  },
  category: {
    type: String,
    trim: true,
    maxlength: [50, 'Category cannot exceed 50 characters']
  },
  tags: [{
    type: String,
    trim: true
  }],
  dueDate: Date,
  estimatedTime: Number, // in minutes
  actualTime: Number, // in minutes
  timerSeconds: {
    type: Number,
    default: 0
  },
  
  // ✅ UPDATED: Workspace fields now REQUIRED
  workspace: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Workspace',
    required: true  // Every task MUST belong to a workspace
  },
  assignedTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true  // Every task is assigned to someone
  },
  assignedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true  // Every task is assigned by someone
  },
  taskType: {
    type: String,
    enum: ['individual', 'collaborative'],
    default: 'individual'  // individual = personal, collaborative = team
  },
  
  completionReports: [{
    completedAt: { type: Date, default: Date.now },
    isCompleted: Boolean,
    completionPercentage: { type: Number, min: 0, max: 100 },
    qualityRating: { type: Number, min: 1, max: 5 },
    difficultyLevel: {
      type: String,
      enum: ['easier', 'as-expected', 'harder']
    },
    reason: String,
    notes: String,
    nextSteps: String,
    timeSpent: Number // in seconds
  }],
  sessions: [{
    sessionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Session'
    },
    startTime: Date,
    endTime: Date,
    duration: Number, // in seconds
    completed: Boolean
  }],
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Update timestamp on save
taskSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Calculate total time spent
taskSchema.virtual('totalTimeSpent').get(function() {
  return this.sessions.reduce((total, session) => total + (session.duration || 0), 0);
});

// Calculate completion rate
taskSchema.virtual('completionRate').get(function() {
  if (this.completionReports.length === 0) return 0;
  const avgCompletion = this.completionReports.reduce(
    (total, report) => total + (report.completionPercentage || 0), 0
  ) / this.completionReports.length;
  return Math.round(avgCompletion);
});

taskSchema.set('toJSON', { virtuals: true });
taskSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('Task', taskSchema);
