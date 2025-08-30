// models/User.js - UPDATED FOR MULTIPLE WORKSPACES
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, "Please provide a name"],
    trim: true,
    maxlength: [50, "Name cannot be more than 50 characters"],
  },
  email: {
    type: String,
    required: [true, "Please provide an email"],
    unique: true,
    lowercase: true,
    match: [
      /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/,
      "Please provide a valid email",
    ],
  },
  password: {
    type: String,
    required: [true, "Please provide a password"],
    minlength: [6, "Password must be at least 6 characters"],
    select: false,
  },
  avatar: {
    type: String,
    default: null,
  },
  role: {
    type: String,
    enum: ["user", "admin"],
    default: "user",
  },
  preferences: {
    theme: {
      type: String,
      enum: ["light", "dark", "system"],
      default: "light",
    },
    notifications: {
      type: Boolean,
      default: true,
    },
    autoSave: {
      type: Boolean,
      default: true,
    },
    timezone: {
      type: String,
      default: "UTC",
    },
  },
  stats: {
    totalTasks: { type: Number, default: 0 },
    completedTasks: { type: Number, default: 0 },
    totalSessions: { type: Number, default: 0 },
    totalFocusTime: { type: Number, default: 0 },
    streak: { type: Number, default: 0 },
    lastActive: { type: Date, default: Date.now },
  },

  // ✅ UPDATED: Support multiple workspaces
  workspaces: [{
    workspaceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Workspace",
      required: true
    },
    role: {
      type: String,
      enum: ["manager", "member"],
      required: true
    },
    joinedAt: {
      type: Date,
      default: Date.now
    },
    isActive: {
      type: Boolean,
      default: true
    }
  }],

  // ✅ ADD: Currently active workspace
  currentWorkspace: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Workspace",
    default: null
  },

  refreshTokens: [
    {
      token: String,
      createdAt: { type: Date, default: Date.now },
      expiresAt: Date,
    },
  ],
  isActive: {
    type: Boolean,
    default: true,
  },
  emailVerified: {
    type: Boolean,
    default: false,
  },
  lastLogin: Date,
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

// Hash password before saving
userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

// Update timestamp on save
userSchema.pre("save", function (next) {
  this.updatedAt = Date.now();
  next();
});

// Compare password method
userSchema.methods.comparePassword = async function (candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

// ✅ ADD: Helper methods for workspace management
userSchema.methods.addWorkspace = function(workspaceId, role) {
  const existingWorkspace = this.workspaces.find(w => 
    w.workspaceId.toString() === workspaceId.toString()
  );
  
  if (!existingWorkspace) {
    this.workspaces.push({
      workspaceId,
      role,
      joinedAt: new Date(),
      isActive: true
    });
    
    // Set as current workspace if it's the first one
    if (!this.currentWorkspace) {
      this.currentWorkspace = workspaceId;
    }
  }
};

userSchema.methods.removeWorkspace = function(workspaceId) {
  this.workspaces = this.workspaces.filter(w => 
    w.workspaceId.toString() !== workspaceId.toString()
  );
  
  // If removed workspace was current, set to first available or null
  if (this.currentWorkspace && this.currentWorkspace.toString() === workspaceId.toString()) {
    this.currentWorkspace = this.workspaces.length > 0 ? this.workspaces[0].workspaceId : null;
  }
};

userSchema.methods.getUserRoleInWorkspace = function(workspaceId) {
  const workspace = this.workspaces.find(w => 
    w.workspaceId.toString() === workspaceId.toString() && w.isActive
  );
  return workspace ? workspace.role : null;
};

// Clean expired refresh tokens
userSchema.methods.cleanExpiredTokens = function () {
  this.refreshTokens = this.refreshTokens.filter(
    (tokenObj) => tokenObj.expiresAt > new Date()
  );
};

module.exports = mongoose.model("User", userSchema);
