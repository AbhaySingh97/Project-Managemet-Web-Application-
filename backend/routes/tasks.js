import express from 'express';
import { db } from '../db/db.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// Helper to check access by column ID
async function checkColumnAccess(userId, columnId) {
  const col = await db.columns.findOne({ id: columnId });
  if (!col) return null;
  const project = await db.projects.findOne({ id: col.projectId });
  if (!project) return null;
  
  const hasAccess = project.ownerId === userId || project.members.some(m => m.id === userId);
  return hasAccess ? { column: col, project } : null;
}

// GET /api/tasks?projectId=XXX
// Fetch all tasks for a project
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { projectId } = req.query;
    if (!projectId) {
      return res.status(400).json({ error: 'projectId query param required' });
    }

    const project = await db.projects.findOne({ id: projectId });
    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    const isMember = project.ownerId === req.userId || project.members.some(m => m.id === req.userId);
    if (!isMember) {
      return res.status(403).json({ error: 'Unauthorized to access this project' });
    }

    // Get all column IDs for the project
    const cols = await db.columns.findMany({ projectId });
    const colIds = cols.map(c => c.id);

    // Fetch all tasks for these columns
    const allTasks = [];
    for (const cid of colIds) {
      const colTasks = await db.tasks.findMany({ columnId: cid });
      allTasks.push(...colTasks);
    }

    res.json(allTasks);
  } catch (error) {
    console.error('Error fetching tasks:', error);
    res.status(500).json({ error: 'Failed to fetch tasks' });
  }
});

// POST /api/tasks
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { columnId, title, description, assigneeId, priority, dueDate } = req.body;
    if (!columnId || !title) {
      return res.status(400).json({ error: 'columnId and title are required' });
    }

    const access = await checkColumnAccess(req.userId, columnId);
    if (!access) {
      return res.status(403).json({ error: 'Unauthorized or column does not exist' });
    }

    const { project } = access;

    const newTask = await db.tasks.create({
      columnId,
      title,
      description,
      assigneeId,
      priority,
      dueDate
    });

    // Notify assignee if assigned to someone else
    if (assigneeId && assigneeId !== req.userId) {
      const notif = await db.notifications.create({
        userId: assigneeId,
        message: `${req.username} assigned you to the task "${title}" in project "${project.name}"`,
        type: 'assignment',
        projectId: project.id,
        taskId: newTask.id
      });
      if (req.sendToUser) {
        req.sendToUser(assigneeId, 'NOTIFICATION_RECEIVED', notif);
      }
    }

    // Broadcast task creation
    if (req.broadcastToProject) {
      req.broadcastToProject(project.id, 'TASK_CREATED', newTask);
    }

    res.status(201).json(newTask);
  } catch (error) {
    console.error('Error creating task:', error);
    res.status(500).json({ error: 'Failed to create task' });
  }
});

// PUT /api/tasks/:id
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const { title, description, assigneeId, priority, dueDate, columnId, position } = req.body;
    
    // Load current task state
    const task = await db.tasks.findOne({ id: req.params.id });
    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }

    // Validate access to current column
    const currentAccess = await checkColumnAccess(req.userId, task.columnId);
    if (!currentAccess) {
      return res.status(403).json({ error: 'Unauthorized to modify this task' });
    }

    const { project } = currentAccess;

    // Validate access to new column if shifting
    if (columnId && columnId !== task.columnId) {
      const newAccess = await checkColumnAccess(req.userId, columnId);
      if (!newAccess) {
        return res.status(403).json({ error: 'Unauthorized to move task to target column' });
      }
    }

    // Build update payload
    const updateData = {};
    if (title !== undefined) updateData.title = title;
    if (description !== undefined) updateData.description = description;
    if (assigneeId !== undefined) updateData.assigneeId = assigneeId;
    if (priority !== undefined) updateData.priority = priority;
    if (dueDate !== undefined) updateData.dueDate = dueDate;
    if (columnId !== undefined) updateData.columnId = columnId;
    if (position !== undefined) updateData.position = position;

    const previousAssigneeId = task.assigneeId;

    const updatedTask = await db.tasks.update(req.params.id, updateData);

    // If assignee changed, alert the new assignee
    if (assigneeId !== undefined && assigneeId !== previousAssigneeId && assigneeId !== req.userId && assigneeId !== null) {
      const notif = await db.notifications.create({
        userId: assigneeId,
        message: `${req.username} assigned you to the task "${updatedTask.title}" in project "${project.name}"`,
        type: 'assignment',
        projectId: project.id,
        taskId: updatedTask.id
      });
      if (req.sendToUser) {
        req.sendToUser(assigneeId, 'NOTIFICATION_RECEIVED', notif);
      }
    }

    // Broadcast task update to project room
    if (req.broadcastToProject) {
      req.broadcastToProject(project.id, 'TASK_UPDATED', updatedTask);
    }

    res.json(updatedTask);
  } catch (error) {
    console.error('Error updating task:', error);
    res.status(500).json({ error: 'Failed to update task' });
  }
});

// DELETE /api/tasks/:id
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const task = await db.tasks.findOne({ id: req.params.id });
    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }

    const access = await checkColumnAccess(req.userId, task.columnId);
    if (!access) {
      return res.status(403).json({ error: 'Unauthorized to delete this task' });
    }

    const { project } = access;

    await db.tasks.delete(req.params.id);

    // Broadcast deletion
    if (req.broadcastToProject) {
      req.broadcastToProject(project.id, 'TASK_DELETED', { taskId: task.id, columnId: task.columnId });
    }

    res.json({ success: true, message: 'Task successfully deleted' });
  } catch (error) {
    console.error('Error deleting task:', error);
    res.status(500).json({ error: 'Failed to delete task' });
  }
});

export default router;
