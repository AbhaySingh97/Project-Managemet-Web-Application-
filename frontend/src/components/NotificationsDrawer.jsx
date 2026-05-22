import React from 'react';
import { X, CheckCircle, Mail, UserPlus, MessageSquare, AlertCircle } from 'lucide-react';

export default function NotificationsDrawer({ open, onClose, notifications, onMarkRead, onMarkAllRead }) {
  if (!open) return null;

  const getIcon = (type) => {
    switch (type) {
      case 'assignment':
        return <UserPlus size={16} style={{ color: 'var(--primary)' }} />;
      case 'comment':
        return <MessageSquare size={16} style={{ color: 'var(--accent-cyan)' }} />;
      default:
        return <AlertCircle size={16} style={{ color: 'var(--text-secondary)' }} />;
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose} style={{ justifyContent: 'flex-end', padding: 0 }}>
      <div 
        className="glass-panel" 
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '100%',
          maxWidth: '400px',
          height: '100vh',
          display: 'flex',
          flexDirection: 'column',
          animation: 'slideInRight 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
          borderTop: 'none',
          borderRight: 'none',
          borderBottom: 'none',
          background: 'rgba(10, 14, 23, 0.95)',
          backdropFilter: 'blur(24px)'
        }}
      >
        {/* Drawer Header */}
        <div style={{
          padding: '24px',
          borderBottom: '1px solid var(--border-glass)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <div>
            <h3 style={{ fontSize: '1.25rem' }}>Workspace Signals</h3>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Your real-time updates</span>
          </div>
          <button onClick={onClose} className="modal-close">
            <X size={20} />
          </button>
        </div>

        {/* Action Controls */}
        {notifications.some(n => !n.read) && (
          <div style={{
            padding: '12px 24px',
            borderBottom: '1px solid var(--border-glass)',
            display: 'flex',
            justifyContent: 'flex-end',
            background: 'rgba(255,255,255,0.02)'
          }}>
            <button 
              onClick={onMarkAllRead}
              className="btn"
              style={{
                fontSize: '0.8rem',
                padding: '4px 10px',
                background: 'transparent',
                border: '1px solid var(--border-glass)',
                color: 'var(--text-secondary)'
              }}
            >
              Mark all as read
            </button>
          </div>
        )}

        {/* Notifications Scroll */}
        <div style={{
          flex: 1,
          overflowY: 'auto',
          padding: '20px'
        }}>
          {notifications.length === 0 ? (
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              height: '100%',
              gap: '12px',
              color: 'var(--text-muted)'
            }}>
              <CheckCircle size={40} style={{ strokeWidth: 1.5, color: 'var(--text-muted)' }} />
              <span style={{ fontSize: '0.9rem' }}>All caught up!</span>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {notifications.map((notif) => (
                <div 
                  key={notif.id}
                  className="glass-card"
                  style={{
                    padding: '16px',
                    borderLeft: notif.read ? '1px solid var(--border-glass)' : '4px solid var(--primary)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '10px',
                    background: notif.read ? 'rgba(22, 28, 45, 0.25)' : 'rgba(99, 102, 241, 0.05)'
                  }}
                >
                  <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
                    <div style={{
                      marginTop: '2px',
                      padding: '6px',
                      borderRadius: '8px',
                      background: 'rgba(255, 255, 255, 0.04)',
                      display: 'flex'
                    }}>
                      {getIcon(notif.type)}
                    </div>
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <p style={{ fontSize: '0.85rem', lineHeight: '1.4', color: notif.read ? 'var(--text-secondary)' : 'var(--text-main)' }}>
                        {notif.message}
                      </p>
                      <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                        {new Date(notif.createdAt).toLocaleDateString()} at {new Date(notif.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                      </span>
                    </div>
                  </div>

                  {!notif.read && (
                    <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                      <button
                        onClick={() => onMarkRead(notif.id)}
                        className="btn"
                        style={{
                          fontSize: '0.75rem',
                          padding: '3px 8px',
                          background: 'transparent',
                          color: 'var(--primary)',
                          border: 'none',
                          cursor: 'pointer',
                          fontWeight: '600'
                        }}
                      >
                        Dismiss
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
