import React, { useEffect, useState, useMemo } from "react";
import { api, formatApiError, formatDate, formatNaira } from "@/lib/api";
import PageHeader from "@/components/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Plus, Wrench } from "lucide-react";
import { toast } from "sonner";

const STATUSES = ["Open", "Assigned", "In Progress", "Waiting for Parts", "Completed", "Cancelled"];
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
const PRIORITY_COLOR = {
  Low: "border-blue-300 text-blue-700 dark:text-blue-300",
  Medium: "border-amber-300 text-amber-700 dark:text-amber-300",
  High: "border-orange-300 text-orange-700 dark:text-orange-300",
  Emergency: "border-rose-400 text-rose-700 dark:text-rose-300",
};

export default function Maintenance({ readOnly = false }) {
  const [items, setItems] = useState([]);
  const [props, setProps] = useState([]);
  const [unitsByProp, setUnitsByProp] = useState({});
  const [tenantsByProp, setTenantsByProp] = useState({});
  const [open, setOpen] = useState(false);
  const empty = { property_id: "", unit_id: "", tenant_id: "", category: "Plumbing", priority: "Medium", description: "", photos: [], estimated_cost: 0 };
  const [form, setForm] = useState(empty);

  const load = async () => {
    const [m, p] = await Promise.all([api.get("/maintenance"), api.get("/properties")]);
    setItems(m.data); setProps(p.data);
  };
  useEffect(() => { load(); }, []);

  useEffect(() => {
    if (!form.property_id) return;
    if (!unitsByProp[form.property_id]) api.get(`/units?property_id=${form.property_id}`).then((r) => setUnitsByProp((m) => ({ ...m, [form.property_id]: r.data })));
    if (!tenantsByProp[form.property_id]) api.get(`/tenants?property_id=${form.property_id}`).then((r) => setTenantsByProp((m) => ({ ...m, [form.property_id]: r.data })));
  }, [form.property_id, unitsByProp, tenantsByProp]);

  const submit = async (e) => {
    e.preventDefault();
    try {
      await api.post("/maintenance", {
        ...form, estimated_cost: Number(form.estimated_cost || 0),
        unit_id: form.unit_id || null, tenant_id: form.tenant_id || null,
      });
      toast.success("Ticket created");
      setOpen(false); setForm(empty); load();
    } catch (e) { toast.error(formatApiError(e.response?.data?.detail)); }
  };

  const changeStatus = async (id, status) => {
    try {
      await api.patch(`/maintenance/${id}`, { status });
      load();
    } catch (e) { toast.error(formatApiError(e.response?.data?.detail)); }
  };

  const onDragStart = (e, ticketId) => e.dataTransfer.setData("ticket", ticketId);
  const onDrop = (e, status) => { const id = e.dataTransfer.getData("ticket"); if (id) changeStatus(id, status); };

  const grouped = useMemo(() => {
    const g = Object.fromEntries(STATUSES.map((s) => [s, []]));
    items.forEach((t) => { if (g[t.status]) g[t.status].push(t); });
    return g;
  }, [items]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Maintenance"
        subtitle="Track tickets across statuses. Drag cards between columns to update."
        actions={readOnly ? null : (
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button data-testid="new-ticket-btn"><Plus className="h-4 w-4 mr-1" /> New ticket</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>New maintenance ticket</DialogTitle>
                <DialogDescription>A ticket number will be auto-assigned.</DialogDescription>
              </DialogHeader>
              <form onSubmit={submit} className="grid sm:grid-cols-2 gap-3">
                <div><Label>Property *</Label>
                  <Select value={form.property_id} onValueChange={(v) => setForm({ ...form, property_id: v, unit_id: "", tenant_id: "" })}>
                    <SelectTrigger data-testid="mt-property-select"><SelectValue placeholder="Select" /></SelectTrigger>
                    <SelectContent>{props.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent>
                  </Select></div>
                <div><Label>Unit</Label>
                  <Select value={form.unit_id} onValueChange={(v) => setForm({ ...form, unit_id: v })} disabled={!form.property_id}>
                    <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                    <SelectContent>{(unitsByProp[form.property_id] || []).map((u) => <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>)}</SelectContent>
                  </Select></div>
                <div><Label>Tenant</Label>
                  <Select value={form.tenant_id} onValueChange={(v) => setForm({ ...form, tenant_id: v })} disabled={!form.property_id}>
                    <SelectTrigger><SelectValue placeholder="Optional" /></SelectTrigger>
                    <SelectContent>{(tenantsByProp[form.property_id] || []).map((t) => <SelectItem key={t.id} value={t.id}>{t.full_name}</SelectItem>)}</SelectContent>
                  </Select></div>
                <div><Label>Category *</Label>
                  <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                  </Select></div>
                <div><Label>Priority *</Label>
                  <Select value={form.priority} onValueChange={(v) => setForm({ ...form, priority: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{PRIORITIES.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
                  </Select></div>
                <div><Label>Estimated cost (₦)</Label>
                  <Input type="number" min="0" value={form.estimated_cost} onChange={(e) => setForm({ ...form, estimated_cost: e.target.value })} /></div>
                <div className="sm:col-span-2"><Label>Description *</Label>
                  <Textarea data-testid="mt-desc-input" required rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
                <DialogFooter className="sm:col-span-2"><Button data-testid="mt-save-btn" type="submit">Create ticket</Button></DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        )}
      />

      <div className="grid lg:grid-cols-6 gap-3">
        {STATUSES.map((s) => (
          <div key={s} onDragOver={(e) => e.preventDefault()} onDrop={(e) => onDrop(e, s)}>
            <div className="rounded-lg border border-border bg-card flex flex-col h-[60vh]">
              <div className="px-3 py-2 border-b border-border flex items-center justify-between">
                <span className={`text-xs font-medium px-2 py-1 rounded ${STATUS_COLOR[s]}`}>{s}</span>
                <span className="text-xs text-muted-foreground">{grouped[s].length}</span>
              </div>
              <div className="flex-1 overflow-y-auto p-2 space-y-2">
                {grouped[s].map((t) => (
                  <div
                    key={t.id}
                    draggable
                    onDragStart={(e) => onDragStart(e, t.id)}
                    data-testid={`ticket-card-${t.id}`}
                    className="rounded-md border border-border bg-card p-3 hover:shadow-md cursor-grab active:cursor-grabbing"
                  >
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-mono">{t.ticket_number}</span>
                      <Badge variant="outline" className={PRIORITY_COLOR[t.priority]}>{t.priority}</Badge>
                    </div>
                    <div className="font-medium text-sm mt-1.5">{t.category}</div>
                    <div className="text-xs text-muted-foreground line-clamp-2 mt-0.5">{t.description}</div>
                    <div className="text-[11px] text-muted-foreground mt-2">{t.property_name} {t.unit_name && `· ${t.unit_name}`}</div>
                    <div className="text-[11px] text-muted-foreground mt-0.5">{formatDate(t.date_reported)}</div>
                  </div>
                ))}
                {grouped[s].length === 0 && <div className="text-[11px] text-muted-foreground text-center py-6">Drop here</div>}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
