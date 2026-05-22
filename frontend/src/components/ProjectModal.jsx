import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { X } from 'lucide-react';

export default function ProjectModal({ open, onClose, onCreated }) {
  if (!open) return null;

  const { apiFetch } = useAuth();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) return;

    setLoading(true);
    setError(null);

    try {
      const data = await apiFetch('/projects', {
        method: 'POST',
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim()
        })
      });

      setName('');
      setDescription('');
      onCreated(data);
      onClose();
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
      >
        {/* Modal Header */}
        <div className="modal-header">
          <h3 className="modal-title">Create Space Board</h3>
          <button type="button" onClick={onClose} className="modal-close">
            <X size={18} />
          </button>
        </div>

        {/* Modal Form Content */}
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

          <div className="form-group">
            <label className="form-label">Space Board Title</label>
            <input 
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="input-field"
              placeholder="e.g. Q3 Product Roadmap"
              required
              disabled={loading}
              autoFocus
            />
          </div>

          <div className="form-group">
            <label className="form-label">Space Board Description</label>
            <textarea 
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="input-field"
              placeholder="Brief description of project goals and scope..."
              style={{ minHeight: '100px', resize: 'vertical' }}
              disabled={loading}
            />
          </div>
        </div>

        {/* Form Action Controls */}
        <div className="modal-footer">
          <button 
            type="button" 
            onClick={onClose} 
            className="btn btn-secondary"
            disabled={loading}
          >
            Cancel
          </button>
          <button 
            type="submit" 
            className="btn btn-primary"
            disabled={loading}
          >
            {loading ? 'Creating...' : 'Initialize Board'}
          </button>
        </div>
      </form>
    </div>
  );
}
