// src/routes/ProtectedRoute.jsx

import { useAuth } from "../context/AuthContext";

/**
 * Props:
 *   children   — page to render if allowed
 *   role       — optional "admin" | "employee"
 *   onRedirect — called when access denied (navigate to login)
 */
export default function ProtectedRoute({ children, role, onRedirect }) {
  const { isLoggedIn, isAdmin, isEmployee, loading } = useAuth();

  if (loading) return <LoadingScreen />;

  if (!isLoggedIn) {
    onRedirect?.();
    return null;
  }

  if (role === "admin"    && !isAdmin)    { onRedirect?.(); return null; }
  if (role === "employee" && !isEmployee) { onRedirect?.(); return null; }

  return children;
}

// ─── LOADING SCREEN ───────────────────────────────────────────────
function LoadingScreen() {
  return (
    <div style={{
      minHeight: "100vh", display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center",
      background: "linear-gradient(145deg,#fefce8 0%,#f0fdf4 28%,#eff6ff 62%,#fefce8 100%)",
      gap: 16,
    }}>
      <div style={{
        width: 44, height: 44, borderRadius: "50%",
        border: "3px solid rgba(59,130,246,0.15)",
        borderTop: "3px solid #2563EB",
        animation: "spin 0.8s linear infinite",
      }} />
      <p style={{ color: "#94A3B8", fontSize: 11, letterSpacing: 3, textTransform: "uppercase", fontFamily: "monospace" }}>
        Loading...
      </p>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}