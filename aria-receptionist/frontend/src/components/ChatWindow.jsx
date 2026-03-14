import { useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import MessageBubble from './MessageBubble';
import VoiceWave from './VoiceWave';
import MicButton from './MicButton';
import AIAvatar from './AIAvatar';
import { STATUS } from '../hooks/useVoiceAgent';

function ThinkingDots() {
  return (
    <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end', marginBottom: 16 }}>
      <div style={{
        width: 28, height: 28, borderRadius: '50%',
        background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 12, flexShrink: 0,
        boxShadow: '0 0 10px rgba(99,102,241,0.4)',
      }}>✦</div>
      <div style={{
        padding: '12px 16px',
        borderRadius: '4px 18px 18px 18px',
        background: 'rgba(255,255,255,0.07)',
        border: '1px solid rgba(255,255,255,0.09)',
        display: 'flex', gap: 5, alignItems: 'center',
      }}>
        {[0, 1, 2].map(i => (
          <motion.div
            key={i}
            style={{ width: 6, height: 6, borderRadius: '50%', background: '#8b5cf6' }}
            animate={{ y: [0, -8, 0] }}
            transition={{ duration: 1.2, delay: i * 0.2, repeat: Infinity, ease: 'easeInOut' }}
          />
        ))}
      </div>
    </div>
  );
}

export default function ChatWindow({
  messages, status, transcript, onMicClick, onSuggestionClick, onClose, onClear
}) {
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, status]);

  const waveColor = status === STATUS.LISTENING ? '#ef4444' : '#6366f1';

  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 20, scale: 0.95 }}
      transition={{ type: 'spring', stiffness: 300, damping: 26 }}
      style={{
        position: 'fixed',
        bottom: 104,
        right: 24,
        width: 'min(430px, calc(100vw - 48px))',
        height: 'min(620px, calc(100vh - 160px))',
        background: 'linear-gradient(145deg, rgba(10,10,22,0.97), rgba(18,18,40,0.97))',
        border: '1px solid rgba(99,102,241,0.25)',
        borderRadius: 24,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        boxShadow: '0 32px 80px rgba(0,0,0,0.7), 0 0 40px rgba(99,102,241,0.08)',
        backdropFilter: 'blur(24px)',
        zIndex: 999,
      }}
    >
      {/* ── Header ─────────────────────────────────────────────── */}
      <div style={{
        padding: '16px 18px',
        borderBottom: '1px solid rgba(255,255,255,0.07)',
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        background: 'rgba(99,102,241,0.05)',
        flexShrink: 0,
      }}>
        <AIAvatar status={status} size={40} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ color: '#fff', fontWeight: 700, fontSize: 15, margin: 0 }}>ARIA</p>
          <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 11, margin: 0, display: 'flex', alignItems: 'center', gap: 5 }}>
            <span style={{
              display: 'inline-block',
              width: 6, height: 6,
              borderRadius: '50%',
              background: {
                [STATUS.IDLE]: '#10b981',
                [STATUS.LISTENING]: '#ef4444',
                [STATUS.PROCESSING]: '#f59e0b',
                [STATUS.SPEAKING]: '#6366f1',
              }[status] || '#10b981',
            }} />
            {{
              [STATUS.IDLE]:       'Ready to assist',
              [STATUS.LISTENING]:  'Listening...',
              [STATUS.PROCESSING]: 'Thinking...',
              [STATUS.SPEAKING]:   'Speaking...',
            }[status] || 'Ready'}
          </p>
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          <button
            onClick={onClear}
            title="Clear conversation"
            style={{
              background: 'rgba(255,255,255,0.06)',
              border: '1px solid rgba(255,255,255,0.1)',
              color: 'rgba(255,255,255,0.5)',
              borderRadius: 8,
              padding: '5px 10px',
              cursor: 'pointer',
              fontSize: 12,
              fontFamily: 'inherit',
            }}
          >↺</button>
          <button
            onClick={onClose}
            style={{
              background: 'rgba(255,255,255,0.06)',
              border: '1px solid rgba(255,255,255,0.1)',
              color: 'rgba(255,255,255,0.5)',
              borderRadius: 8,
              padding: '5px 10px',
              cursor: 'pointer',
              fontSize: 13,
              fontFamily: 'inherit',
            }}
          >✕</button>
        </div>
      </div>

      {/* ── Voice Activity Bar ─────────────────────────────────── */}
      <AnimatePresence>
        {(status === STATUS.LISTENING || status === STATUS.SPEAKING) && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            style={{
              padding: '8px 18px',
              borderBottom: '1px solid rgba(255,255,255,0.05)',
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              overflow: 'hidden',
              flexShrink: 0,
            }}
          >
            <VoiceWave active={true} color={waveColor} bars={28} height={36} />
            {transcript && (
              <p style={{
                color: 'rgba(255,255,255,0.45)',
                fontSize: 12,
                fontStyle: 'italic',
                flex: 1,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}>
                "{transcript}"
              </p>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Messages ───────────────────────────────────────────── */}
      <div style={{
        flex: 1,
        overflowY: 'auto',
        padding: '16px 16px 8px',
        display: 'flex',
        flexDirection: 'column',
      }}>
        <AnimatePresence>
          {messages.map(msg => (
            <MessageBubble
              key={msg.id}
              msg={msg}
              onSuggestionClick={onSuggestionClick}
            />
          ))}
        </AnimatePresence>

        {status === STATUS.PROCESSING && <ThinkingDots />}
        <div ref={bottomRef} />
      </div>

      {/* ── Mic Controls ───────────────────────────────────────── */}
      <div style={{
        padding: '16px 18px 20px',
        borderTop: '1px solid rgba(255,255,255,0.07)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 4,
        flexShrink: 0,
        background: 'rgba(0,0,0,0.2)',
      }}>
        <MicButton status={status} onClick={onMicClick} size={68} />
        <p style={{
          color: 'rgba(255,255,255,0.15)',
          fontSize: 10,
          textAlign: 'center',
          marginTop: 4,
        }}>
          Powered by Claude AI · The Velvet Room
        </p>
      </div>
    </motion.div>
  );
}
