// src/layouts/MainLayout.jsx

import { useState } from "react";
import { useAuth } from "../context/AuthContext";
import NotificationBell from "../components/NotificationBell";
import "../styles/MainLayout.css";

export default function MainLayout({ children, currentPage, onNavigate }) {
  const { user, isAdmin, logout } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const adminNav = [
    { key: "dashboard",  label: "Dashboard",  icon: "🏠" },
    { key: "branches",   label: "Branches",   icon: "🏢" },
    { key: "rooms",      label: "Rooms",      icon: "🚪" },
    { key: "facilities", label: "Facilities", icon: "🔧" },
    { key: "bookings",   label: "Bookings",   icon: "📋" },
  ];

  const employeeNav = [
    { key: "dashboard",    label: "Dashboard",    icon: "🏠" },
    { key: "browse-rooms", label: "Browse Rooms", icon: "🚪" },
    { key: "my-bookings",  label: "My Bookings",  icon: "📋" },
  ];

  const navItems = isAdmin ? adminNav : employeeNav;

  return (
    <div className="layout">
      <aside className={`sidebar${sidebarOpen ? "" : " sidebar--collapsed"}`}>

        <div className="sidebar__logo">
          {sidebarOpen && (
            <span className="sidebar__logo-text">
              <span style={{ color: "#CA8A04" }}>Meet</span>
              <span style={{ color: "#16A34A" }}>N</span>
              <span style={{ color: "#2563EB" }}>est</span>
            </span>
          )}
          <button
            className="sidebar__toggle"
            onClick={() => setSidebarOpen((p) => !p)}
            aria-label="Toggle sidebar"
          >
            {sidebarOpen ? "◀" : "▶"}
          </button>
        </div>

        <nav className="sidebar__nav">
          {navItems.map((item) => (
            <button
              key={item.key}
              className={`sidebar__nav-item${currentPage === item.key ? " sidebar__nav-item--active" : ""}`}
              onClick={() => onNavigate?.(item.key)}
            >
              <span className="sidebar__nav-icon">{item.icon}</span>
              {sidebarOpen && <span className="sidebar__nav-label">{item.label}</span>}
            </button>
          ))}
        </nav>

        <div className="sidebar__footer">
          {sidebarOpen && (
            <div className="sidebar__user">
              <p className="sidebar__user-name">{user?.fullName || user?.email || "User"}</p>
              <span className={`sidebar__role-badge sidebar__role-badge--${user?.role?.toLowerCase()}`}>
                {user?.role || "Employee"}
              </span>
            </div>
          )}
          <button className="sidebar__logout" onClick={logout} aria-label="Sign out">
            <span>🚪</span>
            {sidebarOpen && <span>Sign Out</span>}
          </button>
        </div>

      </aside>

      <div className={`layout__main${sidebarOpen ? "" : " layout__main--collapsed"}`}>
        <main className="layout__content">
          {children}
        </main>
      </div>
    </div>
  );
}