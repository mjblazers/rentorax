import React, { useState } from "react";
import { NavLink, useNavigate, Outlet } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";
import {
  LayoutDashboard, Building2, Users, CreditCard, Wrench, Calculator,
  ShieldCheck, FileText, Settings, LogOut, Moon, Sun, Bell, Menu, X,
  UserCog, Megaphone, BarChart3, ScrollText, Home,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const navByRole = {
  super_admin: [
    { to: "/admin", label: "Overview", icon: LayoutDashboard, end: true },
    { to: "/admin/landlords", label: "Landlords", icon: Users },
    { to: "/admin/announcements", label: "Announcements", icon: Megaphone },
    { to: "/admin/activity", label: "Activity Logs", icon: ScrollText },
  ],
  landlord: [
    { to: "/landlord", label: "Overview", icon: LayoutDashboard, end: true },
    { to: "/landlord/properties", label: "Properties", icon: Building2 },
    { to: "/landlord/tenants", label: "Tenants", icon: Users },
    { to: "/landlord/payments", label: "Payments", icon: CreditCard },
    { to: "/landlord/maintenance", label: "Maintenance", icon: Wrench },
    { to: "/landlord/accounting", label: "Accounting", icon: Calculator },
    { to: "/landlord/caretakers", label: "Caretakers", icon: UserCog },
    { to: "/landlord/reports", label: "Reports", icon: BarChart3 },
    { to: "/landlord/announcements", label: "Announcements", icon: Megaphone },
  ],
  caretaker: [
    { to: "/caretaker", label: "Overview", icon: LayoutDashboard, end: true },
    { to: "/caretaker/properties", label: "Properties", icon: Building2 },
    { to: "/caretaker/tenants", label: "Tenants", icon: Users },
    { to: "/caretaker/maintenance", label: "Maintenance", icon: Wrench },
  ],
  tenant: [
    { to: "/tenant", label: "Overview", icon: LayoutDashboard, end: true },
    { to: "/tenant/payments", label: "Payment History", icon: CreditCard },
    { to: "/tenant/maintenance", label: "Maintenance", icon: Wrench },
    { to: "/tenant/announcements", label: "Announcements", icon: Megaphone },
    { to: "/tenant/profile", label: "Profile", icon: UserCog },
  ],
};

const roleLabel = {
  super_admin: "Super Admin",
  landlord: "Landlord",
  caretaker: "Caretaker",
  tenant: "Tenant",
};

export default function AppShell() {
  const { user, logout } = useAuth();
  const { theme, toggle } = useTheme();
  const nav = useNavigate();
  const [open, setOpen] = useState(false);
  if (!user) return null;
  const items = navByRole[user.role] || [];
  const initials = (user.name || user.email || "U")
    .split(/\s+/).map((s) => s[0]).join("").slice(0, 2).toUpperCase();

  return (
    <div className="min-h-screen bg-background flex">
      {/* Mobile overlay */}
      {open && (
        <div
          className="lg:hidden fixed inset-0 z-30 bg-background/60 backdrop-blur-sm"
          onClick={() => setOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        data-testid="app-sidebar"
        className={`fixed lg:static z-40 inset-y-0 left-0 w-72 bg-card border-r border-border flex flex-col transform transition-transform duration-200
          ${open ? "translate-x-0" : "-translate-x-full"} lg:translate-x-0`}
      >
        <div className="px-5 py-5 border-b border-border flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-9 w-9 rounded-lg bg-primary text-primary-foreground flex items-center justify-center">
              <Home className="h-5 w-5" />
            </div>
            <div>
              <div className="font-display font-semibold text-lg leading-tight">RentoraX</div>
              <div className="tiny-label">{roleLabel[user.role]}</div>
            </div>
          </div>
          <button className="lg:hidden p-1" onClick={() => setOpen(false)}>
            <X className="h-5 w-5" />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-0.5">
          {items.map((it) => (
            <NavLink
              key={it.to}
              to={it.to}
              end={it.end}
              data-testid={`nav-${it.label.toLowerCase().replace(/\s+/g, "-")}`}
              className={({ isActive }) => `sidebar-item ${isActive ? "active" : ""}`}
              onClick={() => setOpen(false)}
            >
              <it.icon className="h-4 w-4" />
              <span>{it.label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="px-3 py-3 border-t border-border">
          <div className="text-xs text-muted-foreground px-2 mb-2">
            Built for Nigerian landlords
          </div>
        </div>
      </aside>

      <div className="flex-1 min-w-0 flex flex-col">
        {/* Top bar */}
        <header className="glass-header sticky top-0 z-20">
          <div className="flex items-center justify-between px-4 lg:px-8 py-3">
            <div className="flex items-center gap-3">
              <button
                className="lg:hidden p-2 -ml-2"
                onClick={() => setOpen(true)}
                data-testid="sidebar-toggle-btn"
              >
                <Menu className="h-5 w-5" />
              </button>
              <div className="hidden sm:block">
                <div className="tiny-label">Welcome back</div>
                <div className="font-display text-base font-medium">{user.name || user.email}</div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                data-testid="theme-toggle-btn"
                variant="ghost" size="icon"
                onClick={toggle} aria-label="Toggle theme"
              >
                {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
              </Button>
              <Button variant="ghost" size="icon" data-testid="notifications-btn">
                <Bell className="h-4 w-4" />
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button data-testid="profile-menu-btn" className="flex items-center gap-2 pl-2 pr-3 py-1 rounded-full border border-border hover:bg-muted transition">
                    <Avatar className="h-7 w-7">
                      <AvatarFallback className="bg-primary/10 text-primary text-xs">{initials}</AvatarFallback>
                    </Avatar>
                    <span className="hidden sm:inline text-sm">{(user.name || user.email).split(" ")[0]}</span>
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel>
                    <div className="font-medium">{user.name}</div>
                    <div className="text-xs text-muted-foreground">{user.email}</div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => nav("/account/password")} data-testid="menu-change-password">
                    <Settings className="h-4 w-4 mr-2" /> Change password
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={async () => { await logout(); nav("/login"); }}
                    data-testid="menu-logout-btn"
                    className="text-destructive focus:text-destructive"
                  >
                    <LogOut className="h-4 w-4 mr-2" /> Sign out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </header>

        <main className="flex-1 px-4 lg:px-8 py-6 lg:py-8 fade-in-up">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
