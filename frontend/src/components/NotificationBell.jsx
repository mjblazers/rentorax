import React, { useEffect, useState, useCallback } from "react";
import { api } from "@/lib/api";
import { Bell, X, CheckCheck, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover, PopoverContent, PopoverTrigger,
} from "@/components/ui/popover";

const TYPE_COLOR = {
  info: "bg-blue-500",
  warning: "bg-amber-500",
  success: "bg-green-500",
  danger: "bg-rose-500",
  announcement: "bg-primary",
};

export default function NotificationBell() {
  const [items, setItems] = useState([]);
  const [open, setOpen] = useState(false);
  const [count, setCount] = useState(0);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const [list, unread] = await Promise.all([
        api.get("/notifications"),
        api.get("/notifications/unread-count"),
      ]);
      setItems(list.data);
      setCount(unread.data?.count || 0);
    } catch {}
  }, []);

  useEffect(() => {
    load();
    const i = setInterval(load, 60000);
    return () => clearInterval(i);
  }, [load]);

  const markRead = async (id) => {
    await api.post(`/notifications/${id}/read`);
    setItems((arr) => arr.map((n) => n.id === id ? { ...n, read: true } : n));
    setCount((c) => Math.max(0, c - 1));
  };
  const markAll = async () => {
    setBusy(true);
    try { await api.post("/notifications/read-all"); await load(); }
    finally { setBusy(false); }
  };
  const del = async (id) => {
    await api.delete(`/notifications/${id}`);
    setItems((arr) => arr.filter((n) => n.id !== id));
  };

  const fmtTime = (iso) => {
    try {
      const d = new Date(iso); const diff = (Date.now() - d.getTime()) / 1000;
      if (diff < 60) return "just now";
      if (diff < 3600) return `${Math.floor(diff / 60)}m`;
      if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
      return d.toLocaleDateString();
    } catch { return ""; }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" data-testid="notifications-btn" className="relative">
          <Bell className="h-4 w-4" />
          {count > 0 && (
            <span className="absolute -top-0.5 -right-0.5 h-4 min-w-4 px-1 rounded-full bg-accent text-accent-foreground text-[10px] font-semibold flex items-center justify-center">
              {count > 9 ? "9+" : count}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0">
        <div className="flex items-center justify-between p-3 border-b border-border">
          <div className="font-display font-semibold text-sm">Notifications</div>
          {count > 0 && (
            <Button size="sm" variant="ghost" onClick={markAll} disabled={busy} data-testid="notif-mark-all">
              {busy ? <Loader2 className="h-3 w-3 animate-spin" /> : <CheckCheck className="h-3.5 w-3.5 mr-1" />} Mark all
            </Button>
          )}
        </div>
        <div className="max-h-96 overflow-y-auto">
          {items.length === 0 ? (
            <div className="p-6 text-sm text-muted-foreground text-center">You're all caught up. 🎉</div>
          ) : items.map((n) => (
            <div key={n.id} className={`group flex gap-3 p-3 border-b border-border hover:bg-muted/40 ${n.read ? "opacity-60" : ""}`} data-testid={`notif-${n.id}`}>
              <div className={`mt-1 h-2 w-2 rounded-full flex-shrink-0 ${TYPE_COLOR[n.type] || "bg-muted-foreground"}`}></div>
              <div className="flex-1 min-w-0" onClick={() => !n.read && markRead(n.id)}>
                <div className="text-sm font-medium truncate">{n.title}</div>
                <div className="text-xs text-muted-foreground line-clamp-2">{n.message}</div>
                <div className="text-[11px] text-muted-foreground mt-1">{fmtTime(n.created_at)}</div>
              </div>
              <button onClick={() => del(n.id)} className="opacity-0 group-hover:opacity-100 transition" data-testid={`notif-del-${n.id}`}>
                <X className="h-3.5 w-3.5 text-muted-foreground hover:text-foreground" />
              </button>
            </div>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}
