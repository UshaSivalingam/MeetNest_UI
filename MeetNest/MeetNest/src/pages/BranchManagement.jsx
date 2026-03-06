// src/pages/BranchManagement.jsx

import { useState, useEffect, useCallback, useRef } from "react";
import { createPortal } from "react-dom";
import { BranchAPI } from "../api/branchAPI";
import Pagination from "../components/Pagination";
import "../styles/BranchManagement.css";

// ─── CONSTANTS ────────────────────────────────────────────────────
const ACCENT_COLORS = ["yellow", "green", "blue", "sky", "purple", "red"];
const EMPTY_FORM    = { name: "", area: "", city: "", country: "" };
const PAGE_SIZE     = 12;

function accentFor(i) { return ACCENT_COLORS[i % ACCENT_COLORS.length]; }

// ─── SUGGESTION DATA ─────────────────────────────────────────────
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
    "Gwalior","Jabalpur","Madurai","Tiruchirappalli","Salem","Tirunelveli",
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
  "Germany": ["Berlin","Hamburg","Munich","Cologne","Frankfurt","Stuttgart","Düsseldorf","Dortmund","Essen","Leipzig","Bremen","Dresden"],
  "France":  ["Paris","Marseille","Lyon","Toulouse","Nice","Nantes","Montpellier","Strasbourg","Bordeaux","Lille","Rennes","Reims"],
  "Singapore": ["Singapore"],
  "UAE":       ["Dubai","Abu Dhabi","Sharjah","Ajman","Ras Al Khaimah","Fujairah"],
  "Japan":     ["Tokyo","Osaka","Yokohama","Nagoya","Sapporo","Kobe","Kyoto","Fukuoka"],
  "Malaysia":  ["Kuala Lumpur","George Town","Ipoh","Shah Alam","Petaling Jaya","Johor Bahru"],
};

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

function getAreaSuggestions(city)    { return AREAS_IN[city]             || []; }
function getCitySuggestions(country) { return CITIES_BY_COUNTRY[country] || []; }

function readPaged(data) {
  if (!data) return { items: [], totalCount: 0 };
  const items      = data.items      ?? data.Items      ?? (Array.isArray(data) ? data : []);
  const totalCount = data.totalCount ?? data.TotalCount ?? items.length;
  return { items, totalCount };
}

// ─── CUSTOM DROPDOWN ─────────────────────────────────────────────
// Renders the list via a React Portal into document.body so it is
// NEVER clipped or offset by any parent stacking context / transform.
function CustomDropdown({ icon, options, value, onChange, isActive, scrollable = false }) {
  const [open, setOpen]           = useState(false);
  const [menuStyle, setMenuStyle] = useState({});
  const triggerRef = useRef(null);
  const menuRef    = useRef(null);
  const selected   = options.find((o) => o.value === value) ?? options[0];

  const calcPosition = () => {
    if (!triggerRef.current) return;
    const r = triggerRef.current.getBoundingClientRect();
    setMenuStyle({
      top:      r.bottom + window.scrollY + 8,
      left:     r.left   + window.scrollX,
      minWidth: r.width,
    });
  };

  const openMenu = () => { calcPosition(); setOpen(true); };

  useEffect(() => {
    if (!open) return;
    const close = (e) => {
      if (
        triggerRef.current && !triggerRef.current.contains(e.target) &&
        menuRef.current    && !menuRef.current.contains(e.target)
      ) setOpen(false);
    };
    const reposition = () => { if (open) calcPosition(); };
    document.addEventListener("mousedown", close);
    window.addEventListener("scroll", reposition, true);
    window.addEventListener("resize", reposition);
    return () => {
      document.removeEventListener("mousedown", close);
      window.removeEventListener("scroll", reposition, true);
      window.removeEventListener("resize", reposition);
    };
  }, [open]);

  const menu = open && createPortal(
    <ul
      ref={menuRef}
      className={`filter-dropdown${scrollable ? " filter-dropdown--scroll" : ""}`}
      style={{ position: "absolute", zIndex: 9999, ...menuStyle }}
    >
      {options.map((opt) => (
        <li
          key={opt.value}
          className={`filter-dropdown__item${opt.value === value ? " filter-dropdown__item--selected" : ""}`}
          onMouseDown={(e) => { e.preventDefault(); onChange(opt.value); setOpen(false); }}
        >
          <span className="filter-dropdown__check">{opt.value === value ? "✓" : ""}</span>
          {opt.label}
        </li>
      ))}
    </ul>,
    document.body
  );

  return (
    <div
      ref={triggerRef}
      className={`filter-pill${isActive && value !== options[0].value ? " filter-pill--active" : ""}${open ? " filter-pill--open" : ""}`}
    >
      <span className="filter-pill__icon">{icon}</span>
      <button className="filter-pill__btn" onClick={() => open ? setOpen(false) : openMenu()} type="button">
        <span className="filter-pill__label">{selected.label}</span>
        <span className={`filter-pill__arrow${open ? " filter-pill__arrow--up" : ""}`}>▾</span>
      </button>
      {menu}
    </div>
  );
}

