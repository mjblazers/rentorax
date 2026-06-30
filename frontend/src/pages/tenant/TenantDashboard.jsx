import React, { useEffect, useState } from "react";
import { api, formatNaira, formatDate } from "@/lib/api";
import PageHeader from "@/components/PageHeader";
import StatCard from "@/components/StatCard";
import ExpiryBadge from "@/components/ExpiryBadge";
import { Card, CardContent } from "@/components/ui/card";
import { Calendar, CreditCard, Home, User } from "lucide-react";

export default function TenantDashboard() {
  const [d, setD] = useState(null);
  useEffect(() => { api.get("/tenant/dashboard").then((r) => setD(r.data)); }, []);

  if (!d) return <div className="text-muted-foreground">Loading…</div>;
  const t = d.tenant;

  return (
    <div className="space-y-6">
      <PageHeader title={`Welcome, ${t.full_name?.split(" ")[0] || "Tenant"}`} subtitle={`${t.property_name} · ${t.unit_name}`} />

      <div className="grid sm:grid-cols-3 gap-4">
        <StatCard label="Lease Status" value={t.lease_status === "expired" ? "Expired" : `${t.days_to_expiry} days`} icon={Calendar} accent={t.lease_status === "safe" ? "green" : t.lease_status === "warning" ? "amber" : "rose"} />
        <StatCard label="Total Paid" value={formatNaira(d.total_paid)} icon={CreditCard} />
        <StatCard label="Payments on file" value={d.payment_count} icon={CreditCard} accent="blue" />
      </div>

      <div className="grid lg:grid-cols-2 gap-5">
        <Card className="border-border shadow-none">
          <CardContent className="p-6 space-y-3">
            <div className="tiny-label">Lease details</div>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div><div className="text-muted-foreground text-xs">Start</div><div>{formatDate(t.lease_start)}</div></div>
              <div><div className="text-muted-foreground text-xs">Expiry</div><div>{formatDate(t.lease_expiry)}</div></div>
              <div><div className="text-muted-foreground text-xs">Frequency</div><div className="capitalize">{t.payment_frequency}</div></div>
              <div><div className="text-muted-foreground text-xs">Amount paid</div><div>{formatNaira(t.amount_paid)}</div></div>
            </div>
            <ExpiryBadge tier={t.lease_status} days={t.days_to_expiry} />
          </CardContent>
        </Card>
        <Card className="border-border shadow-none">
          <CardContent className="p-6 space-y-3">
            <div className="tiny-label">Landlord contact</div>
            <div className="text-sm flex items-center gap-2"><User className="h-4 w-4 text-muted-foreground" /> {d.landlord_name}</div>
            {d.landlord_phone && <div className="text-sm">📞 {d.landlord_phone}</div>}
            <div className="tiny-label pt-3">Last payment</div>
            {d.last_payment ? (
              <div className="text-sm rounded-md border border-border p-3">
                <div className="font-display text-xl font-semibold">{formatNaira(d.last_payment.amount)}</div>
                <div className="text-xs text-muted-foreground">{formatDate(d.last_payment.payment_date)} · {d.last_payment.payment_method}</div>
                <div className="text-xs text-muted-foreground font-mono mt-1">{d.last_payment.receipt_number}</div>
              </div>
            ) : <div className="text-sm text-muted-foreground">No payments yet.</div>}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
