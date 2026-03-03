// src/pages/FacilityManagement.jsx

import { useState, useEffect, useCallback } from "react";
import { FacilityAPI } from "../api/facilityAPI";
import { RoomFacilityAPI } from "../api/RoomFacilityAPI";
import { RoomAPI } from "../api/roomAPI";
import Pagination from "../components/Pagination";
import "../styles/FacilityManagement.css";

// ─── ICON OPTIONS ─────────────────────────────────────────────────
const FACILITY_ICONS = [
  "📽️","🖥️","📺","📡","🔊","🎙️","📷","🖨️","💻","⌨️",
  "🌡️","❄️","🌬️","💡","🔌","🔋","📶","🛋️","🪑","🚿",
  "☕","🍽️","🧴","🪟","🚪","🔒","🧹","♿","📋","🗂️",
];

const EMPTY_FORM = { name: "", description: "", icon: "🔧" };

// ─── USAGE PILL ───────────────────────────────────────────────────
function UsagePill({ count }) {
  const level = count === 0 ? "zero" : count < 3 ? "low" : count < 6 ? "medium" : "high";
  const label = count === 0 ? "Unused" : `${count} room${count !== 1 ? "s" : ""}`;
  return (
    <span className={`facility-usage-pill facility-usage-pill--${level}`}>
      {count === 0 ? "—" : "🚪"} {label}
    </span>
  );
}

// ─── FACILITY FORM MODAL ──────────────────────────────────────────
function FacilityModal({ mode, facility, onClose, onSaved }) {
  const isEdit = mode === "edit";

  const [form,    setForm]    = useState(isEdit ? {
    name:        facility.name        || "",
    description: facility.description || "",
    icon:        facility.icon        || "🔧",
  } : { ...EMPTY_FORM });
  const [loading, setLoading] = useState(false);
  const [alert,   setAlert]   = useState({ msg: "", type: "" });

  const set = (key) => (e) => setForm((p) => ({ ...p, [key]: e.target.value }));

  const validate = () => {
    if (!form.name.trim()) return "Facility name is required.";
    return null;
  };

  const handleSubmit = async () => {
    setAlert({ msg: "", type: "" });
    const err = validate();
    if (err) return setAlert({ msg: err, type: "error" });

    setLoading(true);
    try {
      const payload = {
        name:        form.name.trim(),
        description: form.description.trim(),
        icon:        form.icon,
      };
      if (isEdit) {
        await FacilityAPI.update(facility.id, payload);
      } else {
        await FacilityAPI.create(payload);
      }
      setAlert({ msg: isEdit ? "Facility updated!" : "Facility created!", type: "success" });
      setTimeout(onSaved, 800);
    } catch (e) {
      setAlert({ msg: e.message || "Something went wrong.", type: "error" });
    } finally {
      setLoading(false);
    }
  };

  const handleKey = (e) => { if (e.key === "Enter") handleSubmit(); };

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal">

        <div className="modal__header">
          <h2 className="modal__title">
            {isEdit ? "✏️ Edit Facility" : "🔧 New Facility"}
          </h2>
          <button className="modal__close" onClick={onClose}>✕</button>
        </div>
        <p className="modal__subtitle">
          {isEdit ? `Editing — ${facility.name}` : "Add a new room facility"}
        </p>

        {alert.msg && (
          <div className={`form-alert form-alert--${alert.type}`}>
            {alert.type === "error" ? "✕" : "✓"} {alert.msg}
          </div>
        )}

        {/* Icon picker */}
        <label className="form-label">Choose Icon</label>
        <div className="icon-picker">
          {FACILITY_ICONS.map((ico) => (
            <button
              key={ico}
              type="button"
              className={`icon-picker__btn${form.icon === ico ? " icon-picker__btn--active" : ""}`}
              onClick={() => setForm((p) => ({ ...p, icon: ico }))}
              title={ico}
            >
              {ico}
            </button>
          ))}
        </div>

        {/* Preview */}
        <div style={{
          display: "flex", alignItems: "center", gap: 10, marginBottom: 16,
          padding: "10px 14px", background: "rgba(239,246,255,0.6)",
          borderRadius: 12, border: "1px solid rgba(59,130,246,0.15)",
        }}>
          <span style={{ fontSize: 24 }}>{form.icon}</span>
          <span style={{ fontFamily: "Georgia,serif", color: "#1e3a5f", fontSize: 15, fontWeight: "bold" }}>
            {form.name || "Facility name preview"}
          </span>
        </div>

        {/* Name */}
        <label className="form-label" htmlFor="fac-name">Facility Name *</label>
        <input id="fac-name"
          className="form-input form-input--blue"
          placeholder="e.g. Projector, Whiteboard, AC"
          value={form.name} onChange={set("name")} onKeyDown={handleKey}
        />

        {/* Description */}
        <label className="form-label" htmlFor="fac-desc">Description</label>
        <input id="fac-desc"
          className="form-input"
          placeholder="Optional details"
          value={form.description} onChange={set("description")} onKeyDown={handleKey}
          style={{ marginBottom: 22 }}
        />

        <div className="modal__footer">
          <button className="btn-cancel" onClick={onClose}>Cancel</button>
          <button className="btn-save-facility" onClick={handleSubmit} disabled={loading}>
            {loading ? "Saving..." : isEdit ? "Save Changes" : "Create Facility"}
          </button>
        </div>

      </div>
    </div>
  );
}

