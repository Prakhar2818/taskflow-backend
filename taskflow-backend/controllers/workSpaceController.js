// controllers/workspaceController.js - FIXED VERSION
const Workspace = require("../models/Workspace");
const User = require("../models/User");
const mongoose = require("mongoose");

// ✅ UPDATED: Create workspace (add to user's workspaces array)
const createWorkspace = async (req, res) => {
  try {
    const { name, description, settings } = req.body;

    if (!name || name.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: "Workspace name is required",
      });
    }

    const workspace = new Workspace({
      name: name.trim(),
      description: description?.trim(),
      owner: req.user.id,
      members: [{
        userId: req.user.id,
        role: "manager",
        addedBy: req.user.id,
        isActive: true,
      }],
      settings: settings || {},
    });

    await workspace.save();

    const user = await User.findById(req.user.id);
    user.workspaces.push({
      workspaceId: workspace._id,
      role: "manager",
      joinedAt: new Date(),
      isActive: true,
    });

    if (!user.currentWorkspace) {
      user.currentWorkspace = workspace._id;
    }

    await user.save();

    // ✅ FIXED: Populate after save
    await workspace.populate([
      { path: "owner", select: "name email avatar" },
      { path: "members.userId", select: "name email avatar" },
      { path: "members.addedBy", select: "name email" },
    ]);

    res.status(201).json({
      success: true,
      data: workspace,
      message: "Workspace created successfully",
    });
  } catch (error) {
    console.error("Create workspace error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to create workspace",
      error: error.message,
    });
  }
};

// ✅ FIXED: Get current active workspace with proper population
const getCurrentWorkspace = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).populate({
      path: "currentWorkspace",
      populate: [
        { path: "owner", select: "name email avatar" },
        { path: "members.userId", select: "name email avatar" },
        { path: "members.addedBy", select: "name email" },
      ],
    });

    if (!user.currentWorkspace) {
      return res.json({
        success: true,
        data: null,
        message: "No current workspace set",
      });
    }

    const userWorkspace = user.workspaces.find(
      (w) => w.workspaceId.toString() === user.currentWorkspace._id.toString()
    );

    console.log(`📊 Current workspace has ${user.currentWorkspace.members.length} members`);

    res.json({
      success: true,
      data: user.currentWorkspace,
      userRole: userWorkspace ? userWorkspace.role : null,
      message: "Current workspace retrieved successfully",
    });
  } catch (error) {
    console.error("Get current workspace error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to retrieve current workspace",
      error: error.message,
    });
  }
};

// ✅ CRITICAL FIX: Get workspace details with proper population
const getWorkspaceDetails = async (req, res) => {
  try {
    const workspaceId = req.params.id;

    if (!mongoose.Types.ObjectId.isValid(workspaceId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid workspace ID",
      });
    }

    // ✅ FIXED: Separate populate calls for better debugging
    const workspace = await Workspace.findById(workspaceId)
      .populate("owner", "name email avatar")
      .populate("members.userId", "name email avatar")
      .populate("members.addedBy", "name email")
      .lean(); // Use lean() for better performance

    if (!workspace) {
      return res.status(404).json({
        success: false,
        message: "Workspace not found",
      });
    }

    // ✅ DEBUG: Log detailed member information
    console.log(`📊 Workspace "${workspace.name}" details:`);
    console.log(`📊 Total members: ${workspace.members.length}`);
    console.log(`📊 Members array:`, workspace.members.map(m => ({
      id: m._id,
      userId: m.userId?._id,
      userName: m.userId?.name,
      role: m.role,
      isActive: m.isActive
    })));

    if (!workspace.isMember || !workspace.isMember(req.user.id)) {
      // Manual check since we're using lean()
      const isMember = workspace.members.some(m => 
        m.userId._id.toString() === req.user.id.toString() && m.isActive
      );
      
      if (!isMember) {
        return res.status(403).json({
          success: false,
          message: "Access denied",
        });
      }
    }

    // Get user role manually
    const memberInfo = workspace.members.find(m => 
      m.userId._id.toString() === req.user.id.toString() && m.isActive
    );
    const userRole = memberInfo ? memberInfo.role : null;

    res.json({
      success: true,
      data: {
        ...workspace,
        userRole,
      },
    });
  } catch (error) {
    console.error("Get workspace details error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to retrieve workspace",
      error: error.message,
    });
  }
};

