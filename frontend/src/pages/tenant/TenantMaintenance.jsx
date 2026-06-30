import React, { useEffect, useState } from "react";
import { api, formatApiError, formatDate } from "@/lib/api";
import PageHeader from "@/components/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Plus, Wrench } from "lucide-react";
import { toast } from "sonner";

const CATEGORIES = ["Plumbing", "Electrical", "Roofing", "Doors", "Windows", "Painting", "Cleaning", "Security", "Water", "Generator", "Air Conditioner", "General Repairs", "Other"];
const PRIORITIES = ["Low", "Medium", "High", "Emergency"];
const STATUS_COLOR = {
  Open: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
  Assigned: "bg-violet-100 text-violet-800 dark:bg-violet-900/30 dark:text-violet-300",
  "In Progress": "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300",
  "Waiting for Parts": "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300",
  Completed: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
  Cancelled: "bg-stone-100 text-stone-700 dark:bg-stone-800 dark:text-stone-300",
};

export default function TenantMaintenance() {
  const [items, setItems] = useState([]);
  const [open, setOpen] = useState(false);
  const empty = { category: "Plumbing", priority: "Medium", description: "", photos: [] };
  const [form, setForm] = useState(empty);

  const load = async () => { const r = await api.get("/tenant/maintenance"); setItems(r.data); };
  useEffect(() => { load(); }, []);

  const submit = async (e) => {
    e.preventDefault();
    try { await api.post("/tenant/maintenance", form); toast.success("Submitted"); setForm(empty); setOpen(false); load(); }
    catch (e) { toast.error(formatApiError(e.response?.data?.detail)); }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Maintenance"
        subtitle="Report an issue with your unit. Your landlord is notified instantly."
        actions={
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild><Button data-testid="t-new-ticket"><Plus className="h-4 w-4 mr-1" /> Report issue</Button></DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Submit a maintenance request</DialogTitle></DialogHeader>
              <form onSubmit={submit} className="grid sm:grid-cols-2 gap-3">
                <div><Label>Category</Label>
                  <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                  </Select></div>
                <div><Label>Priority</Label>
                  <Select value={form.priority} onValueChange={(v) => setForm({ ...form, priority: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{PRIORITIES.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
                  </Select></div>
                <div className="sm:col-span-2"><Label>Description *</Label>
                  <Textarea data-testid="t-desc" required rows={4} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
                <DialogFooter className="sm:col-span-2"><Button data-testid="t-submit" type="submit">Submit</Button></DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        }
      />

      <div className="grid sm:grid-cols-2 gap-3">
        {items.length === 0 && (
          <Card className="border-border shadow-none sm:col-span-2"><CardContent className="py-12 text-center text-muted-foreground"><Wrench className="h-6 w-6 mx-auto mb-2" />No tickets yet.</CardContent></Card>
        )}
        {items.map((t) => (
          <Card key={t.id} className="border-border shadow-none stat-card">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div className="font-mono text-xs">{t.ticket_number}</div>
                <Badge className={STATUS_COLOR[t.status]}>{t.status}</Badge>
              </div>
              <div className="mt-2 font-medium">{t.category} — {t.priority}</div>
              <div className="text-sm text-muted-foreground mt-1">{t.description}</div>
              <div className="text-xs text-muted-foreground mt-3">{formatDate(t.date_reported)}</div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
