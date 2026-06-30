import React, { useEffect, useState } from "react";
import { api, formatApiError, formatDate } from "@/lib/api";
import PageHeader from "@/components/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
  DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Plus, MoreVertical, Search, Building2, Mail, Phone, KeyRound, Pause, Play, Trash2 } from "lucide-react";
import { toast } from "sonner";

export default function AdminLandlords() {
  const [items, setItems] = useState([]);
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", phone: "", plan: "starter" });
  const [createdInfo, setCreatedInfo] = useState(null); // password to show once

  const load = async (query = "") => {
    const r = await api.get(`/admin/landlords?q=${encodeURIComponent(query)}`);
    setItems(r.data);
  };
  useEffect(() => { load(); }, []);

  const onCreate = async (e) => {
    e.preventDefault();
    try {
      const { data } = await api.post("/admin/landlords", form);
      setCreatedInfo(data);
      setOpen(false);
      setForm({ name: "", email: "", phone: "", plan: "starter" });
      toast.success("Landlord created");
      load(q);
    } catch (e) {
      toast.error(formatApiError(e.response?.data?.detail));
    }
  };

  const doAction = async (id, action) => {
    try {
      if (action === "delete") {
        await api.delete(`/admin/landlords/${id}`);
        toast.success("Landlord deleted");
      } else if (action === "reset") {
        const { data } = await api.post(`/admin/landlords/${id}/reset-password`);
        setCreatedInfo({ email: items.find((i) => i.id === id)?.email, generated_password: data.new_password, action: "reset" });
      } else {
        await api.post(`/admin/landlords/${id}/${action}`);
        toast.success(`Landlord ${action}d`);
      }
      load(q);
    } catch (e) { toast.error(formatApiError(e.response?.data?.detail)); }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Landlords"
        subtitle="Create accounts, manage subscriptions and reset passwords."
        actions={
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button data-testid="create-landlord-btn">
                <Plus className="h-4 w-4 mr-1" /> Add landlord
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create a new landlord</DialogTitle>
                <DialogDescription>
                  A unique email is required. A secure password will be auto-generated if you leave it blank.
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={onCreate} className="space-y-3">
                <div><Label>Full name</Label>
                  <Input data-testid="landlord-name-input" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
                <div><Label>Email</Label>
                  <Input data-testid="landlord-email-input" required type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
                <div><Label>Phone</Label>
                  <Input data-testid="landlord-phone-input" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></div>
                <div><Label>Plan</Label>
                  <Input value={form.plan} onChange={(e) => setForm({ ...form, plan: e.target.value })} /></div>
                <DialogFooter>
                  <Button data-testid="landlord-save-btn" type="submit">Create landlord</Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        }
      />

      {/* Generated credentials modal */}
      <Dialog open={!!createdInfo} onOpenChange={(o) => !o && setCreatedInfo(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{createdInfo?.action === "reset" ? "Password reset" : "Account credentials"}</DialogTitle>
            <DialogDescription>
              Copy and share these credentials securely. They won't be shown again.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 text-sm">
            <div><span className="tiny-label">Email</span><div className="font-mono">{createdInfo?.email}</div></div>
            <div><span className="tiny-label">Password</span>
              <div data-testid="generated-password" className="font-mono bg-muted rounded-md p-2 select-all">
                {createdInfo?.generated_password}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button onClick={() => setCreatedInfo(null)}>Done</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <div className="flex items-center gap-2">
        <div className="relative flex-1 max-w-md">
          <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            data-testid="landlords-search-input"
            placeholder="Search by name, email, phone…"
            value={q} onChange={(e) => { setQ(e.target.value); load(e.target.value); }}
            className="pl-9"
          />
        </div>
      </div>

      {items.length === 0 ? (
        <Card className="border-border shadow-none">
          <CardContent className="py-12 text-center">
            <Building2 className="h-8 w-8 mx-auto text-muted-foreground" />
            <div className="mt-3 font-medium">No landlords yet</div>
            <div className="text-sm text-muted-foreground">Create your first landlord to get started.</div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {items.map((l) => (
            <Card key={l.id} data-testid={`landlord-card-${l.id}`} className="border-border shadow-none stat-card">
              <CardContent className="p-5">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="font-display text-lg font-semibold">{l.name}</div>
                    <div className="text-xs text-muted-foreground mt-0.5">{formatDate(l.created_at)}</div>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" data-testid={`landlord-menu-${l.id}`}>
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => doAction(l.id, "reset")}>
                        <KeyRound className="h-4 w-4 mr-2" /> Reset password
                      </DropdownMenuItem>
                      {l.suspended ? (
                        <DropdownMenuItem onClick={() => doAction(l.id, "activate")}>
                          <Play className="h-4 w-4 mr-2" /> Activate
                        </DropdownMenuItem>
                      ) : (
                        <DropdownMenuItem onClick={() => doAction(l.id, "suspend")}>
                          <Pause className="h-4 w-4 mr-2" /> Suspend
                        </DropdownMenuItem>
                      )}
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <DropdownMenuItem onSelect={(e) => e.preventDefault()} className="text-destructive">
                            <Trash2 className="h-4 w-4 mr-2" /> Delete
                          </DropdownMenuItem>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete this landlord?</AlertDialogTitle>
                            <AlertDialogDescription>
                              This permanently removes the landlord and ALL their data (properties, tenants, payments, caretakers).
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction data-testid={`landlord-delete-confirm-${l.id}`} onClick={() => doAction(l.id, "delete")}>
                              Delete
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>

                <div className="mt-3 space-y-1 text-sm text-muted-foreground">
                  <div className="flex items-center gap-2"><Mail className="h-3.5 w-3.5" /> {l.email}</div>
                  {l.phone && <div className="flex items-center gap-2"><Phone className="h-3.5 w-3.5" /> {l.phone}</div>}
                </div>

                <div className="mt-4 grid grid-cols-3 gap-2 text-xs">
                  <div className="rounded-md border border-border p-2">
                    <div className="tiny-label">Buildings</div>
                    <div className="font-medium text-sm mt-0.5">{l.property_count}</div>
                  </div>
                  <div className="rounded-md border border-border p-2">
                    <div className="tiny-label">Tenants</div>
                    <div className="font-medium text-sm mt-0.5">{l.tenant_count}</div>
                  </div>
                  <div className="rounded-md border border-border p-2">
                    <div className="tiny-label">Plan</div>
                    <div className="font-medium text-sm mt-0.5 capitalize">{l.plan || "—"}</div>
                  </div>
                </div>

                <div className="mt-3">
                  {l.suspended
                    ? <Badge variant="destructive">Suspended</Badge>
                    : <Badge className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300 hover:bg-green-100">Active</Badge>}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
