// src/pages/MyBookings.jsx

import { useState, useEffect, useCallback } from "react";
import { BookingAPI } from "../api/bookingAPI";
import Pagination from "../components/Pagination";
import "../styles/MyBookings.css";

const PAGE_SIZE = 8;

// ─── HELPERS ─────────────────────────────────────────────────────
function fmtDate(iso) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-IN", {
    weekday: "short", day: "2-digit", month: "short", year: "numeric",
  });
}
function fmtTime(iso) {
  if (!iso) return "";
  return new Date(iso).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true });
}
function durationLabel(start, end) {
  if (!start || !end) return "";
  const mins = (new Date(end) - new Date(start)) / 60000;
  if (mins <= 0) return "";
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return h > 0 ? `${h}h${m > 0 ? ` ${m}m` : ""}` : `${m}m`;
}
function isPast(iso) {
  return iso && new Date(iso) < new Date();
}

const STATUS_META = {
  pending:   { label: "Pending",   icon: "⏳", cls: "pending"   },
  approved:  { label: "Approved",  icon: "✅", cls: "approved"  },
  rejected:  { label: "Rejected",  icon: "❌", cls: "rejected"  },
  cancelled: { label: "Cancelled", icon: "🚫", cls: "cancelled" },
};
function sm(raw = "") {
  return STATUS_META[raw.toLowerCase()] || STATUS_META.pending;
}

const PRIORITY_META = {
  high:   { label: "High",   icon: "🔴", cls: "high"   },
  medium: { label: "Medium", icon: "🟡", cls: "medium" },
  low:    { label: "Low",    icon: "🟢", cls: "low"    },
};
function pm(raw = "") {
  return PRIORITY_META[raw.toLowerCase()] || PRIORITY_META.low;
}

// ─── STAT CARD ────────────────────────────────────────────────────
function StatCard({ value, label, icon, color, border, onClick, active }) {
  return (
    <div className="mybk-stat-card"
      style={{
        borderColor: active ? color : border,
        background:  active ? `${color}0f` : "#ffffff",
        cursor:      onClick ? "pointer" : "default",
        outline:     active ? `2px solid ${color}40` : "2px solid transparent",
        userSelect:  "none",
      }}
      onClick={onClick}>

      <div className="mybk-stat-card__glow" style={{ background: color }} />

      <div className="mybk-stat-card__icon" style={{ background: `${color}1a`, color }}>
        {icon}
      </div>

      <div className="mybk-stat-card__info">
        <div className="mybk-stat-card__value" style={{ color }}>{value}</div>
        <div className="mybk-stat-card__label">{label}</div>
      </div>

      {onClick && (
        <div className="mybk-stat-card__hint" style={{ color: active ? color : "#CBD5E1" }}>
          {active ? "✓ active" : "click to filter"}
        </div>
      )}
    </div>
  );
}

