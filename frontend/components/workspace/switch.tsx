"use client";

import { useId } from "react";

export function Switch({ label, description, checked, onChange, disabled = false }: { label: string; description?: string; checked: boolean; onChange: (checked: boolean) => void; disabled?: boolean }) {
  const id = useId();
  return <div className="flex items-center justify-between gap-4 py-2">
    <div className="min-w-0"><p id={`${id}-label`} className="font-semibold">{label}</p>{description && <p id={`${id}-desc`} className="mt-1 text-xs text-muted">{description}</p>}</div>
    <button type="button" role="switch" aria-checked={checked} aria-labelledby={`${id}-label`} aria-describedby={description ? `${id}-desc` : undefined} disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-6 w-10 shrink-0 items-center rounded-full transition-colors motion-reduce:transition-none disabled:opacity-40 ${checked ? "bg-brand" : "bg-line"}`}>
      <span className={`h-4 w-4 rounded-full bg-surface transition-transform motion-reduce:transition-none ${checked ? "translate-x-5" : "translate-x-1"}`} aria-hidden="true" />
    </button>
  </div>;
}
