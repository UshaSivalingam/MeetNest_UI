// src/context/AuthContext.jsx

import { createContext, useContext, useState, useEffect } from "react";
import { AuthAPI } from "../api/authAPI";
import { TokenService, UserService } from "../api/apiConfig";

const AuthContext = createContext(null);

// ─── PROVIDER ─────────────────────────────────────────────────────
export function AuthProvider({ children }) {
  const [user,    setUser]    = useState(null);
  const [loading, setLoading] = useState(true);

  // Restore session on first load
  useEffect(() => {
    const savedUser = UserService.get();
    const token     = TokenService.get();
    if (savedUser && token) setUser(savedUser);
    setLoading(false);
  }, []);

  const login = async ({ email, password }) => {
    const data = await AuthAPI.login({ email, password });
    setUser(data.user);
    return data;
  };

  const logout = () => {
    AuthAPI.logout();
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{
      user,
      loading,
      isLoggedIn: !!user && !!TokenService.get(),
      isAdmin:    user?.role?.toLowerCase() === "admin",
      isEmployee: user?.role?.toLowerCase() === "employee",
      login,
      logout,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

// ─── HOOK ─────────────────────────────────────────────────────────
export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}