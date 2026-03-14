import { motion } from 'framer-motion';
import BookingCard from './BookingCard';

export default function MessageBubble({ msg, onSuggestionClick }) {
  const isUser = msg.role === 'user';

  return (
    <motion.div
      initial={{ opacity: 0, y: 10, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
      style={{
        display: 'flex',
        flexDirection: isUser ? 'row-reverse' : 'row',
        gap: 10,
        alignItems: 'flex-end',
        marginBottom: 16,
      }}
    >
      {/* Avatar dot for AI */}
      {!isUser && (
        <div style={{
          width: 28, height: 28,
          borderRadius: '50%',
          background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 12, flexShrink: 0,
          boxShadow: '0 0 10px rgba(99,102,241,0.4)',
        }}>✦</div>
      )}

      <div style={{ maxWidth: '78%', minWidth: 0 }}>
        {/* Bubble */}
        <div style={{
          padding: '11px 15px',
          borderRadius: isUser ? '18px 18px 4px 18px' : '4px 18px 18px 18px',
          background: isUser
            ? 'linear-gradient(135deg, #6366f1, #7c3aed)'
            : msg.isError
              ? 'rgba(239,68,68,0.12)'
              : 'rgba(255,255,255,0.07)',
          border: isUser
            ? 'none'
            : msg.isError
              ? '1px solid rgba(239,68,68,0.3)'
              : '1px solid rgba(255,255,255,0.09)',
          color: '#fff',
          fontSize: 14,
          lineHeight: 1.65,
          wordBreak: 'break-word',
          backdropFilter: 'blur(8px)',
        }}>
          {msg.content}
        </div>

        {/* Booking confirmation card */}
        {msg.booking && <BookingCard booking={msg.booking} />}

        {/* Suggestion chips */}
        {msg.suggestions?.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>
            {msg.suggestions.map((s, i) => (
              <motion.button
                key={i}
                whileHover={{ scale: 1.04, background: 'rgba(99,102,241,0.25)' }}
                whileTap={{ scale: 0.96 }}
                onClick={() => onSuggestionClick?.(s)}
                style={{
                  padding: '5px 13px',
                  borderRadius: 20,
                  background: 'rgba(99,102,241,0.12)',
                  border: '1px solid rgba(99,102,241,0.35)',
                  color: '#a5b4fc',
                  fontSize: 12,
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                  transition: 'background 0.2s',
                }}
              >
                {s}
              </motion.button>
            ))}
          </div>
        )}

        {/* Timestamp */}
        <p style={{
          color: 'rgba(255,255,255,0.2)',
          fontSize: 10,
          marginTop: 4,
          textAlign: isUser ? 'right' : 'left',
          letterSpacing: 0.3,
        }}>
          {new Date(msg.ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          {msg.intent && !isUser && ` · ${msg.intent.replace(/_/g, ' ')}`}
        </p>
      </div>
    </motion.div>
  );
}
