import React, { useEffect, useState, useMemo } from "react";
import { api, formatApiError, formatNaira, formatDate } from "@/lib/api";
import PageHeader from "@/components/PageHeader";
import ExpiryBadge from "@/components/ExpiryBadge";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Plus, Search, Trash2, Users, Eye, LogOut } from "lucide-react";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import MoveOutDialog from "@/components/MoveOutDialog";

const FREQUENCIES = ["yearly", "quarterly", "monthly"];

export default function Tenants() {
  const nav = useNavigate();
  const [items, setItems] = useState([]);
  const [props, setProps] = useState([]);
  const [unitsByProp, setUnitsByProp] = useState({});
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [moveOut, setMoveOut] = useState(null);
  const empty = {
    property_id: "", unit_id: "", full_name: "", phone: "", email: "",
    gender: "", date_of_birth: "", nin: "", home_address: "", occupation: "",
    workplace: "", workplace_address: "", emergency_contact_name: "",
    emergency_contact_phone: "", relationship: "", guarantor_name: "",
    guarantor_phone: "", guarantor_address: "", social_media: "",
    lease_start: new Date().toISOString().slice(0, 10),
    lease_expiry: new Date(Date.now() + 365 * 86400 * 1000).toISOString().slice(0, 10),
    amount_paid: 0, payment_frequency: "yearly", notes: "",
    portal_enabled: false, portal_password: "",
  };
  const [form, setForm] = useState(empty);

  const load = async (query = "") => {
    const [t, p] = await Promise.all([
      api.get(`/tenants${query ? `?q=${encodeURIComponent(query)}` : ""}`),
      api.get("/properties"),
    ]);
    setItems(t.data); setProps(p.data);
  };
  useEffect(() => { load(); }, []);

  useEffect(() => {
    if (!form.property_id || unitsByProp[form.property_id]) return;
    api.get(`/units?property_id=${form.property_id}`).then((r) => {
      setUnitsByProp((m) => ({ ...m, [form.property_id]: r.data }));
    });
  }, [form.property_id, unitsByProp]);

  const submit = async (e) => {
    e.preventDefault();
    try {
      const payload = { ...form, amount_paid: Number(form.amount_paid || 0) };
      if (!payload.portal_enabled) { payload.portal_password = ""; }
      await api.post("/tenants", payload);
      toast.success("Tenant created");
      setOpen(false); setForm(empty); load(q);
    } catch (e) { toast.error(formatApiError(e.response?.data?.detail)); }
  };

  const del = async (id) => {
    try { await api.delete(`/tenants/${id}`); toast.success("Tenant removed"); load(q); }
    catch (e) { toast.error(formatApiError(e.response?.data?.detail)); }
  };

  const availableUnits = useMemo(() => {
    const list = unitsByProp[form.property_id] || [];
    return list.filter((u) => u.status !== "occupied" || u.id === form.unit_id);
  }, [unitsByProp, form.property_id, form.unit_id]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Tenants"
        subtitle="Track full tenant records, leases, guarantors and portal access."
        actions={
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button data-testid="add-tenant-btn"><Plus className="h-4 w-4 mr-1" /> Add tenant</Button>
            </DialogTrigger>
            <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>New tenant</DialogTitle>
                <DialogDescription>All fields with * are required. Enable portal to give the tenant login access.</DialogDescription>
              </DialogHeader>
              <form onSubmit={submit} className="grid sm:grid-cols-2 gap-3">
                <div><Label>Full name *</Label>
                  <Input data-testid="tenant-name-input" required value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} /></div>
                <div><Label>Phone *</Label>
                  <Input required value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></div>
                <div><Label>Email</Label>
                  <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
                <div><Label>Gender</Label>
                  <Select value={form.gender} onValueChange={(v) => setForm({ ...form, gender: v })}>
                    <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="male">Male</SelectItem>
                      <SelectItem value="female">Female</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select></div>
                <div><Label>NIN</Label>
                  <Input value={form.nin} onChange={(e) => setForm({ ...form, nin: e.target.value })} /></div>
                <div><Label>Date of birth</Label>
                  <Input type="date" value={form.date_of_birth} onChange={(e) => setForm({ ...form, date_of_birth: e.target.value })} /></div>

                <div className="sm:col-span-2"><Label>Home address</Label>
                  <Input value={form.home_address} onChange={(e) => setForm({ ...form, home_address: e.target.value })} /></div>

                <div><Label>Occupation</Label>
                  <Input value={form.occupation} onChange={(e) => setForm({ ...form, occupation: e.target.value })} /></div>
                <div><Label>Workplace</Label>
                  <Input value={form.workplace} onChange={(e) => setForm({ ...form, workplace: e.target.value })} /></div>
                <div className="sm:col-span-2"><Label>Workplace address</Label>
                  <Input value={form.workplace_address} onChange={(e) => setForm({ ...form, workplace_address: e.target.value })} /></div>

                <div><Label>Emergency name</Label>
                  <Input value={form.emergency_contact_name} onChange={(e) => setForm({ ...form, emergency_contact_name: e.target.value })} /></div>
                <div><Label>Emergency phone</Label>
                  <Input value={form.emergency_contact_phone} onChange={(e) => setForm({ ...form, emergency_contact_phone: e.target.value })} /></div>
                <div><Label>Relationship</Label>
                  <Input value={form.relationship} onChange={(e) => setForm({ ...form, relationship: e.target.value })} /></div>

                <div><Label>Guarantor name</Label>
                  <Input value={form.guarantor_name} onChange={(e) => setForm({ ...form, guarantor_name: e.target.value })} /></div>
                <div><Label>Guarantor phone</Label>
                  <Input value={form.guarantor_phone} onChange={(e) => setForm({ ...form, guarantor_phone: e.target.value })} /></div>
                <div className="sm:col-span-2"><Label>Guarantor address</Label>
                  <Input value={form.guarantor_address} onChange={(e) => setForm({ ...form, guarantor_address: e.target.value })} /></div>

                <div><Label>Property *</Label>
                  <Select value={form.property_id} onValueChange={(v) => setForm({ ...form, property_id: v, unit_id: "" })}>
                    <SelectTrigger data-testid="tenant-property-select"><SelectValue placeholder="Select property" /></SelectTrigger>
                    <SelectContent>{props.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent>
                  </Select></div>
                <div><Label>Unit *</Label>
                  <Select value={form.unit_id} onValueChange={(v) => setForm({ ...form, unit_id: v })} disabled={!form.property_id}>
                    <SelectTrigger data-testid="tenant-unit-select"><SelectValue placeholder="Select unit" /></SelectTrigger>
                    <SelectContent>{availableUnits.map((u) => <SelectItem key={u.id} value={u.id}>{u.name} ({u.status})</SelectItem>)}</SelectContent>
                  </Select></div>

                <div><Label>Lease start *</Label>
                  <Input type="date" required value={form.lease_start} onChange={(e) => setForm({ ...form, lease_start: e.target.value })} /></div>
                <div><Label>Lease expiry *</Label>
                  <Input data-testid="tenant-lease-expiry" type="date" required value={form.lease_expiry} onChange={(e) => setForm({ ...form, lease_expiry: e.target.value })} /></div>

                <div><Label>Amount paid (₦)</Label>
                  <Input type="number" min="0" value={form.amount_paid} onChange={(e) => setForm({ ...form, amount_paid: e.target.value })} /></div>
                <div><Label>Frequency</Label>
                  <Select value={form.payment_frequency} onValueChange={(v) => setForm({ ...form, payment_frequency: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{FREQUENCIES.map((f) => <SelectItem key={f} value={f}>{f}</SelectItem>)}</SelectContent>
                  </Select></div>

                <div className="sm:col-span-2"><Label>Notes</Label>
                  <Textarea rows={2} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></div>

                <div className="sm:col-span-2 rounded-md border border-border p-3 flex items-center justify-between">
                  <div>
                    <div className="font-medium text-sm">Enable tenant portal</div>
                    <div className="text-xs text-muted-foreground">Allow the tenant to log in and view payments / submit issues.</div>
                  </div>
                  <Switch data-testid="tenant-portal-switch" checked={form.portal_enabled} onCheckedChange={(v) => setForm({ ...form, portal_enabled: v })} />
                </div>
                {form.portal_enabled && (
                  <div className="sm:col-span-2"><Label>Portal password</Label>
                    <Input data-testid="tenant-portal-pwd" required type="text" placeholder="A strong starter password" value={form.portal_password} onChange={(e) => setForm({ ...form, portal_password: e.target.value })} />
                    <div className="text-xs text-muted-foreground mt-1">Tenant logs in with their email + this password. They can change it later.</div>
                  </div>
                )}

                <DialogFooter className="sm:col-span-2">
                  <Button data-testid="tenant-save-btn" type="submit">Create tenant</Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        }
      />

      <div className="relative max-w-md">
        <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <Input data-testid="tenant-search-input" placeholder="Search name, phone, NIN, guarantor…" className="pl-9" value={q} onChange={(e) => { setQ(e.target.value); load(e.target.value); }} />
      </div>

      <Card className="border-border shadow-none overflow-hidden">
        <Table className="striped-table">
          <TableHeader>
            <TableRow>
              <TableHead>Tenant</TableHead>
              <TableHead>Property · Unit</TableHead>
              <TableHead>Phone</TableHead>
              <TableHead>Paid</TableHead>
              <TableHead>Lease Expiry</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.length === 0 && (
              <TableRow><TableCell colSpan={6} className="py-10 text-center text-muted-foreground">
                <Users className="h-6 w-6 mx-auto mb-2" /> No tenants yet.
              </TableCell></TableRow>
            )}
            {items.map((t) => (
              <TableRow key={t.id} data-testid={`tenant-row-${t.id}`}>
                <TableCell>
                  <div className="font-medium">{t.full_name}</div>
                  <div className="text-xs text-muted-foreground">{t.occupation || "—"}</div>
                </TableCell>
                <TableCell className="text-sm">
                  <div>{t.property_name}</div>
                  <div className="text-xs text-muted-foreground">{t.unit_name}</div>
                </TableCell>
                <TableCell className="text-sm">{t.phone}</TableCell>
                <TableCell className="text-sm">{formatNaira(t.amount_paid)}</TableCell>
                <TableCell>
                  <div className="text-xs">{formatDate(t.lease_expiry)}</div>
                  <ExpiryBadge tier={t.lease_status} days={t.days_to_expiry} />
                </TableCell>
                <TableCell className="text-right">
                  <Button size="icon" variant="ghost" onClick={() => nav(`/landlord/tenants/${t.id}`)} data-testid={`tenant-view-${t.id}`}><Eye className="h-4 w-4" /></Button>
                  <Button size="icon" variant="ghost" onClick={() => setMoveOut(t)} data-testid={`tenant-moveout-${t.id}`} title="Move out">
                    <LogOut className="h-4 w-4" />
                  </Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button size="icon" variant="ghost" className="text-destructive" data-testid={`tenant-delete-${t.id}`} title="Archive"><Trash2 className="h-4 w-4" /></Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Archive this tenant?</AlertDialogTitle>
                        <AlertDialogDescription>The tenant record and all history (payments, maintenance, receipts) are preserved. The unit becomes vacant.</AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={() => del(t.id)}>Archive</AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

      <MoveOutDialog tenant={moveOut} open={!!moveOut} onClose={() => setMoveOut(null)} onComplete={() => load(q)} />
    </div>
  );
}
