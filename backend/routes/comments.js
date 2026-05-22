import express from 'express';
import { db } from '../db/db.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// Helper to check task access
async function checkTaskAccess(userId, taskId) {
  const task = await db.tasks.findOne({ id: taskId });
  if (!task) return null;
  const col = await db.columns.findOne({ id: task.columnId });
  if (!col) return null;
  const project = await db.projects.findOne({ id: col.projectId });
  if (!project) return null;

  const hasAccess = project.ownerId === userId || project.members.some(m => m.id === userId);
  return hasAccess ? { task, project } : null;
}

// GET /api/comments?taskId=XXX
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { taskId } = req.query;
    if (!taskId) {
      return res.status(400).json({ error: 'taskId query param required' });
    }

    const access = await checkTaskAccess(req.userId, taskId);
    if (!access) {
      return res.status(403).json({ error: 'Unauthorized or task does not exist' });
    }

    const comments = await db.comments.findMany({ taskId });
    res.json(comments);
  } catch (error) {
    console.error('Error fetching comments:', error);
    res.status(500).json({ error: 'Failed to fetch comments' });
  }
});

// POST /api/comments
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { taskId, content } = req.body;
    if (!taskId || !content) {
      return res.status(400).json({ error: 'taskId and comment content are required' });
    }

    const access = await checkTaskAccess(req.userId, taskId);
    if (!access) {
      return res.status(403).json({ error: 'Unauthorized or task does not exist' });
    }

    const { task, project } = access;

    // Create comment
    const newComment = await db.comments.create({
      taskId,
      userId: req.userId,
      content
    });

    // Notify task assignee if it's someone else
    if (task.assigneeId && task.assigneeId !== req.userId) {
      const truncatedComment = content.length > 40 ? content.substring(0, 40) + '...' : content;
      const notif = await db.notifications.create({
        userId: task.assigneeId,
        message: `${req.username} commented on your task "${task.title}": "${truncatedComment}"`,
        type: 'comment',
        projectId: project.id,
        taskId: task.id
      });
      if (req.sendToUser) {
        req.sendToUser(task.assigneeId, 'NOTIFICATION_RECEIVED', notif);
      }
    }

    // Broadcast comment addition to project room
    // This allows active client task modals to dynamically append the comment in real-time!
    if (req.broadcastToProject) {
      req.broadcastToProject(project.id, 'COMMENT_ADDED', {
        taskId,
        comment: newComment
      });
    }

    res.status(201).json(newComment);
  } catch (error) {
    console.error('Error creating comment:', error);
    res.status(500).json({ error: 'Failed to add comment' });
  }
});

export default router;
