import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DB_FILE = path.join(__dirname, 'data.json');

// Memory cache
let dbData = {
  users: [],
  projects: [],
  project_members: [],
  columns: [],
  tasks: [],
  comments: [],
  notifications: []
};

// Simple write queue to avoid race conditions during concurrent writes
let isWriting = false;
let pendingWrite = null;

async function loadDB() {
  try {
    const data = await fs.readFile(DB_FILE, 'utf8');
    dbData = JSON.parse(data);
    // Ensure all tables exist in loaded data
    dbData.users = dbData.users || [];
    dbData.projects = dbData.projects || [];
    dbData.project_members = dbData.project_members || [];
    dbData.columns = dbData.columns || [];
    dbData.tasks = dbData.tasks || [];
    dbData.comments = dbData.comments || [];
    dbData.notifications = dbData.notifications || [];
  } catch (error) {
    // If file doesn't exist, create it with default data structure
    await saveDBForce();
  }
}

async function saveDB() {
  if (isWriting) {
    // If a write is in progress, queue another one
    if (!pendingWrite) {
      pendingWrite = new Promise((resolve) => {
        const check = setInterval(async () => {
          if (!isWriting) {
            clearInterval(check);
            await saveDBForce();
            resolve();
          }
        }, 10);
      });
    }
    return pendingWrite;
  }
  return saveDBForce();
}

async function saveDBForce() {
  isWriting = true;
  try {
    await fs.mkdir(path.dirname(DB_FILE), { recursive: true });
    await fs.writeFile(DB_FILE, JSON.stringify(dbData, null, 2), 'utf8');
  } catch (err) {
    console.error('Failed to write database file:', err);
  } finally {
    isWriting = false;
    pendingWrite = null;
  }
}

// Initial DB load
await loadDB();

// Helper to generate IDs
const generateId = () => Math.random().toString(36).substr(2, 9);

