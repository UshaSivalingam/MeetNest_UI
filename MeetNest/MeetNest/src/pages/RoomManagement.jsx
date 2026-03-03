// src/pages/RoomManagement.jsx

import { useState, useEffect, useCallback } from "react";
//import { RoomAPI, BranchAPI, RoomFacilityAPI } from "../api/apiService";
import { RoomAPI } from "../api/roomAPI";
import { BranchAPI } from "../api/branchAPI";
import { RoomFacilityAPI } from "../api/RoomFacilityAPI";
import Pagination from "../components/Pagination";
import "../styles/RoomManagement.css";

// ─── CONSTANTS ───────────────────────────────────────────────────
const BANNER_COLORS = ["green","blue","yellow","sky","purple","red"];
const STATUSES      = ["Available","Unavailable","Maintenance"];
const EMPTY_FORM    = { name:"", branchId:"", capacity:"", status:"Available", description:"" };

function bannerFor(i)  { return BANNER_COLORS[i % BANNER_COLORS.length]; }

// ─── ROOM FORM MODAL ─────────────────────────────────────────────
function RoomModal({ mode, room, branches, onClose, onSaved }) {
  const isEdit = mode === "edit";

  const [form, setForm] = useState(isEdit ? {
    name:        room.name        || "",
    branchId:    room.branchId    || room.branch?.id || "",
    capacity:    room.capacity    || "",
    status:      room.status      || "Available",
    description: room.description || "",
  } : { ...EMPTY_FORM });

  const [loading, setLoading] = useState(false);
  const [alert,   setAlert]   = useState({ msg:"", type:"" });

  const set    = (key) => (e) => setForm((p) => ({ ...p, [key]: e.target.value }));
  const setVal = (key, val)   => setForm((p) => ({ ...p, [key]: val }));

  const validate = () => {
    if (!form.name.trim())       return "Room name is required.";
    if (!form.branchId)          return "Please select a branch.";
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
        name:        form.name.trim(),
        branchId:    form.branchId,
        capacity:    Number(form.capacity),
        status:      form.status,
        description: form.description.trim(),
      };
      if (isEdit) {
        await RoomAPI.update(room.id, payload);
      } else {
        await RoomAPI.create(payload);
      }
      setAlert({ msg: isEdit ? "Room updated!" : "Room created!", type:"success" });
      setTimeout(onSaved, 800);
    } catch (e) {
      setAlert({ msg: e.message || "Something went wrong.", type:"error" });
    } finally {
      setLoading(false);
    }
  };

  const handleKey = (e) => { if (e.key === "Enter") handleSubmit(); };

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal">

        <div className="modal__header">
          <h2 className="modal__title">{isEdit ? "✏️ Edit Room" : "🚪 New Room"}</h2>
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

        {/* Room Name */}
        <label className="form-label" htmlFor="room-name">Room Name *</label>
        <input id="room-name" className="form-input form-input--green"
          placeholder="e.g. Conference Room A"
          value={form.name} onChange={set("name")} onKeyDown={handleKey} />

        {/* Branch */}
        <label className="form-label" htmlFor="room-branch">Branch *</label>
        <select id="room-branch" className="form-select"
          value={form.branchId} onChange={set("branchId")}>
          <option value="">— Select Branch —</option>
          {branches.map((b) => (
            <option key={b.id} value={b.id}>{b.name}</option>
          ))}
        </select>

        {/* Capacity + Description side by side */}
        <div className="form-row">
          <div>
            <label className="form-label" htmlFor="room-cap">Capacity *</label>
            <input id="room-cap" type="number" min="1"
              className="form-input form-input--yellow"
              placeholder="e.g. 10"
              value={form.capacity} onChange={set("capacity")} onKeyDown={handleKey} />
          </div>
          <div>
            <label className="form-label" htmlFor="room-desc">Description</label>
            <input id="room-desc" className="form-input"
              placeholder="Optional notes"
              value={form.description} onChange={set("description")} onKeyDown={handleKey} />
          </div>
        </div>

        {/* Status toggle */}
        <label className="form-label">Status</label>
        <div className="status-toggle">
          {STATUSES.map((s) => (
            <button
              key={s}
              type="button"
              className={`status-toggle-btn${
                form.status === s
                  ? ` status-toggle-btn--active-${s.toLowerCase()}`
                  : ""
              }`}
              onClick={() => setVal("status", s)}
            >
              {s === "Available" ? "✅" : s === "Unavailable" ? "🚫" : "🔧"} {s}
            </button>
          ))}
        </div>

        <div className="modal__footer" style={{ marginTop: 16 }}>
          <button className="btn-cancel" onClick={onClose}>Cancel</button>
          <button className="btn-save-room" onClick={handleSubmit} disabled={loading}>
            {loading ? "Saving..." : isEdit ? "Save Changes" : "Create Room"}
          </button>
        </div>

      </div>
    </div>
  );
}

