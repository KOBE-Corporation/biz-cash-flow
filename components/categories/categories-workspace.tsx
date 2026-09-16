"use client";

import { useCallback, useMemo, useState } from "react";
import Link from "next/link";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { DataTable, type DataColumn } from "@/components/crud/data-table";
import { FormDialog } from "@/components/crud/form-dialog";
import { CrudToolbar } from "@/components/crud/toolbar";
import { InsightsHighlights } from "@/components/shared/insights-highlights";
import { PackLevelsEditor } from "@/components/shared/pack-levels-editor";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PageHeader, StatCard } from "@/components/ui/page-header";
import { ToastViewport, useToast } from "@/components/ui/toast";
import { useConfirmDialog } from "@/components/ui/use-confirm-dialog";
import { useBcfRefresh } from "@/hooks/use-bcf-refresh";
import { useEntityList } from "@/hooks/use-entity-list";
import {
  DEFAULT_CATEGORY_TRACKING,
  normalizeCategoryTracking,
} from "@/lib/inventory/expiry";
import {
  countProductsInCategory,
  createCategory,
  listCategories,
  removeCategory,
  updateCategory,
} from "@/lib/repositories/categories";
import { getCategoryInsights } from "@/lib/repositories/insights";
import { createPackLevelId } from "@/lib/sales/pricing";
import type { Category, CategoryTracking, PackLevelTemplate } from "@/lib/types";
import { cn, formatCurrency } from "@/lib/utils";

type CategoryFormState = {
  name: string;
  description: string;
  baseUnitName: string;
  packLevels: PackLevelTemplate[];
  tracking: CategoryTracking;
  isActive: boolean;
};

function defaultPackLevels(baseUnitName: string): PackLevelTemplate[] {
  return [
    {
      id: createPackLevelId(),
      name: baseUnitName || "unite",
      unitsOfBase: 1,
    },
  ];
}

const emptyForm = (): CategoryFormState => ({
  name: "",
  description: "",
  baseUnitName: "piece",
  packLevels: defaultPackLevels("piece"),
  tracking: { ...DEFAULT_CATEGORY_TRACKING },
  isActive: true,
});

function trackingSummary(tracking: CategoryTracking) {
  const tags: string[] = [];
  if (tracking.tracksExpiry) tags.push("Peremption");
  if (tracking.tracksManufacturedAt) tags.push("Fabrication");
  if (tracking.tracksBatchNumber) tags.push("Lot");
  if (tracking.tracksSerialNumber) tags.push("Serie");
  return tags.length ? tags.join(" · ") : "Aucun suivi date";
}

