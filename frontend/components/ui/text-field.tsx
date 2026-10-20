import type { ComponentProps } from "react";

type TextFieldProps = ComponentProps<"input"> & {
  id: string;
  label: string;
  hint?: string;
  error?: string;
};

export function TextField({ id, label, hint, error, required, className = "", "aria-describedby": describedBy, ...props }: TextFieldProps) {
  const description = [describedBy, hint && `${id}-hint`, error && `${id}-error`].filter(Boolean).join(" ");

  return (
    <div className="flex min-w-0 flex-col gap-2">
      <label htmlFor={id} className="text-sm font-medium">
        {label}{required && <span aria-hidden="true"> *</span>}
      </label>
      <input
        {...props}
        id={id}
        required={required}
        aria-invalid={error ? true : undefined}
        aria-describedby={description || undefined}
        className={`h-12 min-w-0 w-full rounded-lg border bg-surface px-4 text-sm text-ink placeholder:text-muted focus:border-brand focus:outline-2 focus:outline-offset-2 focus:outline-brand disabled:bg-canvas ${error ? "border-danger" : "border-line"} ${className}`}
      />
      {hint && <p id={`${id}-hint`} className="text-xs text-muted">{hint}</p>}
      {error && <p id={`${id}-error`} role="alert" className="text-xs text-danger">{error}</p>}
    </div>
  );
}