// ─── DETAIL MODAL ─────────────────────────────────────────────────
function DetailModal({ booking, onClose, onCancel }) {
  const meta    = sm(booking.status);
  const priMeta = pm(booking.priority);
  const canCancel = ["pending", "approved"].includes(booking.status?.toLowerCase())
    && !isPast(booking.startTime);

  function Row({ label, value }) {
    return (
      <div className="mybk-detail-row">
        <span className="mybk-detail-row__label">{label}</span>
        <span className="mybk-detail-row__value">{value || "—"}</span>
      </div>
    );
  }

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal__header">
          <h2 className="modal__title">📋 Booking Detail</h2>
          <button className="modal__close" onClick={onClose}>✕</button>
        </div>
        <p className="modal__subtitle">
          #{booking.id} ·{" "}
          <span className={`mybk-status mybk-status--${meta.cls}`}>{meta.icon} {meta.label}</span>
          {" "}·{" "}
          <span className={`priority-badge priority-badge--${priMeta.cls}`}>
            {priMeta.icon} {priMeta.label}
          </span>
        </p>

        <Row label="Room"      value={booking.roomName} />
        <Row label="Branch"    value={booking.branchName} />
        <Row label="Date"      value={fmtDate(booking.startTime)} />
        <Row label="Time"      value={`${fmtTime(booking.startTime)} – ${fmtTime(booking.endTime)}  (${durationLabel(booking.startTime, booking.endTime)})`} />
        <Row label="Priority"  value={`${priMeta.icon} ${priMeta.label}`} />
        {booking.notes && <Row label="Your Notes" value={booking.notes} />}
        <Row label="Booked On" value={fmtDate(booking.createdAt)} />

        {(booking.status?.toLowerCase() === "rejected" || booking.status?.toLowerCase() === "cancelled")
          && booking.overrideReason && (
          <div className="mybk-rejection" style={{ maxWidth: "100%", marginTop: 10 }}>
            <span>💬</span>
            <span><strong>Admin note:</strong> {booking.overrideReason}</span>
          </div>
        )}

        {booking.actionAt && <Row label="Action At" value={fmtDate(booking.actionAt)} />}

        <div className="modal__footer">
          <button className="btn-cancel-modal" onClick={onClose}>Close</button>
          {canCancel && (
            <button className="btn-cancel-booking" onClick={() => { onClose(); onCancel(booking); }}>
              🚫 Cancel Booking
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── CANCEL CONFIRM MODAL ─────────────────────────────────────────
function CancelModal({ booking, onClose, onDone }) {
  const [loading, setLoading] = useState(false);
  const [alert,   setAlert]   = useState({ msg: "", type: "" });

  const handle = async () => {
    setLoading(true); setAlert({ msg: "", type: "" });
    try {
      await BookingAPI.cancel(booking.id);
      setAlert({ msg: "Booking cancelled successfully.", type: "success" });
      setTimeout(onDone, 900);
    } catch (e) {
      setAlert({ msg: e.message || "Cancel failed.", type: "error" });
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal__header">
          <h2 className="modal__title" style={{ color: "#DC2626" }}>🚫 Cancel Booking</h2>
          <button className="modal__close" onClick={onClose}>✕</button>
        </div>
        <p className="modal__subtitle">This cannot be undone.</p>

        {alert.msg && (
          <div className={`form-alert form-alert--${alert.type}`}>
            {alert.type === "error" ? "✕" : "✓"} {alert.msg}
          </div>
        )}

        <div style={{
          padding: "14px 16px", borderRadius: 12, marginBottom: 16,
          background: "rgba(254,242,242,0.7)", border: "1px solid rgba(239,68,68,0.18)",
        }}>
          <div style={{ fontFamily: "Georgia,serif", fontSize: 15, fontWeight: "bold", color: "#DC2626", marginBottom: 4 }}>
            🚪 {booking.roomName || "—"}
          </div>
          <div style={{ fontFamily: "monospace", fontSize: 11, color: "#94A3B8" }}>
            🏢 {booking.branchName || "—"} &nbsp;·&nbsp;
            📅 {fmtDate(booking.startTime)} &nbsp;·&nbsp;
            ⏱ {fmtTime(booking.startTime)} – {fmtTime(booking.endTime)}
          </div>
          {booking.notes && (
            <div style={{ fontFamily: "Georgia,serif", fontSize: 12, color: "#64748B", fontStyle: "italic", marginTop: 6 }}>
              "{booking.notes}"
            </div>
          )}
        </div>

        <p style={{ fontSize: 12, color: "#94A3B8", fontFamily: "monospace", marginBottom: 4 }}>
          Are you sure you want to cancel this booking?
        </p>

        <div className="modal__footer">
          <button className="btn-cancel-modal"  onClick={onClose} disabled={loading}>Keep It</button>
          <button className="btn-cancel-booking" onClick={handle} disabled={loading}>
            {loading ? "Cancelling..." : "🚫 Yes, Cancel"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── BOOKING CARD ─────────────────────────────────────────────────
function BookingCard({ booking, onDetail, onCancel }) {
  const meta      = sm(booking.status);
  const priMeta   = pm(booking.priority);
  const past      = isPast(booking.startTime);
  const canCancel = ["pending", "approved"].includes(booking.status?.toLowerCase()) && !past;

  return (
    <div className="mybk-card">
      <div className={`mybk-card__stripe mybk-card__stripe--${meta.cls}`} />
      <div className="mybk-card__body">

        {/* COL 1 — room info */}
        <div className="mybk-card__main">
          <div className="mybk-card__room">
            <span>🚪</span> {booking.roomName || "—"}
          </div>
          <div className="mybk-card__branch">
            <span>🏢</span> {booking.branchName || "—"}
          </div>
          {booking.notes && (
            <div className="mybk-card__purpose">"{booking.notes}"</div>
          )}
          <div style={{ marginTop: 4 }}>
            <span className={`priority-badge priority-badge--${priMeta.cls}`}>
              {priMeta.icon} {priMeta.label} Priority
            </span>
          </div>
        </div>

        {/* COL 2 — date / time */}
        <div className="mybk-card__when">
          <div className="mybk-card__date">{fmtDate(booking.startTime)}</div>
          <div className="mybk-card__time">
            {fmtTime(booking.startTime)} – {fmtTime(booking.endTime)}
            {durationLabel(booking.startTime, booking.endTime) && (
              <span style={{ marginLeft: 5, color: "#CBD5E1" }}>
                ({durationLabel(booking.startTime, booking.endTime)})
              </span>
            )}
          </div>
          {past && booking.status?.toLowerCase() === "approved" && (
            <div style={{ fontSize: 10, color: "#94A3B8", fontFamily: "monospace", marginTop: 2 }}>
              Completed
            </div>
          )}
          {(booking.status?.toLowerCase() === "rejected" || booking.status?.toLowerCase() === "cancelled")
            && booking.overrideReason && (
            <div className="mybk-rejection">
              <span>💬</span>
              <span>
                <strong>
                  {booking.status?.toLowerCase() === "rejected" ? "Rejected: " : "Cancelled: "}
                </strong>
                {booking.overrideReason}
              </span>
            </div>
          )}
        </div>

        {/* COL 3 — status + actions */}
        <div className="mybk-card__right">
          <span className={`mybk-status mybk-status--${meta.cls}`}>
            {meta.icon} {meta.label}
          </span>
          <div className="mybk-actions">
            <button className="mybk-btn mybk-btn--detail" onClick={() => onDetail(booking)}>
              👁 Details
            </button>
            {canCancel && (
              <button className="mybk-btn mybk-btn--cancel" onClick={() => onCancel(booking)}>
                🚫 Cancel
              </button>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}

// ─── MAIN PAGE ────────────────────────────────────────────────────
export default function MyBookings({ onNavigate }) {
  const [bookings,     setBookings]     = useState([]);
  const [filtered,     setFiltered]     = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [refreshing,   setRefreshing]   = useState(false);
  const [error,        setError]        = useState("");
  const [search,       setSearch]       = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [timeFilter,   setTimeFilter]   = useState("all");
  const [sortBy,       setSortBy]       = useState("newest");
  const [page,         setPage]         = useState(1);
  const [modal,        setModal]        = useState(null);

  const fetchBookings = useCallback(async (silent = false) => {
    if (silent) setRefreshing(true); else setLoading(true);
    setError("");
    try {
      const data = await BookingAPI.myBookings();
      setBookings(Array.isArray(data) ? data : (data?.items ?? []));
    } catch (e) {
      setError(e.message || "Failed to load your bookings.");
    } finally {
      setLoading(false); setRefreshing(false);
    }
  }, []);

  useEffect(() => { fetchBookings(); }, [fetchBookings]);

  useEffect(() => {
    let list = [...bookings];

    if (statusFilter !== "all")
      list = list.filter((b) => b.status?.toLowerCase() === statusFilter);

    if (timeFilter === "upcoming")
      list = list.filter((b) => b.startTime && new Date(b.startTime) >= new Date());
    else if (timeFilter === "past")
      list = list.filter((b) => b.startTime && new Date(b.startTime) < new Date());

    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((b) =>
        b.roomName?.toLowerCase().includes(q)   ||
        b.branchName?.toLowerCase().includes(q) ||
        b.notes?.toLowerCase().includes(q));
    }

    list.sort((a, b) => {
      if (sortBy === "newest") return new Date(b.startTime || 0) - new Date(a.startTime || 0);
      if (sortBy === "oldest") return new Date(a.startTime || 0) - new Date(b.startTime || 0);
      if (sortBy === "room")   return (a.roomName || "").localeCompare(b.roomName || "");
      if (sortBy === "status") return (a.status   || "").localeCompare(b.status   || "");
      return 0;
    });

    setFiltered(list);
    setPage(1);
  }, [search, statusFilter, timeFilter, sortBy, bookings]);

  const counts = {
    all:       bookings.length,
    pending:   bookings.filter((b) => b.status?.toLowerCase() === "pending").length,
    approved:  bookings.filter((b) => b.status?.toLowerCase() === "approved").length,
    rejected:  bookings.filter((b) => b.status?.toLowerCase() === "rejected").length,
    cancelled: bookings.filter((b) => b.status?.toLowerCase() === "cancelled").length,
  };

  const paginated    = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const hasFilters   = search || statusFilter !== "all" || timeFilter !== "all";
  const clearFilters = () => { setSearch(""); setStatusFilter("all"); setTimeFilter("all"); setSortBy("newest"); };

  const handleStatusStatClick = (key) =>
    setStatusFilter((prev) => prev === key ? "all" : key);

  const openDetail = (b) => setModal({ type: "detail", booking: b });
  const openCancel = (b) => setModal({ type: "cancel", booking: b });
  const closeModal = ()  => setModal(null);
  const handleDone = ()  => { closeModal(); fetchBookings(true); };

  const STAT_DEFS = [
    { key: "all",       label: "Total",     icon: "📋", color: "#2563EB", border: "rgba(59,130,246,0.18)"  },
    { key: "pending",   label: "Pending",   icon: "⏳", color: "#CA8A04", border: "rgba(217,119,6,0.20)"   },
    { key: "approved",  label: "Approved",  icon: "✅", color: "#065F46", border: "rgba(22,163,74,0.20)"   },
    { key: "rejected",  label: "Rejected",  icon: "❌", color: "#DC2626", border: "rgba(220,38,38,0.18)"   },
    { key: "cancelled", label: "Cancelled", icon: "🚫", color: "#64748B", border: "rgba(148,163,184,0.18)" },
  ];

  return (
    <div className="mybk-page">

      {/* ── Header ── */}
      <div className="mybk-header">
        <div>
          <h2 className="mybk-header__title">📅 My Bookings</h2>
          <p className="mybk-header__sub">Track and manage your room booking requests</p>
        </div>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          {onNavigate && (
            <button
              style={{
                display: "flex", alignItems: "center", gap: 6,
                padding: "9px 18px", borderRadius: 14, border: "none",
                background: "linear-gradient(135deg,#22C55E,#16A34A)",
                color: "#fff", fontSize: 12, fontFamily: "Georgia,serif",
                fontWeight: "bold", letterSpacing: "0.8px", cursor: "pointer",
                boxShadow: "0 4px 14px rgba(22,163,74,0.22)",
              }}
              onClick={() => onNavigate("browse-rooms")}
            >
              🚪 Browse Rooms
            </button>
          )}
          <button
            className={`mybk-refresh${refreshing ? " spinning" : ""}`}
            onClick={() => fetchBookings(true)}
            disabled={refreshing}
          >
            <span>🔄</span> {refreshing ? "Refreshing..." : "Refresh"}
          </button>
        </div>
      </div>

      {/* ── Stat Cards ── */}
      <div className="mybk-stats-grid">
        {STAT_DEFS.map((s) => (
          <StatCard
            key={s.key}
            value={loading ? "—" : counts[s.key]}
            label={s.label}
            icon={s.icon}
            color={s.color}
            border={s.border}
            onClick={() => handleStatusStatClick(s.key)}
            active={statusFilter === s.key}
          />
        ))}
      </div>

      {/* ── Toolbar ── */}
      <div className="mybk-toolbar">
        <div className="mybk-search">
          <span className="mybk-search__icon">🔍</span>
          <input
            className="mybk-search__input"
            placeholder="Search by room, branch, notes..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          {search && (
            <button className="mybk-search__clear" onClick={() => setSearch("")}>✕</button>
          )}
        </div>

        <select className="mybk-filter-select" value={timeFilter}
          onChange={(e) => setTimeFilter(e.target.value)}>
          <option value="all">All Time</option>
          <option value="upcoming">📅 Upcoming</option>
          <option value="past">🕐 Past</option>
        </select>

        <select className="mybk-filter-select" value={sortBy}
          onChange={(e) => setSortBy(e.target.value)}>
          <option value="newest">Sort: Newest First</option>
          <option value="oldest">Sort: Oldest First</option>
          <option value="room">Sort: Room A–Z</option>
          <option value="status">Sort: Status A–Z</option>
        </select>

        {hasFilters && (
          <button className="mybk-clear-btn" onClick={clearFilters}>✕ Clear</button>
        )}
        <span className="mybk-count-badge">
          {filtered.length} {filtered.length === 1 ? "booking" : "bookings"}
        </span>
      </div>

      {error && <div className="form-alert form-alert--error">⚠ {error}</div>}

      {/* ── List ── */}
      {loading ? (
        <div className="mybk-loading"><div className="mybk-spinner" /><p>Loading your bookings...</p></div>
      ) : filtered.length === 0 ? (
        <div className="mybk-empty">
          <div className="mybk-empty__icon">{hasFilters ? "🔍" : "📅"}</div>
          <div className="mybk-empty__title">
            {hasFilters ? "No bookings match your filters" : "No bookings yet"}
          </div>
          <div className="mybk-empty__sub">
            {hasFilters ? "Try clearing your filters" : "Browse available rooms and make your first booking"}
          </div>
          {!hasFilters && onNavigate && (
            <button className="mybk-empty__action" onClick={() => onNavigate("browse-rooms")}>
              🚪 Browse Rooms
            </button>
          )}
        </div>
      ) : (
        <>
          <div className="mybk-list">
            {paginated.map((b) => (
              <BookingCard key={b.id} booking={b} onDetail={openDetail} onCancel={openCancel} />
            ))}
          </div>
          <Pagination current={page} total={filtered.length} pageSize={PAGE_SIZE} onChange={setPage} />
        </>
      )}

      {modal?.type === "detail" && (
        <DetailModal booking={modal.booking} onClose={closeModal} onCancel={openCancel} />
      )}
      {modal?.type === "cancel" && (
        <CancelModal booking={modal.booking} onClose={closeModal} onDone={handleDone} />
      )}

    </div>
  );
}