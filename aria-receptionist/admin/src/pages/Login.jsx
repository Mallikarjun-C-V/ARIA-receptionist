import { useState } from 'react';
import { motion } from 'framer-motion';
import { login } from '../services/api';

export default function Login({ onLogin }) {
  const [u, setU] = useState('');
  const [p, setP] = useState('');
  const [err, setErr] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!u || !p) { setErr('Enter username and password'); return; }
    setLoading(true); setErr('');
    try {
      const res = await login(u, p);
      localStorage.setItem('aria_admin_token', res.token);
      localStorage.setItem('aria_admin_user', res.username);
      onLogin(res.username);
    } catch (e) {
      setErr(e.message || 'Invalid credentials');
    } finally { setLoading(false); }
  }

  const inp = {
    width: '100%', padding: '12px 16px',
    background: 'rgba(255,255,255,0.05)',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: 10, color: '#fff', fontSize: 14,
    fontFamily: 'var(--font-b)', outline: 'none',
    transition: 'border-color 0.2s',
  };

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'radial-gradient(ellipse 80% 60% at 50% 0%, rgba(124,111,247,0.1) 0%, transparent 70%), var(--bg)',
      padding: 20,
    }}>
      {/* Background grid */}
      <div style={{
        position: 'fixed', inset: 0,
        backgroundImage: 'linear-gradient(rgba(124,111,247,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(124,111,247,0.04) 1px, transparent 1px)',
        backgroundSize: '60px 60px', pointerEvents: 'none',
      }} />

      <motion.div
        initial={{ opacity: 0, y: 24, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        style={{
          width: 'min(420px, 100%)',
          background: 'rgba(10,10,24,0.9)',
          border: '1px solid rgba(124,111,247,0.2)',
          borderRadius: 24,
          padding: '40px 36px',
          backdropFilter: 'blur(24px)',
          boxShadow: '0 40px 100px rgba(0,0,0,0.8), 0 0 60px rgba(124,111,247,0.08)',
          position: 'relative', zIndex: 1,
        }}
      >
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 36 }}>
          <motion.div
            animate={{ boxShadow: ['0 0 20px rgba(124,111,247,0.4)', '0 0 40px rgba(124,111,247,0.7)', '0 0 20px rgba(124,111,247,0.4)'] }}
            transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
            style={{
              width: 60, height: 60, borderRadius: '50%',
              background: 'linear-gradient(135deg, #7c6ff7, #a78bfa)',
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 26, marginBottom: 16,
            }}
          >✦</motion.div>
          <h1 style={{ fontFamily: 'var(--font-d)', fontSize: 28, fontWeight: 300, color: '#fff', margin: '0 0 6px' }}>
            The Velvet Room
          </h1>
          <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: 11, letterSpacing: 3, textTransform: 'uppercase' }}>
            Admin Dashboard
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <label style={{ color: 'rgba(255,255,255,0.4)', fontSize: 10, letterSpacing: 2, textTransform: 'uppercase', display: 'block', marginBottom: 6 }}>
              Username
            </label>
            <input
              value={u} onChange={e => setU(e.target.value)}
              placeholder="admin"
              autoComplete="username"
              style={inp}
              onFocus={e => e.target.style.borderColor = 'rgba(124,111,247,0.5)'}
              onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.1)'}
            />
          </div>
          <div>
            <label style={{ color: 'rgba(255,255,255,0.4)', fontSize: 10, letterSpacing: 2, textTransform: 'uppercase', display: 'block', marginBottom: 6 }}>
              Password
            </label>
            <input
              type="password"
              value={p} onChange={e => setP(e.target.value)}
              placeholder="••••••••"
              autoComplete="current-password"
              style={inp}
              onFocus={e => e.target.style.borderColor = 'rgba(124,111,247,0.5)'}
              onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.1)'}
            />
          </div>

          {err && (
            <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }}
              style={{
                background: 'rgba(251,113,133,0.1)', border: '1px solid rgba(251,113,133,0.3)',
                borderRadius: 8, padding: '10px 14px', color: '#fda4af', fontSize: 13,
              }}>
              {err}
            </motion.div>
          )}

          <motion.button
            type="submit" disabled={loading}
            whileHover={!loading ? { scale: 1.02 } : {}}
            whileTap={!loading ? { scale: 0.98 } : {}}
            style={{
              marginTop: 6,
              padding: '14px',
              background: loading ? 'rgba(124,111,247,0.5)' : 'linear-gradient(135deg, #7c6ff7, #a78bfa)',
              border: 'none', borderRadius: 12, color: '#fff',
              fontSize: 14, fontWeight: 600, cursor: loading ? 'default' : 'pointer',
              letterSpacing: 0.5,
              boxShadow: loading ? 'none' : '0 0 30px rgba(124,111,247,0.35)',
              transition: 'all 0.3s',
            }}
          >
            {loading ? 'Signing in…' : 'Sign In'}
          </motion.button>
        </form>

        <p style={{ color: 'rgba(255,255,255,0.15)', fontSize: 11, textAlign: 'center', marginTop: 24 }}>
          Staff access only · ARIA Receptionist System
        </p>
      </motion.div>
    </div>
  );
}
