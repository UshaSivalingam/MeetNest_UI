import { useState, useEffect, useCallback, useRef } from "react";
import { RoomAPI }          from "../api/roomAPI";
import { BranchAPI }        from "../api/branchAPI";
import { FacilityAPI }      from "../api/facilityAPI";
import { RoomFacilityAPI }  from "../api/RoomFacilityAPI";
import { NotificationAPI }  from "../api/notificationAPI";
import Pagination           from "../components/Pagination";
import NotificationBell     from "../components/NotificationBell";
import "../styles/RoomManagement.css";

// ─── CONSTANTS ────────────────────────────────────────────────────
const BANNER_COLORS = ["green","blue","yellow","sky","purple","red"];
const EMPTY_FORM    = { name:"", branchId:"", capacity:"", description:"", approvalRequired: true, underMaintenance: false };
function bannerFor(i) { return BANNER_COLORS[i % BANNER_COLORS.length]; }

// ─── HELPERS ─────────────────────────────────────────────────────
function fmtDateDisplay(iso) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-IN", {
    weekday: "short", day: "2-digit", month: "short", year: "numeric",
  });
}
function fmtTime(iso) {
  if (!iso) return "";
  return new Date(iso).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true });
}
function todayPlusOne() {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return d.toISOString().split("T")[0];
}

// ─── ICONS ────────────────────────────────────────────────────────
function RoomIcon({ size = 22, color = "#16A34A" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="2" y="7" width="20" height="14" rx="2" fill={color} fillOpacity="0.12" stroke={color} strokeWidth="1.6"/>
      <path d="M7 21V17a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v4" stroke={color} strokeWidth="1.6" strokeLinecap="round"/>
      <path d="M2 11l10-6 10 6" stroke={color} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
      <circle cx="12" cy="14" r="1.2" fill={color}/>
    </svg>
  );
}

// ─── APPROVAL TOGGLE ──────────────────────────────────────────────
function ApprovalToggle({ value, onChange }) {
  return (
    <div className="apt-wrap">
      <button type="button"
        className={`apt-btn apt-btn--approval${value ? " apt-btn--active" : ""}`}
        onClick={() => onChange(true)}>
        <span className="apt-btn__icon">🔐</span>
        <span className="apt-btn__text">
          <span className="apt-btn__title">Requires Approval</span>
          <span className="apt-btn__sub">Admin reviews each request</span>
        </span>
        {value && <span className="apt-btn__check">✓</span>}
      </button>
      <button type="button"
        className={`apt-btn apt-btn--instant${!value ? " apt-btn--active" : ""}`}
        onClick={() => onChange(false)}>
        <span className="apt-btn__icon">⚡</span>
        <span className="apt-btn__text">
          <span className="apt-btn__title">Instant Booking</span>
          <span className="apt-btn__sub">Auto-confirmed if slot is free</span>
        </span>
        {!value && <span className="apt-btn__check">✓</span>}
      </button>
    </div>
  );
}

