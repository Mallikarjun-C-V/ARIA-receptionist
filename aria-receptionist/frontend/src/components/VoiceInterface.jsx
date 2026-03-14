import { useRef, useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { STATUS } from '../hooks/useVoiceAgent';
import BookingCard from './BookingCard';

// ── Amoeba Blob ───────────────────────────────────────────────
function AmoebaBlobCore({ status }) {
  const colors = {
    [STATUS.IDLE]:       { inner: 'rgba(124,111,247,0.18)', mid: 'rgba(124,111,247,0.08)', outer: 'rgba(124,111,247,0.03)', glow: 'rgba(124,111,247,0.4)' },
    [STATUS.LISTENING]:  { inner: 'rgba(251,113,133,0.22)', mid: 'rgba(251,113,133,0.1)',  outer: 'rgba(251,113,133,0.04)', glow: 'rgba(251,113,133,0.5)' },
    [STATUS.PROCESSING]: { inner: 'rgba(251,191,36,0.18)',  mid: 'rgba(251,191,36,0.08)',  outer: 'rgba(251,191,36,0.03)',  glow: 'rgba(251,191,36,0.4)'  },
    [STATUS.SPEAKING]:   { inner: 'rgba(45,212,191,0.2)',   mid: 'rgba(45,212,191,0.09)',  outer: 'rgba(45,212,191,0.03)', glow: 'rgba(45,212,191,0.45)' },
  };
  const c = colors[status] || colors[STATUS.IDLE];
  const isActive = status !== STATUS.IDLE;

  return (
    // Bigger: 340px instead of 280px
    <div style={{ position: 'relative', width: 340, height: 340, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      {/* Outermost glow halo — faster: 10s */}
      <div style={{
        position: 'absolute', width: '100%', height: '100%',
        background: `radial-gradient(circle, ${c.outer} 0%, transparent 70%)`,
        animation: 'amoeba3 10s ease-in-out infinite, blobPulse 3s ease-in-out infinite',
        filter: 'blur(24px)', transform: 'scale(1.4)',
      }} />
      {/* Middle layer — faster: 7s */}
      <div style={{
        position: 'absolute', width: '82%', height: '82%',
        background: `radial-gradient(circle at 40% 40%, ${c.mid}, transparent 70%)`,
        animation: 'amoeba2 7s ease-in-out infinite',
        filter: 'blur(12px)', opacity: 0.9,
      }} />
      {/* Core blob — faster: active 4s / idle 6s */}
      <div style={{
        position: 'absolute', width: '68%', height: '68%',
        background: c.inner,
        backdropFilter: 'blur(40px)', WebkitBackdropFilter: 'blur(40px)',
        border: '1px solid rgba(255,255,255,0.12)',
        animation: `amoeba1 ${isActive ? 4 : 6}s ease-in-out infinite`,
        boxShadow: `0 0 60px ${c.glow}, 0 0 120px ${c.glow.replace('0.4', '0.15')}, inset 0 1px 0 rgba(255,255,255,0.1)`,
        transition: 'background 0.6s ease, box-shadow 0.6s ease',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <div style={{
          position: 'absolute', top: '12%', left: '18%',
          width: '35%', height: '20%',
          background: 'linear-gradient(135deg, rgba(255,255,255,0.15), transparent)',
          borderRadius: '50%', filter: 'blur(6px)',
        }} />
        <StatusIcon status={status} color={c.glow} />
      </div>
      {/* Rotating rings */}
      <div style={{ position: 'absolute', width: '75%', height: '75%', borderRadius: '50%', border: '1px dashed rgba(255,255,255,0.06)', animation: 'spin 30s linear infinite' }} />
      <div style={{ position: 'absolute', width: '90%', height: '90%', borderRadius: '50%', border: '1px dashed rgba(255,255,255,0.04)', animation: 'spin 20s linear infinite reverse' }} />
    </div>
  );
}

function StatusIcon({ status, color }) {
  const icons = {
    [STATUS.IDLE]:       { icon: '✦', label: 'ARIA' },
    [STATUS.LISTENING]:  { icon: '◉', label: 'Listening' },
    [STATUS.PROCESSING]: { icon: '◈', label: 'Thinking' },
    [STATUS.SPEAKING]:   { icon: '◇', label: 'Speaking' },
  };
  const { icon, label } = icons[status] || icons[STATUS.IDLE];
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, zIndex: 1 }}>
      <motion.div key={status} initial={{ scale: 0.5, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: 'spring', stiffness: 300 }}
        style={{ fontSize: 28, color: '#fff', textShadow: `0 0 20px ${color}`,
          animation: status === STATUS.LISTENING ? 'blobPulse 1s ease-in-out infinite' : status === STATUS.SPEAKING ? 'blobPulse 0.8s ease-in-out infinite' : 'floatUp 4s ease-in-out infinite',
        }}>{icon}</motion.div>
      <span style={{ fontFamily: 'var(--font-body)', fontSize: 8, letterSpacing: 3, textTransform: 'uppercase', color: 'rgba(255,255,255,0.45)', fontWeight: 500 }}>{label}</span>
    </div>
  );
}

// ── Waveform ──────────────────────────────────────────────────
function LiveWave({ active, color }) {
  const [bars, setBars] = useState(Array(18).fill(3));
  const raf = useRef(null);
  useEffect(() => {
    if (!active) { setBars(Array(18).fill(3)); if (raf.current) cancelAnimationFrame(raf.current); return; }
    const go = () => {
      const t = Date.now() / 1000;
      setBars(Array.from({ length: 18 }, (_, i) => {
        const v = (Math.sin(t * 4 + i * 0.5) * 0.5 + 0.5) * (Math.sin(t * 2.3 + i * 0.8) * 0.3 + 0.7);
        return Math.max(3, v * 28);
      }));
      raf.current = requestAnimationFrame(go);
    };
    raf.current = requestAnimationFrame(go);
    return () => { if (raf.current) cancelAnimationFrame(raf.current); };
  }, [active]);
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 3, height: 36 }}>
      {bars.map((h, i) => (
        <div key={i} style={{ width: 2.5, height: h, borderRadius: 2, background: color, transition: active ? 'height 0.07s ease' : 'height 0.5s ease', opacity: 0.45 + (i % 4) * 0.13 }} />
      ))}
    </div>
  );
}

