import React, { useEffect, useState } from "react";
import { api, formatApiError } from "@/lib/api";
import PageHeader from "@/components/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Megaphone, Send } from "lucide-react";
import { toast } from "sonner";

export default function AdminAnnouncements() {
  const [list, setList] = useState([]);
  const [form, setForm] = useState({ title: "", message: "", audience: "landlords" });

  const load = async () => {
    // No GET on admin announcements; use platform listing via approximate route is not available.
    // We'll just keep the form here; full history is in activity logs.
  };

  useEffect(() => { load(); }, []);

  const submit = async (e) => {
    e.preventDefault();
    try {
      await api.post("/admin/announcements", form);
      toast.success("Announcement broadcast");
      setForm({ title: "", message: "", audience: form.audience });
      setList([{ ...form, id: Math.random(), created_at: new Date().toISOString() }, ...list]);
    } catch (e) { toast.error(formatApiError(e.response?.data?.detail)); }
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Announcements" subtitle="Broadcast messages to landlords, tenants, caretakers — or everyone." />
      <Card className="border-border shadow-none">
        <CardContent className="p-6">
          <form onSubmit={submit} className="grid sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <Label>Title</Label>
              <Input data-testid="ann-title-input" required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
            </div>
            <div className="sm:col-span-2">
              <Label>Message</Label>
              <Textarea data-testid="ann-message-input" required rows={5} value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} />
            </div>
            <div>
              <Label>Audience</Label>
              <Select value={form.audience} onValueChange={(v) => setForm({ ...form, audience: v })}>
                <SelectTrigger data-testid="ann-audience-select"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="landlords">Landlords</SelectItem>
                  <SelectItem value="caretakers">Caretakers</SelectItem>
                  <SelectItem value="tenants">Tenants</SelectItem>
                  <SelectItem value="all">Everyone</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end">
              <Button type="submit" data-testid="ann-submit-btn"><Send className="h-4 w-4 mr-1" /> Broadcast</Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {list.length > 0 && (
        <Card className="border-border shadow-none">
          <CardContent className="p-6">
            <div className="tiny-label mb-3">This session</div>
            {list.map((a) => (
              <div key={a.id} className="py-2 border-b last:border-b-0">
                <div className="flex items-center gap-2"><Megaphone className="h-4 w-4 text-primary" />
                  <span className="font-medium">{a.title}</span></div>
                <div className="text-sm text-muted-foreground mt-1">{a.message}</div>
                <div className="text-xs text-muted-foreground mt-1">to {a.audience}</div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
