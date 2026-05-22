import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { FolderKanban, LogIn, UserPlus, AlertCircle } from 'lucide-react';

export default function Login() {
  const { login, register } = useAuth();
  
  // Tab State: 'login' | 'register'
  const [activeTab, setActiveTab] = useState('login');
  
  // Fields State
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (activeTab === 'login') {
        // Can log in with username or email
        await login(email, password);
      } else {
        await register(username, email, password);
      }
    } catch (err) {
      setError(err.message || 'Authentication failed. Please verify credentials.');
    } finally {
      setLoading(false);
    }
  };

  const toggleTab = (tab) => {
    setActiveTab(tab);
    setError(null);
    setUsername('');
    setEmail('');
    setPassword('');
  };

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '100vh',
      width: '100vw',
      position: 'relative',
      overflow: 'hidden',
      padding: '20px'
    }}>
      {/* Decorative Neon Glowing Spheres */}
      <div style={{
        position: 'absolute',
        width: '450px',
        height: '450px',
        borderRadius: '50%',
        background: 'rgba(99, 102, 241, 0.15)',
        filter: 'blur(100px)',
        top: '-150px',
        left: '-100px',
        zIndex: 0
      }}></div>
      <div style={{
        position: 'absolute',
        width: '450px',
        height: '450px',
        borderRadius: '50%',
        background: 'rgba(139, 92, 246, 0.15)',
        filter: 'blur(100px)',
        bottom: '-150px',
        right: '-100px',
        zIndex: 0
      }}></div>

      {/* Main Glassmorphic Dialog Box */}
      <div 
        className="glass-panel" 
        style={{
          width: '100%',
          maxWidth: '460px',
          borderRadius: '24px',
          padding: '40px',
          zIndex: 10,
          background: 'rgba(13, 17, 28, 0.75)',
          boxShadow: 'var(--shadow-neon-strong), 0 30px 60px rgba(0,0,0,0.5)',
          animation: 'fadeIn 0.4s cubic-bezier(0.16, 1, 0.3, 1)'
        }}
      >
        {/* Brand Identity */}
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '12px',
          marginBottom: '32px',
          textAlign: 'center'
        }}>
          <div style={{
            background: 'var(--primary-glow)',
            width: '52px',
            height: '52px',
            borderRadius: '16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#fff',
            boxShadow: '0 0 25px rgba(99, 102, 241, 0.5)'
          }}>
            <FolderKanban size={28} />
          </div>
          <h1 style={{
            fontSize: '1.8rem',
            fontFamily: 'var(--font-display)',
            fontWeight: 800,
            background: 'linear-gradient(135deg, #ffffff 40%, #94a3b8 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent'
          }}>
            Aetheria Space
          </h1>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
            Dynamic, collaborative project management workspace
          </p>
        </div>

        {/* Tab Switcher buttons */}
        <div style={{
          display: 'flex',
          background: 'var(--bg-input)',
          padding: '4px',
          borderRadius: '12px',
          marginBottom: '24px',
          border: '1px solid var(--border-glass)'
        }}>
          <button
            onClick={() => toggleTab('login')}
            className="btn"
            style={{
              flex: 1,
              background: activeTab === 'login' ? 'rgba(255, 255, 255, 0.08)' : 'transparent',
              color: activeTab === 'login' ? 'var(--text-main)' : 'var(--text-secondary)',
              border: activeTab === 'login' ? '1px solid var(--border-glass)' : 'none',
              padding: '8px 16px',
              fontSize: '0.9rem',
              borderRadius: '8px'
            }}
          >
            <LogIn size={14} />
            Sign In
          </button>
          <button
            onClick={() => toggleTab('register')}
            className="btn"
            style={{
              flex: 1,
              background: activeTab === 'register' ? 'rgba(255, 255, 255, 0.08)' : 'transparent',
              color: activeTab === 'register' ? 'var(--text-main)' : 'var(--text-secondary)',
              border: activeTab === 'register' ? '1px solid var(--border-glass)' : 'none',
              padding: '8px 16px',
              fontSize: '0.9rem',
              borderRadius: '8px'
            }}
          >
            <UserPlus size={14} />
            Register
          </button>
        </div>

        {/* Form Error Panel */}
        {error && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '12px 16px',
            borderRadius: '12px',
            background: 'rgba(239, 68, 68, 0.15)',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            color: '#f87171',
            fontSize: '0.85rem',
            marginBottom: '20px',
            animation: 'fadeIn 0.2s ease-out'
          }}>
            <AlertCircle size={16} style={{ flexShrink: 0 }} />
            <span>{error}</span>
          </div>
        )}

        {/* Login/Register Form */}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          
          {activeTab === 'register' && (
            <div className="form-group">
              <label className="form-label">Username</label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="e.g. johndoe"
                className="input-field"
                required
                disabled={loading}
              />
            </div>
          )}

          <div className="form-group">
            <label className="form-label">
              {activeTab === 'login' ? 'Username or Email' : 'Email Address'}
            </label>
            <input
              type={activeTab === 'login' ? 'text' : 'email'}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={activeTab === 'login' ? 'e.g. john@example.com' : 'e.g. john@example.com'}
              className="input-field"
              required
              disabled={loading}
            />
          </div>

          <div className="form-group" style={{ marginBottom: '8px' }}>
            <label className="form-label">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="input-field"
              required
              disabled={loading}
            />
          </div>

          <button
            type="submit"
            className="btn btn-primary"
            style={{
              padding: '14px',
              fontSize: '1rem',
              marginTop: '12px',
              fontWeight: '600'
            }}
            disabled={loading}
          >
            {loading ? 'Authenticating...' : activeTab === 'login' ? 'Access Workspace' : 'Create Account'}
          </button>

        </form>
      </div>
    </div>
  );
}
