import React, { useEffect, useState } from "react";
import { api, formatDate } from "@/lib/api";
import PageHeader from "@/components/PageHeader";
import StatCard from "@/components/StatCard";
import ExpiryBadge from "@/components/ExpiryBadge";
import { Card, CardContent } from "@/components/ui/card";
import { Building2, Users, Wrench } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

export default function CaretakerDashboard() {
  const { user } = useAuth();
  const [props, setProps] = useState([]);
  const [tenants, setTenants] = useState([]);
  const [tickets, setTickets] = useState([]);

  useEffect(() => {
    api.get("/properties").then((r) => setProps(r.data));
    api.get("/tenants").then((r) => setTenants(r.data)).catch(() => setTenants([]));
    api.get("/maintenance").then((r) => setTickets(r.data));
  }, []);

  return (
    <div className="space-y-6">
      <PageHeader title={`Hello, ${user.name?.split(" ")[0] || "Caretaker"}`} subtitle="Your assigned properties and tasks." />

      <div className="grid sm:grid-cols-3 gap-4">
        <StatCard label="Properties" value={props.length} icon={Building2} />
        <StatCard label="Tenants" value={tenants.length} icon={Users} accent="blue" />
        <StatCard label="Open tickets" value={tickets.filter((t) => t.status !== "Completed" && t.status !== "Cancelled").length} icon={Wrench} accent="accent" />
      </div>

      <Card className="border-border shadow-none">
        <CardContent className="p-6">
          <div className="tiny-label mb-3">Upcoming lease expiries</div>
          <div className="divide-y divide-border">
            {tenants.filter((t) => t.lease_status !== "safe").slice(0, 8).map((t) => (
              <div key={t.id} className="py-2 flex items-center justify-between">
                <div className="min-w-0">
                  <div className="font-medium truncate">{t.full_name}</div>
                  <div className="text-xs text-muted-foreground truncate">{t.property_name} · {t.unit_name} · {formatDate(t.lease_expiry)}</div>
                </div>
                <ExpiryBadge tier={t.lease_status} days={t.days_to_expiry} />
              </div>
            ))}
            {tenants.length === 0 && <div className="text-sm text-muted-foreground">No tenants visible to you yet.</div>}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
