import React, { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { api, formatApiError } from "@/lib/api";
import PageHeader from "@/components/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

export default function TenantProfile() {
  const { user, setUser } = useAuth();
  const [form, setForm] = useState({ name: user.name || "", phone: user.phone || "" });
  const [pwd, setPwd] = useState({ current_password: "", new_password: "" });

  const save = async (e) => {
    e.preventDefault();
    try { const { data } = await api.patch("/auth/profile", form); setUser(data); toast.success("Profile updated"); }
    catch (e) { toast.error(formatApiError(e.response?.data?.detail)); }
  };
  const change = async (e) => {
    e.preventDefault();
    try { await api.post("/auth/change-password", pwd); toast.success("Password updated"); setPwd({ current_password: "", new_password: "" }); }
    catch (e) { toast.error(formatApiError(e.response?.data?.detail)); }
  };

  return (
    <div className="space-y-6">
      <PageHeader title="My profile" subtitle="Update your contact details and password." />
      <div className="grid lg:grid-cols-2 gap-5">
        <Card className="border-border shadow-none">
          <CardContent className="p-6">
            <div className="tiny-label">Details</div>
            <form onSubmit={save} className="mt-3 space-y-3">
              <div><Label>Email</Label><Input disabled value={user.email} /></div>
              <div><Label>Name</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
              <div><Label>Phone</Label><Input value={form.phone || ""} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></div>
              <Button type="submit">Save</Button>
            </form>
          </CardContent>
        </Card>
        <Card className="border-border shadow-none">
          <CardContent className="p-6">
            <div className="tiny-label">Password</div>
            <form onSubmit={change} className="mt-3 space-y-3">
              <div><Label>Current password</Label><Input type="password" required value={pwd.current_password} onChange={(e) => setPwd({ ...pwd, current_password: e.target.value })} /></div>
              <div><Label>New password</Label><Input type="password" required minLength={6} value={pwd.new_password} onChange={(e) => setPwd({ ...pwd, new_password: e.target.value })} /></div>
              <Button type="submit">Update password</Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
