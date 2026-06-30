import React from "react";

export default function PageHeader({ title, subtitle, actions }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-6">
      <div>
        <div className="tiny-label">RentoraX</div>
        <h1 className="font-display text-3xl sm:text-4xl font-semibold tracking-tight mt-1">{title}</h1>
        {subtitle && <p className="text-muted-foreground text-sm mt-2 max-w-2xl">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}
