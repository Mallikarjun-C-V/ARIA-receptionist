import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useVoiceAgent, STATUS } from './hooks/useVoiceAgent';
import VoiceInterface from './components/VoiceInterface';
import AdminPage from './pages/admin/AdminPage';

// ── Custom Cursor ────────────────────────────────────────────
function CustomCursor() {
  const dotRef = useRef(null);
  const ringRef = useRef(null);
  useEffect(() => {
    let raf;
    // Start at center so cursor is visible immediately
    let rx = window.innerWidth / 2, ry = window.innerHeight / 2;
    let mx = rx, my = ry;
    // Show immediately at center
    if (dotRef.current) { dotRef.current.style.left = mx + 'px'; dotRef.current.style.top = my + 'px'; dotRef.current.style.opacity = '1'; }
    if (ringRef.current) { ringRef.current.style.left = rx + 'px'; ringRef.current.style.top = ry + 'px'; ringRef.current.style.opacity = '1'; }
    const onMove = (e) => {
      mx = e.clientX; my = e.clientY;
      if (dotRef.current) { dotRef.current.style.opacity = '1'; }
      if (ringRef.current) { ringRef.current.style.opacity = '1'; }
    };
    window.addEventListener('mousemove', onMove);
    const loop = () => {
      rx += (mx - rx) * 0.15;
      ry += (my - ry) * 0.15;
      if (dotRef.current) { dotRef.current.style.left = mx + 'px'; dotRef.current.style.top = my + 'px'; }
      if (ringRef.current) { ringRef.current.style.left = rx + 'px'; ringRef.current.style.top = ry + 'px'; }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => { window.removeEventListener('mousemove', onMove); cancelAnimationFrame(raf); };
  }, []);
  return (
    <>
      <div ref={dotRef} className="cursor-dot" style={{ opacity: 1 }} />
      <div ref={ringRef} className="cursor-ring" style={{ opacity: 1 }} />
    </>
  );
}

// ── Ambient Background ───────────────────────────────────────
function AmbientBG() {
  return (
    <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0, overflow: 'hidden' }}>
      {/* Deep gradient base */}
      <div style={{
        position: 'absolute', inset: 0,
        background: 'radial-gradient(ellipse 80% 60% at 50% 0%, rgba(124,111,247,0.12) 0%, transparent 70%), radial-gradient(ellipse 60% 80% at 80% 100%, rgba(45,212,191,0.06) 0%, transparent 60%), radial-gradient(ellipse 50% 50% at 20% 50%, rgba(251,113,133,0.04) 0%, transparent 50%), #04040f',
      }} />
      {/* Grid lines */}
      <div style={{
        position: 'absolute', inset: 0,
        backgroundImage: 'linear-gradient(rgba(124,111,247,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(124,111,247,0.04) 1px, transparent 1px)',
        backgroundSize: '80px 80px',
        maskImage: 'radial-gradient(ellipse 80% 80% at 50% 50%, black 20%, transparent 100%)',
      }} />
      {/* Drifting orbs */}
      {[
        { c: 'rgba(124,111,247,0.1)', s: 700, t: -100, l: -100, d: '0s' },
        { c: 'rgba(45,212,191,0.06)', s: 500, b: 0, r: -80, d: '-6s' },
        { c: 'rgba(251,113,133,0.05)', s: 400, t: '40%', l: '60%', d: '-12s' },
      ].map((o, i) => (
        <div key={i} style={{
          position: 'absolute',
          width: o.s, height: o.s,
          borderRadius: '50%',
          background: `radial-gradient(circle, ${o.c}, transparent 70%)`,
          top: o.t, left: o.l, bottom: o.b, right: o.r,
          animation: `orbDrift 20s ease-in-out ${o.d} infinite`,
        }} />
      ))}
      {/* Scanline effect (very subtle) */}
      <div style={{
        position: 'absolute', inset: 0,
        background: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.03) 2px, rgba(0,0,0,0.03) 4px)',
        pointerEvents: 'none',
      }} />
    </div>
  );
}

