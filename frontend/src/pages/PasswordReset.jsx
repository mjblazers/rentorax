import React, { useState } from "react";
import { useNavigate, Link, useSearchParams } from "react-router-dom";
import { api, formatApiError } from "@/lib/api";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Home, Loader2, ArrowLeft, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

export function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [devLink, setDevLink] = useState("");

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      const { data } = await api.post("/auth/forgot-password", { email });
      setSent(true);
      if (data.reset_url) setDevLink(data.reset_url);
    } catch (e) { toast.error(formatApiError(e.response?.data?.detail)); }
    finally { setBusy(false); }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-6">
      <Card className="border-border shadow-none w-full max-w-md">
        <CardContent className="p-8">
          <div className="flex items-center gap-2 mb-6">
            <div className="h-9 w-9 rounded-lg bg-primary text-primary-foreground flex items-center justify-center"><Home className="h-5 w-5" /></div>
            <div className="font-display text-lg font-semibold">RentoraX</div>
          </div>
          {sent ? (
            <div className="space-y-4 text-center">
              <CheckCircle2 className="h-10 w-10 mx-auto text-primary" />
              <h1 className="font-display text-2xl font-semibold">Check your inbox</h1>
              <p className="text-sm text-muted-foreground">If an account exists for <strong>{email}</strong>, we just sent a password reset link. It expires in 60 minutes.</p>
              {devLink && (
                <div className="text-xs text-left bg-muted rounded-md p-3 break-all">
                  <div className="tiny-label mb-1">Dev: open this link in a new tab</div>
                  <a className="font-mono text-primary" href={devLink}>{devLink}</a>
                </div>
              )}
              <Link to="/login" className="text-sm text-primary hover:underline inline-flex items-center gap-1"><ArrowLeft className="h-3 w-3" /> Back to login</Link>
            </div>
          ) : (
            <form onSubmit={submit} className="space-y-4">
              <div className="tiny-label">Account recovery</div>
              <h1 className="font-display text-2xl font-semibold">Forgot password</h1>
              <p className="text-sm text-muted-foreground">Enter your email and we'll send you a one-time reset link.</p>
              <div><Label>Email</Label>
                <Input data-testid="forgot-email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@rentorax.com" /></div>
              <Button data-testid="forgot-submit" type="submit" className="w-full" disabled={busy}>
                {busy && <Loader2 className="h-4 w-4 mr-2 animate-spin" />} Send reset link
              </Button>
              <div className="text-center"><Link to="/login" className="text-sm text-muted-foreground hover:text-foreground">← Back to login</Link></div>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export function ResetPassword() {
  const [params] = useSearchParams();
  const token = params.get("token") || "";
  const nav = useNavigate();
  const [pwd, setPwd] = useState("");
  const [pwd2, setPwd2] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    if (pwd !== pwd2) return toast.error("Passwords do not match");
    if (pwd.length < 6) return toast.error("Password must be at least 6 characters");
    setBusy(true);
    try {
      await api.post("/auth/reset-password", { token, new_password: pwd });
      toast.success("Password updated. Please sign in.");
      nav("/login", { replace: true });
    } catch (e) { toast.error(formatApiError(e.response?.data?.detail)); }
    finally { setBusy(false); }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-6">
      <Card className="border-border shadow-none w-full max-w-md">
        <CardContent className="p-8">
          <div className="flex items-center gap-2 mb-6">
            <div className="h-9 w-9 rounded-lg bg-primary text-primary-foreground flex items-center justify-center"><Home className="h-5 w-5" /></div>
            <div className="font-display text-lg font-semibold">RentoraX</div>
          </div>
          <form onSubmit={submit} className="space-y-4">
            <h1 className="font-display text-2xl font-semibold">Choose a new password</h1>
            <p className="text-sm text-muted-foreground">Pick something at least 6 characters long. You'll use this from now on.</p>
            <div><Label>New password</Label>
              <Input data-testid="reset-pwd" type="password" required minLength={6} value={pwd} onChange={(e) => setPwd(e.target.value)} /></div>
            <div><Label>Confirm</Label>
              <Input data-testid="reset-pwd2" type="password" required value={pwd2} onChange={(e) => setPwd2(e.target.value)} /></div>
            <Button data-testid="reset-submit" type="submit" className="w-full" disabled={busy || !token}>
              {busy && <Loader2 className="h-4 w-4 mr-2 animate-spin" />} Update password
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
