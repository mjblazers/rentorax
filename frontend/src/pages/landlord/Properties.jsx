import React, { useEffect, useState } from "react";
import { api, formatApiError } from "@/lib/api";
import PageHeader from "@/components/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
  DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { Plus, Building2, MapPin, Trash2, Edit } from "lucide-react";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import FileUpload from "@/components/FileUpload";

const PROPERTY_TYPES = ["Hostel", "Flats", "Duplex", "Self Contain", "Apartment", "Estate", "Commercial Building"];
const UNIT_PREFIXES = ["Room", "Flat", "Apt", "Shop", "Office", "Block", "Unit"];

const FALLBACK_PHOTOS = [
  "https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?crop=entropy&cs=srgb&fm=jpg&ixid=M3w3NDk1ODF8MHwxfHNlYXJjaHwzfHxtb2Rlcm4lMjBhcGFydG1lbnQlMjBidWlsZGluZyUyMGV4dGVyaW9yfGVufDB8fHx8MTc4Mjg0NzQzOHww&ixlib=rb-4.1.0&q=85",
  "https://images.pexels.com/photos/18153132/pexels-photo-18153132.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940",
  "https://images.pexels.com/photos/35339499/pexels-photo-35339499.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940",
];

export default function Properties() {
  const nav = useNavigate();
  const [items, setItems] = useState([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    name: "", type: "Flats", description: "", address: "", state: "Lagos", lga: "", gps: "",
    photos: [], num_units: 1, unit_prefix: "Room", active: true,
  });

  const load = async () => {
    const r = await api.get("/properties");
    setItems(r.data);
  };
  useEffect(() => { load(); }, []);

  const submit = async (e) => {
    e.preventDefault();
    try {
      const photoUrl = form.photos[0] || FALLBACK_PHOTOS[Math.floor(Math.random() * FALLBACK_PHOTOS.length)];
      await api.post("/properties", { ...form, photos: [photoUrl] });
      toast.success("Property created");
      setOpen(false);
      setForm({ ...form, name: "", description: "", address: "", lga: "", num_units: 1 });
      load();
    } catch (e) { toast.error(formatApiError(e.response?.data?.detail)); }
  };

  const del = async (id) => {
    try {
      await api.delete(`/properties/${id}`);
      toast.success("Property removed");
      load();
    } catch (e) { toast.error(formatApiError(e.response?.data?.detail)); }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Properties"
        subtitle="Add buildings and auto-generate units."
        actions={
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button data-testid="add-property-btn"><Plus className="h-4 w-4 mr-1" /> Add property</Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Add a new property</DialogTitle>
                <DialogDescription>Units will be auto-generated and you can rename them later.</DialogDescription>
              </DialogHeader>
              <form onSubmit={submit} className="grid sm:grid-cols-2 gap-3">
                <div className="sm:col-span-2"><Label>Property name *</Label>
                  <Input data-testid="prop-name-input" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
                <div><Label>Type *</Label>
                  <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v })}>
                    <SelectTrigger data-testid="prop-type-select"><SelectValue /></SelectTrigger>
                    <SelectContent>{PROPERTY_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                  </Select></div>
                <div><Label>State *</Label>
                  <Input data-testid="prop-state-input" required value={form.state} onChange={(e) => setForm({ ...form, state: e.target.value })} /></div>
                <div className="sm:col-span-2"><Label>Address *</Label>
                  <Input data-testid="prop-address-input" required value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} /></div>
                <div><Label>Local Government</Label>
                  <Input data-testid="prop-lga-input" value={form.lga} onChange={(e) => setForm({ ...form, lga: e.target.value })} /></div>
                <div><Label>GPS</Label>
                  <Input data-testid="prop-gps-input" placeholder="lat, lng" value={form.gps} onChange={(e) => setForm({ ...form, gps: e.target.value })} /></div>
                <div className="sm:col-span-2"><Label>Description</Label>
                  <Textarea data-testid="prop-desc-input" rows={2} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
                <div><Label>Photo URL (optional)</Label>
                  <Input data-testid="prop-photo-input" placeholder="https://…" value={form.photos[0] || ""} onChange={(e) => setForm({ ...form, photos: e.target.value ? [e.target.value] : [] })} /></div>
                <div className="sm:col-span-2">
                  <Label>Property photos</Label>
                  <FileUpload
                    folder="properties"
                    accept="image/*"
                    multiple
                    maxFiles={6}
                    value={form.photos}
                    onChange={(urls) => setForm({ ...form, photos: urls })}
                    label="Drop photos or click to browse"
                    testId="prop-photos-upload"
                  />
                </div>
                <div><Label>Number of units</Label>
                  <Input data-testid="prop-num-units-input" type="number" min="0" value={form.num_units} onChange={(e) => setForm({ ...form, num_units: Number(e.target.value) })} /></div>
                <div><Label>Unit prefix</Label>
                  <Select value={form.unit_prefix} onValueChange={(v) => setForm({ ...form, unit_prefix: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{UNIT_PREFIXES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                  </Select></div>
                <DialogFooter className="sm:col-span-2">
                  <Button data-testid="prop-save-btn" type="submit">Create property</Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        }
      />

      {items.length === 0 ? (
        <Card className="border-border shadow-none">
          <CardContent className="py-16 text-center">
            <Building2 className="h-8 w-8 mx-auto text-muted-foreground" />
            <div className="mt-3 font-medium">No properties yet</div>
            <div className="text-sm text-muted-foreground">Add your first property to start managing tenants.</div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-5">
          {items.map((p) => (
            <Card key={p.id} data-testid={`property-card-${p.id}`} className="border-border shadow-none stat-card overflow-hidden">
              <div className="aspect-[16/10] bg-muted overflow-hidden">
                {p.photos?.[0] && <img src={p.photos[0]} alt={p.name} className="w-full h-full object-cover" />}
              </div>
              <CardContent className="p-5">
                <div className="flex items-start justify-between">
                  <div className="min-w-0">
                    <div className="font-display text-lg font-semibold truncate">{p.name}</div>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5 truncate">
                      <MapPin className="h-3 w-3" /> {p.address}, {p.state}
                    </div>
                  </div>
                  <Badge variant="outline" className="capitalize">{p.type}</Badge>
                </div>
                <div className="mt-4 grid grid-cols-3 gap-2 text-xs">
                  <div className="rounded-md border border-border p-2"><div className="tiny-label">Units</div><div className="text-sm font-medium">{p.total_units}</div></div>
                  <div className="rounded-md border border-border p-2"><div className="tiny-label">Occupied</div><div className="text-sm font-medium text-primary">{p.occupied}</div></div>
                  <div className="rounded-md border border-border p-2"><div className="tiny-label">Vacant</div><div className="text-sm font-medium text-accent">{p.vacant}</div></div>
                </div>
                <div className="mt-4 flex items-center gap-2">
                  <Button data-testid={`prop-view-${p.id}`} size="sm" variant="outline" onClick={() => nav(`/landlord/properties/${p.id}`)}>Manage units</Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button size="sm" variant="ghost" className="text-destructive ml-auto" data-testid={`prop-delete-${p.id}`}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Delete property?</AlertDialogTitle>
                        <AlertDialogDescription>This also removes all units. Tenants will keep their records but become unassigned.</AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={() => del(p.id)}>Delete</AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
