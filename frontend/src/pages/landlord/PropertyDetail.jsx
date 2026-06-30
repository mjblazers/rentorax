import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { api, formatApiError } from "@/lib/api";
import PageHeader from "@/components/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { ArrowLeft, Plus, Edit, Trash2 } from "lucide-react";
import { toast } from "sonner";

const STATUS_STYLES = {
  occupied: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
  vacant: "bg-stone-100 text-stone-700 dark:bg-stone-800 dark:text-stone-300",
  reserved: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300",
};

export default function PropertyDetail() {
  const { id } = useParams();
  const nav = useNavigate();
  const [property, setProperty] = useState(null);
  const [units, setUnits] = useState([]);
  const [open, setOpen] = useState(false);
  const [unitForm, setUnitForm] = useState({ name: "", status: "vacant" });
  const [editing, setEditing] = useState(null);

  const load = async () => {
    const [p, u] = await Promise.all([
      api.get(`/properties/${id}`), api.get(`/units?property_id=${id}`),
    ]);
    setProperty(p.data); setUnits(u.data);
  };
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [id]);

  const submit = async (e) => {
    e.preventDefault();
    try {
      if (editing) {
        await api.patch(`/units/${editing}`, unitForm);
      } else {
        await api.post("/units", { ...unitForm, property_id: id });
      }
      toast.success("Saved");
      setOpen(false); setEditing(null); setUnitForm({ name: "", status: "vacant" });
      load();
    } catch (e) { toast.error(formatApiError(e.response?.data?.detail)); }
  };

  const del = async (uid) => {
    try { await api.delete(`/units/${uid}`); toast.success("Unit removed"); load(); }
    catch (e) { toast.error(formatApiError(e.response?.data?.detail)); }
  };

  return (
    <div className="space-y-6">
      <Button variant="ghost" size="sm" onClick={() => nav(-1)} className="-ml-2"><ArrowLeft className="h-4 w-4 mr-1" /> Back</Button>
      <PageHeader
        title={property?.name || "Property"}
        subtitle={`${property?.address || ""} · ${property?.state || ""}`}
        actions={
          <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) { setEditing(null); setUnitForm({ name: "", status: "vacant" }); } }}>
            <DialogTrigger asChild>
              <Button data-testid="add-unit-btn"><Plus className="h-4 w-4 mr-1" /> Add unit</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>{editing ? "Edit unit" : "Add unit"}</DialogTitle></DialogHeader>
              <form onSubmit={submit} className="space-y-3">
                <div><label className="text-sm">Name</label><Input required value={unitForm.name} onChange={(e) => setUnitForm({ ...unitForm, name: e.target.value })} /></div>
                <div><label className="text-sm">Status</label>
                  <Select value={unitForm.status} onValueChange={(v) => setUnitForm({ ...unitForm, status: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="vacant">Vacant</SelectItem>
                      <SelectItem value="occupied">Occupied</SelectItem>
                      <SelectItem value="reserved">Reserved</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <DialogFooter><Button type="submit">{editing ? "Save" : "Add"}</Button></DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        }
      />

      <Card className="border-border shadow-none">
        <CardContent className="p-6">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {units.map((u) => (
              <div key={u.id} data-testid={`unit-${u.id}`} className="rounded-md border border-border p-3 flex items-center justify-between">
                <div>
                  <div className="font-medium">{u.name}</div>
                  <Badge className={`mt-1 text-[10px] ${STATUS_STYLES[u.status] || ""}`}>{u.status}</Badge>
                </div>
                <div className="flex flex-col gap-1">
                  <Button size="icon" variant="ghost" onClick={() => { setEditing(u.id); setUnitForm({ name: u.name, status: u.status }); setOpen(true); }}>
                    <Edit className="h-3.5 w-3.5" />
                  </Button>
                  <Button size="icon" variant="ghost" className="text-destructive" onClick={() => del(u.id)}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            ))}
            {units.length === 0 && <div className="col-span-full text-sm text-muted-foreground">No units yet.</div>}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
