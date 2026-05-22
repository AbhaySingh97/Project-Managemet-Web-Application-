import React, { useState } from 'react';
import TaskCard from './TaskCard';
import { Plus, Trash2, Edit2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function KanbanBoard({ 
  projectId, 
  columns, 
  tasks, 
  onTaskMoved, 
  onOpenTaskDetails,
  onAddColumn,
  onDeleteColumn,
  onRenameColumn,
  onCreateTask,
  filters
}) {
  const { apiFetch } = useAuth();
  const [newColName, setNewColName] = useState('');
  const [addingCol, setAddingCol] = useState(false);
  const [renamingColId, setRenamingColId] = useState(null);
  const [renameValue, setRenameValue] = useState('');

  // Track drag target column to render gorgeous border highlights
  const [activeDragColumnId, setActiveDragColumnId] = useState(null);

  // Quick Inline Task Creator per Column
  const [activeTaskCreatorColId, setActiveTaskCreatorColId] = useState(null);
  const [newTaskTitle, setNewTaskTitle] = useState('');

  const handleDragOver = (e, colId) => {
    e.preventDefault();
    if (activeDragColumnId !== colId) {
      setActiveDragColumnId(colId);
    }
  };

  const handleDragLeave = (e) => {
    setActiveDragColumnId(null);
  };

  const handleDrop = (e, targetColumnId) => {
    e.preventDefault();
    setActiveDragColumnId(null);
    const taskId = e.dataTransfer.getData('text/plain');
    if (!taskId) return;
    
    onTaskMoved(taskId, targetColumnId);
  };

  const submitColumn = (e) => {
    e.preventDefault();
    if (!newColName.trim()) return;
    onAddColumn(newColName.trim());
    setNewColName('');
    setAddingCol(false);
  };

  const startRename = (col) => {
    setRenamingColId(col.id);
    setRenameValue(col.name);
  };

  const submitRename = (colId) => {
    if (!renameValue.trim()) return;
    onRenameColumn(colId, renameValue.trim());
    setRenamingColId(null);
  };

  const submitInlineTask = async (e, colId) => {
    e.preventDefault();
    if (!newTaskTitle.trim()) return;
    await onCreateTask(colId, newTaskTitle.trim());
    setNewTaskTitle('');
    setActiveTaskCreatorColId(null);
  };

  // Filter Tasks
  const filteredTasks = tasks.filter(task => {
    // Priority filter
    if (filters.priority && task.priority.toLowerCase() !== filters.priority.toLowerCase()) {
      return false;
    }
    // Assignee filter
    if (filters.assigneeId && task.assigneeId !== filters.assigneeId) {
      return false;
    }
    // Search query filter
    if (filters.search && !task.title.toLowerCase().includes(filters.search.toLowerCase()) && !task.description.toLowerCase().includes(filters.search.toLowerCase())) {
      return false;
    }
    return true;
  });

  return (
    <div style={{
      display: 'flex',
      gap: '24px',
      padding: '40px',
      overflowX: 'auto',
      flex: 1,
      alignItems: 'flex-start'
    }}>
      {/* Dynamic Columns List */}
      {columns.map(col => {
        const colTasks = filteredTasks.filter(t => t.columnId === col.id);
        const isDragOver = activeDragColumnId === col.id;
        const isCreatingTask = activeTaskCreatorColId === col.id;

        return (
          <div 
            key={col.id}
            onDragOver={(e) => handleDragOver(e, col.id)}
            onDragLeave={handleDragLeave}
            onDrop={(e) => handleDrop(e, col.id)}
            className="glass-panel"
            style={{
              width: '320px',
              borderRadius: '16px',
              padding: '20px',
              display: 'flex',
              flexDirection: 'column',
              maxHeight: '100%',
              flexShrink: 0,
              border: isDragOver ? '2px dashed var(--primary)' : '1px solid var(--border-glass)',
              boxShadow: isDragOver ? 'var(--shadow-neon)' : 'var(--shadow-card)',
              transition: 'border 0.2s ease, box-shadow 0.2s ease',
              background: 'rgba(13, 17, 28, 0.4)'
            }}
          >
            {/* Column Header */}
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '16px'
            }}>
              {renamingColId === col.id ? (
                <input 
                  type="text"
                  value={renameValue}
                  onChange={(e) => setRenameValue(e.target.value)}
                  onBlur={() => submitRename(col.id)}
                  onKeyDown={(e) => e.key === 'Enter' && submitRename(col.id)}
                  className="input-field"
                  style={{ padding: '4px 8px', fontSize: '0.9rem' }}
                  autoFocus
                />
              ) : (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', overflow: 'hidden' }}>
                  <h3 
                    onClick={() => startRename(col)}
                    style={{
                      fontSize: '1rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      color: 'var(--text-main)'
                    }}
                    title="Click to rename"
                  >
                    {col.name}
                  </h3>
                  <span style={{
                    fontSize: '0.75rem',
                    background: 'rgba(255, 255, 255, 0.05)',
                    padding: '2px 8px',
                    borderRadius: '20px',
                    color: 'var(--text-secondary)'
                  }}>
                    {colTasks.length}
                  </span>
                </div>
              )}

              {/* Column Actions */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <button 
                  onClick={() => startRename(col)}
                  className="btn btn-secondary" 
                  style={{ padding: 4, background: 'transparent', border: 'none', color: 'var(--text-secondary)' }}
                >
                  <Edit2 size={12} />
                </button>
                <button 
                  onClick={() => onDeleteColumn(col.id)}
                  className="btn btn-danger" 
                  style={{ padding: 4, background: 'transparent', border: 'none', color: 'var(--text-secondary)' }}
                >
                  <Trash2 size={12} />
                </button>
              </div>
            </div>

            {/* Tasks Card Stack */}
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '12px',
              overflowY: 'auto',
              flex: 1,
              padding: '2px'
            }}>
              {colTasks.map(task => (
                <TaskCard 
                  key={task.id} 
                  task={task} 
                  onOpenDetails={onOpenTaskDetails}
                />
              ))}

              {colTasks.length === 0 && !isCreatingTask && (
                <div style={{
                  padding: '30px 10px',
                  textAlign: 'center',
                  color: 'var(--text-muted)',
                  fontSize: '0.8rem',
                  border: '1px dashed rgba(255, 255, 255, 0.04)',
                  borderRadius: '12px',
                  background: 'rgba(255, 255, 255, 0.01)'
                }}>
                  Drop tasks here
                </div>
              )}
            </div>

            {/* Inline Task Creator */}
            <div style={{ marginTop: '16px' }}>
              {isCreatingTask ? (
                <form onSubmit={(e) => submitInlineTask(e, col.id)} style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <input
                    type="text"
                    value={newTaskTitle}
                    onChange={(e) => setNewTaskTitle(e.target.value)}
                    placeholder="What needs to be done?"
                    className="input-field"
                    style={{ fontSize: '0.85rem', padding: '8px 12px' }}
                    required
                    autoFocus
                  />
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button type="submit" className="btn btn-primary" style={{ fontSize: '0.8rem', padding: '6px 12px', flex: 1 }}>
                      Add Card
                    </button>
                    <button 
                      type="button" 
                      onClick={() => { setActiveTaskCreatorColId(null); setNewTaskTitle(''); }}
                      className="btn btn-secondary" 
                      style={{ fontSize: '0.8rem', padding: '6px 12px' }}
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              ) : (
                <button 
                  onClick={() => setActiveTaskCreatorColId(col.id)}
                  className="btn btn-secondary"
                  style={{
                    width: '100%',
                    justifyContent: 'center',
                    fontSize: '0.85rem',
                    background: 'transparent',
                    border: '1px dashed var(--border-glass)'
                  }}
                >
                  <Plus size={14} />
                  Add Card
                </button>
              )}
            </div>
          </div>
        );
      })}

      {/* New Column Form Panel */}
      <div style={{ width: '320px', flexShrink: 0 }}>
        {addingCol ? (
          <form onSubmit={submitColumn} className="glass-panel" style={{ padding: '20px', borderRadius: '16px' }}>
            <div className="form-group" style={{ marginBottom: '12px' }}>
              <label className="form-label" style={{ fontSize: '0.75rem' }}>Lane Title</label>
              <input
                type="text"
                value={newColName}
                onChange={(e) => setNewColName(e.target.value)}
                placeholder="e.g. In Review"
                className="input-field"
                style={{ fontSize: '0.85rem' }}
                required
                autoFocus
              />
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button type="submit" className="btn btn-primary" style={{ fontSize: '0.85rem', flex: 1 }}>
                Create Lane
              </button>
              <button 
                type="button" 
                onClick={() => setAddingCol(false)}
                className="btn btn-secondary"
                style={{ fontSize: '0.85rem' }}
              >
                Cancel
              </button>
            </div>
          </form>
        ) : (
          <button
            onClick={() => setAddingCol(true)}
            className="btn btn-primary"
            style={{
              width: '100%',
              justifyContent: 'center',
              borderRadius: '16px',
              padding: '16px',
              background: 'rgba(255, 255, 255, 0.03)',
              border: '1px dashed var(--border-glass)',
              color: 'var(--text-main)',
              boxShadow: 'none'
            }}
          >
            <Plus size={16} />
            Create Lane
          </button>
        )}
      </div>
    </div>
  );
}