// ── Hero Landing Page ────────────────────────────────────────
function HeroPage({ onOpenARIA, serverStatus }) {
  const words = ['Reservations', 'Experiences', 'Moments'];
  const [wordIdx, setWordIdx] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setWordIdx(i => (i + 1) % words.length), 2800);
    return () => clearInterval(t);
  }, []);

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      justifyContent: 'center', minHeight: '100vh',
      textAlign: 'center', padding: '0 24px',
      position: 'relative', zIndex: 1,
    }}>
      {/* Decorative rings behind hero */}
      <div style={{ position: 'absolute', width: 500, height: 500, borderRadius: '50%', border: '1px solid rgba(124,111,247,0.08)', animation: 'ringPulse 4s ease-in-out infinite' }} />
      <div style={{ position: 'absolute', width: 680, height: 680, borderRadius: '50%', border: '1px solid rgba(124,111,247,0.04)', animation: 'ringPulse 4s ease-in-out 1s infinite' }} />

      {/* Status pill */}
      <motion.div initial={{ opacity: 0, y: -16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
        style={{
          display: 'inline-flex', alignItems: 'center', gap: 7,
          padding: '6px 18px', borderRadius: 40,
          background: 'rgba(124,111,247,0.08)',
          border: '1px solid rgba(124,111,247,0.2)',
          marginBottom: 36,
        }}>
        <span style={{
          width: 6, height: 6, borderRadius: '50%',
          background: serverStatus === 'online' ? '#2dd4bf' : '#fb7185',
          display: 'inline-block',
          boxShadow: serverStatus === 'online' ? '0 0 8px #2dd4bf' : '0 0 8px #fb7185',
          animation: 'glowPulse 2s ease-in-out infinite',
        }} />
        <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: 11, letterSpacing: 2, textTransform: 'uppercase', fontWeight: 500 }}>
          {serverStatus === 'online' ? 'Live · Taking Reservations' : 'Offline · Check Backend'}
        </span>
      </motion.div>

      {/* Restaurant name */}
      <motion.h1 initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
        style={{
          fontFamily: 'var(--font-display)',
          fontSize: 'clamp(48px, 8vw, 96px)',
          fontWeight: 300,
          lineHeight: 1.0,
          letterSpacing: '-0.02em',
          marginBottom: 12,
          color: '#fff',
          animation: 'textGlow 4s ease-in-out infinite',
        }}>
        The Velvet Room
      </motion.h1>

      {/* Rotating word */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.35 }}
        style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 48 }}>
        <span style={{ color: 'var(--c-muted)', fontSize: 16, fontWeight: 300, letterSpacing: 3, textTransform: 'uppercase' }}>Curating</span>
        <AnimatePresence mode="wait">
          <motion.span key={wordIdx}
            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.4 }}
            style={{
              color: 'var(--c-violet)', fontSize: 16, fontWeight: 500,
              letterSpacing: 3, textTransform: 'uppercase',
              textShadow: '0 0 20px rgba(167,139,250,0.5)',
            }}>
            {words[wordIdx]}
          </motion.span>
        </AnimatePresence>
      </motion.div>

      {/* Info grid */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}
        style={{ display: 'flex', gap: 1, marginBottom: 72, flexWrap: 'wrap', justifyContent: 'center' }}>
        {[
          { label: 'Cuisine', val: 'Modern European' },
          { label: 'Hours', val: '5PM – 11PM' },
          { label: 'Location', val: 'Marina District' },
          { label: 'Dress', val: 'Smart Casual' },
        ].map((item, i) => (
          <div key={i} style={{
            padding: '14px 28px',
            background: 'rgba(255,255,255,0.03)',
            border: '1px solid rgba(255,255,255,0.06)',
            borderLeft: i === 0 ? '1px solid rgba(255,255,255,0.06)' : 'none',
            borderRadius: i === 0 ? '12px 0 0 12px' : i === 3 ? '0 12px 12px 0' : 0,
          }}>
            <p style={{ color: 'var(--c-muted)', fontSize: 9, letterSpacing: 2, textTransform: 'uppercase', marginBottom: 4 }}>{item.label}</p>
            <p style={{ color: '#fff', fontSize: 13, fontWeight: 400 }}>{item.val}</p>
          </div>
        ))}
      </motion.div>

      {/* CTA — the big beautiful button */}
      <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.65, type: 'spring', stiffness: 200 }}
        style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>

        {/* Glow rings around button */}
        <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{
            position: 'absolute', width: 180, height: 180,
            borderRadius: '54% 46% 52% 48% / 50% 54% 46% 50%',
            border: '1px solid rgba(124,111,247,0.25)',
            animation: 'amoeba1 12s ease-in-out infinite, ringPulse 3s ease-in-out infinite',
          }} />
          <div style={{
            position: 'absolute', width: 230, height: 230,
            borderRadius: '48% 52% 55% 45% / 54% 48% 52% 46%',
            border: '1px solid rgba(124,111,247,0.12)',
            animation: 'amoeba2 15s ease-in-out infinite, ringPulse 3s ease-in-out 0.6s infinite',
          }} />
          <div style={{
            position: 'absolute', width: 290, height: 290,
            borderRadius: '52% 48% 48% 52% / 46% 52% 54% 48%',
            border: '1px solid rgba(124,111,247,0.06)',
            animation: 'amoeba3 18s ease-in-out infinite, ringPulse 3s ease-in-out 1.2s infinite',
          }} />

          <motion.button
            onClick={onOpenARIA}
            whileHover={{ scale: 1.06 }}
            whileTap={{ scale: 0.94 }}
            style={{
              width: 130, height: 130,
              borderRadius: '54% 46% 52% 48% / 50% 54% 46% 50%',
              background: 'linear-gradient(135deg, rgba(124,111,247,0.88), rgba(167,139,250,0.75), rgba(124,111,247,0.88))',
              border: '1px solid rgba(255,255,255,0.18)',
              color: '#fff',
              cursor: 'pointer',
              display: 'flex', flexDirection: 'column',
              alignItems: 'center', justifyContent: 'center', gap: 5,
              boxShadow: '0 0 60px rgba(124,111,247,0.55), 0 0 120px rgba(124,111,247,0.2), inset 0 1px 0 rgba(255,255,255,0.18)',
              backdropFilter: 'blur(24px)',
              WebkitBackdropFilter: 'blur(24px)',
              position: 'relative', zIndex: 1,
              animation: 'amoeba1 10s ease-in-out infinite, glowPulse 3s ease-in-out infinite',
            }}
          >
            {/* Glass shine */}
            <div style={{
              position: 'absolute', top: '14%', left: '20%',
              width: '32%', height: '18%',
              background: 'linear-gradient(135deg, rgba(255,255,255,0.2), transparent)',
              borderRadius: '50%', filter: 'blur(4px)', pointerEvents: 'none',
            }} />
            <span style={{ fontSize: 30, position: 'relative', zIndex: 1 }}>✦</span>
            <span style={{ fontSize: 8, letterSpacing: 2.5, textTransform: 'uppercase', fontWeight: 600, opacity: 0.85, position: 'relative', zIndex: 1 }}>Talk to ARIA</span>
          </motion.button>
        </div>

        <p style={{ color: 'var(--c-muted)', fontSize: 11, letterSpacing: 1 }}>
          Voice AI Receptionist · Powered by Gemini
        </p>
      </motion.div>
    </div>
  );
}

