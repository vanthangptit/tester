// Pure input validators shared by domain validation rules.

export function isEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

// Vietnamese phone: leading 0 then 9–10 digits. Spaces are ignored.
export function isVNPhone(value: string): boolean {
  return /^0\d{9,10}$/.test(value.replace(/\s+/g, ""));
}

// True for a real "YYYY-MM-DD" calendar date.
export function isIsoDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const d = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && value === d.toISOString().slice(0, 10);
}

export function isFutureDate(value: string, today: Date = new Date()): boolean {
  const d = new Date(`${value}T00:00:00Z`);
  const todayUtc = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()));
  return d.getTime() > todayUtc.getTime();
}
