// Pure time-of-day + calendar helpers. No React, no I/O.

// "YYYY-MM-DD" -> "DD/MM/YYYY" for display. Returns the input unchanged if it is
// not in the expected shape.
export function formatDateVN(date: string): string {
  const parts = date.split("-");
  if (parts.length !== 3) return date;
  const [y, m, d] = parts;
  return `${d}/${m}/${y}`;
}

// A wall-clock time within a day, "HH:mm" (24h). Kept as string for easy form
// binding; parsed on demand.
export interface TimeInterval {
  start: string; // "HH:mm"
  end: string; // "HH:mm"
}

export function toMinutes(time: string): number {
  const [h, m] = time.split(":");
  return Number(h) * 60 + Number(m);
}

// Half-open interval overlap: [aStart, aEnd) intersects [bStart, bEnd).
// Back-to-back sessions (one ends exactly when the next starts) do NOT overlap.
export function intervalsOverlap(a: TimeInterval, b: TimeInterval): boolean {
  return toMinutes(a.start) < toMinutes(b.end) && toMinutes(b.start) < toMinutes(a.end);
}

// ISO-8601 week key like "2026-W34", used to measure a teacher's weekly load.
// `date` is a "YYYY-MM-DD" string.
export function isoWeekKey(date: string): string {
  const d = new Date(`${date}T00:00:00Z`);
  const dayFromMonday = (d.getUTCDay() + 6) % 7; // Mon = 0 ... Sun = 6
  const thursday = new Date(d);
  thursday.setUTCDate(d.getUTCDate() - dayFromMonday + 3);
  const firstThursday = new Date(Date.UTC(thursday.getUTCFullYear(), 0, 4));
  const firstDayFromMonday = (firstThursday.getUTCDay() + 6) % 7;
  const week =
    1 +
    Math.round(
      (thursday.getTime() - firstThursday.getTime()) / 86_400_000 / 7 -
        (firstDayFromMonday - 3) / 7,
    );
  return `${thursday.getUTCFullYear()}-W${String(week).padStart(2, "0")}`;
}
