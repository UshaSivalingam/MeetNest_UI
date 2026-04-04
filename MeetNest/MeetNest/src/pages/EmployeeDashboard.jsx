import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { BookingAPI } from "../api/bookingAPI";
import { RoomAPI } from "../api/roomAPI";
import { useAuth } from "../context/AuthContext";
import "../styles/EmployeeDashboard.css";
import EmployeeRooms from "../components/EmployeeRooms";


// ─── CONSTANTS ───────────────────────────────────────────────────
const STATUS_M = {
  pending:   { label:"Pending",   icon:"⏳", cls:"pending"   },
  approved:  { label:"Approved",  icon:"✅", cls:"approved"  },
  rejected:  { label:"Rejected",  icon:"❌", cls:"rejected"  },
  cancelled: { label:"Cancelled", icon:"🚫", cls:"cancelled" },
};
const sm = (s="") => STATUS_M[s.toLowerCase()] || STATUS_M.pending;

// ─── HELPERS ─────────────────────────────────────────────────────
function fmtDate(iso) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-IN", {
    day:"2-digit", month:"short", year:"numeric",
  });
}
function fmtTime(iso) {
  if (!iso) return "";
  return new Date(iso).toLocaleTimeString("en-IN", {
    hour:"2-digit", minute:"2-digit", hour12:true,
  });
}
function durationLabel(start, end) {
  const mins = (new Date(end) - new Date(start)) / 60000;
  if (mins <= 0) return "";
  const h = Math.floor(mins / 60), m = mins % 60;
  return h > 0 ? `${h}h${m > 0 ? ` ${m}m` : ""}` : `${m}m`;
}
function defaultStart() {
  const d = new Date(); d.setMinutes(d.getMinutes() + 30, 0, 0);
  return d.toISOString().slice(0, 16);
}
function defaultEnd() {
  const d = new Date(); d.setMinutes(d.getMinutes() + 90, 0, 0);
  return d.toISOString().slice(0, 16);
}
function isUpcoming(iso) {
  return iso && new Date(iso) > new Date();
}
function daysUntil(iso) {
  if (!iso) return null;
  const diff = new Date(iso) - new Date();
  if (diff < 0) return null;
  const days = Math.floor(diff / 86400000);
  const hours = Math.floor((diff % 86400000) / 3600000);
  if (days > 0) return `Starts in ${days}d ${hours}h`;
  if (hours > 0) return `Starts in ${hours}h`;
  const mins = Math.floor((diff % 3600000) / 60000);
  return `Starts in ${mins}m`;
}