// ✅ CRITICAL FIX: Add member with proper workspace update
const addWorkspaceMember = async (req, res) => {
  try {
    const { email, role = "member" } = req.body;
    const workspaceId = req.params.id;

    if (!email || !email.trim()) {
      return res.status(400).json({
        success: false,
        message: "Email is required",
      });
    }

    const workspace = await Workspace.findById(workspaceId);
    if (!workspace) {
      return res.status(404).json({
        success: false,
        message: "Workspace not found",
      });
    }

    if (!workspace.isManager(req.user.id)) {
      return res.status(403).json({
        success: false,
        message: "Only managers can add members",
      });
    }

    const user = await User.findOne({
      email: email.toLowerCase().trim(),
      isActive: true,
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    const existingMembership = user.workspaces.find(
      (w) => w.workspaceId.toString() === workspaceId.toString()
    );

    if (existingMembership) {
      return res.status(400).json({
        success: false,
        message: "User is already a member of this workspace",
      });
    }

    // ✅ FIXED: Add member to workspace first
    workspace.members.push({
      userId: user._id,
      role,
      addedBy: req.user.id,
      isActive: true,
      joinedAt: new Date(),
    });
    
    // ✅ CRITICAL: Save workspace BEFORE updating user
    await workspace.save();
    console.log(`✅ Added member to workspace. New count: ${workspace.members.length}`);

    // Add to user's workspaces array
    user.workspaces.push({
      workspaceId: workspaceId,
      role,
      joinedAt: new Date(),
      isActive: true,
    });

    if (!user.currentWorkspace) {
      user.currentWorkspace = workspaceId;
    }

    await user.save();
    console.log(`✅ Updated user's workspace list`);

    res.json({
      success: true,
      data: {
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          avatar: user.avatar,
        },
        role,
        totalMembers: workspace.members.length, // Include updated count
      },
      message: "Member added successfully",
    });
  } catch (error) {
    console.error("Add member error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to add member",
      error: error.message,
    });
  }
};

// ✅ FIXED: Join by invite with proper workspace update
const joinByInviteToken = async (req, res) => {
  try {
    let { inviteToken } = req.params;
    inviteToken = decodeURIComponent(inviteToken);

    console.log("🔍 JOIN INVITE DEBUG:", inviteToken);

    const workspace = await Workspace.findOne({
      inviteToken,
      inviteTokenExpiry: { $gt: new Date() },
      inviteEnabled: true,
    }).populate("owner", "name email");

    if (!workspace) {
      return res.status(400).json({
        success: false,
        message: "Invalid or expired invite link",
      });
    }

    const user = await User.findById(req.user.id);

    const existingMembership = user.workspaces.find(
      (w) => w.workspaceId.toString() === workspace._id.toString()
    );

    if (existingMembership) {
      return res.status(200).json({
        success: true,
        message: "You are already a member of this workspace",
        data: {
          workspace: {
            id: workspace._id,
            name: workspace.name,
            description: workspace.description,
            owner: workspace.owner,
          },
        },
      });
    }

    if (workspace.owner._id.toString() === req.user.id) {
      return res.status(400).json({
        success: false,
        message: "You are the owner of this workspace",
      });
    }

    // ✅ FIXED: Add member to workspace first
    workspace.members.push({
      userId: req.user.id,
      role: "member",
      addedBy: workspace.owner._id,
      isActive: true,
      joinedAt: new Date(),
    });
    
    // ✅ CRITICAL: Save workspace BEFORE updating user
    await workspace.save();
    console.log(`✅ User joined workspace. New member count: ${workspace.members.length}`);

    user.workspaces.push({
      workspaceId: workspace._id,
      role: "member",
      joinedAt: new Date(),
      isActive: true,
    });

    if (!user.currentWorkspace) {
      user.currentWorkspace = workspace._id;
    }

    await user.save();

    console.log("✅ User successfully joined workspace:", workspace.name);

    res.json({
      success: true,
      data: {
        workspace: {
          id: workspace._id,
          name: workspace.name,
          description: workspace.description,
          owner: workspace.owner,
        },
      },
      message: "Successfully joined workspace",
    });
  } catch (error) {
    console.error("❌ Join workspace error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to join workspace",
      error: error.message,
    });
  }
};

