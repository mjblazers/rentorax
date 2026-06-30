import React from "react";
import { Card, CardContent } from "@/components/ui/card";

export default function StatCard({ label, value, hint, icon: Icon, accent = "primary", testId }) {
  const accentMap = {
    primary: "bg-primary/10 text-primary",
    accent: "bg-accent/10 text-accent",
    green: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300",
    amber: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300",
    rose: "bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300",
    blue: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
  };
  return (
    <Card data-testid={testId} className="stat-card border border-border shadow-none">
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div>
            <div className="tiny-label">{label}</div>
            <div className="font-display text-3xl font-semibold mt-2 leading-none">{value}</div>
            {hint && <div className="text-xs text-muted-foreground mt-2">{hint}</div>}
          </div>
          {Icon && (
            <div className={`h-10 w-10 rounded-lg flex items-center justify-center ${accentMap[accent] || accentMap.primary}`}>
              <Icon className="h-5 w-5" />
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
