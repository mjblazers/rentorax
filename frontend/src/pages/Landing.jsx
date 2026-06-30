import React from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  Building2, Users, Wrench, Calculator, ShieldCheck, BellRing,
  Home, ArrowRight, CheckCircle2, Globe2, Banknote,
} from "lucide-react";

const features = [
  { icon: Building2, title: "Unlimited Properties", text: "Manage hostels, flats, duplexes, shops and estates from one dashboard." },
  { icon: Users, title: "Tenant Records & Portal", text: "Store NIN, guarantor info, lease dates and let tenants log in." },
  { icon: Banknote, title: "Rent Expiry Tracking", text: "Color-coded alerts from 90 days down to expired so nothing slips." },
  { icon: Wrench, title: "Maintenance Kanban", text: "Tenants raise tickets; you (or your caretaker) close them off." },
  { icon: Calculator, title: "Accounting", text: "Income, expenses and Profit & Loss tuned for the Nigerian market." },
  { icon: ShieldCheck, title: "Role-based Access", text: "Caretakers see only what you allow. Audit trail on every action." },
];

export default function Landing() {
  return (
    <div className="min-h-screen bg-background">
      {/* Nav */}
      <header className="glass-header sticky top-0 z-30">
        <div className="max-w-6xl mx-auto px-5 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-9 w-9 rounded-lg bg-primary text-primary-foreground flex items-center justify-center">
              <Home className="h-5 w-5" />
            </div>
            <div className="font-display text-lg font-semibold">RentoraX</div>
          </div>
          <div className="flex items-center gap-2">
            <Link to="/login">
              <Button data-testid="landing-signin-btn" variant="ghost" size="sm">Sign in</Button>
            </Link>
            <Link to="/login">
              <Button data-testid="landing-get-started-btn" size="sm">
                Get started <ArrowRight className="h-4 w-4 ml-1" />
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative">
        <div className="max-w-6xl mx-auto px-5 pt-16 pb-12 sm:pt-24 sm:pb-20 grid lg:grid-cols-12 gap-10 items-center">
          <div className="lg:col-span-7 space-y-6">
            <div className="inline-flex items-center gap-2 text-xs px-3 py-1 rounded-full border border-border bg-card">
              <Globe2 className="h-3.5 w-3.5 text-primary" />
              <span className="text-muted-foreground">Built for diaspora landlords in <span className="text-foreground font-medium">Nigeria 🇳🇬</span></span>
            </div>
            <h1 className="font-display text-4xl sm:text-5xl lg:text-6xl font-semibold tracking-tight leading-[1.05]">
              Collect rent and manage <span className="text-primary">property in Nigeria</span> from anywhere.
            </h1>
            <p className="text-base sm:text-lg text-muted-foreground max-w-xl">
              RentoraX is the operating system for Nigerian rental properties — properties, units,
              tenants, payments, maintenance and accounting in one place, with role-based access for
              your caretakers on the ground.
            </p>
            <div className="flex flex-wrap items-center gap-3">
              <Link to="/login">
                <Button data-testid="hero-cta-btn" size="lg" className="h-11 px-6">
                  Open dashboard <ArrowRight className="h-4 w-4 ml-1" />
                </Button>
              </Link>
              <a href="#features" className="text-sm text-muted-foreground hover:text-foreground inline-flex items-center gap-1">
                See features →
              </a>
            </div>
            <div className="flex flex-wrap gap-x-6 gap-y-2 pt-2 text-sm text-muted-foreground">
              {["No spreadsheets", "Yearly · Quarterly · Monthly rent", "Tenant portal included"].map((b) => (
                <div key={b} className="flex items-center gap-1.5">
                  <CheckCircle2 className="h-4 w-4 text-primary" /> {b}
                </div>
              ))}
            </div>
          </div>

          <div className="lg:col-span-5">
            <div className="relative">
              <div className="absolute -inset-4 rounded-3xl bg-primary/5 blur-2xl" />
              <div className="relative rounded-2xl border border-border bg-card overflow-hidden shadow-sm">
                <img
                  src="https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?crop=entropy&cs=srgb&fm=jpg&ixid=M3w3NDk1ODF8MHwxfHNlYXJjaHwzfHxtb2Rlcm4lMjBhcGFydG1lbnQlMjBidWlsZGluZyUyMGV4dGVyaW9yfGVufDB8fHx8MTc4Mjg0NzQzOHww&ixlib=rb-4.1.0&q=85"
                  alt="Modern building"
                  className="w-full aspect-[4/5] object-cover"
                />
                <div className="p-5 border-t border-border bg-card">
                  <div className="tiny-label">Today · Lagos</div>
                  <div className="mt-1 font-display font-medium">Ikoyi Heights · 24 units</div>
                  <div className="text-xs text-muted-foreground mt-1">22 occupied · 2 vacant · ₦18.4M collected this year</div>
                  <div className="mt-3 flex gap-2 text-xs">
                    <span className="px-2 py-0.5 rounded-full bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300 border border-green-200 dark:border-green-800">12 safe</span>
                    <span className="px-2 py-0.5 rounded-full bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300 border border-orange-200 dark:border-orange-800">4 urgent</span>
                    <span className="px-2 py-0.5 rounded-full bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300 border border-red-200 dark:border-red-800">1 critical</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="border-t border-border bg-muted/30">
        <div className="max-w-6xl mx-auto px-5 py-16 sm:py-20">
          <div className="max-w-2xl">
            <div className="tiny-label">What's inside</div>
            <h2 className="font-display text-3xl sm:text-4xl font-semibold tracking-tight mt-2">
              Every tool a Nigerian landlord actually needs.
            </h2>
          </div>
          <div className="mt-10 grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {features.map((f) => (
              <div key={f.title} className="p-6 rounded-xl border border-border bg-card stat-card">
                <div className="h-10 w-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                  <f.icon className="h-5 w-5" />
                </div>
                <div className="font-display font-semibold mt-4 text-lg">{f.title}</div>
                <div className="text-sm text-muted-foreground mt-1">{f.text}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="max-w-6xl mx-auto px-5 py-16 sm:py-24">
        <div className="rounded-2xl border border-border p-8 sm:p-12 grain"
             style={{ background: "linear-gradient(135deg, hsl(142 72% 21%) 0%, hsl(142 72% 14%) 100%)" }}>
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 text-white">
            <div>
              <div className="tiny-label !text-white/70">Ready when you are</div>
              <h3 className="font-display text-3xl font-semibold mt-1">Bring your buildings into the light.</h3>
              <p className="text-white/80 text-sm mt-2 max-w-xl">
                Sign in with the demo super admin account to explore the platform, create landlords, and seed your own portfolio.
              </p>
            </div>
            <Link to="/login">
              <Button data-testid="cta-bottom-btn" size="lg" className="bg-white text-primary hover:bg-white/90">
                Launch RentoraX <ArrowRight className="h-4 w-4 ml-1" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      <footer className="border-t border-border">
        <div className="max-w-6xl mx-auto px-5 py-8 flex flex-col sm:flex-row justify-between gap-4 text-xs text-muted-foreground">
          <div>© {new Date().getFullYear()} RentoraX · Property management for the Nigerian diaspora.</div>
          <div className="flex gap-4">
            <span>Made with care 🌍</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
