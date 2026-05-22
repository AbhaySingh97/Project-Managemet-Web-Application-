import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import KanbanBoard from '../components/KanbanBoard';
import InviteModal from '../components/InviteModal';
import TaskModal from '../components/TaskModal';
import { Users, UserPlus, Filter, Trash2, Calendar, Shield, Search, ArrowLeft } from 'lucide-react';

export default function ProjectDetail({ projectId, onGoBack }) {
  const { user, apiFetch } = useAuth();
  const { joinProject, leaveProject, addListener } = useSocket();

  // Core Data States
  const [project, setProject] = useState(null);
  const [columns, setColumns] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Modals Toggles
  const [inviteOpen, setInviteOpen] = useState(false);
  const [activeTask, setActiveTask] = useState(null);
  const [taskModalOpen, setTaskModalOpen] = useState(false);

  // Filter States
  const [search, setSearch] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');
  const [assigneeFilter, setAssigneeFilter] = useState('');

  // Initial Data Fetch
  const loadProjectData = async () => {
    setLoading(true);
    try {
      const proj = await apiFetch(`/projects/${projectId}`);
      setProject(proj);

      const cols = await apiFetch(`/columns?projectId=${projectId}`);
      setColumns(cols);

      const tks = await apiFetch(`/tasks?projectId=${projectId}`);
      setTasks(tks);

      setError(null);
    } catch (err) {
      setError(err.message || 'Failed to load project details');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProjectData();
  }, [projectId]);

  // Handle WebSocket Room Subscriptions
  useEffect(() => {
    joinProject(projectId);
    return () => {
      leaveProject();
    };
  }, [projectId]);

  // Bind WebSocket real-time event syncs
  useEffect(() => {
    const removeTaskCreated = addListener('TASK_CREATED', (newTask) => {
      setTasks(prev => {
        if (prev.some(t => t.id === newTask.id)) return prev;
        return [...prev, newTask];
      });
    });

    const removeTaskUpdated = addListener('TASK_UPDATED', (updatedTask) => {
      setTasks(prev => prev.map(t => t.id === updatedTask.id ? updatedTask : t));
      // Update details modal if it's currently open on this task
      setActiveTask(prev => prev && prev.id === updatedTask.id ? updatedTask : prev);
    });

    const removeTaskDeleted = addListener('TASK_DELETED', (payload) => {
      setTasks(prev => prev.filter(t => t.id !== payload.taskId));
      setActiveTask(prev => prev && prev.id === payload.taskId ? null : prev);
    });

    const removeColumnCreated = addListener('COLUMN_CREATED', (newCol) => {
      setColumns(prev => {
        if (prev.some(c => c.id === newCol.id)) return prev;
        return [...prev, newCol].sort((a,b) => a.position - b.position);
      });
    });

    const removeColumnUpdated = addListener('COLUMN_UPDATED', (updatedCol) => {
      setColumns(prev => prev.map(c => c.id === updatedCol.id ? updatedCol : c).sort((a,b) => a.position - b.position));
    });

    const removeColumnDeleted = addListener('COLUMN_DELETED', (payload) => {
      setColumns(prev => prev.filter(c => c.id !== payload.columnId));
      setTasks(prev => prev.filter(t => t.columnId !== payload.columnId));
    });

    const removeMemberAdded = addListener('MEMBER_ADDED', (payload) => {
      setProject(prev => {
        if (!prev) return prev;
        if (prev.members.some(m => m.id === payload.member.id)) return prev;
        return {
          ...prev,
          members: [...prev.members, payload.member]
        };
      });
    });

    const removeMemberRemoved = addListener('MEMBER_REMOVED', (payload) => {
      setProject(prev => {
        if (!prev) return prev;
        return {
          ...prev,
          members: prev.members.filter(m => m.id !== payload.userId)
        };
      });

      // If user was removed themselves, kick them back to dashboard
      if (payload.userId === user.id) {
        onGoBack();
      }
    });

    return () => {
      removeTaskCreated();
      removeTaskUpdated();
      removeTaskDeleted();
      removeColumnCreated();
      removeColumnUpdated();
      removeColumnDeleted();
      removeMemberAdded();
      removeMemberRemoved();
    };
  }, [addListener, user.id]);

  // Operations: columns and tasks
  const handleAddColumn = async (name) => {
    try {
      await apiFetch('/columns', {
        method: 'POST',
        body: JSON.stringify({ projectId, name })
      });
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteColumn = async (columnId) => {
    try {
      await apiFetch(`/columns/${columnId}`, { method: 'DELETE' });
    } catch (err) {
      console.error(err);
    }
  };

  const handleRenameColumn = async (columnId, name) => {
    try {
      await apiFetch(`/columns/${columnId}`, {
        method: 'PUT',
        body: JSON.stringify({ name })
      });
    } catch (err) {
      console.error(err);
    }
  };

  const handleCreateTask = async (columnId, title) => {
    try {
      await apiFetch('/tasks', {
        method: 'POST',
        body: JSON.stringify({ columnId, title })
      });
    } catch (err) {
      console.error(err);
    }
  };

  const handleTaskMoved = async (taskId, targetColumnId) => {
    try {
      // Optimistic update for local UI smoothness
      setTasks(prev => prev.map(t => t.id === taskId ? { ...t, columnId: targetColumnId } : t));

      await apiFetch(`/tasks/${taskId}`, {
        method: 'PUT',
        body: JSON.stringify({ columnId: targetColumnId, position: 0 })
      });
    } catch (err) {
      console.error(err);
      // Reload from DB in case of failure to maintain consistency
      loadProjectData();
    }
  };

  const handleOpenTaskDetails = (task) => {
    setActiveTask(task);
    setTaskModalOpen(true);
  };

  const handleUpdateTaskDetails = (updatedTask) => {
    setTasks(prev => prev.map(t => t.id === updatedTask.id ? updatedTask : t));
    setActiveTask(updatedTask);
  };

  const handleDeleteTask = async (taskId) => {
    try {
      await apiFetch(`/tasks/${taskId}`, { method: 'DELETE' });
      setTaskModalOpen(false);
      setActiveTask(null);
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteProject = async () => {
    if (!window.confirm('Are you absolutely sure you want to archive this space board? All lanes, cards, and discussion threads will be permanently erased.')) return;
    try {
      await apiFetch(`/projects/${projectId}`, { method: 'DELETE' });
      onGoBack();
    } catch (err) {
      console.error(err);
    }
  };

  if (loading) {
    return (
      <div className="main-content" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px' }}>
          <span style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Syncing space board...</span>
        </div>
      </div>
    );
  }

  if (error || !project) {
    return (
      <div className="main-content" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', padding: '40px' }}>
        <div className="glass-panel" style={{ padding: '40px', borderRadius: '16px', textAlign: 'center', maxWidth: '500px' }}>
          <h3 style={{ color: 'var(--priority-high)', marginBottom: '10px' }}>Failed to access space board</h3>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '20px' }}>
            {error || 'This space board does not exist or you lack collaboration authorization.'}
          </p>
          <button onClick={onGoBack} className="btn btn-secondary">
            <ArrowLeft size={16} />
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  const isOwner = project.ownerId === user.id;

  return (
    <div className="main-content">
      {/* Board Top Toolbar Header */}
      <div 
        className="glass-panel" 
        style={{
          padding: '24px 40px',
          borderTop: 'none',
          borderLeft: 'none',
          borderRight: 'none',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '20px',
          background: 'linear-gradient(180deg, rgba(99, 102, 241, 0.02) 0%, transparent 100%)'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <button onClick={onGoBack} className="btn btn-secondary btn-icon" title="Go back to Dashboard">
            <ArrowLeft size={16} />
          </button>
          <div>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 700 }}>{project.name}</h2>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
              {project.description || 'Collaborative workspace.'}
            </p>
          </div>
        </div>

        {/* Board Collaborators Area */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Collaborators
            </span>
            <div className="avatar-stack">
              {project.members.map(m => (
                <div 
                  key={m.id} 
                  className="avatar" 
                  title={`${m.username} ${m.id === project.ownerId ? '(Owner)' : ''}`}
                  style={{
                    background: m.id === project.ownerId ? 'linear-gradient(135deg, #6366f1, #8b5cf6)' : 'linear-gradient(135deg, #06b6d4, #ec4899)'
                  }}
                >
                  {m.username.slice(0, 2).toUpperCase()}
                </div>
              ))}
            </div>
            <button onClick={() => setInviteOpen(true)} className="btn btn-secondary btn-icon" style={{ width: '28px', height: '28px', borderRadius: '50%' }} title="Add Collaborator">
              <UserPlus size={12} />
            </button>
          </div>

          {isOwner && (
            <button onClick={handleDeleteProject} className="btn btn-danger" style={{ padding: '8px 12px', fontSize: '0.8rem' }} title="Archive Space Board">
              <Trash2 size={14} />
              Archive Space Board
            </button>
          )}
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div style={{
        display: 'flex',
        padding: '16px 40px 0 40px',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '16px'
      }}>
        {/* Search Field */}
        <div style={{ position: 'relative', width: '260px' }}>
          <Search size={14} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input 
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search cards..."
            className="input-field"
            style={{ paddingLeft: '36px', fontSize: '0.85rem', paddingTop: '8px', paddingBottom: '8px' }}
          />
        </div>

        {/* Option Selects for Priority / Assignee */}
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Filter size={12} style={{ color: 'var(--text-muted)' }} />
            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
              className="input-field select-field"
              style={{ padding: '6px 36px 6px 12px', fontSize: '0.8rem', width: '130px', backgroundPosition: 'right 8px center' }}
            >
              <option value="">All Priorities</option>
              <option value="Low">Low</option>
              <option value="Medium">Medium</option>
              <option value="High">High</option>
            </select>
          </div>

          <select
            value={assigneeFilter}
            onChange={(e) => setAssigneeFilter(e.target.value)}
            className="input-field select-field"
            style={{ padding: '6px 36px 6px 12px', fontSize: '0.8rem', width: '150px', backgroundPosition: 'right 8px center' }}
          >
            <option value="">All Assignees</option>
            {project.members.map(m => (
              <option key={m.id} value={m.id}>{m.username}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Main Kanban Board component */}
      <KanbanBoard 
        projectId={projectId}
        columns={columns}
        tasks={tasks}
        onTaskMoved={handleTaskMoved}
        onOpenTaskDetails={handleOpenTaskDetails}
        onAddColumn={handleAddColumn}
        onDeleteColumn={handleDeleteColumn}
        onRenameColumn={handleRenameColumn}
        onCreateTask={handleCreateTask}
        filters={{
          search,
          priority: priorityFilter,
          assigneeId: assigneeFilter
        }}
      />

      {/* Collaborator Addition Overlay Modal */}
      <InviteModal 
        open={inviteOpen}
        onClose={() => setInviteOpen(false)}
        projectId={projectId}
        onMemberAdded={(newMembers) => setProject(prev => prev ? { ...prev, members: newMembers } : null)}
      />

      {/* Task Details Editor Modal */}
      <TaskModal 
        open={taskModalOpen}
        onClose={() => { setTaskModalOpen(false); setActiveTask(null); }}
        task={activeTask}
        projectMembers={project.members}
        onUpdateTask={handleUpdateTaskDetails}
        onDeleteTask={handleDeleteTask}
      />
    </div>
  );
}
