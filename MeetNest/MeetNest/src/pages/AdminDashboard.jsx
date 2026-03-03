// src/pages/AdminDashboard.jsx

import { useState, useEffect } from "react";
import { useAuth }  from "../context/AuthContext";
import { AdminAPI } from "../api/adminAPI";
import "../styles/AdminDashboard.css";

// ─── HELPERS ─────────────────────────────────────────────────────────────────
function today() {
  return new Date().toLocaleDateString("en-IN", {
    weekday: "long", year: "numeric", month: "long", day: "numeric",
  });
}

function greet(name) {
  const h = new Date().getHours();
  const salutation = h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening";
  return `${salutation}, ${name || "Admin"} 👋`;
}

// ─── DONUT CHART ─────────────────────────────────────────────────────────────
function DonutChart({ data }) {
  const size   = 130;
  const cx     = size / 2;
  const r      = 46;
  const stroke = 18;
  const circ   = 2 * Math.PI * r;

  const total = data.reduce((s, d) => s + d.value, 0) || 1;
  let offset  = 0;

  return (
    <div className="donut-wrapper">
      <svg className="donut-svg" width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle cx={cx} cy={cx} r={r}
          fill="none" stroke="rgba(59,130,246,0.08)" strokeWidth={stroke} />

        {data.map((d, i) => {
          const dash = (d.value / total) * circ;
          const gap  = circ - dash;
          const seg  = (
            <circle key={i} cx={cx} cy={cx} r={r}
              fill="none" stroke={d.color} strokeWidth={stroke}
              strokeDasharray={`${dash} ${gap}`}
              strokeDashoffset={-offset}
              strokeLinecap="round"
              style={{ transition: "stroke-dasharray 1s cubic-bezier(0.22,1,0.36,1)" }}
              transform={`rotate(-90 ${cx} ${cx})`}
            />
          );
          offset += dash;
          return seg;
        })}

        <text x={cx} y={cx - 6} textAnchor="middle" fill="#1e3a5f"
          fontSize="18" fontWeight="bold" fontFamily="Georgia,serif">
          {data.reduce((s, d) => s + d.value, 0)}
        </text>
        <text x={cx} y={cx + 12} textAnchor="middle" fill="#94A3B8"
          fontSize="9" fontFamily="monospace" letterSpacing="1">
          TOTAL
        </text>
      </svg>

      <div className="donut-legend">
        {data.map((d, i) => (
          <div key={i} className="donut-legend__item">
            <div className="donut-legend__dot" style={{ background: d.color }} />
            <span className="donut-legend__label">{d.label}</span>
            <span className="donut-legend__count">{d.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── STAT CARD ────────────────────────────────────────────────────────────────
function StatCard({ icon, value, label, color, trend, trendDir, barPct, loading }) {
  const [bar, setBar] = useState(0);

  useEffect(() => {
    const t = setTimeout(() => setBar(barPct), 300);
    return () => clearTimeout(t);
  }, [barPct]);

  return (
    <div className={`stat-card stat-card--${color}`}>
      <div className="stat-card__header">
        <div className="stat-card__icon">{icon}</div>
        {trend != null && (
          <span className={`stat-card__trend stat-card__trend--${trendDir}`}>
            {trendDir === "up" ? "▲" : trendDir === "down" ? "▼" : "—"} {trend}
          </span>
        )}
      </div>

      {loading ? (
        <div style={{ height: 40, display: "flex", alignItems: "center" }}>
          <div className="dash__spinner" style={{ width: 24, height: 24, borderWidth: 2 }} />
        </div>
      ) : (
        <div className="stat-card__value">{value ?? "—"}</div>
      )}

      <div className="stat-card__label">{label}</div>
      <div className="stat-card__bar">
        <div className="stat-card__bar-fill" style={{ width: `${bar}%` }} />
      </div>
    </div>
  );
}

// ─── ADMIN DASHBOARD ─────────────────────────────────────────────────────────
export default function AdminDashboard({ onNavigate }) {
  const { user } = useAuth();

  const [stats,   setStats]   = useState(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState("");

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError("");
      try {
        // ✅ One call to GET /api/admin/dashboard
        // Token is auto-attached by the request() wrapper in apiService.js
        const data = await AdminAPI.getDashboard();
        if (cancelled) return;

        setStats({
          branches:          data.totalBranches    ?? 0,
          rooms:             data.totalRooms        ?? 0,
          bookings:          data.totalBookings     ?? 0,
          pending:           data.pendingBookings   ?? 0,
          approved:          data.approvedBookings  ?? 0,
          rejected:          data.rejectedBookings  ?? 0,
          cancelled:         data.cancelledBookings ?? 0,
          recentBookings:    data.recentBookings    ?? [],
          bookingsPerBranch: data.bookingsPerBranch ?? [],
        });
      } catch (err) {
        if (!cancelled) setError(err.message || "Failed to load dashboard data.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => { cancelled = true; };
  }, []);

  const quickActions = [
    { icon: "🏢", label: "Add Branch",   sub: "New branch",     color: "yellow", page: "branches"   },
    { icon: "🚪", label: "Add Room",     sub: "New room",       color: "green",  page: "rooms"      },
    { icon: "🔧", label: "Facilities",   sub: "Manage",         color: "blue",   page: "facilities" },
    { icon: "📋", label: "All Bookings", sub: "Review pending", color: "red",    page: "bookings"   },
  ];

  const totalBookings = stats?.bookings || 0;
  const pct = (n) => totalBookings ? Math.round((n / totalBookings) * 100) : 0;

  return (
    <div className="dash">

      {/* Greeting */}
      <div className="dash__greeting">
        <div className="dash__greeting-left">
          <h2>{greet(user?.fullName?.split(" ")[0])}</h2>
          <p>Here's what's happening in MeetNest today.</p>
        </div>
        <div className="dash__date-badge">📅 {today()}</div>
      </div>

      {error && <div className="dash__error">⚠ {error}</div>}

      {/* Stat cards */}
      <div className="dash__stats">
        <StatCard icon="🏢" label="Total Branches"   color="yellow"
          value={stats?.branches}   barPct={stats ? Math.min(stats.branches * 20, 100) : 0} loading={loading} />
        <StatCard icon="🚪" label="Total Rooms"      color="green"
          value={stats?.rooms}      barPct={stats ? Math.min(stats.rooms * 10, 100) : 0}    loading={loading} />
        <StatCard icon="📋" label="Total Bookings"   color="blue"
          value={stats?.bookings}   barPct={stats ? Math.min(stats.bookings * 5, 100) : 0}  loading={loading} />
        <StatCard icon="⏳" label="Pending Approval" color="sky"
          value={stats?.pending}    barPct={stats ? pct(stats.pending) : 0}                  loading={loading}
          trend={stats?.pending > 0 ? `${stats.pending} waiting` : null} trendDir="up" />
        <StatCard icon="✅" label="Approved"         color="red"
          value={stats?.approved}   barPct={stats ? pct(stats.approved) : 0}                 loading={loading} />
      </div>

      {/* Middle: donut + quick actions */}
      <div className="dash__middle">

        <div className="dash-panel">
          <div className="dash-panel__header">
            <span className="dash-panel__title">Booking Status</span>
            <span className="dash-panel__badge">Overview</span>
          </div>
          {loading ? (
            <div className="dash__loading"><div className="dash__spinner" /></div>
          ) : (
            <DonutChart data={[
              { label: "Pending",   value: stats?.pending   || 0, color: "#EAB308" },
              { label: "Approved",  value: stats?.approved  || 0, color: "#22C55E" },
              { label: "Rejected",  value: stats?.rejected  || 0, color: "#EF4444" },
              { label: "Cancelled", value: stats?.cancelled || 0, color: "#94A3B8" },
            ]} />
          )}
        </div>

        <div className="dash-panel">
          <div className="dash-panel__header">
            <span className="dash-panel__title">Quick Actions</span>
            <span className="dash-panel__badge">Admin</span>
          </div>
          <div className="quick-actions">
            {quickActions.map((a) => (
              <button key={a.page}
                className={`quick-action-btn quick-action-btn--${a.color}`}
                onClick={() => onNavigate?.(a.page)}
              >
                <span className="quick-action-btn__icon">{a.icon}</span>
                <span className="quick-action-btn__label">{a.label}</span>
                <span className="quick-action-btn__sub">{a.sub}</span>
              </button>
            ))}
          </div>
        </div>

      </div>

      {/* Bottom: recent bookings + per-branch chart */}
      <div className="dash__bottom">

        <div className="dash-panel">
          <div className="dash-panel__header">
            <span className="dash-panel__title">Recent Bookings</span>
            <button className="dash-panel__badge"
              style={{ cursor: "pointer", background: "rgba(239,246,255,0.8)", border: "1px solid rgba(59,130,246,0.15)", color: "#2563EB" }}
              onClick={() => onNavigate?.("bookings")}
            >View All →</button>
          </div>

          {loading ? (
            <div className="dash__loading"><div className="dash__spinner" /></div>
          ) : stats?.recentBookings?.length ? (
            <table className="booking-table">
              <thead>
                <tr><th>Employee</th><th>Room</th><th>Branch</th><th>Date</th><th>Status</th></tr>
              </thead>
              <tbody>
                {stats.recentBookings.map((b, i) => (
                  <tr key={b.id || i}>
                    <td>{b.employeeName || "—"}</td>
                    <td>{b.roomName     || "—"}</td>
                    <td>{b.branchName   || "—"}</td>
                    <td style={{ fontFamily: "monospace", fontSize: 12, color: "#64748B" }}>
                      {b.startTime
                        ? new Date(b.startTime).toLocaleDateString("en-IN", { day: "numeric", month: "short" })
                        : "—"}
                    </td>
                    <td>
                      <span className={`booking-status booking-status--${b.status?.toLowerCase() || "pending"}`}>
                        {b.status || "Pending"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div style={{ textAlign: "center", padding: "32px", color: "#94A3B8", fontFamily: "monospace", fontSize: 13 }}>
              No bookings yet
            </div>
          )}
        </div>

        <div className="dash-panel">
          <div className="dash-panel__header">
            <span className="dash-panel__title">Bookings per Branch</span>
            <button className="dash-panel__badge"
              style={{ cursor: "pointer", background: "rgba(254,252,232,0.8)", border: "1px solid rgba(234,179,8,0.2)", color: "#CA8A04" }}
              onClick={() => onNavigate?.("branches")}
            >Manage →</button>
          </div>

          {loading ? (
            <div className="dash__loading"><div className="dash__spinner" /></div>
          ) : stats?.bookingsPerBranch?.length ? (
            <div className="branch-list">
              {stats.bookingsPerBranch.map((b, i) => {
                const colors = ["#EAB308","#22C55E","#3B82F6","#0EA5E9","#F59E0B"];
                const bgs    = ["rgba(234,179,8,0.12)","rgba(34,197,94,0.12)","rgba(59,130,246,0.12)","rgba(14,165,233,0.12)","rgba(245,158,11,0.12)"];
                return (
                  <div key={i} className="branch-item">
                    <div className="branch-item__avatar" style={{ background: bgs[i % bgs.length] }}>🏢</div>
                    <div className="branch-item__info">
                      <div className="branch-item__name">{b.branchName}</div>
                      <div className="branch-item__meta">{b.approvedBookings} approved · {b.pendingBookings} pending</div>
                    </div>
                    <div className="branch-item__count" style={{ color: colors[i % colors.length] }}>
                      {b.totalBookings}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div style={{ textAlign: "center", padding: "32px", color: "#94A3B8", fontFamily: "monospace", fontSize: 13 }}>
              No branch data yet
            </div>
          )}
        </div>

      </div>
    </div>
  );
}