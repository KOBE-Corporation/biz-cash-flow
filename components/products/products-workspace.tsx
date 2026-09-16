"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { DataTable, type DataColumn } from "@/components/crud/data-table";
import { FormDialog } from "@/components/crud/form-dialog";
import { CrudToolbar } from "@/components/crud/toolbar";
import { InsightsHighlights } from "@/components/shared/insights-highlights";
import { Badge, Chip } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PageHeader, StatCard } from "@/components/ui/page-header";
import { ToastViewport, useToast } from "@/components/ui/toast";
import { useConfirmDialog } from "@/components/ui/use-confirm-dialog";
import { useBcfRefresh } from "@/hooks/use-bcf-refresh";
import { useEntityList } from "@/hooks/use-entity-list";
import {
  formatDateInput,
  formatDisplayDate,
  getExpiryStatus,
  parseDateInput,
  suggestExpiryFromManufactured,
} from "@/lib/inventory/expiry";
import { listCategories } from "@/lib/repositories/categories";
import { getPeriodInsights } from "@/lib/repositories/insights";
import { listOffersForProduct } from "@/lib/repositories/offers";
import {
  listProducts,
  removeProduct,
  updateProduct,
} from "@/lib/repositories/products";
import { listSuppliers } from "@/lib/repositories/suppliers";
import {
  isSalePriceBelowCost,
  suggestBaseSalePrice,
  templatesToProductPrices,
} from "@/lib/sales/pricing";
import type { Product, ProductPackPrice } from "@/lib/types";
import { formatCurrency } from "@/lib/utils";

type StockFilter = "all" | "ok" | "low" | "out" | "expiring";

type ProductFormState = {
  name: string;
  sku: string;
  barcode: string;
  description: string;
  minStock: string;
  purchasePrice: string;
  salePrice: string;
  categoryId: string;
  supplierId: string;
  packLevels: ProductPackPrice[];
  isActive: boolean;
  manufacturedAt: string;
  expiresAt: string;
  batchNumber: string;
  serialNumber: string;
};

function stockTone(product: Product) {
  if (product.quantity <= 0) return "out" as const;
  if (product.quantity <= product.minStock) return "low" as const;
  return "ok" as const;
}

function parseStockFilter(raw: string | null): StockFilter {
  if (raw === "low" || raw === "out" || raw === "ok" || raw === "expiring") {
    return raw;
  }
  if (raw === "low-stock") return "low";
  return "all";
}

