"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

export type ColumnDefMeta = {
  key: string;
  /** When false, column cannot be hidden. Default true. */
  hideable?: boolean;
  /** When false, starts hidden. Default true. */
  defaultVisible?: boolean;
};

function readStored(storageKey: string): string[] | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(storageKey);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed)
      ? parsed.filter((k): k is string => typeof k === "string")
      : null;
  } catch {
    return null;
  }
}

export function useColumnVisibility(
  storageKey: string,
  columns: ColumnDefMeta[]
) {
  const defaults = useMemo(() => {
    return columns
      .filter((c) => c.defaultVisible !== false)
      .map((c) => c.key);
  }, [columns]);

  const locked = useMemo(() => {
    return new Set(columns.filter((c) => c.hideable === false).map((c) => c.key));
  }, [columns]);

  const [visibleKeys, setVisibleKeys] = useState<string[]>(defaults);

  useEffect(() => {
    const stored = readStored(`table-cols:${storageKey}`);
    if (!stored) {
      setVisibleKeys(defaults);
      return;
    }
    const valid = new Set(columns.map((c) => c.key));
    const next = stored.filter((k) => valid.has(k));
    for (const key of locked) {
      if (!next.includes(key)) next.unshift(key);
    }
    setVisibleKeys(next.length ? next : defaults);
  }, [storageKey, columns, defaults, locked]);

  const persist = useCallback(
    (keys: string[]) => {
      setVisibleKeys(keys);
      try {
        localStorage.setItem(`table-cols:${storageKey}`, JSON.stringify(keys));
      } catch {
        /* ignore */
      }
    },
    [storageKey]
  );

  const isVisible = useCallback(
    (key: string) => visibleKeys.includes(key),
    [visibleKeys]
  );

  const toggle = useCallback(
    (key: string) => {
      if (locked.has(key)) return;
      const next = visibleKeys.includes(key)
        ? visibleKeys.filter((k) => k !== key)
        : [...visibleKeys, key];
      // Always keep at least one column
      if (next.length === 0) return;
      persist(next);
    },
    [locked, persist, visibleKeys]
  );

  const reset = useCallback(() => persist(defaults), [defaults, persist]);

  return { visibleKeys, isVisible, toggle, reset, locked };
}
