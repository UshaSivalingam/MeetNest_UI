import { createContext, useContext, useState, useEffect } from "react";
import { AuthAPI } from "../api/authAPI";
import { TokenService, UserService } from "../api/apiConfig";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user,    setUser]    = useState(undefined);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const savedUser = UserService.get();
    const token     = TokenService.get();
    setUser((savedUser && token) ? savedUser : null);
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

  // "Employee" → "employee", "Admin" → "admin"
  const role       = user?.role?.trim().toLowerCase() ?? null;
  const isAdmin    = role === "admin";
  const isEmployee = role === "employee";

  console.log("🔐 AUTH:", { role, isAdmin, isEmployee, loading, userExists: !!user });

  return (
    <AuthContext.Provider value={{
      user, loading, role, isAdmin, isEmployee,
      isLoggedIn: !!user && !!TokenService.get(),
      login, logout,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}