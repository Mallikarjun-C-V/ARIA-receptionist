import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { getAllBookings, getBookings, cancelBooking, getCapacity, getStats, getConvos, healthCheck } from '../services/api';

const C = { purple:'#7c6ff7', violet:'#a78bfa', teal:'#2dd4bf', amber:'#fbbf24', rose:'#fb7185' };
const STATUS_COLOR = { confirmed:C.teal, cancelled:C.rose, pending:C.amber };

// ── Today in YYYY-MM-DD (local) ───────────────────────────────
function todayStr() {
  return new Date().toLocaleDateString('en-CA');  // en-CA always returns YYYY-MM-DD
}

// ── Format YYYY-MM-DD for display ────────────────────────────
function displayDate(d) {
  if (!d || !/^\d{4}-\d{2}-\d{2}$/.test(d)) return d || '';
  const [y, mo, day] = d.split('-').map(Number);
  return new Date(y, mo-1, day, 12).toLocaleDateString('en-US', { weekday:'short', month:'short', day:'numeric', year:'numeric' });
}

// ── Date Navigator component ──────────────────────────────────
function DateNav({ value, onChange }) {
  const move = (n) => {
    const [y,m,d] = value.split('-').map(Number);
    const nd = new Date(y, m-1, d+n);
    onChange(`${nd.getFullYear()}-${String(nd.getMonth()+1).padStart(2,'0')}-${String(nd.getDate()).padStart(2,'0')}`);
  };
  return (
    <div style={{ display:'flex', alignItems:'center', gap:8, background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.08)', borderRadius:10, padding:'6px 10px' }}>
      <button onClick={()=>move(-1)} style={{ background:'none', border:'none', color:'rgba(255,255,255,0.4)', cursor:'pointer', fontSize:16, lineHeight:1, padding:'0 4px' }}>‹</button>
      <div style={{ display:'flex', alignItems:'center', gap:8 }}>
        <input
          type="date" value={value} onChange={e => onChange(e.target.value)}
          style={{ background:'transparent', border:'none', color:'#fff', fontFamily:'inherit', fontSize:13, fontWeight:600, outline:'none', cursor:'pointer', width:130 }}
        />
        <span style={{ color:'rgba(255,255,255,0.3)', fontSize:11 }}>
          {value === todayStr() ? '(today)' : ''}
        </span>
      </div>
      <button onClick={()=>move(1)} style={{ background:'none', border:'none', color:'rgba(255,255,255,0.4)', cursor:'pointer', fontSize:16, lineHeight:1, padding:'0 4px' }}>›</button>
      <button onClick={()=>onChange(todayStr())} style={{ background:'rgba(124,111,247,0.15)', border:'1px solid rgba(124,111,247,0.3)', color:C.violet, borderRadius:6, padding:'3px 10px', cursor:'pointer', fontSize:10, fontFamily:'inherit', fontWeight:600 }}>Today</button>
    </div>
  );
}

// ── Ring chart ────────────────────────────────────────────────
function Ring({ pct=0, size=140, stroke=12, color=C.violet, children }) {
  const r = (size-stroke)/2, circ = 2*Math.PI*r;
  return (
    <div style={{ position:'relative', width:size, height:size, flexShrink:0 }}>
      <svg width={size} height={size} style={{ transform:'rotate(-90deg)' }}>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={stroke}/>
        <motion.circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth={stroke} strokeLinecap="round"
          initial={{ strokeDasharray:`0 ${circ}` }}
          animate={{ strokeDasharray:`${circ*Math.min(pct,1)} ${circ}` }}
          transition={{ duration:1.2, ease:'easeOut' }}/>
      </svg>
      <div style={{ position:'absolute', inset:0, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:2 }}>
        {children}
      </div>
    </div>
  );
}

function Stat({ icon, label, value, color='#fff', sub }) {
  return (
    <div style={{ background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.07)', borderRadius:14, padding:'18px 20px' }}>
      <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:10 }}>
        <span style={{ fontSize:18 }}>{icon}</span>
        <span style={{ color:'rgba(255,255,255,0.3)', fontSize:9, letterSpacing:2, textTransform:'uppercase', fontWeight:600 }}>{label}</span>
      </div>
      <p style={{ color, fontSize:32, fontFamily:'var(--font-d)', fontWeight:300, lineHeight:1, margin:'0 0 4px' }}>{value}</p>
      {sub && <p style={{ color:'rgba(255,255,255,0.25)', fontSize:11 }}>{sub}</p>}
    </div>
  );
}

