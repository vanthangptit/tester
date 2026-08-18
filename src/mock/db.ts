// In-memory mock backend. A single mutable store seeded once, plus a simulated
// network latency so screens exercise real loading / error / empty / success
// states. Repositories in each feature's api/ layer read and mutate this store.
import { buildSeed, type Seed } from "@/mock/seed";

export const db: Seed = buildSeed();

// Simulated latency for every repository call.
export function delay(ms?: number): Promise<void> {
  const wait = ms ?? 250 + Math.floor(Math.random() * 250);
  return new Promise((resolve) => setTimeout(resolve, wait));
}

// Return a detached copy so callers can never mutate the store by reference.
export function clone<T>(value: T): T {
  return structuredClone(value);
}
