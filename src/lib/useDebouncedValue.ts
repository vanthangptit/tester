import { useEffect, useState } from "react";

// Returns `value` delayed by `delayMs`. Used to debounce search input so a
// keystroke doesn't fire a query on every character.
export function useDebouncedValue<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(id);
  }, [value, delayMs]);
  return debounced;
}
