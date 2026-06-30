import React, { useState } from "react";
import { useNavigate, Link, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Home, Loader2 } from "lucide-react";
import { roleHome } from "@/components/ProtectedRoute";

export default function Login() {
  const { login } = useAuth();
  const nav = useNavigate();
  const loc = useLocation();
  const [email, setEmail] = useState("");
  const [pwd, setPwd] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setErr(""); setBusy(true);
    try {
      const u = await login(email, pwd);
      const target = loc.state?.from?.pathname || roleHome[u.role] || "/";
      nav(target, { replace: true });
    } catch (e) {
      setErr(e.message);
    } finally { setBusy(false); }
  };

  return (
    <div className="min-h-screen grid lg:grid-cols-2 bg-background">
      {/* Left hero */}
      <div className="hidden lg:flex relative flex-col justify-between p-12 grain"
           style={{ background: "linear-gradient(160deg, hsl(142 72% 12%) 0%, hsl(142 72% 21%) 60%, hsl(18 80% 25%) 100%)" }}>
        <div className="flex items-center gap-2 text-white">
          <div className="h-10 w-10 rounded-lg bg-white/15 backdrop-blur flex items-center justify-center">
            <Home className="h-5 w-5" />
          </div>
          <div className="font-display text-xl font-semibold">RentoraX</div>
        </div>
        <div className="space-y-6 max-w-md text-white">
          <div className="tiny-label !text-white/70">Property management · Reimagined</div>
          <h2 className="font-display text-4xl xl:text-5xl font-semibold leading-tight">
            Run your Nigerian rentals from anywhere in the world.
          </h2>
          <p className="text-white/75 text-sm xl:text-base leading-relaxed">
            RentoraX gives diaspora landlords a control room for buildings, tenants, rent expiry,
            maintenance and accounting — without spreadsheets or 2&nbsp;a.m. calls home.
          </p>
          <div className="grid grid-cols-3 gap-3 pt-2">
            {[
              { n: "₦0", l: "Setup fees" },
              { n: "24/7", l: "Tenant portal" },
              { n: "100%", l: "Your data" },
            ].map((s) => (
              <div key={s.l} className="border border-white/15 rounded-lg p-3 bg-white/5">
                <div className="font-display text-2xl">{s.n}</div>
                <div className="text-xs text-white/60">{s.l}</div>
              </div>
            ))}
          </div>
        </div>
        <div className="text-xs text-white/50">© {new Date().getFullYear()} RentoraX</div>
      </div>

      {/* Right form */}
      <div className="flex items-center justify-center p-6 sm:p-10">
        <div className="w-full max-w-md">
          <div className="lg:hidden flex items-center gap-2 mb-8">
            <div className="h-9 w-9 rounded-lg bg-primary text-primary-foreground flex items-center justify-center">
              <Home className="h-5 w-5" />
            </div>
            <div className="font-display text-lg font-semibold">RentoraX</div>
          </div>

          <Card className="border-border shadow-none">
            <CardContent className="p-8">
              <div className="tiny-label">Sign in</div>
              <h1 className="font-display text-3xl font-semibold mt-1">Welcome back</h1>
              <p className="text-sm text-muted-foreground mt-2">
                Enter your credentials to access RentoraX.
              </p>

              <form onSubmit={submit} className="mt-6 space-y-4">
                <div>
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email" type="email" autoComplete="email" required
                    placeholder="you@rentorax.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    data-testid="login-email-input"
                  />
                </div>
                <div>
                  <Label htmlFor="password">Password</Label>
                  <Input
                    id="password" type="password" autoComplete="current-password" required
                    placeholder="••••••••"
                    value={pwd}
                    onChange={(e) => setPwd(e.target.value)}
                    data-testid="login-password-input"
                  />
                </div>
                {err && (
                  <div data-testid="login-error" className="text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-md px-3 py-2">
                    {err}
                  </div>
                )}
                <Button data-testid="login-submit-btn" type="submit" className="w-full" disabled={busy}>
                  {busy && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  Sign in
                </Button>
                <div className="text-center">
                  <Link to="/forgot-password" className="text-sm text-muted-foreground hover:text-foreground" data-testid="forgot-link">Forgot password?</Link>
                </div>
              </form>

              <div className="mt-8 text-xs text-muted-foreground border-t border-border pt-5 space-y-1">
                <div className="font-medium text-foreground">Default Super Admin</div>
                <div>admin@rentorax.com / Admin@2026</div>
              </div>
            </CardContent>
          </Card>

          <div className="text-center mt-6 text-sm text-muted-foreground">
            <Link to="/" className="hover:text-foreground" data-testid="back-to-landing-link">← Back to homepage</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
