import React, { useEffect, useState } from "react";
import { api, formatApiError } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { LogOut, KeyRound } from "lucide-react";
import { toast } from "sonner";

const ITEMS = [
  ["rent_paid", "Rent fully paid"],
  ["utilities_settled", "Utility bills settled"],
  ["inspection_done", "Property inspection completed"],
  ["keys_returned", "Keys returned"],
  ["damage_assessed", "Damage assessment completed"],
];

export default function MoveOutDialog({ tenant, open, onClose, onComplete }) {
  const [form, setForm] = useState({
    rent_paid: false, utilities_settled: false, inspection_done: false,
    keys_returned: false, damage_assessed: false,
    deposit_refunded: 0, notes: "",
  });
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (open) setForm({
      rent_paid: false, utilities_settled: false, inspection_done: false,
      keys_returned: false, damage_assessed: false, deposit_refunded: 0, notes: "",
    });
  }, [open]);

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      await api.post(`/tenants/${tenant.id}/move-out`, { ...form, deposit_refunded: Number(form.deposit_refunded || 0) });
      toast.success("Move-out completed. Unit is now vacant.");
      onComplete?.();
      onClose?.();
    } catch (e) { toast.error(formatApiError(e.response?.data?.detail)); }
    finally { setBusy(false); }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose?.()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><LogOut className="h-5 w-5 text-accent" /> Move-out: {tenant?.full_name}</DialogTitle>
          <DialogDescription>Complete the checklist below. The tenant record is archived and the unit becomes vacant. All history is preserved.</DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-3">
          {ITEMS.map(([k, label]) => (
            <label key={k} className="flex items-center gap-3 rounded-md border border-border p-3 text-sm cursor-pointer">
              <Checkbox checked={!!form[k]} onCheckedChange={(v) => setForm({ ...form, [k]: !!v })} data-testid={`mo-${k}`} />
              {label}
            </label>
          ))}
          <div><Label>Deposit refund (₦)</Label>
            <Input type="number" min="0" value={form.deposit_refunded} onChange={(e) => setForm({ ...form, deposit_refunded: e.target.value })} /></div>
          <div><Label>Notes</Label>
            <Textarea rows={2} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Anything to remember about this move-out…" /></div>
          <DialogFooter>
            <Button variant="outline" type="button" onClick={onClose}>Cancel</Button>
            <Button data-testid="mo-confirm" type="submit" disabled={busy}><KeyRound className="h-4 w-4 mr-1" /> Complete move-out</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
