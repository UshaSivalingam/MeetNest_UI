// src/pages/AdminBookings.jsx

import { useState, useEffect, useCallback } from "react";
import { AdminAPI } from "../api/adminAPI";
import Pagination from "../components/Pagination";
import "../styles/AdminBookings.css";

// ─── HELPERS ─────────────────────────────────────────────────────
function fmtDate(iso) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}
function fmtTime(iso) {
  if (!iso) return "";
  return new Date(iso).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true });
}
function initials(name = "") {
  return name.split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2) || "?";
}

const STATUS_META = {
  pending:   { label: "Pending",   icon: "⏳", cls: "pending"   },
  approved:  { label: "Approved",  icon: "✅", cls: "approved"  },
  rejected:  { label: "Rejected",  icon: "❌", cls: "rejected"  },
  cancelled: { label: "Cancelled", icon: "🚫", cls: "cancelled" },
};
function statusMeta(raw = "") {
  return STATUS_META[raw.toLowerCase()] || STATUS_META.pending;
}

const PRIORITY_META = {
  high:   { label: "High",   icon: "🟠", cls: "high"   },
  medium: { label: "Medium", icon: "🟡", cls: "medium" },
  low:    { label: "Low",    icon: "🟢", cls: "low"    },
};
function priorityMeta(raw = "") {
  return PRIORITY_META[raw.toLowerCase()] || PRIORITY_META.low;
}

// ─── BOOKING ICON (SVG — mirrors RoomIcon pattern) ────────────────
function BookingIcon({ size = 22, color = "#2563EB" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="3" y="4" width="18" height="17" rx="2" fill={color} fillOpacity="0.12" stroke={color} strokeWidth="1.6"/>
      <path d="M3 9h18" stroke={color} strokeWidth="1.6" strokeLinecap="round"/>
      <path d="M8 2v3M16 2v3" stroke={color} strokeWidth="1.6" strokeLinecap="round"/>
      <circle cx="8"  cy="14" r="1.2" fill={color}/>
      <circle cx="12" cy="14" r="1.2" fill={color}/>
      <circle cx="16" cy="14" r="1.2" fill={color}/>
    </svg>
  );
}

// ─── STAT CARD — exact same component shape as RoomManagement ─────
function StatCard({ value, label, icon, color, border, onClick, active }) {
  return (
    <div className="bookings-stat-card"
      style={{
        borderColor: active ? color : border,
        background:  active ? `${color}0f` : "#ffffff",
        cursor:      onClick ? "pointer" : "default",
        outline:     active ? `2px solid ${color}40` : "2px solid transparent",
        userSelect:  "none",
      }}
      onClick={onClick}>

      <div className="bookings-stat-card__glow" style={{ background: color }} />

      <div className="bookings-stat-card__icon" style={{ background: `${color}1a`, color }}>
        {icon}
      </div>

      <div className="bookings-stat-card__info">
        <div className="bookings-stat-card__value" style={{ color }}>{value}</div>
        <div className="bookings-stat-card__label">{label}</div>
      </div>

      {onClick && (
        <div className="bookings-stat-card__hint" style={{ color: active ? color : "#CBD5E1" }}>
          {active ? "✓ active" : "click to filter"}
        </div>
      )}
    </div>
  );
}

