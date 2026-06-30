import React, { useEffect, useState } from "react";
import { api, formatApiError } from "@/lib/api";
import PageHeader from "@/components/PageHeader";
import FileUpload from "@/components/FileUpload";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Save } from "lucide-react";
import { toast } from "sonner";

export default function Settings() {
  const [s, setS] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => { api.get("/settings").then((r) => setS(r.data)); }, []);

  const save = async (e) => {
    e?.preventDefault?.();
    setSaving(true);
    try {
      const { reminder_days, ...rest } = s || {};
      const days = typeof reminder_days === "string"
        ? reminder_days.split(",").map((x) => parseInt(x.trim(), 10)).filter((n) => !isNaN(n))
        : reminder_days;
      const { data } = await api.put("/settings", { ...rest, reminder_days: days });
      setS(data); toast.success("Settings saved");
    } catch (e) { toast.error(formatApiError(e.response?.data?.detail)); }
    finally { setSaving(false); }
  };

  if (!s) return <div className="flex items-center justify-center py-20 text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin mr-2" /> Loading…</div>;

  const setField = (k, v) => setS({ ...s, [k]: v });
  const setPref = (k, v) => setS({ ...s, notification_prefs: { ...(s.notification_prefs || {}), [k]: v } });

  return (
    <div className="space-y-6 max-w-4xl">
      <PageHeader title="Settings" subtitle="Branding, currency, receipt format and notification preferences." />

      <form onSubmit={save} className="space-y-6">
        <Card className="border-border shadow-none">
          <CardContent className="p-6 space-y-4">
            <div className="tiny-label">Business profile</div>
            <div className="grid sm:grid-cols-2 gap-4">
              <div><Label>Business name</Label>
                <Input data-testid="settings-business-name" value={s.business_name || ""} onChange={(e) => setField("business_name", e.target.value)} /></div>
              <div><Label>Phone</Label>
                <Input value={s.business_phone || ""} onChange={(e) => setField("business_phone", e.target.value)} /></div>
              <div><Label>Email</Label>
                <Input type="email" value={s.business_email || ""} onChange={(e) => setField("business_email", e.target.value)} /></div>
              <div><Label>Currency</Label>
                <Select value={s.currency || "NGN"} onValueChange={(v) => setField("currency", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="NGN">NGN — Nigerian Naira</SelectItem>
                    <SelectItem value="USD">USD — US Dollar</SelectItem>
                    <SelectItem value="GBP">GBP — British Pound</SelectItem>
                    <SelectItem value="EUR">EUR — Euro</SelectItem>
                  </SelectContent>
                </Select></div>
              <div className="sm:col-span-2"><Label>Business address</Label>
                <Textarea rows={2} value={s.business_address || ""} onChange={(e) => setField("business_address", e.target.value)} /></div>
            </div>
            <div>
              <Label>Logo</Label>
              <FileUpload
                folder="settings" testId="settings-logo-upload"
                accept="image/*"
                value={s.logo_url || ""} onChange={(v) => setField("logo_url", v)}
                label="Upload your business logo"
              />
            </div>
          </CardContent>
        </Card>

        <Card className="border-border shadow-none">
          <CardContent className="p-6 space-y-4">
            <div className="tiny-label">Receipts & PDFs</div>
            <div className="grid sm:grid-cols-2 gap-4">
              <div><Label>Receipt prefix</Label>
                <Input maxLength={6} value={s.receipt_prefix || "RCP"} onChange={(e) => setField("receipt_prefix", e.target.value.toUpperCase())} /></div>
              <div><Label>Timezone</Label>
                <Input value={s.timezone || "Africa/Lagos"} onChange={(e) => setField("timezone", e.target.value)} /></div>
              <div className="sm:col-span-2"><Label>Receipt footer</Label>
                <Textarea rows={2} value={s.receipt_footer || ""} onChange={(e) => setField("receipt_footer", e.target.value)} /></div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border shadow-none">
          <CardContent className="p-6 space-y-4">
            <div className="tiny-label">Rent reminders</div>
            <div><Label>Send reminders on these days before expiry</Label>
              <Input placeholder="30, 14, 7, 3, 1" value={(s.reminder_days || []).join(", ")}
                     onChange={(e) => setField("reminder_days", e.target.value)} />
              <div className="text-xs text-muted-foreground mt-1">Comma-separated. Day 0 = expiry day. Reminders run automatically each morning.</div>
            </div>

            <div className="space-y-2 pt-2">
              {[
                ["email_rent_reminder", "Email rent expiry reminders to tenants"],
                ["email_payment_receipt", "Email receipts to tenants when a payment is recorded"],
                ["email_maintenance_update", "Email maintenance status changes to tenants"],
                ["email_notice", "Email notices to tenants when issued"],
              ].map(([k, label]) => (
                <label key={k} className="flex items-center justify-between rounded-md border border-border p-3 text-sm">
                  <span>{label}</span>
                  <Switch checked={!!(s.notification_prefs || {})[k]} onCheckedChange={(v) => setPref(k, v)} />
                </label>
              ))}
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end">
          <Button data-testid="settings-save-btn" type="submit" disabled={saving}>
            {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            <Save className="h-4 w-4 mr-2" /> Save settings
          </Button>
        </div>
      </form>
    </div>
  );
}
