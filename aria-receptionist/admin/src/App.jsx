import { useState, useEffect } from 'react';
import Login from './pages/Login.jsx';
import Dashboard from './pages/Dashboard.jsx';

export default function App() {
  const [user, setUser] = useState(null);

  // Restore session on reload
  useEffect(() => {
    const token = localStorage.getItem('aria_admin_token');
    const saved = localStorage.getItem('aria_admin_user');
    if (token && saved) setUser(saved);
  }, []);

  function handleLogin(username) {
    setUser(username);
  }

  function handleLogout() {
    localStorage.removeItem('aria_admin_token');
    localStorage.removeItem('aria_admin_user');
    setUser(null);
  }

  if (!user) return <Login onLogin={handleLogin} />;
  return <Dashboard user={user} onLogout={handleLogout} />;
}
