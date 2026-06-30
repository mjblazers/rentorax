import React, { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { formatNaira } from "@/lib/api";
import PageHeader from "@/components/PageHeader";
import StatCard from "@/components/StatCard";
import { Building2, Users, UserCog, CreditCard, ShieldCheck, Banknote, Activity } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

export default function AdminDashboard() {
  const [stats, setStats] = useState(null);
  const [logs, setLogs] = useState([]);

  useEffect(() => {
    api.get("/admin/stats").then((r) => setStats(r.data));
    api.get("/admin/activity-logs?limit=15").then((r) => setLogs(r.data));
  }, []);

  return (
    <div className="space-y-8">
      <PageHeader
        title="Platform overview"
        subtitle="Operational metrics across every landlord using RentoraX."
      />

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4" data-testid="admin-stats-grid">
        <StatCard testId="stat-landlords" label="Total Landlords" value={stats?.total_landlords ?? "—"} icon={Users} accent="primary" />
        <StatCard testId="stat-properties" label="Total Properties" value={stats?.total_properties ?? "—"} icon={Building2} accent="accent" />
        <StatCard testId="stat-units" label="Total Units" value={stats?.total_units ?? "—"} icon={Building2} accent="green" />
        <StatCard testId="stat-tenants" label="Total Tenants" value={stats?.total_tenants ?? "—"} icon={Users} accent="blue" />
        <StatCard testId="stat-caretakers" label="Total Caretakers" value={stats?.total_caretakers ?? "—"} icon={UserCog} accent="amber" />
        <StatCard testId="stat-active-subs" label="Active Landlords" value={stats?.active_subscriptions ?? "—"} icon={ShieldCheck} accent="green" />
        <StatCard testId="stat-monthly-rev" label="Monthly Revenue" value={formatNaira(stats?.monthly_revenue || 0)} icon={CreditCard} accent="accent" />
        <StatCard testId="stat-yearly-rev" label="Yearly Revenue" value={formatNaira(stats?.yearly_revenue || 0)} icon={Banknote} accent="primary" />
      </div>

      <Card className="border-border shadow-none">
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <div className="tiny-label">Audit trail</div>
              <h2 className="font-display text-xl font-semibold mt-1">Recent activity</h2>
            </div>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </div>
          <div className="divide-y divide-border">
            {logs.length === 0 && <div className="text-sm text-muted-foreground py-4">No activity yet.</div>}
            {logs.map((l) => (
              <div key={l.id} className="py-3 text-sm flex items-center justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="font-medium truncate">{l.action}</div>
                  <div className="text-xs text-muted-foreground truncate">
                    {l.user_email} · {l.user_role} {l.target && `· ${l.target}`}
                  </div>
                </div>
                <div className="text-xs text-muted-foreground whitespace-nowrap">
                  {new Date(l.created_at).toLocaleString()}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