// ─── DELETE CONFIRM MODAL ─────────────────────────────────────────
function DeleteModal({ facility, usageCount, onClose, onDeleted }) {
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState("");

  const handleDelete = async () => {
    setLoading(true);
    setError("");
    try {
      await FacilityAPI.delete(facility.id);
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
          <h2 className="modal__title" style={{ color: "#DC2626" }}>🗑️ Delete Facility</h2>
          <button className="modal__close" onClick={onClose}>✕</button>
        </div>
        <p className="modal__subtitle">This action cannot be undone.</p>

        {error && <div className="form-alert form-alert--error">✕ {error}</div>}

        <p style={{ fontFamily: "Georgia,serif", fontSize: 15, color: "#1e3a5f", marginBottom: 6 }}>
          Are you sure you want to delete:
        </p>
        <div style={{
          display: "flex", alignItems: "center", gap: 10, marginBottom: 8,
          padding: "12px 14px", background: "rgba(254,242,242,0.7)",
          borderRadius: 10, border: "1px solid rgba(239,68,68,0.2)",
        }}>
          <span style={{ fontSize: 22 }}>{facility.icon || "🔧"}</span>
          <span style={{ fontFamily: "Georgia,serif", fontSize: 16, fontWeight: "bold", color: "#DC2626" }}>
            {facility.name}
          </span>
        </div>

        {usageCount > 0 && (
          <div style={{
            display: "flex", alignItems: "center", gap: 8, marginBottom: 20,
            padding: "10px 14px", background: "rgba(254,252,232,0.8)",
            borderRadius: 10, border: "1px solid rgba(234,179,8,0.3)",
            fontSize: 13, color: "#CA8A04", fontFamily: "monospace",
          }}>
            ⚠️ This facility is assigned to <strong style={{ margin: "0 4px" }}>{usageCount}</strong> room{usageCount !== 1 ? "s" : ""}. Deleting will remove it from all of them.
          </div>
        )}

        <p style={{ fontSize: 12, color: "#94A3B8", fontFamily: "monospace", marginBottom: 24 }}>
          {facility.description || "No description"}
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

// ─── MAIN PAGE ────────────────────────────────────────────────────
const PAGE_SIZE = 10;

export default function FacilityManagement() {
  const [facilities,   setFacilities]   = useState([]);
  const [filtered,     setFiltered]     = useState([]);
  const [usageMap,     setUsageMap]     = useState({});
  const [loading,      setLoading]      = useState(true);
  const [error,        setError]        = useState("");
  const [search,       setSearch]       = useState("");
  const [usageFilter,  setUsageFilter]  = useState("all"); // all | used | unused
  const [sortBy,       setSortBy]       = useState("name");
  const [page,         setPage]         = useState(1);
  const [modal,        setModal]        = useState(null);

  const fetchAll = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const [facRes, roomsRes] = await Promise.allSettled([
        FacilityAPI.getAll(), RoomAPI.getAll(),
      ]);
      const facList  = facRes.status   === "fulfilled" ? (facRes.value   || []) : [];
      const roomList = roomsRes.status === "fulfilled" ? (roomsRes.value || []) : [];
      setFacilities(facList);

      const counts = {};
      facList.forEach((f) => { counts[f.id] = 0; });
      await Promise.allSettled(roomList.map(async (room) => {
        try {
          const roomFacs = await RoomFacilityAPI.getByRoom(room.id);
          if (Array.isArray(roomFacs)) {
            roomFacs.forEach((rf) => {
              const fid = rf.facilityId ?? rf.facility?.id ?? rf.id;
              if (fid !== undefined) counts[fid] = (counts[fid] || 0) + 1;
            });
          }
        } catch { /* ignore */ }
      }));
      setUsageMap(counts);
    } catch (e) { setError(e.message || "Failed to load facilities."); }
    finally     { setLoading(false); }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  // ── Filter + sort → reset page ───────────────────────────────
  useEffect(() => {
    let list = [...facilities];

    if (usageFilter === "used")   list = list.filter((f) => (usageMap[f.id] || 0) > 0);
    if (usageFilter === "unused") list = list.filter((f) => (usageMap[f.id] || 0) === 0);

    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((f) =>
        f.name?.toLowerCase().includes(q) ||
        f.description?.toLowerCase().includes(q));
    }

    list.sort((a, b) => {
      if (sortBy === "name")      return (a.name || "").localeCompare(b.name || "");
      if (sortBy === "usage-desc") return (usageMap[b.id] || 0) - (usageMap[a.id] || 0);
      if (sortBy === "usage-asc")  return (usageMap[a.id] || 0) - (usageMap[b.id] || 0);
      return 0;
    });

    setFiltered(list);
    setPage(1);
  }, [search, usageFilter, sortBy, facilities, usageMap]);

  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const totalUsed             = facilities.filter((f) => (usageMap[f.id] || 0) > 0).length;
  const totalRoomAssignments  = Object.values(usageMap).reduce((s, v) => s + v, 0);

  const openAdd    = ()         => setModal({ type: "add" });
  const openEdit   = (facility) => setModal({ type: "edit",   facility });
  const openDelete = (facility) => setModal({ type: "delete", facility });
  const closeModal = ()         => setModal(null);
  const handleSaved   = () => { closeModal(); fetchAll(); };
  const handleDeleted = () => { closeModal(); fetchAll(); };

  return (
    <div className="facility-page">

      {/* ── Header ── */}
      <div className="facility-page__header">
        <div>
          <h2 className="facility-page__title">🔧 Facility Management</h2>
          <p className="facility-page__sub">Manage facilities and their room assignments</p>
        </div>
        <button className="btn-add-facility" onClick={openAdd}><span>+</span> Add Facility</button>
      </div>

      {/* ── Summary stats ── */}
      <div className="facility-stats">
        <div className="facility-stat-card">
          <div className="facility-stat-card__icon facility-stat-card__icon--blue">🔧</div>
          <div><div className="facility-stat-card__value">{facilities.length}</div>
               <div className="facility-stat-card__label">Total Facilities</div></div>
        </div>
        <div className="facility-stat-card">
          <div className="facility-stat-card__icon facility-stat-card__icon--green">✅</div>
          <div><div className="facility-stat-card__value">{totalUsed}</div>
               <div className="facility-stat-card__label">In Use</div></div>
        </div>
        <div className="facility-stat-card">
          <div className="facility-stat-card__icon facility-stat-card__icon--yellow">🚪</div>
          <div><div className="facility-stat-card__value">{totalRoomAssignments}</div>
               <div className="facility-stat-card__label">Room Assignments</div></div>
        </div>
      </div>

      {/* ── Toolbar ── */}
      <div className="facility-toolbar">
        <div className="facility-search">
          <span className="facility-search__icon">🔍</span>
          <input className="facility-search__input" placeholder="Search facilities..."
            value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <select className="facility-filter-select" value={usageFilter}
          onChange={(e) => setUsageFilter(e.target.value)}>
          <option value="all">All Facilities</option>
          <option value="used">✅ In Use</option>
          <option value="unused">⭕ Unused</option>
        </select>
        <select className="facility-filter-select" value={sortBy}
          onChange={(e) => setSortBy(e.target.value)}>
          <option value="name">Sort: Name A–Z</option>
          <option value="usage-desc">Sort: Most Used</option>
          <option value="usage-asc">Sort: Least Used</option>
        </select>
        <span className="facility-count-badge">
          {filtered.length} {filtered.length === 1 ? "facility" : "facilities"}
        </span>
      </div>

      {error && <div className="form-alert form-alert--error">⚠ {error}</div>}

      {/* ── Table panel ── */}
      <div className="facility-panel">
        {loading ? (
          <div className="facility-loading"><div className="facility-spinner" /><p>Loading facilities...</p></div>
        ) : filtered.length === 0 ? (
          <div className="facility-empty">
            <div className="facility-empty__icon">🔧</div>
            <div className="facility-empty__title">
              {search || usageFilter !== "all" ? "No facilities match your filters" : "No facilities yet"}
            </div>
            <div className="facility-empty__sub">
              {search || usageFilter !== "all" ? "Try clearing your filters" : "Click 'Add Facility' to get started"}
            </div>
          </div>
        ) : (
          <div className="facility-table-wrap">
            <table className="facility-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Facility</th>
                  <th>Description</th>
                  <th>Room Usage</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {paginated.map((f, i) => (
                  <tr key={f.id}>
                    <td><span className="facility-table__num">{(page - 1) * PAGE_SIZE + i + 1}</span></td>
                    <td>
                      <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                        <div className="facility-table__icon" style={{ background:"rgba(239,246,255,0.8)" }}>
                          {f.icon || "🔧"}
                        </div>
                        <div className="facility-table__name">{f.name}</div>
                      </div>
                    </td>
                    <td><span className="facility-table__desc">{f.description || <span style={{ color:"#CBD5E1" }}>—</span>}</span></td>
                    <td><UsagePill count={usageMap[f.id] || 0} /></td>
                    <td>
                      <div className="facility-table__actions">
                        <button className="facility-action-btn facility-action-btn--edit"
                          onClick={() => openEdit(f)} title="Edit">✏️</button>
                        <button className="facility-action-btn facility-action-btn--delete"
                          onClick={() => openDelete(f)} title="Delete">🗑️</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <Pagination current={page} total={filtered.length} pageSize={PAGE_SIZE} onChange={setPage} />
      </div>

      {modal?.type === "add"    && <FacilityModal mode="add" onClose={closeModal} onSaved={handleSaved} />}
      {modal?.type === "edit"   && <FacilityModal mode="edit" facility={modal.facility} onClose={closeModal} onSaved={handleSaved} />}
      {modal?.type === "delete" && <DeleteModal facility={modal.facility} usageCount={usageMap[modal.facility.id] || 0} onClose={closeModal} onDeleted={handleDeleted} />}

    </div>
  );
}