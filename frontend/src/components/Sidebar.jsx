import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import { FolderKanban, Plus, LayoutDashboard, ChevronRight, Hash } from 'lucide-react';
import ProjectModal from './ProjectModal';

export default function Sidebar({ activeProjectId, onSelectProject, onGoToDashboard }) {
  const { user, apiFetch } = useAuth();
  const { addListener } = useSocket();
  const [projects, setProjects] = useState([]);
  const [projectModalOpen, setProjectModalOpen] = useState(false);

  // Load user projects
  const loadProjects = async () => {
    try {
      const list = await apiFetch('/projects');
      setProjects(list);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    if (user) {
      loadProjects();
    }
  }, [user]);

  // Handle live updates for projects
  useEffect(() => {
    // When a member is added, reload projects list
    const removeMemberAdded = addListener('MEMBER_ADDED', (payload) => {
      loadProjects();
    });

    const removeProjectUpdated = addListener('PROJECT_UPDATED', (payload) => {
      loadProjects();
    });

    const removeProjectDeleted = addListener('PROJECT_DELETED', (payload) => {
      loadProjects();
      if (activeProjectId === payload.projectId) {
        onGoToDashboard();
      }
    });

    return () => {
      removeMemberAdded();
      removeProjectUpdated();
      removeProjectDeleted();
    };
  }, [addListener, activeProjectId]);

  const handleProjectCreated = (newProject) => {
    setProjects(prev => [...prev, newProject]);
    onSelectProject(newProject.id);
  };

  return (
    <>
      <aside 
        className="glass-panel" 
        style={{
          width: '280px',
          height: '100vh',
          display: 'flex',
          flexDirection: 'column',
          borderRight: '1px solid var(--border-glass)',
          borderTop: 'none',
          borderLeft: 'none',
          borderBottom: 'none',
          zIndex: 80,
          background: 'rgba(10, 14, 23, 0.5)'
        }}
      >
        {/* Workspace Brand Header */}
        <div style={{
          padding: '24px',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          borderBottom: '1px solid var(--border-glass)',
          height: '73px'
        }}>
          <FolderKanban style={{ color: 'var(--primary)' }} size={22} />
          <span style={{
            fontFamily: 'var(--font-display)',
            fontSize: '1rem',
            fontWeight: '700',
            letterSpacing: '0.05em',
            textTransform: 'uppercase',
            color: 'var(--text-main)'
          }}>
            Workspace
          </span>
        </div>

        {/* Navigation Core Links */}
        <div style={{ padding: '24px 16px 12px 16px' }}>
          <button 
            onClick={onGoToDashboard}
            className="btn"
            style={{
              width: '100%',
              justifyContent: 'flex-start',
              background: !activeProjectId ? 'rgba(99, 102, 241, 0.15)' : 'transparent',
              border: !activeProjectId ? '1px solid rgba(99, 102, 241, 0.25)' : '1px solid transparent',
              color: !activeProjectId ? 'var(--text-main)' : 'var(--text-secondary)'
            }}
          >
            <LayoutDashboard size={16} />
            Dashboard
          </button>
        </div>

        {/* Projects List Segment */}
        <div style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          padding: '12px 16px',
          gap: '8px',
          overflowY: 'auto'
        }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '0 8px 8px 8px'
          }}>
            <span style={{
              fontFamily: 'var(--font-display)',
              fontSize: '0.75rem',
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              color: 'var(--text-muted)',
              fontWeight: 600
            }}>
              Active Boards
            </span>
            <button 
              onClick={() => setProjectModalOpen(true)}
              className="btn btn-secondary"
              style={{
                width: '20px',
                height: '20px',
                padding: 0,
                borderRadius: '4px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
              title="Create New Board"
            >
              <Plus size={12} />
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            {projects.map(proj => {
              const isActive = proj.id === activeProjectId;
              return (
                <button
                  key={proj.id}
                  onClick={() => onSelectProject(proj.id)}
                  className="btn"
                  style={{
                    justifyContent: 'space-between',
                    padding: '8px 12px',
                    fontSize: '0.85rem',
                    background: isActive ? 'rgba(99, 102, 241, 0.08)' : 'transparent',
                    border: '1px solid transparent',
                    borderColor: isActive ? 'rgba(99, 102, 241, 0.15)' : 'transparent',
                    color: isActive ? 'var(--text-main)' : 'var(--text-secondary)',
                    borderRadius: '8px'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', overflow: 'hidden' }}>
                    <Hash size={14} style={{ color: isActive ? 'var(--primary)' : 'var(--text-muted)', flexShrink: 0 }} />
                    <span style={{
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      fontWeight: isActive ? '600' : '400'
                    }}>
                      {proj.name}
                    </span>
                  </div>
                  {isActive && <ChevronRight size={14} style={{ color: 'var(--primary)' }} />}
                </button>
              );
            })}
          </div>
        </div>

        {/* Workspace Footer Info */}
        <div style={{
          padding: '20px 24px',
          borderTop: '1px solid var(--border-glass)',
          display: 'flex',
          flexDirection: 'column',
          gap: '4px'
        }}>
          <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>WORKSPACE</span>
          <span style={{ fontSize: '0.85rem', fontWeight: 'bold' }}>Aetheria Workspace</span>
        </div>
      </aside>

      {/* Project Creation Dialog */}
      <ProjectModal 
        open={projectModalOpen} 
        onClose={() => setProjectModalOpen(false)}
        onCreated={handleProjectCreated}
      />
    </>
  );
}
