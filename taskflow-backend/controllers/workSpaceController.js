// controllers/workspaceController.js - FIXED VERSION
const Workspace = require('../models/Workspace');
const User = require('../models/User');
const mongoose = require('mongoose');

// Create new workspace
const createWorkspace = async (req, res) => {
  try {
    const { name, description, settings } = req.body;
    
    // Validate required fields
    if (!name || name.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Workspace name is required'
      });
    }

    const workspace = new Workspace({
      name: name.trim(),
      description: description?.trim(),
      owner: req.user.id,
      members: [{
        userId: req.user.id,
        role: 'manager',
        addedBy: req.user.id,
        isActive: true
      }],
      settings: settings || {}
    });

    await workspace.save();

    // ✅ UPDATED: Set single workspace reference for user
    await User.findByIdAndUpdate(req.user.id, {
      workspace: workspace._id,
      workspaceRole: 'manager',
      joinedWorkspaceAt: new Date()
    });

    await workspace.populate([
      { path: 'owner', select: 'name email avatar' },
      { path: 'members.userId', select: 'name email avatar' },
      { path: 'members.addedBy', select: 'name email' }
    ]);

    res.status(201).json({
      success: true,
      data: workspace,
      message: 'Workspace created successfully'
    });
  } catch (error) {
    console.error('Create workspace error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create workspace',
      error: error.message
    });
  }
};

// Get user's workspace (single workspace)
const getMyWorkspace = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).populate([{
      path: 'workspace',
      populate: [
        { path: 'owner', select: 'name email avatar' },
        { path: 'members.userId', select: 'name email avatar' },
        { path: 'members.addedBy', select: 'name email' }
      ]
    }]);

    if (!user.workspace) {
      return res.json({
        success: true,
        data: null,
        message: 'User is not part of any workspace'
      });
    }

    res.json({
      success: true,
      data: user.workspace,
      userRole: user.workspaceRole,
      message: 'Workspace retrieved successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve workspace',
      error: error.message
    });
  }
};

// Get workspace details
const getWorkspaceDetails = async (req, res) => {
  try {
    const workspaceId = req.params.id;

    if (!mongoose.Types.ObjectId.isValid(workspaceId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid workspace ID'
      });
    }

    const workspace = await Workspace.findById(workspaceId)
      .populate([
        { path: 'owner', select: 'name email avatar' },
        { path: 'members.userId', select: 'name email avatar' },
        { path: 'members.addedBy', select: 'name email' }
      ]);

    if (!workspace) {
      return res.status(404).json({
        success: false,
        message: 'Workspace not found'
      });
    }

    // Check if user is a member
    if (!workspace.isMember(req.user.id)) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    const userRole = workspace.getMemberRole(req.user.id);

    res.json({
      success: true,
      data: {
        ...workspace.toObject(),
        userRole
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve workspace',
      error: error.message
    });
  }
};

// Add member to workspace
const addWorkspaceMember = async (req, res) => {
  try {
    const { email, role = 'member' } = req.body;
    const workspaceId = req.params.id;
    
    // Validate inputs
    if (!email || !email.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Email is required'
      });
    }

    const workspace = await Workspace.findById(workspaceId);
    if (!workspace) {
      return res.status(404).json({
        success: false,
        message: 'Workspace not found'
      });
    }

    // Check if user is manager
    if (!workspace.isManager(req.user.id)) {
      return res.status(403).json({
        success: false,
        message: 'Only managers can add members'
      });
    }
    
    // Find user by email
    const user = await User.findOne({ 
      email: email.toLowerCase().trim(),
      isActive: true 
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Check if user already belongs to a workspace
    if (user.workspace) {
      return res.status(400).json({
        success: false,
        message: 'User is already a member of another workspace'
      });
    }

    // Add member to workspace
    workspace.members.push({
      userId: user._id,
      role,
      addedBy: req.user.id,
      isActive: true
    });
    await workspace.save();

    // ✅ UPDATED: Set single workspace reference for user
    await User.findByIdAndUpdate(user._id, {
      workspace: workspace._id,
      workspaceRole: role,
      joinedWorkspaceAt: new Date()
    });

    res.json({
      success: true,
      data: {
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          avatar: user.avatar
        },
        role
      },
      message: 'Member added successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to add member',
      error: error.message
    });
  }
};

// Remove member from workspace
const removeWorkspaceMember = async (req, res) => {
  try {
    const { id, memberId } = req.params;
    
    const workspace = await Workspace.findById(id);
    if (!workspace) {
      return res.status(404).json({
        success: false,
        message: 'Workspace not found'
      });
    }

    // Check if user is manager
    if (!workspace.isManager(req.user.id)) {
      return res.status(403).json({
        success: false,
        message: 'Only managers can remove members'
      });
    }

    // Prevent removing the owner
    if (workspace.owner.toString() === memberId) {
      return res.status(400).json({
        success: false,
        message: 'Cannot remove workspace owner'
      });
    }

    // Remove member from workspace
    workspace.members = workspace.members.filter(
      member => member.userId.toString() !== memberId
    );
    await workspace.save();

    // ✅ UPDATED: Remove workspace reference from user
    await User.findByIdAndUpdate(memberId, {
      workspace: null,
      workspaceRole: 'member',
      joinedWorkspaceAt: null
    });

    res.json({
      success: true,
      message: 'Member removed successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to remove member',
      error: error.message
    });
  }
};

module.exports = {
  createWorkspace,
  getMyWorkspace,  
  getWorkspaceDetails,
  addWorkspaceMember,
  removeWorkspaceMember
};
