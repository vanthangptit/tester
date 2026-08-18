import { intervalsOverlap, isoWeekKey } from "@/lib/time";

// A time slot considered for scheduling. Kept minimal so both existing sessions
// and a not-yet-created candidate satisfy it.
export interface Slot {
  date: string; // "YYYY-MM-DD"
  startTime: string; // "HH:mm"
  endTime: string; // "HH:mm"
}

// Two slots clash when they fall on the same day and their times overlap.
export function slotsClash(a: Slot, b: Slot): boolean {
  return (
    a.date === b.date &&
    intervalsOverlap(
      { start: a.startTime, end: a.endTime },
      { start: b.startTime, end: b.endTime },
    )
  );
}

// First existing slot that clashes with `candidate`, or null if the candidate is
// free. Used for both teacher and room double-booking checks — the caller passes
// the set of slots already taken by that teacher (or room).
export function findClash(candidate: Slot, taken: readonly Slot[]): Slot | null {
  return taken.find((slot) => slotsClash(candidate, slot)) ?? null;
}

// --- Teacher load (avoid overload) -----------------------------------------

// Hard cap: no teacher may be scheduled for more than this many sessions in any
// ISO week. (Proposed default — see checkpoint notes.)
export const MAX_SESSIONS_PER_WEEK = 12;

// Count a teacher's sessions per ISO week from their session dates.
export function sessionsPerWeek(dates: readonly string[]): Map<string, number> {
  const counts = new Map<string, number>();
  for (const date of dates) {
    const key = isoWeekKey(date);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return counts;
}

// Would adding a session in `candidateDate`'s week push the teacher over the cap?
export function exceedsWeeklyCap(existingDates: readonly string[], candidateDate: string): boolean {
  const key = isoWeekKey(candidateDate);
  const current = sessionsPerWeek(existingDates).get(key) ?? 0;
  return current + 1 > MAX_SESSIONS_PER_WEEK;
}
