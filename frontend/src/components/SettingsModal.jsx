import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { 
  X, Volume2, Bell, MessageSquare, ShieldAlert, 
  User, Lock, Save, Key, AlertCircle, CheckCircle 
} from 'lucide-react';

// Crystal-clear high-fidelity synthetic chime tone using Web Audio API
export function playChime() {
  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;
    
    const ctx = new AudioContext();
    
    // Create oscillator nodes for dual harmonic chime tones
    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    
    // Sleek glassy resonance frequencies (D5 and A5)
    osc1.frequency.setValueAtTime(587.33, ctx.currentTime); 
    osc2.frequency.setValueAtTime(880.00, ctx.currentTime); 
    
    // Distinct pure waveforms
    osc1.type = 'sine';
    osc2.type = 'triangle';
    
    // Gain nodes for soft envelope control
    const gainNode1 = ctx.createGain();
    const gainNode2 = ctx.createGain();
    
    gainNode1.gain.setValueAtTime(0.12, ctx.currentTime);
    gainNode1.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.65);
    
    gainNode2.gain.setValueAtTime(0.06, ctx.currentTime);
    gainNode2.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.45);
    
    // Connect synthesis pipeline
    osc1.connect(gainNode1);
    osc2.connect(gainNode2);
    
    gainNode1.connect(ctx.destination);
    gainNode2.connect(ctx.destination);
    
    // Play with small stagger for spatial sound feel
    osc1.start();
    osc2.start(ctx.currentTime + 0.04);
    
    osc1.stop(ctx.currentTime + 0.7);
    osc2.stop(ctx.currentTime + 0.7);
  } catch (err) {
    console.warn('Web Audio blocked or unsupported:', err);
  }
}

