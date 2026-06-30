import React, { useEffect, useState } from "react";
import { api, formatApiError, formatNaira, formatDate } from "@/lib/api";
import PageHeader from "@/components/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Printer, CreditCard, FileText } from "lucide-react";
import { toast } from "sonner";

const METHODS = ["Bank Transfer", "Cash", "POS", "Cheque", "Online", "Initial"];

export default function Payments() {
  const [items, setItems] = useState([]);
  const [tenants, setTenants] = useState([]);
  const [open, setOpen] = useState(false);
  const [receiptOpen, setReceiptOpen] = useState(null);
  const empty = {
    tenant_id: "", amount: 0, payment_date: new Date().toISOString().slice(0, 10),
    payment_method: "Bank Transfer", transaction_ref: "", outstanding_balance: 0, renewal_date: "", notes: "",
  };
  const [form, setForm] = useState(empty);

  const load = async () => {
    const [p, t] = await Promise.all([api.get("/payments"), api.get("/tenants")]);
    setItems(p.data); setTenants(t.data);
  };
  useEffect(() => { load(); }, []);

  const submit = async (e) => {
    e.preventDefault();
    try {
      await api.post("/payments", { ...form, amount: Number(form.amount), outstanding_balance: Number(form.outstanding_balance) });
      toast.success("Payment recorded");
      setOpen(false); setForm(empty); load();
    } catch (e) { toast.error(formatApiError(e.response?.data?.detail)); }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Payments"
        subtitle="Record rent payments and generate printable receipts."
        actions={
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button data-testid="record-payment-btn"><Plus className="h-4 w-4 mr-1" /> Record payment</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Record a payment</DialogTitle>
                <DialogDescription>Receipt number is generated automatically.</DialogDescription>
              </DialogHeader>
              <form onSubmit={submit} className="grid sm:grid-cols-2 gap-3">
                <div className="sm:col-span-2"><Label>Tenant *</Label>
                  <Select value={form.tenant_id} onValueChange={(v) => setForm({ ...form, tenant_id: v })}>
                    <SelectTrigger data-testid="pay-tenant-select"><SelectValue placeholder="Select tenant" /></SelectTrigger>
                    <SelectContent>{tenants.map((t) => <SelectItem key={t.id} value={t.id}>{t.full_name} · {t.unit_name}</SelectItem>)}</SelectContent>
                  </Select></div>
                <div><Label>Amount (₦) *</Label>
                  <Input data-testid="pay-amount-input" required type="number" min="0" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} /></div>
                <div><Label>Date *</Label>
                  <Input required type="date" value={form.payment_date} onChange={(e) => setForm({ ...form, payment_date: e.target.value })} /></div>
                <div><Label>Method *</Label>
                  <Select value={form.payment_method} onValueChange={(v) => setForm({ ...form, payment_method: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{METHODS.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent>
                  </Select></div>
                <div><Label>Transaction reference</Label>
                  <Input value={form.transaction_ref} onChange={(e) => setForm({ ...form, transaction_ref: e.target.value })} /></div>
                <div><Label>Outstanding balance</Label>
                  <Input type="number" min="0" value={form.outstanding_balance} onChange={(e) => setForm({ ...form, outstanding_balance: e.target.value })} /></div>
                <div><Label>New renewal date</Label>
                  <Input data-testid="pay-renewal-date" type="date" value={form.renewal_date} onChange={(e) => setForm({ ...form, renewal_date: e.target.value })} /></div>
                <div className="sm:col-span-2"><Label>Notes</Label>
                  <Textarea rows={2} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></div>
                <DialogFooter className="sm:col-span-2"><Button data-testid="pay-save-btn" type="submit">Save</Button></DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        }
      />

      {items.length === 0 ? (
        <Card className="border-border shadow-none">
          <CardContent className="py-12 text-center text-muted-foreground">
            <CreditCard className="h-7 w-7 mx-auto mb-2" /> No payments recorded yet.
          </CardContent>
        </Card>
      ) : (
        <Card className="border-border shadow-none overflow-hidden">
          <Table className="striped-table">
            <TableHeader>
              <TableRow>
                <TableHead>Tenant</TableHead>
                <TableHead>Property · Unit</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Method</TableHead>
                <TableHead>Receipt</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((p) => (
                <TableRow key={p.id}>
                  <TableCell className="font-medium">{p.tenant_name}</TableCell>
                  <TableCell className="text-sm">
                    <div>{p.property_name}</div>
                    <div className="text-xs text-muted-foreground">{p.unit_name}</div>
                  </TableCell>
                  <TableCell className="font-medium">{formatNaira(p.amount)}</TableCell>
                  <TableCell className="text-sm">{formatDate(p.payment_date)}</TableCell>
                  <TableCell className="text-sm">{p.payment_method}</TableCell>
                  <TableCell className="text-xs font-mono">{p.receipt_number}</TableCell>
                  <TableCell><Button size="sm" variant="ghost" onClick={() => setReceiptOpen(p)} data-testid={`view-receipt-${p.id}`}><Printer className="h-4 w-4" /></Button>
                    <a href={`${process.env.REACT_APP_BACKEND_URL}/api/pdf/receipt/${p.id}`} target="_blank" rel="noreferrer" data-testid={`pdf-receipt-${p.id}`}>
                      <Button size="sm" variant="ghost"><FileText className="h-4 w-4" /></Button>
                    </a>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}

      <Dialog open={!!receiptOpen} onOpenChange={(o) => !o && setReceiptOpen(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Payment receipt</DialogTitle></DialogHeader>
          {receiptOpen && (
            <div id="rentorax-receipt" className="rounded-md border border-border p-6 bg-card">
              <div className="flex justify-between mb-4">
                <div>
                  <div className="font-display text-xl font-bold">RentoraX</div>
                  <div className="text-xs text-muted-foreground">Official Rent Receipt</div>
                </div>
                <div className="text-right text-xs text-muted-foreground">
                  <div className="font-mono">{receiptOpen.receipt_number}</div>
                  <div>{formatDate(receiptOpen.payment_date)}</div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div><div className="tiny-label">Tenant</div><div>{receiptOpen.tenant_name}</div></div>
                <div><div className="tiny-label">Property</div><div>{receiptOpen.property_name}</div></div>
                <div><div className="tiny-label">Unit</div><div>{receiptOpen.unit_name}</div></div>
                <div><div className="tiny-label">Method</div><div>{receiptOpen.payment_method}</div></div>
                {receiptOpen.transaction_ref && <div><div className="tiny-label">Ref</div><div className="font-mono">{receiptOpen.transaction_ref}</div></div>}
                {receiptOpen.renewal_date && <div><div className="tiny-label">Next due</div><div>{formatDate(receiptOpen.renewal_date)}</div></div>}
              </div>
              <div className="mt-5 pt-4 border-t border-border flex justify-between items-end">
                <div>
                  <div className="tiny-label">Amount paid</div>
                  <div className="font-display text-3xl font-semibold">{formatNaira(receiptOpen.amount)}</div>
                </div>
                {Number(receiptOpen.outstanding_balance) > 0 && (
                  <div className="text-right text-xs text-orange-700 dark:text-orange-400">
                    Outstanding: {formatNaira(receiptOpen.outstanding_balance)}
                  </div>
                )}
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setReceiptOpen(null)}>Close</Button>
            <Button onClick={() => window.print()} data-testid="print-receipt-btn"><Printer className="h-4 w-4 mr-1" /> Print</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
