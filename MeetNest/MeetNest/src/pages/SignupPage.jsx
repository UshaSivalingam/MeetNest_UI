import { useState, useEffect } from "react";
import Logo  from "../components/Logo";
import { FaEye, FaEyeSlash } from "react-icons/fa";
import Alert from "../components/Alert";
import { AuthAPI } from "../api/authAPI";
import "../styles/SignupPage.css";

export default function SignupPage({ onBack }) {
  const [visible, setVisible] = useState(false);
  const [form, setForm] = useState({
    fullName: "", email: "", password: "", confirmPassword: "", branchId: "",
  });
  const [showPass,    setShowPass]    = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading,     setLoading]     = useState(false);
  const [alert,       setAlert]       = useState({ message: "", type: "" });

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 80);
    return () => clearTimeout(t);
  }, []);

  const set = (key) => (e) => setForm((prev) => ({ ...prev, [key]: e.target.value }));

  const validate = () => {
    if (!form.fullName.trim())                  return "Full name is required.";
    if (!form.email.trim())                     return "Email is required.";
    if (!/\S+@\S+\.\S+/.test(form.email))       return "Enter a valid email address.";
    if (form.password.length < 6)               return "Password must be at least 6 characters.";
    if (form.password !== form.confirmPassword) return "Passwords do not match.";
    if (!form.branchId.trim())                  return "Branch ID is required.";
    if (isNaN(Number(form.branchId)))           return "Branch ID must be a number."; // ← fix
    return null;
  };

  const handleSignup = async () => {
    setAlert({ message: "", type: "" });
    const error = validate();
    if (error) return setAlert({ message: error, type: "error" });

    setLoading(true);
    try {
      await AuthAPI.registerEmployee({
        fullName: form.fullName,
        email:    form.email,
        password: form.password,
        branchId: form.branchId,
      });
      setAlert({ message: "Account created! Redirecting to login...", type: "success" });
      setTimeout(onBack, 1800);
    } catch (err) {
      setAlert({ message: err.message || "Registration failed. Please try again.", type: "error" });
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e) => { if (e.key === "Enter") handleSignup(); };

  return (
    <div className="signup-page">
      <div className="signup-blob signup-blob--yellow-tl" />
      <div className="signup-blob signup-blob--green-br"  />
      <div className="signup-blob signup-blob--blue-tr"   />

      <div className={`signup-card${visible ? " visible" : ""}`}>
        <Logo size="md" />

        <p className="signup-subtitle">Employee Registration</p>

        <Alert message={alert.message} type={alert.type} />

        {/* Full Name */}
        <label className="signup-label" htmlFor="signup-fullname">Full Name</label>
        <input id="signup-fullname" type="text"
          className="signup-input signup-input--yellow"
          placeholder="John Doe" value={form.fullName}
          onChange={set("fullName")} onKeyDown={handleKeyDown} autoComplete="name"
        />

        {/* Email */}
        <label className="signup-label" htmlFor="signup-email">Email</label>
        <input id="signup-email" type="email"
          className="signup-input signup-input--blue"
          placeholder="john@company.com" value={form.email}
          onChange={set("email")} onKeyDown={handleKeyDown} autoComplete="email"
        />

        {/* Password */}
        <label className="signup-label" htmlFor="signup-password">Password</label>
        <div className="signup-password-wrapper">
          <input id="signup-password" type={showPass ? "text" : "password"}
            className="signup-input signup-input--blue"
            placeholder="Min. 6 characters" value={form.password}
            onChange={set("password")} onKeyDown={handleKeyDown} autoComplete="new-password"
          />
          <button className="signup-eye-btn" onClick={() => setShowPass((p) => !p)} tabIndex={-1}
            aria-label={showPass ? "Hide password" : "Show password"}>
            {showPass ? <FaEyeSlash /> : <FaEye />}
          </button>
        </div>

        {/* Confirm Password */}
        <label className="signup-label" htmlFor="signup-confirm">Confirm Password</label>
        <div className="signup-password-wrapper">
          <input id="signup-confirm" type={showConfirm ? "text" : "password"}
            className="signup-input signup-input--blue"
            placeholder="••••••••" value={form.confirmPassword}
            onChange={set("confirmPassword")} onKeyDown={handleKeyDown} autoComplete="new-password"
          />
          <button className="signup-eye-btn" onClick={() => setShowConfirm((p) => !p)} tabIndex={-1}
            aria-label={showConfirm ? "Hide password" : "Show password"}>
            {showConfirm ? <FaEyeSlash /> : <FaEye />}
          </button>
        </div>

        {/* Branch ID — changed to number input */}
        <label className="signup-label" htmlFor="signup-branch">Branch ID</label>
        <input id="signup-branch" type="number"
          className="signup-input signup-input--green"
          placeholder="e.g. 5" value={form.branchId}
          onChange={set("branchId")} onKeyDown={handleKeyDown}
          min="1"
          style={{ marginBottom: 22 }}
        />

        <button className="signup-btn" onClick={handleSignup} disabled={loading}>
          {loading ? "Creating Account..." : "Sign Up"}
        </button>

        <p className="signup-back">
          Already have an account?{" "}
          <span className="signup-back__link" onClick={onBack}>Sign In</span>
        </p>
      </div>
    </div>
  );
}