// ─── DETAIL MODAL ─────────────────────────────────────────────────
function DetailModal({ bookingId, onClose, onApprove, onReject }) {
  const [booking, setBooking] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    AdminAPI.getBookingById(bookingId)
      .then(setBooking)
      .catch(() => setBooking(null))
      .finally(() => setLoading(false));
  }, [bookingId]);

  if (loading) return (
    <div className="modal-overlay">
      <div className="modal">
        <div className="bookings-loading"><div className="bookings-spinner" /><p>Loading...</p></div>
      </div>
    </div>
  );

  if (!booking) return null;

  const sm = statusMeta(booking.status);
  const pm = priorityMeta(booking.priority);

  function Row({ label, value }) {
    return (
      <div className="booking-detail-row">
        <span className="booking-detail-row__label">{label}</span>
        <span className="booking-detail-row__value">{value || "—"}</span>
      </div>
    );
  }

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal__header">
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div className="modal__booking-icon-wrap"><BookingIcon size={20} color="#2563EB" /></div>
            <h2 className="modal__title">Booking Detail</h2>
          </div>
          <button className="modal__close" onClick={onClose}>✕</button>
        </div>
        <p className="modal__subtitle">
          Booking #{booking.id} ·{" "}
          <span className={`b-status b-status--${sm.cls}`}>{sm.icon} {sm.label}</span>
          {" "}·{" "}
          <span className={`priority-badge priority-badge--${pm.cls}`}>{pm.icon} {pm.label}</span>
        </p>

        <Row label="Employee" value={booking.employeeName} />
        <Row label="Email"    value={booking.employeeEmail} />
        <Row label="Room"     value={booking.roomName} />
        <Row label="Branch"   value={booking.branchName} />
        <Row label="Date"     value={fmtDate(booking.startTime)} />
        <Row label="Time"     value={`${fmtTime(booking.startTime)} – ${fmtTime(booking.endTime)}`} />
        {booking.notes && <Row label="Notes" value={booking.notes} />}

        {booking.overrideReason && (
          <div className="conflict-warning" style={{ background: "rgba(254,242,242,0.8)", borderColor: "rgba(239,68,68,0.25)" }}>
            <strong>💬 Admin Note:</strong> {booking.overrideReason}
          </div>
        )}

        <Row label="Requested" value={fmtDate(booking.createdAt)} />

        {booking.status?.toLowerCase() === "pending" && booking.conflictingBookings?.length > 0 && (
          <div className="conflict-warning">
            <strong>⚠️ {booking.conflictingBookings.length} conflicting pending booking{booking.conflictingBookings.length > 1 ? "s" : ""}:</strong>
            <p style={{ fontSize: 11, color: "#94A3B8", margin: "4px 0 8px", fontFamily: "monospace" }}>
              Approving this will auto-reject the bookings below.
            </p>
            {booking.conflictingBookings.map((c) => {
              const cp = priorityMeta(c.priority);
              return (
                <div key={c.id} className="conflict-item">
                  <span className={`priority-badge priority-badge--${cp.cls}`}>{cp.icon} {cp.label}</span>
                  <span style={{ marginLeft: 8, fontFamily: "monospace", fontSize: 12 }}>#{c.id} · {c.employeeName}</span>
                  {c.notes && <span style={{ marginLeft: 8, color: "#94A3B8", fontSize: 11, fontStyle: "italic" }}>"{c.notes}"</span>}
                  <span style={{ marginLeft: 8, fontSize: 11, color: "#CBD5E1" }}>Requested {fmtDate(c.createdAt)}</span>
                </div>
              );
            })}
          </div>
        )}

        {booking.status?.toLowerCase() === "pending" ? (
          <div className="modal__footer">
            <button className="btn-cancel" onClick={onClose}>Close</button>
            <button className="btn-reject-confirm"  onClick={() => { onClose(); onReject(booking);  }}>❌ Reject</button>
            <button className="btn-approve-confirm" onClick={() => { onClose(); onApprove(booking); }}>✅ Approve</button>
          </div>
        ) : (
          <div className="modal__footer">
            <button className="btn-cancel" style={{ flex: 1 }} onClick={onClose}>Close</button>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── APPROVE MODAL ────────────────────────────────────────────────
function ApproveModal({ booking, onClose, onDone }) {
  const [loading, setLoading] = useState(false);
  const [alert,   setAlert]   = useState({ msg: "", type: "" });

  const handle = async () => {
    setLoading(true); setAlert({ msg: "", type: "" });
    try {
      await AdminAPI.approveBooking(booking.id, { reason: "", force: false });
      setAlert({ msg: "Booking approved! Conflicting requests auto-rejected.", type: "success" });
      setTimeout(onDone, 1000);
    } catch (e) {
      setAlert({ msg: e.message || "Approval failed.", type: "error" });
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal__header">
          <h2 className="modal__title" style={{ color: "#16A34A" }}>✅ Approve Booking</h2>
          <button className="modal__close" onClick={onClose}>✕</button>
        </div>
        <p className="modal__subtitle">Confirm booking approval</p>
        {alert.msg && <div className={`form-alert form-alert--${alert.type}`}>{alert.type === "error" ? "✕" : "✓"} {alert.msg}</div>}
        <div className="booking-detail-row"><span className="booking-detail-row__label">Employee</span><span className="booking-detail-row__value">{booking.employeeName || "—"}</span></div>
        <div className="booking-detail-row"><span className="booking-detail-row__label">Room</span><span className="booking-detail-row__value">{booking.roomName || "—"}</span></div>
        <div className="booking-detail-row"><span className="booking-detail-row__label">Date</span><span className="booking-detail-row__value">{fmtDate(booking.startTime)} · {fmtTime(booking.startTime)} – {fmtTime(booking.endTime)}</span></div>
        <div className="booking-detail-row"><span className="booking-detail-row__label">Priority</span><span className="booking-detail-row__value">{(() => { const pm = priorityMeta(booking.priority); return `${pm.icon} ${pm.label}`; })()}</span></div>
        {booking.notes && <div className="booking-detail-row"><span className="booking-detail-row__label">Notes</span><span className="booking-detail-row__value">{booking.notes}</span></div>}
        <p style={{ fontSize: 12, color: "#64748B", fontFamily: "monospace", margin: "12px 0 4px" }}>Any other pending bookings for this slot will be auto-rejected.</p>
        <div className="modal__footer">
          <button className="btn-cancel"          onClick={onClose} disabled={loading}>Cancel</button>
          <button className="btn-approve-confirm" onClick={handle}  disabled={loading}>{loading ? "Approving..." : "✅ Yes, Approve"}</button>
        </div>
      </div>
    </div>
  );
}

// ─── REJECT MODAL ─────────────────────────────────────────────────
function RejectModal({ booking, onClose, onDone }) {
  const [reason,  setReason]  = useState("");
  const [loading, setLoading] = useState(false);
  const [alert,   setAlert]   = useState({ msg: "", type: "" });
  const MAX = 300;

  const handle = async () => {
    setAlert({ msg: "", type: "" });
    if (!reason.trim()) return setAlert({ msg: "Please provide a rejection reason.", type: "error" });
    setLoading(true);
    try {
      await AdminAPI.rejectBooking(booking.id, { reason: reason.trim() });
      setAlert({ msg: "Booking rejected.", type: "success" });
      setTimeout(onDone, 900);
    } catch (e) {
      setAlert({ msg: e.message || "Rejection failed.", type: "error" });
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal__header">
          <h2 className="modal__title" style={{ color: "#DC2626" }}>❌ Reject Booking</h2>
          <button className="modal__close" onClick={onClose}>✕</button>
        </div>
        <p className="modal__subtitle">Provide a reason for rejection (shown to employee)</p>
        {alert.msg && <div className={`form-alert form-alert--${alert.type}`}>{alert.type === "error" ? "✕" : "✓"} {alert.msg}</div>}
        <div className="booking-detail-row"><span className="booking-detail-row__label">Employee</span><span className="booking-detail-row__value">{booking.employeeName || "—"}</span></div>
        <div className="booking-detail-row"><span className="booking-detail-row__label">Priority</span><span className="booking-detail-row__value">{(() => { const pm = priorityMeta(booking.priority); return `${pm.icon} ${pm.label}`; })()}</span></div>
        <div className="booking-detail-row" style={{ marginBottom: 16 }}><span className="booking-detail-row__label">Room · Date</span><span className="booking-detail-row__value">{booking.roomName || "—"} · {fmtDate(booking.startTime)}</span></div>
        {booking.notes && <div className="booking-detail-row" style={{ marginBottom: 16 }}><span className="booking-detail-row__label">Employee Notes</span><span className="booking-detail-row__value" style={{ fontStyle: "italic" }}>"{booking.notes}"</span></div>}
        <label className="form-label" htmlFor="reject-reason">Rejection Reason *</label>
        <textarea id="reject-reason" className="reject-reason" placeholder="e.g. Room is under maintenance, please rebook for another slot." value={reason} maxLength={MAX} onChange={(e) => setReason(e.target.value)} />
        <div className="reject-char-count">{reason.length} / {MAX}</div>
        <div className="modal__footer">
          <button className="btn-cancel"         onClick={onClose} disabled={loading}>Cancel</button>
          <button className="btn-reject-confirm" onClick={handle}  disabled={loading}>{loading ? "Rejecting..." : "❌ Confirm Reject"}</button>
        </div>
      </div>
    </div>
  );
}

// ─── BOOKING ROW ──────────────────────────────────────────────────
function BookingRow({ booking, onView, onApprove, onReject, actionLoading }) {
  const sm        = statusMeta(booking.status);
  const pm        = priorityMeta(booking.priority);
  const isPending = booking.status?.toLowerCase() === "pending";
  const busy      = actionLoading === booking.id;

  return (
    <tr>
      <td>
        <div className="bt-employee">
          <div className="bt-employee__avatar">{initials(booking.employeeName || "?")}</div>
          <div>
            <div className="bt-employee__name">{booking.employeeName || "—"}</div>
            <div className="bt-employee__email">{booking.employeeEmail || ""}</div>
          </div>
        </div>
      </td>
      <td>
        <div className="bt-room">{booking.roomName || "—"}</div>
        <div className="bt-branch">{booking.branchName || ""}</div>
      </td>
      <td>
        <div className="bt-date">{fmtDate(booking.startTime)}</div>
        <div className="bt-time">{fmtTime(booking.startTime)} – {fmtTime(booking.endTime)}</div>
      </td>
      <td>
        <span className={`priority-badge priority-badge--${pm.cls}`}>{pm.icon} {pm.label}</span>
      </td>
      <td style={{ maxWidth: 140 }}>
        <span style={{ fontSize: 12, color: "#64748B", fontFamily: "monospace" }}>
          {booking.notes || <span style={{ color: "#CBD5E1" }}>—</span>}
        </span>
      </td>
      <td>
        <span className={`b-status b-status--${sm.cls}`}>{sm.icon} {sm.label}</span>
      </td>
      <td>
        <div className="bt-actions">
          <button className="bt-btn bt-btn--view" onClick={() => onView(booking.id)}>👁 View</button>
          {isPending && (
            <>
              <button className="bt-btn bt-btn--approve" onClick={() => onApprove(booking)} disabled={busy}>{busy ? "..." : "✅"}</button>
              <button className="bt-btn bt-btn--reject"  onClick={() => onReject(booking)}  disabled={busy}>{busy ? "..." : "❌"}</button>
            </>
          )}
        </div>
      </td>
    </tr>
  );
}

// ─── MAIN PAGE ────────────────────────────────────────────────────
const PAGE_SIZE = 10;

export default function AdminBookings() {
  const [bookings,       setBookings]       = useState([]);
  const [filtered,       setFiltered]       = useState([]);
  const [loading,        setLoading]        = useState(true);
  const [refreshing,     setRefreshing]     = useState(false);
  const [error,          setError]          = useState("");
  const [search,         setSearch]         = useState("");
  const [statusFilter,   setStatusFilter]   = useState("all");
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [dateFrom,       setDateFrom]       = useState("");
  const [sortBy,         setSortBy]         = useState("pending-first");
  const [page,           setPage]           = useState(1);
  const [actionLoading,  setActionLoading]  = useState(null);
  const [modal,          setModal]          = useState(null);

  const fetchBookings = useCallback(async (silent = false) => {
    if (silent) setRefreshing(true); else setLoading(true);
    setError("");
    try {
      const data = await AdminAPI.getBookings();
      setBookings(Array.isArray(data) ? data : (data?.items ?? []));
    } catch (e) {
      setError(e.message || "Failed to load bookings.");
    } finally {
      setLoading(false); setRefreshing(false);
    }
  }, []);

  useEffect(() => { fetchBookings(); }, [fetchBookings]);

  useEffect(() => {
    let list = [...bookings];
    if (statusFilter !== "all")   list = list.filter((b) => b.status?.toLowerCase()   === statusFilter);
    if (priorityFilter !== "all") list = list.filter((b) => b.priority?.toLowerCase() === priorityFilter);
    if (dateFrom) list = list.filter((b) => b.startTime && new Date(b.startTime) >= new Date(dateFrom));
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((b) =>
        b.employeeName?.toLowerCase().includes(q)  ||
        b.employeeEmail?.toLowerCase().includes(q) ||
        b.roomName?.toLowerCase().includes(q)      ||
        b.branchName?.toLowerCase().includes(q)    ||
        b.notes?.toLowerCase().includes(q));
    }
    list.sort((a, b) => {
      if (sortBy === "pending-first") {
        const pa = a.status?.toLowerCase() === "pending" ? 0 : 1;
        const pb = b.status?.toLowerCase() === "pending" ? 0 : 1;
        if (pa !== pb) return pa - pb;
        const po = { high: 0, medium: 1, low: 2 };
        const ppa = po[a.priority?.toLowerCase()] ?? 2;
        const ppb = po[b.priority?.toLowerCase()] ?? 2;
        if (ppa !== ppb) return ppa - ppb;
        return new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
      }
      if (sortBy === "priority-high") return (["high","medium","low"].indexOf(a.priority?.toLowerCase() || "low")) - (["high","medium","low"].indexOf(b.priority?.toLowerCase() || "low"));
      if (sortBy === "newest") return new Date(b.startTime || 0) - new Date(a.startTime || 0);
      if (sortBy === "oldest") return new Date(a.startTime || 0) - new Date(b.startTime || 0);
      if (sortBy === "name")   return (a.employeeName || "").localeCompare(b.employeeName || "");
      return 0;
    });
    setFiltered(list);
    setPage(1);
  }, [search, statusFilter, priorityFilter, dateFrom, sortBy, bookings]);

  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const counts = {
    all:       bookings.length,
    pending:   bookings.filter((b) => b.status?.toLowerCase() === "pending").length,
    approved:  bookings.filter((b) => b.status?.toLowerCase() === "approved").length,
    rejected:  bookings.filter((b) => b.status?.toLowerCase() === "rejected").length,
    cancelled: bookings.filter((b) => b.status?.toLowerCase() === "cancelled").length,
  };

  const handleApprove = (booking) => setModal({ type: "approve", booking });
  const handleReject  = (booking) => setModal({ type: "reject",  booking });
  const handleView    = (id)      => setModal({ type: "view",    bookingId: id });
  const closeModal    = ()        => setModal(null);
  const handleDone    = ()        => { closeModal(); fetchBookings(true); };

  const hasFilters = search || statusFilter !== "all" || priorityFilter !== "all" || dateFrom;
  const clearAll   = () => { setSearch(""); setStatusFilter("all"); setPriorityFilter("all"); setDateFrom(""); setSortBy("pending-first"); };

  const handleStatusStatClick = (key) =>
    setStatusFilter((prev) => prev === key ? "all" : key);

  return (
    <div className="bookings-page">

      {/* ── Header ── */}
      <div className="bookings-page__header">
        <div>
          <h2 className="bookings-page__title">
            <span className="bookings-page__title-icon"><BookingIcon size={26} color="#2563EB" /></span>
            Bookings
          </h2>
          <p className="bookings-page__sub">Review, approve and reject booking requests</p>
        </div>
        <button className={`btn-refresh${refreshing ? " spinning" : ""}`} onClick={() => fetchBookings(true)} disabled={refreshing}>
          <span>🔄</span> {refreshing ? "Refreshing..." : "Refresh"}
        </button>
      </div>

      {/* ── Stat Cards ── */}
      <div className="bookings-stats-grid">
        <StatCard
          value={loading ? "—" : counts.all} label="All Bookings"
          icon={<BookingIcon size={20} color="#2563EB" />}
          color="#2563EB" border="rgba(59,130,246,0.18)"
          onClick={() => handleStatusStatClick("all")}
          active={statusFilter === "all"}
        />
        <StatCard
          value={loading ? "—" : counts.pending} label="Pending" icon="⏳"
          color="#CA8A04" border="rgba(217,119,6,0.20)"
          onClick={() => handleStatusStatClick("pending")}
          active={statusFilter === "pending"}
        />
        <StatCard
          value={loading ? "—" : counts.approved} label="Approved" icon="✅"
          color="#065F46" border="rgba(22,163,74,0.20)"
          onClick={() => handleStatusStatClick("approved")}
          active={statusFilter === "approved"}
        />
        <StatCard
          value={loading ? "—" : counts.rejected} label="Rejected" icon="❌"
          color="#DC2626" border="rgba(220,38,38,0.18)"
          onClick={() => handleStatusStatClick("rejected")}
          active={statusFilter === "rejected"}
        />
        <StatCard
          value={loading ? "—" : counts.cancelled} label="Cancelled" icon="🚫"
          color="#64748B" border="rgba(148,163,184,0.18)"
          onClick={() => handleStatusStatClick("cancelled")}
          active={statusFilter === "cancelled"}
        />
      </div>

      {/* ── Toolbar ── */}
      <div className="bookings-toolbar">
        <div className="bookings-search">
          <span className="bookings-search__icon">🔍</span>
          <input
            className="bookings-search__input"
            placeholder="Search by employee, room, branch, notes..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          {search && (
            <button className="bookings-search__clear" onClick={() => setSearch("")}>✕</button>
          )}
        </div>

        <select className="bookings-filter-select" value={priorityFilter}
          onChange={(e) => setPriorityFilter(e.target.value)}>
          <option value="all">All Priorities</option>
          <option value="high">🔴 High</option>
          <option value="medium">🟡 Medium</option>
          <option value="low">🟢 Low</option>
        </select>

        <input
          type="date"
          className="bookings-filter-select bookings-date-input"
          value={dateFrom}
          onChange={(e) => setDateFrom(e.target.value)}
          title="Filter from date"
        />

        <select className="bookings-filter-select" value={sortBy}
          onChange={(e) => setSortBy(e.target.value)}>
          <option value="newest">Sort: Date Newest</option>
          <option value="oldest">Sort: Date Oldest</option>
          <option value="pending-first">Sort: Pending + High Priority First</option>
          <option value="priority-high">Sort: Priority High → Low</option>
          <option value="name">Sort: Employee A–Z</option>
        </select>

        {hasFilters && (
          <button className="bookings-clear-btn" onClick={clearAll}>✕ Clear</button>
        )}

        <span className="bookings-count-badge">
          {filtered.length} {filtered.length === 1 ? "booking" : "bookings"}
        </span>
      </div>

      {error && <div className="form-alert form-alert--error">⚠ {error}</div>}

      {/* ── Table ── */}
      <div className="bookings-panel">
        {loading ? (
          <div className="bookings-loading"><div className="bookings-spinner" /><p>Loading bookings...</p></div>
        ) : filtered.length === 0 ? (
          <div className="bookings-empty">
            <div className="bookings-empty__icon"><BookingIcon size={52} color="#CBD5E1" /></div>
            <div className="bookings-empty__title">{hasFilters ? "No bookings match your filters" : "No bookings yet"}</div>
            <div className="bookings-empty__sub">{hasFilters ? "Try clearing your filters" : "Bookings will appear here once employees start booking rooms"}</div>
          </div>
        ) : (
          <div className="bookings-table-wrap">
            <table className="bookings-table">
              <thead>
                <tr>
                  <th>Employee</th><th>Room</th><th>Date / Time</th>
                  <th>Priority</th><th>Notes</th><th>Status</th><th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {paginated.map((b) => (
                  <BookingRow key={b.id} booking={b} onView={handleView} onApprove={handleApprove} onReject={handleReject} actionLoading={actionLoading} />
                ))}
              </tbody>
            </table>
          </div>
        )}
        <Pagination current={page} total={filtered.length} pageSize={PAGE_SIZE} onChange={setPage} />
      </div>

      {/* ── Modals ── */}
      {modal?.type === "view"    && <DetailModal  bookingId={modal.bookingId} onClose={closeModal} onApprove={handleApprove} onReject={handleReject} />}
      {modal?.type === "approve" && <ApproveModal booking={modal.booking}    onClose={closeModal} onDone={handleDone} />}
      {modal?.type === "reject"  && <RejectModal  booking={modal.booking}    onClose={closeModal} onDone={handleDone} />}

    </div>
  );
}