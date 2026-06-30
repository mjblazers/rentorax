import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { api, formatApiError, formatDate, formatNaira } from "@/lib/api";
import PageHeader from "@/components/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { ArrowLeft, Plus, Edit, Trash2, History, UserPlus, Wrench } from "lucide-react";
import { toast } from "sonner";

const STATUS_STYLES = {
  occupied: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
  vacant: "bg-stone-100 text-stone-700 dark:bg-stone-800 dark:text-stone-300",
  reserved: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300",
  under_maintenance: "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300",
};

export default function PropertyDetail() {
  const { id } = useParams();
  const nav = useNavigate();
  const [property, setProperty] = useState(null);
  const [units, setUnits] = useState([]);
  const [open, setOpen] = useState(false);
  const [unitForm, setUnitForm] = useState({ name: "", status: "vacant" });
  const [editing, setEditing] = useState(null);
  const [historyUnit, setHistoryUnit] = useState(null);
  const [history, setHistory] = useState([]);
  const [assignUnit, setAssignUnit] = useState(null);
  const [archived, setArchived] = useState([]);
  const [assignForm, setAssignForm] = useState({
    tenant_id: "", lease_start: new Date().toISOString().slice(0, 10),
    lease_expiry: new Date(Date.now() + 365 * 86400 * 1000).toISOString().slice(0, 10),
    amount_paid: 0, payment_frequency: "yearly",
  });

  const load = async () => {
    const [p, u] = await Promise.all([
      api.get(`/properties/${id}`), api.get(`/units?property_id=${id}`),
    ]);
    setProperty(p.data); setUnits(u.data);
  };
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [id]);

  const openHistory = async (uid) => {
    setHistoryUnit(uid);
    const r = await api.get(`/units/${uid}/history`);
    setHistory(r.data);
  };

  const openAssign = async (uid) => {
    setAssignUnit(uid);
    const r = await api.get("/tenants?include_archived=true");
    setArchived(r.data.filter((t) => t.archived));
    setAssignForm({ ...assignForm, tenant_id: "" });
  };

  const doAssign = async (e) => {
    e.preventDefault();
    try {
      await api.post(`/units/${assignUnit}/assign-existing`, { ...assignForm, amount_paid: Number(assignForm.amount_paid) });
      toast.success("Tenant assigned");
      setAssignUnit(null); load();
    } catch (e) { toast.error(formatApiError(e.response?.data?.detail)); }
  };

  const submit = async (e) => {
    e.preventDefault();
    try {
      if (editing) await api.patch(`/units/${editing}`, unitForm);
      else await api.post("/units", { ...unitForm, property_id: id });
      toast.success("Saved");
      setOpen(false); setEditing(null); setUnitForm({ name: "", status: "vacant" });
      load();
    } catch (e) { toast.error(formatApiError(e.response?.data?.detail)); }
  };

  const del = async (uid) => {
    try { await api.delete(`/units/${uid}`); toast.success("Unit removed"); load(); }
    catch (e) { toast.error(formatApiError(e.response?.data?.detail)); }
  };

  return (
    <div className="space-y-6">
      <Button variant="ghost" size="sm" onClick={() => nav(-1)} className="-ml-2"><ArrowLeft className="h-4 w-4 mr-1" /> Back</Button>
      <PageHeader
        title={property?.name || "Property"}
        subtitle={`${property?.address || ""} · ${property?.state || ""}`}
        actions={
          <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) { setEditing(null); setUnitForm({ name: "", status: "vacant" }); } }}>
            <DialogTrigger asChild><Button data-testid="add-unit-btn"><Plus className="h-4 w-4 mr-1" /> Add unit</Button></DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>{editing ? "Edit unit" : "Add unit"}</DialogTitle></DialogHeader>
              <form onSubmit={submit} className="space-y-3">
                <div><label className="text-sm">Name</label><Input required value={unitForm.name} onChange={(e) => setUnitForm({ ...unitForm, name: e.target.value })} /></div>
                <div><label className="text-sm">Status</label>
                  <Select value={unitForm.status} onValueChange={(v) => setUnitForm({ ...unitForm, status: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="vacant">Vacant</SelectItem>
                      <SelectItem value="occupied">Occupied</SelectItem>
                      <SelectItem value="reserved">Reserved</SelectItem>
                      <SelectItem value="under_maintenance">Under maintenance</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <DialogFooter><Button type="submit">{editing ? "Save" : "Add"}</Button></DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        }
      />

      <Card className="border-border shadow-none">
        <CardContent className="p-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {units.map((u) => (
              <div key={u.id} data-testid={`unit-${u.id}`} className="rounded-md border border-border p-4">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="font-display text-lg font-semibold">{u.name}</div>
                    <Badge className={`mt-1 text-[10px] ${STATUS_STYLES[u.status] || ""}`}>{u.status?.replace("_", " ")}</Badge>
                  </div>
                  <div className="flex flex-col gap-1">
                    <Button size="icon" variant="ghost" onClick={() => openHistory(u.id)} title="Occupancy history" data-testid={`unit-history-${u.id}`}>
                      <History className="h-3.5 w-3.5" />
                    </Button>
                    <Button size="icon" variant="ghost" onClick={() => { setEditing(u.id); setUnitForm({ name: u.name, status: u.status }); setOpen(true); }}>
                      <Edit className="h-3.5 w-3.5" />
                    </Button>
                    <Button size="icon" variant="ghost" className="text-destructive" onClick={() => del(u.id)}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
                {u.status === "vacant" && (
                  <Button data-testid={`assign-tenant-${u.id}`} size="sm" variant="outline" className="mt-3 w-full" onClick={() => openAssign(u.id)}>
                    <UserPlus className="h-3.5 w-3.5 mr-1" /> Assign tenant
                  </Button>
                )}
                {u.status === "under_maintenance" && (
                  <div className="mt-3 text-xs text-orange-700 dark:text-orange-300 flex items-center gap-1">
                    <Wrench className="h-3 w-3" /> Under maintenance
                  </div>
                )}
              </div>
            ))}
            {units.length === 0 && <div className="col-span-full text-sm text-muted-foreground">No units yet.</div>}
          </div>
        </CardContent>
      </Card>

      {/* Occupancy history dialog */}
      <Dialog open={!!historyUnit} onOpenChange={(o) => !o && setHistoryUnit(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Occupancy history</DialogTitle><DialogDescription>Every tenant that has occupied this unit.</DialogDescription></DialogHeader>
          {history.length === 0 ? (
            <div className="text-sm text-muted-foreground">No occupancy yet.</div>
          ) : (
            <ol className="relative border-l border-border pl-5 space-y-4">
              {history.map((h) => (
                <li key={h.id} className="text-sm">
                  <div className="absolute -left-1.5 h-3 w-3 rounded-full bg-primary"></div>
                  <div className="font-medium">{h.full_name}</div>
                  <div className="text-xs text-muted-foreground">
                    {formatDate(h.lease_start)} — {h.vacated_at ? formatDate(h.vacated_at) : formatDate(h.lease_expiry)}
                  </div>
                  <div className="text-xs"><Badge variant="outline" className="mt-1 capitalize">{h.status}</Badge></div>
                </li>
              ))}
            </ol>
          )}
        </DialogContent>
      </Dialog>

      {/* Assign existing tenant dialog */}
      <Dialog open={!!assignUnit} onOpenChange={(o) => !o && setAssignUnit(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Assign tenant to unit</DialogTitle><DialogDescription>Reactivate an archived tenant for this vacant unit, or create a new tenant from the Tenants page.</DialogDescription></DialogHeader>
          <form onSubmit={doAssign} className="space-y-3">
            <div><Label>Archived tenant *</Label>
              <Select value={assignForm.tenant_id} onValueChange={(v) => setAssignForm({ ...assignForm, tenant_id: v })}>
                <SelectTrigger data-testid="assign-tenant-select"><SelectValue placeholder={archived.length ? "Select a previous tenant" : "No archived tenants — create a new one from Tenants"} /></SelectTrigger>
                <SelectContent>{archived.map((t) => <SelectItem key={t.id} value={t.id}>{t.full_name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Lease start</Label><Input type="date" required value={assignForm.lease_start} onChange={(e) => setAssignForm({ ...assignForm, lease_start: e.target.value })} /></div>
              <div><Label>Lease expiry</Label><Input type="date" required value={assignForm.lease_expiry} onChange={(e) => setAssignForm({ ...assignForm, lease_expiry: e.target.value })} /></div>
              <div><Label>Amount (₦)</Label><Input type="number" min="0" value={assignForm.amount_paid} onChange={(e) => setAssignForm({ ...assignForm, amount_paid: e.target.value })} /></div>
              <div><Label>Frequency</Label>
                <Select value={assignForm.payment_frequency} onValueChange={(v) => setAssignForm({ ...assignForm, payment_frequency: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="yearly">Yearly</SelectItem>
                    <SelectItem value="quarterly">Quarterly</SelectItem>
                    <SelectItem value="monthly">Monthly</SelectItem>
                  </SelectContent>
                </Select></div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => nav("/landlord/tenants")}>Create new instead</Button>
              <Button data-testid="assign-submit" type="submit" disabled={!assignForm.tenant_id}>Assign</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
