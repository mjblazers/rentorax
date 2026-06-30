import React, { useEffect, useState } from "react";
import { api, formatApiError } from "@/lib/api";
import PageHeader from "@/components/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Plus, UserCog, Trash2 } from "lucide-react";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";

const PERMISSIONS = [
  ["view_tenants", "View tenants"],
  ["add_tenants", "Add tenants"],
  ["edit_tenants", "Edit tenants"],
  ["record_payment", "Record rent payment"],
  ["create_maintenance", "Create maintenance ticket"],
  ["update_maintenance", "Update maintenance ticket"],
  ["record_expense", "Record expenses"],
  ["view_accounting", "View accounting"],
  ["view_reports", "View reports"],
];

export default function Caretakers() {
  const [items, setItems] = useState([]);
  const [props, setProps] = useState([]);
  const [open, setOpen] = useState(false);
  const [info, setInfo] = useState(null);
  const empty = {
    name: "", email: "", phone: "", password: "",
    all_properties: false, assigned_properties: [],
    permissions: PERMISSIONS.reduce((a, [k]) => ({ ...a, [k]: k === "view_tenants" || k === "create_maintenance" }), {}),
  };
  const [form, setForm] = useState(empty);

  const load = async () => {
    const [c, p] = await Promise.all([api.get("/caretakers"), api.get("/properties")]);
    setItems(c.data); setProps(p.data);
  };
  useEffect(() => { load(); }, []);

  const submit = async (e) => {
    e.preventDefault();
    try {
      const { data } = await api.post("/caretakers", form);
      setInfo(data);
      setForm(empty); setOpen(false); load();
    } catch (e) { toast.error(formatApiError(e.response?.data?.detail)); }
  };

  const del = async (id) => {
    try { await api.delete(`/caretakers/${id}`); toast.success("Removed"); load(); }
    catch (e) { toast.error(formatApiError(e.response?.data?.detail)); }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Caretakers"
        subtitle="Give trusted people on the ground limited access to specific properties."
        actions={
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild><Button data-testid="add-caretaker-btn"><Plus className="h-4 w-4 mr-1" /> Add caretaker</Button></DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>New caretaker</DialogTitle>
                <DialogDescription>A login password will be auto-generated if left blank.</DialogDescription>
              </DialogHeader>
              <form onSubmit={submit} className="space-y-4">
                <div className="grid sm:grid-cols-2 gap-3">
                  <div><Label>Name *</Label><Input data-testid="ct-name" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
                  <div><Label>Email *</Label><Input data-testid="ct-email" required type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
                  <div><Label>Phone</Label><Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></div>
                  <div><Label>Password</Label><Input value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} placeholder="Auto-generated if blank" /></div>
                </div>

                <div className="rounded-md border border-border p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium text-sm">Access to all properties</div>
                      <div className="text-xs text-muted-foreground">When on, ignores the property list below.</div>
                    </div>
                    <Switch checked={form.all_properties} onCheckedChange={(v) => setForm({ ...form, all_properties: v })} data-testid="ct-all-props" />
                  </div>
                  {!form.all_properties && (
                    <div className="grid sm:grid-cols-2 gap-2">
                      {props.map((p) => {
                        const checked = form.assigned_properties.includes(p.id);
                        return (
                          <label key={p.id} className="flex items-center gap-2 rounded-md border border-border p-2 text-sm">
                            <Checkbox checked={checked} onCheckedChange={(v) => {
                              setForm({ ...form, assigned_properties: v ? [...form.assigned_properties, p.id] : form.assigned_properties.filter((x) => x !== p.id) });
                            }} />
                            {p.name}
                          </label>
                        );
                      })}
                    </div>
                  )}
                </div>

                <div className="rounded-md border border-border p-4">
                  <div className="font-medium text-sm mb-3">Permissions</div>
                  <div className="grid sm:grid-cols-2 gap-2">
                    {PERMISSIONS.map(([k, label]) => (
                      <label key={k} className="flex items-center gap-2 text-sm">
                        <Checkbox checked={!!form.permissions[k]} onCheckedChange={(v) => setForm({ ...form, permissions: { ...form.permissions, [k]: !!v } })} />
                        {label}
                      </label>
                    ))}
                  </div>
                </div>

                <DialogFooter><Button data-testid="ct-save" type="submit">Create caretaker</Button></DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        }
      />

      <Dialog open={!!info} onOpenChange={(o) => !o && setInfo(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Caretaker credentials</DialogTitle><DialogDescription>Copy and share securely. Shown only once.</DialogDescription></DialogHeader>
          {info && (
            <div className="text-sm space-y-2">
              <div><span className="tiny-label">Email</span><div className="font-mono">{info.email}</div></div>
              <div><span className="tiny-label">Password</span>
                <div className="font-mono bg-muted rounded-md p-2 select-all">{info.generated_password}</div>
              </div>
            </div>
          )}
          <DialogFooter><Button onClick={() => setInfo(null)}>Done</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      {items.length === 0 ? (
        <Card className="border-border shadow-none"><CardContent className="py-12 text-center text-muted-foreground"><UserCog className="h-7 w-7 mx-auto mb-2" /> No caretakers yet.</CardContent></Card>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {items.map((c) => (
            <Card key={c.id} data-testid={`caretaker-card-${c.id}`} className="border-border shadow-none stat-card">
              <CardContent className="p-5">
                <div className="flex justify-between items-start">
                  <div>
                    <div className="font-display text-lg font-semibold">{c.name}</div>
                    <div className="text-xs text-muted-foreground">{c.email}</div>
                  </div>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button size="icon" variant="ghost" className="text-destructive" data-testid={`ct-delete-${c.id}`}><Trash2 className="h-4 w-4" /></Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader><AlertDialogTitle>Remove caretaker?</AlertDialogTitle><AlertDialogDescription>They will lose access immediately.</AlertDialogDescription></AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={() => del(c.id)}>Remove</AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
                <div className="mt-3 flex flex-wrap gap-1">
                  {c.all_properties
                    ? <Badge variant="secondary">All properties</Badge>
                    : (c.assigned_properties || []).slice(0, 4).map((pid) => {
                        const p = props.find((x) => x.id === pid);
                        return p ? <Badge key={pid} variant="outline">{p.name}</Badge> : null;
                      })}
                </div>
                <div className="mt-3 text-xs text-muted-foreground">
                  {Object.entries(c.permissions || {}).filter(([, v]) => v).map(([k]) => k.replace(/_/g, " ")).join(", ") || "No permissions"}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
