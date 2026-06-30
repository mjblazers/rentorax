import React, { useEffect, useState } from "react";
import { api, formatApiError, formatNaira, formatDate } from "@/lib/api";
import PageHeader from "@/components/PageHeader";
import StatCard from "@/components/StatCard";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter,
} from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Legend, PieChart, Pie, Cell,
} from "recharts";
import { Plus, Banknote, TrendingDown, TrendingUp } from "lucide-react";
import { toast } from "sonner";

const EXPENSE_CATEGORIES = [
  "Repairs", "Plumbing", "Electrical", "Painting", "Cleaning", "Water",
  "Electricity", "Generator Fuel", "Caretaker Salary", "Security",
  "Legal Fees", "Taxes", "Property Insurance", "Miscellaneous",
];
const INCOME_SOURCES = ["Service Charges", "Shop Rent", "Parking Fees", "Other Income"];
const METHODS = ["Bank Transfer", "Cash", "POS", "Cheque"];

const COLORS = ["#16653f", "#c2410c", "#ca8a04", "#2563eb", "#7c3aed", "#0d9488", "#be123c", "#65a30d"];

export default function Accounting() {
  const [summary, setSummary] = useState(null);
  const [expenses, setExpenses] = useState([]);
  const [income, setIncome] = useState([]);
  const [props, setProps] = useState([]);
  const [openExp, setOpenExp] = useState(false);
  const [openInc, setOpenInc] = useState(false);

  const emptyExp = {
    property_id: "", category: "Repairs", vendor: "", description: "", amount: 0,
    date: new Date().toISOString().slice(0, 10), payment_method: "Bank Transfer",
  };
  const emptyInc = {
    property_id: "", source: "Service Charges", description: "", amount: 0,
    date: new Date().toISOString().slice(0, 10),
  };
  const [exp, setExp] = useState(emptyExp);
  const [inc, setInc] = useState(emptyInc);

  const load = async () => {
    const [s, e, i, p] = await Promise.all([
      api.get("/accounting/summary"), api.get("/expenses"), api.get("/income"), api.get("/properties"),
    ]);
    setSummary(s.data); setExpenses(e.data); setIncome(i.data); setProps(p.data);
  };
  useEffect(() => { load(); }, []);

  const submitExp = async (e) => {
    e.preventDefault();
    try {
      await api.post("/expenses", { ...exp, amount: Number(exp.amount), property_id: exp.property_id || null });
      toast.success("Expense recorded"); setOpenExp(false); setExp(emptyExp); load();
    } catch (e) { toast.error(formatApiError(e.response?.data?.detail)); }
  };
  const submitInc = async (e) => {
    e.preventDefault();
    try {
      await api.post("/income", { ...inc, amount: Number(inc.amount), property_id: inc.property_id || null });
      toast.success("Income added"); setOpenInc(false); setInc(emptyInc); load();
    } catch (e) { toast.error(formatApiError(e.response?.data?.detail)); }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Accounting"
        subtitle="Track every kobo in and out. Built for Nigerian rentals."
        actions={
          <div className="flex gap-2">
            <Dialog open={openInc} onOpenChange={setOpenInc}>
              <DialogTrigger asChild><Button variant="outline" data-testid="add-income-btn"><Plus className="h-4 w-4 mr-1" /> Income</Button></DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>Add income</DialogTitle></DialogHeader>
                <form onSubmit={submitInc} className="grid sm:grid-cols-2 gap-3">
                  <div><Label>Source</Label>
                    <Select value={inc.source} onValueChange={(v) => setInc({ ...inc, source: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>{INCOME_SOURCES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                    </Select></div>
                  <div><Label>Property</Label>
                    <Select value={inc.property_id} onValueChange={(v) => setInc({ ...inc, property_id: v })}>
                      <SelectTrigger><SelectValue placeholder="Optional" /></SelectTrigger>
                      <SelectContent>{props.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent>
                    </Select></div>
                  <div><Label>Amount (₦) *</Label><Input required type="number" min="0" value={inc.amount} onChange={(e) => setInc({ ...inc, amount: e.target.value })} /></div>
                  <div><Label>Date *</Label><Input required type="date" value={inc.date} onChange={(e) => setInc({ ...inc, date: e.target.value })} /></div>
                  <div className="sm:col-span-2"><Label>Description</Label><Textarea rows={2} value={inc.description} onChange={(e) => setInc({ ...inc, description: e.target.value })} /></div>
                  <DialogFooter className="sm:col-span-2"><Button type="submit">Save</Button></DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
            <Dialog open={openExp} onOpenChange={setOpenExp}>
              <DialogTrigger asChild><Button data-testid="add-expense-btn"><Plus className="h-4 w-4 mr-1" /> Expense</Button></DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>Add expense</DialogTitle></DialogHeader>
                <form onSubmit={submitExp} className="grid sm:grid-cols-2 gap-3">
                  <div><Label>Category *</Label>
                    <Select value={exp.category} onValueChange={(v) => setExp({ ...exp, category: v })}>
                      <SelectTrigger data-testid="exp-cat-select"><SelectValue /></SelectTrigger>
                      <SelectContent>{EXPENSE_CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                    </Select></div>
                  <div><Label>Property</Label>
                    <Select value={exp.property_id} onValueChange={(v) => setExp({ ...exp, property_id: v })}>
                      <SelectTrigger><SelectValue placeholder="Optional" /></SelectTrigger>
                      <SelectContent>{props.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent>
                    </Select></div>
                  <div><Label>Vendor</Label><Input value={exp.vendor} onChange={(e) => setExp({ ...exp, vendor: e.target.value })} /></div>
                  <div><Label>Amount (₦) *</Label><Input data-testid="exp-amount-input" required type="number" min="0" value={exp.amount} onChange={(e) => setExp({ ...exp, amount: e.target.value })} /></div>
                  <div><Label>Date *</Label><Input required type="date" value={exp.date} onChange={(e) => setExp({ ...exp, date: e.target.value })} /></div>
                  <div><Label>Payment method</Label>
                    <Select value={exp.payment_method} onValueChange={(v) => setExp({ ...exp, payment_method: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>{METHODS.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent>
                    </Select></div>
                  <div className="sm:col-span-2"><Label>Description</Label><Textarea rows={2} value={exp.description} onChange={(e) => setExp({ ...exp, description: e.target.value })} /></div>
                  <DialogFooter className="sm:col-span-2"><Button data-testid="exp-save-btn" type="submit">Save</Button></DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        }
      />

      <div className="grid sm:grid-cols-3 gap-4">
        <StatCard label="Total Income" value={formatNaira(summary?.total_income)} icon={TrendingUp} accent="green" />
        <StatCard label="Total Expenses" value={formatNaira(summary?.total_expense)} icon={TrendingDown} accent="rose" />
        <StatCard label="Net Profit" value={formatNaira(summary?.net_income)} icon={Banknote} accent={summary && summary.net_income >= 0 ? "primary" : "rose"} />
      </div>

      <div className="grid lg:grid-cols-2 gap-5">
        <Card className="border-border shadow-none">
          <CardContent className="p-6">
            <div className="tiny-label">{summary?.year || ""} monthly</div>
            <h3 className="font-display text-lg font-semibold mb-3">Income vs Expense</h3>
            <div className="h-64">
              <ResponsiveContainer>
                <BarChart data={summary?.monthly || []}>
                  <CartesianGrid stroke="hsl(var(--border))" strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" fontSize={11} />
                  <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                  <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }} formatter={(v) => formatNaira(v)} />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Bar dataKey="income" fill="hsl(var(--chart-1))" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="expense" fill="hsl(var(--chart-2))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border shadow-none">
          <CardContent className="p-6">
            <div className="tiny-label">By category</div>
            <h3 className="font-display text-lg font-semibold mb-3">Expense breakdown</h3>
            <div className="h-64">
              <ResponsiveContainer>
                <PieChart>
                  <Pie data={summary?.expense_by_category || []} dataKey="amount" nameKey="category" innerRadius={45} outerRadius={80} paddingAngle={2}>
                    {(summary?.expense_by_category || []).map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }} formatter={(v) => formatNaira(v)} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="expenses">
        <TabsList>
          <TabsTrigger value="expenses" data-testid="tab-expenses">Expenses</TabsTrigger>
          <TabsTrigger value="income" data-testid="tab-income">Other Income</TabsTrigger>
        </TabsList>
        <TabsContent value="expenses">
          <Card className="border-border shadow-none overflow-hidden">
            <Table className="striped-table">
              <TableHeader><TableRow>
                <TableHead>Date</TableHead><TableHead>Category</TableHead><TableHead>Vendor</TableHead><TableHead>Property</TableHead><TableHead>Method</TableHead><TableHead className="text-right">Amount</TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {expenses.length === 0 && <TableRow><TableCell colSpan={6} className="py-10 text-center text-muted-foreground">No expenses yet.</TableCell></TableRow>}
                {expenses.map((e) => (
                  <TableRow key={e.id}>
                    <TableCell className="text-sm">{formatDate(e.date)}</TableCell>
                    <TableCell className="text-sm">{e.category}</TableCell>
                    <TableCell className="text-sm">{e.vendor || "—"}</TableCell>
                    <TableCell className="text-sm">{e.property_name || "—"}</TableCell>
                    <TableCell className="text-sm">{e.payment_method || "—"}</TableCell>
                    <TableCell className="text-right font-medium">{formatNaira(e.amount)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>
        <TabsContent value="income">
          <Card className="border-border shadow-none overflow-hidden">
            <Table className="striped-table">
              <TableHeader><TableRow>
                <TableHead>Date</TableHead><TableHead>Source</TableHead><TableHead>Description</TableHead><TableHead className="text-right">Amount</TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {income.length === 0 && <TableRow><TableCell colSpan={4} className="py-10 text-center text-muted-foreground">No other income yet.</TableCell></TableRow>}
                {income.map((i) => (
                  <TableRow key={i.id}>
                    <TableCell className="text-sm">{formatDate(i.date)}</TableCell>
                    <TableCell className="text-sm">{i.source}</TableCell>
                    <TableCell className="text-sm">{i.description || "—"}</TableCell>
                    <TableCell className="text-right font-medium">{formatNaira(i.amount)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
