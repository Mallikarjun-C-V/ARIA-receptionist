import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { getAllBookings, getBookingStats, cancelBooking, getAllConversations } from '../../services/apiService';

// ── CONSTANTS ─────────────────────────────────────────────────
const TOTAL_SEATS = 50;
const TIME_SLOTS = [
  '5:00 PM','5:30 PM','6:00 PM','6:30 PM',
  '7:00 PM','7:30 PM','8:00 PM','8:30 PM',
  '9:00 PM','9:30 PM',
];
const MAX_PER_SLOT = 12; // max guests per slot visually (table of 12)

// ── COLOURS ───────────────────────────────────────────────────
const C = {
  purple: '#7c6ff7', violet: '#a78bfa',
  teal:   '#2dd4bf', amber:  '#fbbf24',
  rose:   '#fb7185', bg:     '#04040f',
  card:   'rgba(255,255,255,0.04)', border: 'rgba(255,255,255,0.07)',
};

// ─────────────────────────────────────────────────────────────
// SVG Ring / Donut chart — no external library
// ─────────────────────────────────────────────────────────────
function RingChart({ pct, size = 160, stroke = 14, color, bg = 'rgba(255,255,255,0.06)', children }) {
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const dash = circ * Math.min(pct, 1);
  return (
    <div style={{ position: 'relative', width: size, height: size, flexShrink: 0 }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={bg} strokeWidth={stroke} />
        <motion.circle
          cx={size/2} cy={size/2} r={r}
          fill="none" stroke={color} strokeWidth={stroke}
          strokeLinecap="round"
          initial={{ strokeDasharray: `0 ${circ}` }}
          animate={{ strokeDasharray: `${dash} ${circ}` }}
          transition={{ duration: 1.2, ease: 'easeOut' }}
        />
      </svg>
      <div style={{
        position: 'absolute', inset: 0,
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        gap: 2,
      }}>
        {children}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Capacity bar for a single time slot
// ─────────────────────────────────────────────────────────────
function SlotBar({ slot, booked, guests, bookings }) {
  const [expanded, setExpanded] = useState(false);
  const pct = Math.min(guests / TOTAL_SEATS, 1);
  const color = pct > 0.8 ? C.rose : pct > 0.5 ? C.amber : C.teal;

  return (
    <div style={{ marginBottom: 6 }}>
      <div
        onClick={() => bookings.length > 0 && setExpanded(e => !e)}
        style={{
          display: 'grid', gridTemplateColumns: '80px 1fr 60px 36px',
          alignItems: 'center', gap: 12,
          padding: '9px 14px',
          background: C.card, border: `1px solid ${C.border}`,
          borderRadius: 10, cursor: bookings.length > 0 ? 'pointer' : 'default',
          transition: 'background 0.2s',
        }}
        onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.07)'}
        onMouseLeave={e => e.currentTarget.style.background = C.card}
      >
        <span style={{ color: 'rgba(255,255,255,0.55)', fontSize: 12, fontWeight: 500 }}>{slot}</span>
        <div style={{ background: 'rgba(255,255,255,0.06)', borderRadius: 4, height: 8, overflow: 'hidden' }}>
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${pct * 100}%` }}
            transition={{ duration: 1, ease: 'easeOut' }}
            style={{ height: '100%', background: color, borderRadius: 4,
              boxShadow: `0 0 8px ${color}60` }}
          />
        </div>
        <span style={{ color, fontSize: 12, fontWeight: 600, textAlign: 'right' }}>
          {guests}/{TOTAL_SEATS}
        </span>
        <span style={{ color: 'rgba(255,255,255,0.25)', fontSize: 11, textAlign: 'center' }}>
          {bookings.length > 0 ? (expanded ? '▲' : '▼') : ''}
        </span>
      </div>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            style={{ overflow: 'hidden' }}
          >
            <div style={{ padding: '6px 14px 10px', display: 'flex', flexDirection: 'column', gap: 4 }}>
              {bookings.map((b, i) => (
                <div key={i} style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: '6px 12px',
                  background: 'rgba(124,111,247,0.06)',
                  border: '1px solid rgba(124,111,247,0.12)',
                  borderRadius: 8,
                }}>
                  <div style={{ width: 6, height: 6, borderRadius: '50%', background: C.violet, flexShrink: 0, boxShadow: `0 0 6px ${C.violet}` }} />
                  <span style={{ color: '#fff', fontSize: 12, fontWeight: 500, flex: 1 }}>{b.customerName}</span>
                  <span style={{ color: 'rgba(255,255,255,0.35)', fontSize: 11 }}>{b.people} guests</span>
                  {b.email && <span style={{ color: 'rgba(124,111,247,0.6)', fontSize: 10 }}>{b.email}</span>}
                  <span style={{ fontSize: 9, padding: '2px 7px', borderRadius: 10,
                    background: b.status === 'confirmed' ? 'rgba(45,212,191,0.1)' : 'rgba(251,113,133,0.1)',
                    color: b.status === 'confirmed' ? C.teal : C.rose,
                    border: `1px solid ${b.status === 'confirmed' ? 'rgba(45,212,191,0.2)' : 'rgba(251,113,133,0.2)'}`,
                  }}>{b.status}</span>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Stat card
// ─────────────────────────────────────────────────────────────
function StatCard({ icon, label, value, sub, color, small }) {
  return (
    <div style={{
      background: C.card, border: `1px solid ${C.border}`,
      borderRadius: 16, padding: small ? '16px 18px' : '20px 22px',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
        <span style={{ fontSize: small ? 16 : 20 }}>{icon}</span>
        <span style={{ color: 'rgba(255,255,255,0.35)', fontSize: 10, letterSpacing: 2, textTransform: 'uppercase', fontWeight: 600 }}>{label}</span>
      </div>
      <p style={{ color, fontSize: small ? 28 : 36, fontFamily: 'var(--font-display)', fontWeight: 300, lineHeight: 1, margin: '0 0 4px' }}>
        {value}
      </p>
      {sub && <p style={{ color: 'rgba(255,255,255,0.25)', fontSize: 11 }}>{sub}</p>}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Section heading
// ─────────────────────────────────────────────────────────────
function SectionHead({ title, sub }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <h3 style={{ color: '#fff', fontSize: 16, fontWeight: 500, margin: 0 }}>{title}</h3>
      {sub && <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: 11, margin: '3px 0 0' }}>{sub}</p>}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// TAB: OVERVIEW
// ─────────────────────────────────────────────────────────────
function TabOverview({ bookings, stats }) {
  const confirmed = bookings.filter(b => b.status === 'confirmed');
  const cancelled = bookings.filter(b => b.status === 'cancelled');
  const totalGuests = confirmed.reduce((s, b) => s + (b.people || 0), 0);
  const totalSeatsUsed = totalGuests;
  const availableSeats = Math.max(0, TOTAL_SEATS - totalSeatsUsed);
  const occupancy = TOTAL_SEATS > 0 ? totalSeatsUsed / TOTAL_SEATS : 0;

  // Today's bookings
  const today = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });

  return (
    <div>
      {/* Top stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 12, marginBottom: 28 }}>
        <StatCard icon="🪑" label="Total Seats"    value={TOTAL_SEATS}        color="#fff"    sub="Restaurant capacity" />
        <StatCard icon="✅" label="Seats Booked"   value={totalSeatsUsed}      color={C.violet} sub={`${confirmed.length} reservations`} />
        <StatCard icon="🟢" label="Seats Free"     value={availableSeats}      color={C.teal}  sub="Still available" />
        <StatCard icon="👥" label="Total Guests"   value={totalGuests}         color={C.amber} sub="Across all bookings" />
        <StatCard icon="❌" label="Cancellations"  value={cancelled.length}    color={C.rose}  sub="Cancelled reservations" />
        <StatCard icon="📊" label="Avg Party"      value={stats?.avgPartySize || '—'} color={C.violet} sub="Average group size" />
      </div>

      {/* Capacity ring + breakdown */}
      <div style={{ display: 'grid', gridTemplateColumns: '240px 1fr', gap: 20, marginBottom: 28 }}>
        {/* Ring */}
        <div style={{
          background: C.card, border: `1px solid ${C.border}`,
          borderRadius: 16, padding: '24px',
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16,
        }}>
          <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: 10, letterSpacing: 2, textTransform: 'uppercase', fontWeight: 600, margin: 0 }}>Occupancy</p>
          <RingChart pct={occupancy} size={160} stroke={14} color={occupancy > 0.8 ? C.rose : occupancy > 0.5 ? C.amber : C.violet}>
            <span style={{ color: '#fff', fontSize: 30, fontFamily: 'var(--font-display)', fontWeight: 300 }}>
              {Math.round(occupancy * 100)}%
            </span>
            <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: 10 }}>full</span>
          </RingChart>
          <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 8 }}>
            {[
              { label: 'Booked', val: totalSeatsUsed, color: C.violet },
              { label: 'Available', val: availableSeats, color: C.teal },
            ].map(r => (
              <div key={r.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <div style={{ width: 6, height: 6, borderRadius: '50%', background: r.color }} />
                  <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: 11 }}>{r.label}</span>
                </div>
                <span style={{ color: r.color, fontSize: 13, fontWeight: 600 }}>{r.val}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Party size distribution */}
        <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 16, padding: '20px 22px' }}>
          <SectionHead title="Party Size Distribution" sub="How many guests per booking" />
          {[1,2,3,4,5,6,7,8].map(size => {
            const count = confirmed.filter(b => b.people === size).length;
            const maxCount = Math.max(...[1,2,3,4,5,6,7,8].map(s => confirmed.filter(b => b.people === s).length), 1);
            return (
              <div key={size} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                <span style={{ color: 'rgba(255,255,255,0.35)', fontSize: 11, width: 60 }}>{size} {size === 1 ? 'guest' : 'guests'}</span>
                <div style={{ flex: 1, background: 'rgba(255,255,255,0.06)', borderRadius: 4, height: 8, overflow: 'hidden' }}>
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${(count / maxCount) * 100}%` }}
                    transition={{ duration: 0.8, ease: 'easeOut', delay: size * 0.05 }}
                    style={{ height: '100%', background: C.violet, borderRadius: 4 }}
                  />
                </div>
                <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: 11, width: 20, textAlign: 'right' }}>{count}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Recent activity */}
      <SectionHead title="Recent Bookings" sub="Latest reservations made" />
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {bookings.slice(0, 8).map((b, i) => (
          <motion.div key={b._id || i}
            initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.04 }}
            style={{
              display: 'grid', gridTemplateColumns: '1fr auto auto auto auto',
              alignItems: 'center', gap: 16,
              padding: '10px 16px',
              background: C.card, border: `1px solid ${C.border}`, borderRadius: 10,
            }}>
            <div>
              <p style={{ color: '#fff', fontSize: 13, fontWeight: 500, margin: 0 }}>{b.customerName}</p>
              {b.email && <p style={{ color: 'rgba(255,255,255,0.25)', fontSize: 10, margin: '2px 0 0' }}>{b.email}</p>}
            </div>
            <span style={{ color: 'rgba(255,255,255,0.45)', fontSize: 12 }}>{b.date}</span>
            <span style={{ color: 'rgba(255,255,255,0.45)', fontSize: 12 }}>{b.time}</span>
            <span style={{ color: 'rgba(255,255,255,0.45)', fontSize: 12 }}>{b.people}p</span>
            <span style={{
              fontSize: 9, padding: '3px 9px', borderRadius: 10, fontWeight: 600,
              background: b.status === 'confirmed' ? 'rgba(45,212,191,0.1)' : 'rgba(251,113,133,0.1)',
              color: b.status === 'confirmed' ? C.teal : C.rose,
              border: `1px solid ${b.status === 'confirmed' ? 'rgba(45,212,191,0.2)' : 'rgba(251,113,133,0.2)'}`,
            }}>{b.status}</span>
          </motion.div>
        ))}
        {bookings.length === 0 && (
          <div style={{ textAlign: 'center', padding: 40, color: 'rgba(255,255,255,0.15)', fontSize: 13 }}>
            No bookings yet
          </div>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// TAB: CAPACITY (time slot breakdown)
// ─────────────────────────────────────────────────────────────
function TabCapacity({ bookings }) {
  const confirmed = bookings.filter(b => b.status === 'confirmed');

  // Group bookings by time slot
  const slotData = TIME_SLOTS.map(slot => {
    const slotBookings = confirmed.filter(b => b.time === slot);
    const guests = slotBookings.reduce((s, b) => s + (b.people || 0), 0);
    return { slot, bookings: slotBookings, guests };
  });

  const totalBooked = slotData.reduce((s, d) => s + d.guests, 0);
  const totalFree   = Math.max(0, TOTAL_SEATS - totalBooked);
  const busiestSlot = slotData.reduce((a, b) => b.guests > a.guests ? b : a, slotData[0]);

  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12, marginBottom: 28 }}>
        <StatCard small icon="🪑" label="Total Capacity"  value={TOTAL_SEATS}    color="#fff"    sub="Max seats" />
        <StatCard small icon="📅" label="Seats Booked"   value={totalBooked}    color={C.violet} sub="Confirmed guests" />
        <StatCard small icon="🟢" label="Seats Available" value={totalFree}     color={C.teal}  sub="Still open" />
      </div>

      {busiestSlot?.guests > 0 && (
        <div style={{
          background: 'rgba(124,111,247,0.07)', border: '1px solid rgba(124,111,247,0.18)',
          borderRadius: 12, padding: '12px 18px', marginBottom: 20,
          display: 'flex', alignItems: 'center', gap: 10,
        }}>
          <span style={{ fontSize: 18 }}>🔥</span>
          <div>
            <p style={{ color: '#fff', fontSize: 13, fontWeight: 500, margin: 0 }}>Busiest slot: {busiestSlot.slot}</p>
            <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: 11, margin: 0 }}>
              {busiestSlot.guests} guests across {busiestSlot.bookings.length} reservation{busiestSlot.bookings.length !== 1 ? 's' : ''}
            </p>
          </div>
        </div>
      )}

      <SectionHead title="Time Slot Capacity" sub="Click a slot to see who booked it" />
      {slotData.map(d => (
        <SlotBar key={d.slot} slot={d.slot} booked={d.bookings.length} guests={d.guests} bookings={d.bookings} />
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// TAB: ALL BOOKINGS
// ─────────────────────────────────────────────────────────────
function TabBookings({ bookings, onCancel, loading }) {
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');

  const filtered = bookings
    .filter(b => filter === 'all' || b.status === filter)
    .filter(b => !search || b.customerName?.toLowerCase().includes(search.toLowerCase()) || b.email?.toLowerCase().includes(search.toLowerCase()) || b.bookingId?.toLowerCase().includes(search.toLowerCase()));

  const sColor = { confirmed: C.teal, cancelled: C.rose, pending: C.amber };

  return (
    <div>
      {/* Controls */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 18, flexWrap: 'wrap', alignItems: 'center' }}>
        {['all','confirmed','cancelled'].map(f => (
          <button key={f} onClick={() => setFilter(f)} style={{
            padding: '6px 16px', borderRadius: 20, border: 'none', cursor: 'pointer',
            fontSize: 11, fontFamily: 'inherit', fontWeight: 600,
            background: filter === f ? 'rgba(124,111,247,0.25)' : 'rgba(255,255,255,0.05)',
            color: filter === f ? C.violet : 'rgba(255,255,255,0.4)',
            transition: 'all 0.2s',
          }}>
            {f.charAt(0).toUpperCase() + f.slice(1)} ({bookings.filter(b => f === 'all' || b.status === f).length})
          </button>
        ))}
        <input
          value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Search by name, email, or ID..."
          style={{
            marginLeft: 'auto', padding: '7px 14px',
            background: C.card, border: `1px solid ${C.border}`,
            borderRadius: 8, color: '#fff', fontSize: 12, fontFamily: 'inherit', outline: 'none',
            width: 220,
          }}
        />
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: 60, color: 'rgba(255,255,255,0.2)', fontSize: 13 }}>Loading...</div>
      ) : filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 60, color: 'rgba(255,255,255,0.15)', fontSize: 13 }}>No bookings found</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {filtered.map((b, i) => (
            <motion.div key={b._id || i}
              initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.025 }}
              style={{
                background: C.card, border: `1px solid ${C.border}`,
                borderRadius: 12, padding: '13px 18px',
                display: 'grid',
                gridTemplateColumns: '100px 1fr 90px 80px 50px 80px auto',
                alignItems: 'center', gap: 12,
              }}>
              <div>
                <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: 8, letterSpacing: 1.5, textTransform: 'uppercase', margin: 0 }}>ID</p>
                <p style={{ color: C.violet, fontSize: 12, fontWeight: 600, margin: '2px 0 0', fontFamily: 'monospace' }}>{b.bookingId}</p>
              </div>
              <div>
                <p style={{ color: '#fff', fontSize: 13, fontWeight: 500, margin: 0 }}>{b.customerName}</p>
                <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: 10, margin: '2px 0 0' }}>
                  {b.email || 'No email'}{b.phone ? ` · ${b.phone}` : ''}
                </p>
              </div>
              <div>
                <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: 8, letterSpacing: 1, textTransform: 'uppercase', margin: 0 }}>Date</p>
                <p style={{ color: '#fff', fontSize: 12, margin: '2px 0 0' }}>{b.date}</p>
              </div>
              <div>
                <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: 8, letterSpacing: 1, textTransform: 'uppercase', margin: 0 }}>Time</p>
                <p style={{ color: '#fff', fontSize: 12, margin: '2px 0 0' }}>{b.time}</p>
              </div>
              <div>
                <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: 8, letterSpacing: 1, textTransform: 'uppercase', margin: 0 }}>Party</p>
                <p style={{ color: '#fff', fontSize: 12, margin: '2px 0 0' }}>{b.people}p</p>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                <div style={{ width: 5, height: 5, borderRadius: '50%', background: sColor[b.status] || '#6b7280', boxShadow: `0 0 5px ${sColor[b.status]}` }} />
                <span style={{ color: sColor[b.status], fontSize: 11, fontWeight: 600 }}>{b.status}</span>
              </div>
              <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                {b.emailsSent?.confirmation && <span title="Confirmation email sent" style={{ fontSize: 14 }}>📧</span>}
                {b.status === 'confirmed' && (
                  <button onClick={() => onCancel(b.bookingId || b._id)} style={{
                    background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.35)',
                    color: '#f87171', borderRadius: 6, padding: '4px 10px',
                    cursor: 'pointer', fontSize: 10, fontFamily: 'inherit', fontWeight: 600,
                    boxShadow: '0 0 8px rgba(239,68,68,0.1)',
                  }}>✕ Cancel</button>
                )}
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// TAB: GUESTS (roster)
// ─────────────────────────────────────────────────────────────
function TabGuests({ bookings }) {
  const confirmed = bookings.filter(b => b.status === 'confirmed');

  return (
    <div>
      <SectionHead title={`Guest Roster`} sub={`${confirmed.length} active reservations · ${confirmed.reduce((s,b)=>s+(b.people||0),0)} guests expected`} />
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 12 }}>
        {confirmed.map((b, i) => (
          <motion.div key={b._id || i}
            initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: i * 0.04 }}
            style={{
              background: C.card, border: `1px solid ${C.border}`,
              borderRadius: 14, padding: '16px 18px',
            }}>
            {/* Avatar + name */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
              <div style={{
                width: 40, height: 40, borderRadius: '50%',
                background: `linear-gradient(135deg, ${C.purple}, ${C.violet})`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 16, fontWeight: 600, color: '#fff', flexShrink: 0,
                boxShadow: `0 0 14px ${C.purple}50`,
              }}>
                {b.customerName?.charAt(0).toUpperCase() || '?'}
              </div>
              <div style={{ minWidth: 0 }}>
                <p style={{ color: '#fff', fontSize: 14, fontWeight: 600, margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{b.customerName}</p>
                <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: 10, margin: '2px 0 0', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{b.email || 'No email on file'}</p>
              </div>
            </div>

            {/* Info chips */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 10 }}>
              {[
                { icon: '📅', val: b.date },
                { icon: '🕐', val: b.time },
                { icon: '👥', val: `${b.people} guests` },
                ...(b.occasion ? [{ icon: '🎉', val: b.occasion }] : []),
              ].map(chip => (
                <span key={chip.val} style={{
                  padding: '3px 10px', borderRadius: 20,
                  background: 'rgba(255,255,255,0.05)',
                  border: `1px solid ${C.border}`,
                  color: 'rgba(255,255,255,0.5)', fontSize: 11,
                }}>
                  {chip.icon} {chip.val}
                </span>
              ))}
            </div>

            {/* Booking ID + email status */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ color: C.violet, fontSize: 10, fontFamily: 'monospace', fontWeight: 600 }}>{b.bookingId}</span>
              <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                {b.emailsSent?.confirmation && (
                  <span style={{ fontSize: 9, padding: '2px 7px', borderRadius: 10,
                    background: 'rgba(45,212,191,0.1)', color: C.teal, border: '1px solid rgba(45,212,191,0.2)' }}>
                    📧 Confirmed
                  </span>
                )}
                {b.reminderSent && (
                  <span style={{ fontSize: 9, padding: '2px 7px', borderRadius: 10,
                    background: 'rgba(251,191,36,0.1)', color: C.amber, border: '1px solid rgba(251,191,36,0.2)' }}>
                    ⏰ Reminded
                  </span>
                )}
              </div>
            </div>

            {b.specialRequests && (
              <div style={{ marginTop: 10, padding: '7px 10px', background: 'rgba(124,111,247,0.06)', borderRadius: 8, border: '1px solid rgba(124,111,247,0.12)' }}>
                <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: 9, letterSpacing: 1, textTransform: 'uppercase', margin: '0 0 3px' }}>Special Requests</p>
                <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: 11, margin: 0, lineHeight: 1.5 }}>{b.specialRequests}</p>
              </div>
            )}
          </motion.div>
        ))}
        {confirmed.length === 0 && (
          <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: 60, color: 'rgba(255,255,255,0.15)', fontSize: 13 }}>
            No confirmed guests yet
          </div>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// TAB: CONVERSATIONS
