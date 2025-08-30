// models/Workspace.js - UPDATED WITH INVITE FUNCTIONALITY
const mongoose = require("mongoose");
const crypto = require('crypto');

const workspaceSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Workspace name is required"],
      trim: true,
      maxlength: [100, "Workspace name cannot exceed 100 characters"]
    },
    description: {
      type: String,
      trim: true,
      maxlength: [500, "Description cannot exceed 500 characters"]
    },
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },
    members: [
      {
        userId: {
          type: mongoose.Schema.Types.ObjectId,
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
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
        },
        isActive: {
          type: Boolean,
          default: true
        }
      },
    ],
    // ✅ ADD INVITE FUNCTIONALITY
    inviteToken: { 
      type: String, 
      unique: true,
      sparse: true // allows multiple null values
    },
    inviteTokenExpiry: Date,
    inviteEnabled: { 
      type: Boolean, 
      default: true 
    },
    settings: {
      allowSelfAssignment: { 
        type: Boolean, 
        default: true
      },
      requireApproval: { 
        type: Boolean, 
        default: false
      },
      autoReports: { 
        type: Boolean, 
        default: true
      }
    },
    stats: {
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

// ✅ ADD INVITE TOKEN METHODS
workspaceSchema.methods.generateInviteToken = function() {
  this.inviteToken = crypto.randomBytes(32).toString('hex');
  this.inviteTokenExpiry = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days
  return this.inviteToken;
};

workspaceSchema.methods.isInviteTokenValid = function() {
  return this.inviteEnabled && 
         this.inviteToken && 
         this.inviteTokenExpiry && 
         this.inviteTokenExpiry > new Date();
};

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
  return this.getMemberRole(userId) === 'manager' || 
         this.owner.toString() === userId.toString();
};

module.exports = mongoose.model("Workspace", workspaceSchema);