// ── Main App ─────────────────────────────────────────────────
export default function App() {
  const [isOpen, setIsOpen] = useState(false);
  const [showAdmin, setShowAdmin] = useState(false);
  const [hasGreeted, setHasGreeted] = useState(false);
  const [serverStatus, setServerStatus] = useState('checking');

  const { messages, status, transcript, isOnline, handleMicClick, sendTextMessage, clearConversation, greet } = useVoiceAgent();

  useEffect(() => { setServerStatus(isOnline ? 'online' : 'offline'); }, [isOnline]);

  const handleOpen = useCallback(() => {
    setIsOpen(true);
    if (!hasGreeted) { setHasGreeted(true); setTimeout(greet, 400); }
  }, [hasGreeted, greet]);

  const handleClear = useCallback(() => {
    clearConversation(); setHasGreeted(false);
  }, [clearConversation]);

  useEffect(() => {
    const fn = (e) => { if (e.key === 'Escape') setIsOpen(false); };
    window.addEventListener('keydown', fn);
    return () => window.removeEventListener('keydown', fn);
  }, []);

  return (
    <div style={{ minHeight: '100vh', background: 'var(--c-bg)', position: 'relative', overflow: 'hidden' }}>
      <CustomCursor />
      <AmbientBG />

      {/* Top nav */}
      <header style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 200,
        padding: '0 32px', height: 60,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        background: 'rgba(4,4,15,0.7)',
        backdropFilter: 'blur(20px)',
        borderBottom: '1px solid rgba(255,255,255,0.05)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{
            width: 30, height: 30, borderRadius: '50%',
            background: 'linear-gradient(135deg, #7c6ff7, #a78bfa)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 13, boxShadow: '0 0 16px rgba(124,111,247,0.5)',
            animation: 'glowPulse 3s ease-in-out infinite',
          }}>✦</div>
          <span style={{ fontFamily: 'var(--font-display)', color: '#fff', fontSize: 18, fontWeight: 300, letterSpacing: 1 }}>ARIA</span>
          <span style={{ width: 1, height: 16, background: 'rgba(255,255,255,0.1)' }} />
          <span style={{ color: 'var(--c-muted)', fontSize: 10, letterSpacing: 3, textTransform: 'uppercase' }}>Voice Receptionist</span>
        </div>

        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 6,
            padding: '5px 12px', borderRadius: 30,
            background: serverStatus === 'online' ? 'rgba(45,212,191,0.08)' : 'rgba(251,113,133,0.08)',
            border: `1px solid ${serverStatus === 'online' ? 'rgba(45,212,191,0.2)' : 'rgba(251,113,133,0.2)'}`,
          }}>
            <span style={{
              width: 5, height: 5, borderRadius: '50%',
              background: serverStatus === 'online' ? '#2dd4bf' : '#fb7185',
              display: 'inline-block',
              boxShadow: serverStatus === 'online' ? '0 0 6px #2dd4bf' : '0 0 6px #fb7185',
            }} />
            <span style={{ color: serverStatus === 'online' ? '#2dd4bf' : '#fb7185', fontSize: 10, fontWeight: 500, letterSpacing: 0.5 }}>
              {serverStatus === 'checking' ? 'Checking' : serverStatus === 'online' ? 'Online' : 'Offline'}
            </span>
          </div>
          <button onClick={() => setShowAdmin(true)} style={{
            background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
            color: 'var(--c-muted)', borderRadius: 8, padding: '6px 14px',
            cursor: 'pointer', fontSize: 11, fontFamily: 'inherit', letterSpacing: 0.5,
            transition: 'all 0.2s',
          }}
            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(124,111,247,0.12)'; e.currentTarget.style.color = 'var(--c-violet)'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; e.currentTarget.style.color = 'var(--c-muted)'; }}
          >Admin</button>
        </div>
      </header>

      {/* Main */}
      <main style={{ position: 'relative', zIndex: 1, paddingTop: 60 }}>
        <AnimatePresence mode="wait">
          {!isOpen ? (
            <motion.div key="hero" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, scale: 0.97 }} transition={{ duration: 0.4 }}>
              <HeroPage onOpenARIA={handleOpen} serverStatus={serverStatus} />
            </motion.div>
          ) : (
            <motion.div key="voice" initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.4 }}>
              <VoiceInterface
                messages={messages}
                status={status}
                transcript={transcript}
                onMicClick={handleMicClick}
                onSuggestionClick={sendTextMessage}
                onClose={() => setIsOpen(false)}
                onClear={handleClear}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      <AnimatePresence>
        {showAdmin && <AdminPage onClose={() => setShowAdmin(false)} />}
      </AnimatePresence>
    </div>
  );
}
