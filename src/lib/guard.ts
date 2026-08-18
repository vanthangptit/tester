// Result of a "is this allowed?" domain check that carries a human-readable
// reason when it is not. Used for delete guards and state-transition guards so
// the UI can prevent the action AND explain why (per the business rules).

export type Guard =
  | { readonly ok: true }
  | { readonly ok: false; readonly reason: string };

export const allow: Guard = { ok: true };

export function deny(reason: string): Guard {
  return { ok: false, reason };
}
