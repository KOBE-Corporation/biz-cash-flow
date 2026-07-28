"use client";

import { useCallback, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { DataTable, type DataColumn } from "@/components/crud/data-table";
import { FormDialog } from "@/components/crud/form-dialog";
import { CrudToolbar } from "@/components/crud/toolbar";
import { Badge, Chip } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PageHeader, StatCard } from "@/components/ui/page-header";
import { ToastViewport, useToast } from "@/components/ui/toast";
import { useConfirmDialog } from "@/components/ui/use-confirm-dialog";
import { useEntityList } from "@/hooks/use-entity-list";
import { listCategories } from "@/lib/repositories/categories";
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

type StockFilter = "all" | "ok" | "low" | "out";

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
};

function stockTone(product: Product) {
  if (product.quantity <= 0) return "out" as const;
  if (product.quantity <= product.minStock) return "low" as const;
  return "ok" as const;
}

export function ProductsWorkspace() {
  const router = useRouter();
  const { confirm, dialog } = useConfirmDialog();
  const { toast, showToast } = useToast();
  const [version, setVersion] = useState(0);
  const [stockFilter, setStockFilter] = useState<StockFilter>("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [form, setForm] = useState<ProductFormState | null>(null);
  const [error, setError] = useState<string | null>(null);

  const categories = useMemo(() => listCategories(), [version]);
  const suppliers = useMemo(() => listSuppliers(), [version]);
  const items = useMemo(() => {
    void version;
    return listProducts();
  }, [version]);

  const categoryName = useCallback(
    (id: string) => categories.find((c) => c.id === id)?.name ?? "—",
    [categories],
  );

  const filterFn = useCallback(
    (item: Product, query: string) => {
      if (categoryFilter !== "all" && item.categoryId !== categoryFilter) {
        return false;
      }
      const tone = stockTone(item);
      if (stockFilter !== "all" && tone !== stockFilter) return false;
      const q = query.trim().toLowerCase();
      if (!q) return true;
      return (
        item.name.toLowerCase().includes(q) ||
        item.sku.toLowerCase().includes(q) ||
        item.barcode.includes(q)
      );
    },
    [categoryFilter, stockFilter],
  );

  const list = useEntityList(items, filterFn);

  const offers = useMemo(() => {
    if (!list.editing) return [];
    return listOffersForProduct(list.editing.id);
  }, [list.editing, version]);

  const lowCount = items.filter((p) => stockTone(p) === "low").length;
  const outCount = items.filter((p) => stockTone(p) === "out").length;

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
    });
    if (!result.ok) {
      setError(result.error);
      return;
    }
    list.closeForm();
    setForm(null);
    setVersion((v) => v + 1);
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
    setVersion((v) => v + 1);
    showToast(`« ${item.name} » supprime`, "success");
  };

  const columns: DataColumn<Product>[] = [
    {
      key: "product",
      header: "Produit",
      cell: (row) => (
        <div className="min-w-0">
          <p className="truncate font-medium">{row.name}</p>
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

      <div className="grid gap-3 sm:grid-cols-3">
        <StatCard title="Produits" value={items.length} />
        <StatCard title="Stock faible" value={lowCount} variant="warning" />
        <StatCard title="Rupture" value={outCount} variant="danger" />
      </div>

      <CrudToolbar
        search={list.search}
        onSearchChange={list.setSearch}
        searchPlaceholder="Nom, SKU ou code-barres…"
        filters={
          <>
            {(["all", "ok", "low", "out"] as StockFilter[]).map((value) => (
              <Chip
                key={value}
                active={stockFilter === value}
                onClick={() => setStockFilter(value)}
                className="px-2.5 py-1 text-xs"
              >
                {value === "all"
                  ? "Tous"
                  : value === "ok"
                    ? "OK"
                    : value === "low"
                      ? "Faible"
                      : "Rupture"}
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
