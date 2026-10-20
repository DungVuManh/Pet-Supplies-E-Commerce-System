export function AuthNotice({ children }: { children: string }) {
  return children ? (
    <p role="status" className="rounded-lg border border-line bg-brand-subtle p-3 text-sm leading-relaxed text-ink">
      {children}
    </p>
  ) : null;
}
