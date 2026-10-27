export function clampPage(page: number, totalPages: number): number {
  const total = Math.max(1, totalPages);

  if (!Number.isFinite(page)) return 1;

  return Math.min(Math.max(1, Math.trunc(page)), total);
}
