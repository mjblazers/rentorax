import React from "react";
import { expiryClasses } from "@/lib/api";

export default function ExpiryBadge({ tier, days }) {
  if (!tier) return null;
  const label = tier === "expired"
    ? `Expired ${Math.abs(days)}d ago`
    : `${days}d left`;
  return (
    <span
      data-testid={`expiry-badge-${tier}`}
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border ${expiryClasses(tier)}`}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {label}
    </span>
  );
}