// ─── COUNT-UP HOOK ────────────────────────────────────────────────
function useCountUp(target, duration = 900) {
  const [val, setVal] = useState(0);
  const prev = useRef(0);
  useEffect(() => {
    if (typeof target !== "number") { setVal(target); return; }
    const start = prev.current;
    const diff = target - start;
    if (diff === 0) return;
    const startTime = performance.now();
    let raf;
    const step = (now) => {
      const t = Math.min((now - startTime) / duration, 1);
      const eased = 1 - Math.pow(1 - t, 3);
      setVal(Math.round(start + diff * eased));
      if (t < 1) raf = requestAnimationFrame(step);
      else prev.current = target;
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [target, duration]);
  return val;
}

// ─── LIVE CLOCK HOOK ──────────────────────────────────────────────
function useClock() {
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);
  const h = now.getHours();
  const greeting = h < 12 ? "Good morning" : h < 18 ? "Good afternoon" : "Good evening";
  const emoji    = h < 12 ? "🌤️" : h < 17 ? "☀️" : "🌙";
  const timeStr  = now.toLocaleTimeString("en-IN", { hour:"2-digit", minute:"2-digit", second:"2-digit", hour12:true });
  const dateStr  = now.toLocaleDateString("en-IN", { weekday:"long", day:"numeric", month:"long", year:"numeric" });
  return { greeting, emoji, timeStr, dateStr };
}

// ─── STAT CARD ────────────────────────────────────────────────────
function StatCard({ value, label, icon, color, border, active, onClick, filterable }) {
  const display = useCountUp(typeof value === "number" ? value : 0);
  return (
    <div
      className={`emp-stat-card${active ? " emp-stat-card--active" : ""}${filterable ? " emp-stat-card--filterable" : ""}`}
      style={{ borderColor: active ? color : border, "--stat-color": color }}
      onClick={filterable ? onClick : undefined}
      title={filterable ? `Click to filter by ${label}` : undefined}
    >
      <div className="emp-stat-card__glow" style={{ background: color }} />
      {filterable && <div className="emp-stat-card__filter-hint">click to filter</div>}
      <div className="emp-stat-card__icon" style={{ background: `${color}1a`, color }}>
        {icon}
      </div>
      <div className="emp-stat-card__info">
        <div className="emp-stat-card__value" style={{ color }}>
          {typeof value === "number" ? display : value}
        </div>
        <div className="emp-stat-card__label">{label}</div>
      </div>
      {active && <div className="emp-stat-card__active-dot" style={{ background: color }} />}
    </div>
  );
}

// ─── MINI BAR CHART ───────────────────────────────────────────────
function WeeklyChart({ bookings }) {
  const days = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
  const today = new Date().getDay();

  // Build last-7-days counts
  const counts = useMemo(() => {
    const arr = Array(7).fill(0);
    const now = new Date();
    bookings.forEach(b => {
      if (!b.startTime) return;
      const d = new Date(b.startTime);
      const diffDays = Math.floor((now - d) / 86400000);
      if (diffDays >= 0 && diffDays < 7) arr[6 - diffDays]++;
    });
    return arr;
  }, [bookings]);

  const labels = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(); d.setDate(d.getDate() - (6 - i));
    return days[d.getDay()];
  });

  const max = Math.max(...counts, 1);

  return (
    <div className="emp-weekly-chart">
      <div className="emp-weekly-chart__bars">
        {counts.map((v, i) => (
          <div key={i} className="emp-weekly-chart__col">
            <div className="emp-weekly-chart__bar-wrap">
              <div
                className={`emp-weekly-chart__bar${i === 6 ? " emp-weekly-chart__bar--today" : ""}`}
                style={{ "--bar-h": `${Math.max((v / max) * 100, 4)}%` }}
                title={`${labels[i]}: ${v} booking${v !== 1 ? "s" : ""}`}
              >
                {v > 0 && <span className="emp-weekly-chart__tip">{v}</span>}
              </div>
            </div>
            <span className="emp-weekly-chart__lbl">{labels[i]}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── UPCOMING SPOTLIGHT ───────────────────────────────────────────
function UpcomingSpotlight({ booking }) {
  const countdown = daysUntil(booking.startTime);
  return (
    <div className="emp-spotlight">
      <div className="emp-spotlight__bg" />
      <div className="emp-spotlight__label">⚡ Next Upcoming Booking</div>
      <div className="emp-spotlight__room">{booking.roomName || "—"}</div>
      <div className="emp-spotlight__meta">
        <span>📅 {fmtDate(booking.startTime)}</span>
        <span>🕐 {fmtTime(booking.startTime)}–{fmtTime(booking.endTime)}</span>
        {booking.branchName && <span>🏢 {booking.branchName}</span>}
        {booking.purpose && <span>💬 {booking.purpose}</span>}
      </div>
      {countdown && (
        <div className="emp-spotlight__countdown">{countdown}</div>
      )}
    </div>
  );
}

// ─── QUICK BOOKING MODAL ─────────────────────────────────────────
function BookModal({ room, onClose, onBooked }) {
  const [start,   setStart]   = useState(defaultStart());
  const [end,     setEnd]     = useState(defaultEnd());
  const [purpose, setPurpose] = useState("");
  const [loading, setLoading] = useState(false);
  const [alert,   setAlert]   = useState({ msg:"", type:"" });

  const duration  = start && end ? durationLabel(start, end) : "";
  const durationMins = start && end ? (new Date(end) - new Date(start)) / 60000 : 0;
  const durationErr  = durationMins > 0 && durationMins < 15;

  const handleSubmit = async () => {
    setAlert({ msg:"", type:"" });
    if (!purpose.trim()) return setAlert({ msg:"Purpose is required.", type:"error" });
    if (new Date(start) <= new Date()) return setAlert({ msg:"Start time must be in the future.", type:"error" });
    if (new Date(end) <= new Date(start)) return setAlert({ msg:"End must be after start time.", type:"error" });
    if (durationMins < 15) return setAlert({ msg:"Minimum booking duration is 15 minutes.", type:"error" });

    setLoading(true);
    try {
      await BookingAPI.create({
        roomId:    room.id,
        startTime: new Date(start).toISOString(),
        endTime:   new Date(end).toISOString(),
        purpose:   purpose.trim(),
      });
      setAlert({ msg:"Booking submitted! Awaiting admin approval.", type:"success" });
      setTimeout(onBooked, 1200);
    } catch (e) {
      setAlert({ msg: e.message || "Booking failed.", type:"error" });
      setLoading(false);
    }
  };

  const facilities = room.facilities || [];

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="emp-modal">
        <div className="emp-modal__header">
          <h2 className="emp-modal__title">🚪 Book Room</h2>
          <button className="emp-modal__close" onClick={onClose}>✕</button>
        </div>

        <div className="emp-modal__room-card">
          <div className="emp-modal__room-name">🚪 {room.name}</div>
          <div className="emp-modal__room-meta">
            🏢 {room.branchName} &nbsp;·&nbsp; 👥 Capacity: {room.capacity}
            {facilities.length > 0 && <span> &nbsp;·&nbsp; ✨ {facilities.slice(0,3).map(f => f.name || f).join(", ")}{facilities.length > 3 ? ` +${facilities.length - 3}` : ""}</span>}
          </div>
        </div>

        {alert.msg && (
          <div className={`form-alert form-alert--${alert.type}`}>
            {alert.type === "error" ? "✕" : "✓"} {alert.msg}
          </div>
        )}

        <div className="form-group">
          <label className="form-label">Start Time *</label>
          <input className="form-input form-input--green" type="datetime-local"
            value={start} onChange={(e) => setStart(e.target.value)} />
        </div>

        <div className="form-group">
          <label className="form-label">End Time *</label>
          <input className="form-input form-input--green" type="datetime-local"
            value={end} onChange={(e) => setEnd(e.target.value)} />
          {duration && (
            <p className={`form-duration${durationErr ? " form-duration--error" : ""}`}>
              {durationErr ? "⚠ Minimum is 15 minutes" : `⏱ Duration: ${duration}`}
            </p>
          )}
        </div>

        <div className="form-group">
          <label className="form-label">Purpose *</label>
          <input className="form-input" type="text"
            placeholder="e.g. Sprint Planning, Client Call..."
            value={purpose} onChange={(e) => setPurpose(e.target.value)}
            maxLength={120} />
        </div>

        <div className="emp-modal__footer">
          <button className="btn-close-modal" onClick={onClose} disabled={loading}>Cancel</button>
          <button className="btn-book-submit" onClick={handleSubmit} disabled={loading || durationErr}>
            {loading ? "Submitting..." : "🗓 Submit Booking"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── BOOKING DETAIL MODAL ─────────────────────────────────────────
function DetailModal({ booking, onClose }) {
  const meta = sm(booking.status);
  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="emp-modal">
        <div className="emp-modal__header">
          <h2 className="emp-modal__title">📋 Booking Detail</h2>
          <button className="emp-modal__close" onClick={onClose}>✕</button>
        </div>
        <p style={{ fontFamily:"monospace", fontSize:11, color:"#94A3B8", marginBottom:14 }}>
          #{booking.id} · <span className={`emp-status-pill emp-status-pill--${meta.cls}`}>{meta.icon} {meta.label}</span>
        </p>

        {[
          ["Room",    booking.roomName],
          ["Branch",  booking.branchName],
          ["Date",    fmtDate(booking.startTime)],
          ["Time",    `${fmtTime(booking.startTime)} – ${fmtTime(booking.endTime)}  (${durationLabel(booking.startTime, booking.endTime)})`],
          ["Purpose", booking.purpose || booking.notes || "—"],
          ["Booked",  fmtDate(booking.createdAt)],
        ].map(([label, value]) => (
          <div key={label} className="emp-detail-row">
            <span className="emp-detail-row__label">{label}</span>
            <span className="emp-detail-row__value">{value}</span>
          </div>
        ))}

        {booking.status?.toLowerCase() === "rejected" && booking.overrideReason && (
          <div className="emp-rejection-note">
            <span>💬</span>
            <span><strong>Admin note:</strong> {booking.overrideReason}</span>
          </div>
        )}

        <div className="emp-modal__footer">
          <button className="btn-book-submit" onClick={onClose} style={{ flex:1 }}>Close</button>
        </div>
      </div>
    </div>
  );
}

// ─── MAIN DASHBOARD ──────────────────────────────────────────────
export default function EmployeeDashboard({ onNavigate }) {
  const { user } = useAuth();
  const firstName = user?.fullName?.split(" ")[0] || "there";
  const { greeting, emoji, timeStr, dateStr } = useClock();

  const [rooms,     setRooms]    = useState([]);
  const [bookings,  setBookings] = useState([]);
  const [loadRooms, setLoadRooms]= useState(true);
  const [loadBk,    setLoadBk]   = useState(true);
  const [modal,     setModal]    = useState(null);
  const [activeFilter, setActiveFilter] = useState(null); // "pending"|"approved"|"rejected"|null

  const fetchRooms = useCallback(async () => {
    setLoadRooms(true);
    try {
      const data = await RoomAPI.getEmployeeRooms();
      setRooms(Array.isArray(data) ? data : (data?.items ?? []));
    } catch { setRooms([]); }
    finally { setLoadRooms(false); }
  }, []);

  const fetchBookings = useCallback(async () => {
    setLoadBk(true);
    try {
      const data = await BookingAPI.myBookings();
      setBookings(Array.isArray(data) ? data : (data?.items ?? []));
    } catch { setBookings([]); }
    finally { setLoadBk(false); }
  }, []);

  useEffect(() => { fetchRooms(); fetchBookings(); }, [fetchRooms, fetchBookings]);

  const stats = useMemo(() => ({
    rooms:    rooms.length,
    total:    bookings.length,
    pending:  bookings.filter(b => b.status?.toLowerCase() === "pending").length,
    approved: bookings.filter(b => b.status?.toLowerCase() === "approved").length,
    rejected: bookings.filter(b => b.status?.toLowerCase() === "rejected").length,
  }), [rooms, bookings]);

  const recentBookings = useMemo(() => {
    const sorted = [...bookings].sort((a, b) => new Date(b.startTime || 0) - new Date(a.startTime || 0));
    if (activeFilter) return sorted.filter(b => b.status?.toLowerCase() === activeFilter).slice(0, 8);
    return sorted.slice(0, 8);
  }, [bookings, activeFilter]);

  const upcoming = useMemo(() =>
    bookings
      .filter(b => b.status?.toLowerCase() === "approved" && isUpcoming(b.startTime))
      .sort((a, b) => new Date(a.startTime) - new Date(b.startTime)),
    [bookings]);

  const nextUpcoming = upcoming[0] || null;

  const handleBooked = () => { setModal(null); fetchBookings(); };

  const toggleFilter = (key) => setActiveFilter(prev => prev === key ? null : key);

  const STAT_DEFS = [
    { key:"rooms",    icon:"🚪", label:"Available Rooms", color:"#2563EB", border:"rgba(59,130,246,0.18)",  filterable: false },
    { key:"total",    icon:"📋", label:"Total Bookings",  color:"#7C3AED", border:"rgba(124,58,237,0.18)",  filterable: false },
    { key:"pending",  icon:"⏳", label:"Pending",         color:"#CA8A04", border:"rgba(217,119,6,0.20)",   filterable: true  },
    { key:"approved", icon:"✅", label:"Approved",        color:"#16A34A", border:"rgba(22,163,74,0.20)",   filterable: true  },
    { key:"rejected", icon:"❌", label:"Rejected",        color:"#DC2626", border:"rgba(220,38,38,0.18)",   filterable: true  },
  ];

  return (
    <div className="emp-dash">

      {/* ── Hero ── */}
      <div className="emp-hero">
        <div className="emp-hero__left">
          <p className="emp-hero__greeting">
            {emoji} {greeting} &nbsp;·&nbsp;
            <span className="emp-hero__clock">{timeStr}</span>
          </p>
          <h1 className="emp-hero__name">Welcome back, <span>{firstName}!</span></h1>
          <p className="emp-hero__sub">{dateStr}</p>
          <p className="emp-hero__sub" style={{ marginTop: 2 }}>
            {upcoming.length > 0
              ? `📅 You have ${upcoming.length} upcoming approved booking${upcoming.length > 1 ? "s" : ""}`
              : "Browse available rooms and book your next meeting"}
          </p>
        </div>
        <div className="emp-hero__right">
          <button className="emp-hero__cta emp-hero__cta--primary"
            onClick={() => onNavigate?.("browse-rooms")}>
            🚪 Browse All Rooms
          </button>
          <button className="emp-hero__cta emp-hero__cta--secondary"
            onClick={() => onNavigate?.("my-bookings")}>
            📋 My Bookings
          </button>
        </div>
      </div>

      {/* ── Stat Cards ── */}
      <div className="emp-stats-grid">
        {STAT_DEFS.map((s) => (
          <StatCard
            key={s.key}
            value={(loadRooms && s.key === "rooms") || (loadBk && s.key !== "rooms") ? "—" : stats[s.key]}
            label={s.label}
            icon={s.icon}
            color={s.color}
            border={s.border}
            filterable={s.filterable}
            active={activeFilter === s.key}
            onClick={() => toggleFilter(s.key)}
          />
        ))}
      </div>

      {/* ── Main grid ── */}
      <div className="emp-grid">

        {/* ── LEFT: Recent Bookings Panel ── */}
        <div className="emp-panel">
          <div className="emp-panel__header">
            <span className="emp-panel__title">
              📋 Recent Bookings
              {activeFilter && (
                <span className="emp-filter-active-badge">
                  {STATUS_M[activeFilter]?.icon} {STATUS_M[activeFilter]?.label}
                  <button className="emp-filter-clear" onClick={() => setActiveFilter(null)} title="Clear filter">✕</button>
                </span>
              )}
            </span>
            <button className="emp-panel__link" onClick={() => onNavigate?.("my-bookings")}>
              View all →
            </button>
          </div>

          {loadBk ? (
            <div className="emp-spinner" />
          ) : recentBookings.length === 0 ? (
            <div className="emp-empty">
              <div className="emp-empty__icon">
                {activeFilter ? STATUS_M[activeFilter]?.icon : "📅"}
              </div>
              {activeFilter
                ? `No ${STATUS_M[activeFilter]?.label.toLowerCase()} bookings found`
                : "No bookings yet — book your first room!"
              }
            </div>
          ) : (
            <div className="emp-booking-list">
              {recentBookings.map((b, i) => {
                const meta = sm(b.status);
                return (
                  <div key={b.id} className="emp-booking-row"
                    style={{ animationDelay: `${i * 0.05}s` }}
                    onClick={() => setModal({ type:"detail", data: b })}>
                    <div className={`emp-booking-row__stripe emp-booking-row__stripe--${meta.cls}`} />
                    <div className="emp-booking-row__info">
                      <div className="emp-booking-row__room">
                        {b.roomName || "—"}
                        {isUpcoming(b.startTime) && b.status?.toLowerCase() === "approved" && (
                          <span className="emp-upcoming-badge" style={{ marginLeft:6 }}>UPCOMING</span>
                        )}
                      </div>
                      <div className="emp-booking-row__meta">
                        📅 {fmtDate(b.startTime)} &nbsp;·&nbsp;
                        ⏱ {fmtTime(b.startTime)}–{fmtTime(b.endTime)}
                        {b.branchName && <span> &nbsp;·&nbsp; 🏢 {b.branchName}</span>}
                      </div>
                    </div>
                    <div className="emp-booking-row__right">
                      <span className={`emp-status-pill emp-status-pill--${meta.cls}`}>
                        {meta.icon} {meta.label}
                      </span>
                      <span className="emp-booking-row__date">
                        {fmtDate(b.createdAt)}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* ── RIGHT: Spotlight + Chart stacked ── */}
        <div className="emp-right-col">

          {/* Upcoming Spotlight */}
          {nextUpcoming
            ? <UpcomingSpotlight booking={nextUpcoming} />
            : (
              <div className="emp-spotlight emp-spotlight--empty">
                <div className="emp-spotlight__label">📅 No Upcoming Bookings</div>
                <div className="emp-spotlight__room" style={{ opacity: 0.6, fontSize: 15 }}>
                  Your approved upcoming bookings will appear here
                </div>
              </div>
            )
          }

          {/* Weekly Chart 
          <div className="emp-chart-panel">
            <div className="emp-chart-panel__title">📊 Last 7 Days Activity</div>
            {loadBk
              ? <div className="emp-spinner" style={{ marginTop: 16 }} />
              : <WeeklyChart bookings={bookings} />
            }
          </div>*/}

        </div>

      </div>

      {/* ── Modals ── */}
      {modal?.type === "book" && (
        <BookModal room={modal.data} onClose={() => setModal(null)} onBooked={handleBooked} />
      )}
      {modal?.type === "detail" && (
        <DetailModal booking={modal.data} onClose={() => setModal(null)} />
      )}

    </div>
  );
}