// ── TABLE MAP ─────────────────────────────────────────────────
// Shows the physical table grid for a specific date
function TableMap({ capacity, selectedDate, onCancel }) {
  if (!capacity) return (
    <div style={{ textAlign:'center', padding:60, color:'rgba(255,255,255,0.2)' }}>
      Loading table map for {displayDate(selectedDate)}…
    </div>
  );

  const { slotMap, restaurant, totals, displayDate: apiDisplayDate } = capacity;

  return (
    <div>
      {/* Date context banner */}
      <div style={{ background:'rgba(124,111,247,0.08)', border:'1px solid rgba(124,111,247,0.18)', borderRadius:10, padding:'10px 16px', marginBottom:20, display:'flex', alignItems:'center', gap:10 }}>
        <span style={{ fontSize:16 }}>📅</span>
        <div>
          <p style={{ color:'#fff', fontSize:13, fontWeight:600, margin:0 }}>Showing capacity for {apiDisplayDate || displayDate(selectedDate)}</p>
          <p style={{ color:'rgba(255,255,255,0.35)', fontSize:11, margin:0 }}>
            {totals.confirmedBookings}/{totals.maxBookings} booking slots filled · {totals.occupancyPct}% occupancy
          </p>
        </div>
      </div>

      {/* Legend */}
      <div style={{ display:'flex', gap:16, marginBottom:16 }}>
        {[{color:C.violet,label:'Booked'},{color:'rgba(255,255,255,0.08)',label:'Available'}].map(l=>(
          <div key={l.label} style={{ display:'flex', alignItems:'center', gap:5 }}>
            <div style={{ width:10, height:10, borderRadius:2, background:l.color }}/>
            <span style={{ color:'rgba(255,255,255,0.4)', fontSize:11 }}>{l.label}</span>
          </div>
        ))}
        <span style={{ color:'rgba(255,255,255,0.2)', fontSize:11, marginLeft:'auto' }}>
          {restaurant.TOTAL_TABLES} tables × {restaurant.SEATING_TIMES.length} seatings
        </span>
      </div>

      {/* Grid header */}
      <div style={{ display:'grid', gridTemplateColumns:`110px repeat(${slotMap.length},1fr)`, gap:8, marginBottom:8 }}>
        <div/>
        {slotMap.map(s=>(
          <div key={s.slot} style={{ textAlign:'center', padding:'8px 4px', background:'rgba(124,111,247,0.08)', border:'1px solid rgba(124,111,247,0.15)', borderRadius:8 }}>
            <p style={{ color:C.violet, fontSize:12, fontWeight:600, margin:0 }}>{s.slot}</p>
            <p style={{ color:'rgba(255,255,255,0.3)', fontSize:9, margin:'2px 0 0' }}>
              {s.tablesUsed}/{restaurant.TOTAL_TABLES} · {s.guestsTotal} guests
            </p>
          </div>
        ))}
      </div>

      {/* Rows — one per table */}
      {Array.from({ length: restaurant.TOTAL_TABLES }, (_, ti) => (
        <div key={ti} style={{ display:'grid', gridTemplateColumns:`110px repeat(${slotMap.length},1fr)`, gap:8, marginBottom:8 }}>
          <div style={{ display:'flex', alignItems:'center', gap:8, background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.07)', borderRadius:10, padding:'10px 12px' }}>
            <div style={{ width:30, height:30, borderRadius:7, background:'rgba(124,111,247,0.12)', border:'1px solid rgba(124,111,247,0.2)', display:'flex', alignItems:'center', justifyContent:'center', color:C.violet, fontSize:12, fontWeight:700, flexShrink:0 }}>
              {ti+1}
            </div>
            <div>
              <p style={{ color:'#fff', fontSize:11, fontWeight:600, margin:0 }}>Table {ti+1}</p>
              <p style={{ color:'rgba(255,255,255,0.25)', fontSize:9, margin:0 }}>Max {restaurant.MAX_GUESTS_PER_TABLE}p</p>
            </div>
          </div>

          {slotMap.map(s => {
            const cell   = s.tables[ti];
            const booked = cell.booked;
            return (
              <motion.div key={s.slot} whileHover={{ scale:1.02 }}
                style={{ borderRadius:10, padding:'10px 12px', minHeight:70, background: booked?'rgba(124,111,247,0.12)':'rgba(255,255,255,0.03)', border:`1px solid ${booked?'rgba(124,111,247,0.3)':'rgba(255,255,255,0.06)'}`, display:'flex', flexDirection:'column', justifyContent:'space-between', transition:'all 0.2s' }}>
                {booked ? (
                  <>
                    <div>
                      <p style={{ color:'#fff', fontSize:12, fontWeight:600, margin:0, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{cell.booking.customerName}</p>
                      <p style={{ color:'rgba(255,255,255,0.4)', fontSize:10, margin:'2px 0 0' }}>
                        {cell.booking.people}p{cell.booking.occasion ? ` · ${cell.booking.occasion}` : ''}
                      </p>
                    </div>
                    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginTop:6 }}>
                      <span style={{ color:C.violet, fontSize:9, fontFamily:'monospace' }}>{cell.booking.bookingId}</span>
                      <button onClick={()=>onCancel(cell.booking.bookingId)} style={{ background:'rgba(251,113,133,0.15)', border:'1px solid rgba(251,113,133,0.3)', color:C.rose, borderRadius:4, padding:'2px 7px', cursor:'pointer', fontSize:9, fontFamily:'inherit', fontWeight:600 }}>✕</button>
                    </div>
                  </>
                ) : (
                  <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'100%' }}>
                    <span style={{ color:'rgba(255,255,255,0.15)', fontSize:11 }}>Free</span>
                  </div>
                )}
              </motion.div>
            );
          })}
        </div>
      ))}
    </div>
  );
}