// ✅ Keep all other functions unchanged
const getAllUserWorkspaces = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).populate({
      path: "workspaces.workspaceId",
      populate: [
        { path: "owner", select: "name email avatar" },
        { path: "members.userId", select: "name email avatar" },
      ],
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    const workspacesData = user.workspaces
      .filter((w) => w.isActive && w.workspaceId)
      .map((userWorkspace) => ({
        workspace: userWorkspace.workspaceId,
        userRole: userWorkspace.role,
        joinedAt: userWorkspace.joinedAt,
        isCurrentWorkspace:
          user.currentWorkspace?.toString() === userWorkspace.workspaceId._id.toString(),
      }));

    res.json({
      success: true,
      data: {
        workspaces: workspacesData,
        currentWorkspace: user.currentWorkspace,
      },
      message: "User workspaces retrieved successfully",
    });
  } catch (error) {
    console.error("Get user workspaces error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to retrieve workspaces",
      error: error.message,
    });
  }
};

const setCurrentWorkspace = async (req, res) => {
  try {
    const { workspaceId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(workspaceId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid workspace ID",
      });
    }

    const user = await User.findById(req.user.id);
    const userWorkspace = user.workspaces.find(
      (w) => w.workspaceId.toString() === workspaceId.toString() && w.isActive
    );

    if (!userWorkspace) {
      return res.status(403).json({
        success: false,
        message: "You are not a member of this workspace",
      });
    }

    user.currentWorkspace = workspaceId;
    await user.save();

    const workspace = await Workspace.findById(workspaceId)
      .populate("owner", "name email avatar")
      .populate("members.userId", "name email avatar");

    res.json({
      success: true,
      data: {
        workspace,
        userRole: userWorkspace.role,
      },
      message: "Current workspace updated successfully",
    });
  } catch (error) {
    console.error("Set current workspace error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to set current workspace",
      error: error.message,
    });
  }
};

const removeWorkspaceMember = async (req, res) => {
  try {
    const { id, memberId } = req.params;

    const workspace = await Workspace.findById(id);
    if (!workspace) {
      return res.status(404).json({
        success: false,
        message: "Workspace not found",
      });
    }

    if (!workspace.isManager(req.user.id)) {
      return res.status(403).json({
        success: false,
        message: "Only managers can remove members",
      });
    }

    if (workspace.owner.toString() === memberId) {
      return res.status(400).json({
        success: false,
        message: "Cannot remove workspace owner",
      });
    }

    workspace.members = workspace.members.filter(
      (member) => member.userId.toString() !== memberId
    );
    await workspace.save();

    const user = await User.findById(memberId);
    if (user) {
      user.workspaces = user.workspaces.filter(
        (w) => w.workspaceId.toString() !== id.toString()
      );

      if (user.currentWorkspace?.toString() === id.toString()) {
        user.currentWorkspace = user.workspaces.length > 0 ? user.workspaces[0].workspaceId : null;
      }

      await user.save();
    }

    res.json({
      success: true,
      message: "Member removed successfully",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to remove member",
      error: error.message,
    });
  }
};