// ─── DELETE CONFIRM MODAL ─────────────────────────────────────────
function DeleteModal({ room, onClose, onDeleted }) {
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState("");

  const handleDelete = async () => {
    setLoading(true);
    setError("");
    try {
      await RoomAPI.delete(room.id);
      onDeleted();
    } catch (e) {
      setError(e.message || "Delete failed.");
      setLoading(false);
    }
  };

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
          padding:"10px 14px", background:"rgba(254,242,242,0.7)",
          borderRadius:10, border:"1px solid rgba(239,68,68,0.2)", marginBottom:8,
        }}>
          🚪 {room.name}
        </p>
        <p style={{ fontSize:12, color:"#94A3B8", fontFamily:"monospace", marginBottom:24 }}>
          🏢 {room.branchName || room.branch?.name || "—"}  ·  👥 Capacity {room.capacity ?? "—"}
        </p>

        <div className="modal__footer">
          <button className="btn-cancel" onClick={onClose}>Cancel</button>
          <button className="btn-delete-confirm" onClick={handleDelete} disabled={loading}>
            {loading ? "Deleting..." : "Yes, Delete"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── ROOM CARD ────────────────────────────────────────────────────
function RoomCard({ room, index, facilities, onEdit, onDelete }) {
  const color    = bannerFor(index);
  const status   = (room.status || "Available").toLowerCase();
  const [expanded, setExpanded] = useState(false);

  const LIMIT   = 3;
  const tags    = expanded ? facilities : facilities.slice(0, LIMIT);
  const extra   = facilities.length - LIMIT;

  return (
    <div className="room-card">
      <div className={`room-card__banner room-card__banner--${color}`} />
      <div className="room-card__body">

        <div className="room-card__top">
          <div className="room-card__icon-wrap">🚪</div>
          <div className="room-card__actions">
            <button className="room-card__action-btn room-card__action-btn--edit"
              onClick={() => onEdit(room)} title="Edit room">✏️</button>
            <button className="room-card__action-btn room-card__action-btn--delete"
              onClick={() => onDelete(room)} title="Delete room">🗑️</button>
          </div>
        </div>

        <div className="room-card__name">{room.name}</div>
        <div className="room-card__branch">
          🏢 {room.branchName || room.branch?.name || "—"}
        </div>

        <div className="room-card__meta">
          <div className="room-card__cap">
            <span className="room-card__cap-icon">👥</span>
            <span>{room.capacity ?? "—"} people</span>
          </div>
          <span className={`room-status room-status--${status}`}>
            {status === "available"   ? "✅ Available"    :
             status === "unavailable" ? "🚫 Unavailable"  :
                                        "🔧 Maintenance"  }
          </span>
        </div>

        {room.description && (
          <p style={{ fontSize:12, color:"#94A3B8", fontFamily:"Georgia,serif",
            marginBottom:10, lineHeight:1.5 }}>
            {room.description}
          </p>
        )}

        {facilities.length > 0 && (
          <div className="room-card__facilities">
            {tags.map((f, i) => (
              <span key={i} className="room-facility-tag">
                {f.name || f}
              </span>
            ))}
            {/* Toggle button — shows "+N more" or "Show less" */}
            {extra > 0 && !expanded && (
              <button
                className="room-facility-tag room-facility-tag--more"
                onClick={() => setExpanded(true)}
                title="Show all facilities"
              >
                +{extra} more
              </button>
            )}
            {expanded && (
              <button
                className="room-facility-tag room-facility-tag--more"
                onClick={() => setExpanded(false)}
                title="Collapse"
              >
                Show less ▲
              </button>
            )}
          </div>
        )}

      </div>
    </div>
  );
}

// ─── MAIN PAGE ────────────────────────────────────────────────────
const PAGE_SIZE = 6;

export default function RoomManagement() {
  const [rooms,        setRooms]        = useState([]);
  const [filtered,     setFiltered]     = useState([]);
  const [branches,     setBranches]     = useState([]);
  const [facilities,   setFacilities]   = useState({});
  const [loading,      setLoading]      = useState(true);
  const [error,        setError]        = useState("");
  const [search,       setSearch]       = useState("");
  const [branchFilter, setBranchFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sortBy,       setSortBy]       = useState("name");
  const [page,         setPage]         = useState(1);
  const [modal,        setModal]        = useState(null);

  // ── Fetch ────────────────────────────────────────────────────
 const fetchAll = useCallback(async () => {
  setLoading(true);
  setError("");

  try {
    const [roomsRes, branchesRes] = await Promise.allSettled([
      RoomAPI.getAll(),
      BranchAPI.getAll(),
    ]);

    const roomList =
      roomsRes.status === "fulfilled"
        ? (roomsRes.value || [])
        : [];

    const branchList =
      branchesRes.status === "fulfilled"
        ? (branchesRes.value || [])
        : [];

    setRooms(Array.isArray(roomList) ? roomList : []);
    setBranches(Array.isArray(branchList) ? branchList : []);

    const facMap = {};

    await Promise.allSettled(
      roomList.map(async (r) => {
        try {
          const facs = await RoomFacilityAPI.getByRoom(r.id);
          facMap[r.id] = Array.isArray(facs) ? facs : [];
        } catch {
          facMap[r.id] = [];
        }
      })
    );

    setFacilities(facMap);
  } catch (e) {
    setError(e.message || "Failed to load rooms.");
  } finally {
    setLoading(false);
  }
}, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  // ── Filter + sort → reset page ───────────────────────────────
  useEffect(() => {
    let list = [...rooms];
    if (branchFilter !== "all")
      list = list.filter((r) =>
        String(r.branchId) === String(branchFilter) ||
        String(r.branch?.id) === String(branchFilter));
    if (statusFilter !== "all")
      list = list.filter((r) =>
        (r.status || "Available").toLowerCase() === statusFilter.toLowerCase());
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((r) =>
        r.name?.toLowerCase().includes(q) ||
        r.branchName?.toLowerCase().includes(q) ||
        r.branch?.name?.toLowerCase().includes(q) ||
        r.description?.toLowerCase().includes(q) ||
        String(r.capacity).includes(q));
    }
    list.sort((a, b) => {
      if (sortBy === "name")      return (a.name || "").localeCompare(b.name || "");
      if (sortBy === "capacity")  return (b.capacity ?? 0) - (a.capacity ?? 0);
      if (sortBy === "status")    return (a.status || "").localeCompare(b.status || "");
      return 0;
    });
    setFiltered(list);
    setPage(1);
  }, [search, branchFilter, statusFilter, sortBy, rooms]);

  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const openAdd    = ()     => setModal({ type:"add" });
  const openEdit   = (room) => setModal({ type:"edit",   room });
  const openDelete = (room) => setModal({ type:"delete", room });
  const closeModal = ()     => setModal(null);
  const handleSaved   = () => { closeModal(); fetchAll(); };
  const handleDeleted = () => { closeModal(); fetchAll(); };
  const hasFilters = search || branchFilter !== "all" || statusFilter !== "all";

  return (
    <div className="room-page">

      {/* ── Header ── */}
      <div className="room-page__header">
        <div>
          <h2 className="room-page__title">🚪 Room Management</h2>
          <p className="room-page__sub">Create and manage meeting rooms across all branches</p>
        </div>
        <button className="btn-add-room" onClick={openAdd}><span>+</span> Add Room</button>
      </div>

      {/* ── Toolbar ── */}
      <div className="room-toolbar">
        <div className="room-search">
          <span className="room-search__icon">🔍</span>
          <input className="room-search__input" placeholder="Search rooms..."
            value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <select className="room-filter-select" value={branchFilter}
          onChange={(e) => setBranchFilter(e.target.value)}>
          <option value="all">All Branches</option>
          {branches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
        </select>
        <select className="room-filter-select room-filter-select--status" value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}>
          <option value="all">All Statuses</option>
          <option value="Available">✅ Available</option>
          <option value="Unavailable">🚫 Unavailable</option>
          <option value="Maintenance">🔧 Maintenance</option>
        </select>
        <select className="room-filter-select" value={sortBy}
          onChange={(e) => setSortBy(e.target.value)}>
          <option value="name">Sort: Name A–Z</option>
          <option value="capacity">Sort: Capacity ↓</option>
          <option value="status">Sort: Status A–Z</option>
        </select>
        <span className="room-count-badge">
          {filtered.length} {filtered.length === 1 ? "room" : "rooms"}
        </span>
      </div>

      {error && <div className="form-alert form-alert--error">⚠ {error}</div>}

      {/* ── Room grid ── */}
      <div className="room-grid">
        {loading ? (
          <div className="room-loading"><div className="room-spinner" /><p>Loading rooms...</p></div>
        ) : filtered.length === 0 ? (
          <div className="room-empty">
            <div className="room-empty__icon">🚪</div>
            <div className="room-empty__title">
              {hasFilters ? "No rooms match your filters" : "No rooms yet"}
            </div>
            <div className="room-empty__sub">
              {hasFilters ? "Try clearing your search or filters" : "Click 'Add Room' to create your first room"}
            </div>
          </div>
        ) : (
          paginated.map((room, index) => (
            <RoomCard key={room.id} room={room}
              index={(page - 1) * PAGE_SIZE + index}
              facilities={facilities[room.id] || []}
              onEdit={openEdit} onDelete={openDelete} />
          ))
        )}
      </div>

      <Pagination current={page} total={filtered.length} pageSize={PAGE_SIZE} onChange={setPage} />

      {modal?.type === "add"    && <RoomModal mode="add" branches={branches} onClose={closeModal} onSaved={handleSaved} />}
      {modal?.type === "edit"   && <RoomModal mode="edit" room={modal.room} branches={branches} onClose={closeModal} onSaved={handleSaved} />}
      {modal?.type === "delete" && <DeleteModal room={modal.room} onClose={closeModal} onDeleted={handleDeleted} />}

    </div>
  );
}