export function ProductsWorkspace() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { confirm, dialog } = useConfirmDialog();
  const { toast, showToast } = useToast();
  const { version, bump } = useBcfRefresh();
  const [stockFilter, setStockFilter] = useState<StockFilter>(() =>
    parseStockFilter(searchParams.get("filter")),
  );
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [supplierFilter, setSupplierFilter] = useState(
    () => searchParams.get("supplierId") ?? "all",
  );
  const [form, setForm] = useState<ProductFormState | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setStockFilter(parseStockFilter(searchParams.get("filter")));
    setSupplierFilter(searchParams.get("supplierId") ?? "all");
  }, [searchParams]);

  const applyStockFilter = (value: StockFilter) => {
    setStockFilter((prev) => {
      const next = prev === value && value !== "all" ? "all" : value;
      const params = new URLSearchParams(searchParams.toString());
      if (next === "all") params.delete("filter");
      else params.set("filter", next);
      const qs = params.toString();
      router.replace(qs ? `/produits?${qs}` : "/produits", { scroll: false });
      return next;
    });
  };

  const categories = useMemo(() => {
    void version;
    return listCategories();
  }, [version]);
  const suppliers = useMemo(() => {
    void version;
    return listSuppliers();
  }, [version]);
  const items = useMemo(() => {
    void version;
    return listProducts();
  }, [version]);

  const dayInsights = useMemo(() => {
    void version;
    return getPeriodInsights("day");
  }, [version]);

  const flagshipIds = useMemo(
    () => new Set(dayInsights.flagshipProductIds),
    [dayInsights],
  );

  const categoryName = useCallback(
    (id: string) => categories.find((c) => c.id === id)?.name ?? "—",
    [categories],
  );

  const filterFn = useCallback(
    (item: Product, query: string) => {
      if (categoryFilter !== "all" && item.categoryId !== categoryFilter) {
        return false;
      }
      if (supplierFilter !== "all" && item.supplierId !== supplierFilter) {
        return false;
      }
      if (stockFilter === "expiring") {
        const category = categories.find((c) => c.id === item.categoryId);
        const status = getExpiryStatus(item, category);
        if (status !== "soon" && status !== "critical" && status !== "expired") {
          return false;
        }
      } else {
        const tone = stockTone(item);
        if (stockFilter !== "all" && tone !== stockFilter) return false;
      }
      const q = query.trim().toLowerCase();
      if (!q) return true;
      return (
        item.name.toLowerCase().includes(q) ||
        item.sku.toLowerCase().includes(q) ||
        item.barcode.includes(q) ||
        (item.batchNumber?.toLowerCase().includes(q) ?? false)
      );
    },
    [categories, categoryFilter, stockFilter, supplierFilter],
  );

  const list = useEntityList(items, filterFn);

  const offers = useMemo(() => {
    if (!list.editing) return [];
    return listOffersForProduct(list.editing.id);
  }, [list.editing, version]);

  const lowCount = items.filter((p) => stockTone(p) === "low").length;
  const outCount = items.filter((p) => stockTone(p) === "out").length;
  const expiringCount = items.filter((p) => {
    const status = getExpiryStatus(
      p,
      categories.find((c) => c.id === p.categoryId),
    );
    return status === "soon" || status === "critical" || status === "expired";
  }).length;

  const openEdit = (item: Product) => {
    const category = categories.find((c) => c.id === item.categoryId);
    setForm({
      name: item.name,
      sku: item.sku,
      barcode: item.barcode,
      description: item.description ?? "",
      minStock: String(item.minStock),
      purchasePrice: String(item.purchasePrice),
      salePrice: String(item.salePrice),
      categoryId: item.categoryId,
      supplierId: item.supplierId ?? "",
      packLevels: templatesToProductPrices(
        category?.packLevels ?? item.packLevels,
        item.purchasePrice,
        item.packLevels,
      ),
      isActive: item.isActive,
      manufacturedAt: formatDateInput(item.manufacturedAt),
      expiresAt: formatDateInput(item.expiresAt),
      batchNumber: item.batchNumber ?? "",
      serialNumber: item.serialNumber ?? "",
    });
    setError(null);
    list.openEdit(item);
  };

  const handleSave = () => {
    if (!list.editing || !form) return;
    const salePrice = Number(form.salePrice) || 0;
    const purchasePrice = Number(form.purchasePrice) || 0;
    const packLevels = form.packLevels.map((level) =>
      level.unitsOfBase === 1 ? { ...level, salePrice } : level,
    );
    const result = updateProduct(list.editing.id, {
      name: form.name,
      sku: form.sku,
      barcode: form.barcode,
      description: form.description,
      quantity: list.editing.quantity,
      minStock: Number(form.minStock) || 0,
      purchasePrice,
      salePrice,
      categoryId: form.categoryId,
      supplierId: form.supplierId || undefined,
      packLevels,
      isActive: form.isActive,
      manufacturedAt: parseDateInput(form.manufacturedAt) ?? null,
      expiresAt: parseDateInput(form.expiresAt) ?? null,
      batchNumber: form.batchNumber.trim() || null,
      serialNumber: form.serialNumber.trim() || null,
    });
    if (!result.ok) {
      setError(result.error);
      return;
    }
    list.closeForm();
    setForm(null);
    bump();
    showToast("Produit mis a jour", "success");
  };

  const handleDelete = async (item: Product) => {
    const ok = await confirm({
      title: `Supprimer « ${item.name} » ?`,
      description: "Preferez desactiver si le produit a un historique.",
      confirmLabel: "Supprimer",
      variant: "destructive",
    });
    if (!ok) return;
    const result = removeProduct(item.id);
    if (!result.ok) {
      showToast(result.error, "error");
      return;
    }
    bump();
    showToast(`« ${item.name} » supprime`, "success");
  };

  const columns: DataColumn<Product>[] = [
    {
      key: "product",
      header: "Produit",
      cell: (row) => (
        <div className="min-w-0">
          <p className="truncate font-medium">
            {row.name}
            {flagshipIds.has(row.id) ? (
              <Badge variant="success" className="ml-1.5 align-middle">
                Phare
              </Badge>
            ) : null}
          </p>
          <p className="truncate text-xs text-muted-foreground">
            {row.sku} · {row.barcode}
          </p>
        </div>
      ),
    },
    {
      key: "category",
      header: "Categorie",
      hideOnMobile: true,
      cell: (row) => (
        <span className="text-xs text-muted-foreground">
          {categoryName(row.categoryId)}
        </span>
      ),
    },
    {
      key: "supplier",
      header: "Fournisseur",
      hideOnMobile: true,
      cell: (row) => {
        const name = suppliers.find((s) => s.id === row.supplierId)?.name;
        return (
          <span className="text-xs text-muted-foreground">
            {name ?? "—"}
          </span>
        );
      },
    },
    {
      key: "stock",
      header: "Stock",
      cell: (row) => {
        const tone = stockTone(row);
        return (
          <Badge
            variant={
              tone === "out" ? "danger" : tone === "low" ? "warning" : "success"
            }
            className="tabular-nums"
          >
            {row.quantity} {row.baseUnitName}
          </Badge>
        );
      },
    },
    {
      key: "expiry",
      header: "Peremption",
      hideOnMobile: true,
      cell: (row) => {
        const category = categories.find((c) => c.id === row.categoryId);
        if (!category?.tracking?.tracksExpiry) {
          return <span className="text-xs text-muted-foreground">—</span>;
        }
        const status = getExpiryStatus(row, category);
        if (!row.expiresAt) {
          return <Badge variant="outline">Non renseignee</Badge>;
        }
        if (row.quantity <= 0) {
          return (
            <div className="space-y-0.5">
              <p className="text-xs tabular-nums">
                {formatDisplayDate(row.expiresAt)}
              </p>
              <Badge variant="outline">Hors stock</Badge>
            </div>
          );
        }
        return (
          <div className="space-y-0.5">
            <p className="text-xs tabular-nums">
              {formatDisplayDate(row.expiresAt)}
            </p>
            {status === "expired" ? (
              <Badge variant="danger">Perime</Badge>
            ) : status === "critical" ? (
              <Badge variant="danger">Critique</Badge>
            ) : status === "soon" ? (
              <Badge variant="warning">Bientot</Badge>
            ) : status === "ok" ? (
              <Badge variant="success">OK</Badge>
            ) : (
              <Badge variant="outline">—</Badge>
            )}
          </div>
        );
      },
    },
    {
      key: "price",
      header: "Prix vente",
      cell: (row) => (
        <span className="text-xs tabular-nums">
          {formatCurrency(row.salePrice)}
        </span>
      ),
    },
    {
      key: "status",
      header: "Statut",
      hideOnMobile: true,
      cell: (row) => (
        <Badge variant={row.isActive ? "outline" : "danger"}>
          {row.isActive ? "Actif" : "Inactif"}
        </Badge>
      ),
    },
    {
      key: "actions",
      header: "",
      className: "w-[1%] text-right",
      cell: (row) => (
        <div
          className="flex justify-end gap-1"
          onClick={(e) => e.stopPropagation()}
        >
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => openEdit(row)}
          >
            <Pencil className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-destructive"
            onClick={() => void handleDelete(row)}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      ),
    },
  ];

  const cost = Number(form?.purchasePrice) || 0;
  const sale = Number(form?.salePrice) || 0;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Produits"
        description="Prix de vente decide par le vendeur. Stock en unites de base via Achats."
        actions={
          <Button
            variant="success"
            onClick={() => router.push("/achats?nouveau=1")}
          >
            <Plus className="h-4 w-4" />
            Nouveau produit
          </Button>
        }
      />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Produits"
          value={items.length}
          subtitle="Tous"
          active={stockFilter === "all"}
          onClick={() => applyStockFilter("all")}
        />
        <StatCard
          title="Stock faible"
          value={lowCount}
          variant="warning"
          subtitle="Cliquer pour filtrer"
          active={stockFilter === "low"}
          onClick={() => applyStockFilter("low")}
        />
        <StatCard
          title="Rupture"
          value={outCount}
          variant="danger"
          subtitle="Cliquer pour filtrer"
          active={stockFilter === "out"}
          onClick={() => applyStockFilter("out")}
        />
        <StatCard
          title="Peremption"
          value={expiringCount}
          variant={expiringCount > 0 ? "warning" : "success"}
          subtitle="Cliquer pour filtrer"
          active={stockFilter === "expiring"}
          onClick={() => applyStockFilter("expiring")}
        />
      </div>

      <InsightsHighlights
        insights={dayInsights}
        title="Highlights stock & ventes"
        compact
      />

      <CrudToolbar
        search={list.search}
        onSearchChange={list.setSearch}
        searchPlaceholder="Nom, SKU, code-barres ou lot…"
        filters={
          <>
            {(
              ["all", "ok", "low", "out", "expiring"] as StockFilter[]
            ).map((value) => (
              <Chip
                key={value}
                active={stockFilter === value}
                onClick={() => applyStockFilter(value)}
                className="px-2.5 py-1 text-xs"
              >
                {value === "all"
                  ? "Tous"
                  : value === "ok"
                    ? "OK"
                    : value === "low"
                      ? "Faible"
                      : value === "out"
                        ? "Rupture"
                        : "Peremption"}
              </Chip>
            ))}
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="h-9 rounded-xl border border-border bg-input px-3 text-xs text-foreground"
            >
              <option value="all">Toutes categories</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
            <select
              value={supplierFilter}
              onChange={(e) => {
                const value = e.target.value;
                setSupplierFilter(value);
                const params = new URLSearchParams(searchParams.toString());
                if (value === "all") params.delete("supplierId");
                else params.set("supplierId", value);
                const qs = params.toString();
                router.replace(qs ? `/produits?${qs}` : "/produits", {
                  scroll: false,
                });
              }}
              className="h-9 rounded-xl border border-border bg-input px-3 text-xs text-foreground"
            >
              <option value="all">Tous fournisseurs</option>
              {suppliers.map((supplier) => (
                <option key={supplier.id} value={supplier.id}>
                  {supplier.name}
                </option>
              ))}
            </select>
          </>
        }
      />

      <DataTable
        rows={list.filtered}
        columns={columns}
        rowKey={(row) => row.id}
        emptyTitle="Aucun produit"
        emptyDescription="Ajoutez un produit via un achat fournisseur."
        onRowClick={openEdit}
      />

      <FormDialog
        open={list.formOpen && !!list.editing && !!form}
        onOpenChange={(open) => {
          if (!open) {
            list.closeForm();
            setForm(null);
          }
        }}
        title="Modifier le produit"
        description={`Stock : ${list.editing?.quantity ?? 0} ${list.editing?.baseUnitName ?? ""} (via Achats)`}
        className="max-w-xl"
        footer={
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button
              variant="outline"
              onClick={() => {
                list.closeForm();
                setForm(null);
              }}
            >
              Annuler
            </Button>
            <Button variant="success" onClick={handleSave}>
              Enregistrer
            </Button>
          </div>
        }
      >
        {form ? (
          <>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5 sm:col-span-2">
                <Label>Nom</Label>
                <Input
                  value={form.name}
                  onChange={(e) =>
                    setForm((p) => p && { ...p, name: e.target.value })
                  }
                />
              </div>
              <div className="space-y-1.5">
                <Label>SKU</Label>
                <Input
                  value={form.sku}
                  onChange={(e) =>
                    setForm((p) => p && { ...p, sku: e.target.value })
                  }
                />
              </div>
              <div className="space-y-1.5">
                <Label>Code-barres</Label>
                <Input
                  value={form.barcode}
                  onChange={(e) =>
                    setForm((p) => p && { ...p, barcode: e.target.value })
                  }
                />
              </div>
              <div className="space-y-1.5">
                <Label>Categorie</Label>
                <select
                  value={form.categoryId}
                  onChange={(e) => {
                    const category = categories.find(
                      (c) => c.id === e.target.value,
                    );
                    setForm(
                      (p) =>
                        p && {
                          ...p,
                          categoryId: e.target.value,
                          packLevels: templatesToProductPrices(
                            category?.packLevels ?? p.packLevels,
                            Number(p.purchasePrice) || 0,
                            p.packLevels,
                          ),
                        },
                    );
                  }}
                  className="flex h-11 w-full rounded-xl border border-border bg-input px-4 text-sm"
                >
                  {categories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-1.5">
                <Label>Fournisseur preferentiel</Label>
                <select
                  value={form.supplierId}
                  onChange={(e) =>
                    setForm((p) => p && { ...p, supplierId: e.target.value })
                  }
                  className="flex h-11 w-full rounded-xl border border-border bg-input px-4 text-sm"
                >
                  <option value="">Aucun</option>
                  {suppliers.map((supplier) => (
                    <option key={supplier.id} value={supplier.id}>
                      {supplier.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-1.5">
                <Label>Seuil min</Label>
                <Input
                  type="number"
                  min={0}
                  value={form.minStock}
                  onChange={(e) =>
                    setForm((p) => p && { ...p, minStock: e.target.value })
                  }
                />
              </div>
              <div className="space-y-1.5">
                <Label>Cout / unite</Label>
                <Input
                  type="number"
                  min={0}
                  value={form.purchasePrice}
                  onChange={(e) =>
                    setForm((p) => p && { ...p, purchasePrice: e.target.value })
                  }
                />
              </div>
              <div className="space-y-1.5">
                <Label>Prix vente / unite</Label>
                <Input
                  type="number"
                  min={0}
                  value={form.salePrice}
                  onChange={(e) =>
                    setForm((p) => p && { ...p, salePrice: e.target.value })
                  }
                />
                <p className="text-[11px] text-muted-foreground">
                  Suggestion min : {formatCurrency(suggestBaseSalePrice(cost))}
                  {isSalePriceBelowCost(sale, cost)
                    ? " — sous le cout !"
                    : ""}
                </p>
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label>Prix par conditionnement</Label>
                <div className="space-y-2">
                  {form.packLevels.map((level, index) => (
                    <div
                      key={level.id}
                      className="grid grid-cols-[1fr_120px] gap-2"
                    >
                      <div className="flex h-11 items-center rounded-xl border border-border bg-surface-2 px-3 text-sm">
                        {level.name} ({level.unitsOfBase})
                      </div>
                      <Input
                        type="number"
                        min={0}
                        value={level.salePrice}
                        disabled={level.unitsOfBase === 1}
                        onChange={(e) => {
                          const salePrice = Number(e.target.value) || 0;
                          setForm(
                            (p) =>
                              p && {
                                ...p,
                                packLevels: p.packLevels.map((item, i) =>
                                  i === index ? { ...item, salePrice } : item,
                                ),
                              },
                          );
                        }}
                      />
                    </div>
                  ))}
                </div>
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label>Description</Label>
                <Input
                  value={form.description}
                  onChange={(e) =>
                    setForm((p) => p && { ...p, description: e.target.value })
                  }
                />
              </div>

              {(() => {
                const tracking = categories.find(
                  (c) => c.id === form.categoryId,
                )?.tracking;
                if (
                  !tracking ||
                  !(
                    tracking.tracksManufacturedAt ||
                    tracking.tracksExpiry ||
                    tracking.tracksBatchNumber ||
                    tracking.tracksSerialNumber
                  )
                ) {
                  return null;
                }
                return (
                  <div className="space-y-3 rounded-xl border border-border p-3 sm:col-span-2">
                    <div>
                      <p className="text-sm font-medium">Lot & dates</p>
                      <p className="text-xs text-muted-foreground">
                        Champs actives par la categorie. Utiles pour les alertes
                        et remises anti-perte.
                      </p>
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2">
                      {tracking.tracksManufacturedAt ? (
                        <div className="space-y-1.5">
                          <Label>Date de fabrication</Label>
                          <Input
                            type="date"
                            value={form.manufacturedAt}
                            onChange={(e) => {
                              const manufacturedAt = e.target.value;
                              setForm((p) => {
                                if (!p) return p;
                                const shelf =
                                  tracking.defaultShelfLifeDays;
                                const next = { ...p, manufacturedAt };
                                if (
                                  shelf &&
                                  manufacturedAt &&
                                  tracking.tracksExpiry &&
                                  !p.expiresAt
                                ) {
                                  const mfg = parseDateInput(manufacturedAt);
                                  if (mfg) {
                                    next.expiresAt = formatDateInput(
                                      suggestExpiryFromManufactured(mfg, shelf),
                                    );
                                  }
                                }
                                return next;
                              });
                            }}
                          />
                        </div>
                      ) : null}
                      {tracking.tracksExpiry ? (
                        <div className="space-y-1.5">
                          <Label>Date de peremption</Label>
                          <Input
                            type="date"
                            value={form.expiresAt}
                            onChange={(e) =>
                              setForm(
                                (p) =>
                                  p && { ...p, expiresAt: e.target.value },
                              )
                            }
                          />
                        </div>
                      ) : null}
                      {tracking.tracksBatchNumber ? (
                        <div className="space-y-1.5">
                          <Label>Numero de lot</Label>
                          <Input
                            value={form.batchNumber}
                            onChange={(e) =>
                              setForm(
                                (p) =>
                                  p && { ...p, batchNumber: e.target.value },
                              )
                            }
                            placeholder="LOT-…"
                          />
                        </div>
                      ) : null}
                      {tracking.tracksSerialNumber ? (
                        <div className="space-y-1.5">
                          <Label>Numero de serie</Label>
                          <Input
                            value={form.serialNumber}
                            onChange={(e) =>
                              setForm(
                                (p) =>
                                  p && { ...p, serialNumber: e.target.value },
                              )
                            }
                          />
                        </div>
                      ) : null}
                    </div>
                  </div>
                );
              })()}
            </div>

            {offers.length > 0 ? (
              <div className="space-y-2 rounded-xl border border-border p-3">
                <p className="text-sm font-medium">Offres fournisseurs</p>
                <ul className="space-y-1.5 text-xs">
                  {offers.map((offer) => (
                    <li
                      key={offer.id}
                      className="flex justify-between gap-2 rounded-lg bg-surface-2 px-2 py-1.5"
                    >
                      <span>
                        {offer.supplierName} · {offer.purchasePackName}
                      </span>
                      <span className="tabular-nums text-muted-foreground">
                        {formatCurrency(offer.costPerBaseUnit)} / u.
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}

            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={form.isActive}
                onChange={(e) =>
                  setForm((p) => p && { ...p, isActive: e.target.checked })
                }
                className="h-4 w-4 rounded border-border"
              />
              Produit actif
            </label>
            {error ? <p className="text-sm text-destructive">{error}</p> : null}
          </>
        ) : null}
      </FormDialog>

      {dialog}
      <ToastViewport toast={toast} />
    </div>
  );
}
