import React, { useEffect, useState } from "react";
import { api, formatNaira } from "@/lib/api";
import PageHeader from "@/components/PageHeader";
import StatCard from "@/components/StatCard";
import ExpiryBadge from "@/components/ExpiryBadge";
import { Card, CardContent } from "@/components/ui/card";
import { Building2, Users, Banknote, TrendingUp, AlertTriangle, Wrench } from "lucide-react";
import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, Legend, BarChart, Bar,
} from "recharts";

export default function LandlordDashboard() {
  const [d, setD] = useState(null);
  useEffect(() => { api.get("/dashboard/landlord").then((r) => setD(r.data)); }, []);

  return (
    <div className="space-y-8">
      <PageHeader title="Your portfolio" subtitle="A clear view of buildings, tenants and cash flow." />

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard testId="ld-stat-properties" label="Properties" value={d?.total_properties ?? "—"} icon={Building2} />
        <StatCard testId="ld-stat-units" label="Units" value={d?.total_units ?? "—"} hint={`${d?.occupied_units ?? 0} occupied · ${d?.vacant_units ?? 0} vacant`} icon={Building2} accent="accent" />
        <StatCard testId="ld-stat-tenants" label="Tenants" value={d?.total_tenants ?? "—"} icon={Users} accent="blue" />
        <StatCard testId="ld-stat-occupancy" label="Occupancy" value={d ? `${Math.round(d.occupancy_rate)}%` : "—"} icon={TrendingUp} accent="green" />
        <StatCard testId="ld-stat-monthly-rev" label="This month income" value={formatNaira(d?.monthly_revenue)} icon={Banknote} accent="primary" />
        <StatCard testId="ld-stat-yearly-rev" label="This year income" value={formatNaira(d?.yearly_revenue)} icon={Banknote} accent="accent" />
        <StatCard testId="ld-stat-monthly-exp" label="This month expenses" value={formatNaira(d?.monthly_expenses)} icon={Wrench} accent="amber" />
        <StatCard testId="ld-stat-net" label="Net income (year)" value={formatNaira(d?.net_income_yearly)} icon={TrendingUp} accent={d && d.net_income_yearly >= 0 ? "green" : "rose"} />
      </div>

      <div className="grid lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2 border-border shadow-none">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <div className="tiny-label">12 month trend</div>
                <h2 className="font-display text-xl font-semibold mt-1">Income vs Expenses</h2>
              </div>
            </div>
            <div className="h-64">
              <ResponsiveContainer>
                <LineChart data={d?.cash_flow_chart || []}>
                  <CartesianGrid stroke="hsl(var(--border))" strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" fontSize={11} />
                  <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} tickFormatter={(v) => `₦${(v / 1000).toFixed(0)}k`} />
                  <Tooltip
                    contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }}
                    formatter={(v) => formatNaira(v)}
                  />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Line type="monotone" dataKey="income" stroke="hsl(var(--chart-1))" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="expense" stroke="hsl(var(--chart-2))" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border shadow-none">
          <CardContent className="p-6">
            <div className="flex items-center gap-2 mb-3">
              <AlertTriangle className="h-4 w-4 text-orange-500" />
              <h3 className="font-display text-lg font-semibold">Rent alerts</h3>
            </div>
            <div className="space-y-3">
              {(d?.expired || []).slice(0, 5).map((t) => (
                <div key={t.tenant_id} className="flex items-center justify-between p-2 rounded-md bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-800/50">
                  <div className="min-w-0">
                    <div className="text-sm font-medium truncate">{t.tenant_name}</div>
                    <div className="text-xs text-muted-foreground truncate">{t.property_name} · {t.unit_name}</div>
                  </div>
                  <ExpiryBadge tier="expired" days={t.days} />
                </div>
              ))}
              {(d?.expiring_soon || []).slice(0, 5).map((t) => (
                <div key={t.tenant_id} className="flex items-center justify-between p-2 rounded-md border border-border">
                  <div className="min-w-0">
                    <div className="text-sm font-medium truncate">{t.tenant_name}</div>
                    <div className="text-xs text-muted-foreground truncate">{t.property_name} · {t.unit_name}</div>
                  </div>
                  <ExpiryBadge tier={t.status} days={t.days} />
                </div>
              ))}
              {d && (d.expired || []).length === 0 && (d.expiring_soon || []).length === 0 && (
                <div className="text-sm text-muted-foreground">All tenants are safe. 🎉</div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
