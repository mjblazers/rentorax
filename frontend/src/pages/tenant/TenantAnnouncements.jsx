import React, { useEffect, useState } from "react";
import { api, formatDate } from "@/lib/api";
import PageHeader from "@/components/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Megaphone } from "lucide-react";

export default function TenantAnnouncements() {
  const [items, setItems] = useState([]);
  useEffect(() => { api.get("/tenant/announcements").then((r) => setItems(r.data)); }, []);
  return (
    <div className="space-y-6">
      <PageHeader title="Announcements" subtitle="Notices from your landlord and the platform." />
      <div className="space-y-3">
        {items.length === 0 && <Card className="border-border shadow-none"><CardContent className="py-12 text-center text-muted-foreground"><Megaphone className="h-6 w-6 mx-auto mb-2" />No announcements yet.</CardContent></Card>}
        {items.map((a) => (
          <Card key={a.id} className="border-border shadow-none">
            <CardContent className="p-5">
              <div className="flex items-center gap-2">
                <Megaphone className="h-4 w-4 text-primary" />
                <div className="font-display font-semibold">{a.title}</div>
              </div>
              <div className="text-sm text-muted-foreground mt-2 whitespace-pre-line">{a.message}</div>
              <div className="text-xs text-muted-foreground mt-2">{formatDate(a.created_at)}</div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
