import React from "react";
import "@/index.css";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "sonner";

import { AuthProvider } from "@/contexts/AuthContext";
import { ThemeProvider } from "@/contexts/ThemeContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import AppShell from "@/components/AppShell";

import Landing from "@/pages/Landing";
import Login from "@/pages/Login";
import ChangePassword from "@/pages/ChangePassword";
import { ForgotPassword, ResetPassword } from "@/pages/PasswordReset";

import AdminDashboard from "@/pages/admin/AdminDashboard";
import AdminLandlords from "@/pages/admin/Landlords";
import AdminAnnouncements from "@/pages/admin/Announcements";
import AdminActivity from "@/pages/admin/Activity";

import LandlordDashboard from "@/pages/landlord/LandlordDashboard";
import Properties from "@/pages/landlord/Properties";
import PropertyDetail from "@/pages/landlord/PropertyDetail";
import Tenants from "@/pages/landlord/Tenants";
import TenantDetail from "@/pages/landlord/TenantDetail";
import Payments from "@/pages/landlord/Payments";
import Maintenance from "@/pages/landlord/Maintenance";
import Accounting from "@/pages/landlord/Accounting";
import Caretakers from "@/pages/landlord/Caretakers";
import Reports from "@/pages/landlord/Reports";
import LandlordAnnouncements from "@/pages/landlord/Announcements";
import Notices from "@/pages/landlord/Notices";
import Settings from "@/pages/landlord/Settings";

import CaretakerDashboard from "@/pages/caretaker/CaretakerDashboard";

import TenantDashboard from "@/pages/tenant/TenantDashboard";
import TenantPayments from "@/pages/tenant/TenantPayments";
import TenantMaintenance from "@/pages/tenant/TenantMaintenance";
import TenantAnnouncements from "@/pages/tenant/TenantAnnouncements";
import TenantNotices from "@/pages/tenant/TenantNotices";
import TenantProfile from "@/pages/tenant/TenantProfile";

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Landing />} />
            <Route path="/login" element={<Login />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password" element={<ResetPassword />} />

            {/* Super Admin */}
            <Route element={<ProtectedRoute allow={["super_admin"]}><AppShell /></ProtectedRoute>}>
              <Route path="/admin" element={<AdminDashboard />} />
              <Route path="/admin/landlords" element={<AdminLandlords />} />
              <Route path="/admin/announcements" element={<AdminAnnouncements />} />
              <Route path="/admin/activity" element={<AdminActivity />} />
            </Route>

            {/* Landlord */}
            <Route element={<ProtectedRoute allow={["landlord"]}><AppShell /></ProtectedRoute>}>
              <Route path="/landlord" element={<LandlordDashboard />} />
              <Route path="/landlord/properties" element={<Properties />} />
              <Route path="/landlord/properties/:id" element={<PropertyDetail />} />
              <Route path="/landlord/tenants" element={<Tenants />} />
              <Route path="/landlord/tenants/:id" element={<TenantDetail />} />
              <Route path="/landlord/payments" element={<Payments />} />
              <Route path="/landlord/maintenance" element={<Maintenance />} />
              <Route path="/landlord/notices" element={<Notices />} />
              <Route path="/landlord/accounting" element={<Accounting />} />
              <Route path="/landlord/caretakers" element={<Caretakers />} />
              <Route path="/landlord/reports" element={<Reports />} />
              <Route path="/landlord/announcements" element={<LandlordAnnouncements />} />
              <Route path="/landlord/settings" element={<Settings />} />
            </Route>

            {/* Caretaker — shares some landlord pages */}
            <Route element={<ProtectedRoute allow={["caretaker"]}><AppShell /></ProtectedRoute>}>
              <Route path="/caretaker" element={<CaretakerDashboard />} />
              <Route path="/caretaker/properties" element={<Properties />} />
              <Route path="/caretaker/tenants" element={<Tenants />} />
              <Route path="/caretaker/maintenance" element={<Maintenance />} />
            </Route>

            {/* Tenant */}
            <Route element={<ProtectedRoute allow={["tenant"]}><AppShell /></ProtectedRoute>}>
              <Route path="/tenant" element={<TenantDashboard />} />
              <Route path="/tenant/payments" element={<TenantPayments />} />
              <Route path="/tenant/maintenance" element={<TenantMaintenance />} />
              <Route path="/tenant/notices" element={<TenantNotices />} />
              <Route path="/tenant/announcements" element={<TenantAnnouncements />} />
              <Route path="/tenant/profile" element={<TenantProfile />} />
            </Route>

            <Route element={<ProtectedRoute><AppShell /></ProtectedRoute>}>
              <Route path="/account/password" element={<ChangePassword />} />
            </Route>

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
        <Toaster position="bottom-right" richColors closeButton />
      </AuthProvider>
    </ThemeProvider>
  );
}
