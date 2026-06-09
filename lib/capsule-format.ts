export function formatUnlockDate(iso: string): string {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(iso));
}

export function formatCountdown(diffMs: number): string {
  if (diffMs <= 0) return "ready now";
  const s = Math.floor(diffMs / 1000);
  const m = Math.floor(s / 60);
  const h = Math.floor(m / 60);
  const d = Math.floor(h / 24);
  if (d >= 1) return `${d}d ${h - d * 24}h`;
  if (h >= 1) return `${h}h ${m - h * 60}m`;
  if (m >= 1) return `${m}m ${s - m * 60}s`;
  return `${s}s`;
}
