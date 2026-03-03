// src/pages/BrowseRooms.jsx

import { useState, useEffect, useCallback } from "react";
import { RoomAPI } from "../api/roomAPI";
import { RoomFacilityAPI } from "../api/RoomFacilityAPI";
import { BookingAPI } from "../api/bookingAPI";
import Pagination from "../components/Pagination";
import "../styles/BrowseRooms.css";

// ─── CONSTANTS ───────────────────────────────────────────────────
const PAGE_SIZE   = 6;
const BANNER_COLS = ["green","blue","yellow","sky","purple","red"];
const bannerFor   = (i) => BANNER_COLS[i % BANNER_COLS.length];

// ─── DATE / TIME HELPERS ─────────────────────────────────────────
const pad = (n) => String(n).padStart(2, "0");

function toDateString(d) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}
function todayStr() { return toDateString(new Date()); }

// Converts local date + "HH:MM" → UTC ISO string
// e.g. date="2026-03-05", time="10:30" in IST → "2026-03-05T05:00:00.000Z"
function toUtcIso(dateStr, timeStr) {
  if (!dateStr || !timeStr) return null;
  return new Date(`${dateStr}T${timeStr}:00`).toISOString();
}

// Generate time options every 15 min: 07:00 → 21:00
function buildTimeOptions() {
  const opts = [];
  for (let h = 7; h <= 21; h++) {
    for (let m = 0; m < 60; m += 15) {
      if (h === 21 && m > 0) break;
      const val   = `${pad(h)}:${pad(m)}`;
      const label = new Date(`2000-01-01T${val}:00`).toLocaleTimeString("en-IN", {
        hour: "2-digit", minute: "2-digit", hour12: true,
      });
      opts.push({ val, label });
    }
  }
  return opts;
}
const TIME_OPTIONS = buildTimeOptions();

function calcDurMins(startTime, endTime) {
  if (!startTime || !endTime) return 0;
  const [sh, sm] = startTime.split(":").map(Number);
  const [eh, em] = endTime.split(":").map(Number);
  return (eh * 60 + em) - (sh * 60 + sm);
}

function durLabel(mins) {
  if (mins <= 0) return null;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return h > 0 ? `${h}h${m > 0 ? ` ${m}m` : ""}` : `${m}m`;
}

// Default start: next :00 or :30 at least 30 min from now, clamped to 07:00–20:30
function defaultStart() {
  const now = new Date();
  now.setMinutes(now.getMinutes() + 30);
  const m = now.getMinutes() < 30 ? 30 : 0;
  if (m === 0) now.setHours(now.getHours() + 1);
  now.setMinutes(m, 0, 0);
  const h = Math.min(Math.max(now.getHours(), 7), 20);
  return { date: toDateString(now), time: `${pad(h)}:${pad(m)}` };
}

function addOneHour(timeStr) {
  const [h, m] = timeStr.split(":").map(Number);
  const nh = h + 1;
  return nh > 21 ? "21:00" : `${pad(nh)}:${pad(m)}`;
}

