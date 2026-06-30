import React, { useEffect, useState } from "react";
import { api, formatApiError, formatDate } from "@/lib/api";
import PageHeader from "@/components/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Megaphone, Send } from "lucide-react";
import { toast } from "sonner";

export default function LandlordAnnouncements() {
  const [list, setList] = useState([]);
  const [form, setForm] = useState({ title: "", message: "", audience: "tenants" });

  const load = async () => {
    const r = await api.get("/announcements"); setList(r.data);
  };
  useEffect(() => { load(); }, []);

  const submit = async (e) => {
    e.preventDefault();
    try { await api.post("/announcements", form); toast.success("Sent"); setForm({ ...form, title: "", message: "" }); load(); }
    catch (e) { toast.error(formatApiError(e.response?.data?.detail)); }
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Announcements" subtitle="Send notices to your tenants or caretakers." />
      <Card className="border-border shadow-none">
        <CardContent className="p-6">
          <form onSubmit={submit} className="grid sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2"><Label>Title</Label><Input data-testid="lann-title" required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></div>
            <div className="sm:col-span-2"><Label>Message</Label><Textarea data-testid="lann-msg" required rows={4} value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} /></div>
            <div><Label>Audience</Label>
              <Select value={form.audience} onValueChange={(v) => setForm({ ...form, audience: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="tenants">Tenants</SelectItem>
                  <SelectItem value="caretakers">Caretakers</SelectItem>
                </SelectContent>
              </Select></div>
            <div className="flex items-end"><Button data-testid="lann-send" type="submit"><Send className="h-4 w-4 mr-1" /> Send</Button></div>
          </form>
        </CardContent>
      </Card>

      <Card className="border-border shadow-none">
        <CardContent className="p-6">
          <div className="tiny-label mb-3">History</div>
          <div className="divide-y divide-border">
            {list.length === 0 && <div className="text-sm text-muted-foreground">No announcements yet.</div>}
            {list.map((a) => (
              <div key={a.id} className="py-3">
                <div className="flex items-center gap-2"><Megaphone className="h-4 w-4 text-primary" /><div className="font-medium">{a.title}</div></div>
                <div className="text-sm text-muted-foreground mt-1">{a.message}</div>
                <div className="text-xs text-muted-foreground mt-1">{formatDate(a.created_at)} · to {a.audience}</div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
