export function toDate(value: Date | string | undefined): Date | null {
  if (!value) return null;

  const date = value instanceof Date ? value : new Date(value);

  return Number.isNaN(date.getTime()) ? null : date;
}

export function toDateTimeLocal(value: Date): string {
  const pad = (part: number) => String(part).padStart(2, '0');

  return `${value.getFullYear()}-${pad(value.getMonth() + 1)}-${pad(value.getDate())}T${pad(value.getHours())}:${pad(value.getMinutes())}`;
}

export function isCurrentlyBanned(bannedUntil: Date | string | undefined): boolean {
  const date = toDate(bannedUntil);
  if (!date) return false;

  return date.getTime() > Date.now();
}
