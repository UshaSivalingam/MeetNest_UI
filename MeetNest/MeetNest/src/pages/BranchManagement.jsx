// src/pages/BranchManagement.jsx

import { useState, useEffect, useCallback, useRef } from "react";
import { BranchAPI } from "../api/branchAPI";
import Pagination from "../components/Pagination";
import "../styles/BranchManagement.css";

// ─── CONSTANTS ───────────────────────────────────────────────────
const ACCENT_COLORS = ["yellow", "green", "blue", "sky", "purple", "red"];
const EMPTY_FORM    = { name: "", area: "", city: "", country: "" };

function accentFor(i) { return ACCENT_COLORS[i % ACCENT_COLORS.length]; }

// ─── SUGGESTION DATA ──────────────────────────────────────────────
const COUNTRIES = [
  "India", "United States", "United Kingdom", "Canada", "Australia",
  "Germany", "France", "Singapore", "UAE", "Japan", "Malaysia",
  "Netherlands", "New Zealand", "South Africa", "Brazil",
];

const CITIES_BY_COUNTRY = {
  "India": [
    "Mumbai","Delhi","Bangalore","Chennai","Hyderabad","Kolkata","Pune",
    "Ahmedabad","Jaipur","Surat","Lucknow","Kanpur","Nagpur","Coimbatore",
    "Kochi","Indore","Bhopal","Visakhapatnam","Patna","Vadodara","Thane",
    "Agra","Nashik","Faridabad","Meerut","Rajkot","Varanasi","Srinagar",
    "Aurangabad","Dhanbad","Amritsar","Navi Mumbai","Allahabad","Ranchi","Howrah",
    "Gwalior","Jabalpur","Coimbatore","Madurai","Tiruchirappalli","Salem","Tirunelveli",
  ],
  "United States": [
    "New York","Los Angeles","Chicago","Houston","Phoenix","Philadelphia",
    "San Antonio","San Diego","Dallas","San Jose","Austin","Jacksonville",
    "Fort Worth","Columbus","San Francisco","Charlotte","Indianapolis","Seattle",
    "Denver","Boston","Nashville","Portland","Las Vegas","Memphis","Louisville",
  ],
  "United Kingdom": [
    "London","Birmingham","Manchester","Leeds","Glasgow","Liverpool",
    "Newcastle","Sheffield","Bristol","Leicester","Edinburgh","Cardiff",
    "Coventry","Nottingham","Bradford","Belfast",
  ],
  "Canada": [
    "Toronto","Montreal","Vancouver","Calgary","Edmonton","Ottawa",
    "Winnipeg","Quebec City","Hamilton","Brampton","Surrey","Halifax",
  ],
  "Australia": [
    "Sydney","Melbourne","Brisbane","Perth","Adelaide","Gold Coast",
    "Newcastle","Canberra","Sunshine Coast","Wollongong","Hobart","Darwin",
  ],
  "Germany": [
    "Berlin","Hamburg","Munich","Cologne","Frankfurt","Stuttgart",
    "Düsseldorf","Dortmund","Essen","Leipzig","Bremen","Dresden",
  ],
  "France": [
    "Paris","Marseille","Lyon","Toulouse","Nice","Nantes",
    "Montpellier","Strasbourg","Bordeaux","Lille","Rennes","Reims",
  ],
  "Singapore": ["Singapore"],
  "UAE": ["Dubai","Abu Dhabi","Sharjah","Ajman","Ras Al Khaimah","Fujairah"],
  "Japan": ["Tokyo","Osaka","Yokohama","Nagoya","Sapporo","Kobe","Kyoto","Fukuoka"],
  "Malaysia": ["Kuala Lumpur","George Town","Ipoh","Shah Alam","Petaling Jaya","Johor Bahru"],
};

