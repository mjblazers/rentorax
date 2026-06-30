import React, { useEffect, useState } from "react";
import { api, formatDate, formatNaira } from "@/lib/api";
import PageHeader from "@/components/PageHeader";
import ExpiryBadge from "@/components/ExpiryBadge";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";

function downloadCsv(rows, filename) {
  if (!rows.length) return;
  const headers = Object.keys(rows[0]);
  const csv = [headers.join(","), ...rows.map((r) => headers.map((h) => JSON.stringify(r[h] ?? "")).join(","))].join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a"); a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

export default function Reports() {
  const [occ, setOcc] = useState([]);
  const [exp, setExp] = useState([]);

  useEffect(() => {
    api.get("/reports/occupancy").then((r) => setOcc(r.data));
    api.get("/reports/expiring").then((r) => setExp(r.data));
  }, []);

  return (
    <div className="space-y-6">
      <PageHeader title="Reports" subtitle="Operational reports — export to CSV." />

      <Tabs defaultValue="occupancy">
        <TabsList>
          <TabsTrigger value="occupancy">Occupancy</TabsTrigger>
          <TabsTrigger value="expiring">Expiring leases</TabsTrigger>
        </TabsList>
        <TabsContent value="occupancy">
          <Card className="border-border shadow-none">
            <CardContent className="p-0">
              <div className="flex justify-end p-3">
                <Button size="sm" variant="outline" data-testid="export-occupancy"
                        onClick={() => downloadCsv(occ.map((r) => ({ Property: r.property_name, Total: r.total_units, Occupied: r.occupied, Vacant: r.vacant, Rate: r.rate.toFixed(1) + "%" })), "occupancy.csv")}>
                  <Download className="h-4 w-4 mr-1" /> Export CSV
                </Button>
              </div>
              <Table className="striped-table">
                <TableHeader><TableRow><TableHead>Property</TableHead><TableHead>Total</TableHead><TableHead>Occupied</TableHead><TableHead>Vacant</TableHead><TableHead>Rate</TableHead></TableRow></TableHeader>
                <TableBody>
                  {occ.map((r) => (
                    <TableRow key={r.property_id}>
                      <TableCell className="font-medium">{r.property_name}</TableCell>
                      <TableCell>{r.total_units}</TableCell>
                      <TableCell className="text-primary">{r.occupied}</TableCell>
                      <TableCell className="text-accent">{r.vacant}</TableCell>
                      <TableCell>{r.rate.toFixed(1)}%</TableCell>
                    </TableRow>
                  ))}
                  {occ.length === 0 && <TableRow><TableCell colSpan={5} className="py-10 text-center text-muted-foreground">No data</TableCell></TableRow>}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="expiring">
          <Card className="border-border shadow-none">
            <CardContent className="p-0">
              <div className="flex justify-end p-3">
                <Button size="sm" variant="outline" data-testid="export-expiring"
                        onClick={() => downloadCsv(exp.map((r) => ({ Tenant: r.tenant_name, Property: r.property_name, Unit: r.unit_name, Expiry: r.lease_expiry, Days: r.days, Status: r.status, AmountPaid: r.amount_paid })), "expiring-leases.csv")}>
                  <Download className="h-4 w-4 mr-1" /> Export CSV
                </Button>
              </div>
              <Table className="striped-table">
                <TableHeader><TableRow><TableHead>Tenant</TableHead><TableHead>Unit</TableHead><TableHead>Expiry</TableHead><TableHead>Status</TableHead><TableHead>Amount</TableHead></TableRow></TableHeader>
                <TableBody>
                  {exp.map((r) => (
                    <TableRow key={r.tenant_id}>
                      <TableCell className="font-medium">{r.tenant_name}</TableCell>
                      <TableCell className="text-sm">{r.property_name} · {r.unit_name}</TableCell>
                      <TableCell className="text-sm">{formatDate(r.lease_expiry)}</TableCell>
                      <TableCell><ExpiryBadge tier={r.status} days={r.days} /></TableCell>
                      <TableCell className="text-sm">{formatNaira(r.amount_paid)}</TableCell>
                    </TableRow>
                  ))}
                  {exp.length === 0 && <TableRow><TableCell colSpan={5} className="py-10 text-center text-muted-foreground">No data</TableCell></TableRow>}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
