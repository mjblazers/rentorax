import React, { useEffect, useState } from "react";
import { api, formatNaira, formatDate } from "@/lib/api";
import PageHeader from "@/components/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Printer, CreditCard } from "lucide-react";

export default function TenantPayments() {
  const [items, setItems] = useState([]);
  const [receiptOpen, setReceiptOpen] = useState(null);
  useEffect(() => { api.get("/tenant/payments").then((r) => setItems(r.data)); }, []);

  return (
    <div className="space-y-6">
      <PageHeader title="Payment history" subtitle="Every payment your landlord has recorded for you." />
      {items.length === 0 ? (
        <Card className="border-border shadow-none"><CardContent className="py-12 text-center text-muted-foreground"><CreditCard className="h-6 w-6 mx-auto mb-2" />No payments recorded yet.</CardContent></Card>
      ) : (
        <Card className="border-border shadow-none overflow-hidden">
          <Table className="striped-table">
            <TableHeader><TableRow><TableHead>Date</TableHead><TableHead>Amount</TableHead><TableHead>Method</TableHead><TableHead>Receipt</TableHead><TableHead></TableHead></TableRow></TableHeader>
            <TableBody>
              {items.map((p) => (
                <TableRow key={p.id}>
                  <TableCell className="text-sm">{formatDate(p.payment_date)}</TableCell>
                  <TableCell className="font-medium">{formatNaira(p.amount)}</TableCell>
                  <TableCell className="text-sm">{p.payment_method}</TableCell>
                  <TableCell className="font-mono text-xs">{p.receipt_number}</TableCell>
                  <TableCell><Button size="icon" variant="ghost" onClick={() => setReceiptOpen(p)} data-testid={`tp-receipt-${p.id}`}><Printer className="h-4 w-4" /></Button></TableCell>
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
            <div className="rounded-md border border-border p-6">
              <div className="flex justify-between mb-4">
                <div className="font-display text-xl font-bold">RentoraX</div>
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
              </div>
              <div className="mt-5 pt-4 border-t border-border">
                <div className="tiny-label">Amount paid</div>
                <div className="font-display text-3xl font-semibold">{formatNaira(receiptOpen.amount)}</div>
              </div>
            </div>
          )}
          <DialogFooter><Button onClick={() => window.print()}><Printer className="h-4 w-4 mr-1" /> Print</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
