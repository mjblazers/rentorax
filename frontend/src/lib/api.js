import axios from "axios";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

export const api = axios.create({
  baseURL: `${BACKEND_URL}/api`,
  withCredentials: true,
});

export function formatApiError(detail, fallback = "Something went wrong.") {
  if (detail == null) return fallback;
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail)) {
    return detail
      .map((e) => (e && typeof e.msg === "string" ? e.msg : JSON.stringify(e)))
      .filter(Boolean)
      .join(" ");
  }
  if (detail && typeof detail.msg === "string") return detail.msg;
  return String(detail);
}

export function formatNaira(amount) {
  const n = Number(amount || 0);
  return "₦" + n.toLocaleString("en-NG", { maximumFractionDigits: 2 });
}

export function formatDate(iso) {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleDateString("en-NG", {
      year: "numeric", month: "short", day: "numeric",
    });
  } catch { return iso; }
}

export function expiryTier(days) {
  if (days == null) return null;
  if (days < 0) return "expired";
  if (days < 14) return "critical";
  if (days < 60) return "urgent";
  if (days <= 90) return "warning";
  return "safe";
}

export function expiryClasses(tier) {
  switch (tier) {
    case "safe":     return "bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 border-green-200 dark:border-green-800";
    case "warning":  return "bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300 border-yellow-200 dark:border-yellow-800";
    case "urgent":   return "bg-orange-100 dark:bg-orange-900/30 text-orange-800 dark:text-orange-300 border-orange-200 dark:border-orange-800";
    case "critical": return "bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300 border-red-200 dark:border-red-800";
    case "expired":  return "bg-rose-200 dark:bg-rose-900/50 text-rose-900 dark:text-rose-200 border-rose-300 dark:border-rose-700";
    default:         return "bg-muted text-muted-foreground border-border";
  }
}
