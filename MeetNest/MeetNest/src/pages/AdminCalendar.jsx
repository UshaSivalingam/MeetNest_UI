import { useState, useEffect, useCallback, useRef } from "react";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin  from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction";
import { AdminAPI } from "../api/adminAPI";
import { BranchAPI } from "../api/branchAPI";
import "../styles/Calendar.css";

// ── Status config ─────────────────────────────────────────────────
const STATUS = {
  pending:   { color: "#CA8A04", bg: "#FEF9C3", border: "#CA8A04", label: "Pending",   icon: "⏳" },
  approved:  { color: "#16A34A", bg: "#DCFCE7", border: "#16A34A", label: "Approved",  icon: "✅" },
  rejected:  { color: "#DC2626", bg: "#FEE2E2", border: "#DC2626", label: "Rejected",  icon: "❌" },
  cancelled: { color: "#64748B", bg: "#F1F5F9", border: "#94A3B8", label: "Cancelled", icon: "🚫" },
};

function statusMeta(raw = "") {
  return STATUS[raw.toLowerCase()] || STATUS.pending;
}

function fmtTime(iso) {
  if (!iso) return "";
  return new Date(iso).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true });
}
function fmtDate(iso) {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString("en-IN", { weekday: "short", day: "2-digit", month: "short", year: "numeric" });
}

// ── Priority badge colors ─────────────────────────────────────────
const PRIORITY = { high: "#DC2626", medium: "#CA8A04", low: "#16A34A" };

