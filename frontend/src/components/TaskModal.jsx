import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import { X, Calendar, User, Clock, Trash2, Send, MessageSquare } from 'lucide-react';

export default function TaskModal({ open, onClose, task, projectMembers, onUpdateTask, onDeleteTask }) {
  if (!open || !task) return null;

  const { apiFetch, user } = useAuth();
  const { addListener } = useSocket();

  // Local Task State
  const [title, setTitle] = useState(task.title);
  const [description, setDescription] = useState(task.description);
  const [assigneeId, setAssigneeId] = useState(task.assigneeId || '');
  const [priority, setPriority] = useState(task.priority);
  const [dueDate, setDueDate] = useState(task.dueDate || '');

  // Comments State
  const [comments, setComments] = useState([]);
  const [newCommentContent, setNewCommentContent] = useState('');
  const [loadingComments, setLoadingComments] = useState(false);
  const [savingComment, setSavingComment] = useState(false);

  const commentsEndRef = useRef(null);

  // Load comments
  const loadComments = async () => {
    setLoadingComments(true);
    try {
      const list = await apiFetch(`/comments?taskId=${task.id}`);
      setComments(list);
    } catch (err) {
      console.error('Failed to load comments:', err);
    } finally {
      setLoadingComments(false);
    }
  };

  useEffect(() => {
    setTitle(task.title);
    setDescription(task.description);
    setAssigneeId(task.assigneeId || '');
    setPriority(task.priority);
    setDueDate(task.dueDate ? task.dueDate.split('T')[0] : '');
    
    loadComments();
  }, [task]);

  // Scroll to bottom of comments on update
  useEffect(() => {
    commentsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [comments]);

  // Listen for live comment additions
  useEffect(() => {
    const removeCommentListener = addListener('COMMENT_ADDED', (payload) => {
      if (payload.taskId === task.id) {
        setComments(prev => {
          // Avoid duplicates
          if (prev.some(c => c.id === payload.comment.id)) return prev;
          return [...prev, payload.comment];
        });
      }
    });

    return () => removeCommentListener();
  }, [addListener, task.id]);

  // Trigger changes on blur or select changes
  const triggerUpdate = async (updatedFields) => {
    try {
      const updatedTask = await apiFetch(`/tasks/${task.id}`, {
        method: 'PUT',
        body: JSON.stringify(updatedFields)
      });
      onUpdateTask(updatedTask);
    } catch (err) {
      console.error('Failed to update task:', err);
    }
  };

  const handleTitleBlur = () => {
    if (title.trim() && title.trim() !== task.title) {
      triggerUpdate({ title: title.trim() });
    }
  };

  const handleDescBlur = () => {
    if (description.trim() !== task.description) {
      triggerUpdate({ description: description.trim() });
    }
  };

  const handleAssigneeChange = (e) => {
    const val = e.target.value;
    setAssigneeId(val);
    triggerUpdate({ assigneeId: val || null });
  };

  const handlePriorityChange = (e) => {
    const val = e.target.value;
    setPriority(val);
    triggerUpdate({ priority: val });
  };

  const handleDueDateChange = (e) => {
    const val = e.target.value;
    setDueDate(val);
    triggerUpdate({ dueDate: val || null });
  };

  const submitComment = async (e) => {
    e.preventDefault();
    if (!newCommentContent.trim() || savingComment) return;

    setSavingComment(true);
    try {
      const added = await apiFetch('/comments', {
        method: 'POST',
        body: JSON.stringify({
          taskId: task.id,
          content: newCommentContent.trim()
        })
      });

      setComments(prev => [...prev, added]);
      setNewCommentContent('');
    } catch (err) {
      console.error('Failed to add comment:', err);
    } finally {
      setSavingComment(false);
    }
  };

  const getInitials = (name) => {
    if (!name) return 'U';
    return name.slice(0, 2).toUpperCase();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div 
        className="modal-container"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: '800px', height: '85vh' }}
      >
        {/* Modal Header */}
        <div className="modal-header">
          <input 
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onBlur={handleTitleBlur}
            onKeyDown={(e) => e.key === 'Enter' && e.target.blur()}
            className="input-field"
            style={{
              background: 'transparent',
              border: '1px solid transparent',
              fontSize: '1.25rem',
              fontWeight: 700,
              padding: '4px 8px',
              fontFamily: 'var(--font-display)',
              width: '90%'
            }}
          />
          <button onClick={onClose} className="modal-close">
            <X size={18} />
          </button>
        </div>

        {/* Modal Dual Column Body */}
        <div className="modal-body" style={{ display: 'flex', gap: '30px', padding: '24px' }}>
          
          {/* Left Column: Descriptions & Comments */}
          <div style={{ flex: 1.6, display: 'flex', flexDirection: 'column', gap: '24px' }}>
            
            {/* Description Area */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <span className="form-label" style={{ fontSize: '0.8rem' }}>Description</span>
              <textarea 
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                onBlur={handleDescBlur}
                className="input-field"
                placeholder="Add a more detailed description..."
                style={{ minHeight: '120px', resize: 'vertical', fontSize: '0.9rem' }}
              />
            </div>

            {/* Live Comments Thread */}
            <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: '250px' }}>
              <span className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', marginBottom: '12px' }}>
                <MessageSquare size={14} />
                Discussion Thread
              </span>

              {/* Comments Scroller */}
              <div 
                className="glass-card"
                style={{
                  flex: 1,
                  overflowY: 'auto',
                  padding: '16px',
                  borderRadius: '12px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '16px',
                  background: 'rgba(10, 14, 23, 0.4)',
                  maxHeight: '280px'
                }}
              >
                {loadingComments ? (
                  <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Loading thread...</span>
                ) : comments.length === 0 ? (
                  <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', textAlign: 'center', margin: 'auto' }}>
                    No comments yet. Start the conversation!
                  </span>
                ) : (
                  comments.map((comment) => (
                    <div key={comment.id} style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                      <div className="avatar" style={{ width: '28px', height: '28px', fontSize: '0.65rem', flexShrink: 0 }}>
                        {getInitials(comment.user?.username)}
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
                          <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>{comment.user?.username}</span>
                          <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                            {new Date(comment.createdAt).toLocaleDateString()} at {new Date(comment.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                          </span>
                        </div>
                        <p style={{
                          fontSize: '0.85rem',
                          color: 'var(--text-main)',
                          background: 'rgba(255,255,255,0.03)',
                          border: '1px solid var(--border-glass)',
                          padding: '10px 14px',
                          borderRadius: '12px',
                          borderTopLeftRadius: '2px',
                          lineHeight: '1.4'
                        }}>
                          {comment.content}
                        </p>
                      </div>
                    </div>
                  ))
                )}
                <div ref={commentsEndRef} />
              </div>

              {/* Comments Typing Area */}
              <form onSubmit={submitComment} style={{ display: 'flex', gap: '10px', marginTop: '12px' }}>
                <input 
                  type="text"
                  value={newCommentContent}
                  onChange={(e) => setNewCommentContent(e.target.value)}
                  placeholder="Type your message..."
                  className="input-field"
                  style={{ fontSize: '0.85rem' }}
                  disabled={savingComment}
                  required
                />
                <button type="submit" className="btn btn-primary btn-icon" disabled={savingComment || !newCommentContent.trim()}>
                  <Send size={16} />
                </button>
              </form>
            </div>

          </div>

          {/* Right Column: Settings & Attributes */}
          <div style={{ flex: 0.8, display: 'flex', flexDirection: 'column', gap: '20px' }}>
            
            {/* Assignee Selection */}
            <div className="form-group">
              <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <User size={14} />
                Assignee
              </label>
              <select 
                value={assigneeId}
                onChange={handleAssigneeChange}
                className="input-field select-field"
                style={{ fontSize: '0.85rem' }}
              >
                <option value="">Unassigned</option>
                {projectMembers.map(member => (
                  <option key={member.id} value={member.id}>
                    {member.username} ({member.email})
                  </option>
                ))}
              </select>
            </div>

            {/* Priority Selection */}
            <div className="form-group">
              <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Clock size={14} />
                Priority
              </label>
              <select 
                value={priority}
                onChange={handlePriorityChange}
                className="input-field select-field"
                style={{ fontSize: '0.85rem' }}
              >
                <option value="Low">Low</option>
                <option value="Medium">Medium</option>
                <option value="High">High</option>
              </select>
            </div>

            {/* Due Date Selection */}
            <div className="form-group">
              <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Calendar size={14} />
                Due Date
              </label>
              <input 
                type="date"
                value={dueDate}
                onChange={handleDueDateChange}
                className="input-field"
                style={{ fontSize: '0.85rem' }}
              />
            </div>

            {/* Action Triggers */}
            <div style={{ borderTop: '1px solid var(--border-glass)', paddingTop: '20px', marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <button 
                type="button"
                onClick={() => onDeleteTask(task.id)}
                className="btn btn-danger"
                style={{ width: '100%', justifyContent: 'center' }}
              >
                <Trash2 size={16} />
                Delete Card
              </button>
            </div>

          </div>

        </div>
      </div>
    </div>
  );
}
