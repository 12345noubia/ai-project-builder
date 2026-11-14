export function Logo({ className = "" }: { className?: string }) {
  return (
    <span className={`inline-flex items-center gap-2 font-display text-xl font-bold tracking-tight ${className}`}>
      <svg viewBox="0 0 32 32" className="size-7" aria-hidden="true">
        <circle cx="16" cy="16" r="15" className="fill-primary" />
        <path d="M16 6l3 7h-6zM26 16l-7 3v-6zM16 26l-3-7h6zM6 16l7-3v6z" className="fill-primary-foreground" />
      </svg>
      Opero
    </span>
  );
}
