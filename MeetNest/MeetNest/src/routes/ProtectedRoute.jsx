import { useEffect } from "react";
import { useAuth } from "../context/AuthContext";

export default function ProtectedRoute({ children, role, onRedirect }) {
  const { isLoggedIn, isAdmin, isEmployee, loading, user } = useAuth();

  const resolved = !loading && user !== undefined;
  const denied   = resolved && !isLoggedIn;

  useEffect(() => {
    if (denied) onRedirect?.();
  }, [denied]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!resolved) return <LoadingScreen />;
  if (denied)    return null;

  return children;
}

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