export const db = {
  users: {
    findMany: async (filter = {}) => {
      return dbData.users.filter(u => Object.entries(filter).every(([k, v]) => u[k] === v));
    },
    findOne: async (filter = {}) => {
      const users = await db.users.findMany(filter);
      return users[0] || null;
    },
    create: async (userData) => {
      const newUser = {
        id: generateId(),
        username: userData.username,
        email: userData.email,
        passwordHash: userData.passwordHash,
        createdAt: new Date().toISOString()
      };
      dbData.users.push(newUser);
      await saveDB();
      return newUser;
    },
    update: async (id, updateData) => {
      const idx = dbData.users.findIndex(u => u.id === id);
      if (idx === -1) return null;
      dbData.users[idx] = { ...dbData.users[idx], ...updateData };
      await saveDB();
      return dbData.users[idx];
    }
  },

  projects: {
    findMany: async (filter = {}) => {
      return dbData.projects.filter(p => Object.entries(filter).every(([k, v]) => p[k] === v));
    },
    // Returns projects where the user is either the owner OR a collaborator (member)
    getUserProjects: async (userId) => {
      const owned = dbData.projects.filter(p => p.ownerId === userId);
      const memberProjectIds = dbData.project_members
        .filter(m => m.userId === userId)
        .map(m => m.projectId);
      const memberProjects = dbData.projects.filter(p => memberProjectIds.includes(p.id) && p.ownerId !== userId);
      
      const allProjects = [...owned, ...memberProjects];
      
      // Populate owner info and members info
      return Promise.all(allProjects.map(async (project) => {
        const owner = await db.users.findOne({ id: project.ownerId });
        const membersList = dbData.project_members.filter(m => m.projectId === project.id);
        const members = await Promise.all(membersList.map(m => db.users.findOne({ id: m.userId })));
        
        return {
          ...project,
          owner: owner ? { id: owner.id, username: owner.username, email: owner.email } : null,
          members: members.filter(Boolean).map(m => ({ id: m.id, username: m.username, email: m.email }))
        };
      }));
    },
    findOne: async (filter = {}) => {
      const projects = await db.projects.findMany(filter);
      const project = projects[0] || null;
      if (!project) return null;

      // Populate owner and members
      const owner = await db.users.findOne({ id: project.ownerId });
      const membersList = dbData.project_members.filter(m => m.projectId === project.id);
      const members = await Promise.all(membersList.map(m => db.users.findOne({ id: m.userId })));

      return {
        ...project,
        owner: owner ? { id: owner.id, username: owner.username, email: owner.email } : null,
        members: members.filter(Boolean).map(m => ({ id: m.id, username: m.username, email: m.email }))
      };
    },
    create: async (projectData) => {
      const newProject = {
        id: generateId(),
        name: projectData.name,
        description: projectData.description || '',
        ownerId: projectData.ownerId,
        createdAt: new Date().toISOString()
      };
      dbData.projects.push(newProject);
      
      // Auto add owner as a member
      dbData.project_members.push({
        projectId: newProject.id,
        userId: projectData.ownerId
      });

      // Automatically create a few default board columns
      const defaultColumns = ['To Do', 'In Progress', 'Done'];
      for (let i = 0; i < defaultColumns.length; i++) {
        dbData.columns.push({
          id: generateId(),
          projectId: newProject.id,
          name: defaultColumns[i],
          position: i
        });
      }

      await saveDB();
      return newProject;
    },
    update: async (id, updateData) => {
      const idx = dbData.projects.findIndex(p => p.id === id);
      if (idx === -1) return null;
      dbData.projects[idx] = { ...dbData.projects[idx], ...updateData };
      await saveDB();
      return dbData.projects[idx];
    },
    delete: async (id) => {
      dbData.projects = dbData.projects.filter(p => p.id !== id);
      dbData.project_members = dbData.project_members.filter(m => m.projectId !== id);
      dbData.columns = dbData.columns.filter(c => c.projectId !== id);
      // Delete tasks inside project
      const projectColumns = dbData.columns.filter(c => c.projectId === id).map(c => c.id);
      const projectTasks = dbData.tasks.filter(t => projectColumns.includes(t.columnId));
      const projectTaskIds = projectTasks.map(t => t.id);
      dbData.tasks = dbData.tasks.filter(t => !projectTaskIds.includes(t.id));
      dbData.comments = dbData.comments.filter(c => !projectTaskIds.includes(c.taskId));
      await saveDB();
      return true;
    },
    addMember: async (projectId, userId) => {
      const exists = dbData.project_members.some(m => m.projectId === projectId && m.userId === userId);
      if (!exists) {
        dbData.project_members.push({ projectId, userId });
        await saveDB();
      }
      return true;
    },
    removeMember: async (projectId, userId) => {
      dbData.project_members = dbData.project_members.filter(m => !(m.projectId === projectId && m.userId === userId));
      await saveDB();
      return true;
    }
  },

  columns: {
    findMany: async (filter = {}) => {
      const cols = dbData.columns.filter(c => Object.entries(filter).every(([k, v]) => c[k] === v));
      return cols.sort((a, b) => a.position - b.position);
    },
    findOne: async (filter = {}) => {
      const cols = await db.columns.findMany(filter);
      return cols[0] || null;
    },
    create: async (colData) => {
      // Find max position
      const siblingCols = dbData.columns.filter(c => c.projectId === colData.projectId);
      const maxPosition = siblingCols.reduce((max, c) => c.position > max ? c.position : max, -1);
      
      const newCol = {
        id: generateId(),
        projectId: colData.projectId,
        name: colData.name,
        position: maxPosition + 1
      };
      dbData.columns.push(newCol);
      await saveDB();
      return newCol;
    },
    update: async (id, updateData) => {
      const idx = dbData.columns.findIndex(c => c.id === id);
      if (idx === -1) return null;
      dbData.columns[idx] = { ...dbData.columns[idx], ...updateData };
      await saveDB();
      return dbData.columns[idx];
    },
    delete: async (id) => {
      dbData.columns = dbData.columns.filter(c => c.id !== id);
      // Remove tasks associated with this column
      const tasksInCol = dbData.tasks.filter(t => t.columnId === id);
      const taskIds = tasksInCol.map(t => t.id);
      dbData.tasks = dbData.tasks.filter(t => t.columnId !== id);
      dbData.comments = dbData.comments.filter(c => !taskIds.includes(c.taskId));
      await saveDB();
      return true;
    }
  },

  tasks: {
    findMany: async (filter = {}) => {
      const tasksList = dbData.tasks.filter(t => Object.entries(filter).every(([k, v]) => t[k] === v));
      const sorted = tasksList.sort((a, b) => a.position - b.position);
      
      return Promise.all(sorted.map(async (task) => {
        const assignee = task.assigneeId ? await db.users.findOne({ id: task.assigneeId }) : null;
        const commentsCount = dbData.comments.filter(c => c.taskId === task.id).length;
        return {
          ...task,
          assignee: assignee ? { id: assignee.id, username: assignee.username, email: assignee.email } : null,
          commentsCount
        };
      }));
    },
    findOne: async (filter = {}) => {
      const tasks = await dbData.tasks.filter(t => Object.entries(filter).every(([k, v]) => t[k] === v));
      const task = tasks[0] || null;
      if (!task) return null;

      const assignee = task.assigneeId ? await db.users.findOne({ id: task.assigneeId }) : null;
      const commentsCount = dbData.comments.filter(c => c.taskId === task.id).length;

      return {
        ...task,
        assignee: assignee ? { id: assignee.id, username: assignee.username, email: assignee.email } : null,
        commentsCount
      };
    },
    create: async (taskData) => {
      const siblingTasks = dbData.tasks.filter(t => t.columnId === taskData.columnId);
      const maxPosition = siblingTasks.reduce((max, t) => t.position > max ? t.position : max, -1);

      const newTask = {
        id: generateId(),
        columnId: taskData.columnId,
        title: taskData.title,
        description: taskData.description || '',
        assigneeId: taskData.assigneeId || null,
        priority: taskData.priority || 'Medium', // Low, Medium, High
        dueDate: taskData.dueDate || null,
        position: maxPosition + 1,
        createdAt: new Date().toISOString()
      };
      dbData.tasks.push(newTask);
      await saveDB();
      
      return db.tasks.findOne({ id: newTask.id });
    },
    update: async (id, updateData) => {
      const idx = dbData.tasks.findIndex(t => t.id === id);
      if (idx === -1) return null;
      dbData.tasks[idx] = { ...dbData.tasks[idx], ...updateData };
      await saveDB();
      return db.tasks.findOne({ id });
    },
    delete: async (id) => {
      dbData.tasks = dbData.tasks.filter(t => t.id !== id);
      dbData.comments = dbData.comments.filter(c => c.taskId !== id);
      await saveDB();
      return true;
    }
  },

  comments: {
    findMany: async (filter = {}) => {
      const commentsList = dbData.comments.filter(c => Object.entries(filter).every(([k, v]) => c[k] === v));
      const sorted = commentsList.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
      
      return Promise.all(sorted.map(async (comment) => {
        const user = await db.users.findOne({ id: comment.userId });
        return {
          ...comment,
          user: user ? { id: user.id, username: user.username, email: user.email } : null
        };
      }));
    },
    create: async (commentData) => {
      const newComment = {
        id: generateId(),
        taskId: commentData.taskId,
        userId: commentData.userId,
        content: commentData.content,
        createdAt: new Date().toISOString()
      };
      dbData.comments.push(newComment);
      await saveDB();

      const user = await db.users.findOne({ id: newComment.userId });
      return {
        ...newComment,
        user: user ? { id: user.id, username: user.username, email: user.email } : null
      };
    }
  },

  notifications: {
    findMany: async (filter = {}) => {
      const notifs = dbData.notifications.filter(n => Object.entries(filter).every(([k, v]) => n[k] === v));
      return notifs.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    },
    create: async (notifData) => {
      const newNotif = {
        id: generateId(),
        userId: notifData.userId,
        message: notifData.message,
        type: notifData.type || 'info', // assignment, comment, update, info
        read: false,
        projectId: notifData.projectId || null,
        taskId: notifData.taskId || null,
        createdAt: new Date().toISOString()
      };
      dbData.notifications.push(newNotif);
      await saveDB();
      return newNotif;
    },
    markAsRead: async (id) => {
      const idx = dbData.notifications.findIndex(n => n.id === id);
      if (idx !== -1) {
        dbData.notifications[idx].read = true;
        await saveDB();
      }
      return true;
    },
    markAllAsRead: async (userId) => {
      dbData.notifications.forEach(n => {
        if (n.userId === userId) {
          n.read = true;
        }
      });
      await saveDB();
      return true;
    }
  }
};
