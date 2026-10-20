import type { ComponentProps, ReactNode } from "react";

type CheckboxProps = Omit<ComponentProps<"input">, "type" | "children"> & {
  id: string;
  children: ReactNode;
  error?: string;
};

export function Checkbox({ id, children, error, className = "", "aria-describedby": describedBy, ...props }: CheckboxProps) {
  return (
    <div className={className}>
      <label htmlFor={id} className="flex cursor-pointer items-start gap-2 text-sm leading-[1.5] text-muted">
        <input
          {...props}
          id={id}
          type="checkbox"
          aria-invalid={error ? true : undefined}
          aria-describedby={[describedBy, error && `${id}-error`].filter(Boolean).join(" ") || undefined}
          className="mt-0.5 size-4 shrink-0 accent-brand"
        />
        <span>{children}</span>
      </label>
      {error && <p id={`${id}-error`} role="alert" className="mt-2 text-xs text-danger">{error}</p>}
    </div>
  );
}