// ─── AUTOCOMPLETE INPUT (modal) ───────────────────────────────────
function AutocompleteInput({ id, className, placeholder, value, onChange, suggestions, disabled }) {
  const [focus, setFocus] = useState(false);
  const wrapRef = useRef(null);
  const filtered = suggestions.filter((s) => s.toLowerCase().includes(value.toLowerCase())).slice(0, 8);
  const showDrop = focus && filtered.length > 0 && value.length > 0 && !suggestions.includes(value);

  useEffect(() => {
    const handler = (e) => { if (wrapRef.current && !wrapRef.current.contains(e.target)) setFocus(false); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div className="autocomplete-wrap" ref={wrapRef}>
      <input id={id} className={className} placeholder={placeholder} value={value}
        disabled={disabled} autoComplete="off"
        onChange={(e) => { onChange(e.target.value); setFocus(true); }}
        onFocus={() => setFocus(true)} />
      {showDrop && (
        <ul className="autocomplete-drop">
          {filtered.map((s) => (
            <li key={s} className="autocomplete-drop__item"
              onMouseDown={(e) => { e.preventDefault(); onChange(s); setFocus(false); }}>
              {(() => {
                const idx = s.toLowerCase().indexOf(value.toLowerCase());
                if (idx === -1) return s;
                return (<>{s.slice(0, idx)}<strong>{s.slice(idx, idx + value.length)}</strong>{s.slice(idx + value.length)}</>);
              })()}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// ─── COUNTRY SELECT (modal) ───────────────────────────────────────
function CountrySelect({ value, onChange }) {
  return (
    <select className="form-input form-input--blue" value={value}
      onChange={(e) => onChange(e.target.value)} style={{ cursor: "pointer" }}>
      <option value="">— Select Country —</option>
      {COUNTRIES.map((c) => <option key={c} value={c}>{c}</option>)}
    </select>
  );
}

// ─── BRANCH MODAL ────────────────────────────────────────────────
function BranchModal({ mode, branch, onClose, onSaved }) {
  const isEdit = mode === "edit";
  const [form, setForm] = useState(isEdit
    ? { name: branch.name || "", area: branch.area || "", city: branch.city || "", country: branch.country || "" }
    : { ...EMPTY_FORM });
  const [loading, setLoading] = useState(false);
  const [alert,   setAlert]   = useState({ msg: "", type: "" });

  const setField = (key, val) => setForm((p) => {
    const next = { ...p, [key]: val };
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
      const payload = { name: form.name.trim(), area: form.area.trim(), city: form.city.trim(), country: form.country.trim() };
      isEdit ? await BranchAPI.update(branch.id, payload) : await BranchAPI.create(payload);
      setAlert({ msg: isEdit ? "Branch updated!" : "Branch created!", type: "success" });
      setTimeout(onSaved, 800);
    } catch (e) {
      setAlert({ msg: e.message || "Something went wrong.", type: "error" });
    } finally { setLoading(false); }
  };

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal__header">
          <h2 className="modal__title">{isEdit ? "✏️ Edit Branch" : "🏢 New Branch"}</h2>
          <button className="modal__close" onClick={onClose}>✕</button>
        </div>
        <p className="modal__subtitle">{isEdit ? `Editing — ${branch.name}` : "Add a new branch to MeetNest"}</p>
        {alert.msg && <div className={`form-alert form-alert--${alert.type}`}>{alert.type === "error" ? "✕" : "✓"} {alert.msg}</div>}

        <label className="form-label" htmlFor="b-name">Branch Name *</label>
        <input id="b-name" className="form-input form-input--yellow"
          placeholder="e.g. Head Office, South Branch" value={form.name}
          onChange={(e) => setField("name", e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSubmit()} />

        <label className="form-label" htmlFor="b-country">Country *</label>
        <CountrySelect value={form.country} onChange={(v) => setField("country", v)} />

        <label className="form-label" htmlFor="b-city">City *</label>
        <AutocompleteInput id="b-city" className="form-input form-input--green"
          placeholder={form.country ? `e.g. ${getCitySuggestions(form.country)[0] || "Enter city"}` : "Select country first"}
          value={form.city} onChange={(v) => setField("city", v)}
          suggestions={getCitySuggestions(form.country)} disabled={!form.country} />

        <label className="form-label" htmlFor="b-area">
          Area / Locality <span style={{ color:"#CBD5E1", fontWeight:400, marginLeft:6 }}>(optional)</span>
        </label>
        <AutocompleteInput id="b-area" className="form-input"
          placeholder={getAreaSuggestions(form.city).length ? `e.g. ${getAreaSuggestions(form.city)[0]}` : "e.g. Anna Nagar, Sector 5"}
          value={form.area} onChange={(v) => setField("area", v)} suggestions={getAreaSuggestions(form.city)} />

        {(form.city || form.country) && (
          <div className="branch-preview">
            <span className="branch-preview__icon">📍</span>
            <span className="branch-preview__text">{[form.area, form.city, form.country].filter(Boolean).join(", ")}</span>
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

// ─── DELETE MODAL ─────────────────────────────────────────────────
function DeleteModal({ branch, onClose, onDeleted }) {
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState("");

  const handleDelete = async () => {
    setLoading(true); setError("");
    try { await BranchAPI.delete(branch.id); onDeleted(); }
    catch (e) { setError(e.message || "Delete failed."); setLoading(false); }
  };

  const fullAddress = [branch.area, branch.city, branch.country].filter(Boolean).join(", ") || "—";

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal modal--delete">
        <div className="modal__header">
          <h2 className="modal__title">🗑️ Delete Branch</h2>
          <button className="modal__close" onClick={onClose}>✕</button>
        </div>
        <p className="modal__subtitle">This action cannot be undone.</p>
        {error && <div className="form-alert form-alert--error">✕ {error}</div>}
        <p style={{ fontFamily:"Georgia,serif", fontSize:15, color:"#1e3a5f", marginBottom:6 }}>Are you sure you want to delete:</p>
        <p style={{ fontFamily:"Georgia,serif", fontSize:17, fontWeight:"bold", color:"#DC2626", marginBottom:8, padding:"10px 14px", background:"rgba(254,242,242,0.7)", borderRadius:10, border:"1px solid rgba(239,68,68,0.2)" }}>
          🏢 {branch.name}
        </p>
        <p style={{ fontSize:12, color:"#94A3B8", fontFamily:"monospace", marginBottom:24 }}>📍 {fullAddress}</p>
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
  const color   = accentFor(index);
  const name    = branch.name    ?? branch.Name    ?? "";
  const country = branch.country ?? branch.Country ?? "";
  const city    = branch.city    ?? branch.City    ?? "";
  const area    = branch.area    ?? branch.Area    ?? "";
  const rooms   = branch.totalRooms     ?? branch.TotalRooms     ?? 0;
  const emps    = branch.totalEmployees ?? branch.TotalEmployees ?? 0;

  return (
    <div className={`branch-card branch-card--${color}`}>
      <div className="branch-card__top">
        <div className="branch-card__avatar">🏢</div>
        <div className="branch-card__actions">
          <button className="branch-card__action-btn branch-card__action-btn--edit" onClick={() => onEdit(branch)} title="Edit">✏️</button>
          <button className="branch-card__action-btn branch-card__action-btn--delete" onClick={() => onDelete(branch)} title="Delete">🗑️</button>
        </div>
      </div>
      <div className="branch-card__name">{name}</div>
      <div className="branch-card__chips">
        {country && <span className="branch-chip branch-chip--country">🌐 {country}</span>}
        {city    && <span className="branch-chip branch-chip--city">🏙️ {city}</span>}
        {area    && <span className="branch-chip branch-chip--area">📌 {area}</span>}
      </div>
      <div className="branch-card__stats">
        <div className="branch-card__stat">
          <span className="branch-card__stat-icon">🚪</span>
          <span className="branch-card__stat-value">{rooms}</span>
          <span className="branch-card__stat-label">Rooms</span>
        </div>
        <div className="branch-card__stat">
          <span className="branch-card__stat-icon">👥</span>
          <span className="branch-card__stat-value">{emps}</span>
          <span className="branch-card__stat-label">Employees</span>
        </div>
      </div>
    </div>
  );
}

// ─── ALL CITIES (flat, for city search suggestions) ──────────────
const ALL_CITIES = [...new Set(Object.values(CITIES_BY_COUNTRY).flat())].sort();

// ─── CITY SEARCH DROPDOWN ────────────────────────────────────────
// Renders suggestion list via Portal so it's never offset by parent.
function CitySearchDropdown({ value, onChange }) {
  const [open, setOpen]           = useState(false);
  const [menuStyle, setMenuStyle] = useState({});
  const wrapRef = useRef(null);
  const menuRef = useRef(null);

  const filtered = value.trim().length === 0
    ? ALL_CITIES.slice(0, 12)
    : ALL_CITIES.filter((c) => c.toLowerCase().includes(value.toLowerCase())).slice(0, 10);

  const calcPosition = () => {
    if (!wrapRef.current) return;
    const r = wrapRef.current.getBoundingClientRect();
    setMenuStyle({
      top:   r.bottom + window.scrollY + 8,
      left:  r.left   + window.scrollX,
      width: r.width,
    });
  };

  const openMenu = () => { calcPosition(); setOpen(true); };

  useEffect(() => {
    if (!open) return;
    const close = (e) => {
      if (
        wrapRef.current && !wrapRef.current.contains(e.target) &&
        menuRef.current && !menuRef.current.contains(e.target)
      ) setOpen(false);
    };
    const reposition = () => { if (open) calcPosition(); };
    document.addEventListener("mousedown", close);
    window.addEventListener("scroll", reposition, true);
    window.addEventListener("resize", reposition);
    return () => {
      document.removeEventListener("mousedown", close);
      window.removeEventListener("scroll", reposition, true);
      window.removeEventListener("resize", reposition);
    };
  }, [open]);

  const menu = open && filtered.length > 0 && createPortal(
    <ul
      ref={menuRef}
      className="city-search-dropdown"
      style={{ position: "absolute", zIndex: 9999, ...menuStyle }}
    >
      {filtered.map((city) => {
        const idx = city.toLowerCase().indexOf(value.toLowerCase());
        return (
          <li
            key={city}
            className={`city-search-dropdown__item${city === value ? " city-search-dropdown__item--selected" : ""}`}
            onMouseDown={(e) => { e.preventDefault(); onChange(city); setOpen(false); }}
          >
            {value.trim() && idx !== -1 ? (
              <>{city.slice(0, idx)}<strong>{city.slice(idx, idx + value.length)}</strong>{city.slice(idx + value.length)}</>
            ) : city}
          </li>
        );
      })}
    </ul>,
    document.body
  );

  return (
    <div className="branch-search branch-search--city" ref={wrapRef}>
      <span className="branch-search__icon">🏙️</span>
      <input
        className="branch-search__input branch-search__input--city"
        placeholder="Search by city..."
        value={value}
        autoComplete="off"
        onChange={(e) => { onChange(e.target.value); openMenu(); }}
        onFocus={openMenu}
      />
      {value && (
        <button className="branch-search__clear" onClick={() => { onChange(""); setOpen(false); }} title="Clear">✕</button>
      )}
      {menu}
    </div>
  );
}

// ─── SORT OPTIONS ─────────────────────────────────────────────────
const SORT_OPTIONS = [
  { value: "name",       label: "Name A–Z"        },
  { value: "rooms_desc", label: "Most Used Rooms"  },
  { value: "rooms_asc",  label: "Least Used Rooms" },
];

// ─── MAIN PAGE ────────────────────────────────────────────────────
export default function BranchManagement() {
  const [branches,      setBranches]      = useState([]);
  const [totalCount,    setTotalCount]    = useState(0);
  const [loading,       setLoading]       = useState(true);
  const [error,         setError]         = useState("");
  const [nameSearch,    setNameSearch]    = useState("");   // search by name
  const [citySearch,    setCitySearch]    = useState("");   // search by city
  const [sortBy,        setSortBy]        = useState("name");
  const [countryFilter, setCountryFilter] = useState("all");
  const [page,          setPage]          = useState(1);
  const [modal,         setModal]         = useState(null);

  // Debounce both search fields
  const [debouncedName, setDebouncedName] = useState("");
  const [debouncedCity, setDebouncedCity] = useState("");
  useEffect(() => { const t = setTimeout(() => setDebouncedName(nameSearch), 350); return () => clearTimeout(t); }, [nameSearch]);
  useEffect(() => { const t = setTimeout(() => setDebouncedCity(citySearch), 350); return () => clearTimeout(t); }, [citySearch]);

  // Reset to page 1 on any filter change
  useEffect(() => { setPage(1); }, [debouncedName, debouncedCity, sortBy, countryFilter]);

  const fetchBranches = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const params = new URLSearchParams();
      if (debouncedName)           params.set("search",  debouncedName);
      if (debouncedCity)           params.set("city",    debouncedCity);
      if (countryFilter !== "all") params.set("country", countryFilter);
      params.set("sortBy",   sortBy);
      params.set("page",     String(page));
      params.set("pageSize", String(PAGE_SIZE));

      const raw = await BranchAPI.getAll(params.toString());
      const { items, totalCount } = readPaged(raw);

      setBranches(items);
      setTotalCount(totalCount);
    } catch (e) {
      setError(e.message || "Failed to load branches.");
    } finally { setLoading(false); }
  }, [debouncedName, debouncedCity, countryFilter, sortBy, page]);

  useEffect(() => { fetchBranches(); }, [fetchBranches]);

  const openAdd    = ()  => setModal({ type: "add" });
  const openEdit   = (b) => setModal({ type: "edit",   branch: b });
  const openDelete = (b) => setModal({ type: "delete", branch: b });
  const closeModal = ()  => setModal(null);
  const handleSaved   = () => { closeModal(); fetchBranches(); };
  const handleDeleted = () => { closeModal(); fetchBranches(); };

  const hasFilters = nameSearch || citySearch || countryFilter !== "all";

  const clearAll = () => { setNameSearch(""); setCitySearch(""); setCountryFilter("all"); };

  const countryOptions = [
    { value: "all", label: "All Countries" },
    ...COUNTRIES.map((c) => ({ value: c, label: c })),
  ];

  return (
    <div className="branch-page">

      {/* ── Header ── */}
      <div className="branch-page__header">
        <div>
          <h2 className="branch-page__title">🏢 Branch Management</h2>
          <p className="branch-page__sub">Create and manage your organisation's branches</p>
        </div>
        <button className="btn-add" onClick={openAdd}><span>+</span> Add Branch</button>
      </div>

      {/* ── Toolbar ── position:relative + z-index keeps dropdowns above cards */}
      <div className="branch-toolbar">

        {/* Search by Name */}
        <div className="branch-search">
          <span className="branch-search__icon">🔍</span>
          <input className="branch-search__input" placeholder="Search by name..."
            value={nameSearch} onChange={(e) => setNameSearch(e.target.value)} />
          {nameSearch && (
            <button className="branch-search__clear" onClick={() => setNameSearch("")} title="Clear">✕</button>
          )}
        </div>

        {/* Search by City — dropdown with suggestions */}
        <CitySearchDropdown value={citySearch} onChange={setCitySearch} />

        {/* Country filter */}
        <CustomDropdown icon="🌐" options={countryOptions} value={countryFilter}
          onChange={setCountryFilter} isActive scrollable />

        {/* Sort */}
        <CustomDropdown icon="↕" options={SORT_OPTIONS} value={sortBy}
          onChange={setSortBy} isActive={false} />

        {/* Clear all — only shows when something is active */}
        {hasFilters && (
          <button className="filter-clear-btn" onClick={clearAll}>✕ Clear all</button>
        )}

        <span className="branch-count-badge">
          {totalCount} {totalCount === 1 ? "branch" : "branches"}
        </span>
      </div>

      {error && <div className="form-alert form-alert--error">⚠ {error}</div>}

      {/* ── Grid ── */}
      <div className="branch-grid">
        {loading ? (
          <div className="branch-loading"><div className="branch-spinner" /><p>Loading branches...</p></div>
        ) : branches.length === 0 ? (
          <div className="branch-empty">
            <div className="branch-empty__icon">🏢</div>
            <div className="branch-empty__title">{hasFilters ? "No branches match your filters" : "No branches yet"}</div>
            <div className="branch-empty__sub">{hasFilters ? "Try clearing your filters" : "Click 'Add Branch' to get started"}</div>
          </div>
        ) : (
          branches.map((branch, index) => (
            <BranchCard key={branch.id ?? branch.Id} branch={branch}
              index={(page - 1) * PAGE_SIZE + index}
              onEdit={openEdit} onDelete={openDelete} />
          ))
        )}
      </div>

      <Pagination current={page} total={totalCount} pageSize={PAGE_SIZE} onChange={setPage} />

      {modal?.type === "add"    && <BranchModal mode="add"  onClose={closeModal} onSaved={handleSaved} />}
      {modal?.type === "edit"   && <BranchModal mode="edit" branch={modal.branch} onClose={closeModal} onSaved={handleSaved} />}
      {modal?.type === "delete" && <DeleteModal branch={modal.branch} onClose={closeModal} onDeleted={handleDeleted} />}
    </div>
  );
}