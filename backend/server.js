import express from 'express';
import http from 'http';
import { WebSocketServer } from 'ws';
import cors from 'cors';
import url from 'url';
import jwt from 'jsonwebtoken';

// Import routes
import authRoutes from './routes/auth.js';
import projectRoutes from './routes/projects.js';
import columnRoutes from './routes/columns.js';
import taskRoutes from './routes/tasks.js';
import commentRoutes from './routes/comments.js';
import notificationRoutes from './routes/notifications.js';

const PORT = process.env.PORT || 5000;
const JWT_SECRET = process.env.JWT_SECRET || 'super_secret_jwt_token_key_12345';

const app = express();
const server = http.createServer(app);

// Enable CORS
app.use(cors({
  origin: '*', // Allow all origins for easy testing
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());

// WebSocket Active Connections tracking
// userId -> Set of WS connections (in case they have multiple tabs open)
const userConnections = new Map();

// Helper to broadcast to a project "room"
function broadcastToProject(projectId, event, payload) {
  // Iterate all active sockets and broadcast if they are subscribed to this project
  wss.clients.forEach(client => {
    if (client.readyState === 1 && client.currentProjectId === projectId) {
      client.send(JSON.stringify({ event, payload }));
    }
  });
}

// Helper to send a direct message to a user
function sendToUser(userId, event, payload) {
  const connections = userConnections.get(userId);
  if (connections) {
    connections.forEach(client => {
      if (client.readyState === 1) {
        client.send(JSON.stringify({ event, payload }));
      }
    });
  }
}

// Attach websocket utilities to Express request so that routes can trigger broadcasts
app.use((req, res, next) => {
  req.broadcastToProject = broadcastToProject;
  req.sendToUser = sendToUser;
  next();
});

// Mount Routes
app.use('/api/auth', authRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/columns', columnRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/comments', commentRoutes);
app.use('/api/notifications', notificationRoutes);

// Simple Healthcheck
app.get('/', (req, res) => {
  res.json({ message: 'Project Management Tool Collaborative Server is online.' });
});

// Setup WebSocket Server
const wss = new WebSocketServer({ noServer: true });

// Handle upgrade from HTTP server to WS connection
server.on('upgrade', (request, socket, head) => {
  const parsedUrl = url.parse(request.url, true);
  const token = parsedUrl.query.token;

  if (!token) {
    socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n');
    socket.destroy();
    return;
  }

  // Authenticate socket client
  jwt.verify(token, JWT_SECRET, (err, decoded) => {
    if (err) {
      socket.write('HTTP/1.1 403 Forbidden\r\n\r\n');
      socket.destroy();
      return;
    }

    wss.handleUpgrade(request, socket, head, (ws) => {
      ws.userId = decoded.userId;
      ws.username = decoded.username;
      wss.emit('connection', ws, request);
    });
  });
});

wss.on('connection', (ws) => {
  const userId = ws.userId;
  
  // Register active socket connection for this user
  if (!userConnections.has(userId)) {
    userConnections.set(userId, new Set());
  }
  userConnections.get(userId).add(ws);

  console.log(`WebSocket client connected: ${ws.username} (${userId})`);

  ws.on('message', (messageString) => {
    try {
      const { action, payload } = JSON.parse(messageString);
      
      switch (action) {
        case 'join_project':
          ws.currentProjectId = payload.projectId;
          console.log(`User ${ws.username} joined project room: ${payload.projectId}`);
          break;
        case 'leave_project':
          console.log(`User ${ws.username} left project room: ${ws.currentProjectId}`);
          ws.currentProjectId = null;
          break;
        default:
          console.warn(`Unknown WS action: ${action}`);
      }
    } catch (err) {
      console.error('Error handling WebSocket message:', err);
    }
  });

  ws.on('close', () => {
    console.log(`WebSocket client disconnected: ${ws.username}`);
    const connections = userConnections.get(userId);
    if (connections) {
      connections.delete(ws);
      if (connections.size === 0) {
        userConnections.delete(userId);
      }
    }
  });
});

// Start listening
server.listen(PORT, () => {
  console.log(`Express API & WebSockets server running on port ${PORT}`);
});
