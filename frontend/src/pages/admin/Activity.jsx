import React, { useEffect, useState } from "react";
import { api } from "@/lib/api";
import PageHeader from "@/components/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Activity } from "lucide-react";

export default function AdminActivity() {
  const [logs, setLogs] = useState([]);
  useEffect(() => { api.get("/admin/activity-logs?limit=300").then((r) => setLogs(r.data)); }, []);
  return (
    <div className="space-y-6">
      <PageHeader title="Activity logs" subtitle="Audit trail of every key action across RentoraX." />
      <Card className="border-border shadow-none">
        <CardContent className="p-0">
          <div className="divide-y divide-border">
            {logs.length === 0 && <div className="p-6 text-sm text-muted-foreground">No activity yet.</div>}
            {logs.map((l) => (
              <div key={l.id} className="px-5 py-3 flex items-start justify-between gap-4 hover:bg-muted/40">
                <div className="flex items-start gap-3 min-w-0">
                  <div className="h-8 w-8 rounded-full bg-primary/10 text-primary flex items-center justify-center flex-shrink-0">
                    <Activity className="h-4 w-4" />
                  </div>
                  <div className="min-w-0">
                    <div className="font-medium text-sm">{l.action}</div>
                    <div className="text-xs text-muted-foreground truncate">
                      {l.user_email} · {l.user_role}{l.target ? ` · ${l.target}` : ""}{l.target_id ? ` · ${l.target_id.slice(0, 8)}…` : ""}
                    </div>
                  </div>
                </div>
                <div className="text-xs text-muted-foreground whitespace-nowrap">{new Date(l.created_at).toLocaleString()}</div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
