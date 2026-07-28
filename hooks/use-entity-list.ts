"use client";

import { useMemo, useState } from "react";

export function useEntityList<T>(
  items: T[],
  filterFn: (item: T, query: string) => boolean,
) {
  const [search, setSearch] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<T | null>(null);
  const [tick, setTick] = useState(0);

  const filtered = useMemo(() => {
    void tick;
    return items.filter((item) => filterFn(item, search));
  }, [filterFn, items, search, tick]);

  const refresh = () => setTick((value) => value + 1);

  const openCreate = () => {
    setEditing(null);
    setFormOpen(true);
  };

  const openEdit = (item: T) => {
    setEditing(item);
    setFormOpen(true);
  };

  const closeForm = () => {
    setFormOpen(false);
    setEditing(null);
  };

  return {
    search,
    setSearch,
    filtered,
    formOpen,
    setFormOpen,
    editing,
    openCreate,
    openEdit,
    closeForm,
    refresh,
  };
}
