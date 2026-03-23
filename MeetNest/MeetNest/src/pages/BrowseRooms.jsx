import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { RoomAPI }         from "../api/roomAPI";
import { RoomFacilityAPI } from "../api/RoomFacilityAPI";
import { BookingAPI }      from "../api/bookingAPI";
import Pagination          from "../components/Pagination";
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

function toUtcIso(dateStr, timeStr) {
  if (!dateStr || !timeStr) return null;
  return new Date(`${dateStr}T${timeStr}:00`).toISOString();
}

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

// ─── BLOCK DATE CHECK ────────────────────────────────────────────
function getBlockWarning(room, dateStr) {
  if (!room.blockFromDate || !dateStr) return null;
  const selected  = new Date(dateStr);
  const blockDate = new Date(room.blockFromDate);
  selected.setHours(0,0,0,0);
  blockDate.setHours(0,0,0,0);
  if (selected >= blockDate) {
    const formatted = blockDate.toLocaleDateString("en-IN", { day:"2-digit", month:"short", year:"numeric" });
    return room.blockReason === "Deletion"
      ? `This room is being removed from service from ${formatted}. Please choose a date before ${formatted}.`
      : `This room is scheduled for maintenance from ${formatted}. Please choose a date before ${formatted}.`;
  }
  return null;
}

// ─── TIME CONVERSION HELPERS ──────────────────────────────────────
// Convert 24h "HH:MM" to { h12, min, ampm }
function parse24(val) {
  const [h24, m] = val.split(":").map(Number);
  const ampm = h24 < 12 ? "AM" : "PM";
  let h12 = h24 % 12;
  if (h12 === 0) h12 = 12;
  return { h12, min: m, ampm };
}

// Convert { h12, min, ampm } back to 24h "HH:MM"
function to24(h12, min, ampm) {
  let h24 = h12 % 12;
  if (ampm === "PM") h24 += 12;
  return `${pad(h24)}:${pad(min)}`;
}

// Valid hours for our range (7 AM – 9 PM)
// For AM: 7,8,9,10,11,12  |  For PM: 12,1,2,3,4,5,6,7,8,9
const AM_HOURS = [7,8,9,10,11,12];
const PM_HOURS = [12,1,2,3,4,5,6,7,8,9,10,11];
const MINUTES  = [0,15,30,45];

