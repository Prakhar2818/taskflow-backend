// models/Session.js
const mongoose = require('mongoose');

const sessionSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  name: {
    type: String,
    required: [true, 'Session name is required'],
    trim: true,
    maxlength: [200, 'Session name cannot exceed 200 characters']
  },
  description: {
    type: String,
    trim: true,
    maxlength: [1000, 'Description cannot exceed 1000 characters']
  },
  tasks: [{
    task: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Task'
    },
    name: String,
    duration: Number, // in minutes
    priority: {
      type: String,
      enum: ['low', 'medium', 'high', 'urgent'],
      default: 'medium'
    },
    completed: { type: Boolean, default: false },
    completedAt: Date
  }],
  status: {
    type: String,
    enum: ['pending', 'in-progress', 'completed', 'cancelled'],
    default: 'pending'
  },
  totalTime: Number, // in seconds
  actualTime: Number, // in seconds
  completedTasks: { type: Number, default: 0 },
  startedAt: Date,
  completedAt: Date,
  taskReports: [{
    taskId: mongoose.Schema.Types.ObjectId,
    taskName: String,
    isCompleted: Boolean,
    completionPercentage: Number,
    reason: String,
    notes: String,
    reportedAt: { type: Date, default: Date.now }
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
sessionSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Calculate completion rate
sessionSchema.virtual('completionRate').get(function() {
  if (this.tasks.length === 0) return 0;
  return Math.round((this.completedTasks / this.tasks.length) * 100);
});

// Calculate efficiency
sessionSchema.virtual('efficiency').get(function() {
  if (!this.totalTime || !this.actualTime) return 0;
  return Math.round((this.totalTime / this.actualTime) * 100);
});

sessionSchema.set('toJSON', { virtuals: true });
sessionSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('Session', sessionSchema);