// ─────────────────────────────────────────────────────────────
function TabConversations({ conversations }) {
  return (
    <div>
      <SectionHead title="Conversation Logs" sub="All ARIA chat sessions" />
      {conversations.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 60, color: 'rgba(255,255,255,0.15)', fontSize: 13 }}>
          No conversations logged. MongoDB may not be connected.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {conversations.map((c, i) => (
            <motion.div key={c._id || i}
              initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.03 }}
              style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: '14px 18px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <span style={{ color: C.violet, fontSize: 12, fontWeight: 600, fontFamily: 'monospace' }}>
                  {(c.sessionId || '').slice(0, 12)}...
                </span>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <span style={{ color: 'rgba(255,255,255,0.25)', fontSize: 10 }}>
                    {c.messages?.length || 0} messages
                  </span>
                  <span style={{ color: 'rgba(255,255,255,0.2)', fontSize: 10 }}>
                    {new Date(c.createdAt).toLocaleString()}
                  </span>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {[
                  { label: 'Intent',    val: c.intent || 'general' },
                  { label: 'Sentiment', val: c.sentiment || 'unknown' },
                ].map(tag => (
                  <span key={tag.label} style={{
                    padding: '3px 10px', borderRadius: 10, fontSize: 10,
                    background: 'rgba(255,255,255,0.05)', border: `1px solid ${C.border}`,
                    color: 'rgba(255,255,255,0.4)',
                  }}>{tag.label}: {tag.val}</span>
                ))}
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// SIDEBAR NAV ITEM
// ─────────────────────────────────────────────────────────────
function NavItem({ icon, label, active, onClick, badge }) {
  return (
    <button onClick={onClick} style={{
      display: 'flex', alignItems: 'center', gap: 10,
      width: '100%', padding: '10px 14px',
      background: active ? 'rgba(124,111,247,0.15)' : 'transparent',
      border: `1px solid ${active ? 'rgba(124,111,247,0.3)' : 'transparent'}`,
      borderRadius: 10, cursor: 'pointer',
      fontFamily: 'inherit', transition: 'all 0.2s',
      textAlign: 'left',
    }}>
      <span style={{ fontSize: 17 }}>{icon}</span>
      <span style={{ color: active ? '#fff' : 'rgba(255,255,255,0.45)', fontSize: 13, fontWeight: active ? 600 : 400, flex: 1 }}>{label}</span>
      {badge != null && (
        <span style={{
          background: active ? C.violet : 'rgba(255,255,255,0.1)',
          color: '#fff', fontSize: 10, fontWeight: 700,
          padding: '1px 7px', borderRadius: 10,
        }}>{badge}</span>
      )}
    </button>
  );
}

// ─────────────────────────────────────────────────────────────
// MAIN ADMIN PAGE
// ─────────────────────────────────────────────────────────────
export default function AdminPage({ onClose }) {
  const [tab, setTab] = useState('overview');
  const [bookings, setBookings] = useState([]);
  const [stats, setStats] = useState(null);
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [lastRefresh, setLastRefresh] = useState(null);

  const loadData = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const [br, sr] = await Promise.all([getAllBookings(), getBookingStats()]);
      setBookings(br.bookings || []);
      setStats(sr.stats || {});
      setLastRefresh(new Date());
      try {
        const cr = await getAllConversations();
        setConversations(cr.conversations || []);
      } catch { setConversations([]); }
    } catch {
      setError('Cannot connect to backend. Make sure the server is running on port 5000.');
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const handleCancel = async (id) => {
    if (!confirm('Cancel this booking?')) return;
    try {
      await cancelBooking(id);
      setBookings(prev => prev.map(b =>
        (b.bookingId === id || b._id === id) ? { ...b, status: 'cancelled' } : b
      ));
    } catch { alert('Failed to cancel booking'); }
  };

  const confirmed = bookings.filter(b => b.status === 'confirmed');

  const TABS = [
    { id: 'overview',       icon: '📊', label: 'Overview',      badge: null },
    { id: 'capacity',       icon: '🪑', label: 'Capacity',      badge: null },
    { id: 'bookings',       icon: '📋', label: 'All Bookings',  badge: bookings.length },
    { id: 'guests',         icon: '👥', label: 'Guest Roster',  badge: confirmed.length },
    { id: 'conversations',  icon: '💬', label: 'Conversations', badge: conversations.length },
  ];

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      style={{
        position: 'fixed', inset: 0,
        background: 'rgba(0,0,0,0.92)',
        backdropFilter: 'blur(24px)',
        zIndex: 2000,
        display: 'flex',
      }}
    >
      {/* ── SIDEBAR ─────────────────────────────────────────── */}
      <div style={{
        width: 220, flexShrink: 0,
        background: 'rgba(255,255,255,0.02)',
        borderRight: `1px solid ${C.border}`,
        display: 'flex', flexDirection: 'column',
        padding: '0 12px',
      }}>
        {/* Logo */}
        <div style={{ padding: '24px 4px 20px', borderBottom: `1px solid ${C.border}`, marginBottom: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 32, height: 32, borderRadius: '50%',
              background: `linear-gradient(135deg, ${C.purple}, ${C.violet})`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 14, boxShadow: `0 0 14px ${C.purple}60`,
            }}>✦</div>
            <div>
              <p style={{ color: '#fff', fontSize: 14, fontWeight: 600, margin: 0 }}>Admin</p>
              <p style={{ color: 'rgba(255,255,255,0.25)', fontSize: 10, margin: 0 }}>The Velvet Room</p>
            </div>
          </div>
        </div>

        {/* Nav */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4, flex: 1 }}>
          {TABS.map(t => (
            <NavItem key={t.id} icon={t.icon} label={t.label} active={tab === t.id}
              onClick={() => setTab(t.id)} badge={t.badge} />
          ))}
        </div>

        {/* Bottom */}
        <div style={{ padding: '16px 4px', borderTop: `1px solid ${C.border}`, display: 'flex', flexDirection: 'column', gap: 8 }}>
          {lastRefresh && (
            <p style={{ color: 'rgba(255,255,255,0.2)', fontSize: 9, textAlign: 'center', letterSpacing: 0.5 }}>
              Updated {lastRefresh.toLocaleTimeString()}
            </p>
          )}
          <button onClick={loadData} style={{
            background: 'rgba(45,212,191,0.1)', border: '1px solid rgba(45,212,191,0.3)',
            color: C.teal, borderRadius: 8, padding: '8px',
            cursor: 'pointer', fontSize: 11, fontFamily: 'inherit', fontWeight: 600,
            width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
            boxShadow: `0 0 12px rgba(45,212,191,0.1)`,
          }}>↻ Refresh</button>
          <button onClick={onClose} style={{
            background: 'rgba(255,255,255,0.04)', border: `1px solid ${C.border}`,
            color: 'rgba(255,255,255,0.4)', borderRadius: 8, padding: '8px',
            cursor: 'pointer', fontSize: 11, fontFamily: 'inherit',
            width: '100%',
          }}>✕ Close Admin</button>
        </div>
      </div>

      {/* ── MAIN CONTENT ────────────────────────────────────── */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {/* Top bar */}
        <div style={{
          padding: '18px 32px',
          borderBottom: `1px solid ${C.border}`,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          background: 'rgba(255,255,255,0.01)', flexShrink: 0,
        }}>
          <div>
            <h2 style={{ color: '#fff', fontFamily: 'var(--font-display)', fontSize: 26, fontWeight: 300, margin: 0 }}>
              {TABS.find(t => t.id === tab)?.label}
            </h2>
            <p style={{ color: 'rgba(255,255,255,0.25)', fontSize: 11, margin: '2px 0 0', letterSpacing: 0.5 }}>
              ARIA Receptionist System · {bookings.length} total bookings
            </p>
          </div>
          {/* Status dots */}
          <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
            {[
              { label: 'Confirmed', count: confirmed.length, color: C.teal },
              { label: 'Cancelled', count: bookings.filter(b=>b.status==='cancelled').length, color: C.rose },
              { label: 'Total Guests', count: confirmed.reduce((s,b)=>s+(b.people||0),0), color: C.violet },
            ].map(dot => (
              <div key={dot.label} style={{ textAlign: 'center' }}>
                <p style={{ color: dot.color, fontSize: 20, fontFamily: 'var(--font-display)', fontWeight: 300, margin: 0 }}>{dot.count}</p>
                <p style={{ color: 'rgba(255,255,255,0.25)', fontSize: 9, letterSpacing: 1, textTransform: 'uppercase', margin: 0 }}>{dot.label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Scrollable body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '28px 32px' }}>
          {error && (
            <div style={{
              background: 'rgba(251,113,133,0.08)', border: '1px solid rgba(251,113,133,0.25)',
              borderRadius: 12, padding: '12px 16px', color: '#fda4af', fontSize: 13, marginBottom: 20,
            }}>{error}</div>
          )}

          <AnimatePresence mode="wait">
            <motion.div key={tab} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>
              {tab === 'overview'      && <TabOverview bookings={bookings} stats={stats} />}
              {tab === 'capacity'      && <TabCapacity bookings={bookings} />}
              {tab === 'bookings'      && <TabBookings bookings={bookings} onCancel={handleCancel} loading={loading} />}
              {tab === 'guests'        && <TabGuests bookings={bookings} />}
              {tab === 'conversations' && <TabConversations conversations={conversations} />}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </motion.div>
  );
}
