import { motion } from 'framer-motion';

export default function BookingCard({ booking }) {
  if (!booking) return null;
  const fields = [
    { l: 'Guest',  v: booking.customerName },
    { l: 'Date',   v: booking.date },
    { l: 'Time',   v: booking.time },
    { l: 'Party',  v: `${booking.people} guest${booking.people !== 1 ? 's' : ''}` },
    ...(booking.email ? [{ l: 'Email',  v: booking.email }] : []),
    ...(booking.phone ? [{ l: 'Phone',  v: booking.phone }] : []),
    { l: 'ID',     v: booking.bookingId || '—' },
  ];
  return (
    <motion.div initial={{ opacity: 0, y: 10, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ delay: 0.1 }}
      style={{ marginTop: 10, borderRadius: 16, overflow: 'hidden', border: '1px solid rgba(45,212,191,0.25)', maxWidth: 300 }}>
      <div style={{ padding: '10px 14px', background: 'rgba(45,212,191,0.1)', display: 'flex', alignItems: 'center', gap: 8, borderBottom: '1px solid rgba(45,212,191,0.15)' }}>
        <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.3, type: 'spring' }} style={{ fontSize: 16 }}>✅</motion.span>
        <span style={{ color: '#2dd4bf', fontSize: 10, fontWeight: 700, letterSpacing: 2, textTransform: 'uppercase' }}>Confirmed</span>
      </div>
      <div style={{ padding: '12px 14px', background: 'rgba(4,4,15,0.6)', backdropFilter: 'blur(12px)', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
        {fields.map(({ l, v }) => (
          <div key={l} style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 8, padding: '6px 10px', gridColumn: l === 'Email' ? '1 / -1' : 'auto' }}>
            <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: 8, letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 2 }}>{l}</p>
            <p style={{ color: '#fff', fontSize: 12, fontWeight: 500, wordBreak: 'break-all' }}>{v}</p>
          </div>
        ))}
      </div>
      <div style={{ padding: '8px 14px', background: 'rgba(45,212,191,0.05)', display: 'flex', flexDirection: 'column', gap: 2 }}>
        <p style={{ color: 'rgba(45,212,191,0.5)', fontSize: 9, letterSpacing: 1, textAlign: 'center' }}>
          📧 Confirmation email sent · ⏰ Reminder at reservation time
        </p>
        <p style={{ color: 'rgba(255,255,255,0.15)', fontSize: 9, textAlign: 'center' }}>The Velvet Room · 47 Marina Boulevard</p>
      </div>
    </motion.div>
  );
}
