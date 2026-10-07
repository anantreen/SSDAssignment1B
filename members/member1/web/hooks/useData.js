/**
 * Small shared JSON-fetching hook.
 *
 * Starts with a loading state; a URL change or reload requests a new snapshot.
 * The cleanup flag ignores results arriving after this effect was replaced/unmounted.
 * It does not cancel the HTTP request; it only prevents stale state publication.
 */

import { useEffect, useState, useCallback } from "react";
import { api } from "../lib/api.js";

/**
 * @param {string} url API path relative to /api.
 * @returns {{loading: boolean, data: any, error: string|null, reload: Function}}
 */
export function useData(url) {
  const [state, set] = useState({ loading: true, data: null, error: null });
  // Incrementing a local version triggers the effect without modifying the endpoint
  // URL.
  const [version, bump] = useState(0);
  const reload = useCallback(() => bump((v) => v + 1), []);
  useEffect(() => {
    // Each effect instance gets its own flag; old requests cannot overwrite a newer
    // scope.
    let alive = true;
    // Keep the previous data snapshot in state during loading, while DataState shows
    // its loader.
    set((v) => ({ ...v, loading: true, error: null }));
    api(url)
      .then((data) => alive && set({ loading: false, data, error: null }))
      .catch(
        (error) => alive && set({ loading: false, data: null, error: error.message }),
      );
    return () => {
      alive = false;
    };
  }, [url, version]);
  return { ...state, reload };
}
