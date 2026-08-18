// Branded ID types: a string tagged with a unique symbol so the compiler treats
// TeacherId, RoomId, CourseId, ... as distinct types even though they are plain
// strings at runtime. This prevents passing, say, a StudentId where a CourseId
// is expected — which matters here because entities cross-reference each other.
//
// `brand` is the SINGLE sanctioned cast site in the codebase. Everywhere else we
// keep the "no unsafe casts" rule.
declare const __brand: unique symbol;

export type Brand<T, B extends string> = T & { readonly [__brand]: B };

export function brand<B extends string>(value: string): Brand<string, B> {
  return value as Brand<string, B>;
}

let counter = 0;

// Monotonic id generator for records created at runtime (create dialogs).
// Seed data uses stable, human-readable ids instead (see mock/seed.ts).
export function nextId<B extends string>(prefix: string): Brand<string, B> {
  counter += 1;
  return brand<B>(`${prefix}_${Date.now().toString(36)}${counter.toString(36)}`);
}