// Areas are per-city for Indian cities, and generic for the rest
const AREAS_IN = {
  "Chennai":    ["Anna Nagar","T. Nagar","Adyar","Velachery","Tambaram","Porur","Nungambakkam","Egmore","Perambur","Mylapore","Kodambakkam","Vadapalani","Sholinganallur","OMR","ECR"],
  "Coimbatore": ["RS Puram","Gandhipuram","Peelamedu","Saibaba Colony","Singanallur","Thudiyalur","Vadavalli","Ganapathy","Race Course","Hopes College"],
  "Bangalore":  ["Koramangala","Indiranagar","Whitefield","Jayanagar","Malleshwaram","Rajajinagar","Marathahalli","HSR Layout","BTM Layout","Electronic City","Hebbal","Yelahanka"],
  "Mumbai":     ["Andheri","Bandra","Dadar","Kurla","Borivali","Malad","Goregaon","Thane","Navi Mumbai","Powai","Mulund","Ghatkopar"],
  "Delhi":      ["Connaught Place","Karol Bagh","Lajpat Nagar","Saket","Dwarka","Rohini","Pitampura","Janakpuri","Greater Kailash","Vasant Kunj"],
  "Hyderabad":  ["Banjara Hills","Jubilee Hills","Hitech City","Madhapur","Gachibowli","Kondapur","Kukatpally","Secunderabad","Ameerpet"],
  "Pune":       ["Koregaon Park","Kalyani Nagar","Viman Nagar","Hadapsar","Hinjewadi","Kharadi","Wakad","Baner","Aundh","Shivajinagar"],
  "Kolkata":    ["Park Street","Salt Lake","New Town","Tollygunge","Ballygunge","Alipore","Dumdum","Howrah"],
};

function getAreaSuggestions(city) {
  return AREAS_IN[city] || [];
}
function getCitySuggestions(country) {
  return CITIES_BY_COUNTRY[country] || [];
}

