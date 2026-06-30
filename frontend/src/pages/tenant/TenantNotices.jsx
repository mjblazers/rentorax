import React, { useEffect, useState } from "react";
import { api, formatApiError, formatDate } from "@/lib/api";
import PageHeader from "@/components/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { ShieldAlert, Download, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

const BACKEND = process.env.REACT_APP_BACKEND_URL;
const STATUS_COLOR = {
  Draft: "bg-stone-100 text-stone-800 dark:bg-stone-800 dark:text-stone-200",
  Sent: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
  Acknowledged: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
  Cancelled: "bg-rose-100 text-rose-800 dark:bg-rose-900/30 dark:text-rose-300",
};

export default function TenantNotices() {
  const [items, setItems] = useState([]);
  const [open, setOpen] = useState(null);

  const load = async () => { const r = await api.get("/notices/tenant/list"); setItems(r.data); };
  useEffect(() => { load(); }, []);

  const ack = async (id) => {
    try { await api.post(`/notices/${id}/acknowledge`); toast.success("Acknowledged"); load(); setOpen(null); }
    catch (e) { toast.error(formatApiError(e.response?.data?.detail)); }
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Notices" subtitle="Notices issued to you by your landlord." />
      {items.length === 0 ? (
        <Card className="border-border shadow-none"><CardContent className="py-12 text-center text-muted-foreground"><ShieldAlert className="h-6 w-6 mx-auto mb-2" /> No notices yet.</CardContent></Card>
      ) : (
        <div className="space-y-3">
          {items.map((n) => (
            <Card key={n.id} className="border-border shadow-none stat-card cursor-pointer" onClick={() => setOpen(n)}>
              <CardContent className="p-5">
                <div className="flex items-start justify-between">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <ShieldAlert className="h-4 w-4 text-accent" />
                      <div className="font-display font-semibold">{n.notice_type}</div>
                      <Badge className={STATUS_COLOR[n.status]}>{n.status}</Badge>
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">{n.notice_number} · Issued {formatDate(n.issue_date)}{n.due_date ? ` · Due ${formatDate(n.due_date)}` : ""}</div>
                    {n.reason && <div className="text-sm mt-2 text-muted-foreground line-clamp-2">{n.reason}</div>}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={!!open} onOpenChange={(o) => !o && setOpen(null)}>
        <DialogContent className="max-w-xl">
          <DialogHeader><DialogTitle>{open?.notice_type}</DialogTitle></DialogHeader>
          {open && (
            <div className="space-y-3 text-sm">
              <div className="font-mono text-xs text-muted-foreground">{open.notice_number}</div>
              <div className="grid grid-cols-2 gap-3">
                <div><div className="tiny-label">Issued</div>{formatDate(open.issue_date)}</div>
                <div><div className="tiny-label">Due</div>{open.due_date ? formatDate(open.due_date) : "—"}</div>
              </div>
              <div><div className="tiny-label">Reason</div>{open.reason || "—"}</div>
              <div><div className="tiny-label">Details</div><div className="whitespace-pre-line">{open.description || "—"}</div></div>
              <div className="flex gap-2 pt-2">
                <a href={`${BACKEND}/api/pdf/notice/${open.id}`} target="_blank" rel="noreferrer">
                  <Button variant="outline"><Download className="h-4 w-4 mr-1" /> Download PDF</Button>
                </a>
                {open.status === "Sent" && (
                  <Button data-testid={`notice-ack-${open.id}`} onClick={() => ack(open.id)}>
                    <CheckCircle2 className="h-4 w-4 mr-1" /> Acknowledge
                  </Button>
                )}
              </div>
            </div>
          )}
          <DialogFooter></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
