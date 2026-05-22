import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { X, UserPlus } from 'lucide-react';

export default function InviteModal({ open, onClose, projectId, onMemberAdded }) {
  if (!open) return null;

  const { apiFetch } = useAuth();
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!query.trim()) return;

    setLoading(true);
    setError(null);
    setSuccess(false);

    try {
      const updatedProject = await apiFetch(`/projects/${projectId}/members`, {
        method: 'POST',
        body: JSON.stringify({
          usernameOrEmail: query.trim()
        })
      });

      setSuccess(true);
      setQuery('');
      if (onMemberAdded) {
        onMemberAdded(updatedProject.members);
      }
      
      // Auto-close success message after 1.5s
      setTimeout(() => {
        setSuccess(false);
        onClose();
      }, 1500);

    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <form 
        onSubmit={handleSubmit}
        className="modal-container"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: '450px' }}
      >
        {/* Modal Header */}
        <div className="modal-header">
          <h3 className="modal-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <UserPlus size={18} style={{ color: 'var(--primary)' }} />
            Add Collaborator
          </h3>
          <button type="button" onClick={onClose} className="modal-close">
            <X size={18} />
          </button>
        </div>

        {/* Modal Body Form */}
        <div className="modal-body">
          {error && (
            <div style={{
              padding: '12px',
              borderRadius: '8px',
              background: 'rgba(239, 68, 68, 0.15)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              color: '#f87171',
              fontSize: '0.85rem',
              marginBottom: '16px'
            }}>
              {error}
            </div>
          )}

          {success && (
            <div style={{
              padding: '12px',
              borderRadius: '8px',
              background: 'rgba(16, 185, 129, 0.15)',
              border: '1px solid rgba(16, 185, 129, 0.3)',
              color: '#34d399',
              fontSize: '0.85rem',
              marginBottom: '16px',
              textAlign: 'center'
            }}>
              Collaborator successfully added to board!
            </div>
          )}

          <div className="form-group">
            <label className="form-label">Username or Email Address</label>
            <input 
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="input-field"
              placeholder="e.g. johndoe or john@example.com"
              required
              disabled={loading || success}
              autoFocus
            />
            <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
              We will notify the user instantly and sync this space board to their workspace.
            </span>
          </div>
        </div>

        {/* Action Controls */}
        <div className="modal-footer">
          <button 
            type="button" 
            onClick={onClose} 
            className="btn btn-secondary"
            disabled={loading || success}
          >
            Cancel
          </button>
          <button 
            type="submit" 
            className="btn btn-primary"
            disabled={loading || success}
          >
            {loading ? 'Granting Access...' : 'Grant Workspace Access'}
          </button>
        </div>
      </form>
    </div>
  );
}
