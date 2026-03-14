import { motion } from 'framer-motion';
import { STATUS } from '../hooks/useVoiceAgent';

const statusColors = {
  [STATUS.IDLE]:       { bg: 'linear-gradient(135deg, #6366f1, #8b5cf6)', shadow: '0 0 24px rgba(99,102,241,0.5)' },
  [STATUS.LISTENING]:  { bg: 'linear-gradient(135deg, #ef4444, #dc2626)', shadow: '0 0 32px rgba(239,68,68,0.6)' },
  [STATUS.PROCESSING]: { bg: 'linear-gradient(135deg, #f59e0b, #d97706)', shadow: '0 0 24px rgba(245,158,11,0.5)' },
  [STATUS.SPEAKING]:   { bg: 'linear-gradient(135deg, #10b981, #059669)', shadow: '0 0 24px rgba(16,185,129,0.5)' },
  [STATUS.ERROR]:      { bg: 'linear-gradient(135deg, #ef4444, #b91c1c)', shadow: '0 0 24px rgba(239,68,68,0.4)' },
};

export default function AIAvatar({ status, size = 48 }) {
  const colors = statusColors[status] || statusColors[STATUS.IDLE];
  const isPulsing = status === STATUS.LISTENING || status === STATUS.SPEAKING;

  return (
    <div style={{ position: 'relative', width: size, height: size, flexShrink: 0 }}>
      {/* Pulse rings */}
      {isPulsing && [1, 2].map(i => (
        <motion.div
          key={i}
          style={{
            position: 'absolute',
            inset: 0,
            borderRadius: '50%',
            border: `2px solid ${status === STATUS.LISTENING ? 'rgba(239,68,68,0.5)' : 'rgba(16,185,129,0.5)'}`,
          }}
          animate={{ scale: [1, 2], opacity: [0.6, 0] }}
          transition={{ duration: 1.5, delay: i * 0.5, repeat: Infinity, ease: 'easeOut' }}
        />
      ))}

      {/* Main circle */}
      <motion.div
        style={{
          width: size,
          height: size,
          borderRadius: '50%',
          background: colors.bg,
          boxShadow: colors.shadow,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: size * 0.4,
          position: 'relative',
          zIndex: 1,
          cursor: 'default',
        }}
        animate={isPulsing ? { scale: [1, 1.05, 1] } : {}}
        transition={{ duration: 1, repeat: Infinity, ease: 'easeInOut' }}
      >
        ✦
      </motion.div>
    </div>
  );
}
