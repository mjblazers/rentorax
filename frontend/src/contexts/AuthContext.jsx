import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { api, formatApiError } from "@/lib/api";

const AuthCtx = createContext({ user: null, login: async () => {}, logout: async () => {}, refresh: async () => {} });

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null); // null = checking, false = anon
  const [error, setError] = useState("");

  const refresh = useCallback(async () => {
    try {
      const { data } = await api.get("/auth/me");
      setUser(data);
      return data;
    } catch (e) {
      setUser(false);
      return null;
    }
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  const login = async (email, password) => {
    setError("");
    try {
      const { data } = await api.post("/auth/login", { email, password });
      setUser(data.user);
      return data.user;
    } catch (e) {
      const msg = formatApiError(e.response?.data?.detail) || e.message;
      setError(msg);
      throw new Error(msg);
    }
  };

  const logout = async () => {
    try { await api.post("/auth/logout"); } catch {}
    setUser(false);
  };

  return (
    <AuthCtx.Provider value={{ user, error, login, logout, refresh, setUser }}>
      {children}
    </AuthCtx.Provider>
  );
};

export const useAuth = () => useContext(AuthCtx);