// ── Mic Button ────────────────────────────────────────────────
function CentralMicButton({ status, onClick }) {
  const cfg = {
    [STATUS.IDLE]:       { bg: 'linear-gradient(135deg, #7c6ff7, #a78bfa)', icon: '🎙', label: 'Tap to speak', shadow: '0 0 40px rgba(124,111,247,0.5)' },
    [STATUS.LISTENING]:  { bg: 'linear-gradient(135deg, #fb7185, #f43f5e)', icon: '⏹', label: 'Tap to stop',  shadow: '0 0 50px rgba(251,113,133,0.6)' },
    [STATUS.PROCESSING]: { bg: 'linear-gradient(135deg, #fbbf24, #f59e0b)', icon: '…',  label: 'Processing',  shadow: '0 0 40px rgba(251,191,36,0.5)'  },
    [STATUS.SPEAKING]:   { bg: 'linear-gradient(135deg, #2dd4bf, #0d9488)', icon: '♫',  label: 'Speaking',    shadow: '0 0 40px rgba(45,212,191,0.5)'  },
  };
  const { bg, icon, label, shadow } = cfg[status] || cfg[STATUS.IDLE];
  const isDisabled = status === STATUS.PROCESSING;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, position: 'relative' }}>
      {status === STATUS.LISTENING && [1,2,3].map(i => (
        <div key={i} style={{ position: 'absolute', width: 72, height: 72, borderRadius: '50%', border: '2px solid rgba(251,113,133,0.3)', animation: `ripple 2s ease-out ${i * 0.5}s infinite`, pointerEvents: 'none' }} />
      ))}
      <motion.button onClick={onClick} disabled={isDisabled}
        whileHover={!isDisabled ? { scale: 1.1 } : {}} whileTap={!isDisabled ? { scale: 0.9 } : {}}
        animate={status === STATUS.LISTENING ? { scale: [1, 1.05, 1] } : {}}
        transition={status === STATUS.LISTENING ? { duration: 1.2, repeat: Infinity } : { type: 'spring', stiffness: 300 }}
        style={{ width: 64, height: 64, borderRadius: '50%', background: bg, border: '1px solid rgba(255,255,255,0.2)', color: '#fff', fontSize: 22, cursor: isDisabled ? 'default' : 'pointer', boxShadow: shadow + ', inset 0 1px 0 rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: isDisabled ? 0.6 : 1, transition: 'background 0.4s ease, box-shadow 0.4s ease' }}
      >{icon}</motion.button>
      <motion.span key={status} initial={{ opacity: 0 }} animate={{ opacity: 1 }}
        style={{ color: 'var(--c-muted)', fontSize: 8, letterSpacing: 2, textTransform: 'uppercase', fontWeight: 500 }}>
        {label}
      </motion.span>
    </div>
  );
}

