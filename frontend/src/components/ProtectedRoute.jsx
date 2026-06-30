import React from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";

const roleHome = {
  super_admin: "/admin",
  landlord: "/landlord",
  caretaker: "/caretaker",
  tenant: "/tenant",
};

export default function ProtectedRoute({ allow, children }) {
  const { user } = useAuth();
  const location = useLocation();

  if (user === null) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-muted-foreground text-sm">Loading RentoraX…</div>
      </div>
    );
  }
  if (!user) return <Navigate to="/login" replace state={{ from: location }} />;
  if (allow && !allow.includes(user.role)) {
    return <Navigate to={roleHome[user.role] || "/login"} replace />;
  }
  return children;
}

export { roleHome };
