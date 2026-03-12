// src/components/NotificationBell.jsx
// FIX: dropdown rendered via ReactDOM.createPortal into document.body
// This fully escapes ALL parent stacking contexts (animations, transforms,
// backdrop-filter, overflow:hidden) — the only correct solution when any
// ancestor has a CSS animation with transform running at render time.

import { useState, useEffect, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import { NotificationAPI } from "../api/notificationAPI";
import "../styles/NotificationBell.css";

const TYPE_META = {
  MeetingEndReminder: { icon: "🔔", color: "#2563EB", label: "Meeting Ended" },
  BookingCancelled:   { icon: "🚫", color: "#DC2626", label: "Booking Cancelled" },
  RoomBlocked:        { icon: "🔒", color: "#CA8A04", label: "Room Blocked" },
  General:            { icon: "📢", color: "#64748B", label: "Info" },
};

function typeMeta(type = "") {
  return TYPE_META[type] || TYPE_META.General;
}

function timeAgo(iso) {
  if (!iso) return "";
  const diff = Date.now() - new Date(iso).getTime();
  const mins  = Math.floor(diff / 60000);
  const hours = Math.floor(mins / 60);
  const days  = Math.floor(hours / 24);
  if (days  > 0) return `${days}d ago`;
  if (hours > 0) return `${hours}h ago`;
  if (mins  > 0) return `${mins}m ago`;
  return "just now";
}

export default function NotificationBell() {
  const [count,         setCount]         = useState(0);
  const [notifications, setNotifications] = useState([]);
  const [open,          setOpen]          = useState(false);
  const [loading,       setLoading]       = useState(false);
  const [error,         setError]         = useState("");
  const [dropStyle,     setDropStyle]     = useState({});

  const bellRef = useRef(null);
  const dropRef = useRef(null);

  // ── Poll unread count every 60s ───────────────────────────────
  const fetchCount = useCallback(async () => {
    try {
      const res = await NotificationAPI.getCount();
      setCount(res?.count ?? 0);
    } catch {}
  }, []);

  useEffect(() => {
    fetchCount();
    const interval = setInterval(fetchCount, 60_000);
    return () => clearInterval(interval);
  }, [fetchCount]);

  // ── Load notifications when dropdown opens ────────────────────
  const fetchNotifications = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const list = await NotificationAPI.getDue();
      setNotifications(Array.isArray(list) ? list : []);
    } catch (e) {
      setError(e.message || "Failed to load notifications.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (open) fetchNotifications();
  }, [open, fetchNotifications]);

  // ── Close on outside click ────────────────────────────────────
  useEffect(() => {
    if (!open) return;
    const handler = (e) => {
      if (
        bellRef.current && !bellRef.current.contains(e.target) &&
        dropRef.current  && !dropRef.current.contains(e.target)
      ) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  // ── Close on scroll (keeps dropdown aligned) ─────────────────
  useEffect(() => {
    if (!open) return;
    const handler = () => setOpen(false);
    window.addEventListener("scroll", handler, true);
    return () => window.removeEventListener("scroll", handler, true);
  }, [open]);

  // ── Toggle: compute position from bell's viewport rect ───────
  const handleToggle = () => {
    if (!open && bellRef.current) {
      const rect = bellRef.current.getBoundingClientRect();
      setDropStyle({
        top:   rect.bottom + 8,
        right: window.innerWidth - rect.right,
      });
    }
    setOpen((p) => !p);
  };

  const markRead = async (id) => {
    try {
      await NotificationAPI.markRead(id);
      setNotifications((prev) => prev.filter((n) => n.id !== id));
      setCount((c) => Math.max(0, c - 1));
    } catch {}
  };

  const markAllRead = async () => {
    try {
      await NotificationAPI.markAllRead();
      setNotifications([]);
      setCount(0);
    } catch {}
  };

  // ── Dropdown JSX — portalled to document.body ────────────────
  const dropdown = open ? createPortal(
    <div
      ref={dropRef}
      className="notif-dropdown"
      style={{
        position: "fixed",
        top:      dropStyle.top,
        right:    dropStyle.right,
        left:     "auto",
        zIndex:   99999,
      }}
    >
      <div className="notif-dropdown__header">
        <span className="notif-dropdown__title">🔔 Notifications</span>
        {notifications.length > 0 && (
          <button className="notif-dropdown__mark-all" onClick={markAllRead}>
            Mark all read
          </button>
        )}
      </div>

      <div className="notif-dropdown__body">
        {loading ? (
          <div className="notif-dropdown__loading">
            <div className="notif-spinner" />
          </div>
        ) : error ? (
          <div className="notif-dropdown__empty notif-dropdown__empty--error">
            ⚠ {error}
          </div>
        ) : notifications.length === 0 ? (
          <div className="notif-dropdown__empty">
            <div className="notif-dropdown__empty-icon">✅</div>
            <div>All caught up!</div>
            <div style={{ fontSize: 11, color: "#94A3B8", marginTop: 2 }}>
              No new notifications
            </div>
          </div>
        ) : (
          notifications.map((n) => {
            const meta = typeMeta(n.type);
            return (
              <div key={n.id} className="notif-item">
                <div
                  className="notif-item__icon"
                  style={{ background: `${meta.color}18`, color: meta.color }}
                >
                  {meta.icon}
                </div>
                <div className="notif-item__content">
                  <div className="notif-item__type" style={{ color: meta.color }}>
                    {meta.label}
                  </div>
                  <div className="notif-item__message">{n.message}</div>
                  <div className="notif-item__time">{timeAgo(n.createdAt)}</div>
                </div>
                <button
                  className="notif-item__dismiss"
                  onClick={() => markRead(n.id)}
                  title="Dismiss"
                >
                  ✕
                </button>
              </div>
            );
          })
        )}
      </div>

      {notifications.length > 0 && (
        <div className="notif-dropdown__footer">
          {notifications.length} unread notification{notifications.length !== 1 ? "s" : ""}
        </div>
      )}
    </div>,
    document.body   // ← rendered directly on body, outside ALL stacking contexts
  ) : null;

  return (
    <div className="notif-bell-wrap">
      <button
        ref={bellRef}
        className={`notif-bell-btn${open ? " notif-bell-btn--open" : ""}`}
        onClick={handleToggle}
        aria-label={`Notifications${count > 0 ? ` (${count} unread)` : ""}`}
        title="Notifications"
      >
        <span className="notif-bell-btn__icon">
          {count > 0 ? "🔔" : "🔕"}
        </span>
        {count > 0 && (
          <span className="notif-bell-btn__badge">
            {count > 99 ? "99+" : count}
          </span>
        )}
      </button>

      {dropdown}
    </div>
  );
}