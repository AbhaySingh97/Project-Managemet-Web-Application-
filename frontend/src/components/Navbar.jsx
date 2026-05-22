import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import { Bell, LogOut, Layout, User, X, Settings } from 'lucide-react';
import NotificationsDrawer from './NotificationsDrawer';
import SettingsModal, { playChime } from './SettingsModal';

export default function Navbar() {
  const { user, logout, apiFetch } = useAuth();
  const { addListener } = useSocket();
  const [notifsOpen, setNotifsOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [toasts, setToasts] = useState([]);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [settings, setSettings] = useState(() => {
    const saved = localStorage.getItem('aetheria_notif_settings');
    return saved ? JSON.parse(saved) : {
      soundEnabled: true,
      soundOnAssignment: true,
      soundOnComment: true,
      soundOnSystem: true
    };
  });

  const handleSaveSettings = (newSettings) => {
    setSettings(newSettings);
    localStorage.setItem('aetheria_notif_settings', JSON.stringify(newSettings));
  };

  // Fetch notifications
  useEffect(() => {
    async function loadNotifications() {
      try {
        const data = await apiFetch('/notifications');
        setNotifications(data);
      } catch (err) {
        console.error('Failed to load notifications:', err);
      }
    }
    loadCurrentUserNotifications();

    function loadCurrentUserNotifications() {
      if (user) {
        loadNotifications();
      }
    }
  }, [user]);

  // Listen for real-time notifications
  useEffect(() => {
    const removeListener = addListener('NOTIFICATION_RECEIVED', (newNotif) => {
      // Append to local notifications list
      setNotifications(prev => [newNotif, ...prev]);
      
      // Trigger a beautiful floating toast
      const id = Math.random().toString();
      setToasts(prev => [...prev, { id, message: newNotif.message }]);
      
      // Play synthetic glassy chime based on user alert preferences
      if (settings.soundEnabled) {
        const notifType = newNotif.type;
        if (notifType === 'assignment' && settings.soundOnAssignment) {
          playChime();
        } else if (notifType === 'comment' && settings.soundOnComment) {
          playChime();
        } else if ((notifType === 'update' || notifType === 'info') && settings.soundOnSystem) {
          playChime();
        }
      }

      // Auto dismiss toast after 6 seconds
      setTimeout(() => {
        setToasts(prev => prev.filter(t => t.id !== id));
      }, 6000);
    });

    return () => removeListener();
  }, [addListener, settings]);

  const handleMarkAllRead = async () => {
    try {
      await apiFetch('/notifications/read-all', { method: 'POST' });
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    } catch (err) {
      console.error(err);
    }
  };

  const handleMarkRead = async (id) => {
    try {
      await apiFetch(`/notifications/${id}/read`, { method: 'PUT' });
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
    } catch (err) {
      console.error(err);
    }
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  // Custom User Initials or Avatar
  const getInitials = (name) => {
    if (!name) return 'U';
    return name.slice(0, 2).toUpperCase();
  };


  return (
    <>
      <header className="glass-panel" style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '16px 40px',
        borderTop: 'none',
        borderLeft: 'none',
        borderRight: 'none',
        position: 'sticky',
        top: 0,
        zIndex: 90
      }}>
        {/* Brand Area */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{
            background: 'var(--primary-glow)',
            width: '32px',
            height: '32px',
            borderRadius: '8px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#fff',
            fontWeight: '800',
            boxShadow: 'var(--shadow-neon)'
          }}>
            A
          </div>
          <span style={{
            fontFamily: 'var(--font-display)',
            fontSize: '1.2rem',
            fontWeight: 700,
            letterSpacing: '-0.02em',
            background: 'linear-gradient(135deg, #ffffff 60%, #94a3b8 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent'
          }}>
            Aetheria
          </span>
        </div>

        {/* Action Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
          {/* Notifications Bell */}
          <button 
            onClick={() => setNotifsOpen(!notifsOpen)}
            className="btn btn-secondary btn-icon"
            style={{ position: 'relative', overflow: 'visible' }}
            title="Workspace Notifications"
          >
            <Bell size={18} />
            {unreadCount > 0 && (
              <span style={{
                position: 'absolute',
                top: '-4px',
                right: '-4px',
                background: 'var(--priority-high)',
                color: '#fff',
                fontSize: '0.65rem',
                fontWeight: 'bold',
                minWidth: '18px',
                height: '18px',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 0 10px rgba(239, 68, 68, 0.5)',
                border: '2px solid var(--bg-dark)'
              }}>
                {unreadCount}
              </span>
            )}
          </button>

          {/* Control Center Settings */}
          <button 
            onClick={() => setSettingsOpen(true)}
            className="btn btn-secondary btn-icon"
            title="Workspace Control Center"
          >
            <Settings size={18} />
          </button>

          {/* User Profile */}
          {user && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                <span style={{ fontSize: '0.9rem', fontWeight: 600 }}>{user.username}</span>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{user.email}</span>
              </div>
              <div className="avatar" style={{ cursor: 'pointer' }} onClick={() => setSettingsOpen(true)} title="View Account Details">
                {getInitials(user.username)}
              </div>
            </div>
          )}

          {/* Logout Trigger */}
          <button onClick={logout} className="btn btn-danger btn-icon" title="Logout">
            <LogOut size={18} />
          </button>
        </div>
      </header>

      {/* Slide-out Notifications Drawer */}
      <NotificationsDrawer 
        open={notifsOpen} 
        onClose={() => setNotifsOpen(false)}
        notifications={notifications}
        onMarkRead={handleMarkRead}
        onMarkAllRead={handleMarkAllRead}
      />

      {/* Workspace Settings / Account Control Center Modal */}
      <SettingsModal 
        open={settingsOpen} 
        onClose={() => setSettingsOpen(false)}
        settings={settings}
        onSave={handleSaveSettings}
      />

      {/* Floating Toast Area */}
      <div className="toast-container">
        {toasts.map(toast => (
          <div key={toast.id} className="toast">
            <div style={{
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              background: 'var(--accent-cyan)',
              boxShadow: '0 0 8px var(--accent-cyan)'
            }}></div>
            <div className="toast-message">{toast.message}</div>
            <button 
              onClick={() => setToasts(prev => prev.filter(t => t.id !== toast.id))} 
              className="toast-close"
            >
              <X size={14} />
            </button>
          </div>
        ))}
      </div>
    </>
  );
}
