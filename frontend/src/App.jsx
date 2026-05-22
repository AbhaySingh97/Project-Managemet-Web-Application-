import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { SocketProvider } from './context/SocketContext';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import ProjectDetail from './pages/ProjectDetail';
import Navbar from './components/Navbar';
import Sidebar from './components/Sidebar';

function AppContent() {
  const { user, loading } = useAuth();
  const [activeProjectId, setActiveProjectId] = useState(null);

  if (loading) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100vh',
        width: '100vw',
        background: 'var(--bg-dark)',
        color: 'var(--text-secondary)',
        fontFamily: 'var(--font-display)',
        fontSize: '1rem'
      }}>
        Syncing secure workspace...
      </div>
    );
  }

  // Not logged in -> Render Login/Register Form
  if (!user) {
    return <Login />;
  }

  // Logged in -> Render Collaborative Workspace Layout
  return (
    <SocketProvider>
      <div className="app-container">
        
        {/* Sleek Sidebar Navigation */}
        <Sidebar 
          activeProjectId={activeProjectId}
          onSelectProject={(id) => setActiveProjectId(id)}
          onGoToDashboard={() => setActiveProjectId(null)}
        />

        {/* Main Work Area Column */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden' }}>
          
          {/* Main Top Header */}
          <Navbar />

          {/* Dynamic Inner Page Loader */}
          {activeProjectId ? (
            <ProjectDetail 
              projectId={activeProjectId} 
              onGoBack={() => setActiveProjectId(null)} 
            />
          ) : (
            <Dashboard 
              onSelectProject={(id) => setActiveProjectId(id)} 
            />
          )}

        </div>

      </div>
    </SocketProvider>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