// ── Processing Dots ───────────────────────────────────────────
function ProcessingDots() {
  return (
    <div style={{ display: 'flex', gap: 5, alignItems: 'center', padding: '10px 0' }}>
      {[0,1,2].map(i => (
        <div key={i} style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--c-violet)', animation: `dotBounce 1.2s ease-in-out ${i * 0.2}s infinite`, boxShadow: '0 0 8px rgba(167,139,250,0.6)' }} />
      ))}
    </div>
  );
}

// ── Message Row (WhatsApp style) ──────────────────────────────
function MessageRow({ msg, onSuggestionClick }) {
  const isUser = msg.role === 'user';
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
      style={{
        display: 'flex',
        justifyContent: isUser ? 'flex-end' : 'flex-start',
        marginBottom: 18,
        paddingLeft: isUser ? 0 : 100,
        paddingRight: isUser ? 100 : 0,
      }}
    >
      <div style={{ maxWidth: '42%', display: 'flex', flexDirection: 'column', alignItems: isUser ? 'flex-end' : 'flex-start' }}>
        <span style={{ fontSize: 8, letterSpacing: 2, textTransform: 'uppercase', fontWeight: 600, color: isUser ? 'rgba(167,139,250,0.5)' : 'rgba(45,212,191,0.5)', marginBottom: 4 }}>
          {isUser ? 'You' : 'ARIA'}
        </span>
        <div style={{
          padding: '11px 15px',
          borderRadius: isUser ? '16px 4px 16px 16px' : '4px 16px 16px 16px',
          background: isUser
            ? 'linear-gradient(135deg, rgba(124,111,247,0.28), rgba(167,139,250,0.16))'
            : 'rgba(255,255,255,0.06)',
          border: isUser ? '1px solid rgba(124,111,247,0.32)' : '1px solid rgba(255,255,255,0.09)',
          backdropFilter: 'blur(14px)', WebkitBackdropFilter: 'blur(14px)',
          color: '#fff', fontSize: 13, lineHeight: 1.7, fontWeight: 300, letterSpacing: 0.2,
          boxShadow: isUser ? '0 4px 20px rgba(124,111,247,0.14)' : '0 4px 20px rgba(0,0,0,0.18)',
        }}>
          {msg.content}
        </div>
        {msg.booking && <BookingCard booking={msg.booking} />}
        {msg.suggestions?.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginTop: 7, justifyContent: isUser ? 'flex-end' : 'flex-start' }}>
            {msg.suggestions.map((s, i) => (
              <motion.button key={i} whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }}
                onClick={() => onSuggestionClick?.(s)}
                style={{ padding: '4px 12px', borderRadius: 20, background: 'rgba(124,111,247,0.1)', border: '1px solid rgba(124,111,247,0.25)', color: 'var(--c-violet)', fontSize: 10, cursor: 'pointer', fontFamily: 'inherit', fontWeight: 500, letterSpacing: 0.3 }}
              >{s}</motion.button>
            ))}
          </div>
        )}
        <span style={{ color: 'rgba(255,255,255,0.15)', fontSize: 9, marginTop: 4 }}>
          {new Date(msg.ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          {!isUser && msg.intent ? ` · ${msg.intent.replace(/_/g, ' ')}` : ''}
        </span>
      </div>
    </motion.div>
  );
}

