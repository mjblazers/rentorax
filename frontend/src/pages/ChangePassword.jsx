import React, { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { api, formatApiError } from "@/lib/api";
import PageHeader from "@/components/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

export default function ChangePassword() {
  const { user } = useAuth();
  const [pwd, setPwd] = useState({ current_password: "", new_password: "" });

  const change = async (e) => {
    e.preventDefault();
    try { await api.post("/auth/change-password", pwd); toast.success("Password updated"); setPwd({ current_password: "", new_password: "" }); }
    catch (e) { toast.error(formatApiError(e.response?.data?.detail)); }
  };
  return (
    <div className="space-y-6 max-w-xl">
      <PageHeader title="Change password" subtitle={user?.email} />
      <Card className="border-border shadow-none">
        <CardContent className="p-6">
          <form onSubmit={change} className="space-y-3">
            <div><Label>Current password</Label><Input data-testid="cp-current" type="password" required value={pwd.current_password} onChange={(e) => setPwd({ ...pwd, current_password: e.target.value })} /></div>
            <div><Label>New password</Label><Input data-testid="cp-new" type="password" required minLength={6} value={pwd.new_password} onChange={(e) => setPwd({ ...pwd, new_password: e.target.value })} /></div>
            <Button data-testid="cp-submit" type="submit">Update</Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
