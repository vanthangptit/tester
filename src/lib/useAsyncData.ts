import { useCallback, useEffect, useRef, useState, type DependencyList } from "react";

export interface AsyncData<T> {
  data: T | undefined;
  error: string | undefined;
  isLoading: boolean;
  reload: () => void;
}

// Runs `factory` whenever `deps` change (or reload() is called), tracking
// loading and error. Stale results are ignored via an `active` flag so a fast
// re-query can't be overwritten by a slower earlier one. Previous data is kept
// during a refetch so lists don't flash empty while paging/filtering.
export function useAsyncData<T>(factory: () => Promise<T>, deps: DependencyList): AsyncData<T> {
  const [data, setData] = useState<T>();
  const [error, setError] = useState<string>();
  const [isLoading, setIsLoading] = useState(true);
  const [reloadTick, setReloadTick] = useState(0);

  // Keep the latest factory without making it a dependency of the effect.
  const factoryRef = useRef(factory);
  factoryRef.current = factory;

  useEffect(() => {
    let active = true;
    setIsLoading(true);
    setError(undefined);
    factoryRef
      .current()
      .then((result) => {
        if (active) setData(result);
      })
      .catch((e: unknown) => {
        if (active) setError(e instanceof Error ? e.message : "Đã có lỗi xảy ra.");
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });
    return () => {
      active = false;
    };
    // Deps are forwarded from the caller; reloadTick forces a manual refetch.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, reloadTick]);

  const reload = useCallback(() => setReloadTick((t) => t + 1), []);

  return { data, error, isLoading, reload };
}