// ── Bookings table ────────────────────────────────────────────
function BookingsTab({ bookings, allBookings, onCancel, loading, selectedDate, onDateChange }) {
  const [filter, setFilter] = useState('all');
  const [q, setQ]           = useState('');
  const [showAll, setShowAll] = useState(false);

  const source = showAll ? allBookings : bookings;
  const shown  = source
    .filter(b => filter==='all' || b.status===filter)
    .filter(b => !q || [b.customerName,b.email,b.bookingId].join(' ').toLowerCase().includes(q.toLowerCase()));

  return (
    <div>
      <div style={{ display:'flex', gap:8, marginBottom:16, flexWrap:'wrap', alignItems:'center' }}>
        {['all','confirmed','cancelled'].map(f=>(
          <button key={f} onClick={()=>setFilter(f)} style={{ padding:'5px 14px', borderRadius:20, border:'none', cursor:'pointer', fontSize:11, fontFamily:'inherit', fontWeight:600, background:filter===f?'rgba(124,111,247,0.25)':'rgba(255,255,255,0.05)', color:filter===f?C.violet:'rgba(255,255,255,0.35)' }}>
            {f.charAt(0).toUpperCase()+f.slice(1)} ({source.filter(b=>f==='all'||b.status===f).length})
          </button>
        ))}
        <button onClick={()=>setShowAll(v=>!v)} style={{ padding:'5px 14px', borderRadius:20, border:`1px solid ${showAll?'rgba(251,191,36,0.3)':'rgba(255,255,255,0.1)'}`, cursor:'pointer', fontSize:11, fontFamily:'inherit', background:'transparent', color:showAll?C.amber:'rgba(255,255,255,0.3)' }}>
          {showAll ? `All dates (${allBookings.length})` : `${displayDate(selectedDate)} (${bookings.length})`}
        </button>
        <input value={q} onChange={e=>setQ(e.target.value)} placeholder="Search name, email, ID…"
          style={{ marginLeft:'auto', padding:'7px 14px', background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.07)', borderRadius:8, color:'#fff', fontSize:12, fontFamily:'inherit', outline:'none', width:200 }}/>
      </div>

      {loading ? <div style={{ textAlign:'center', padding:60, color:'rgba(255,255,255,0.2)' }}>Loading…</div>
       : shown.length===0 ? <div style={{ textAlign:'center', padding:60, color:'rgba(255,255,255,0.15)', fontSize:13 }}>No bookings found{!showAll?` for ${displayDate(selectedDate)}`:''}</div>
       : <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
          {shown.map((b,i)=>(
            <motion.div key={b._id||i} initial={{ opacity:0, y:5 }} animate={{ opacity:1, y:0 }} transition={{ delay:i*0.02 }}
              style={{ display:'grid', gridTemplateColumns:'110px 1fr 110px 80px 45px 90px auto', alignItems:'center', gap:12, background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.07)', borderRadius:12, padding:'11px 16px' }}>
              <span style={{ color:C.violet, fontSize:11, fontFamily:'monospace', fontWeight:600 }}>{b.bookingId}</span>
              <div>
                <p style={{ color:'#fff', fontSize:13, fontWeight:500, margin:0 }}>{b.customerName}</p>
                <p style={{ color:'rgba(255,255,255,0.3)', fontSize:10, margin:'1px 0 0' }}>{b.email||'No email'}</p>
              </div>
              <div>
                <p style={{ color:'rgba(255,255,255,0.3)', fontSize:9, textTransform:'uppercase', letterSpacing:1, margin:0 }}>Date</p>
                <p style={{ color:'#fff', fontSize:11, margin:'1px 0 0', fontWeight:500 }}>{displayDate(b.date)}</p>
              </div>
              <span style={{ color:'rgba(255,255,255,0.5)', fontSize:12 }}>{b.time}</span>
              <span style={{ color:'rgba(255,255,255,0.5)', fontSize:12 }}>{b.people}p</span>
              <div style={{ display:'flex', alignItems:'center', gap:5 }}>
                <div style={{ width:5, height:5, borderRadius:'50%', background:STATUS_COLOR[b.status]||'#6b7280', boxShadow:`0 0 5px ${STATUS_COLOR[b.status]}` }}/>
                <span style={{ color:STATUS_COLOR[b.status], fontSize:11, fontWeight:600 }}>{b.status}</span>
              </div>
              <div style={{ display:'flex', gap:6, alignItems:'center' }}>
                {b.tableNumber && <span style={{ color:'rgba(124,111,247,0.5)', fontSize:10 }}>T{b.tableNumber}</span>}
                {b.status==='confirmed' && (
                  <button onClick={()=>onCancel(b.bookingId||b._id)} style={{ background:'rgba(239,68,68,0.1)', border:'1px solid rgba(239,68,68,0.35)', color:'#f87171', borderRadius:6, padding:'3px 9px', cursor:'pointer', fontSize:10, fontFamily:'inherit', fontWeight:600 }}>✕</button>
                )}
              </div>
            </motion.div>
          ))}
        </div>}
    </div>
  );
}

// ── Guests grid ───────────────────────────────────────────────
function GuestsTab({ bookings }) {
  const confirmed = bookings.filter(b=>b.status==='confirmed');
  return (
    <div>
      <p style={{ color:'rgba(255,255,255,0.3)', fontSize:12, marginBottom:16 }}>
        {confirmed.length} confirmed · {confirmed.reduce((s,b)=>s+(b.people||0),0)} guests
      </p>
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(260px,1fr))', gap:12 }}>
        {confirmed.map((b,i)=>(
          <motion.div key={b._id||i} initial={{ opacity:0, scale:0.96 }} animate={{ opacity:1, scale:1 }} transition={{ delay:i*0.04 }}
            style={{ background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.07)', borderRadius:14, padding:'16px 18px' }}>
            <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:12 }}>
              <div style={{ width:40, height:40, borderRadius:'50%', flexShrink:0, background:`linear-gradient(135deg,#7c6ff7,#a78bfa)`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:16, fontWeight:700, color:'#fff', boxShadow:'0 0 14px rgba(124,111,247,0.4)' }}>
                {(b.customerName||'?').charAt(0).toUpperCase()}
              </div>
              <div style={{ minWidth:0 }}>
                <p style={{ color:'#fff', fontSize:14, fontWeight:600, margin:0, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{b.customerName}</p>
                <p style={{ color:'rgba(255,255,255,0.3)', fontSize:10, margin:'2px 0 0', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{b.email||'No email'}</p>
              </div>
            </div>
            <div style={{ display:'flex', flexWrap:'wrap', gap:5, marginBottom:10 }}>
              {[{i:'📅',v:displayDate(b.date)},{i:'🕐',v:b.time},{i:'👥',v:`${b.people}p`},{i:'🪑',v:`Table ${b.tableNumber||'?'}`},
                ...(b.occasion?[{i:'🎉',v:b.occasion}]:[])].map(c=>(
                <span key={c.v} style={{ padding:'3px 9px', borderRadius:20, background:'rgba(255,255,255,0.05)', border:'1px solid rgba(255,255,255,0.07)', color:'rgba(255,255,255,0.45)', fontSize:10 }}>{c.i} {c.v}</span>
              ))}
            </div>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
              <span style={{ color:C.violet, fontSize:10, fontFamily:'monospace', fontWeight:600 }}>{b.bookingId}</span>
              {b.emailsSent?.confirmation && <span style={{ fontSize:9, padding:'2px 7px', borderRadius:10, background:'rgba(45,212,191,0.1)', color:C.teal, border:'1px solid rgba(45,212,191,0.2)' }}>📧 Emailed</span>}
            </div>
          </motion.div>
        ))}
        {confirmed.length===0 && <div style={{ gridColumn:'1/-1', textAlign:'center', padding:60, color:'rgba(255,255,255,0.15)', fontSize:13 }}>No confirmed guests for this date</div>}
      </div>
    </div>
  );
}

function ConvosTab({ convos }) {
  return (
    <div>
      {convos.length===0 ? <div style={{ textAlign:'center', padding:60, color:'rgba(255,255,255,0.15)', fontSize:13 }}>No conversations. MongoDB may not be connected.</div>
      : <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
          {convos.map((c,i)=>(
            <motion.div key={c._id||i} initial={{ opacity:0, y:5 }} animate={{ opacity:1, y:0 }} transition={{ delay:i*0.025 }}
              style={{ background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.07)', borderRadius:12, padding:'14px 18px' }}>
              <div style={{ display:'flex', justifyContent:'space-between', marginBottom:6 }}>
                <span style={{ color:C.violet, fontSize:11, fontWeight:600, fontFamily:'monospace' }}>{(c.sessionId||'').slice(0,12)}…</span>
                <span style={{ color:'rgba(255,255,255,0.25)', fontSize:10 }}>{c.messages?.length||0} msgs · {new Date(c.createdAt).toLocaleString()}</span>
              </div>
              <div style={{ display:'flex', gap:8 }}>
                {[{l:'Intent',v:c.intent||'general'},{l:'Sentiment',v:c.sentiment||'unknown'}].map(t=>(
                  <span key={t.l} style={{ padding:'2px 9px', borderRadius:10, fontSize:10, background:'rgba(255,255,255,0.05)', border:'1px solid rgba(255,255,255,0.07)', color:'rgba(255,255,255,0.4)' }}>{t.l}: {t.v}</span>
                ))}
              </div>
            </motion.div>
          ))}
        </div>}
    </div>
  );
}

function Nav({ icon, label, active, onClick, badge }) {
  return (
    <button onClick={onClick} style={{ display:'flex', alignItems:'center', gap:10, width:'100%', padding:'9px 12px', borderRadius:9, cursor:'pointer', fontFamily:'inherit', background:active?'rgba(124,111,247,0.15)':'transparent', border:`1px solid ${active?'rgba(124,111,247,0.3)':'transparent'}`, textAlign:'left', transition:'all 0.2s' }}>
      <span style={{ fontSize:16 }}>{icon}</span>
      <span style={{ color:active?'#fff':'rgba(255,255,255,0.4)', fontSize:13, fontWeight:active?600:400, flex:1 }}>{label}</span>
      {badge!=null && <span style={{ background:active?C.violet:'rgba(255,255,255,0.1)', color:'#fff', fontSize:10, fontWeight:700, padding:'1px 7px', borderRadius:10 }}>{badge}</span>}
    </button>
  );
}

// ── MAIN DASHBOARD ────────────────────────────────────────────
export default function Dashboard({ user, onLogout }) {
  const [tab, setTab]           = useState('overview');
  const [selectedDate, setSelectedDate] = useState(todayStr);

  // Date-specific data
  const [capacity,   setCapacity]   = useState(null);
  const [dayBookings, setDayBookings] = useState([]);

  // All-time data
  const [allBookings, setAllBookings] = useState([]);
  const [stats,      setStats]      = useState(null);
  const [convos,     setConvos]     = useState([]);

  const [loading,   setLoading]   = useState(true);
  const [error,     setError]     = useState('');
  const [serverOk,  setServerOk]  = useState(null);
  const [refreshed, setRefreshed] = useState(null);

  // Load date-specific data when selectedDate changes
  const loadDateData = useCallback(async (date) => {
    try {
      const [cap, dayB] = await Promise.all([
        getCapacity(date),
        getBookings(date),
      ]);
      setCapacity(cap);
      setDayBookings(dayB.bookings || []);
    } catch(e) {
      console.error('Date data error:', e.message);
    }
  }, []);

  // Full load (all-time data + date data)
  const loadAll = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const [allB, st, cv] = await Promise.all([getAllBookings(), getStats(), getConvos()]);
      setAllBookings(allB.bookings || []);
      setStats(st);
      setConvos(cv.conversations || []);
      setRefreshed(new Date());
      healthCheck().then(h => setServerOk(!!h));
      await loadDateData(selectedDate);
    } catch(e) {
      setError(e.message);
    } finally { setLoading(false); }
  }, [selectedDate, loadDateData]);

  useEffect(() => { loadAll(); }, []);  // on mount

  // Reload date-specific data when date changes
  useEffect(() => {
    if (!loading) loadDateData(selectedDate);
  }, [selectedDate]);

  const handleCancel = async (id) => {
    if (!confirm('Cancel this booking?')) return;
    try {
      await cancelBooking(id);
      // Optimistic update
      const markCancelled = b => (b.bookingId===id||b._id===id) ? {...b,status:'cancelled'} : b;
      setAllBookings(prev => prev.map(markCancelled));
      setDayBookings(prev => prev.map(markCancelled));
      // Refresh capacity for the table map
      await loadDateData(selectedDate);
    } catch(e) { alert('Failed: '+e.message); }
  };

  const handleDateChange = (d) => { setSelectedDate(d); };

  const confirmedToday = dayBookings.filter(b=>b.status==='confirmed');
  const confirmedAll   = allBookings.filter(b=>b.status==='confirmed');
  const occupancyPct   = capacity?.totals?.occupancyPct || 0;

  const TABS = [
    { id:'overview',  icon:'📊', label:'Overview',     badge:null },
    { id:'tablemap',  icon:'🪑', label:'Table Map',    badge:null },
    { id:'bookings',  icon:'📋', label:'Bookings',     badge:allBookings.length },
    { id:'guests',    icon:'👥', label:'Guests',        badge:confirmedToday.length },
    { id:'convos',    icon:'💬', label:'Conversations', badge:convos.length },
  ];

  // Tabs that are date-specific
  const DATE_TABS = new Set(['tablemap','guests']);

  return (
    <div style={{ display:'flex', height:'100vh', overflow:'hidden', background:'var(--bg)' }}>

      {/* SIDEBAR */}
      <div style={{ width:210, flexShrink:0, background:'rgba(255,255,255,0.02)', borderRight:'1px solid rgba(255,255,255,0.07)', display:'flex', flexDirection:'column', padding:'0 10px' }}>
        <div style={{ padding:'22px 6px 18px', borderBottom:'1px solid rgba(255,255,255,0.07)', marginBottom:10 }}>
          <div style={{ display:'flex', alignItems:'center', gap:10 }}>
            <div style={{ width:34, height:34, borderRadius:'50%', background:'linear-gradient(135deg,#7c6ff7,#a78bfa)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:15, boxShadow:'0 0 14px rgba(124,111,247,0.5)', flexShrink:0 }}>✦</div>
            <div>
              <p style={{ color:'#fff', fontSize:13, fontWeight:600, margin:0 }}>Velvet Room</p>
              <p style={{ color:'rgba(255,255,255,0.25)', fontSize:9, margin:0 }}>Admin · {user}</p>
            </div>
          </div>
        </div>

        {/* Server status */}
        <div style={{ padding:'8px 6px 14px', borderBottom:'1px solid rgba(255,255,255,0.07)', marginBottom:10 }}>
          <div style={{ display:'flex', alignItems:'center', gap:6, padding:'6px 10px', borderRadius:8, background:serverOk===null?'rgba(255,255,255,0.03)':serverOk?'rgba(45,212,191,0.08)':'rgba(251,113,133,0.08)', border:`1px solid ${serverOk?'rgba(45,212,191,0.2)':serverOk===false?'rgba(251,113,133,0.2)':'rgba(255,255,255,0.08)'}` }}>
            <div style={{ width:6, height:6, borderRadius:'50%', flexShrink:0, background:serverOk===null?'#6b7280':serverOk?C.teal:C.rose }}/>
            <span style={{ fontSize:10, color:serverOk?C.teal:serverOk===false?C.rose:'rgba(255,255,255,0.3)', fontWeight:500 }}>
              {serverOk===null?'Checking…':serverOk?'Online':'Offline'}
            </span>
          </div>
        </div>

        <div style={{ display:'flex', flexDirection:'column', gap:3, flex:1 }}>
          {TABS.map(t=><Nav key={t.id} {...t} active={tab===t.id} onClick={()=>setTab(t.id)}/>)}
        </div>

        <div style={{ padding:'14px 4px', borderTop:'1px solid rgba(255,255,255,0.07)', display:'flex', flexDirection:'column', gap:8 }}>
          {refreshed && <p style={{ color:'rgba(255,255,255,0.15)', fontSize:9, textAlign:'center' }}>{refreshed.toLocaleTimeString()}</p>}
          <button onClick={loadAll} style={{ background:'rgba(45,212,191,0.1)', border:'1px solid rgba(45,212,191,0.25)', color:C.teal, borderRadius:8, padding:'7px', cursor:'pointer', fontSize:11, fontFamily:'inherit', fontWeight:600 }}>↻ Refresh</button>
          <button onClick={onLogout} style={{ background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.07)', color:'rgba(255,255,255,0.35)', borderRadius:8, padding:'7px', cursor:'pointer', fontSize:11, fontFamily:'inherit' }}>Sign Out</button>
        </div>
      </div>

      {/* MAIN */}
      <div style={{ flex:1, display:'flex', flexDirection:'column', overflow:'hidden' }}>

        {/* Top bar */}
        <div style={{ padding:'14px 28px', borderBottom:'1px solid rgba(255,255,255,0.07)', display:'flex', alignItems:'center', justifyContent:'space-between', flexShrink:0, background:'rgba(255,255,255,0.01)', gap:16, flexWrap:'wrap' }}>
          <div style={{ display:'flex', alignItems:'center', gap:16 }}>
            <div>
              <h2 style={{ color:'#fff', fontFamily:'var(--font-d)', fontSize:22, fontWeight:300, margin:0 }}>
                {TABS.find(t=>t.id===tab)?.label}
              </h2>
              <p style={{ color:'rgba(255,255,255,0.2)', fontSize:10, margin:'1px 0 0' }}>
                5 tables · 10 seats · 3 seatings (5PM · 7PM · 9PM)
              </p>
            </div>
          </div>

          <div style={{ display:'flex', alignItems:'center', gap:16, flexWrap:'wrap' }}>
            {/* Date navigator — always visible */}
            <DateNav value={selectedDate} onChange={handleDateChange}/>

            {/* Summary chips */}
            <div style={{ display:'flex', gap:16 }}>
              {[
                { label:'Today', val:confirmedToday.length, color:C.teal },
                { label:'All time', val:confirmedAll.length, color:C.violet },
                { label:DATE_TABS.has(tab)?`${displayDate(selectedDate).split(',')[0]} occ.`:'Occupancy', val:`${occupancyPct}%`, color:occupancyPct>80?C.rose:occupancyPct>50?C.amber:C.teal },
              ].map(d=>(
                <div key={d.label} style={{ textAlign:'center' }}>
                  <p style={{ color:d.color, fontSize:20, fontFamily:'var(--font-d)', fontWeight:300, margin:0 }}>{d.val}</p>
                  <p style={{ color:'rgba(255,255,255,0.2)', fontSize:9, letterSpacing:1, textTransform:'uppercase', margin:0 }}>{d.label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Body */}
        <div style={{ flex:1, overflowY:'auto', padding:'24px 28px' }}>
          {error && <div style={{ background:'rgba(251,113,133,0.08)', border:'1px solid rgba(251,113,133,0.25)', borderRadius:12, padding:'12px 16px', color:'#fda4af', fontSize:13, marginBottom:20 }}>{error}</div>}

          <AnimatePresence mode="wait">
            <motion.div key={tab+selectedDate} initial={{ opacity:0, y:8 }} animate={{ opacity:1, y:0 }} exit={{ opacity:0 }} transition={{ duration:0.2 }}>

              {/* OVERVIEW */}
              {tab==='overview' && (
                <div>
                  <p style={{ color:'rgba(255,255,255,0.3)', fontSize:12, marginBottom:16 }}>
                    All-time statistics · Use date picker to filter specific date views
                  </p>
                  <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(150px,1fr))', gap:12, marginBottom:24 }}>
                    <Stat icon="🪑" label="Tables"       value={stats?.totalTables||5}             color="#fff"    sub={`${stats?.maxPerTable||10} seats max`}/>
                    <Stat icon="📋" label="All Bookings" value={stats?.totalBookings||0}            color={C.violet} sub="All time"/>
                    <Stat icon="✅" label="Confirmed"    value={stats?.confirmedBookings||0}        color={C.teal}  sub="Active"/>
                    <Stat icon="👥" label="Guests"       value={stats?.totalGuests||0}              color={C.amber} sub="Confirmed guests"/>
                    <Stat icon="❌" label="Cancelled"    value={stats?.cancelledBookings||0}        color={C.rose}  sub="All time"/>
                    <Stat icon="📊" label="Avg Party"    value={stats?.avgPartySize||'—'}           color={C.violet} sub="per booking"/>
                  </div>

                  {/* Today summary */}
                  <p style={{ color:'#fff', fontSize:14, fontWeight:500, margin:'0 0 12px' }}>
                    {displayDate(selectedDate)} — Capacity
                  </p>
                  <div style={{ display:'grid', gridTemplateColumns:'200px 1fr', gap:20, marginBottom:24 }}>
                    <div style={{ background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.07)', borderRadius:16, padding:'20px', display:'flex', flexDirection:'column', alignItems:'center', gap:12 }}>
                      <Ring pct={occupancyPct/100} color={occupancyPct>80?C.rose:occupancyPct>50?C.amber:C.violet}>
                        <span style={{ color:'#fff', fontSize:26, fontFamily:'var(--font-d)', fontWeight:300 }}>{occupancyPct}%</span>
                        <span style={{ color:'rgba(255,255,255,0.3)', fontSize:10 }}>booked</span>
                      </Ring>
                      {[
                        { label:'Booked',    val:capacity?.totals?.confirmedBookings||0, color:C.violet },
                        { label:'Available', val:capacity?.totals?.freeSlots||0,         color:C.teal },
                      ].map(r=>(
                        <div key={r.label} style={{ display:'flex', justifyContent:'space-between', width:'100%' }}>
                          <div style={{ display:'flex', alignItems:'center', gap:5 }}>
                            <div style={{ width:5, height:5, borderRadius:'50%', background:r.color }}/>
                            <span style={{ color:'rgba(255,255,255,0.35)', fontSize:11 }}>{r.label}</span>
                          </div>
                          <span style={{ color:r.color, fontSize:12, fontWeight:600 }}>{r.val}</span>
                        </div>
                      ))}
                    </div>

                    <div style={{ background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.07)', borderRadius:16, padding:'18px 22px' }}>
                      <p style={{ color:'#fff', fontSize:13, fontWeight:500, margin:'0 0 14px' }}>Slot breakdown — {displayDate(selectedDate)}</p>
                      {(capacity?.slotMap||[]).map(s => {
                        const pct  = s.tablesUsed / (capacity?.restaurant?.TOTAL_TABLES||5);
                        const col  = pct>0.8?C.rose:pct>0.5?C.amber:C.teal;
                        return (
                          <div key={s.slot} style={{ display:'grid', gridTemplateColumns:'80px 1fr 100px', alignItems:'center', gap:12, marginBottom:12 }}>
                            <span style={{ color:'rgba(255,255,255,0.55)', fontSize:12, fontWeight:500 }}>{s.slot}</span>
                            <div style={{ background:'rgba(255,255,255,0.06)', borderRadius:4, height:10, overflow:'hidden' }}>
                              <motion.div initial={{ width:0 }} animate={{ width:`${pct*100}%` }} transition={{ duration:0.9, ease:'easeOut' }}
                                style={{ height:'100%', background:col, borderRadius:4 }}/>
                            </div>
                            <span style={{ color:col, fontSize:12, fontWeight:600 }}>{s.tablesUsed}/{capacity?.restaurant?.TOTAL_TABLES||5} tables · {s.guestsTotal}p</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <p style={{ color:'#fff', fontSize:14, fontWeight:500, margin:'0 0 12px' }}>Recent Bookings (all dates)</p>
                  <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
                    {allBookings.slice(0,8).map((b,i)=>(
                      <motion.div key={b._id||i} initial={{ opacity:0, x:-8 }} animate={{ opacity:1, x:0 }} transition={{ delay:i*0.04 }}
                        style={{ display:'grid', gridTemplateColumns:'1fr auto auto auto auto auto', alignItems:'center', gap:14, padding:'10px 16px', background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.07)', borderRadius:10 }}>
                        <div>
                          <p style={{ color:'#fff', fontSize:13, fontWeight:500, margin:0 }}>{b.customerName}</p>
                          {b.email && <p style={{ color:'rgba(255,255,255,0.25)', fontSize:10, margin:'1px 0 0' }}>{b.email}</p>}
                        </div>
                        <span style={{ color:'rgba(255,255,255,0.4)', fontSize:11 }}>{displayDate(b.date)}</span>
                        <span style={{ color:'rgba(255,255,255,0.4)', fontSize:12 }}>{b.time}</span>
                        <span style={{ color:'rgba(255,255,255,0.4)', fontSize:12 }}>{b.people}p</span>
                        <span style={{ color:'rgba(124,111,247,0.5)', fontSize:10 }}>T{b.tableNumber||'?'}</span>
                        <span style={{ fontSize:9, padding:'2px 8px', borderRadius:10, fontWeight:600, background:b.status==='confirmed'?'rgba(45,212,191,0.1)':'rgba(251,113,133,0.1)', color:b.status==='confirmed'?C.teal:C.rose, border:`1px solid ${b.status==='confirmed'?'rgba(45,212,191,0.2)':'rgba(251,113,133,0.2)'}` }}>{b.status}</span>
                      </motion.div>
                    ))}
                    {allBookings.length===0 && <div style={{ textAlign:'center', padding:40, color:'rgba(255,255,255,0.15)', fontSize:13 }}>No bookings yet</div>}
                  </div>
                </div>
              )}

              {tab==='tablemap' && <TableMap capacity={capacity} selectedDate={selectedDate} onCancel={handleCancel}/>}
              {tab==='bookings' && <BookingsTab bookings={dayBookings} allBookings={allBookings} onCancel={handleCancel} loading={loading} selectedDate={selectedDate} onDateChange={handleDateChange}/>}
              {tab==='guests'   && <GuestsTab bookings={dayBookings}/>}
              {tab==='convos'   && <ConvosTab convos={convos}/>}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