// ── Main Voice Interface ──────────────────────────────────────
export default function VoiceInterface({ messages, status, transcript, onMicClick, onSuggestionClick, onClose, onClear }) {
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, status]);

  const waveColor = status === STATUS.LISTENING ? '#fb7185' : status === STATUS.SPEAKING ? '#2dd4bf' : '#7c6ff7';

  return (
    <div style={{ height: '100vh', width: '100vw', overflow: 'hidden', position: 'relative' }}>

      {/* ── LAYER 1 (bottom): Blob — purely visual, no pointer events ── */}
      <div style={{
        position: 'fixed',
        top: 60,
        left: '50%',
        transform: 'translateX(-50%)',
        width: 360,
        height: 'calc(100vh - 60px)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        // LOW z-index — sits behind chat text
        zIndex: 2,
        // Entire blob layer is click-through — chat scrolls freely over it
        pointerEvents: 'none',
      }}>
        {/* Subtle vertical divider */}
        <div style={{ position: 'absolute', top: 0, bottom: 0, left: '50%', width: 1, background: 'linear-gradient(to bottom, transparent, rgba(124,111,247,0.07) 20%, rgba(124,111,247,0.07) 80%, transparent)', transform: 'translateX(-50%)' }} />
        <AmoebaBlobCore status={status} />
      </div>

      {/* ── LAYER 2 (middle): Scrollable chat — above blob visually ── */}
      <div style={{
        position: 'absolute',
        inset: 0,
        overflowY: 'auto',
        overflowX: 'hidden',
        paddingTop: 100,
        paddingBottom: 80,
        // ABOVE blob
        zIndex: 5,
        // transparent background so blob glows show through
        background: 'transparent',
      }}>
        {/* Sticky column headers */}
        <div style={{
          position: 'sticky', top: 0, zIndex: 6,
          display: 'flex', justifyContent: 'space-between',
          padding: '8px 100px 12px',
          background: 'linear-gradient(to bottom, var(--c-bg) 70%, transparent)',
          pointerEvents: 'none',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'rgba(45,212,191,0.5)', fontSize: 8, letterSpacing: 3, textTransform: 'uppercase', fontWeight: 600 }}>
            <div style={{ width: 4, height: 4, borderRadius: '50%', background: '#2dd4bf', boxShadow: '0 0 6px #2dd4bf' }} />
            ARIA
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'rgba(167,139,250,0.5)', fontSize: 8, letterSpacing: 3, textTransform: 'uppercase', fontWeight: 600 }}>
            You
            <div style={{ width: 4, height: 4, borderRadius: '50%', background: '#a78bfa', boxShadow: '0 0 6px #a78bfa' }} />
          </div>
        </div>

        {messages.length === 0 && (
          <div style={{ textAlign: 'center', color: 'rgba(255,255,255,0.1)', fontSize: 12, marginTop: 60 }}>
            Speak to begin your conversation
          </div>
        )}

        {messages.map(msg => (
          <MessageRow key={msg.id} msg={msg} onSuggestionClick={onSuggestionClick} />
        ))}

        {status === STATUS.PROCESSING && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
            style={{ display: 'flex', justifyContent: 'flex-start', paddingLeft: 100, marginBottom: 18 }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
              <span style={{ fontSize: 8, letterSpacing: 2, textTransform: 'uppercase', color: 'rgba(45,212,191,0.5)', fontWeight: 600, marginBottom: 4 }}>ARIA</span>
              <div style={{ padding: '10px 16px', borderRadius: '4px 16px 16px 16px', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.09)' }}>
                <ProcessingDots />
              </div>
            </div>
          </motion.div>
        )}

        <div ref={bottomRef} style={{ height: 1 }} />
      </div>

      {/* ── LAYER 3 (top): Controls only — mic, waveform, buttons ── */}
      {/* Split into two separate fixed elements so chat clicks pass through the center gap */}
      <div style={{
        position: 'fixed',
        top: 60,
        left: '50%',
        transform: 'translateX(-50%)',
        width: 320,
        height: 'calc(100vh - 60px)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'flex-end',
        paddingBottom: 36,
        gap: 20,
        // TOP z-index — buttons always clickable
        zIndex: 20,
        // Only the actual interactive elements inside will capture events
        pointerEvents: 'none',
      }}>
        <div style={{ pointerEvents: 'auto', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>

          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
            <LiveWave active={status === STATUS.LISTENING || status === STATUS.SPEAKING} color={waveColor} />
            <AnimatePresence>
              {transcript && status === STATUS.LISTENING && (
                <motion.p initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }}
                  style={{ color: 'rgba(255,255,255,0.4)', fontSize: 10, fontStyle: 'italic', textAlign: 'center', maxWidth: 240, lineHeight: 1.5 }}>
                  "{transcript}"
                </motion.p>
              )}
            </AnimatePresence>
          </div>

          <CentralMicButton status={status} onClick={onMicClick} />

          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={onClear} style={{ background: 'rgba(10,10,20,0.7)', border: '1px solid rgba(255,255,255,0.1)', color: 'var(--c-muted)', borderRadius: 8, padding: '5px 12px', cursor: 'pointer', fontSize: 10, fontFamily: 'inherit', letterSpacing: 0.5, backdropFilter: 'blur(8px)' }}>↺ Clear</button>
            <button onClick={onClose} style={{ background: 'rgba(10,10,20,0.7)', border: '1px solid rgba(255,255,255,0.1)', color: 'var(--c-muted)', borderRadius: 8, padding: '5px 12px', cursor: 'pointer', fontSize: 10, fontFamily: 'inherit', letterSpacing: 0.5, backdropFilter: 'blur(8px)' }}>✕ Close</button>
          </div>

          <p style={{ color: 'rgba(255,255,255,0.08)', fontSize: 8, letterSpacing: 1.5, textTransform: 'uppercase' }}>
            The Velvet Room · Gemini AI
          </p>
        </div>
      </div>

    </div>
  );
}
