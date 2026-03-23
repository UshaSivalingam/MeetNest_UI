import { useState, useEffect } from "react";
import { AuthProvider, useAuth } from "./context/AuthContext";
import ProtectedRoute     from "./routes/ProtectedRoute";
import WelcomePage        from "./pages/WelcomePage";
import LoginPage          from "./pages/LoginPage";
import SignupPage         from "./pages/SignupPage";
import AdminDashboard     from "./pages/AdminDashboard";
import BranchManagement   from "./pages/BranchManagement";
import RoomManagement     from "./pages/RoomManagement";
import FacilityManagement from "./pages/FacilityManagement";
import AdminBookings      from "./pages/AdminBookings";
import BrowseRooms        from "./pages/BrowseRooms";
import MyBookings         from "./pages/MyBookings";
import EmployeeDashboard  from "./pages/EmployeeDashboard";
import MainLayout         from "./layouts/MainLayout";

function ComingSoon({ pageName }) {
  return (
    <div style={{
      background: "rgba(255,255,255,0.8)", borderRadius: 20,
      padding: "48px 40px", border: "1.5px solid rgba(59,130,246,0.12)",
      backdropFilter: "blur(10px)", textAlign: "center",
      boxShadow: "0 4px 24px rgba(59,130,246,0.08)",
    }}>
      <div style={{ fontSize: 48, marginBottom: 16 }}>🚧</div>
      <h2 style={{ color: "#1e3a5f", fontFamily: "Georgia,serif", fontWeight: 400, fontSize: 24, marginBottom: 10 }}>
        {pageName}
      </h2>
      <p style={{ color: "#94A3B8", fontSize: 13, fontFamily: "monospace", letterSpacing: 1 }}>
        Coming soon — stay tuned!
      </p>
    </div>
  );
}

function AccessDenied() {
  return (
    <div style={{
      background: "rgba(255,255,255,0.8)", borderRadius: 20,
      padding: "48px 40px", border: "1.5px solid rgba(239,68,68,0.15)",
      backdropFilter: "blur(10px)", textAlign: "center",
      boxShadow: "0 4px 24px rgba(239,68,68,0.08)",
    }}>
      <div style={{ fontSize: 48, marginBottom: 16 }}>🚫</div>
      <h2 style={{ color: "#DC2626", fontFamily: "Georgia,serif", fontWeight: 400, fontSize: 24, marginBottom: 10 }}>
        Access Denied
      </h2>
      <p style={{ color: "#94A3B8", fontSize: 13, fontFamily: "monospace", letterSpacing: 1 }}>
        You don't have permission to view this page.
      </p>
    </div>
  );
}

// ─── PAGE CONTENT ─────────────────────────────────────────────────
function PageContent({ currentPage, onNavigate }) {
  const { isAdmin, isEmployee, loading, user } = useAuth();

  if (loading || user === undefined) return null;
  if (user && !isAdmin && !isEmployee) return null;

  if (isAdmin) {
    if (currentPage === "dashboard")  return <AdminDashboard   onNavigate={onNavigate} />;
    if (currentPage === "branches")   return <BranchManagement />;
    if (currentPage === "rooms")      return <RoomManagement />;
    if (currentPage === "facilities") return <FacilityManagement />;
    if (currentPage === "bookings")   return <AdminBookings />;
    return <AccessDenied />;
  }

  if (isEmployee) {
    if (currentPage === "dashboard")    return <EmployeeDashboard onNavigate={onNavigate} />;
    if (currentPage === "browse-rooms") return <BrowseRooms       onNavigate={onNavigate} />;
    if (currentPage === "my-bookings")  return <MyBookings        onNavigate={onNavigate} />;
    return <AccessDenied />;
  }

  return null;
}

// ─── INNER APP ────────────────────────────────────────────────────
function InnerApp() {
  const { isLoggedIn, loading, user } = useAuth();
  const [page,        setPage]        = useState("welcome");
  const [currentPage, setCurrentPage] = useState("dashboard");

  // Navigate to app when logged in
  useEffect(() => {
    if (!loading && user !== undefined && isLoggedIn && page !== "app") {
      setPage("app");
    }
  }, [isLoggedIn, loading, user, page]);

  // ✅ Reset to dashboard whenever user changes (handles role switch between sessions)
  useEffect(() => {
    setCurrentPage("dashboard");
  }, [user]);

  if (loading || user === undefined) return null;

  if (page === "welcome") return <WelcomePage onFinish={() => setPage("login")} />;

  if (page === "login") {
    return (
      <LoginPage
        onLoginSuccess={() => setPage("app")}
        onSignup={() => setPage("signup")}
      />
    );
  }

  if (page === "signup") return <SignupPage onBack={() => setPage("login")} />;

  if (page === "app") {
    return (
      <ProtectedRoute onRedirect={() => setPage("login")}>
        <MainLayout currentPage={currentPage} onNavigate={setCurrentPage}>
          <PageContent currentPage={currentPage} onNavigate={setCurrentPage} />
        </MainLayout>
      </ProtectedRoute>
    );
  }

  return null;
}

export default function App() {
  return (
    <AuthProvider>
      <InnerApp />
    </AuthProvider>
  );
}