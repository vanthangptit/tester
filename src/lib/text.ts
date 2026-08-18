// Small text helpers for case-insensitive search over record fields.

export function normalize(s: string): string {
  return s.trim().toLowerCase();
}

// True when `query` is empty, or any of the given fields contains it.
export function matchesQuery(fields: readonly string[], query: string | undefined): boolean {
  if (!query || query.trim() === "") return true;
  const q = normalize(query);
  return fields.some((field) => normalize(field).includes(q));
}
