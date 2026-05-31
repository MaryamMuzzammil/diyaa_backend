export function formatLastActive(date: Date | null | undefined): string {
  if (!date) return 'Never';
  const sec = Math.floor((Date.now() - date.getTime()) / 1000);
  if (sec < 60) return `${sec} secs ago`;
  if (sec < 3600) return `${Math.floor(sec / 60)} mins ago`;
  if (sec < 86400) return `${Math.floor(sec / 3600)} hours ago`;
  return `${Math.floor(sec / 86400)} days ago`;
}

export function formatClassLabel(
  grade: string,
  section: string,
  branch?: string,
): string {
  const base = `${grade} - ${section}`;
  return branch ? `${base} (${branch})` : base;
}

export function formatClassName(grade: string, section: string): string {
  return `${grade} - ${section}`;
}

export function isActiveToday(date: Date | null | undefined): boolean {
  if (!date) return false;
  const d = new Date(date);
  const now = new Date();
  return (
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate()
  );
}

export function daysSince(date: Date | null | undefined): number {
  if (!date) return 999;
  return Math.floor((Date.now() - date.getTime()) / 86400000);
}