// ─── AUTOCOMPLETE INPUT ───────────────────────────────────────────
function AutocompleteInput({ id, className, placeholder, value, onChange, suggestions, disabled }) {
  const [open,  setOpen]  = useState(false);
  const [focus, setFocus] = useState(false);
  const wrapRef = useRef(null);

  const filtered = suggestions.filter((s) =>
    s.toLowerCase().includes(value.toLowerCase())
  ).slice(0, 8);

  const showDrop = focus && filtered.length > 0 && value.length > 0 &&
    !suggestions.includes(value);

  // Close on outside click
  useEffect(() => {
    function handler(e) {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setFocus(false);
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div className="autocomplete-wrap" ref={wrapRef}>
      <input
        id={id}
        className={className}
        placeholder={placeholder}
        value={value}
        disabled={disabled}
        autoComplete="off"
        onChange={(e) => { onChange(e.target.value); setFocus(true); }}
        onFocus={() => setFocus(true)}
      />
      {showDrop && (
        <ul className="autocomplete-drop">
          {filtered.map((s) => (
            <li
              key={s}
              className="autocomplete-drop__item"
              onMouseDown={(e) => {
                e.preventDefault();
                onChange(s);
                setFocus(false);
              }}
            >
              {/* bold-match the typed chars */}
              {(() => {
                const idx = s.toLowerCase().indexOf(value.toLowerCase());
                if (idx === -1) return s;
                return (
                  <>
                    {s.slice(0, idx)}
                    <strong>{s.slice(idx, idx + value.length)}</strong>
                    {s.slice(idx + value.length)}
                  </>
                );
              })()}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// ─── COUNTRY SELECT (dropdown list) ──────────────────────────────
function CountrySelect({ value, onChange }) {
  return (
    <select
      className="form-input form-input--blue"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      style={{ cursor: "pointer" }}
    >
      <option value="">— Select Country —</option>
      {COUNTRIES.map((c) => (
        <option key={c} value={c}>{c}</option>
      ))}
    </select>
  );
}

// ─── BRANCH MODAL (Add / Edit) ────────────────────────────────────
function BranchModal({ mode, branch, onClose, onSaved }) {
  const isEdit = mode === "edit";

  const [form, setForm] = useState(isEdit ? {
    name:    branch.name    || "",
    area:    branch.area    || "",
    city:    branch.city    || "",
    country: branch.country || "",
  } : { ...EMPTY_FORM });

  const [loading, setLoading] = useState(false);
  const [alert,   setAlert]   = useState({ msg: "", type: "" });

  const setField = (key, val) => setForm((p) => {
    const next = { ...p, [key]: val };
    // Reset dependents when parent changes
    if (key === "country") { next.city = ""; next.area = ""; }
    if (key === "city")    { next.area = ""; }
    return next;
  });

  const validate = () => {
    if (!form.name.trim())    return "Branch name is required.";
    if (!form.city.trim())    return "City is required.";
    if (!form.country.trim()) return "Country is required.";
    return null;
  };

  const handleSubmit = async () => {
    setAlert({ msg: "", type: "" });
    const err = validate();
    if (err) return setAlert({ msg: err, type: "error" });

    setLoading(true);
    try {
      const payload = {
        name:    form.name.trim(),
        area:    form.area.trim(),
        city:    form.city.trim(),
        country: form.country.trim(),
      };
      if (isEdit) {
        await BranchAPI.update(branch.id, payload);
      } else {
        await BranchAPI.create(payload);
      }
      setAlert({ msg: isEdit ? "Branch updated!" : "Branch created!", type: "success" });
      setTimeout(onSaved, 800);
    } catch (e) {
      setAlert({ msg: e.message || "Something went wrong.", type: "error" });
    } finally {
      setLoading(false);
    }
  };

  const citySuggestions = getCitySuggestions(form.country);
  const areaSuggestions = getAreaSuggestions(form.city);

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal">

        <div className="modal__header">
          <h2 className="modal__title">
            {isEdit ? "✏️ Edit Branch" : "🏢 New Branch"}
          </h2>
          <button className="modal__close" onClick={onClose}>✕</button>
        </div>
        <p className="modal__subtitle">
          {isEdit ? `Editing — ${branch.name}` : "Add a new branch to MeetNest"}
        </p>

        {alert.msg && (
          <div className={`form-alert form-alert--${alert.type}`}>
            {alert.type === "error" ? "✕" : "✓"} {alert.msg}
          </div>
        )}

        {/* Branch Name */}
        <label className="form-label" htmlFor="b-name">Branch Name *</label>
        <input
          id="b-name"
          className="form-input form-input--yellow"
          placeholder="e.g. Head Office, South Branch"
          value={form.name}
          onChange={(e) => setField("name", e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
        />

        {/* Country */}
        <label className="form-label" htmlFor="b-country">Country *</label>
        <CountrySelect value={form.country} onChange={(v) => setField("country", v)} />

        {/* City */}
        <label className="form-label" htmlFor="b-city">City *</label>
        <AutocompleteInput
          id="b-city"
          className="form-input form-input--green"
          placeholder={form.country ? `e.g. ${citySuggestions[0] || "Enter city"}` : "Select country first"}
          value={form.city}
          onChange={(v) => setField("city", v)}
          suggestions={citySuggestions}
          disabled={!form.country}
        />

        {/* Area */}
        <label className="form-label" htmlFor="b-area">
          Area / Locality
          <span style={{ color: "#CBD5E1", fontWeight: 400, marginLeft: 6 }}>(optional)</span>
        </label>
        <AutocompleteInput
          id="b-area"
          className="form-input"
          placeholder={areaSuggestions.length ? `e.g. ${areaSuggestions[0]}` : "e.g. Anna Nagar, Sector 5"}
          value={form.area}
          onChange={(v) => setField("area", v)}
          suggestions={areaSuggestions}
        />

        {/* Live address preview */}
        {(form.city || form.country) && (
          <div className="branch-preview">
            <span className="branch-preview__icon">📍</span>
            <span className="branch-preview__text">
              {[form.area, form.city, form.country].filter(Boolean).join(", ")}
            </span>
          </div>
        )}

        <div className="modal__footer" style={{ marginTop: 20 }}>
          <button className="btn-cancel" onClick={onClose}>Cancel</button>
          <button className="btn-save" onClick={handleSubmit} disabled={loading}>
            {loading ? "Saving..." : isEdit ? "Save Changes" : "Create Branch"}
          </button>
        </div>

      </div>
    </div>
  );
}

// ─── DELETE CONFIRM MODAL ─────────────────────────────────────────
function DeleteModal({ branch, onClose, onDeleted }) {
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState("");

  const handleDelete = async () => {
    setLoading(true);
    setError("");
    try {
      await BranchAPI.delete(branch.id);
      onDeleted();
    } catch (e) {
      setError(e.message || "Delete failed.");
      setLoading(false);
    }
  };

  const fullAddress = [branch.area, branch.city, branch.country].filter(Boolean).join(", ")
    || branch.location || "—";

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal modal--delete">
        <div className="modal__header">
          <h2 className="modal__title">🗑️ Delete Branch</h2>
          <button className="modal__close" onClick={onClose}>✕</button>
        </div>
        <p className="modal__subtitle">This action cannot be undone.</p>

        {error && <div className="form-alert form-alert--error">✕ {error}</div>}

        <p style={{ fontFamily:"Georgia,serif", fontSize:15, color:"#1e3a5f", marginBottom:6 }}>
          Are you sure you want to delete:
        </p>
        <p style={{
          fontFamily:"Georgia,serif", fontSize:17, fontWeight:"bold",
          color:"#DC2626", marginBottom:8,
          padding:"10px 14px", background:"rgba(254,242,242,0.7)",
          borderRadius:10, border:"1px solid rgba(239,68,68,0.2)",
        }}>
          🏢 {branch.name}
        </p>
        <p style={{ fontSize:12, color:"#94A3B8", fontFamily:"monospace", marginBottom:24 }}>
          📍 {fullAddress}
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

// ─── BRANCH CARD ─────────────────────────────────────────────────
function BranchCard({ branch, index, onEdit, onDelete }) {
  const color       = accentFor(index);
  const fullAddress = [branch.area, branch.city, branch.country].filter(Boolean).join(", ")
    || branch.location || "No location set";

  return (
    <div className={`branch-card branch-card--${color}`}>

      <div className="branch-card__top">
        <div className="branch-card__avatar">🏢</div>
        <div className="branch-card__actions">
          <button className="branch-card__action-btn branch-card__action-btn--edit"
            onClick={() => onEdit(branch)} title="Edit branch">✏️</button>
          <button className="branch-card__action-btn branch-card__action-btn--delete"
            onClick={() => onDelete(branch)} title="Delete branch">🗑️</button>
        </div>
      </div>

      <div className="branch-card__name">{branch.name}</div>

      {/* Location chips */}
      <div className="branch-card__chips">
        {branch.country && (
          <span className="branch-chip branch-chip--country">🌐 {branch.country}</span>
        )}
        {branch.city && (
          <span className="branch-chip branch-chip--city">🏙️ {branch.city}</span>
        )}
        {branch.area && (
          <span className="branch-chip branch-chip--area">📌 {branch.area}</span>
        )}
        {!branch.country && !branch.city && (
          <span className="branch-chip branch-chip--area">📍 {fullAddress}</span>
        )}
      </div>

      <div className="branch-card__stats">
        <div className="branch-card__stat">
          <span className="branch-card__stat-value">{branch.totalRooms ?? branch.roomCount ?? 0}</span>
          <span className="branch-card__stat-label">Rooms</span>
        </div>
        <div className="branch-card__stat">
          <span className="branch-card__stat-value">{branch.totalEmployees ?? branch.employeeCount ?? 0}</span>
          <span className="branch-card__stat-label">Employees</span>
        </div>
        <div className="branch-card__stat">
          <span className="branch-card__stat-value">{branch.totalBookings ?? branch.activeBookings ?? 0}</span>
          <span className="branch-card__stat-label">Bookings</span>
        </div>
      </div>

    </div>
  );
}

// ─── MAIN PAGE ────────────────────────────────────────────────────
const PAGE_SIZE = 6;

export default function BranchManagement() {
  const [branches,       setBranches]       = useState([]);
  const [filtered,       setFiltered]       = useState([]);
  const [loading,        setLoading]        = useState(true);
  const [error,          setError]          = useState("");
  const [search,         setSearch]         = useState("");
  const [sortBy,         setSortBy]         = useState("name");
  const [countryFilter,  setCountryFilter]  = useState("all");
  const [page,           setPage]           = useState(1);
  const [modal,          setModal]          = useState(null);

  const fetchBranches = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const data = await BranchAPI.getAll();
      // API returns PagedResult { items: [...], totalCount, page, pageSize }
      setBranches(Array.isArray(data) ? data : (data?.items ?? []));
    } catch (e) { setError(e.message || "Failed to load branches."); }
    finally     { setLoading(false); }
  }, []);

  useEffect(() => { fetchBranches(); }, [fetchBranches]);

  // Unique countries from data for filter dropdown
  const countryOptions = [...new Set(branches.map((b) => b.country).filter(Boolean))].sort();

  // Filter + sort → reset page on change
  useEffect(() => {
    let list = [...branches];

    if (countryFilter !== "all")
      list = list.filter((b) => b.country === countryFilter);

    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((b) =>
        b.name?.toLowerCase().includes(q)    ||
        b.area?.toLowerCase().includes(q)    ||
        b.city?.toLowerCase().includes(q)    ||
        b.country?.toLowerCase().includes(q) ||
        b.location?.toLowerCase().includes(q)
      );
    }

    list.sort((a, b) => {
      if (sortBy === "name")    return (a.name    || "").localeCompare(b.name    || "");
      if (sortBy === "city")    return (a.city    || "").localeCompare(b.city    || "");
      if (sortBy === "country") return (a.country || "").localeCompare(b.country || "");
      if (sortBy === "rooms")   return (b.totalRooms ?? b.roomCount ?? 0) - (a.totalRooms ?? a.roomCount ?? 0);
      return 0;
    });

    setFiltered(list);
    setPage(1);
  }, [search, sortBy, countryFilter, branches]);

  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const openAdd    = ()       => setModal({ type: "add" });
  const openEdit   = (branch) => setModal({ type: "edit",   branch });
  const openDelete = (branch) => setModal({ type: "delete", branch });
  const closeModal = ()       => setModal(null);
  const handleSaved   = () => { closeModal(); fetchBranches(); };
  const handleDeleted = () => { closeModal(); fetchBranches(); };

  return (
    <div className="branch-page">

      <div className="branch-page__header">
        <div>
          <h2 className="branch-page__title">🏢 Branch Management</h2>
          <p className="branch-page__sub">Create and manage your organisation's branches</p>
        </div>
        <button className="btn-add" onClick={openAdd}><span>+</span> Add Branch</button>
      </div>

      {/* ── Toolbar ── */}
      <div className="branch-toolbar">
        <div className="branch-search">
          <span className="branch-search__icon">🔍</span>
          <input className="branch-search__input"
            placeholder="Search by name, city, country..."
            value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>

        {/* Country filter */}
        <select className="branch-filter-select"
          value={countryFilter} onChange={(e) => setCountryFilter(e.target.value)}>
          <option value="all">All Countries</option>
          {countryOptions.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>

        {/* Sort */}
        <select className="branch-filter-select"
          value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
          <option value="name">Sort: Name A–Z</option>
          <option value="city">Sort: City A–Z</option>
          <option value="country">Sort: Country A–Z</option>
          <option value="rooms">Sort: Most Rooms</option>
        </select>

        <span className="branch-count-badge">
          {filtered.length} {filtered.length === 1 ? "branch" : "branches"}
        </span>
      </div>

      {error && <div className="form-alert form-alert--error">⚠ {error}</div>}

      <div className="branch-grid">
        {loading ? (
          <div className="branch-loading"><div className="branch-spinner" /><p>Loading branches...</p></div>
        ) : filtered.length === 0 ? (
          <div className="branch-empty">
            <div className="branch-empty__icon">🏢</div>
            <div className="branch-empty__title">
              {search || countryFilter !== "all" ? "No branches match your filters" : "No branches yet"}
            </div>
            <div className="branch-empty__sub">
              {search || countryFilter !== "all" ? "Try clearing your filters" : "Click 'Add Branch' to get started"}
            </div>
          </div>
        ) : (
          paginated.map((branch, index) => (
            <BranchCard key={branch.id} branch={branch}
              index={(page - 1) * PAGE_SIZE + index}
              onEdit={openEdit} onDelete={openDelete} />
          ))
        )}
      </div>

      <Pagination current={page} total={filtered.length} pageSize={PAGE_SIZE} onChange={setPage} />

      {modal?.type === "add"    && <BranchModal mode="add" onClose={closeModal} onSaved={handleSaved} />}
      {modal?.type === "edit"   && <BranchModal mode="edit" branch={modal.branch} onClose={closeModal} onSaved={handleSaved} />}
      {modal?.type === "delete" && <DeleteModal branch={modal.branch} onClose={closeModal} onDeleted={handleDeleted} />}

    </div>
  );
}