// Keep all invite functions unchanged
const generateInviteLink = async (req, res) => {
  try {
    const workspace = await Workspace.findById(req.params.id);

    if (!workspace) {
      return res.status(404).json({
        success: false,
        message: "Workspace not found",
      });
    }

    if (!workspace.isManager(req.user.id)) {
      return res.status(403).json({
        success: false,
        message: "Not authorized to generate invite links",
      });
    }

    const inviteToken = workspace.generateInviteToken();
    await workspace.save();

    const frontendUrl = process.env.FRONTEND_URL || "http://localhost:5173";
    const inviteLink = `${frontendUrl}/join/${inviteToken}`;

    res.json({
      success: true,
      data: {
        inviteLink,
        inviteToken,
        expiresAt: workspace.inviteTokenExpiry,
      },
      message: "Invite link generated successfully",
    });
  } catch (error) {
    console.error("Generate invite error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to generate invite link",
      error: error.message,
    });
  }
};

// controllers/workspaceController.js - FIX getInviteInfo
const getInviteInfo = async (req, res) => {
  try {
    const workspace = await Workspace.findById(req.params.id);
    
    if (!workspace) {
      return res.status(404).json({
        success: false,
        message: 'Workspace not found'
      });
    }

    // ✅ FIXED: Check if user is a member OR owner, not just manager
    const isMember = workspace.isMember && workspace.isMember(req.user.id);
    const isOwner = workspace.owner && workspace.owner.toString() === req.user.id;
    
    if (!isMember && !isOwner) {
      console.log(`❌ User ${req.user.id} not authorized for workspace ${req.params.id}`);
      return res.status(403).json({
        success: false,
        message: 'Not authorized to access this workspace'
      });
    }

    // ✅ UPDATED: Allow both managers and owners to see invite info
    const userRole = workspace.getMemberRole && workspace.getMemberRole(req.user.id);
    const canManageInvites = isOwner || userRole === 'manager';
    
    if (!canManageInvites) {
      console.log(`❌ User ${req.user.id} role '${userRole}' cannot manage invites`);
      return res.status(403).json({
        success: false,
        message: 'Only managers can access invite information'
      });
    }

    console.log(`✅ User ${req.user.id} authorized as ${userRole || 'owner'}`);

    if (workspace.isInviteTokenValid && workspace.isInviteTokenValid()) {
      // ✅ UPDATED: Return only the invite token, let frontend construct the full URL
      res.json({
        success: true,
        data: {
          inviteToken: workspace.inviteToken,
          expiresAt: workspace.inviteTokenExpiry,
          isActive: true
        }
      });
    } else {
      res.json({
        success: true,
        data: {
          isActive: false,
          message: 'No active invite link'
        }
      });
    }

  } catch (error) {
    console.error('Get invite info error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get invite info',
      error: error.message
    });
  }
};



const disableInviteLink = async (req, res) => {
  try {
    const workspace = await Workspace.findById(req.params.id);

    if (!workspace) {
      return res.status(404).json({
        success: false,
        message: "Workspace not found",
      });
    }

    if (!workspace.isManager(req.user.id)) {
      return res.status(403).json({
        success: false,
        message: "Not authorized",
      });
    }

    workspace.inviteEnabled = false;
    await workspace.save();

    res.json({
      success: true,
      message: "Invite link disabled successfully",
    });
  } catch (error) {
    console.error("Disable invite error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to disable invite link",
      error: error.message,
    });
  }
};

module.exports = {
  createWorkspace,
  getCurrentWorkspace,
  getWorkspaceDetails,
  addWorkspaceMember,
  removeWorkspaceMember,
  generateInviteLink,
  getInviteInfo,
  joinByInviteToken,
  disableInviteLink,
  getAllUserWorkspaces,
  setCurrentWorkspace,
};