// ─── COLUMN TIME PICKER ───────────────────────────────────────────
function TimePicker({ id, label, value, onChange, minVal }) {
  const { h12: initH, min: initM, ampm: initAP } = parse24(value);
  const [selH,    setSelH]    = useState(initH);
  const [selM,    setSelM]    = useState(initM);
  const [selAP,   setSelAP]   = useState(initAP);
  const [open,    setOpen]    = useState(false);
  const [pending, setPending] = useState({ h: initH, m: initM, ap: initAP });

  const wrapRef  = useRef(null);
  const hColRef  = useRef(null);
  const mColRef  = useRef(null);
  const apColRef = useRef(null);

  // Sync from outside value changes
  useEffect(() => {
    const { h12, min, ampm } = parse24(value);
    setSelH(h12); setSelM(min); setSelAP(ampm);
    setPending({ h: h12, m: min, ap: ampm });
  }, [value]);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) {
        setOpen(false);
        // Reset pending to current committed value
        const { h12, min, ampm } = parse24(value);
        setPending({ h: h12, m: min, ap: ampm });
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open, value]);

  // Scroll selected into view when opening
  useEffect(() => {
    if (!open) return;
    setTimeout(() => {
      [hColRef, mColRef, apColRef].forEach(ref => {
        const sel = ref.current?.querySelector(".tp-col__item--sel");
        if (sel) sel.scrollIntoView({ block: "center", behavior: "smooth" });
      });
    }, 40);
  }, [open]);

  const hours = pending.ap === "AM" ? AM_HOURS : PM_HOURS;

  // Check if a time combination is valid against minVal
  const isDisabled = (h, m, ap) => {
    if (!minVal) return false;
    const candidate = to24(h, m, ap);
    return candidate <= minVal;
  };

  const handleOk = () => {
    const result = to24(pending.h, pending.m, pending.ap);
    onChange(result);
    setOpen(false);
  };

  const handleCancel = () => {
    const { h12, min, ampm } = parse24(value);
    setPending({ h: h12, m: min, ap: ampm });
    setOpen(false);
  };

  // Display value
  const displayVal = (() => {
    const { h12, min, ampm } = parse24(value);
    return `${pad(h12)}:${pad(min)} ${ampm}`;
  })();

  return (
    <div className="tp-wrap" ref={wrapRef}>
      <label className="form-label" htmlFor={id}>{label}</label>

      {/* Trigger */}
      <button
        id={id} type="button"
        className={`tp-trigger${open ? " tp-trigger--open" : ""}`}
        onClick={() => {
          if (!open) {
            const { h12, min, ampm } = parse24(value);
            setPending({ h: h12, m: min, ap: ampm });
          }
          setOpen(p => !p);
        }}>
        <span className="tp-trigger__clock">⏰</span>
        <span className="tp-trigger__val">{displayVal}</span>
        <span className={`tp-trigger__caret${open ? " tp-trigger__caret--up" : ""}`}>▾</span>
      </button>

      {/* Dropdown */}
      {open && (
        <div className="tp-panel">

          {/* Current value display */}
          <div className="tp-display">
            {pad(pending.h)}:{pad(pending.m)} {pending.ap}
          </div>

          {/* Three columns */}
          <div className="tp-cols">

            {/* Hour column */}
            <div className="tp-col">
              <div className="tp-col__head">Hr</div>
              <div className="tp-col__scroll" ref={hColRef}>
                {hours.map(h => {
                  const dis = isDisabled(h, pending.m, pending.ap);
                  return (
                    <button key={h} type="button"
                      className={`tp-col__item${pending.h === h ? " tp-col__item--sel" : ""}${dis ? " tp-col__item--dis" : ""}`}
                      disabled={dis}
                      onClick={() => {
                        setPending(p => ({ ...p, h }));
                        setTimeout(() => {
                          const sel = hColRef.current?.querySelector(".tp-col__item--sel");
                          sel?.scrollIntoView({ block:"nearest", behavior:"smooth" });
                        }, 20);
                      }}>
                      {pad(h)}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Minute column */}
            <div className="tp-col">
              <div className="tp-col__head">Min</div>
              <div className="tp-col__scroll" ref={mColRef}>
                {MINUTES.map(m => {
                  const dis = isDisabled(pending.h, m, pending.ap);
                  return (
                    <button key={m} type="button"
                      className={`tp-col__item${pending.m === m ? " tp-col__item--sel" : ""}${dis ? " tp-col__item--dis" : ""}`}
                      disabled={dis}
                      onClick={() => {
                        setPending(p => ({ ...p, m }));
                        setTimeout(() => {
                          const sel = mColRef.current?.querySelector(".tp-col__item--sel");
                          sel?.scrollIntoView({ block:"nearest", behavior:"smooth" });
                        }, 20);
                      }}>
                      {pad(m)}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* AM/PM column */}
            <div className="tp-col">
              <div className="tp-col__head">—</div>
              <div className="tp-col__scroll" ref={apColRef}>
                {["AM","PM"].map(ap => (
                  <button key={ap} type="button"
                    className={`tp-col__item${pending.ap === ap ? " tp-col__item--sel" : ""}`}
                    onClick={() => setPending(p => ({ ...p, ap, h: ap === "AM" ? AM_HOURS[0] : PM_HOURS[0] }))}>
                    {ap}
                  </button>
                ))}
              </div>
            </div>

          </div>

          {/* Cancel / OK */}
          <div className="tp-footer">
            <button type="button" className="tp-btn tp-btn--cancel" onClick={handleCancel}>
              CANCEL
            </button>
            <button type="button" className="tp-btn tp-btn--ok" onClick={handleOk}>
              OK
            </button>
          </div>

        </div>
      )}
    </div>
  );
}

// ─── BOOK MODAL ───────────────────────────────────────────────────
function BookModal({ room, onClose, onBooked }) {
  const start         = defaultStart();
  const needsApproval = room.approvalRequired ?? true;

  const [form, setForm] = useState({
    date:      start.date,
    startTime: start.time,
    endTime:   addOneHour(start.time),
    priority:  "Low",
    notes:     "",
  });
  const [loading, setLoading] = useState(false);
  const [alert,   setAlert]   = useState({ msg:"", type:"" });

  const set = (key) => (e) => setForm((p) => ({ ...p, [key]: e.target.value }));

  const handleStartChange = (val) => {
    setForm((p) => ({
      ...p,
      startTime: val,
      endTime: calcDurMins(val, p.endTime) < 30 ? addOneHour(val) : p.endTime,
    }));
  };

  const dur          = calcDurMins(form.startTime, form.endTime);
  const blockWarning = getBlockWarning(room, form.date);

  const validate = () => {
    if (!form.date)                       return "Please select a date.";
    if (!form.startTime || !form.endTime) return "Please select start and end times.";
    if (blockWarning)                     return blockWarning;
    if (new Date(toUtcIso(form.date, form.startTime)) <= new Date())
                                          return "Start time must be in the future.";
    if (dur <= 0)  return "End time must be after start time.";
    if (dur < 15)  return "Minimum booking duration is 15 minutes.";
    if (dur > 480) return "Maximum booking duration is 8 hours.";
    return null;
  };

  const handleSubmit = async () => {
    setAlert({ msg:"", type:"" });
    const err = validate();
    if (err) return setAlert({ msg: err, type:"error" });
    setLoading(true);
    try {
      const payload = {
        roomId:    Number(room.id),
        startTime: toUtcIso(form.date, form.startTime),
        endTime:   toUtcIso(form.date, form.endTime),
        priority:  form.priority.charAt(0).toUpperCase() + form.priority.slice(1).toLowerCase(),
        notes:     form.notes?.trim() || null,
      };
      await BookingAPI.create(payload);
      const msg = needsApproval
        ? "Booking request submitted! Awaiting admin approval."
        : "Booking confirmed! Your room is reserved.";
      setAlert({ msg, type:"success" });
      setTimeout(() => onBooked(), 1500);
    } catch (e) {
      setAlert({ msg: e.message || "Something went wrong.", type:"error" });
    } finally {
      setLoading(false);
    }
  };

  const maxDate = room.blockFromDate
    ? (() => {
        const d = new Date(room.blockFromDate);
        d.setDate(d.getDate() - 1);
        return toDateString(d);
      })()
    : undefined;

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal bk-modal">
        <div className="modal__header">
          <h2 className="modal__title">📅 Book Room</h2>
          <button className="modal__close" onClick={onClose}>✕</button>
        </div>
        <p className="modal__subtitle">
          {needsApproval
            ? "Fill in the details to submit your request"
            : "Fill in the details to confirm your booking instantly"}
        </p>

        {/* Room summary */}
        <div className="bk-room-info">
          <div className="bk-room-info__icon">🚪</div>
          <div className="bk-room-info__details">
            <div className="bk-room-info__name">{room.name}</div>
            <div className="bk-room-info__meta">
              <span>🏢 {room.branchName || room.branch?.name || "—"}</span>
              <span className="bk-room-info__dot">·</span>
              <span>👥 {room.capacity ?? "—"} people</span>
              {!needsApproval && (
                <>
                  <span className="bk-room-info__dot">·</span>
                  <span style={{ color:"#16A34A", fontWeight:600 }}>⚡ Instant Booking</span>
                </>
              )}
            </div>
            {room.blockFromDate && (
              <div style={{
                marginTop:6, padding:"5px 10px", borderRadius:8,
                background: room.blockReason === "Deletion" ? "rgba(254,242,242,0.8)" : "rgba(254,249,195,0.8)",
                border:     room.blockReason === "Deletion" ? "1px solid rgba(220,38,38,0.2)" : "1px solid rgba(202,138,4,0.2)",
                fontSize:11, fontFamily:"Work Sans, sans-serif",
                color:      room.blockReason === "Deletion" ? "#DC2626" : "#CA8A04",
              }}>
                {room.blockReason === "Deletion" ? "🗑" : "🔧"}{" "}
                {room.blockReason === "Deletion" ? "Being removed" : "Maintenance scheduled"} from{" "}
                <strong>
                  {new Date(room.blockFromDate).toLocaleDateString("en-IN", { day:"2-digit", month:"short", year:"numeric" })}
                </strong>
                {" "}— bookings only available before this date.
              </div>
            )}
          </div>
        </div>

        {alert.msg && (
          <div className={`form-alert form-alert--${alert.type}`}>
            {alert.type === "error" ? "✕" : "✓"} {alert.msg}
          </div>
        )}

        {blockWarning && !alert.msg && (
          <div className="form-alert form-alert--error">✕ {blockWarning}</div>
        )}

        <label className="form-label" htmlFor="bk-date">Date *</label>
        <input id="bk-date" type="date"
          className="form-input form-input--green"
          min={todayStr()} max={maxDate}
          value={form.date} onChange={set("date")} />

        {/* Column time pickers */}
        <div className="bk-time-row">
          <div className="bk-time-col">
            <TimePicker
              id="bk-start" label="Start Time *"
              value={form.startTime}
              onChange={handleStartChange}
            />
          </div>
          <div className="bk-time-col">
            <TimePicker
              id="bk-end" label="End Time *"
              value={form.endTime}
              onChange={(val) => setForm((p) => ({ ...p, endTime: val }))}
              minVal={form.startTime}
            />
          </div>
        </div>

        <p className={`bk-hint${dur < 15 ? " bk-hint--error" : ""}`}>
          {dur <= 0 ? "⚠ End time must be after start time"
            : dur < 15 ? "⚠ Minimum booking is 15 minutes"
            : `⏱ Duration: ${durLabel(dur)}`}
        </p>

        <label className="form-label" htmlFor="bk-priority">Priority</label>
        <select id="bk-priority" className="form-input" value={form.priority} onChange={set("priority")}>
          <option value="Low">🟢 Low — Normal request</option>
          <option value="Medium">🟡 Medium — Needs attention</option>
          <option value="High">🔴 High — Urgent</option>
        </select>

        <label className="form-label" htmlFor="bk-notes">
          Notes <span className="form-label__opt">(optional)</span>
        </label>
        <input id="bk-notes" className="form-input"
          placeholder="e.g. Client meeting, team standup, special requirements"
          value={form.notes} onChange={set("notes")} />

        <div className="modal__footer">
          <button className="btn-cancel" onClick={onClose}>Cancel</button>
          <button className="btn-book-confirm" onClick={handleSubmit} disabled={loading || !!blockWarning}>
            {loading ? "Submitting..." : needsApproval ? "Submit Request" : "⚡ Book Now"}
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

  const hasBlock   = !!(room.blockFromDate);
  const blockBadge = hasBlock ? (
    <div style={{
      display:"flex", alignItems:"center", gap:4,
      padding:"4px 10px", borderRadius:20,
      background: room.blockReason === "Deletion" ? "rgba(254,242,242,0.9)" : "rgba(254,249,195,0.9)",
      border:     room.blockReason === "Deletion" ? "1px solid rgba(220,38,38,0.25)" : "1px solid rgba(202,138,4,0.25)",
      fontSize:10, fontWeight:700, fontFamily:"Work Sans, sans-serif",
      color:      room.blockReason === "Deletion" ? "#DC2626" : "#CA8A04",
      marginBottom:8, width:"fit-content",
    }}>
      {room.blockReason === "Deletion" ? "🗑" : "🔧"}{" "}
      {room.blockReason === "Deletion" ? "Removing" : "Maintenance"} from{" "}
      {new Date(room.blockFromDate).toLocaleDateString("en-IN", { day:"2-digit", month:"short", year:"numeric" })}
    </div>
  ) : null;

  return (
    <div className="browse-card">
      <div className={`browse-card__banner browse-card__banner--${color}`} />
      <div className="browse-card__body">
        <div className="browse-card__top">
          <div className="browse-card__icon">🚪</div>
        </div>
        <div className="browse-card__name">{room.name}</div>
        <div className="browse-card__branch">🏢 {room.branchName || room.branch?.name || "—"}</div>
        {blockBadge}
        <div className="browse-card__meta">
          <div className="browse-card__cap">
            <span>👥</span><span>{room.capacity ?? "—"} people</span>
          </div>
          {!(room.approvalRequired ?? true) && (
            <span style={{ fontSize:"11px", fontWeight:600, color:"#16A34A", background:"#DCFCE7", borderRadius:"999px", padding:"2px 8px", marginLeft:"8px" }}>
              ⚡ Instant
            </span>
          )}
        </div>
        {room.description && <p className="browse-card__desc">{room.description}</p>}
        {facilities.length > 0 && (
          <div className="browse-card__facilities">
            {tags.map((f, i) => <span key={i} className="browse-fac-tag">{f.name || f}</span>)}
            {!expanded && extra > 0 && <button className="browse-fac-tag browse-fac-tag--more" onClick={() => setExpanded(true)}>+{extra} more</button>}
            {expanded && <button className="browse-fac-tag browse-fac-tag--more" onClick={() => setExpanded(false)}>Show less ▲</button>}
          </div>
        )}
        <div className="browse-card__footer">
          <button className="btn-book" onClick={() => onBook(room)} disabled={!isAvail}>
            {isAvail
              ? (room.approvalRequired ?? true) ? "📅 Book this Room" : "⚡ Book Instantly"
              : status === "maintenance" ? "🔧 Under Maintenance" : "🚫 Unavailable"}
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
  const [facFilter,   setFacFilter]   = useState("");
  const [sortBy,      setSortBy]      = useState("name");
  const [page,        setPage]        = useState(1);
  const [bookModal,   setBookModal]   = useState(null);

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

  const allFacilities = useMemo(() => {
    const set = new Set();
    Object.values(facilities).forEach(facs =>
      facs.forEach(f => { if (f.name || f) set.add(f.name || f); })
    );
    return [...set].sort();
  }, [facilities]);

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
    if (facFilter)
      list = list.filter((r) => (facilities[r.id] || []).some(f => (f.name || f) === facFilter));
    list.sort((a, b) => {
      if (sortBy === "name")          return (a.name || "").localeCompare(b.name || "");
      if (sortBy === "capacity-asc")  return (a.capacity ?? 0) - (b.capacity ?? 0);
      if (sortBy === "capacity-desc") return (b.capacity ?? 0) - (a.capacity ?? 0);
      return 0;
    });
    setFiltered(list);
    setPage(1);
  }, [search, capacityMin, facFilter, sortBy, rooms, facilities]);

  const paginated  = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const hasFilters = search || capacityMin || facFilter;
  const clearAll   = () => { setSearch(""); setCapacityMin(""); setFacFilter(""); };

  return (
    <div className="browse-page">
      <div className="browse-page__header">
        <div>
          <h2 className="browse-page__title">🚪 Browse Rooms</h2>
          <p className="browse-page__sub">Find and book available meeting rooms</p>
        </div>
      </div>

      <div className="browse-toolbar">
        <div className="browse-search">
          <span className="browse-search__icon">🔍</span>
          <input className="browse-search__input" placeholder="Search by room name..."
            value={search} onChange={(e) => setSearch(e.target.value)} />
          {search && <button className="browse-search__clear" onClick={() => setSearch("")}>✕</button>}
        </div>
        <input type="number" min="1" className="browse-filter-select"
          placeholder="Min capacity" value={capacityMin}
          onChange={(e) => setCapacityMin(e.target.value)} />
        <select className="browse-filter-select" value={facFilter} onChange={(e) => setFacFilter(e.target.value)}>
          <option value="">All Facilities</option>
          {allFacilities.map((f) => <option key={f} value={f}>{f}</option>)}
        </select>
        <select className="browse-filter-select" value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
          <option value="name">Sort: Name A–Z</option>
          <option value="capacity-asc">Sort: Smallest Room</option>
          <option value="capacity-desc">Sort: Largest Room</option>
        </select>
        {hasFilters && <button className="browse-clear-btn" onClick={clearAll}>✕ Clear</button>}
        <span className="browse-count-badge">{filtered.length} {filtered.length === 1 ? "room" : "rooms"}</span>
      </div>

      {error && <div className="form-alert form-alert--error">⚠ {error}</div>}

      <div className="browse-grid">
        {loading ? (
          <div className="browse-loading"><div className="browse-spinner" /><p>Loading rooms...</p></div>
        ) : filtered.length === 0 ? (
          <div className="browse-empty">
            <div className="browse-empty__icon">🚪</div>
            <div className="browse-empty__title">{hasFilters ? "No rooms match your filters" : "No rooms available"}</div>
            <div className="browse-empty__sub">{hasFilters ? "Try clearing your filters" : "Check back later for available rooms"}</div>
          </div>
        ) : (
          paginated.map((room, index) => (
            <BrowseCard key={room.id} room={room}
              index={(page - 1) * PAGE_SIZE + index}
              facilities={facilities[room.id] || []}
              onBook={(r) => setBookModal(r)} />
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