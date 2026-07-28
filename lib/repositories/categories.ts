import { createId, getStore, touch } from "@/lib/mock/store";
import { getActor, recordAudit } from "@/lib/repositories/audit";
import {
  createPackLevelId,
  ensureBasePackLevel,
} from "@/lib/sales/pricing";
import type { Category, PackLevelTemplate, RepoResult } from "@/lib/types";

export type CategoryInput = {
  name: string;
  description?: string;
  baseUnitName: string;
  packLevels?: PackLevelTemplate[];
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

function normalizePackLevels(
  baseUnitName: string,
  packLevels?: PackLevelTemplate[],
): PackLevelTemplate[] {
  const cleaned = (packLevels ?? [])
    .filter((level) => level.name.trim() && level.unitsOfBase > 0)
    .map((level) => ({
      id: level.id || createPackLevelId(),
      name: level.name.trim(),
      unitsOfBase: Math.max(1, Math.trunc(level.unitsOfBase)),
    }));
  return ensureBasePackLevel(baseUnitName.trim() || "unite", cleaned);
}

export function createCategory(input: CategoryInput): RepoResult<Category> {
  const name = input.name.trim();
  const baseUnitName = input.baseUnitName.trim() || "unite";
  if (!name) return { ok: false, error: "Le nom est obligatoire" };

  const store = getStore();
  if (store.categories.some((c) => c.name.toLowerCase() === name.toLowerCase())) {
    return { ok: false, error: "Cette categorie existe deja" };
  }

  const actor = getActor();
  const now = touch();
  const category: Category = {
    id: createId("c"),
    name,
    description: input.description?.trim() || undefined,
    baseUnitName,
    packLevels: normalizePackLevels(baseUnitName, input.packLevels),
    isActive: input.isActive ?? true,
    createdById: actor.id,
    createdByName: actor.name,
    createdAt: now,
    updatedAt: now,
  };
  store.categories.push(category);
  recordAudit({
    action: "CREATE",
    entityType: "Category",
    entityId: category.id,
    summary: `Categorie creee : ${category.name}`,
  });
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
  const baseUnitName = input.baseUnitName.trim() || "unite";
  if (!name) return { ok: false, error: "Le nom est obligatoire" };

  if (
    store.categories.some(
      (c) => c.id !== id && c.name.toLowerCase() === name.toLowerCase(),
    )
  ) {
    return { ok: false, error: "Cette categorie existe deja" };
  }

  const actor = getActor();
  const current = store.categories[index];
  const updated: Category = {
    ...current,
    name,
    description: input.description?.trim() || undefined,
    baseUnitName,
    packLevels: normalizePackLevels(baseUnitName, input.packLevels),
    isActive: input.isActive ?? current.isActive,
    updatedById: actor.id,
    updatedByName: actor.name,
    updatedAt: touch(),
  };
  store.categories[index] = updated;
  recordAudit({
    action: "UPDATE",
    entityType: "Category",
    entityId: updated.id,
    summary: `Categorie mise a jour : ${updated.name}`,
  });
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
  const category = store.categories.find((c) => c.id === id);
  const before = store.categories.length;
  store.categories = store.categories.filter((c) => c.id !== id);
  if (store.categories.length === before) {
    return { ok: false, error: "Categorie introuvable" };
  }
  recordAudit({
    action: "DELETE",
    entityType: "Category",
    entityId: id,
    summary: `Categorie supprimee : ${category?.name ?? id}`,
  });
  return { ok: true, data: true };
}
