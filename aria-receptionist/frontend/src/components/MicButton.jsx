import { motion, AnimatePresence } from 'framer-motion';
import { STATUS } from '../hooks/useVoiceAgent';

const CONFIG = {
  [STATUS.IDLE]:       { bg: 'linear-gradient(135deg, #6366f1, #8b5cf6)', icon: '🎙️', label: 'Tap to speak', shadow: '0 0 32px rgba(99,102,241,0.4)' },
  [STATUS.LISTENING]:  { bg: 'linear-gradient(135deg, #ef4444, #dc2626)', icon: '⏹',  label: 'Tap to stop',   shadow: '0 0 40px rgba(239,68,68,0.6)' },
  [STATUS.PROCESSING]: { bg: 'linear-gradient(135deg, #f59e0b, #d97706)', icon: '⋯',  label: 'Thinking...',   shadow: '0 0 32px rgba(245,158,11,0.4)' },
  [STATUS.SPEAKING]:   { bg: 'linear-gradient(135deg, #10b981, #059669)', icon: '♫',  label: 'Speaking...',   shadow: '0 0 32px rgba(16,185,129,0.4)' },
  [STATUS.ERROR]:      { bg: 'linear-gradient(135deg, #ef4444, #b91c1c)', icon: '!',  label: 'Error',         shadow: '0 0 32px rgba(239,68,68,0.4)' },
};

export default function MicButton({ status, onClick, size = 72 }) {
  const cfg = CONFIG[status] || CONFIG[STATUS.IDLE];
  const isListening = status === STATUS.LISTENING;
  const isDisabled = status === STATUS.PROCESSING;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
      <div style={{ position: 'relative', width: size, height: size }}>
        {/* Ripple rings when listening */}
        <AnimatePresence>
          {isListening && [0, 1, 2].map(i => (
            <motion.div
              key={i}
              style={{
                position: 'absolute',
                inset: 0,
                borderRadius: '50%',
                border: '2px solid rgba(239,68,68,0.4)',
                pointerEvents: 'none',
              }}
              initial={{ scale: 1, opacity: 0.6 }}
              animate={{ scale: 2.4, opacity: 0 }}
              transition={{ duration: 1.8, delay: i * 0.6, repeat: Infinity, ease: 'easeOut' }}
            />
          ))}
        </AnimatePresence>

        {/* Button */}
        <motion.button
          onClick={onClick}
          disabled={isDisabled}
          whileHover={!isDisabled ? { scale: 1.08 } : {}}
          whileTap={!isDisabled ? { scale: 0.94 } : {}}
          animate={isListening ? { scale: [1, 1.04, 1] } : {}}
          transition={isListening ? { duration: 1.2, repeat: Infinity } : { type: 'spring', stiffness: 300 }}
          style={{
            position: 'relative',
            zIndex: 1,
            width: size,
            height: size,
            borderRadius: '50%',
            background: cfg.bg,
            border: 'none',
            color: '#fff',
            fontSize: size * 0.36,
            cursor: isDisabled ? 'not-allowed' : 'pointer',
            boxShadow: cfg.shadow,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            opacity: isDisabled ? 0.6 : 1,
            transition: 'background 0.3s ease, box-shadow 0.3s ease',
          }}
        >
          {cfg.icon}
        </motion.button>
      </div>

      <motion.p
        key={status}
        initial={{ opacity: 0, y: 4 }}
        animate={{ opacity: 1, y: 0 }}
        style={{
          color: 'rgba(255,255,255,0.4)',
          fontSize: 11,
          letterSpacing: 0.5,
          textTransform: 'uppercase',
          userSelect: 'none',
        }}
      >
        {cfg.label}
      </motion.p>
    </div>
  );
}