// ─── BOOK MODAL ───────────────────────────────────────────────────
function BookModal({ room, onClose, onBooked }) {
  const start = defaultStart();
  const [form, setForm] = useState({
    date:      start.date,
    startTime: start.time,
    endTime:   addOneHour(start.time),
    priority:  "Low",
    notes:     "",
  });
  const [loading, setLoading] = useState(false);
  const [alert,   setAlert]   = useState({ msg: "", type: "" });

  const set = (key) => (e) => setForm((p) => ({ ...p, [key]: e.target.value }));

  const handleStartChange = (e) => {
    const t = e.target.value;
    setForm((p) => ({
      ...p,
      startTime: t,
      endTime: calcDurMins(t, p.endTime) < 30 ? addOneHour(t) : p.endTime,
    }));
  };

  const dur = calcDurMins(form.startTime, form.endTime);

  const validate = () => {
    if (!form.date)                             return "Please select a date.";
    if (!form.startTime || !form.endTime)       return "Please select start and end times.";
    if (new Date(toUtcIso(form.date, form.startTime)) <= new Date())
                                                return "Start time must be in the future.";
    if (dur <= 0)   return "End time must be after start time.";
    if (dur < 15)   return "Minimum booking duration is 15 minutes.";
    if (dur > 480)  return "Maximum booking duration is 8 hours.";
    return null;
  };

const handleSubmit = async () => {
  setAlert({ msg: "", type: "" });

  const err = validate();
  if (err) return setAlert({ msg: err, type: "error" });

  setLoading(true);

  try {
    console.log("room:", room);
    console.log("form:", form);

    const payload = {
      roomId: Number(room.id), // force number
      //startTime: `${form.date}T${form.startTime}:00+00:00`,
      //endTime: `${form.date}T${form.endTime}:00+00:00`,
      startTime: toUtcIso(form.date, form.startTime),
      endTime: toUtcIso(form.date, form.endTime),
      priority:
        form.priority.charAt(0).toUpperCase() +
        form.priority.slice(1).toLowerCase(), // ensure enum match
      notes: form.notes?.trim() || null,
    };

    console.log("FINAL PAYLOAD:", payload);

    const result = await BookingAPI.create(payload);

    console.log("SUCCESS RESPONSE:", result);

    setAlert({
      msg: "Booking request submitted! Awaiting admin approval.",
      type: "success",
    });
    setTimeout(() => {
     onBooked();
      }, 1500);
    //onBooked();
  } catch (e) {
    console.error("FULL ERROR OBJECT:", e);
    setAlert({ msg: e.message || "Something went wrong.", type: "error" });
  } finally {
    setLoading(false);
  }
};

  // End time options — only times strictly after startTime
  const endOpts = TIME_OPTIONS.filter((o) => o.val > form.startTime);

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal">

        <div className="modal__header">
          <h2 className="modal__title">📅 Book Room</h2>
          <button className="modal__close" onClick={onClose}>✕</button>
        </div>
        <p className="modal__subtitle">Fill in the details to submit your request</p>

        {/* Room summary */}
        <div className="book-room-info">
          <div className="book-room-info__icon">🚪</div>
          <div>
            <div className="book-room-info__name">{room.name}</div>
            <div className="book-room-info__meta">
              🏢 {room.branchName || room.branch?.name || "—"}&nbsp;·&nbsp;
              👥 {room.capacity ?? "—"} people
            </div>
          </div>
        </div>

        {alert.msg && (
          <div className={`form-alert form-alert--${alert.type}`}>
            {alert.type === "error" ? "✕" : "✓"} {alert.msg}
          </div>
        )}

        {/* ── Date ── */}
        <label className="form-label" htmlFor="bk-date">Date *</label>
        <input
          id="bk-date"
          type="date"
          className="form-input form-input--green"
          min={todayStr()}
          value={form.date}
          onChange={set("date")}
          style={{ marginBottom: 14 }}
        />

        {/* ── Start + End time dropdowns ── */}
        <div className="form-row" style={{ gap: 12, marginBottom: 4 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <label className="form-label" htmlFor="bk-start">Start Time *</label>
            <select
              id="bk-start"
              className="form-input form-input--green"
              value={form.startTime}
              onChange={handleStartChange}
              style={{ width: "100%" }}
            >
              {TIME_OPTIONS.map((o) => (
                <option key={o.val} value={o.val}>{o.label}</option>
              ))}
            </select>
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <label className="form-label" htmlFor="bk-end">End Time *</label>
            <select
              id="bk-end"
              className="form-input form-input--green"
              value={form.endTime}
              onChange={set("endTime")}
              style={{ width: "100%" }}
            >
              {endOpts.map((o) => (
                <option key={o.val} value={o.val}>{o.label}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Duration hint */}
        <p
          className={`form-hint${dur < 15 ? " form-hint--error" : ""}`}
          style={{ marginBottom: 14 }}
        >
          {dur <= 0 ? "⚠ End time must be after start time"
            : dur < 15 ? "⚠ Minimum booking is 15 minutes"
            : `⏱ Duration: ${durLabel(dur)}`}
        </p>

        {/* ── Priority ── */}
        <label className="form-label" htmlFor="bk-priority">Priority</label>
        <select
          id="bk-priority"
          className="form-input"
          value={form.priority}
          onChange={set("priority")}
          style={{ marginBottom: 14 }}
        >
          <option value="Low">🟢 Low — Normal request</option>
          <option value="Medium">🟡 Medium — Needs attention</option>
          <option value="High">🔴 High — Urgent</option>
        </select>

        {/* ── Notes ── */}
        <label className="form-label" htmlFor="bk-notes">
          Notes
          <span style={{ color: "#CBD5E1", fontWeight: 400, marginLeft: 6 }}>(optional)</span>
        </label>
        <input
          id="bk-notes"
          className="form-input"
          placeholder="e.g. Client meeting, team standup, special requirements"
          value={form.notes}
          onChange={set("notes")}
          style={{ marginBottom: 20 }}
        />

        <div className="modal__footer">
          <button className="btn-cancel" onClick={onClose}>Cancel</button>
          <button className="btn-book-confirm" onClick={handleSubmit} disabled={loading}>
            {loading ? "Submitting..." : "📅 Submit Request"}
          </button>
        </div>

      </div>
    </div>
  );
}

// ─── ROOM CARD ────────────────────────────────────────────────────
function BrowseCard({ room, index, facilities, onBook }) {
  const [expanded, setExpanded] = useState(false);
  const color   = bannerFor(index);
  const status  = (room.status || "Available").toLowerCase();
  const isAvail = status === "available";

  const LIMIT = 4;
  const tags  = expanded ? facilities : facilities.slice(0, LIMIT);
  const extra = facilities.length - LIMIT;

  return (
    <div className="browse-card">
      <div className={`browse-card__banner browse-card__banner--${color}`} />
      <div className="browse-card__body">

        <div className="browse-card__top">
          <div className="browse-card__icon">🚪</div>
          <span className={`browse-card__status-badge browse-card__status-badge--${status}`}>
            {status === "available"   ? "✅ Available"
              : status === "unavailable" ? "🚫 Unavailable"
              : "🔧 Maintenance"}
          </span>
        </div>

        <div className="browse-card__name">{room.name}</div>
        <div className="browse-card__branch">
          🏢 {room.branchName || room.branch?.name || "—"}
        </div>

        <div className="browse-card__meta">
          <div className="browse-card__cap">
            <span>👥</span><span>{room.capacity ?? "—"} people</span>
          </div>
        </div>

        {room.description && <p className="browse-card__desc">{room.description}</p>}

        {facilities.length > 0 && (
          <div className="browse-card__facilities">
            {tags.map((f, i) => (
              <span key={i} className="browse-fac-tag">{f.name || f}</span>
            ))}
            {!expanded && extra > 0 && (
              <button className="browse-fac-tag browse-fac-tag--more"
                onClick={() => setExpanded(true)}>+{extra} more</button>
            )}
            {expanded && (
              <button className="browse-fac-tag browse-fac-tag--more"
                onClick={() => setExpanded(false)}>Show less ▲</button>
            )}
          </div>
        )}

        <div className="browse-card__footer">
          <button className="btn-book" onClick={() => onBook(room)} disabled={!isAvail}>
            {isAvail ? "📅 Book this Room"
              : status === "maintenance" ? "🔧 Under Maintenance"
              : "🚫 Unavailable"}
          </button>
        </div>

      </div>
    </div>
  );
}

// ─── MAIN PAGE ────────────────────────────────────────────────────
export default function BrowseRooms() {
  const [rooms,       setRooms]       = useState([]);
  const [filtered,    setFiltered]    = useState([]);
  const [facilities,  setFacilities]  = useState({});
  const [loading,     setLoading]     = useState(true);
  const [error,       setError]       = useState("");
  const [search,      setSearch]      = useState("");
  const [capacityMin, setCapacityMin] = useState("");
  const [sortBy,      setSortBy]      = useState("name");
  const [page,        setPage]        = useState(1);
  const [bookModal,   setBookModal]   = useState(null);

  // ✅ FIX: No longer fetches /api/branches (AdminOnly → 403).
  // Employees can only book rooms in their own branch anyway,
  // so the branch filter dropdown is removed entirely.
  const fetchAll = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const roomList = await RoomAPI.getEmployeeRooms() || [];
      setRooms(roomList);

      const facMap = {};
      await Promise.allSettled(roomList.map(async (r) => {
        try {
          const facs = await RoomFacilityAPI.getByRoom(r.id);
          facMap[r.id] = Array.isArray(facs) ? facs : [];
        } catch { facMap[r.id] = []; }
      }));
      setFacilities(facMap);
    } catch (e) {
      setError(e.message || "Failed to load rooms.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  useEffect(() => {
    let list = [...rooms];

    if (capacityMin && !isNaN(Number(capacityMin)))
      list = list.filter((r) => (r.capacity ?? 0) >= Number(capacityMin));

    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((r) =>
        r.name?.toLowerCase().includes(q) ||
        r.branchName?.toLowerCase().includes(q) ||
        r.branch?.name?.toLowerCase().includes(q) ||
        r.description?.toLowerCase().includes(q));
    }

    list.sort((a, b) => {
      if (sortBy === "name")          return (a.name || "").localeCompare(b.name || "");
      if (sortBy === "capacity-asc")  return (a.capacity ?? 0) - (b.capacity ?? 0);
      if (sortBy === "capacity-desc") return (b.capacity ?? 0) - (a.capacity ?? 0);
      return 0;
    });

    setFiltered(list);
    setPage(1);
  }, [search, capacityMin, sortBy, rooms]);

  const paginated  = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const hasFilters = search || capacityMin;

  return (
    <div className="browse-page">

      <div className="browse-page__header">
        <div>
          <h2 className="browse-page__title">🚪 Browse Rooms</h2>
          <p className="browse-page__sub">Find and book available meeting rooms</p>
        </div>
      </div>

      <div className="browse-toolbar">
        {/* Search */}
        <div className="browse-search">
          <span className="browse-search__icon">🔍</span>
          <input
            className="browse-search__input"
            placeholder="Search by room name..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {/* Min capacity */}
        <input
          type="number" min="1"
          className="browse-filter-select"
          style={{ maxWidth: 130, fontFamily: "monospace" }}
          placeholder="Min capacity"
          value={capacityMin}
          onChange={(e) => setCapacityMin(e.target.value)}
        />

        {/* Sort */}
        <select
          className="browse-filter-select"
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value)}
        >
          <option value="name">Sort: Name A–Z</option>
          <option value="capacity-asc">Sort: Smallest Room</option>
          <option value="capacity-desc">Sort: Largest Room</option>
        </select>

        <span className="browse-count-badge">
          {filtered.length} {filtered.length === 1 ? "room" : "rooms"}
        </span>
      </div>

      {error && <div className="form-alert form-alert--error">⚠ {error}</div>}

      <div className="browse-grid">
        {loading ? (
          <div className="browse-loading">
            <div className="browse-spinner" /><p>Loading rooms...</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="browse-empty">
            <div className="browse-empty__icon">🚪</div>
            <div className="browse-empty__title">
              {hasFilters ? "No rooms match your filters" : "No rooms available"}
            </div>
            <div className="browse-empty__sub">
              {hasFilters ? "Try clearing your filters" : "Check back later for available rooms"}
            </div>
          </div>
        ) : (
          paginated.map((room, index) => (
            <BrowseCard
              key={room.id}
              room={room}
              index={(page - 1) * PAGE_SIZE + index}
              facilities={facilities[room.id] || []}
              onBook={(r) => setBookModal(r)}
            />
          ))
        )}
      </div>

      <Pagination current={page} total={filtered.length} pageSize={PAGE_SIZE} onChange={setPage} />

      {bookModal && (
        <BookModal
          room={bookModal}
          onClose={() => setBookModal(null)}
          onBooked={() => { setBookModal(null); fetchAll(); }}
        />
      )}

    </div>
  );
}
