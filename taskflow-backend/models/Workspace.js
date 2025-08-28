// models/Workspace.js - FIXED VERSION
const mongoose = require("mongoose");

const workspaceSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Workspace name is required"],
      trim: true,
      maxlength: [100, "Workspace name cannot exceed 100 characters"]
    },
    description: {  // ✅ FIXED: was "descryption"
      type: String,
      trim: true,
      maxlength: [500, "Description cannot exceed 500 characters"]
    },
    owner: {  // ✅ FIXED: removed "new" keyword
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true  // ✅ FIXED: was "reruired"
    },
    members: [  // ✅ FIXED: was "member"
      {
        userId: {
          type: mongoose.Schema.Types.ObjectId,  // ✅ FIXED: removed "new"
          ref: "User",
          required: true,
        },
        role: {
          type: String,
          enum: ["manager", "member"],
          default: "member",
        },
        joinedAt: {
          type: Date,
          default: Date.now,
        },
        addedBy: {
          type: mongoose.Schema.Types.ObjectId,  // ✅ FIXED: removed "new"
          ref: "User",
        },
        isActive: {
          type: Boolean,
          default: true
        }
      },
    ],
    settings: {
      allowSelfAssignment: { 
        type: Boolean, 
        default: true  // Members can create their own tasks
      },
      requireApproval: { 
        type: Boolean, 
        default: false  // Manager approval needed for tasks
      },
      autoReports: { 
        type: Boolean, 
        default: true  // Auto-generate reports
      }
    },
    stats: {  // ✅ UPDATED: Better stats structure
      totalTasks: { type: Number, default: 0 },
      completedTasks: { type: Number, default: 0 },
      totalSessions: { type: Number, default: 0 },
      completedSessions: { type: Number, default: 0 },
      totalMembers: { type: Number, default: 0 },
      activeMembers: { type: Number, default: 0 },
      productivity: { type: Number, default: 0 }
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

// ✅ Update stats before saving
workspaceSchema.pre('save', function(next) {
  this.stats.totalMembers = this.members.length;
  this.stats.activeMembers = this.members.filter(m => m.isActive).length;
  next();
});

// ✅ Helper methods
workspaceSchema.methods.isMember = function(userId) {
  return this.members.some(m => 
    m.userId.toString() === userId.toString() && m.isActive
  );
};

workspaceSchema.methods.getMemberRole = function(userId) {
  const member = this.members.find(m => 
    m.userId.toString() === userId.toString() && m.isActive
  );
  return member ? member.role : null;
};

workspaceSchema.methods.isManager = function(userId) {
  return this.getMemberRole(userId) === 'manager';
};

module.exports = mongoose.model("Workspace", workspaceSchema);
