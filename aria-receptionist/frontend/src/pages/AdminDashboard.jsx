import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { getAllBookings, getBookingStats, cancelBooking, getAllConversations } from '../services/apiService';

function Stat({ label, value, color, icon }) {
  return (
    <div style={{
      background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)',
      borderRadius: 14, padding: '18px 20px',
    }}>
      <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: 10, letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 8 }}>{icon} {label}</p>
      <p style={{ color, fontSize: 30, fontFamily: 'var(--font-display)', fontWeight: 300 }}>{value}</p>
    </div>
  );
}

export default function AdminDashboard({ onClose }) {
  const [tab, setTab] = useState('bookings');
  const [bookings, setBookings] = useState([]);
  const [stats, setStats] = useState(null);
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    setLoading(true); setError('');
    try {
      const [br, sr] = await Promise.all([getAllBookings(), getBookingStats()]);
      setBookings(br.bookings || []); setStats(sr.stats || {});
      try { const cr = await getAllConversations(); setConversations(cr.conversations || []); } catch { setConversations([]); }
    } catch { setError('Cannot connect to backend. Make sure the server is running on port 5000.'); }
    finally { setLoading(false); }
  }

  async function handleCancel(id) {
    if (!confirm('Cancel this booking?')) return;
    try { await cancelBooking(id); setBookings(prev => prev.map(b => (b.bookingId === id || b._id === id) ? { ...b, status: 'cancelled' } : b)); }
    catch { alert('Failed to cancel booking'); }
  }

  const sColor = { confirmed: '#2dd4bf', cancelled: '#fb7185', pending: '#fbbf24' };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.88)', backdropFilter: 'blur(20px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000, padding: 20 }}>
      <motion.div initial={{ scale: 0.94, y: 20 }} animate={{ scale: 1, y: 0 }}
        style={{
          background: 'linear-gradient(145deg, #04040f, #0a0a1a)',
          border: '1px solid rgba(124,111,247,0.2)',
          borderRadius: 24, width: 'min(840px, 100%)', maxHeight: '86vh',
          display: 'flex', flexDirection: 'column', overflow: 'hidden',
          boxShadow: '0 40px 100px rgba(0,0,0,0.9), 0 0 60px rgba(124,111,247,0.08)',
        }}>

        {/* Header */}
        <div style={{ padding: '22px 28px', borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
          <div>
            <h2 style={{ color: '#fff', fontFamily: 'var(--font-display)', fontSize: 24, fontWeight: 300, margin: 0 }}>Admin Dashboard</h2>
            <p style={{ color: 'rgba(255,255,255,0.25)', fontSize: 11, margin: '3px 0 0', letterSpacing: 1 }}>The Velvet Room · ARIA System</p>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={loadData} style={{ background: 'rgba(45,212,191,0.1)', border: '1px solid rgba(45,212,191,0.35)', color: '#2dd4bf', borderRadius: 8, padding: '6px 16px', cursor: 'pointer', fontSize: 11, fontFamily: 'inherit', fontWeight: 600, letterSpacing: 0.5, boxShadow: '0 0 12px rgba(45,212,191,0.15)' }}>↻ Refresh</button>
            <button onClick={onClose} style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', borderRadius: 8, padding: '6px 14px', cursor: 'pointer', fontSize: 12, fontFamily: 'inherit' }}>✕</button>
          </div>
        </div>

        <div style={{ flex: 1, overflow: 'auto', padding: '24px 28px' }}>
          {error && <div style={{ background: 'rgba(251,113,133,0.08)', border: '1px solid rgba(251,113,133,0.25)', borderRadius: 12, padding: '12px 16px', color: '#fda4af', fontSize: 13, marginBottom: 20 }}>{error}</div>}

          {stats && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 12, marginBottom: 28 }}>
              <Stat label="Total" value={stats.totalBookings || 0} color="#a78bfa" icon="📋" />
              <Stat label="Confirmed" value={stats.confirmedBookings || 0} color="#2dd4bf" icon="✅" />
              <Stat label="Cancelled" value={stats.cancelledBookings || 0} color="#fb7185" icon="❌" />
              <Stat label="Guests" value={stats.totalGuests || 0} color="#fbbf24" icon="👥" />
              <Stat label="Avg Party" value={stats.avgPartySize || 0} color="#c4b5fd" icon="📊" />
            </div>
          )}

          {/* Tabs */}
          <div style={{ display: 'flex', gap: 6, marginBottom: 18 }}>
            {['bookings', 'conversations'].map(t => (
              <button key={t} onClick={() => setTab(t)} style={{
                padding: '7px 18px', borderRadius: 8, border: 'none', cursor: 'pointer',
                fontSize: 11, fontFamily: 'inherit', fontWeight: 600, letterSpacing: 0.5,
                background: tab === t ? 'rgba(124,111,247,0.2)' : 'rgba(255,255,255,0.04)',
                color: tab === t ? 'var(--c-violet)' : 'rgba(255,255,255,0.35)',
                transition: 'all 0.2s',
              }}>
                {t === 'bookings' ? `Bookings (${bookings.length})` : `Conversations (${conversations.length})`}
              </button>
            ))}
          </div>

          {tab === 'bookings' && (
            loading ? <div style={{ textAlign: 'center', color: 'rgba(255,255,255,0.2)', padding: 40 }}>Loading...</div>
            : bookings.length === 0 ? <div style={{ textAlign: 'center', color: 'rgba(255,255,255,0.15)', padding: 40, fontSize: 13 }}>No bookings yet. Start chatting with ARIA!</div>
            : <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {bookings.map((b, i) => (
                  <motion.div key={b._id || i} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}
                    style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 12, padding: '12px 16px', display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'center' }}>
                    {[['ID', b.bookingId], ['Guest', b.customerName], ['Date', b.date], ['Time', b.time], ['Party', `${b.people}p`]].map(([k, v]) => (
                      <div key={k}>
                        <p style={{ color: 'rgba(255,255,255,0.25)', fontSize: 9, letterSpacing: 1 }}>{k}</p>
                        <p style={{ color: '#fff', fontSize: 12, fontWeight: 500 }}>{v}</p>
                      </div>
                    ))}
                    <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                        <span style={{ width: 5, height: 5, borderRadius: '50%', background: sColor[b.status] || '#6b7280', display: 'inline-block', boxShadow: `0 0 5px ${sColor[b.status]}` }} />
                        <span style={{ color: sColor[b.status], fontSize: 11, fontWeight: 600 }}>{b.status}</span>
                      </div>
                      {b.status === 'confirmed' && (
                        <button onClick={() => handleCancel(b.bookingId || b._id)} style={{
                          background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.4)',
                          color: '#f87171', borderRadius: 6, padding: '4px 12px', cursor: 'pointer', fontSize: 10, fontFamily: 'inherit',
                          fontWeight: 600, letterSpacing: 0.5, boxShadow: '0 0 10px rgba(239,68,68,0.15)',
                        }}>✕ Cancel</button>
                      )}
                    </div>
                  </motion.div>
                ))}
              </div>
          )}

          {tab === 'conversations' && (
            conversations.length === 0
              ? <div style={{ textAlign: 'center', color: 'rgba(255,255,255,0.15)', padding: 40, fontSize: 13 }}>No conversations logged. MongoDB may not be connected.</div>
              : <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {conversations.map((c, i) => (
                    <div key={c._id || i} style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 12, padding: '12px 16px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                        <span style={{ color: 'var(--c-violet)', fontSize: 11, fontWeight: 600 }}>Session: {(c.sessionId || '').slice(0, 8)}...</span>
                        <span style={{ color: 'rgba(255,255,255,0.25)', fontSize: 10 }}>{c.messages?.length || 0} msgs · {new Date(c.createdAt).toLocaleDateString()}</span>
                      </div>
                      <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: 11 }}>Intent: {c.intent || 'general'} · Sentiment: {c.sentiment || 'unknown'}</p>
                    </div>
                  ))}
                </div>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}
