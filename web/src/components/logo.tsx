export function TianqiLogo({ className = 'size-6' }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={className} fill="none" aria-hidden="true">
      <path d="M16 2 19.6 12.4 30 16l-10.4 3.6L16 30l-3.6-10.4L2 16l10.4-3.6L16 2Z" fill="currentColor" opacity=".9" />
      <circle cx="16" cy="16" r="3" className="fill-background" />
    </svg>
  )
}
