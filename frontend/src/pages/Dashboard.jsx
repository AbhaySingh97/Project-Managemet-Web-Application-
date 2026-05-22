import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import { Plus, Briefcase, CheckSquare, Bell, Users, PlusCircle, ArrowRight, Activity, Calendar, Compass, Layers, CheckCircle2 } from 'lucide-react';
import ProjectModal from '../components/ProjectModal';

export default function Dashboard({ onSelectProject }) {
  const { user, apiFetch } = useAuth();
  const { addListener } = useSocket();
  const [projects, setProjects] = useState([]);
  const [recentNotifs, setRecentNotifs] = useState([]);
  const [metrics, setMetrics] = useState({
    totalProjects: 0,
    totalTasks: 0,
    unreadNotifications: 0
  });
  
  const [projectModalOpen, setProjectModalOpen] = useState(false);

  const loadData = async () => {
    try {
      const projList = await apiFetch('/projects');

      // Enrich projects with Lane and Card counts dynamically
      const enrichedProjects = await Promise.all(projList.map(async (p) => {
        try {
          const colsList = await apiFetch(`/columns?projectId=${p.id}`);
          const tasksList = await apiFetch(`/tasks?projectId=${p.id}`);
          return {
            ...p,
            lanesCount: colsList.length,
            cardsCount: tasksList.length
          };
        } catch (err) {
          return { ...p, lanesCount: 0, cardsCount: 0 };
        }
      }));

      setProjects(enrichedProjects);

      // Load recent notifications
      const notifs = await apiFetch('/notifications');
      const unreadCount = notifs.filter(n => !n.read).length;
      setRecentNotifs(notifs.slice(0, 4));

      // Load all tasks for all projects to compute assigned metrics
      let totalTasksAssigned = 0;
      for (const p of projList) {
        try {
          const tasksList = await apiFetch(`/tasks?projectId=${p.id}`);
          // Count tasks assigned to this user
          const myTasks = tasksList.filter(t => t.assigneeId === user.id);
          totalTasksAssigned += myTasks.length;
        } catch (err) {
          // Silent catch
        }
      }

      setMetrics({
        totalProjects: projList.length,
        totalTasks: totalTasksAssigned,
        unreadNotifications: unreadCount
      });

    } catch (err) {
      console.error('Error fetching dashboard details:', err);
    }
  };

  useEffect(() => {
    if (user) {
      loadData();
    }
  }, [user]);

  // Bind WebSockets updates to reload dashboard instantly
  useEffect(() => {
    const removeMemberAdded = addListener('MEMBER_ADDED', () => loadData());
    const removeProjectUpdated = addListener('PROJECT_UPDATED', () => loadData());
    const removeProjectDeleted = addListener('PROJECT_DELETED', () => loadData());
    const removeNotification = addListener('NOTIFICATION_RECEIVED', (notif) => {
      setMetrics(prev => ({
        ...prev,
        unreadNotifications: prev.unreadNotifications + 1
      }));
      setRecentNotifs(prev => [notif, ...prev.slice(0, 3)]);
    });

    return () => {
      removeMemberAdded();
      removeProjectUpdated();
      removeProjectDeleted();
      removeNotification();
    };
  }, [addListener]);

  const handleProjectCreated = (newProject) => {
    loadData();
    onSelectProject(newProject.id);
  };

  const getInitials = (username) => {
    if (!username) return 'U';
    return username.slice(0, 2).toUpperCase();
  };

  // Generate gorgeous gradients based on project name hash
  const getGradientByName = (name) => {
    const colors = [
      'linear-gradient(135deg, #6366f1, #8b5cf6)',
      'linear-gradient(135deg, #06b6d4, #3b82f6)',
      'linear-gradient(135deg, #ec4899, #8b5cf6)',
      'linear-gradient(135deg, #10b981, #059669)',
      'linear-gradient(135deg, #f59e0b, #e056fd)'
    ];
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
      hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    return colors[Math.abs(hash) % colors.length];
  };

  return (
    <div className="main-content" style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
      
      {/* Premium Dashboard Welcome Banner Card */}
      <div style={{ padding: '40px 40px 20px 40px' }}>
        <div className="glass-panel" style={{
          padding: '32px 40px',
          borderRadius: '24px',
          background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.12) 0%, rgba(139, 92, 246, 0.04) 50%, rgba(6, 182, 212, 0.04) 100%)',
          border: '1px solid var(--border-glass)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '24px',
          position: 'relative',
          overflow: 'hidden'
        }}>
          {/* Subtle design element */}
          <div style={{
            position: 'absolute',
            width: '250px',
            height: '250px',
            borderRadius: '50%',
            background: 'var(--primary)',
            filter: 'blur(100px)',
            opacity: 0.1,
            top: '-50px',
            right: '-50px',
            zIndex: 0
          }}></div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '24px', zIndex: 1 }}>
            <div className="avatar" style={{
              width: '64px',
              height: '64px',
              fontSize: '1.5rem',
              fontWeight: 800,
              background: 'var(--primary-glow)',
              boxShadow: 'var(--shadow-neon-strong)'
            }}>
              {getInitials(user?.username)}
            </div>
            <div>
              <span style={{ fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.15em', color: 'var(--primary)', fontWeight: 'bold' }}>
                WORKSPACE DASHBOARD
              </span>
              <h2 className="dashboard-title" style={{ fontSize: '2.2rem', marginTop: '4px' }}>Welcome back, {user?.username}</h2>
              <span className="dashboard-subtitle" style={{ display: 'block', marginTop: '6px', fontSize: '0.95rem' }}>
                You have <strong style={{ color: 'var(--accent-cyan)' }}>{metrics.totalTasks} cards</strong> assigned across <strong style={{ color: 'var(--primary)' }}>{metrics.totalProjects} Space Boards</strong>.
              </span>
            </div>
          </div>
          
          <button 
            onClick={() => setProjectModalOpen(true)} 
            className="btn btn-primary"
            style={{
              padding: '14px 28px',
              fontSize: '0.95rem',
              zIndex: 1,
              fontWeight: '600'
            }}
          >
            <Plus size={18} />
            Initialize Space Board
          </button>
        </div>
      </div>

      {/* Metrics Counter Panels */}
      <div className="dashboard-metrics" style={{ padding: '0 40px 24px 40px' }}>
        <div className="glass-card metric-card" style={{
          background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.05) 0%, var(--bg-card) 100%)',
          borderLeft: '4px solid var(--primary)'
        }}>
          <div className="metric-icon" style={{ background: 'rgba(99, 102, 241, 0.1)', borderColor: 'rgba(99, 102, 241, 0.2)' }}>
            <Briefcase size={20} />
          </div>
          <div className="metric-details">
            <span className="metric-val" style={{ color: 'var(--text-main)' }}>{metrics.totalProjects}</span>
            <span className="metric-lbl">Total Space Boards</span>
          </div>
        </div>

        <div className="glass-card metric-card" style={{
          background: 'linear-gradient(135deg, rgba(6, 182, 212, 0.05) 0%, var(--bg-card) 100%)',
          borderLeft: '4px solid var(--accent-cyan)'
        }}>
          <div className="metric-icon" style={{ background: 'rgba(6, 182, 212, 0.1)', borderColor: 'rgba(6, 182, 212, 0.2)', color: 'var(--accent-cyan)' }}>
            <CheckSquare size={20} />
          </div>
          <div className="metric-details">
            <span className="metric-val" style={{ color: 'var(--text-main)' }}>{metrics.totalTasks}</span>
            <span className="metric-lbl">My Assigned Cards</span>
          </div>
        </div>

        <div className="glass-card metric-card" style={{
          background: 'linear-gradient(135deg, rgba(236, 72, 153, 0.05) 0%, var(--bg-card) 100%)',
          borderLeft: '4px solid var(--accent-pink)'
        }}>
          <div className="metric-icon" style={{ background: 'rgba(236, 72, 153, 0.1)', borderColor: 'rgba(236, 72, 153, 0.2)', color: 'var(--accent-pink)' }}>
            <Bell size={20} />
          </div>
          <div className="metric-details">
            <span className="metric-val" style={{ color: 'var(--text-main)' }}>{metrics.unreadNotifications}</span>
            <span className="metric-lbl">Unread Signals</span>
          </div>
        </div>

        <div className="glass-card metric-card" style={{
          background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.05) 0%, var(--bg-card) 100%)',
          borderLeft: '4px solid var(--priority-low)'
        }}>
          <div className="metric-icon" style={{ background: 'rgba(16, 185, 129, 0.1)', borderColor: 'rgba(16, 185, 129, 0.2)', color: 'var(--priority-low)' }}>
            <Users size={20} />
          </div>
          <div className="metric-details">
            <span className="metric-val" style={{ color: 'var(--text-main)' }}>
              {projects.reduce((acc, curr) => acc + (curr.members?.length || 0), 0)}
            </span>
            <span className="metric-lbl">Collaborators</span>
          </div>
        </div>
      </div>

      {/* Main Grid & Activity Stream Section (Split Layout) */}
      <div style={{
        padding: '0 40px 40px 40px',
        display: 'flex',
        gap: '30px',
        flexWrap: 'wrap'
      }}>
        
        {/* Left Column: Boards */}
        <div style={{ flex: '2.2 1 600px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <h3 className="section-title" style={{ margin: 0 }}>
            <Layers size={18} style={{ color: 'var(--primary)' }} />
            Active Space Boards
          </h3>

          {projects.length === 0 ? (
            <div 
              className="glass-panel"
              style={{
                padding: '60px',
                textAlign: 'center',
                borderRadius: '20px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '16px',
                border: '1px dashed var(--border-glass)',
                background: 'rgba(255, 255, 255, 0.01)'
              }}
            >
              <div style={{ color: 'var(--text-muted)' }}>
                <Briefcase size={48} style={{ strokeWidth: 1 }} />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <h4 style={{ fontSize: '1.1rem' }}>No active boards found</h4>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Create a board to kick off planning and card management with your collaborators</p>
              </div>
              <button onClick={() => setProjectModalOpen(true)} className="btn btn-primary" style={{ marginTop: '8px' }}>
                <PlusCircle size={16} />
                Initialize your first board
              </button>
            </div>
          ) : (
            <div className="grid-cards" style={{ gap: '20px' }}>
              {projects.map(proj => {
                const totalCards = proj.cardsCount || 0;
                const totalLanes = proj.lanesCount || 0;
                // Elegant mock progress simulation: 20% base per lane, capped at 100% or just standard 65% for aesthetics
                const compProgress = totalCards > 0 ? Math.min(Math.round((totalLanes * 15) + (totalCards * 5)), 100) : 0;

                return (
                  <div 
                    key={proj.id}
                    className="glass-card project-card"
                    onClick={() => onSelectProject(proj.id)}
                    style={{
                      padding: '24px',
                      borderRadius: '16px',
                      border: '1px solid var(--border-glass)',
                      minHeight: '220px',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                      position: 'relative',
                      overflow: 'hidden'
                    }}
                  >
                    <div>
                      {/* Top Badges & Gradient Icon */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
                        <div style={{
                          background: getGradientByName(proj.name),
                          width: '36px',
                          height: '36px',
                          borderRadius: '10px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontWeight: '800',
                          color: '#fff',
                          boxShadow: '0 4px 10px rgba(0,0,0,0.2)'
                        }}>
                          {proj.name.slice(0, 1).toUpperCase()}
                        </div>
                        
                        <span style={{
                          fontSize: '0.7rem',
                          background: proj.ownerId === user.id ? 'rgba(99,102,241,0.15)' : 'rgba(6,182,212,0.15)',
                          color: proj.ownerId === user.id ? 'var(--primary)' : 'var(--accent-cyan)',
                          padding: '3px 10px',
                          borderRadius: '20px',
                          fontWeight: 600,
                          border: proj.ownerId === user.id ? '1px solid rgba(99,102,241,0.2)' : '1px solid rgba(6,182,212,0.2)'
                        }}>
                          {proj.ownerId === user.id ? 'Owner' : 'Collaborator'}
                        </span>
                      </div>

                      <h4 className="project-card-title" style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: '6px' }}>
                        {proj.name}
                      </h4>
                      <p className="project-card-desc" style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '16px', WebkitLineClamp: 2 }}>
                        {proj.description || 'No custom description supplied for this board.'}
                      </p>
                    </div>

                    <div>
                      {/* Technical Progress indicator */}
                      <div style={{ marginBottom: '16px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px', fontSize: '0.75rem' }}>
                          <span style={{ color: 'var(--text-secondary)', display: 'flex', gap: '8px' }}>
                            <strong style={{ color: 'var(--text-main)' }}>{totalLanes}</strong> Lanes
                            <span style={{ color: 'var(--text-muted)' }}>•</span>
                            <strong style={{ color: 'var(--text-main)' }}>{totalCards}</strong> Cards
                          </span>
                          <span style={{ color: 'var(--accent-cyan)', fontWeight: 600 }}>{compProgress}% Velocity</span>
                        </div>
                        <div style={{ width: '100%', height: '4px', background: 'rgba(255,255,255,0.05)', borderRadius: '10px', overflow: 'hidden' }}>
                          <div style={{
                            width: `${compProgress}%`,
                            height: '100%',
                            background: getGradientByName(proj.name),
                            borderRadius: '10px'
                          }}></div>
                        </div>
                      </div>

                      {/* Footer: stack and action */}
                      <div className="project-card-footer" style={{ borderTop: '1px solid var(--border-glass)', paddingTop: '14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <div className="avatar-stack">
                          <div className="avatar" title={`Owner: ${proj.owner?.username}`} style={{ width: '26px', height: '26px', fontSize: '0.65rem' }}>
                            {getInitials(proj.owner?.username)}
                          </div>
                          {proj.members.filter(m => m.id !== proj.ownerId).slice(0, 3).map(m => (
                            <div key={m.id} className="avatar" title={m.username} style={{ width: '26px', height: '26px', fontSize: '0.65rem', background: 'linear-gradient(135deg, #06b6d4, #ec4899)' }}>
                              {getInitials(m.username)}
                            </div>
                          ))}
                          {proj.members.length > 4 && (
                            <div className="avatar" style={{ width: '26px', height: '26px', fontSize: '0.6rem', background: 'var(--text-muted)' }} title={`${proj.members.length - 4} more`}>
                              +{proj.members.length - 4}
                            </div>
                          )}
                        </div>
                        
                        <span style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px',
                          fontSize: '0.75rem',
                          color: 'var(--primary)',
                          fontWeight: 600,
                          transition: 'transform 0.2s ease'
                        }} className="enter-board-link">
                          Enter Space
                          <ArrowRight size={12} />
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right Column: Signal Logs Feed & Quick Controls */}
        <div style={{ flex: '0.8 1 300px', display: 'flex', flexDirection: 'column', gap: '30px' }}>
          
          {/* Active Workspace Signals */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <h3 className="section-title" style={{ margin: 0 }}>
              <Activity size={18} style={{ color: 'var(--accent-pink)' }} />
              Workspace Signals
            </h3>

            <div className="glass-panel" style={{
              borderRadius: '20px',
              padding: '24px',
              display: 'flex',
              flexDirection: 'column',
              gap: '16px',
              background: 'rgba(10, 14, 23, 0.45)'
            }}>
              {recentNotifs.length === 0 ? (
                <div style={{
                  padding: '40px 10px',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '12px',
                  color: 'var(--text-muted)',
                  textAlign: 'center'
                }}>
                  <CheckCircle2 size={32} style={{ color: 'var(--priority-low)', strokeWidth: 1.5 }} />
                  <span style={{ fontSize: '0.85rem' }}>Signals list clear</span>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {recentNotifs.map(notif => (
                    <div 
                      key={notif.id}
                      style={{
                        padding: '12px 14px',
                        borderRadius: '10px',
                        background: notif.read ? 'rgba(255, 255, 255, 0.02)' : 'rgba(99, 102, 241, 0.05)',
                        borderLeft: notif.read ? '1px solid var(--border-glass)' : '3px solid var(--primary)',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '6px'
                      }}
                    >
                      <p style={{
                        fontSize: '0.8rem',
                        lineHeight: '1.4',
                        color: notif.read ? 'var(--text-secondary)' : 'var(--text-main)',
                        margin: 0
                      }}>
                        {notif.message}
                      </p>
                      <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>
                        {new Date(notif.createdAt).toLocaleDateString()} at {new Date(notif.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Quick Shortcuts */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <h3 className="section-title" style={{ margin: 0 }}>
              <Compass size={18} style={{ color: 'var(--accent-cyan)' }} />
              Quick Actions
            </h3>

            <div className="glass-panel" style={{
              borderRadius: '20px',
              padding: '24px',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px',
              background: 'rgba(10, 14, 23, 0.45)'
            }}>
              <button 
                onClick={() => setProjectModalOpen(true)}
                className="btn btn-secondary"
                style={{ justifyContent: 'flex-start', padding: '12px 16px', fontSize: '0.85rem' }}
              >
                <PlusCircle size={16} style={{ color: 'var(--primary)' }} />
                Initialize New Space
              </button>
              
              <div style={{
                marginTop: '12px',
                paddingTop: '16px',
                borderTop: '1px solid var(--border-glass)',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
                fontSize: '0.75rem',
                color: 'var(--text-secondary)'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>User Identity:</span>
                  <span style={{ color: 'var(--text-main)', fontWeight: 600 }}>{user?.username}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Connection:</span>
                  <span style={{ color: 'var(--priority-low)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--priority-low)', boxShadow: '0 0 6px var(--priority-low)' }}></span>
                    Online
                  </span>
                </div>
              </div>
            </div>
          </div>

        </div>

      </div>

      {/* Space Board Creation Dialog */}
      <ProjectModal 
        open={projectModalOpen} 
        onClose={() => setProjectModalOpen(false)}
        onCreated={handleProjectCreated}
      />
    </div>
  );
}
