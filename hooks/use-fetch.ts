"use client";

import { useCallback, useEffect, useState } from "react";
import { isForbiddenError } from "@/lib/api";
import { errorMessage } from "@/lib/format";
import { toast } from "sonner";

type UseFetchOptions = {
  /** When false, skip the request (no toast). Default true. */
  enabled?: boolean;
  /** Toast on errors other than 403. Default true. */
  toastOnError?: boolean;
};

export function useFetch<T>(
  fetcher: () => Promise<T>,
  deps: unknown[] = [],
  options?: UseFetchOptions
) {
  const enabled = options?.enabled ?? true;
  const toastOnError = options?.toastOnError ?? true;
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(enabled);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    if (!enabled) {
      setData(null);
      setError(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const result = await fetcher();
      setData(result);
    } catch (e) {
      const msg = errorMessage(e);
      setError(msg);
      // Industry: missing permission is a UI concern — don't spam toasts.
      if (toastOnError && !isForbiddenError(e)) {
        toast.error(msg);
      }
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, toastOnError, ...deps]);

  useEffect(() => {
    reload();
  }, [reload]);

  return { data, loading, error, reload, setData };
}
