import express from 'express';
import { db } from '../db/db.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// Helper to check if user has access to project
async function checkProjectAccess(userId, projectId) {
  const project = await db.projects.findOne({ id: projectId });
  if (!project) return false;
  return project.ownerId === userId || project.members.some(m => m.id === userId);
}

// GET /api/columns?projectId=XXX
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { projectId } = req.query;
    if (!projectId) {
      return res.status(400).json({ error: 'projectId query param required' });
    }

    const hasAccess = await checkProjectAccess(req.userId, projectId);
    if (!hasAccess) {
      return res.status(403).json({ error: 'Unauthorized to access this project' });
    }

    const cols = await db.columns.findMany({ projectId });
    res.json(cols);
  } catch (error) {
    console.error('Error fetching columns:', error);
    res.status(500).json({ error: 'Failed to fetch columns' });
  }
});

// POST /api/columns
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { projectId, name } = req.body;
    if (!projectId || !name) {
      return res.status(400).json({ error: 'projectId and column name are required' });
    }

    const hasAccess = await checkProjectAccess(req.userId, projectId);
    if (!hasAccess) {
      return res.status(403).json({ error: 'Unauthorized to modify this project' });
    }

    const newCol = await db.columns.create({ projectId, name });

    // Broadcast column created to project channel
    if (req.broadcastToProject) {
      req.broadcastToProject(projectId, 'COLUMN_CREATED', newCol);
    }

    res.status(201).json(newCol);
  } catch (error) {
    console.error('Error creating column:', error);
    res.status(500).json({ error: 'Failed to create column' });
  }
});

// PUT /api/columns/:id
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const { name, position } = req.body;
    const col = await db.columns.findOne({ id: req.params.id });
    if (!col) {
      return res.status(404).json({ error: 'Column not found' });
    }

    const hasAccess = await checkProjectAccess(req.userId, col.projectId);
    if (!hasAccess) {
      return res.status(403).json({ error: 'Unauthorized to modify this project' });
    }

    const updateData = {};
    if (name !== undefined) updateData.name = name;
    if (position !== undefined) updateData.position = position;

    const updated = await db.columns.update(req.params.id, updateData);

    // Broadcast column updated
    if (req.broadcastToProject) {
      req.broadcastToProject(col.projectId, 'COLUMN_UPDATED', updated);
    }

    res.json(updated);
  } catch (error) {
    console.error('Error updating column:', error);
    res.status(500).json({ error: 'Failed to update column' });
  }
});

// DELETE /api/columns/:id
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const col = await db.columns.findOne({ id: req.params.id });
    if (!col) {
      return res.status(404).json({ error: 'Column not found' });
    }

    const hasAccess = await checkProjectAccess(req.userId, col.projectId);
    if (!hasAccess) {
      return res.status(403).json({ error: 'Unauthorized to modify this project' });
    }

    await db.columns.delete(req.params.id);

    // Broadcast column deleted
    if (req.broadcastToProject) {
      req.broadcastToProject(col.projectId, 'COLUMN_DELETED', { columnId: col.id });
    }

    res.json({ success: true, message: 'Column successfully deleted' });
  } catch (error) {
    console.error('Error deleting column:', error);
    res.status(500).json({ error: 'Failed to delete column' });
  }
});

export default router;
