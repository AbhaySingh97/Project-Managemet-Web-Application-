import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { useAuth } from './AuthContext';

const SocketContext = createContext(null);

const WS_BASE_URL = import.meta.env.VITE_WS_URL || `${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${window.location.hostname}:5000`;


export function SocketProvider({ children }) {
  const { user, token } = useAuth();
  const [connected, setConnected] = useState(false);
  const socketRef = useRef(null);
  
  // Store listeners by event name
  const listenersRef = useRef(new Map());

  // Helper to add message listener
  const addListener = (event, callback) => {
    if (!listenersRef.current.has(event)) {
      listenersRef.current.set(event, new Set());
    }
    listenersRef.current.get(event).add(callback);

    // Return unsubscriber function
    return () => {
      const eventListeners = listenersRef.current.get(event);
      if (eventListeners) {
        eventListeners.delete(callback);
        if (eventListeners.size === 0) {
          listenersRef.current.delete(event);
        }
      }
    };
  };

  useEffect(() => {
    if (!user || !token) {
      if (socketRef.current) {
        socketRef.current.close();
      }
      setConnected(false);
      return;
    }

    let socketUrl = `${WS_BASE_URL}?token=${token}`;
    let reconnectTimeout = null;
    let ws = null;

    function connect() {
      console.log('Connecting to WebSocket server...');
      ws = new WebSocket(socketUrl);
      socketRef.current = ws;

      ws.onopen = () => {
        console.log('WebSocket connection established');
        setConnected(true);
      };

      ws.onmessage = (event) => {
        try {
          const { event: eventName, payload } = JSON.parse(event.data);
          console.log(`WebSocket received event: ${eventName}`, payload);
          
          const eventListeners = listenersRef.current.get(eventName);
          if (eventListeners) {
            eventListeners.forEach(cb => cb(payload));
          }
        } catch (err) {
          console.error('Failed to parse WebSocket message:', err);
        }
      };

      ws.onclose = (e) => {
        console.log('WebSocket connection closed', e.reason);
        setConnected(false);
        socketRef.current = null;
        
        // Auto-reconnect after 3 seconds if user is still logged in
        if (token) {
          reconnectTimeout = setTimeout(() => {
            connect();
          }, 3000);
        }
      };

      ws.onerror = (err) => {
        console.error('WebSocket error:', err);
        ws.close();
      };
    }

    connect();

    return () => {
      if (ws) {
        ws.close();
      }
      if (reconnectTimeout) {
        clearTimeout(reconnectTimeout);
      }
    };
  }, [user, token]);

  const joinProject = (projectId) => {
    if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify({
        action: 'join_project',
        payload: { projectId }
      }));
    } else {
      console.warn('Socket not connected. Cannot join project room yet.');
    }
  };

  const leaveProject = () => {
    if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify({
        action: 'leave_project'
      }));
    }
  };

  const value = {
    connected,
    joinProject,
    leaveProject,
    addListener
  };

  return <SocketContext.Provider value={value}>{children}</SocketContext.Provider>;
}

export function useSocket() {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error('useSocket must be used within a SocketProvider');
  }
  return context;
}