export default function SettingsModal({ open, onClose, settings, onSave }) {
  if (!open) return null;

  const { user, apiFetch, updateUserContext } = useAuth();
  
  // Tab controller: 'audio' | 'profile' | 'security'
  const [activeTab, setActiveTab] = useState('audio');

  // Tab 2: Profile State
  const [username, setUsername] = useState(user?.username || '');
  const [email, setEmail] = useState(user?.email || '');
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileError, setProfileError] = useState('');
  const [profileSuccess, setProfileSuccess] = useState('');

  // Tab 3: Security State
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [securityLoading, setSecurityLoading] = useState(false);
  const [securityError, setSecurityError] = useState('');
  const [securitySuccess, setSecuritySuccess] = useState('');

  // Initialize profile values when user context loads or changes
  useEffect(() => {
    if (user) {
      setUsername(user.username);
      setEmail(user.email);
    }
  }, [user, open]);

  // Audio signals config
  const toggleSetting = (key) => {
    const updated = {
      ...settings,
      [key]: !settings[key]
    };
    onSave(updated);
    
    if (key === 'soundEnabled' && updated.soundEnabled) {
      playChime();
    }
  };

  const handleTestSound = (e) => {
    e.preventDefault();
    playChime();
  };

  // Submit Profile update
  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    setProfileError('');
    setProfileSuccess('');

    if (!username.trim() || !email.trim()) {
      setProfileError('Username and email fields are required.');
      return;
    }

    setProfileLoading(true);
    try {
      const response = await apiFetch('/auth/update-profile', {
        method: 'PUT',
        body: JSON.stringify({ username: username.trim(), email: email.trim() })
      });
      
      // Update Context & localStorage dynamically
      updateUserContext(response.user, response.token);
      setProfileSuccess('Account profile updated successfully!');
    } catch (err) {
      setProfileError(err.message || 'Failed to update account details.');
    } finally {
      setProfileLoading(false);
    }
  };

  // Submit Password update
  const handleResetPassword = async (e) => {
    e.preventDefault();
    setSecurityError('');
    setSecuritySuccess('');

    if (!currentPassword || !newPassword || !confirmPassword) {
      setSecurityError('All password fields are required.');
      return;
    }

    if (newPassword.length < 6) {
      setSecurityError('New password must be at least 6 characters long.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setSecurityError('New password confirmation does not match.');
      return;
    }

    setSecurityLoading(true);
    try {
      await apiFetch('/auth/change-password', {
        method: 'PUT',
        body: JSON.stringify({ currentPassword, newPassword })
      });

      setSecuritySuccess('Account password updated successfully!');
      // Clear password fields on success
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      setSecurityError(err.message || 'Failed to change account password.');
    } finally {
      setSecurityLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div 
        className="modal-container"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: '520px', minHeight: '480px', display: 'flex', flexDirection: 'column' }}
      >
        {/* Modal Header */}
        <div className="modal-header">
          <h3 className="modal-title" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <User size={20} style={{ color: 'var(--primary)' }} />
            Workspace Control Center
          </h3>
          <button type="button" onClick={onClose} className="modal-close">
            <X size={18} />
          </button>
        </div>

        {/* Modal Tabs Row */}
        <div style={{ padding: '0 24px' }}>
          <div style={{ 
            display: 'flex', 
            gap: '8px', 
            borderBottom: '1px solid var(--border-glass)', 
            paddingBottom: '12px', 
            marginBottom: '16px' 
          }}>
            <button 
              type="button"
              onClick={() => setActiveTab('audio')} 
              style={{
                flex: 1,
                padding: '10px 8px',
                borderRadius: '8px',
                background: activeTab === 'audio' ? 'rgba(99, 102, 241, 0.12)' : 'transparent',
                border: '1px solid ' + (activeTab === 'audio' ? 'rgba(99, 102, 241, 0.25)' : 'transparent'),
                color: activeTab === 'audio' ? 'var(--primary)' : 'var(--text-secondary)',
                fontSize: '0.82rem',
                fontWeight: '600',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
                cursor: 'pointer',
                transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)'
              }}
            >
              <Volume2 size={15} />
              Audio Signals
            </button>
            
            <button 
              type="button"
              onClick={() => setActiveTab('profile')} 
              style={{
                flex: 1,
                padding: '10px 8px',
                borderRadius: '8px',
                background: activeTab === 'profile' ? 'rgba(6, 182, 212, 0.12)' : 'transparent',
                border: '1px solid ' + (activeTab === 'profile' ? 'rgba(6, 182, 212, 0.25)' : 'transparent'),
                color: activeTab === 'profile' ? 'var(--accent-cyan)' : 'var(--text-secondary)',
                fontSize: '0.82rem',
                fontWeight: '600',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
                cursor: 'pointer',
                transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)'
              }}
            >
              <User size={15} />
              Account Details
            </button>

            <button 
              type="button"
              onClick={() => setActiveTab('security')} 
              style={{
                flex: 1,
                padding: '10px 8px',
                borderRadius: '8px',
                background: activeTab === 'security' ? 'rgba(236, 72, 153, 0.12)' : 'transparent',
                border: '1px solid ' + (activeTab === 'security' ? 'rgba(236, 72, 153, 0.25)' : 'transparent'),
                color: activeTab === 'security' ? 'var(--accent-pink)' : 'var(--text-secondary)',
                fontSize: '0.82rem',
                fontWeight: '600',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
                cursor: 'pointer',
                transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)'
              }}
            >
              <Lock size={15} />
              Security & Pass
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="modal-body" style={{ flex: '1', display: 'flex', flexDirection: 'column', gap: '20px', paddingTop: '8px' }}>
          
          {/* TAB 1: AUDIO & SOUND SETTINGS */}
          {activeTab === 'audio' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              {/* Main Sound Toggler */}
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '16px 20px',
                borderRadius: '16px',
                background: 'rgba(255, 255, 255, 0.02)',
                border: '1px solid var(--border-glass)'
              }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <span style={{ fontSize: '0.95rem', fontWeight: '600', color: 'var(--text-main)' }}>Enable Audio Chimes</span>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Play synthetic glass chimes on incoming signals</span>
                </div>
                
                <div 
                  onClick={() => toggleSetting('soundEnabled')}
                  style={{
                    width: '50px',
                    height: '26px',
                    borderRadius: '20px',
                    background: settings.soundEnabled ? 'var(--primary-glow)' : 'rgba(255, 255, 255, 0.08)',
                    border: '1px solid var(--border-glass)',
                    position: 'relative',
                    cursor: 'pointer',
                    transition: 'background 0.3s ease',
                    boxShadow: settings.soundEnabled ? '0 0 10px rgba(99, 102, 241, 0.3)' : 'none'
                  }}
                >
                  <div style={{
                    width: '18px',
                    height: '18px',
                    borderRadius: '50%',
                    background: '#fff',
                    position: 'absolute',
                    top: '3px',
                    left: settings.soundEnabled ? '27px' : '4px',
                    transition: 'left 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.3)'
                  }}></div>
                </div>
              </div>

              {/* Sub-Filters Sound Settings */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <span className="form-label" style={{ fontSize: '0.75rem' }}>Chime Preferences</span>
                
                {/* 1. Assignment Sound */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', opacity: settings.soundEnabled ? 1 : 0.5, transition: 'opacity 0.2s ease' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{ padding: '8px', borderRadius: '8px', background: 'rgba(99, 102, 241, 0.1)', color: 'var(--primary)' }}>
                      <Bell size={16} />
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                      <span style={{ fontSize: '0.9rem', fontWeight: '500' }}>Card Assignments</span>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>When someone assigns a card to you</span>
                    </div>
                  </div>
                  
                  <input 
                    type="checkbox"
                    checked={settings.soundOnAssignment}
                    onChange={() => settings.soundEnabled && toggleSetting('soundOnAssignment')}
                    style={{
                      width: '18px',
                      height: '18px',
                      accentColor: 'var(--primary)',
                      cursor: settings.soundEnabled ? 'pointer' : 'default'
                    }}
                  />
                </div>

                {/* 2. Comments Sound */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', opacity: settings.soundEnabled ? 1 : 0.5, transition: 'opacity 0.2s ease' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{ padding: '8px', borderRadius: '8px', background: 'rgba(6, 182, 212, 0.1)', color: 'var(--accent-cyan)' }}>
                      <MessageSquare size={16} />
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                      <span style={{ fontSize: '0.9rem', fontWeight: '500' }}>Discussion Comments</span>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>When collaborators send a card message</span>
                    </div>
                  </div>
                  
                  <input 
                    type="checkbox"
                    checked={settings.soundOnComment}
                    onChange={() => settings.soundEnabled && toggleSetting('soundOnComment')}
                    style={{
                      width: '18px',
                      height: '18px',
                      accentColor: 'var(--accent-cyan)',
                      cursor: settings.soundEnabled ? 'pointer' : 'default'
                    }}
                  />
                </div>

                {/* 3. System Alerts Sound */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', opacity: settings.soundEnabled ? 1 : 0.5, transition: 'opacity 0.2s ease' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{ padding: '8px', borderRadius: '8px', background: 'rgba(236, 72, 153, 0.1)', color: 'var(--accent-pink)' }}>
                      <ShieldAlert size={16} />
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                      <span style={{ fontSize: '0.9rem', fontWeight: '500' }}>Workspace System Logs</span>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>When spaces are updated or team settings change</span>
                    </div>
                  </div>
                  
                  <input 
                    type="checkbox"
                    checked={settings.soundOnSystem}
                    onChange={() => settings.soundEnabled && toggleSetting('soundOnSystem')}
                    style={{
                      width: '18px',
                      height: '18px',
                      accentColor: 'var(--accent-pink)',
                      cursor: settings.soundEnabled ? 'pointer' : 'default'
                    }}
                  />
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: EDIT PROFILE DETAILS */}
          {activeTab === 'profile' && (
            <form onSubmit={handleUpdateProfile} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <span className="form-label" style={{ fontSize: '0.75rem' }}>Identity Credentials</span>
              
              {/* Alert Feedback */}
              {profileError && (
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '10px 14px',
                  borderRadius: '8px',
                  background: 'rgba(239, 68, 68, 0.1)',
                  border: '1px solid rgba(239, 68, 68, 0.25)',
                  color: 'var(--priority-high)',
                  fontSize: '0.8rem'
                }}>
                  <AlertCircle size={16} />
                  <span>{profileError}</span>
                </div>
              )}

              {profileSuccess && (
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '10px 14px',
                  borderRadius: '8px',
                  background: 'rgba(16, 185, 129, 0.1)',
                  border: '1px solid rgba(16, 185, 129, 0.25)',
                  color: 'var(--priority-low)',
                  fontSize: '0.8rem'
                }}>
                  <CheckCircle size={16} style={{ color: '#10b981' }} />
                  <span>{profileSuccess}</span>
                </div>
              )}

              <div className="form-group">
                <label className="form-label">Username</label>
                <input 
                  type="text"
                  className="form-control"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Enter username"
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Email Address</label>
                <input 
                  type="email"
                  className="form-control"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter email"
                  required
                />
              </div>

              <button 
                type="submit" 
                className="btn btn-primary"
                disabled={profileLoading}
                style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center', 
                  gap: '8px',
                  marginTop: '8px',
                  alignSelf: 'flex-start',
                  padding: '10px 20px',
                  fontSize: '0.85rem'
                }}
              >
                <Save size={16} />
                {profileLoading ? 'Saving Credentials...' : 'Save Profile Details'}
              </button>
            </form>
          )}

          {/* TAB 3: PASSWORD CHANGE & RESET */}
          {activeTab === 'security' && (
            <form onSubmit={handleResetPassword} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <span className="form-label" style={{ fontSize: '0.75rem' }}>Access Keys Control</span>

              {/* Alert Feedback */}
              {securityError && (
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '10px 14px',
                  borderRadius: '8px',
                  background: 'rgba(239, 68, 68, 0.1)',
                  border: '1px solid rgba(239, 68, 68, 0.25)',
                  color: 'var(--priority-high)',
                  fontSize: '0.8rem'
                }}>
                  <AlertCircle size={16} />
                  <span>{securityError}</span>
                </div>
              )}

              {securitySuccess && (
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '10px 14px',
                  borderRadius: '8px',
                  background: 'rgba(16, 185, 129, 0.1)',
                  border: '1px solid rgba(16, 185, 129, 0.25)',
                  color: 'var(--priority-low)',
                  fontSize: '0.8rem'
                }}>
                  <CheckCircle size={16} style={{ color: '#10b981' }} />
                  <span>{securitySuccess}</span>
                </div>
              )}

              <div className="form-group">
                <label className="form-label">Current Password</label>
                <input 
                  type="password"
                  className="form-control"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="Verify your existing password"
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">New Password</label>
                <input 
                  type="password"
                  className="form-control"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Enter a secure new password (min. 6 chars)"
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Confirm New Password</label>
                <input 
                  type="password"
                  className="form-control"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Repeat the new password exactly"
                  required
                />
              </div>

              <button 
                type="submit" 
                className="btn btn-primary"
                disabled={securityLoading}
                style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center', 
                  gap: '8px',
                  marginTop: '8px',
                  alignSelf: 'flex-start',
                  padding: '10px 20px',
                  fontSize: '0.85rem'
                }}
              >
                <Key size={16} />
                {securityLoading ? 'Verifying Keys...' : 'Reset Secure Password'}
              </button>
            </form>
          )}

        </div>

        {/* Modal Footer */}
        <div className="modal-footer" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--border-glass)', marginTop: 'auto', paddingTop: '16px' }}>
          {activeTab === 'audio' ? (
            <button 
              type="button"
              onClick={handleTestSound}
              className="btn btn-secondary"
              style={{ fontSize: '0.85rem' }}
              disabled={!settings.soundEnabled}
            >
              Test Chime Sound
            </button>
          ) : (
            <div style={{ flex: 1 }}></div>
          )}
          
          <button 
            type="button"
            onClick={onClose}
            className="btn btn-primary"
            style={{ padding: '8px 20px', fontSize: '0.85rem' }}
          >
            Close Control Center
          </button>
        </div>
      </div>
    </div>
  );
}
