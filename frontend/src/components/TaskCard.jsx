import { MessageSquare, Calendar, MoreHorizontal, ArrowRight, User } from 'lucide-react';

export default function TaskCard({ task, onOpenDetails }) {
  const getPriorityBadgeClass = (priority) => {
    switch (priority.toLowerCase()) {
      case 'low': return 'badge-low';
      case 'high': return 'badge-high';
      default: return 'badge-medium';
    }
  };

  const getInitials = (username) => {
    if (!username) return 'U';
    return username.slice(0, 2).toUpperCase();
  };

  const handleDragStart = (e) => {
    e.dataTransfer.setData('text/plain', task.id);
    e.dataTransfer.effectAllowed = 'move';
    
    // Add transparent/ghost styling support or simple tracking class
    e.currentTarget.style.opacity = '0.4';
  };

  const handleDragEnd = (e) => {
    e.currentTarget.style.opacity = '1';
  };

  const formatDueDate = (dateStr) => {
    if (!dateStr) return null;
    const date = new Date(dateStr);
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
  };

  return (
    <div 
      className="glass-card"
      draggable
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onClick={() => onOpenDetails(task)}
      style={{
        padding: '16px',
        borderRadius: '12px',
        cursor: 'grab',
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
        animation: 'fadeIn 0.2s ease-out',
        border: '1px solid var(--border-glass)',
        position: 'relative'
      }}
    >
      {/* Priority Badge Indicator */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span className={`badge ${getPriorityBadgeClass(task.priority)}`}>
          {task.priority}
        </span>
        <button 
          className="btn" 
          style={{ padding: 4, background: 'transparent', border: 'none', color: 'var(--text-muted)' }}
          onClick={(e) => { e.stopPropagation(); onOpenDetails(task); }}
        >
          <MoreHorizontal size={14} />
        </button>
      </div>

      {/* Task Content */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
        <h4 style={{
          fontSize: '0.95rem',
          fontWeight: 600,
          color: 'var(--text-main)',
          lineHeight: '1.4'
        }}>
          {task.title}
        </h4>
        {task.description && (
          <p style={{
            fontSize: '0.8rem',
            color: 'var(--text-secondary)',
            lineHeight: '1.5',
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden'
          }}>
            {task.description}
          </p>
        )}
      </div>

      {/* Card Footer Details */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderTop: '1px solid var(--border-glass)',
        paddingTop: '12px',
        marginTop: '4px'
      }}>
        {/* Due Date & Comments Badges */}
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          {task.dueDate && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--text-muted)', fontSize: '0.75rem' }}>
              <Calendar size={12} />
              <span>{formatDueDate(task.dueDate)}</span>
            </div>
          )}
          
          {task.commentsCount > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--text-muted)', fontSize: '0.75rem' }}>
              <MessageSquare size={12} />
              <span>{task.commentsCount}</span>
            </div>
          )}
        </div>

        {/* Assignee Avatar */}
        {task.assignee ? (
          <div 
            className="avatar" 
            style={{ width: '24px', height: '24px', fontSize: '0.65rem' }}
            title={`Assigned to ${task.assignee.username}`}
          >
            {getInitials(task.assignee.username)}
          </div>
        ) : (
          <div 
            style={{
              width: '24px',
              height: '24px',
              borderRadius: '50%',
              border: '1px dashed var(--border-glass)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--text-muted)',
              fontSize: '0.6rem'
            }}
            title="Unassigned"
          >
            <User size={12} />
          </div>
        )}
      </div>
    </div>
  );
}