export function CategoriesWorkspace() {
  const { confirm, dialog } = useConfirmDialog();
  const { toast, showToast } = useToast();
  const { version, bump, mounted } = useBcfRefresh();
  const [form, setForm] = useState<CategoryFormState>(emptyForm);
  const [error, setError] = useState<string | null>(null);

  const items = useMemo(() => {
    if (!mounted) return [];
    void version;
    return listCategories();
  }, [version, mounted]);

  const insights = useMemo(() => {
    if (!mounted) return null;
    void version;
    return getCategoryInsights();
  }, [version, mounted]);

  const flagshipIds = useMemo(
    () => new Set(insights?.flagshipCategoryIds ?? []),
    [insights],
  );

  const rankById = useMemo(() => {
    const map = new Map(
      (insights?.topCategories ?? []).map((c) => [c.categoryId, c]),
    );
    for (const c of insights?.bottomCategories ?? []) {
      if (!map.has(c.categoryId)) map.set(c.categoryId, c);
    }
    // Inclure toutes les categories avec stats stock meme a 0 CA
    for (const cat of items) {
      if (map.has(cat.id)) continue;
      const fromAll = insights?.bottomCategories.find(
        (c) => c.categoryId === cat.id,
      );
      if (fromAll) map.set(cat.id, fromAll);
    }
    return map;
  }, [insights, items]);

  const filterFn = useCallback((item: Category, query: string) => {
    const q = query.trim().toLowerCase();
    if (!q) return true;
    return (
      item.name.toLowerCase().includes(q) ||
      item.baseUnitName.toLowerCase().includes(q) ||
      (item.description?.toLowerCase().includes(q) ?? false)
    );
  }, []);

  const list = useEntityList(items, filterFn);
  const activeCount = items.filter((item) => item.isActive).length;
  const trackedCount = items.filter(
    (item) =>
      item.tracking?.tracksExpiry ||
      item.tracking?.tracksManufacturedAt ||
      item.tracking?.tracksBatchNumber ||
      item.tracking?.tracksSerialNumber,
  ).length;
  const phareCount = flagshipIds.size;
  const alertCats = [...rankById.values()].filter(
    (c) => c.lowStockCount + c.outOfStockCount > 0,
  ).length;

  const openCreate = () => {
    setForm(emptyForm());
    setError(null);
    list.openCreate();
  };

  const openEdit = (item: Category) => {
    setForm({
      name: item.name,
      description: item.description ?? "",
      baseUnitName: item.baseUnitName,
      packLevels: item.packLevels.map((level) => ({ ...level })),
      tracking: normalizeCategoryTracking(item.tracking),
      isActive: item.isActive,
    });
    setError(null);
    list.openEdit(item);
  };

  const patchTracking = (patch: Partial<CategoryTracking>) => {
    setForm((prev) => ({
      ...prev,
      tracking: normalizeCategoryTracking({ ...prev.tracking, ...patch }),
    }));
  };

  const handleSave = () => {
    if (!form.name.trim()) {
      setError("Le nom est obligatoire");
      return;
    }
    if (!form.baseUnitName.trim()) {
      setError("L'unite de base est obligatoire");
      return;
    }
    const payload = {
      name: form.name,
      description: form.description,
      baseUnitName: form.baseUnitName,
      packLevels: form.packLevels,
      tracking: form.tracking,
      isActive: form.isActive,
    };
    const result = list.editing
      ? updateCategory(list.editing.id, payload)
      : createCategory(payload);

    if (!result.ok) {
      setError(result.error);
      return;
    }
    list.closeForm();
    bump();
    showToast(
      list.editing ? "Categorie mise a jour" : "Categorie creee",
      "success",
    );
  };

  const handleDelete = async (item: Category) => {
    const ok = await confirm({
      title: `Supprimer « ${item.name} » ?`,
      description: "Cette action est irreversible.",
      confirmLabel: "Supprimer",
      variant: "destructive",
    });
    if (!ok) return;
    const result = removeCategory(item.id);
    if (!result.ok) {
      showToast(result.error, "error");
      return;
    }
    bump();
    showToast(`« ${item.name} » supprimee`, "success");
  };

  const columns: DataColumn<Category>[] = [
    {
      key: "name",
      header: "Nom",
      cell: (row) => (
        <div className="min-w-0">
          <p className="truncate font-medium text-foreground">
            {row.name}
            {flagshipIds.has(row.id) ? (
              <Badge variant="success" className="ml-1.5 align-middle">
                Phare
              </Badge>
            ) : null}
          </p>
          {row.description ? (
            <p className="truncate text-xs text-muted-foreground">
              {row.description}
            </p>
          ) : null}
        </div>
      ),
    },
    {
      key: "packs",
      header: "Conditionnement",
      hideOnMobile: true,
      cell: (row) => (
        <span className="text-xs text-muted-foreground">
          {row.baseUnitName}
          {row.packLevels.length > 1
            ? ` · ${row.packLevels.length} niveaux`
            : ""}
        </span>
      ),
    },
    {
      key: "tracking",
      header: "Suivi",
      cell: (row) => (
        <span className="text-xs text-muted-foreground">
          {trackingSummary(normalizeCategoryTracking(row.tracking))}
        </span>
      ),
    },
    {
      key: "products",
      header: "Produits",
      cell: (row) => {
        const rank = rankById.get(row.id);
        return (
          <div className="text-xs tabular-nums">
            <p>{countProductsInCategory(row.id)}</p>
            {rank ? (
              <p className="text-muted-foreground">
                {rank.outOfStockCount + rank.lowStockCount > 0
                  ? `${rank.outOfStockCount + rank.lowStockCount} alerte(s)`
                  : "stock OK"}
              </p>
            ) : null}
          </div>
        );
      },
    },
    {
      key: "sales",
      header: "CA jour",
      cell: (row) => {
        const rank = rankById.get(row.id);
        if (!rank) {
          return <span className="text-xs text-muted-foreground">—</span>;
        }
        return (
          <div className="text-right text-xs">
            <p className="font-medium tabular-nums">
              {formatCurrency(rank.revenue)}
            </p>
            <p className="text-muted-foreground">{rank.sharePercent} %</p>
          </div>
        );
      },
    },
    {
      key: "status",
      header: "Statut",
      cell: (row) => (
        <Badge variant={row.isActive ? "success" : "outline"}>
          {row.isActive ? "Active" : "Inactive"}
        </Badge>
      ),
    },
    {
      key: "actions",
      header: "",
      className: "w-[1%] whitespace-nowrap text-right",
      cell: (row) => (
        <div className="flex justify-end gap-1" onClick={(e) => e.stopPropagation()}>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => openEdit(row)}
            aria-label="Modifier"
          >
            <Pencil className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-destructive hover:text-destructive"
            onClick={() => void handleDelete(row)}
            aria-label="Supprimer"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Categories"
        description="Familles produits, conditionnements, suivi date/lot, et categories phares du jour."
        actions={
          <>
            <Link
              href="/produits"
              className={cn(buttonVariants({ variant: "outline" }))}
            >
              Produits
            </Link>
            <Button variant="success" onClick={openCreate}>
              <Plus className="h-4 w-4" />
              Nouvelle categorie
            </Button>
          </>
        }
      />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard title="Categories" value={items.length} />
        <StatCard title="Actives" value={activeCount} variant="success" />
        <StatCard
          title="Phares du jour"
          value={phareCount}
          subtitle={
            insights?.topCategories[0]
              ? insights.topCategories[0].name
              : "Aucune vente"
          }
          variant="success"
        />
        <StatCard
          title="Avec suivi date/lot"
          value={trackedCount}
          variant="warning"
          subtitle={
            alertCats > 0 ? `${alertCats} famille(s) en alerte stock` : undefined
          }
        />
      </div>

      {insights ? (
        <InsightsHighlights
          insights={insights}
          title="Highlights categories & ventes"
          compact
        />
      ) : null}

      <CrudToolbar
        search={list.search}
        onSearchChange={list.setSearch}
        searchPlaceholder="Rechercher une categorie…"
      />

      <DataTable
        rows={list.filtered}
        columns={columns}
        rowKey={(row) => row.id}
        emptyTitle="Aucune categorie"
        emptyDescription="Creez une categorie (ex. Cigarettes, Bieres) avant tout achat."
        onRowClick={openEdit}
      />

      <FormDialog
        open={list.formOpen}
        onOpenChange={(open) => {
          if (!open) list.closeForm();
          else list.setFormOpen(true);
        }}
        title={list.editing ? "Modifier la categorie" : "Nouvelle categorie"}
        description="Activez uniquement les suivis utiles pour cette famille de produits."
        className="max-w-xl"
        footer={
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button variant="outline" onClick={list.closeForm}>
              Annuler
            </Button>
            <Button variant="success" onClick={handleSave}>
              Enregistrer
            </Button>
          </div>
        }
      >
        <div className="space-y-1.5">
          <Label htmlFor="cat-name">Nom</Label>
          <Input
            id="cat-name"
            value={form.name}
            onChange={(event) =>
              setForm((prev) => ({ ...prev, name: event.target.value }))
            }
            placeholder="Ex. Cigarettes"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="cat-desc">Description</Label>
          <Input
            id="cat-desc"
            value={form.description}
            onChange={(event) =>
              setForm((prev) => ({ ...prev, description: event.target.value }))
            }
            placeholder="Optionnel"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="cat-base">Unite de base</Label>
          <Input
            id="cat-base"
            value={form.baseUnitName}
            onChange={(event) => {
              const baseUnitName = event.target.value;
              setForm((prev) => ({
                ...prev,
                baseUnitName,
                packLevels: prev.packLevels.map((level) =>
                  level.unitsOfBase === 1
                    ? { ...level, name: baseUnitName || "unite" }
                    : level,
                ),
              }));
            }}
            placeholder="paquet, bouteille, piece…"
          />
        </div>
        <PackLevelsEditor
          baseUnitName={form.baseUnitName}
          levels={form.packLevels}
          onChange={(packLevels) =>
            setForm((prev) => ({ ...prev, packLevels }))
          }
        />

        <div className="space-y-3 rounded-xl border border-border p-3">
          <div>
            <p className="text-sm font-medium text-foreground">
              Suivi lot & dates
            </p>
            <p className="text-xs text-muted-foreground">
              Ces options pilotent les champs produit, les alertes de
              peremption et les remises suggerees.
            </p>
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={form.tracking.tracksManufacturedAt}
              onChange={(e) =>
                patchTracking({ tracksManufacturedAt: e.target.checked })
              }
              className="h-4 w-4 rounded border-border"
            />
            Date de fabrication
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={form.tracking.tracksExpiry}
              onChange={(e) =>
                patchTracking({ tracksExpiry: e.target.checked })
              }
              className="h-4 w-4 rounded border-border"
            />
            Date de peremption
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={form.tracking.tracksBatchNumber}
              onChange={(e) =>
                patchTracking({ tracksBatchNumber: e.target.checked })
              }
              className="h-4 w-4 rounded border-border"
            />
            Numero de lot
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={form.tracking.tracksSerialNumber}
              onChange={(e) =>
                patchTracking({ tracksSerialNumber: e.target.checked })
              }
              className="h-4 w-4 rounded border-border"
            />
            Numero de serie
          </label>

          {form.tracking.tracksExpiry ? (
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>Alerte (jours avant)</Label>
                <Input
                  type="number"
                  min={0}
                  value={form.tracking.expiryAlertDays}
                  onChange={(e) =>
                    patchTracking({
                      expiryAlertDays: Number(e.target.value) || 0,
                    })
                  }
                />
              </div>
              <div className="space-y-1.5">
                <Label>Critique (jours avant)</Label>
                <Input
                  type="number"
                  min={0}
                  value={form.tracking.expiryCriticalDays}
                  onChange={(e) =>
                    patchTracking({
                      expiryCriticalDays: Number(e.target.value) || 0,
                    })
                  }
                />
              </div>
              <div className="space-y-1.5">
                <Label>Duree de vie defaut (jours)</Label>
                <Input
                  type="number"
                  min={1}
                  value={form.tracking.defaultShelfLifeDays ?? ""}
                  onChange={(e) =>
                    patchTracking({
                      defaultShelfLifeDays: e.target.value
                        ? Number(e.target.value) || undefined
                        : undefined,
                    })
                  }
                  placeholder="Ex. 180"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Remise suggeree (%)</Label>
                <Input
                  type="number"
                  min={0}
                  max={90}
                  value={form.tracking.suggestedNearExpiryDiscountPercent ?? ""}
                  onChange={(e) =>
                    patchTracking({
                      suggestedNearExpiryDiscountPercent: e.target.value
                        ? Number(e.target.value) || undefined
                        : undefined,
                    })
                  }
                  placeholder="Ex. 15"
                />
              </div>
            </div>
          ) : null}
        </div>

        <label className="flex items-center gap-2 text-sm text-foreground">
          <input
            type="checkbox"
            checked={form.isActive}
            onChange={(event) =>
              setForm((prev) => ({ ...prev, isActive: event.target.checked }))
            }
            className="h-4 w-4 rounded border-border"
          />
          Categorie active
        </label>
        {error ? <p className="text-sm text-destructive">{error}</p> : null}
      </FormDialog>

      {dialog}
      <ToastViewport toast={toast} />
    </div>
  );
}
