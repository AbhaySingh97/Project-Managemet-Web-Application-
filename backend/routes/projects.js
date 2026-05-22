import express from 'express';
import { db } from '../db/db.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// GET /api/projects
router.get('/', authenticateToken, async (req, res) => {
  try {
    const projects = await db.projects.getUserProjects(req.userId);
    res.json(projects);
  } catch (error) {
    console.error('Error fetching projects:', error);
    res.status(500).json({ error: 'Failed to fetch projects' });
  }
});

// GET /api/projects/:id
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const project = await db.projects.findOne({ id: req.params.id });
    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    // Check if the user is authorized (owner or member)
    const isMember = project.members.some(m => m.id === req.userId) || project.ownerId === req.userId;
    if (!isMember) {
      return res.status(403).json({ error: 'Unauthorized to access this project' });
    }

    res.json(project);
  } catch (error) {
    console.error('Error fetching project:', error);
    res.status(500).json({ error: 'Failed to fetch project' });
  }
});

// POST /api/projects
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { name, description } = req.body;
    if (!name) {
      return res.status(400).json({ error: 'Project name is required' });
    }

    const newProject = await db.projects.create({
      name,
      description,
      ownerId: req.userId
    });

    // Load full project with details
    const projectDetails = await db.projects.findOne({ id: newProject.id });
    res.status(201).json(projectDetails);
  } catch (error) {
    console.error('Error creating project:', error);
    res.status(500).json({ error: 'Failed to create project' });
  }
});

// PUT /api/projects/:id
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const { name, description } = req.body;
    const project = await db.projects.findOne({ id: req.params.id });

    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    if (project.ownerId !== req.userId) {
      return res.status(403).json({ error: 'Only the project owner can edit details' });
    }

    const updated = await db.projects.update(req.params.id, { name, description });
    
    // Broadcast project update to members
    if (req.broadcastToProject) {
      req.broadcastToProject(project.id, 'PROJECT_UPDATED', updated);
    }

    res.json(updated);
  } catch (error) {
    console.error('Error updating project:', error);
    res.status(500).json({ error: 'Failed to update project' });
  }
});

// DELETE /api/projects/:id
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const project = await db.projects.findOne({ id: req.params.id });

    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    if (project.ownerId !== req.userId) {
      return res.status(403).json({ error: 'Only the project owner can delete this project' });
    }

    await db.projects.delete(req.params.id);

    // Broadcast project deletion to members
    if (req.broadcastToProject) {
      req.broadcastToProject(project.id, 'PROJECT_DELETED', { projectId: project.id });
    }

    res.json({ success: true, message: 'Project successfully deleted' });
  } catch (error) {
    console.error('Error deleting project:', error);
    res.status(500).json({ error: 'Failed to delete project' });
  }
});

// POST /api/projects/:id/members
router.post('/:id/members', authenticateToken, async (req, res) => {
  try {
    const { usernameOrEmail } = req.body;
    if (!usernameOrEmail) {
      return res.status(400).json({ error: 'Username or email is required' });
    }

    const project = await db.projects.findOne({ id: req.params.id });
    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    // Check if requester is member of the project
    const isMember = project.members.some(m => m.id === req.userId) || project.ownerId === req.userId;
    if (!isMember) {
      return res.status(403).json({ error: 'Unauthorized to invite members' });
    }

    // Lookup user
    let userToInvite = await db.users.findOne({ email: usernameOrEmail.toLowerCase() });
    if (!userToInvite) {
      userToInvite = await db.users.findOne({ username: usernameOrEmail });
    }

    if (!userToInvite) {
      return res.status(404).json({ error: 'User not found. Ensure the username or email is correct.' });
    }

    // Check if already a member
    const alreadyMember = project.members.some(m => m.id === userToInvite.id) || project.ownerId === userToInvite.id;
    if (alreadyMember) {
      return res.status(400).json({ error: 'User is already a member of this project' });
    }

    // Add member
    await db.projects.addMember(project.id, userToInvite.id);

    // Create real-time notification
    const notificationMessage = `${req.username} invited you to collaborate on the project "${project.name}"`;
    const notif = await db.notifications.create({
      userId: userToInvite.id,
      message: notificationMessage,
      type: 'info',
      projectId: project.id
    });

    // Notify user in real-time if connected via WebSockets
    if (req.sendToUser) {
      req.sendToUser(userToInvite.id, 'NOTIFICATION_RECEIVED', notif);
    }

    // Fetch updated project details
    const updatedProject = await db.projects.findOne({ id: project.id });

    // Broadcast member added event
    if (req.broadcastToProject) {
      req.broadcastToProject(project.id, 'MEMBER_ADDED', { 
        projectId: project.id, 
        member: { id: userToInvite.id, username: userToInvite.username, email: userToInvite.email } 
      });
    }

    res.status(200).json(updatedProject);
  } catch (error) {
    console.error('Error adding member:', error);
    res.status(500).json({ error: 'Failed to invite member' });
  }
});

// DELETE /api/projects/:id/members/:userId
router.delete('/:id/members/:userId', authenticateToken, async (req, res) => {
  try {
    const project = await db.projects.findOne({ id: req.params.id });
    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    // Only owner can kick members, or a member can leave themselves
    const isOwner = project.ownerId === req.userId;
    const isLeavingSelf = req.params.userId === req.userId;

    if (!isOwner && !isLeavingSelf) {
      return res.status(403).json({ error: 'Unauthorized to remove member' });
    }

    // Cannot remove owner
    if (project.ownerId === req.params.userId) {
      return res.status(400).json({ error: 'Cannot remove the owner of the project' });
    }

    await db.projects.removeMember(project.id, req.params.userId);

    // Broadcast member removed
    if (req.broadcastToProject) {
      req.broadcastToProject(project.id, 'MEMBER_REMOVED', { 
        projectId: project.id, 
        userId: req.params.userId 
      });
    }

    res.json({ success: true, message: 'Member successfully removed' });
  } catch (error) {
    console.error('Error removing member:', error);
    res.status(500).json({ error: 'Failed to remove member' });
  }
});

export default router;