// ── Event Detail Modal ────────────────────────────────────────────
function EventModal({ booking, onClose, onApprove, onReject }) {
  if (!booking) return null;
  const sm = statusMeta(booking.status);
  const isPending = booking.status?.toLowerCase() === "pending";

  return (
    <div className="cal-modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="cal-modal">
        <div className="cal-modal__header" style={{ borderLeft: `4px solid ${sm.color}` }}>
          <div>
            <span className="cal-modal__status" style={{ color: sm.color, background: sm.bg }}>
              {sm.icon} {sm.label}
            </span>
            <h3 className="cal-modal__room">{booking.roomName}</h3>
          </div>
          <button className="cal-modal__close" onClick={onClose}>✕</button>
        </div>

        <div className="cal-modal__body">
          <div className="cal-modal__row">
            <span className="cal-modal__key">Employee</span>
            <span className="cal-modal__val">{booking.employeeName}</span>
          </div>
          <div className="cal-modal__row">
            <span className="cal-modal__key">Email</span>
            <span className="cal-modal__val">{booking.employeeEmail}</span>
          </div>
          <div className="cal-modal__row">
            <span className="cal-modal__key">Branch</span>
            <span className="cal-modal__val">{booking.branchName}</span>
          </div>
          <div className="cal-modal__row">
            <span className="cal-modal__key">Date</span>
            <span className="cal-modal__val">{fmtDate(booking.startTime)}</span>
          </div>
          <div className="cal-modal__row">
            <span className="cal-modal__key">Time</span>
            <span className="cal-modal__val">{fmtTime(booking.startTime)} – {fmtTime(booking.endTime)}</span>
          </div>
          <div className="cal-modal__row">
            <span className="cal-modal__key">Priority</span>
            <span className="cal-modal__val" style={{ color: PRIORITY[booking.priority?.toLowerCase()] || "#64748B", fontWeight: 600 }}>
              {booking.priority}
            </span>
          </div>
          {booking.notes && (
            <div className="cal-modal__row">
              <span className="cal-modal__key">Notes</span>
              <span className="cal-modal__val" style={{ fontStyle: "italic" }}>{booking.notes}</span>
            </div>
          )}
          {booking.overrideReason && (
            <div className="cal-modal__note">
              💬 {booking.overrideReason}
            </div>
          )}
        </div>

        {isPending && (
          <div className="cal-modal__footer">
            <button className="cal-btn cal-btn--cancel" onClick={onClose}>Close</button>
            <button className="cal-btn cal-btn--reject" onClick={() => onReject(booking)}>❌ Reject</button>
            <button className="cal-btn cal-btn--approve" onClick={() => onApprove(booking)}>✅ Approve</button>
          </div>
        )}
        {!isPending && (
          <div className="cal-modal__footer">
            <button className="cal-btn cal-btn--cancel" style={{ flex: 1 }} onClick={onClose}>Close</button>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Approve Modal ─────────────────────────────────────────────────
function ApproveModal({ booking, onClose, onDone }) {
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState("");

  const handle = async () => {
    setLoading(true); setError("");
    try {
      await AdminAPI.approveBooking(booking.id, { reason: "", force: false });
      onDone();
    } catch (e) {
      setError(e.message || "Approval failed.");
      setLoading(false);
    }
  };

  return (
    <div className="cal-modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="cal-modal">
        <div className="cal-modal__header" style={{ borderLeft: "4px solid #16A34A" }}>
          <h3 className="cal-modal__room" style={{ color: "#16A34A" }}>✅ Approve Booking</h3>
          <button className="cal-modal__close" onClick={onClose}>✕</button>
        </div>
        <div className="cal-modal__body">
          {error && <div className="cal-alert cal-alert--error">✕ {error}</div>}
          <p className="cal-modal__confirm-text">
            Approve booking for <strong>{booking.employeeName}</strong> in <strong>{booking.roomName}</strong>?
          </p>
          <p style={{ fontSize: 12, color: "#64748B", fontFamily: "monospace" }}>
            {fmtDate(booking.startTime)} · {fmtTime(booking.startTime)} – {fmtTime(booking.endTime)}
          </p>
        </div>
        <div className="cal-modal__footer">
          <button className="cal-btn cal-btn--cancel" onClick={onClose} disabled={loading}>Cancel</button>
          <button className="cal-btn cal-btn--approve" onClick={handle} disabled={loading}>
            {loading ? "Approving..." : "✅ Yes, Approve"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Reject Modal ──────────────────────────────────────────────────
function RejectModal({ booking, onClose, onDone }) {
  const [reason,  setReason]  = useState("");
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState("");

  const handle = async () => {
    if (!reason.trim()) return setError("Please provide a rejection reason.");
    setLoading(true); setError("");
    try {
      await AdminAPI.rejectBooking(booking.id, { reason: reason.trim() });
      onDone();
    } catch (e) {
      setError(e.message || "Rejection failed.");
      setLoading(false);
    }
  };

  return (
    <div className="cal-modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="cal-modal">
        <div className="cal-modal__header" style={{ borderLeft: "4px solid #DC2626" }}>
          <h3 className="cal-modal__room" style={{ color: "#DC2626" }}>❌ Reject Booking</h3>
          <button className="cal-modal__close" onClick={onClose}>✕</button>
        </div>
        <div className="cal-modal__body">
          {error && <div className="cal-alert cal-alert--error">✕ {error}</div>}
          <p className="cal-modal__confirm-text">
            Reject booking for <strong>{booking.employeeName}</strong> in <strong>{booking.roomName}</strong>?
          </p>
          <label className="cal-label">Rejection Reason *</label>
          <textarea
            className="cal-textarea"
            placeholder="e.g. Room is under maintenance, please rebook."
            value={reason}
            maxLength={300}
            onChange={(e) => setReason(e.target.value)}
          />
          <div style={{ fontSize: 11, color: "#94A3B8", textAlign: "right", marginTop: 2, fontFamily: "monospace" }}>
            {reason.length}/300
          </div>
        </div>
        <div className="cal-modal__footer">
          <button className="cal-btn cal-btn--cancel" onClick={onClose} disabled={loading}>Cancel</button>
          <button className="cal-btn cal-btn--reject" onClick={handle} disabled={loading}>
            {loading ? "Rejecting..." : "❌ Confirm Reject"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── MAIN PAGE ─────────────────────────────────────────────────────
export default function AdminCalendar() {
  const [bookings,      setBookings]      = useState([]);
  const [branches,      setBranches]      = useState([]);
  const [loading,       setLoading]       = useState(true);
  const [error,         setError]         = useState("");
  const [branchFilter,  setBranchFilter]  = useState("all");
  const [statusFilter,  setStatusFilter]  = useState("all");
  const [modal,         setModal]         = useState(null);
  const calendarRef = useRef(null);

  const fetchAll = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const [bkData, brData] = await Promise.allSettled([
        AdminAPI.getBookings(),
        BranchAPI.getSimple(),
      ]);
      setBookings(bkData.status === "fulfilled" ? (Array.isArray(bkData.value) ? bkData.value : (bkData.value?.items ?? [])) : []);
      setBranches(brData.status === "fulfilled" ? (Array.isArray(brData.value) ? brData.value : (brData.value?.items ?? [])) : []);
    } catch (e) {
      setError(e.message || "Failed to load bookings.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  // ── Convert bookings to FullCalendar events ───────────────────
  const events = bookings
    .filter(b => branchFilter === "all" || b.branchName === branchFilter || String(b.branchId) === branchFilter)
    .filter(b => statusFilter === "all" || b.status?.toLowerCase() === statusFilter)
    .map(b => {
      const sm = statusMeta(b.status);
      const isPast = new Date(b.endTime) < new Date();
      return {
        id:              String(b.id),
        title:           `${b.roomName} — ${b.employeeName}`,
        start:           b.startTime,
        end:             b.endTime,
        backgroundColor: sm.bg,
        borderColor:     sm.border,
        textColor:       sm.color,
        classNames:      [
          `cal-event--${b.status?.toLowerCase()}`,
          isPast ? "cal-event--past" : "",
        ].filter(Boolean),
        extendedProps:   { booking: b },
      };
    });

  const handleEventClick = ({ event }) => {
    setModal({ type: "detail", booking: event.extendedProps.booking });
  };

  const handleApprove = (booking) => setModal({ type: "approve", booking });
  const handleReject  = (booking) => setModal({ type: "reject",  booking });
  const closeModal    = ()        => setModal(null);
  const handleDone    = ()        => { closeModal(); fetchAll(); };

  // ── Status counts ─────────────────────────────────────────────
  const counts = {
    pending:   bookings.filter(b => b.status?.toLowerCase() === "pending").length,
    approved:  bookings.filter(b => b.status?.toLowerCase() === "approved").length,
    rejected:  bookings.filter(b => b.status?.toLowerCase() === "rejected").length,
    cancelled: bookings.filter(b => b.status?.toLowerCase() === "cancelled").length,
  };

  return (
    <div className="cal-page">

      {/* ── Header ── */}
      <div className="cal-header">
        <div>
          <h2 className="cal-header__title">📆 Bookings Calendar</h2>
          <p className="cal-header__sub">View and manage all bookings across branches</p>
        </div>
        <button className="cal-refresh" onClick={fetchAll} disabled={loading}>
          🔄 {loading ? "Loading..." : "Refresh"}
        </button>
      </div>

      {/* ── Status legend + counts ── */}
      <div className="cal-legend">
        {Object.entries(STATUS).map(([key, s]) => (
          <button
            key={key}
            className={`cal-legend__item${statusFilter === key ? " cal-legend__item--active" : ""}`}
            style={{
              borderColor: statusFilter === key ? s.color : "transparent",
              background:  statusFilter === key ? s.bg : "rgba(255,255,255,0.7)",
            }}
            onClick={() => setStatusFilter(prev => prev === key ? "all" : key)}
          >
            <span className="cal-legend__dot" style={{ background: s.color }} />
            <span style={{ color: s.color, fontWeight: 600 }}>{s.label}</span>
            <span className="cal-legend__count" style={{ background: s.bg, color: s.color }}>
              {counts[key]}
            </span>
          </button>
        ))}
        {statusFilter !== "all" && (
          <button className="cal-legend__clear" onClick={() => setStatusFilter("all")}>✕ Clear</button>
        )}
      </div>

      {/* ── Filters ── */}
      <div className="cal-filters">
        <select className="cal-filter-select" value={branchFilter}
          onChange={(e) => setBranchFilter(e.target.value)}>
          <option value="all">All Branches</option>
          {branches.map(b => <option key={b.id} value={b.name}>{b.name}</option>)}
        </select>
      </div>

      {error && <div className="cal-error">⚠ {error}</div>}

      {/* ── Calendar ── */}
      <div className="cal-wrap">
        {loading ? (
          <div className="cal-loading">
            <div className="cal-spinner" />
            <p>Loading bookings...</p>
          </div>
        ) : (
          <FullCalendar
            ref={calendarRef}
            plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
            initialView="dayGridMonth"
            headerToolbar={{
              left:   "prev,next today",
              center: "title",
              right:  "dayGridMonth,timeGridWeek,timeGridDay",
            }}
            buttonText={{
              today: "Today",
              month: "Month",
              week:  "Week",
              day:   "Day",
            }}
            events={events}
            eventClick={handleEventClick}
            height="auto"
            eventDisplay="block"
            dayMaxEvents={3}
            eventTimeFormat={{ hour: "2-digit", minute: "2-digit", hour12: true }}
            slotMinTime="07:00:00"
            slotMaxTime="22:00:00"
            allDaySlot={false}
            nowIndicator={true}
            eventContent={(arg) => {
              const b  = arg.event.extendedProps.booking;
              const sm = statusMeta(b?.status);
              return (
                <div className="cal-event-inner" style={{ borderLeft: `3px solid ${sm.color}` }}>
                  <span className="cal-event-icon">{sm.icon}</span>
                  <span className="cal-event-title">{arg.event.title}</span>
                </div>
              );
            }}
          />
        )}
      </div>

      {/* ── Modals ── */}
      {modal?.type === "detail"  && (
        <EventModal booking={modal.booking} onClose={closeModal}
          onApprove={handleApprove} onReject={handleReject} />
      )}
      {modal?.type === "approve" && (
        <ApproveModal booking={modal.booking} onClose={closeModal} onDone={handleDone} />
      )}
      {modal?.type === "reject"  && (
        <RejectModal booking={modal.booking} onClose={closeModal} onDone={handleDone} />
      )}
    </div>
  );
}