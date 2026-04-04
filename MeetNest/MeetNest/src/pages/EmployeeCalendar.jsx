// src/pages/EmployeeCalendar.jsx

import { useState, useEffect, useCallback, useRef } from "react";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin     from "@fullcalendar/daygrid";
import timeGridPlugin    from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction";
import { BookingAPI } from "../api/bookingAPI";
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

// ── Cancel Modal ──────────────────────────────────────────────────
function CancelModal({ booking, onClose, onDone }) {
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState("");

  const handle = async () => {
    setLoading(true); setError("");
    try {
      await BookingAPI.cancel(booking.id);
      onDone();
    } catch (e) {
      setError(e.message || "Cancellation failed.");
      setLoading(false);
    }
  };

  return (
    <div className="cal-modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="cal-modal">
        <div className="cal-modal__header" style={{ borderLeft: "4px solid #DC2626" }}>
          <h3 className="cal-modal__room" style={{ color: "#DC2626" }}>🚫 Cancel Booking</h3>
          <button className="cal-modal__close" onClick={onClose}>✕</button>
        </div>
        <div className="cal-modal__body">
          {error && <div className="cal-alert cal-alert--error">✕ {error}</div>}
          <p className="cal-modal__confirm-text">
            Cancel your booking for <strong>{booking.roomName}</strong>?
          </p>
          <p style={{ fontSize: 12, color: "#64748B", fontFamily: "monospace" }}>
            {fmtDate(booking.startTime)} · {fmtTime(booking.startTime)} – {fmtTime(booking.endTime)}
          </p>
          <p style={{ fontSize: 12, color: "#94A3B8", marginTop: 8 }}>This action cannot be undone.</p>
        </div>
        <div className="cal-modal__footer">
          <button className="cal-btn cal-btn--cancel" onClick={onClose} disabled={loading}>Keep It</button>
          <button className="cal-btn cal-btn--reject" onClick={handle} disabled={loading}>
            {loading ? "Cancelling..." : "🚫 Yes, Cancel"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Event Detail Modal ────────────────────────────────────────────
function EventModal({ booking, onClose, onCancel }) {
  if (!booking) return null;
  const sm       = statusMeta(booking.status);
  const isPast   = new Date(booking.endTime) < new Date();
  const canCancel = !isPast &&
    booking.status?.toLowerCase() !== "cancelled" &&
    booking.status?.toLowerCase() !== "rejected";

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
            <span className="cal-modal__key">Branch</span>
            <span className="cal-modal__val">{booking.branchName || "—"}</span>
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
            <span className="cal-modal__val" style={{
              color: booking.priority?.toLowerCase() === "high" ? "#DC2626"
                   : booking.priority?.toLowerCase() === "medium" ? "#CA8A04" : "#16A34A",
              fontWeight: 600,
            }}>
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
            <div className="cal-modal__note">💬 {booking.overrideReason}</div>
          )}
          {isPast && (
            <div className="cal-modal__note" style={{ background: "#F1F5F9", color: "#64748B", borderColor: "#CBD5E1" }}>
              📅 This booking has already ended.
            </div>
          )}
        </div>
        <div className="cal-modal__footer">
          <button className="cal-btn cal-btn--cancel" onClick={onClose}>Close</button>
          {canCancel && (
            <button className="cal-btn cal-btn--reject" onClick={() => onCancel(booking)}>
              🚫 Cancel Booking
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ── MAIN PAGE ─────────────────────────────────────────────────────
export default function EmployeeCalendar() {
  const [bookings,     setBookings]     = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [error,        setError]        = useState("");
  const [statusFilter, setStatusFilter] = useState("all"); // ← filter state
  const [modal,        setModal]        = useState(null);
  const calendarRef = useRef(null);

  const fetchAll = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const data = await BookingAPI.myBookings();
      setBookings(Array.isArray(data) ? data : (data?.items ?? []));
    } catch (e) {
      setError(e.message || "Failed to load bookings.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  // ── Counts per status ─────────────────────────────────────────
  const counts = {
    pending:   bookings.filter(b => b.status?.toLowerCase() === "pending").length,
    approved:  bookings.filter(b => b.status?.toLowerCase() === "approved").length,
    rejected:  bookings.filter(b => b.status?.toLowerCase() === "rejected").length,
    cancelled: bookings.filter(b => b.status?.toLowerCase() === "cancelled").length,
  };

  // ── Apply status filter ───────────────────────────────────────
  const filtered = statusFilter === "all"
    ? bookings
    : bookings.filter(b => b.status?.toLowerCase() === statusFilter);

  // ── Convert to FullCalendar events ────────────────────────────
  const events = filtered.map(b => {
    const sm     = statusMeta(b.status);
    const isPast = new Date(b.endTime) < new Date();
    return {
      id:              String(b.id),
      title:           b.roomName,
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
  const handleCancel = (booking) => setModal({ type: "cancel", booking });
  const closeModal   = ()        => setModal(null);
  const handleDone   = ()        => { closeModal(); fetchAll(); };

  const handleLegendClick = (key) => {
    setStatusFilter(prev => prev === key ? "all" : key);
  };

  return (
    <div className="cal-page">

      {/* ── Header ── */}
      <div className="cal-header">
        <div>
          <h2 className="cal-header__title">📆 My Bookings Calendar</h2>
          <p className="cal-header__sub">View and manage all your room bookings</p>
        </div>
        <button className="cal-refresh" onClick={fetchAll} disabled={loading}>
          🔄 {loading ? "Loading..." : "Refresh"}
        </button>
      </div>

      {/* ── Status filter pills — clickable ── */}
      <div className="cal-legend">
        {Object.entries(STATUS).map(([key, s]) => {
          const isActive = statusFilter === key;
          return (
            <button
              key={key}
              className={`cal-legend__item${isActive ? " cal-legend__item--active" : ""}`}
              style={{
                borderColor: isActive ? s.color : "transparent",
                background:  isActive ? s.bg : "rgba(255,255,255,0.7)",
                cursor:      "pointer",
              }}
              onClick={() => handleLegendClick(key)}
            >
              <span className="cal-legend__dot" style={{ background: s.color }} />
              <span style={{ color: s.color, fontWeight: 600 }}>{s.label}</span>
              <span className="cal-legend__count" style={{ background: isActive ? "rgba(255,255,255,0.8)" : s.bg, color: s.color }}>
                {counts[key]}
              </span>
            </button>
          );
        })}
        {statusFilter !== "all" && (
          <button className="cal-legend__clear" onClick={() => setStatusFilter("all")}>✕ All</button>
        )}
      </div>

      {error && <div className="cal-error">⚠ {error}</div>}

      {/* ── Calendar ── */}
      <div className="cal-wrap">
        {loading ? (
          <div className="cal-loading">
            <div className="cal-spinner" />
            <p>Loading your bookings...</p>
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
            buttonText={{ today: "Today", month: "Month", week: "Week", day: "Day" }}
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
      {modal?.type === "detail" && (
        <EventModal booking={modal.booking} onClose={closeModal} onCancel={handleCancel} />
      )}
      {modal?.type === "cancel" && (
        <CancelModal booking={modal.booking} onClose={closeModal} onDone={handleDone} />
      )}
    </div>
  );
}