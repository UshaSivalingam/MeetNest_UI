// src/pages/LoginPage.jsx

import { useState, useEffect } from "react";
import Logo      from "../components/Logo";
import Alert     from "../components/Alert";
import { useAuth } from "../context/AuthContext";
import { TokenService } from "../api/apiConfig";
import "../styles/LoginPage.css";

export default function LoginPage({ onLoginSuccess, onSignup }) {
  const { login, logout } = useAuth();

  const [visible,  setVisible]  = useState(false);
  const [role,     setRole]     = useState("employee");
  const [email,    setEmail]    = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [loading,  setLoading]  = useState(false);
  const [alert,    setAlert]    = useState({ message: "", type: "" });

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 80);
    return () => clearTimeout(t);
  }, []);

  const handleRoleChange = (r) => {
    setRole(r);
    setAlert({ message: "", type: "" });
  };

  const handleLogin = async () => {
    setAlert({ message: "", type: "" });

    if (!email.trim())
      return setAlert({ message: "Email is required.", type: "error" });
    if (!password)
      return setAlert({ message: "Password is required.", type: "error" });

    setLoading(true);

    try {
      const data = await login({ email, password });
      const userRole = data?.user?.role?.trim().toLowerCase();

      // ── Role tab mismatch checks ──────────────────────────────
      if (role === "admin" && userRole !== "admin") {
        // ✅ Use logout() so AuthContext state is also cleared, not just localStorage
        logout();
        return setAlert({
          message: "Access denied. This account is not an Admin.",
          type: "error",
        });
      }

      if (role === "employee" && userRole === "admin") {
        logout();
        return setAlert({
          message: "Please use the Admin tab to sign in.",
          type: "error",
        });
      }

      // ── Success ───────────────────────────────────────────────
      setAlert({
        message: `Welcome back, ${data?.user?.fullName || email}!`,
        type: "success",
      });

      // ✅ No setTimeout — call immediately so there's no window
      //    where page="app" but token is missing
      onLoginSuccess?.(data?.user);

    } catch (err) {
      setAlert({
        message: err.message || "Login failed. Check your credentials.",
        type: "error",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e) => { if (e.key === "Enter") handleLogin(); };

  return (
    <div className="login-page">
      <div className="login-blob login-blob--blue-tr"   />
      <div className="login-blob login-blob--green-bl"  />
      <div className="login-blob login-blob--yellow-bm" />

      <div className={`login-card${visible ? " visible" : ""}`}>
        <Logo size="md" />

        <p className="login-subtitle">Sign in to your account</p>

        {/* Role toggle */}
        <div className="login-role-toggle">
          <button
            className={`login-role-btn${role === "admin" ? " login-role-btn--active-admin" : ""}`}
            onClick={() => handleRoleChange("admin")}
          >
            🏢 Admin
          </button>
          <button
            className={`login-role-btn${role === "employee" ? " login-role-btn--active-employee" : ""}`}
            onClick={() => handleRoleChange("employee")}
          >
            👤 Employee
          </button>
        </div>

        <Alert message={alert.message} type={alert.type} />

        {/* Email */}
        <label className="login-label" htmlFor="login-email">Email</label>
        <input
          id="login-email" type="email" className="login-input"
          placeholder="you@company.com"
          value={email} onChange={(e) => setEmail(e.target.value)}
          onKeyDown={handleKeyDown} autoComplete="email"
        />

        {/* Password */}
        <label className="login-label" htmlFor="login-password">Password</label>
        <div className="login-password-wrapper">
          <input
            id="login-password" type={showPass ? "text" : "password"}
            className="login-input" placeholder="••••••••"
            value={password} onChange={(e) => setPassword(e.target.value)}
            onKeyDown={handleKeyDown} autoComplete="current-password"
          />
          <button
            className="login-eye-btn"
            onClick={() => setShowPass((p) => !p)}
            tabIndex={-1}
            aria-label={showPass ? "Hide password" : "Show password"}
          >
            {showPass ? "🙈" : "👁️"}
          </button>
        </div>

        <div className="login-forgot"><span>Forgot password?</span></div>

        {/* Sign In */}
        <button className="login-btn-signin" onClick={handleLogin} disabled={loading}>
          {loading ? "Signing in..." : "Sign In"}
        </button>

        {/* Sign Up — employee only */}
        {role === "employee" && (
          <>
            <div className="login-divider">
              <div className="login-divider__line" />
              <span className="login-divider__text">OR</span>
              <div className="login-divider__line" />
            </div>
            <button className="login-btn-signup" onClick={onSignup}>
              Sign Up / Register
            </button>
          </>
        )}
      </div>
    </div>
  );
}