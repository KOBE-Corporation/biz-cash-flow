import { createId, getStore, touch } from "@/lib/mock/store";
import type { Category, RepoResult } from "@/lib/types";

export type CategoryInput = {
  name: string;
  description?: string;
  isActive?: boolean;
};

export function listCategories() {
  return [...getStore().categories].sort((a, b) =>
    a.name.localeCompare(b.name, "fr"),
  );
}

export function getCategory(id: string) {
  return getStore().categories.find((item) => item.id === id) ?? null;
}

export function countProductsInCategory(categoryId: string) {
  return getStore().products.filter((p) => p.categoryId === categoryId).length;
}

export function createCategory(input: CategoryInput): RepoResult<Category> {
  const name = input.name.trim();
  if (!name) return { ok: false, error: "Le nom est obligatoire" };

  const store = getStore();
  if (store.categories.some((c) => c.name.toLowerCase() === name.toLowerCase())) {
    return { ok: false, error: "Cette categorie existe deja" };
  }

  const now = touch();
  const category: Category = {
    id: createId("c"),
    name,
    description: input.description?.trim() || undefined,
    isActive: input.isActive ?? true,
    createdAt: now,
    updatedAt: now,
  };
  store.categories.push(category);
  return { ok: true, data: category };
}

export function updateCategory(
  id: string,
  input: CategoryInput,
): RepoResult<Category> {
  const store = getStore();
  const index = store.categories.findIndex((c) => c.id === id);
  if (index < 0) return { ok: false, error: "Categorie introuvable" };

  const name = input.name.trim();
  if (!name) return { ok: false, error: "Le nom est obligatoire" };

  if (
    store.categories.some(
      (c) => c.id !== id && c.name.toLowerCase() === name.toLowerCase(),
    )
  ) {
    return { ok: false, error: "Cette categorie existe deja" };
  }

  const current = store.categories[index];
  const updated: Category = {
    ...current,
    name,
    description: input.description?.trim() || undefined,
    isActive: input.isActive ?? current.isActive,
    updatedAt: touch(),
  };
  store.categories[index] = updated;
  return { ok: true, data: updated };
}

export function removeCategory(id: string): RepoResult<true> {
  const store = getStore();
  if (countProductsInCategory(id) > 0) {
    return {
      ok: false,
      error: "Impossible de supprimer : des produits sont lies",
    };
  }
  const before = store.categories.length;
  store.categories = store.categories.filter((c) => c.id !== id);
  if (store.categories.length === before) {
    return { ok: false, error: "Categorie introuvable" };
  }
  return { ok: true, data: true };
}
