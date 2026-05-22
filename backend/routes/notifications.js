import express from 'express';
import { db } from '../db/db.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// GET /api/notifications
router.get('/', authenticateToken, async (req, res) => {
  try {
    const list = await db.notifications.findMany({ userId: req.userId });
    res.json(list);
  } catch (error) {
    console.error('Error fetching notifications:', error);
    res.status(500).json({ error: 'Failed to fetch notifications' });
  }
});

// PUT /api/notifications/:id/read
router.put('/:id/read', authenticateToken, async (req, res) => {
  try {
    const notif = db.notifications.markAsRead(req.params.id);
    res.json({ success: true });
  } catch (error) {
    console.error('Error marking notification as read:', error);
    res.status(500).json({ error: 'Failed to mark notification as read' });
  }
});

// POST /api/notifications/read-all
router.post('/read-all', authenticateToken, async (req, res) => {
  try {
    await db.notifications.markAllAsRead(req.userId);
    res.json({ success: true });
  } catch (error) {
    console.error('Error marking all notifications as read:', error);
    res.status(500).json({ error: 'Failed to mark notifications' });
  }
});

export default router;
