import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { api, formatNaira, formatDate } from "@/lib/api";
import PageHeader from "@/components/PageHeader";
import ExpiryBadge from "@/components/ExpiryBadge";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, User, Mail, Phone, MapPin, Calendar, Briefcase, Shield } from "lucide-react";

export default function TenantDetail() {
  const { id } = useParams();
  const nav = useNavigate();
  const [tenant, setTenant] = useState(null);
  const [payments, setPayments] = useState([]);

  useEffect(() => {
    api.get(`/tenants/${id}`).then((r) => setTenant(r.data));
    api.get(`/payments?tenant_id=${id}`).then((r) => setPayments(r.data));
  }, [id]);

  if (!tenant) return <div className="text-muted-foreground">Loading…</div>;

  const sections = [
    {
      title: "Personal",
      rows: [
        ["Full name", tenant.full_name],
        ["Phone", tenant.phone],
        ["Email", tenant.email],
        ["Gender", tenant.gender],
        ["Date of birth", formatDate(tenant.date_of_birth)],
        ["NIN", tenant.nin],
        ["Home address", tenant.home_address],
      ],
    },
    {
      title: "Work",
      rows: [
        ["Occupation", tenant.occupation],
        ["Workplace", tenant.workplace],
        ["Workplace address", tenant.workplace_address],
      ],
    },
    {
      title: "Emergency contact",
      rows: [
        ["Name", tenant.emergency_contact_name],
        ["Phone", tenant.emergency_contact_phone],
        ["Relationship", tenant.relationship],
      ],
    },
    {
      title: "Guarantor",
      rows: [
        ["Name", tenant.guarantor_name],
        ["Phone", tenant.guarantor_phone],
        ["Address", tenant.guarantor_address],
      ],
    },
  ];

  return (
    <div className="space-y-6">
      <Button variant="ghost" size="sm" onClick={() => nav(-1)} className="-ml-2"><ArrowLeft className="h-4 w-4 mr-1" /> Back</Button>
      <PageHeader title={tenant.full_name} subtitle={`${tenant.property_name} · ${tenant.unit_name}`} />

      <div className="grid lg:grid-cols-3 gap-5">
        <Card className="border-border shadow-none">
          <CardContent className="p-6 space-y-3">
            <div className="tiny-label">Lease</div>
            <div>
              <div className="font-display text-2xl font-semibold">{formatNaira(tenant.amount_paid)}</div>
              <div className="text-xs text-muted-foreground capitalize">{tenant.payment_frequency} rent</div>
            </div>
            <div className="text-sm">
              <div className="text-muted-foreground">From {formatDate(tenant.lease_start)} to {formatDate(tenant.lease_expiry)}</div>
            </div>
            <ExpiryBadge tier={tenant.lease_status} days={tenant.days_to_expiry} />
            <Badge variant={tenant.portal_enabled ? "default" : "outline"}>
              Portal {tenant.portal_enabled ? "enabled" : "disabled"}
            </Badge>
          </CardContent>
        </Card>

        {sections.map((s) => (
          <Card key={s.title} className="border-border shadow-none">
            <CardContent className="p-6 space-y-2">
              <div className="tiny-label">{s.title}</div>
              {s.rows.map(([k, v]) => (
                <div key={k} className="text-sm flex justify-between gap-3">
                  <div className="text-muted-foreground">{k}</div>
                  <div className="text-right truncate">{v || "—"}</div>
                </div>
              ))}
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="border-border shadow-none">
        <CardContent className="p-6">
          <div className="tiny-label mb-3">Payment history</div>
          {payments.length === 0 ? (
            <div className="text-sm text-muted-foreground">No payments recorded yet.</div>
          ) : (
            <div className="divide-y divide-border">
              {payments.map((p) => (
                <div key={p.id} className="py-2 flex items-center justify-between text-sm">
                  <div>
                    <div className="font-medium">{formatNaira(p.amount)}</div>
                    <div className="text-xs text-muted-foreground">{formatDate(p.payment_date)} · {p.payment_method}</div>
                  </div>
                  <div className="text-xs text-muted-foreground font-mono">{p.receipt_number}</div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
