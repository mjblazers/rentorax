import React, { useEffect, useState } from "react";
import { api, formatApiError, formatDate } from "@/lib/api";
import PageHeader from "@/components/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, FileText, Download, Mail, ShieldAlert } from "lucide-react";
import { toast } from "sonner";

const BACKEND = process.env.REACT_APP_BACKEND_URL;
const STATUS_COLOR = {
  Draft: "bg-stone-100 text-stone-800 dark:bg-stone-800 dark:text-stone-200",
  Sent: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
  Acknowledged: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
  Expired: "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300",
  Cancelled: "bg-rose-100 text-rose-800 dark:bg-rose-900/30 dark:text-rose-300",
};

export default function Notices() {
  const [items, setItems] = useState([]);
  const [tenants, setTenants] = useState([]);
  const [types, setTypes] = useState([]);
  const [open, setOpen] = useState(false);
  const empty = { tenant_id: "", notice_type: "Friendly Rent Reminder", reason: "", description: "", due_date: "", send: true, attachments: [] };
  const [form, setForm] = useState(empty);

  const load = async () => {
    const [n, t, k] = await Promise.all([
      api.get("/notices"), api.get("/tenants"), api.get("/notices/types"),
    ]);
    setItems(n.data); setTenants(t.data); setTypes(k.data.types);
  };
  useEffect(() => { load(); }, []);

  const submit = async (e) => {
    e.preventDefault();
    try { await api.post("/notices", form); toast.success("Notice issued"); setForm(empty); setOpen(false); load(); }
    catch (e) { toast.error(formatApiError(e.response?.data?.detail)); }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Notices"
        subtitle="Issue formal notices, track acknowledgements, generate PDF copies."
        actions={
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild><Button data-testid="new-notice-btn"><Plus className="h-4 w-4 mr-1" /> New notice</Button></DialogTrigger>
            <DialogContent className="max-w-xl">
              <DialogHeader>
                <DialogTitle>Issue notice</DialogTitle>
                <DialogDescription>The tenant is notified in-app and by email if they have one on file.</DialogDescription>
              </DialogHeader>
              <form onSubmit={submit} className="space-y-3">
                <div><Label>Tenant *</Label>
                  <Select value={form.tenant_id} onValueChange={(v) => setForm({ ...form, tenant_id: v })}>
                    <SelectTrigger data-testid="notice-tenant-select"><SelectValue placeholder="Select" /></SelectTrigger>
                    <SelectContent>{tenants.map((t) => <SelectItem key={t.id} value={t.id}>{t.full_name} · {t.unit_name}</SelectItem>)}</SelectContent>
                  </Select></div>
                <div><Label>Notice type *</Label>
                  <Select value={form.notice_type} onValueChange={(v) => setForm({ ...form, notice_type: v })}>
                    <SelectTrigger data-testid="notice-type-select"><SelectValue /></SelectTrigger>
                    <SelectContent>{types.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                  </Select></div>
                <div><Label>Reason</Label>
                  <Input value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} placeholder="Short summary" /></div>
                <div><Label>Description *</Label>
                  <Textarea data-testid="notice-desc" required rows={4} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
                <div><Label>Due date</Label>
                  <Input type="date" value={form.due_date} onChange={(e) => setForm({ ...form, due_date: e.target.value })} /></div>
                <DialogFooter><Button data-testid="notice-submit" type="submit"><Mail className="h-4 w-4 mr-1" /> Issue & send</Button></DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        }
      />

      {items.length === 0 ? (
        <Card className="border-border shadow-none">
          <CardContent className="py-12 text-center text-muted-foreground">
            <ShieldAlert className="h-6 w-6 mx-auto mb-2" /> No notices issued yet.
          </CardContent>
        </Card>
      ) : (
        <Card className="border-border shadow-none overflow-hidden">
          <Table className="striped-table">
            <TableHeader><TableRow>
              <TableHead>Number</TableHead>
              <TableHead>Tenant</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Issued</TableHead>
              <TableHead>Status</TableHead>
              <TableHead></TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {items.map((n) => (
                <TableRow key={n.id} data-testid={`notice-row-${n.id}`}>
                  <TableCell className="font-mono text-xs">{n.notice_number}</TableCell>
                  <TableCell className="text-sm">
                    <div className="font-medium">{n.tenant_name}</div>
                    <div className="text-xs text-muted-foreground">{n.property_name} · {n.unit_name}</div>
                  </TableCell>
                  <TableCell className="text-sm">{n.notice_type}</TableCell>
                  <TableCell className="text-sm">{formatDate(n.issue_date)}</TableCell>
                  <TableCell><Badge className={STATUS_COLOR[n.status]}>{n.status}</Badge></TableCell>
                  <TableCell>
                    <a href={`${BACKEND}/api/pdf/notice/${n.id}`} target="_blank" rel="noreferrer" data-testid={`notice-pdf-${n.id}`}>
                      <Button size="sm" variant="outline"><Download className="h-4 w-4 mr-1" /> PDF</Button>
                    </a>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}
    </div>
  );
}