// ─── BRANCH DROPDOWN ──────────────────────────────────────────────
function BranchDropdown({ branches, value, onChange }) {
  const [open,      setOpen]      = useState(false);
  const [menuStyle, setMenuStyle] = useState({});
  const triggerRef = useRef(null);
  const menuRef    = useRef(null);

  const selected = branches.find((b) => String(b.id) === String(value));

  const openMenu = () => {
    if (triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      setMenuStyle({ top: rect.bottom + 6, left: rect.left, width: rect.width });
    }
    setOpen(true);
  };

  useEffect(() => {
    if (!open) return;
    const handler = (e) => {
      if (
        triggerRef.current && !triggerRef.current.contains(e.target) &&
        menuRef.current    && !menuRef.current.contains(e.target)
      ) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  return (
    <div className="branch-dropdown">
      <button type="button" ref={triggerRef}
        className={`branch-dropdown__trigger${open ? " branch-dropdown__trigger--open" : ""}`}
        onClick={() => open ? setOpen(false) : openMenu()}>
        {selected
          ? <span style={{ color:"#1e3a5f" }}>{selected.name}</span>
          : <span className="branch-dropdown__placeholder">— Select Branch —</span>
        }
        <span className="branch-dropdown__arrow">▼</span>
      </button>
      {open && (
        <div ref={menuRef} className="branch-dropdown__menu" style={{ ...menuStyle, position:"fixed" }}>
          {branches.length === 0
            ? <div style={{ padding:"12px 14px", fontSize:12, color:"#94A3B8", fontFamily:"monospace", textAlign:"center" }}>No branches found</div>
            : branches.map((b) => {
                const isSel = String(b.id) === String(value);
                return (
                  <div key={b.id}
                    className={`branch-dropdown__item${isSel ? " branch-dropdown__item--selected" : ""}`}
                    onMouseDown={(e) => { e.preventDefault(); onChange(b.id); setOpen(false); }}>
                    <span className="branch-dropdown__item__check">{isSel ? "✓" : ""}</span>
                    <span>{b.name}</span>
                  </div>
                );
              })
          }
        </div>
      )}
    </div>
  );
}

// ─── ROOM MODAL (create / edit) ───────────────────────────────────
function RoomModal({ mode, room, branches, allFacilities, onClose, onSaved, onShowProtected }) {
  const isEdit = mode === "edit";

  const [form, setForm] = useState(isEdit ? {
    name:             room.name             || "",
    branchId:         room.branchId         || room.branch?.id || "",
    capacity:         room.capacity         || "",
    description:      room.description      || "",
    approvalRequired: room.approvalRequired ?? true,
    underMaintenance: room.underMaintenance ?? false,
  } : { ...EMPTY_FORM });

  const [selectedFacIds, setSelectedFacIds] = useState(
    isEdit ? (room.facilities ?? []).map((f) => f.id) : []
  );
  const [facDropOpen,   setFacDropOpen]   = useState(false);
  const [loading,       setLoading]       = useState(false);
  const [alert,         setAlert]         = useState({ msg:"", type:"" });
  const [maintChecking, setMaintChecking] = useState(false);

  const handleMaintenanceToggle = async (newValue) => {
    if (isEdit && newValue === true && !form.underMaintenance) {
      setMaintChecking(true);
      try {
        const bookings = await RoomAPI.getActiveBookings(room.id);
        if (bookings && bookings.length > 0) {
          setMaintChecking(false);
          onShowProtected && onShowProtected(bookings);
          return;
        }
      } catch { }
      setMaintChecking(false);
    }
    setForm((p) => ({ ...p, underMaintenance: newValue }));
  };

  const set = (key) => (e) => setForm((p) => ({ ...p, [key]: e.target.value }));
  const toggleFac = (id) =>
    setSelectedFacIds((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);

  const validate = () => {
    if (!form.name.trim()) return "Room name is required.";
    if (!form.branchId)    return "Please select a branch.";
    if (!form.capacity || isNaN(Number(form.capacity)) || Number(form.capacity) < 1)
      return "Enter a valid capacity (min 1).";
    return null;
  };

  const handleSubmit = async () => {
    setAlert({ msg:"", type:"" });
    const err = validate();
    if (err) return setAlert({ msg: err, type:"error" });
    setLoading(true);
    try {
      const payload = {
        name:             form.name.trim(),
        branchId:         Number(form.branchId),
        capacity:         Number(form.capacity),
        description:      form.description.trim(),
        approvalRequired: form.approvalRequired,
        underMaintenance: form.underMaintenance,
      };
      let roomId;
      if (isEdit) { await RoomAPI.update(room.id, payload); roomId = room.id; }
      else        { roomId = await RoomAPI.create(payload); }

      const prevIds  = (room?.facilities ?? []).map((f) => f.id);
      const toRemove = prevIds.filter((id) => !selectedFacIds.includes(id));
      const toAdd    = selectedFacIds.filter((id) => !prevIds.includes(id));

      await Promise.allSettled([
        ...toAdd.map((fid)    => RoomFacilityAPI.assign({ roomId, facilityId: fid })),
        ...toRemove.map((fid) => RoomFacilityAPI.remove({ roomId, facilityId: fid })),
      ]);

      setAlert({ msg: isEdit ? "Room updated!" : "Room created!", type:"success" });
      setTimeout(onSaved, 700);
    } catch (e) {
      const msg = e.message || "Something went wrong.";
      if (isEdit && msg.startsWith("ROOM_HAS_ACTIVE_BOOKINGS") && onShowProtected) {
        setLoading(false);
        try {
          const bookings = await RoomAPI.getActiveBookings(room.id);
          onShowProtected(bookings);
        } catch {
          setAlert({ msg: "This room has active bookings. Cannot enable maintenance mode.", type:"error" });
        }
        return;
      }
      setAlert({ msg, type:"error" });
    } finally { setLoading(false); }
  };

  const selectedFacilities = allFacilities.filter((f) => selectedFacIds.includes(f.id));

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal modal--room">
        <div className="modal__header">
          <div style={{ display:"flex", alignItems:"center", gap:10 }}>
            <div className="modal__room-icon-wrap"><RoomIcon size={20} color="#16A34A" /></div>
            <h2 className="modal__title">{isEdit ? "Edit Room" : "New Room"}</h2>
          </div>
          <button className="modal__close" onClick={onClose}>✕</button>
        </div>
        <p className="modal__subtitle">
          {isEdit ? `Editing — ${room.name}` : "Add a new meeting room"}
        </p>

        {alert.msg && (
          <div className={`form-alert form-alert--${alert.type}`}>
            {alert.type === "error" ? "✕" : "✓"} {alert.msg}
          </div>
        )}

        <label className="form-label" htmlFor="room-name">Room Name *</label>
        <input id="room-name" className="form-input form-input--green"
          placeholder="e.g. Conference Room A" value={form.name} onChange={set("name")}
          onKeyDown={(e) => e.key === "Enter" && handleSubmit()} />

        <label className="form-label">Branch *</label>
        <BranchDropdown
          branches={branches} value={form.branchId}
          onChange={(id) => setForm((p) => ({ ...p, branchId: id }))}
        />

        <div className="form-row">
          <div>
            <label className="form-label" htmlFor="room-cap">Capacity *</label>
            <input id="room-cap" type="number" min="1" className="form-input form-input--yellow"
              placeholder="e.g. 10" value={form.capacity} onChange={set("capacity")}
              onKeyDown={(e) => e.key === "Enter" && handleSubmit()} />
          </div>
          <div>
            <label className="form-label" htmlFor="room-desc">Description</label>
            <input id="room-desc" className="form-input" placeholder="Optional notes"
              value={form.description} onChange={set("description")}
              onKeyDown={(e) => e.key === "Enter" && handleSubmit()} />
          </div>
        </div>

        <label className="form-label">Facilities</label>
        <div className="fac-dropdown" onBlur={(e) => {
          if (!e.currentTarget.contains(e.relatedTarget)) setFacDropOpen(false);
        }} tabIndex={-1}>
          <button type="button"
            className={`fac-dropdown__trigger${facDropOpen ? " fac-dropdown__trigger--open" : ""}`}
            onClick={() => setFacDropOpen((p) => !p)}>
            <span className="fac-dropdown__preview">
              {selectedFacilities.length === 0
                ? <span style={{ color:"#94A3B8" }}>— Select facilities —</span>
                : selectedFacilities.map((f) => <span key={f.id} className="fac-tag">{f.name}</span>)
              }
            </span>
            <span className="fac-dropdown__arrow">{facDropOpen ? "▲" : "▼"}</span>
          </button>
          {facDropOpen && (
            <div className="fac-dropdown__menu">
              {allFacilities.length === 0
                ? <div className="fac-dropdown__empty">No facilities found</div>
                : allFacilities.map((f) => {
                    const checked = selectedFacIds.includes(f.id);
                    return (
                      <label key={f.id} className={`fac-option${checked ? " fac-option--checked" : ""}`}>
                        <span className="fac-option__check">{checked ? "✓" : ""}</span>
                        <span className="fac-option__name">{f.name}</span>
                        {f.description && <span className="fac-option__desc">{f.description}</span>}
                        <input type="checkbox" checked={checked} onChange={() => toggleFac(f.id)}
                          style={{ display:"none" }} />
                      </label>
                    );
                  })
              }
            </div>
          )}
        </div>
        {selectedFacilities.length > 0 && (
          <div className="fac-selected-row">
            {selectedFacilities.map((f) => (
              <span key={f.id} className="fac-selected-chip">
                {f.name}
                <button type="button" onClick={() => toggleFac(f.id)}>✕</button>
              </span>
            ))}
          </div>
        )}

        <label className="form-label" style={{ marginTop:14 }}>Booking Approval</label>
        <ApprovalToggle
          value={form.approvalRequired}
          onChange={(v) => setForm((p) => ({ ...p, approvalRequired: v }))}
        />

        <label className="form-label" style={{ marginTop:14 }}>Room Status</label>
        <div className="apt-wrap">
          <button type="button"
            className={`apt-btn apt-btn--available${!form.underMaintenance ? " apt-btn--active" : ""}`}
            onClick={() => handleMaintenanceToggle(false)}>
            <span className="apt-btn__icon">✅</span>
            <span className="apt-btn__text">
              <span className="apt-btn__title">Available</span>
              <span className="apt-btn__sub">Room is open for bookings</span>
            </span>
            {!form.underMaintenance && <span className="apt-btn__check">✓</span>}
          </button>
          <button type="button"
            className={`apt-btn apt-btn--maintenance${form.underMaintenance ? " apt-btn--active" : ""}`}
            onClick={() => handleMaintenanceToggle(true)}
            disabled={maintChecking}>
            <span className="apt-btn__icon">{maintChecking ? "⏳" : "🔧"}</span>
            <span className="apt-btn__text">
              <span className="apt-btn__title">Under Maintenance</span>
              <span className="apt-btn__sub">{maintChecking ? "Checking active bookings…" : "Blocks all new bookings"}</span>
            </span>
            {form.underMaintenance && !maintChecking && <span className="apt-btn__check">✓</span>}
          </button>
        </div>

        <div className="modal__footer" style={{ marginTop:20 }}>
          <button className="btn-cancel" onClick={onClose}>Cancel</button>
          <button className="btn-save-room" onClick={handleSubmit} disabled={loading}>
            {loading ? "Saving..." : isEdit ? "Save Changes" : "Create Room"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── PROTECTED ROOM MODAL ─────────────────────────────────────────
function ProtectedRoomModal({ room, activeBookings, onClose, onBlockSet }) {
  const [reminderStatus, setReminderStatus] = useState({});

  // Block date section state
  const [blockDate,    setBlockDate]    = useState("");
  const [blockReason,  setBlockReason]  = useState("Maintenance");
  const [blockLoading, setBlockLoading] = useState(false);
  const [blockAlert,   setBlockAlert]   = useState({ msg:"", type:"" });
  const [blockIsSet,   setBlockIsSet]   = useState(
    !!(room.blockFromDate)
  );
  const [currentBlock, setCurrentBlock] = useState(
    room.blockFromDate
      ? { date: room.blockFromDate, reason: room.blockReason }
      : null
  );
  const [removeLoading, setRemoveLoading] = useState(false);

  const latestBooking = activeBookings.reduce((latest, b) =>
    !latest || new Date(b.endTime) > new Date(latest.endTime) ? b : latest, null);

  const handleReminder = async (bookingId) => {
    setReminderStatus((prev) => ({ ...prev, [bookingId]: "loading" }));
    try {
      await NotificationAPI.createReminder(bookingId);
      setReminderStatus((prev) => ({ ...prev, [bookingId]: "done" }));
    } catch {
      setReminderStatus((prev) => ({ ...prev, [bookingId]: "error" }));
    }
  };

  const handleSetBlock = async () => {
    setBlockAlert({ msg:"", type:"" });
    if (!blockDate) return setBlockAlert({ msg:"Please select a block date.", type:"error" });
    setBlockLoading(true);
    try {
      await RoomAPI.setBlockDate(room.id, { blockFromDate: blockDate, reason: blockReason });
      const displayDate = new Date(blockDate).toLocaleDateString("en-IN", { day:"2-digit", month:"short", year:"numeric" });
      setBlockAlert({ msg:`Block set! No new bookings from ${displayDate} — ${blockReason}.`, type:"success" });
      setBlockIsSet(true);
      setCurrentBlock({ date: blockDate, reason: blockReason });
      onBlockSet && onBlockSet();
    } catch (e) {
      setBlockAlert({ msg: e.message || "Failed to set block date.", type:"error" });
    } finally {
      setBlockLoading(false);
    }
  };

  const handleRemoveBlock = async () => {
    setBlockAlert({ msg:"", type:"" });
    setRemoveLoading(true);
    try {
      await RoomAPI.removeBlockDate(room.id);
      setBlockAlert({ msg:"Block removed. Room is fully open for bookings again.", type:"success" });
      setBlockIsSet(false);
      setCurrentBlock(null);
      onBlockSet && onBlockSet();
    } catch (e) {
      setBlockAlert({ msg: e.message || "Failed to remove block.", type:"error" });
    } finally {
      setRemoveLoading(false);
    }
  };

  const priorityColor = { High:"#DC2626", Medium:"#CA8A04", Low:"#16A34A" };
  const statusColor   = { Approved:"#16A34A", Pending:"#CA8A04" };

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal modal--protected">

        {/* Header */}
        <div className="modal__header">
          <h2 className="modal__title" style={{ color:"#CA8A04" }}>🔒 Room Protected</h2>
          <button className="modal__close" onClick={onClose}>✕</button>
        </div>

        {/* Explanation */}
        <div className="protected-alert">
          <div className="protected-alert__icon">⚠️</div>
          <div className="protected-alert__body">
            <strong>{room.name}</strong> cannot be modified right now.
            <div style={{ fontSize:12, color:"#64748B", marginTop:3, fontFamily:"monospace" }}>
              It has {activeBookings.length} active booking{activeBookings.length !== 1 ? "s" : ""} that must complete first.
            </div>
          </div>
        </div>

        {/* Active bookings list */}
        <div className="protected-bookings">
          <div className="protected-bookings__title">Active Bookings</div>
          {activeBookings.map((b) => {
            const rs = reminderStatus[b.id];
            return (
              <div key={b.id} className="protected-booking-item">
                <div className="protected-booking-item__info">
                  <div style={{ fontFamily:"Georgia,serif", fontSize:13, fontWeight:"bold", color:"#1e3a5f" }}>
                    {b.employeeName}
                  </div>
                  <div style={{ fontFamily:"monospace", fontSize:11, color:"#64748B", marginTop:2 }}>
                    <span style={{ color: statusColor[b.status] || "#64748B" }}>● {b.status}</span>
                    {" · "}
                    <span style={{ color: priorityColor[b.priority] || "#64748B" }}>{b.priority} Priority</span>
                  </div>
                  <div style={{ fontFamily:"monospace", fontSize:11, color:"#94A3B8", marginTop:2 }}>
                    📅 {fmtDateDisplay(b.startTime)} · ⏱ {fmtTime(b.startTime)} – {fmtTime(b.endTime)}
                  </div>
                  {b.notes && (
                    <div style={{ fontSize:11, color:"#94A3B8", fontStyle:"italic", marginTop:2 }}>"{b.notes}"</div>
                  )}
                </div>
                <button
                  className={`btn-set-reminder${rs === "done" ? " btn-set-reminder--done" : ""}`}
                  onClick={() => handleReminder(b.id)}
                  disabled={rs === "loading" || rs === "done"}
                  title="Get notified when this meeting ends">
                  {rs === "loading" ? "..." : rs === "done" ? "✓ Set" : rs === "error" ? "⚠ Retry" : "🔔 Remind me"}
                </button>
              </div>
            );
          })}
        </div>

        {/* What to do tip */}
        {latestBooking && (
          <div className="protected-tip">
            <span>💡</span>
            <span>
              The latest booking ends at {fmtTime(latestBooking.endTime)} on {fmtDateDisplay(latestBooking.endTime)}.
              You can set a block date to prevent new bookings from a certain date onwards.
            </span>
          </div>
        )}

        {/* ── BLOCK DATE SECTION ─────────────────────────────────── */}
        <div className="block-section">
          <div className="block-section__title">
            🗓 Schedule Block Date
          </div>
          <div className="block-section__desc">
            From this date onwards, no new bookings will be accepted. Existing bookings before this date are not affected.
          </div>

          {blockAlert.msg && (
            <div className={`form-alert form-alert--${blockAlert.type}`} style={{ marginBottom:10 }}>
              {blockAlert.type === "error" ? "✕" : "✓"} {blockAlert.msg}
            </div>
          )}

          {/* If block is already set — show current block info + remove option */}
          {blockIsSet && currentBlock ? (
            <div className="block-current">
              <div className="block-current__info">
                <span className={`block-current__badge block-current__badge--${currentBlock.reason?.toLowerCase()}`}>
                  {currentBlock.reason === "Deletion" ? "🗑" : "🔧"} {currentBlock.reason}
                </span>
                <span className="block-current__date">
                  Blocked from {new Date(currentBlock.date).toLocaleDateString("en-IN", { day:"2-digit", month:"short", year:"numeric" })}
                </span>
              </div>
              <button
                className="btn-remove-block"
                onClick={handleRemoveBlock}
                disabled={removeLoading}>
                {removeLoading ? "Removing..." : "✕ Remove Block"}
              </button>
            </div>
          ) : (
            /* Block date form */
            <div className="block-form">
              <div className="block-form__row">
                <div className="block-form__col">
                  <label className="form-label" htmlFor="block-date">Block From Date *</label>
                  <input
                    id="block-date"
                    type="date"
                    className="form-input"
                    min={todayPlusOne()}
                    value={blockDate}
                    onChange={(e) => setBlockDate(e.target.value)}
                  />
                </div>
                <div className="block-form__col">
                  <label className="form-label" htmlFor="block-reason">Reason *</label>
                  <select
                    id="block-reason"
                    className="form-input"
                    value={blockReason}
                    onChange={(e) => setBlockReason(e.target.value)}>
                    <option value="Maintenance">🔧 Going for Maintenance</option>
                    <option value="Deletion">🗑 Going to be Deleted</option>
                  </select>
                </div>
              </div>
              <button
                className="btn-set-block"
                onClick={handleSetBlock}
                disabled={blockLoading || !blockDate}>
                {blockLoading ? "Setting..." : "🗓 Set Block Date"}
              </button>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="modal__footer">
          <button className="btn-save-room" onClick={onClose}>Got it</button>
        </div>
      </div>
    </div>
  );
}

// ─── DELETE MODAL ─────────────────────────────────────────────────
function DeleteModal({ room, onClose, onDeleted, onShowProtected }) {
  const [phase, setPhase] = useState("checking");
  const [error, setError] = useState("");

  useEffect(() => {
    async function check() {
      try {
        const bookings = await RoomAPI.getActiveBookings(room.id);
        if (bookings && bookings.length > 0) {
          onShowProtected(bookings);
        } else {
          setPhase("confirm");
        }
      } catch {
        setPhase("confirm");
      }
    }
    check();
  }, [room.id, onShowProtected]);

  const handleDelete = async () => {
    setPhase("deleting");
    setError("");
    try {
      await RoomAPI.delete(room.id);
      onDeleted();
    } catch (e) {
      const msg = e.message || "Delete failed.";
      if (msg.startsWith("ROOM_HAS_ACTIVE_BOOKINGS")) {
        onShowProtected([]);
      } else {
        setError(msg);
        setPhase("confirm");
      }
    }
  };

  if (phase === "checking") {
    return (
      <div className="modal-overlay">
        <div className="modal">
          <div className="modal__header">
            <h2 className="modal__title" style={{ color:"#DC2626" }}>🗑️ Delete Room</h2>
            <button className="modal__close" onClick={onClose}>✕</button>
          </div>
          <div style={{ display:"flex", flexDirection:"column", alignItems:"center", padding:"32px", gap:12 }}>
            <div className="room-spinner" />
            <p style={{ fontFamily:"monospace", fontSize:12, color:"#94A3B8" }}>Checking for active bookings…</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal__header">
          <h2 className="modal__title" style={{ color:"#DC2626" }}>🗑️ Delete Room</h2>
          <button className="modal__close" onClick={onClose}>✕</button>
        </div>
        <p className="modal__subtitle">This action cannot be undone.</p>
        {error && <div className="form-alert form-alert--error">✕ {error}</div>}
        <p style={{ fontFamily:"Georgia,serif", fontSize:15, color:"#1e3a5f", marginBottom:6 }}>
          Are you sure you want to delete:
        </p>
        <p style={{
          fontFamily:"Georgia,serif", fontSize:17, fontWeight:"bold", color:"#DC2626",
          padding:"10px 14px", background:"rgba(254,242,242,0.7)", borderRadius:10,
          border:"1px solid rgba(239,68,68,0.2)", marginBottom:8,
          display:"flex", alignItems:"center", gap:8,
        }}>
          <RoomIcon size={18} color="#DC2626" /> {room.name}
        </p>
        <p style={{ fontSize:12, color:"#94A3B8", fontFamily:"monospace", marginBottom:24 }}>
          🏢 {room.branchName || room.branch?.name || "—"} · 👥 Capacity {room.capacity ?? "—"}
        </p>
        <div className="modal__footer">
          <button className="btn-cancel" onClick={onClose}>Cancel</button>
          <button className="btn-delete-confirm" onClick={handleDelete} disabled={phase === "deleting"}>
            {phase === "deleting" ? "Deleting..." : "Yes, Delete"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── ROOM CARD ────────────────────────────────────────────────────
function RoomCard({ room, index, onEdit, onDelete }) {
  const color = bannerFor(index);
  const [expanded, setExpanded] = useState(false);
  const facilities = room.facilities ?? room.Facilities ?? [];
  const LIMIT = 3;
  const tags  = expanded ? facilities : facilities.slice(0, LIMIT);
  const extra = facilities.length - LIMIT;

  const iconTints  = { green:"rgba(22,163,74,0.12)", blue:"rgba(37,99,235,0.12)", yellow:"rgba(202,138,4,0.12)", sky:"rgba(2,132,199,0.12)", purple:"rgba(124,58,237,0.12)", red:"rgba(220,38,38,0.12)" };
  const iconColors = { green:"#16A34A", blue:"#2563EB", yellow:"#CA8A04", sky:"#0284C7", purple:"#7C3AED", red:"#DC2626" };
  const tint   = iconTints[color]  || iconTints.green;
  const icolor = iconColors[color] || iconColors.green;

  // Block badge
  const hasBlock = !!(room.blockFromDate);
  const blockLabel = hasBlock
    ? room.blockReason === "Deletion"
      ? `🗑 Removing from ${new Date(room.blockFromDate).toLocaleDateString("en-IN", { day:"2-digit", month:"short" })}`
      : `🔧 Maintenance from ${new Date(room.blockFromDate).toLocaleDateString("en-IN", { day:"2-digit", month:"short" })}`
    : null;

  return (
    <div className="room-card">
      <div className={`room-card__banner room-card__banner--${color}`} />
      <div className="room-card__body">
        <div className="room-card__top">
          <div className="room-card__icon-wrap" style={{ background: tint }}>
            <RoomIcon size={22} color={icolor} />
          </div>
          <div style={{ display:"flex", alignItems:"center", gap:6 }}>
            {hasBlock && (
              <span style={{
                fontSize:10, fontWeight:700, padding:"2px 8px", borderRadius:20,
                background: room.blockReason === "Deletion" ? "rgba(254,242,242,0.9)" : "rgba(254,249,195,0.9)",
                color:      room.blockReason === "Deletion" ? "#DC2626" : "#CA8A04",
                border:     room.blockReason === "Deletion" ? "1px solid rgba(220,38,38,0.2)" : "1px solid rgba(202,138,4,0.2)",
                fontFamily:"Work Sans, sans-serif", whiteSpace:"nowrap",
              }}>
                {blockLabel}
              </span>
            )}
            <div className="room-card__actions">
              <button className="room-card__action-btn room-card__action-btn--edit"
                onClick={() => onEdit(room)} title="Edit">✏️</button>
              <button className="room-card__action-btn room-card__action-btn--delete"
                onClick={() => onDelete(room)} title="Delete">🗑️</button>
            </div>
          </div>
        </div>

        <div className="room-card__name">{room.name}</div>
        <div className="room-card__branch">🏢 {room.branchName || room.branch?.name || "—"}</div>
        <div className="room-card__meta">
          <div className="room-card__cap">
            <span className="room-card__cap-icon">👥</span>
            <span>{room.capacity ?? "—"} people</span>
          </div>
          <span className={`approval-badge ${room.approvalRequired ? "approval-badge--required" : "approval-badge--instant"}`}>
            {room.approvalRequired ? "🔐 Approval" : "⚡ Instant"}
          </span>
        </div>
        {room.description && (
          <p style={{ fontSize:12, color:"#94A3B8", fontFamily:"Georgia,serif", marginBottom:10, lineHeight:1.5 }}>
            {room.description}
          </p>
        )}
        {facilities.length > 0 && (
          <div className="room-card__facilities">
            {tags.map((f, i) => <span key={i} className="room-facility-tag">{f.name || f}</span>)}
            {extra > 0 && !expanded && (
              <button className="room-facility-tag room-facility-tag--more"
                onClick={() => setExpanded(true)}>+{extra} more</button>
            )}
            {expanded && (
              <button className="room-facility-tag room-facility-tag--more"
                onClick={() => setExpanded(false)}>Show less ▲</button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── STAT CARD ────────────────────────────────────────────────────
function StatCard({ value, label, icon, color, border, onClick, active }) {
  return (
    <div className="room-stat-card"
      style={{
        borderColor: active ? color : border,
        cursor:      onClick ? "pointer" : "default",
        outline:     active ? `2px solid ${color}` : "2px solid transparent",
        userSelect:  "none",
      }}
      onClick={onClick}>
      <div className="room-stat-card__glow" style={{ background: color }} />
      <div className="room-stat-card__icon" style={{ background: `${color}1a`, color }}>
        {icon}
      </div>
      <div className="room-stat-card__info">
        <div className="room-stat-card__value" style={{ color }}>{value}</div>
        <div className="room-stat-card__label">{label}</div>
      </div>
      {onClick && (
        <div className="room-stat-card__hint" style={{ color: active ? color : "#CBD5E1" }}>
          {active ? "✓ active" : "click to filter"}
        </div>
      )}
    </div>
  );
}

// ─── MAIN PAGE ────────────────────────────────────────────────────
const PAGE_SIZE = 8;

export default function RoomManagement() {
  const [rooms,          setRooms]          = useState([]);
  const [filtered,       setFiltered]       = useState([]);
  const [branches,       setBranches]       = useState([]);
  const [allFacilities,  setAllFacilities]  = useState([]);
  const [loading,        setLoading]        = useState(true);
  const [error,          setError]          = useState("");
  const [search,         setSearch]         = useState("");
  const [branchFilter,   setBranchFilter]   = useState("all");
  const [approvalFilter, setApprovalFilter] = useState("all");
  const [sortBy,         setSortBy]         = useState("name");
  const [page,           setPage]           = useState(1);
  const [modal,          setModal]          = useState(null);

  const fetchAll = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const [roomsRes, branchesRes, facRes] = await Promise.allSettled([
        RoomAPI.getAll(),
        BranchAPI.getSimple(),
        FacilityAPI.getAll(),
      ]);
      const roomList   = roomsRes.status    === "fulfilled" ? (Array.isArray(roomsRes.value)    ? roomsRes.value    : (roomsRes.value?.items    ?? [])) : [];
      const branchList = branchesRes.status === "fulfilled" ? (Array.isArray(branchesRes.value) ? branchesRes.value : (branchesRes.value?.items ?? [])) : [];
      const facList    = facRes.status      === "fulfilled" ? (Array.isArray(facRes.value)      ? facRes.value      : (facRes.value?.items      ?? [])) : [];
      setRooms(roomList);
      setBranches(branchList);
      setAllFacilities(facList);
    } catch (e) { setError(e.message || "Failed to load rooms."); }
    finally     { setLoading(false); }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  useEffect(() => {
    let list = [...rooms];
    if (branchFilter !== "all")
      list = list.filter((r) => String(r.branchId) === String(branchFilter) || String(r.branch?.id) === String(branchFilter));
    if (approvalFilter === "required") list = list.filter((r) => r.approvalRequired === true);
    if (approvalFilter === "instant")  list = list.filter((r) => r.approvalRequired === false);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((r) =>
        r.name?.toLowerCase().includes(q) ||
        r.branchName?.toLowerCase().includes(q) ||
        r.branch?.name?.toLowerCase().includes(q) ||
        String(r.capacity).includes(q));
    }
    list.sort((a, b) => {
      if (sortBy === "name")     return (a.name || "").localeCompare(b.name || "");
      if (sortBy === "capacity") return (b.capacity ?? 0) - (a.capacity ?? 0);
      return 0;
    });
    setFiltered(list);
    setPage(1);
  }, [search, branchFilter, approvalFilter, sortBy, rooms]);

  const paginated     = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const totalApproval = rooms.filter((r) =>  r.approvalRequired).length;
  const totalInstant  = rooms.filter((r) => !r.approvalRequired).length;

  const openAdd    = ()     => setModal({ type:"add" });
  const openEdit   = (room) => setModal({ type:"edit",   room });
  const openDelete = (room) => setModal({ type:"delete", room });
  const closeModal = ()     => setModal(null);
  const handleSaved   = () => { closeModal(); fetchAll(); };
  const handleDeleted = () => { closeModal(); fetchAll(); };

  const handleShowProtected = (room, activeBookings) =>
    setModal({ type:"protected", room, activeBookings });

  const handleApprovalStatClick = (filterValue) =>
    setApprovalFilter((prev) => prev === filterValue ? "all" : filterValue);

  const hasFilters = search || branchFilter !== "all" || approvalFilter !== "all";
  const clearAll   = () => { setSearch(""); setBranchFilter("all"); setApprovalFilter("all"); };

  return (
    <div className="room-page">

      <div className="room-page__header">
        <div>
          <h2 className="room-page__title">
            <span className="room-page__title-icon"><RoomIcon size={26} color="#16A34A" /></span>
            Room Management
          </h2>
          <p className="room-page__sub">Create and manage meeting rooms across all branches</p>
        </div>
        <div style={{ display:"flex", alignItems:"center", gap:"12px" }}>
          <div style={{
            display:"flex", alignItems:"center", justifyContent:"center",
            width:"42px", height:"42px", borderRadius:"14px",
            border:"1.5px solid rgba(59,130,246,0.12)",
            background:"rgba(255,255,255,0.95)",
            backdropFilter:"blur(12px)", WebkitBackdropFilter:"blur(12px)",
            boxShadow:"0 4px 16px rgba(59,130,246,0.10), inset 0 1px 0 rgba(255,255,255,1)",
          }}>
            <NotificationBell />
          </div>
          <button className="btn-add-room" onClick={openAdd}><span>+</span> Add Room</button>
        </div>
      </div>

      <div className="room-stats-grid">
        <StatCard
          value={loading ? "—" : rooms.length} label="Total Rooms"
          icon={<RoomIcon size={20} color="#2563EB" />}
          color="#2563EB" border="rgba(59,130,246,0.18)"
          onClick={() => { setApprovalFilter("all"); setBranchFilter("all"); setSearch(""); }}
          active={approvalFilter === "all" && branchFilter === "all" && search === ""}
        />
        <StatCard
          value={loading ? "—" : totalApproval} label="Requires Approval" icon="🔐"
          color="#92400E" border="rgba(217,119,6,0.20)"
          onClick={() => handleApprovalStatClick("required")}
          active={approvalFilter === "required"}
        />
        <StatCard
          value={loading ? "—" : totalInstant} label="Instant Booking" icon="⚡"
          color="#065F46" border="rgba(22,163,74,0.20)"
          onClick={() => handleApprovalStatClick("instant")}
          active={approvalFilter === "instant"}
        />
        <StatCard
          value={loading ? "—" : allFacilities.length} label="Facilities Available" icon="🔧"
          color="#6D28D9" border="rgba(124,58,237,0.18)"
        />
      </div>

      <div className="room-toolbar">
        <div className="room-search">
          <span className="room-search__icon">🔍</span>
          <input className="room-search__input" placeholder="Search rooms..."
            value={search} onChange={(e) => setSearch(e.target.value)} />
          {search && (
            <button className="room-search__clear" onClick={() => setSearch("")}>✕</button>
          )}
        </div>
        <select className="room-filter-select" value={branchFilter}
          onChange={(e) => setBranchFilter(e.target.value)}>
          <option value="all">All Branches</option>
          {branches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
        </select>
        <select className="room-filter-select" value={approvalFilter}
          onChange={(e) => setApprovalFilter(e.target.value)}>
          <option value="all">All Booking Types</option>
          <option value="required">🔐 Requires Approval</option>
          <option value="instant">⚡ Instant Booking</option>
        </select>
        <select className="room-filter-select" value={sortBy}
          onChange={(e) => setSortBy(e.target.value)}>
          <option value="name">Sort: Name A–Z</option>
          <option value="capacity">Sort: Capacity ↓</option>
        </select>
        {hasFilters && (
          <button className="room-clear-btn" onClick={clearAll}>✕ Clear</button>
        )}
        <span className="room-count-badge">
          {filtered.length} {filtered.length === 1 ? "room" : "rooms"}
        </span>
      </div>

      {error && <div className="form-alert form-alert--error">⚠ {error}</div>}

      <div className="room-grid">
        {loading ? (
          <div className="room-loading"><div className="room-spinner" /><p>Loading rooms...</p></div>
        ) : filtered.length === 0 ? (
          <div className="room-empty">
            <div className="room-empty__icon"><RoomIcon size={52} color="#CBD5E1" /></div>
            <div className="room-empty__title">{hasFilters ? "No rooms match your filters" : "No rooms yet"}</div>
            <div className="room-empty__sub">{hasFilters ? "Try clearing your filters" : "Click 'Add Room' to create your first room"}</div>
          </div>
        ) : (
          paginated.map((room, i) => (
            <RoomCard key={room.id} room={room}
              index={(page - 1) * PAGE_SIZE + i}
              onEdit={openEdit} onDelete={openDelete} />
          ))
        )}
      </div>

      <Pagination current={page} total={filtered.length} pageSize={PAGE_SIZE} onChange={setPage} />

      {modal?.type === "add" && (
        <RoomModal mode="add" branches={branches} allFacilities={allFacilities}
          onClose={closeModal} onSaved={handleSaved} />
      )}
      {modal?.type === "edit" && (
        <RoomModal mode="edit" room={modal.room} branches={branches} allFacilities={allFacilities}
          onClose={closeModal} onSaved={handleSaved}
          onShowProtected={(bookings) => handleShowProtected(modal.room, bookings)}
        />
      )}
      {modal?.type === "delete" && (
        <DeleteModal
          room={modal.room}
          onClose={closeModal}
          onDeleted={handleDeleted}
          onShowProtected={(bookings) => handleShowProtected(modal.room, bookings)}
        />
      )}
      {modal?.type === "protected" && (
        <ProtectedRoomModal
          room={modal.room}
          activeBookings={modal.activeBookings}
          onClose={closeModal}
          onBlockSet={fetchAll}
        />
      )}
    </div>
  );
}