"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Check, Plus, Trash2, X } from "lucide-react";
import { DataTable, type DataColumn } from "@/components/crud/data-table";
import { FormDialog } from "@/components/crud/form-dialog";
import { CrudToolbar } from "@/components/crud/toolbar";
import { PackLevelsEditor } from "@/components/shared/pack-levels-editor";
import { Badge, Chip } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PageHeader, StatCard } from "@/components/ui/page-header";
import { ToastViewport, useToast } from "@/components/ui/toast";
import { useConfirmDialog } from "@/components/ui/use-confirm-dialog";
import { useEntityList } from "@/hooks/use-entity-list";
import {
  createCategory,
  listCategories,
} from "@/lib/repositories/categories";
import {
  createPurchase,
  listPurchases,
  setPurchaseStatus,
  updatePurchase,
} from "@/lib/repositories/purchases";
import { createProduct, listProducts } from "@/lib/repositories/products";
import { listSuppliers } from "@/lib/repositories/suppliers";
import {
  costPerBaseUnit,
  createPackLevelId,
  isSalePriceBelowCost,
  suggestBaseSalePrice,
  templatesToProductPrices,
} from "@/lib/sales/pricing";
import type {
  PackLevelTemplate,
  ProductPackPrice,
  Purchase,
  PurchaseStatus,
} from "@/lib/types";
import { formatCurrency } from "@/lib/utils";

type LineDraft = {
  key: string;
  productId: string;
  quantity: string;
  unitPrice: string;
  purchasePackName: string;
  unitsPerPurchasePack: string;
};

type NewProductForm = {
  name: string;
  sku: string;
  barcode: string;
  categoryId: string;
  packPurchasePrice: string;
  unitsPerPurchasePack: string;
  purchasePackName: string;
  salePrice: string;
  minStock: string;
  description: string;
};

const statusLabels: Record<PurchaseStatus, string> = {
  PENDING: "En attente",
  RECEIVED: "Recu",
  CANCELLED: "Annule",
};

function newLine(
  productId = "",
  unitPrice = "0",
  packName = "piece",
  units = "1",
): LineDraft {
  return {
    key: Math.random().toString(36).slice(2),
    productId,
    quantity: "1",
    unitPrice,
    purchasePackName: packName,
    unitsPerPurchasePack: units,
  };
}

function defaultCategoryPacks(base: string): PackLevelTemplate[] {
  return [{ id: createPackLevelId(), name: base || "unite", unitsOfBase: 1 }];
}

export function PurchasesWorkspace() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { confirm, dialog } = useConfirmDialog();
  const { toast, showToast } = useToast();
  const [version, setVersion] = useState(0);
  const [statusFilter, setStatusFilter] = useState<PurchaseStatus | "all">("all");
  const [formOpen, setFormOpen] = useState(false);
  const [productFormOpen, setProductFormOpen] = useState(false);
  const [categoryInlineOpen, setCategoryInlineOpen] = useState(false);
  const [detail, setDetail] = useState<Purchase | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [productError, setProductError] = useState<string | null>(null);
  const [categoryError, setCategoryError] = useState<string | null>(null);
  const [supplierId, setSupplierId] = useState("");
  const [notes, setNotes] = useState("");
  const [lines, setLines] = useState<LineDraft[]>([newLine()]);
  const [newProduct, setNewProduct] = useState<NewProductForm>({
    name: "",
    sku: "",
    barcode: "",
    categoryId: "",
    packPurchasePrice: "0",
    unitsPerPurchasePack: "1",
    purchasePackName: "piece",
    salePrice: "0",
    minStock: "0",
    description: "",
  });
  const [inlineCategory, setInlineCategory] = useState({
    name: "",
    baseUnitName: "piece",
    packLevels: defaultCategoryPacks("piece"),
  });

  const suppliers = useMemo(() => listSuppliers().filter((s) => s.isActive), [version]);
  const categories = useMemo(() => listCategories().filter((c) => c.isActive), [version]);
  const products = useMemo(() => listProducts().filter((p) => p.isActive), [version]);
  const items = useMemo(() => {
    void version;
    return listPurchases();
  }, [version]);

  const selectedCategory = categories.find((c) => c.id === newProduct.categoryId);

  const suggestedCost = useMemo(() => {
    return costPerBaseUnit(
      Number(newProduct.packPurchasePrice) || 0,
      Number(newProduct.unitsPerPurchasePack) || 1,
    );
  }, [newProduct.packPurchasePrice, newProduct.unitsPerPurchasePack]);

  const suggestedSale = useMemo(
    () => suggestBaseSalePrice(suggestedCost),
    [suggestedCost],
  );

  const filterFn = useCallback(
    (item: Purchase, query: string) => {
      if (statusFilter !== "all" && item.status !== statusFilter) return false;
      const q = query.trim().toLowerCase();
      if (!q) return true;
      return (
        item.reference.toLowerCase().includes(q) ||
        (item.supplierName?.toLowerCase().includes(q) ?? false)
      );
    },
    [statusFilter],
  );

  const list = useEntityList(items, filterFn);

  const resetNewProduct = useCallback(
    (categoryId?: string) => {
      const category =
        categories.find((c) => c.id === categoryId) ?? categories[0];
      const largest =
        category?.packLevels
          .slice()
          .sort((a, b) => b.unitsOfBase - a.unitsOfBase)[0] ?? null;
      setNewProduct({
        name: "",
        sku: "",
        barcode: "",
        categoryId: category?.id ?? "",
        packPurchasePrice: "0",
        unitsPerPurchasePack: String(largest?.unitsOfBase ?? 1),
        purchasePackName: largest?.name ?? category?.baseUnitName ?? "piece",
        salePrice: "0",
        minStock: "0",
        description: "",
      });
      setProductError(null);
    },
    [categories],
  );

  const openCreate = useCallback(
    (opts?: { openProductForm?: boolean }) => {
      const firstProduct = products[0];
      setEditingId(null);
      setSupplierId("");
      setNotes("");
      setLines([
        firstProduct
          ? newLine(
              firstProduct.id,
              String(
                firstProduct.purchasePrice *
                  (firstProduct.packLevels.at(-1)?.unitsOfBase ?? 1),
              ),
              firstProduct.packLevels.at(-1)?.name ?? firstProduct.baseUnitName,
              String(firstProduct.packLevels.at(-1)?.unitsOfBase ?? 1),
            )
          : newLine("", "0"),
      ]);
      setError(null);
      setFormOpen(true);
      if (opts?.openProductForm) {
        resetNewProduct();
        setProductFormOpen(true);
      }
    },
    [products, resetNewProduct],
  );

  useEffect(() => {
    if (searchParams.get("nouveau") !== "1") return;
    openCreate({ openProductForm: true });
    router.replace("/achats", { scroll: false });
  }, [openCreate, router, searchParams]);

  const openEdit = (purchase: Purchase) => {
    if (purchase.status !== "PENDING") {
      setDetail(purchase);
      return;
    }
    setEditingId(purchase.id);
    setSupplierId(purchase.supplierId ?? "");
    setNotes(purchase.notes ?? "");
    setLines(
      purchase.items.map((item) => ({
        key: item.id,
        productId: item.productId,
        quantity: String(item.quantity),
        unitPrice: String(item.unitPrice),
        purchasePackName: item.purchasePackName,
        unitsPerPurchasePack: String(item.unitsPerPurchasePack),
      })),
    );
    setError(null);
    setFormOpen(true);
  };

  const handleCreateInlineCategory = () => {
    const result = createCategory({
      name: inlineCategory.name,
      baseUnitName: inlineCategory.baseUnitName,
      packLevels: inlineCategory.packLevels,
      isActive: true,
    });
    if (!result.ok) {
      setCategoryError(result.error);
      showToast(result.error, "error");
      return;
    }
    setVersion((v) => v + 1);
    setNewProduct((p) => ({ ...p, categoryId: result.data.id }));
    setCategoryInlineOpen(false);
    setCategoryError(null);
    showToast(`Categorie « ${result.data.name} » creee`, "success");
  };

  const handleCreateProduct = () => {
    if (!newProduct.categoryId) {
      setProductError("Creez ou choisissez une categorie avant le produit");
      return;
    }
    const category = categories.find((c) => c.id === newProduct.categoryId);
    if (!category) {
      setProductError("Categorie introuvable");
      return;
    }

    const units = Math.max(1, Number(newProduct.unitsPerPurchasePack) || 1);
    const packPrice = Number(newProduct.packPurchasePrice) || 0;
    const cost = costPerBaseUnit(packPrice, units);
    const sale =
      Number(newProduct.salePrice) || suggestBaseSalePrice(cost) || 0;
    const packLevels: ProductPackPrice[] = templatesToProductPrices(
      category.packLevels,
      cost,
    ).map((level) =>
      level.unitsOfBase === 1 ? { ...level, salePrice: sale } : level,
    );

    const result = createProduct({
      name: newProduct.name,
      sku: newProduct.sku,
      barcode: newProduct.barcode || undefined,
      description: newProduct.description,
      quantity: 0,
      minStock: Number(newProduct.minStock) || 0,
      purchasePrice: cost,
      salePrice: sale,
      categoryId: newProduct.categoryId,
      supplierId: supplierId || undefined,
      packLevels,
      isActive: true,
    });

    if (!result.ok) {
      setProductError(result.error);
      showToast(result.error, "error");
      return;
    }

    const product = result.data;
    setVersion((v) => v + 1);
    setLines((prev) => {
      const emptyIndex = prev.findIndex((line) => !line.productId);
      const draft = newLine(
        product.id,
        String(packPrice),
        newProduct.purchasePackName || product.baseUnitName,
        String(units),
      );
      if (emptyIndex >= 0) {
        return prev.map((line, index) =>
          index === emptyIndex ? { ...draft, key: line.key } : line,
        );
      }
      return [...prev, draft];
    });
    setProductFormOpen(false);
    showToast(
      `Produit « ${product.name} » cree (CB ${product.barcode})`,
      "success",
    );
  };

  const handleSave = () => {
    if (lines.some((line) => !line.productId)) {
      setError("Selectionnez ou creez un produit pour chaque ligne");
      return;
    }

    const payload = {
      supplierId: supplierId || undefined,
      notes,
      items: lines.map((line) => ({
        productId: line.productId,
        quantity: Number(line.quantity) || 0,
        unitPrice: Number(line.unitPrice) || 0,
        purchasePackName: line.purchasePackName,
        unitsPerPurchasePack: Number(line.unitsPerPurchasePack) || 1,
      })),
    };
    const result = editingId
      ? updatePurchase(editingId, payload)
      : createPurchase(payload);
    if (!result.ok) {
      setError(result.error);
      showToast(result.error, "error");
      return;
    }
    setFormOpen(false);
    setVersion((v) => v + 1);
    showToast(editingId ? "Achat mis a jour" : "Achat enregistre", "success");
  };

  const receive = async (purchase: Purchase) => {
    const ok = await confirm({
      title: "Recevoir cet achat ?",
      description:
        "Le stock (en unites de base) sera augmente et l'offre fournisseur mise a jour.",
      confirmLabel: "Recevoir",
      variant: "default",
    });
    if (!ok) return;
    const result = setPurchaseStatus(purchase.id, "RECEIVED");
    if (!result.ok) {
      showToast(result.error, "error");
      return;
    }
    setDetail(null);
    setVersion((v) => v + 1);
    showToast("Achat recu — stock mis a jour", "success");
  };

  const cancel = async (purchase: Purchase) => {
    const ok = await confirm({
      title: "Annuler cet achat ?",
      confirmLabel: "Annuler l'achat",
      variant: "destructive",
    });
    if (!ok) return;
    const result = setPurchaseStatus(purchase.id, "CANCELLED");
    if (!result.ok) {
      showToast(result.error, "error");
      return;
    }
    setDetail(null);
    setVersion((v) => v + 1);
    showToast("Achat annule", "success");
  };

  const columns: DataColumn<Purchase>[] = [
    {
      key: "ref",
      header: "Reference",
      cell: (row) => (
        <span className="font-medium tabular-nums">{row.reference}</span>
      ),
    },
    {
      key: "supplier",
      header: "Fournisseur",
      cell: (row) => row.supplierName || "—",
    },
    {
      key: "total",
      header: "Total",
      cell: (row) => (
        <span className="tabular-nums">{formatCurrency(row.totalAmount)}</span>
      ),
    },
    {
      key: "status",
      header: "Statut",
      cell: (row) => (
        <Badge
          variant={
            row.status === "RECEIVED"
              ? "success"
              : row.status === "CANCELLED"
                ? "danger"
                : "warning"
          }
        >
          {statusLabels[row.status]}
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
          {row.status === "PENDING" ? (
            <Button
              size="sm"
              className="h-8 bg-success text-success-foreground hover:bg-success/90"
              onClick={() => void receive(row)}
            >
              <Check className="h-3.5 w-3.5" />
              Recevoir
            </Button>
          ) : null}
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Achats"
        description="Fournisseur optionnel. Categorie obligatoire avant nouveau produit. Stock a la reception."
        actions={
          <Button variant="success" onClick={() => openCreate()}>
            <Plus className="h-4 w-4" />
            Nouvel achat
          </Button>
        }
      />

      <div className="grid gap-3 sm:grid-cols-3">
        <StatCard title="Achats" value={items.length} />
        <StatCard
          title="En attente"
          value={items.filter((p) => p.status === "PENDING").length}
          variant="warning"
        />
        <StatCard
          title="Recus"
          value={items.filter((p) => p.status === "RECEIVED").length}
          variant="success"
        />
      </div>

      <CrudToolbar
        search={list.search}
        onSearchChange={list.setSearch}
        searchPlaceholder="Reference ou fournisseur…"
        filters={
          <>
            {(["all", "PENDING", "RECEIVED", "CANCELLED"] as const).map(
              (value) => (
                <Chip
                  key={value}
                  active={statusFilter === value}
                  onClick={() => setStatusFilter(value)}
                  className="px-2.5 py-1 text-xs"
                >
                  {value === "all" ? "Tous" : statusLabels[value]}
                </Chip>
              ),
            )}
          </>
        }
      />

      <DataTable
        rows={list.filtered}
        columns={columns}
        rowKey={(row) => row.id}
        emptyTitle="Aucun achat"
        onRowClick={openEdit}
      />

      <FormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        title={editingId ? "Modifier l'achat" : "Nouvel achat"}
        description="Fournisseur facultatif. Creez le produit apres la categorie."
        className="max-w-2xl"
        footer={
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button variant="outline" onClick={() => setFormOpen(false)}>
              Annuler
            </Button>
            <Button variant="success" onClick={handleSave}>
              Enregistrer
            </Button>
          </div>
        }
      >
        <div className="space-y-1.5">
          <Label>Fournisseur (optionnel)</Label>
          <select
            value={supplierId}
            onChange={(e) => setSupplierId(e.target.value)}
            className="flex h-11 w-full rounded-xl border border-border bg-input px-4 text-sm"
          >
            <option value="">— Aucun —</option>
            {suppliers.map((supplier) => (
              <option key={supplier.id} value={supplier.id}>
                {supplier.name}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <Label>Lignes</Label>
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                size="sm"
                variant="success"
                onClick={() => {
                  resetNewProduct();
                  setProductFormOpen(true);
                }}
              >
                <Plus className="h-3.5 w-3.5" />
                Nouveau produit
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() =>
                  setLines((prev) => [
                    ...prev,
                    products[0]
                      ? newLine(
                          products[0].id,
                          String(products[0].purchasePrice),
                          products[0].baseUnitName,
                          "1",
                        )
                      : newLine("", "0"),
                  ])
                }
              >
                <Plus className="h-3.5 w-3.5" />
                Ligne
              </Button>
            </div>
          </div>
          {lines.map((line, index) => {
            const product = products.find((p) => p.id === line.productId);
            return (
              <div
                key={line.key}
                className="space-y-2 rounded-xl bg-surface-2 p-2"
              >
                <div className="grid gap-2 sm:grid-cols-[1fr_36px]">
                  <select
                    value={line.productId}
                    onChange={(e) => {
                      const next = products.find((p) => p.id === e.target.value);
                      const pack = next?.packLevels.at(-1);
                      setLines((prev) =>
                        prev.map((item, i) =>
                          i === index
                            ? {
                                ...item,
                                productId: e.target.value,
                                unitPrice: String(
                                  (next?.purchasePrice ?? 0) *
                                    (pack?.unitsOfBase ?? 1),
                                ),
                                purchasePackName:
                                  pack?.name ?? next?.baseUnitName ?? "piece",
                                unitsPerPurchasePack: String(
                                  pack?.unitsOfBase ?? 1,
                                ),
                              }
                            : item,
                        ),
                      );
                    }}
                    className="h-10 rounded-lg border border-border bg-input px-2 text-xs"
                  >
                    <option value="">Choisir un produit…</option>
                    {products.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-10 w-9 text-destructive"
                    disabled={lines.length <= 1}
                    onClick={() =>
                      setLines((prev) => prev.filter((_, i) => i !== index))
                    }
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                  <div className="space-y-1">
                    <p className="text-[10px] text-muted-foreground">Lot</p>
                    <select
                      value={line.purchasePackName}
                      onChange={(e) => {
                        const pack = product?.packLevels.find(
                          (l) => l.name === e.target.value,
                        );
                        setLines((prev) =>
                          prev.map((item, i) =>
                            i === index
                              ? {
                                  ...item,
                                  purchasePackName: e.target.value,
                                  unitsPerPurchasePack: String(
                                    pack?.unitsOfBase ??
                                      (Number(item.unitsPerPurchasePack) || 1),
                                  ),
                                  unitPrice: String(
                                    (product?.purchasePrice ?? 0) *
                                      (pack?.unitsOfBase ?? 1),
                                  ),
                                }
                              : item,
                          ),
                        );
                      }}
                      className="h-10 w-full rounded-lg border border-border bg-input px-2 text-xs"
                    >
                      {(product?.packLevels ?? [{ name: line.purchasePackName, unitsOfBase: Number(line.unitsPerPurchasePack) || 1 }]).map(
                        (pack) => (
                          <option key={pack.name} value={pack.name}>
                            {pack.name} ({pack.unitsOfBase})
                          </option>
                        ),
                      )}
                    </select>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[10px] text-muted-foreground">Qte lots</p>
                    <Input
                      type="number"
                      min={1}
                      value={line.quantity}
                      className="h-10"
                      onChange={(e) =>
                        setLines((prev) =>
                          prev.map((item, i) =>
                            i === index
                              ? { ...item, quantity: e.target.value }
                              : item,
                          ),
                        )
                      }
                    />
                  </div>
                  <div className="space-y-1">
                    <p className="text-[10px] text-muted-foreground">
                      Prix / lot
                    </p>
                    <Input
                      type="number"
                      min={0}
                      value={line.unitPrice}
                      className="h-10"
                      onChange={(e) =>
                        setLines((prev) =>
                          prev.map((item, i) =>
                            i === index
                              ? { ...item, unitPrice: e.target.value }
                              : item,
                          ),
                        )
                      }
                    />
                  </div>
                  <div className="space-y-1">
                    <p className="text-[10px] text-muted-foreground">
                      Unites / lot
                    </p>
                    <Input
                      type="number"
                      min={1}
                      value={line.unitsPerPurchasePack}
                      className="h-10"
                      onChange={(e) =>
                        setLines((prev) =>
                          prev.map((item, i) =>
                            i === index
                              ? {
                                  ...item,
                                  unitsPerPurchasePack: e.target.value,
                                }
                              : item,
                          ),
                        )
                      }
                    />
                  </div>
                </div>
                {product ? (
                  <p className="text-[11px] text-muted-foreground">
                    Cout / {product.baseUnitName} :{" "}
                    {formatCurrency(
                      costPerBaseUnit(
                        Number(line.unitPrice) || 0,
                        Number(line.unitsPerPurchasePack) || 1,
                      ),
                    )}
                  </p>
                ) : null}
              </div>
            );
          })}
        </div>

        <div className="space-y-1.5">
          <Label>Notes</Label>
          <Input value={notes} onChange={(e) => setNotes(e.target.value)} />
        </div>
        {error ? <p className="text-sm text-destructive">{error}</p> : null}
      </FormDialog>

      <FormDialog
        open={productFormOpen}
        onOpenChange={setProductFormOpen}
        title="Nouveau produit"
        description="Categorie obligatoire. Prix vente decide par vous — suggestion = cout unitaire."
        className="max-w-lg"
        footer={
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button variant="outline" onClick={() => setProductFormOpen(false)}>
              Annuler
            </Button>
            <Button variant="success" onClick={handleCreateProduct}>
              Creer et ajouter
            </Button>
          </div>
        }
      >
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5 sm:col-span-2">
            <Label>Nom</Label>
            <Input
              value={newProduct.name}
              onChange={(e) =>
                setNewProduct((p) => ({ ...p, name: e.target.value }))
              }
            />
          </div>
          <div className="space-y-1.5">
            <Label>SKU</Label>
            <Input
              value={newProduct.sku}
              onChange={(e) =>
                setNewProduct((p) => ({ ...p, sku: e.target.value }))
              }
            />
          </div>
          <div className="space-y-1.5">
            <Label>Code-barres</Label>
            <Input
              value={newProduct.barcode}
              placeholder="Auto si vide"
              onChange={(e) =>
                setNewProduct((p) => ({ ...p, barcode: e.target.value }))
              }
            />
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <div className="flex items-center justify-between gap-2">
              <Label>Categorie</Label>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => {
                  setInlineCategory({
                    name: "",
                    baseUnitName: "piece",
                    packLevels: defaultCategoryPacks("piece"),
                  });
                  setCategoryError(null);
                  setCategoryInlineOpen(true);
                }}
              >
                <Plus className="h-3.5 w-3.5" />
                Nouvelle
              </Button>
            </div>
            <select
              value={newProduct.categoryId}
              onChange={(e) => {
                const category = categories.find((c) => c.id === e.target.value);
                const largest = category?.packLevels
                  .slice()
                  .sort((a, b) => b.unitsOfBase - a.unitsOfBase)[0];
                setNewProduct((p) => ({
                  ...p,
                  categoryId: e.target.value,
                  purchasePackName:
                    largest?.name ?? category?.baseUnitName ?? p.purchasePackName,
                  unitsPerPurchasePack: String(largest?.unitsOfBase ?? 1),
                }));
              }}
              className="flex h-11 w-full rounded-xl border border-border bg-input px-4 text-sm"
            >
              <option value="">Choisir…</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
            {selectedCategory ? (
              <p className="text-xs text-muted-foreground">
                Base : {selectedCategory.baseUnitName} · Niveaux :{" "}
                {selectedCategory.packLevels.map((l) => l.name).join(", ")}
              </p>
            ) : (
              <p className="text-xs text-warning">
                Une categorie est requise avant l&apos;achat d&apos;un produit.
              </p>
            )}
          </div>
          <div className="space-y-1.5">
            <Label>Lot achete</Label>
            <select
              value={newProduct.purchasePackName}
              onChange={(e) => {
                const pack = selectedCategory?.packLevels.find(
                  (l) => l.name === e.target.value,
                );
                setNewProduct((p) => ({
                  ...p,
                  purchasePackName: e.target.value,
                  unitsPerPurchasePack: String(pack?.unitsOfBase ?? 1),
                }));
              }}
              className="flex h-11 w-full rounded-xl border border-border bg-input px-4 text-sm"
              disabled={!selectedCategory}
            >
              {(selectedCategory?.packLevels ?? []).map((pack) => (
                <option key={pack.id} value={pack.name}>
                  {pack.name} ({pack.unitsOfBase})
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1.5">
            <Label>Prix du lot</Label>
            <Input
              type="number"
              min={0}
              value={newProduct.packPurchasePrice}
              onChange={(e) => {
                const packPurchasePrice = e.target.value;
                const cost = costPerBaseUnit(
                  Number(packPurchasePrice) || 0,
                  Number(newProduct.unitsPerPurchasePack) || 1,
                );
                setNewProduct((p) => ({
                  ...p,
                  packPurchasePrice,
                  salePrice: String(suggestBaseSalePrice(cost) || 0),
                }));
              }}
            />
          </div>
          <div className="space-y-1.5">
            <Label>
              Prix vente / {selectedCategory?.baseUnitName || "unite"}
            </Label>
            <Input
              type="number"
              min={0}
              value={newProduct.salePrice}
              onChange={(e) =>
                setNewProduct((p) => ({ ...p, salePrice: e.target.value }))
              }
            />
            <p className="text-[11px] text-muted-foreground">
              Cout unitaire : {formatCurrency(suggestedCost)} · Suggestion :{" "}
              {formatCurrency(suggestedSale)}
              {isSalePriceBelowCost(
                Number(newProduct.salePrice) || 0,
                suggestedCost,
              )
                ? " — sous le cout !"
                : ""}
            </p>
          </div>
          <div className="space-y-1.5">
            <Label>Seuil min (unites)</Label>
            <Input
              type="number"
              min={0}
              value={newProduct.minStock}
              onChange={(e) =>
                setNewProduct((p) => ({ ...p, minStock: e.target.value }))
              }
            />
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label>Description</Label>
            <Input
              value={newProduct.description}
              onChange={(e) =>
                setNewProduct((p) => ({ ...p, description: e.target.value }))
              }
            />
          </div>
        </div>
        {productError ? (
          <p className="text-sm text-destructive">{productError}</p>
        ) : null}
      </FormDialog>

      <FormDialog
        open={categoryInlineOpen}
        onOpenChange={setCategoryInlineOpen}
        title="Nouvelle categorie"
        description="Definissez les conditionnements (paquet/cartouche, bouteille/casier…)."
        className="max-w-lg"
        footer={
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button
              variant="outline"
              onClick={() => setCategoryInlineOpen(false)}
            >
              Annuler
            </Button>
            <Button variant="success" onClick={handleCreateInlineCategory}>
              Creer
            </Button>
          </div>
        }
      >
        <div className="space-y-1.5">
          <Label>Nom</Label>
          <Input
            value={inlineCategory.name}
            onChange={(e) =>
              setInlineCategory((p) => ({ ...p, name: e.target.value }))
            }
            placeholder="Ex. Bieres"
          />
        </div>
        <div className="space-y-1.5">
          <Label>Unite de base</Label>
          <Input
            value={inlineCategory.baseUnitName}
            onChange={(e) => {
              const baseUnitName = e.target.value;
              setInlineCategory((p) => ({
                ...p,
                baseUnitName,
                packLevels: p.packLevels.map((level) =>
                  level.unitsOfBase === 1
                    ? { ...level, name: baseUnitName || "unite" }
                    : level,
                ),
              }));
            }}
            placeholder="bouteille, paquet…"
          />
        </div>
        <PackLevelsEditor
          baseUnitName={inlineCategory.baseUnitName}
          levels={inlineCategory.packLevels}
          onChange={(packLevels) =>
            setInlineCategory((p) => ({ ...p, packLevels }))
          }
        />
        {categoryError ? (
          <p className="text-sm text-destructive">{categoryError}</p>
        ) : null}
      </FormDialog>

      <FormDialog
        open={!!detail}
        onOpenChange={(open) => !open && setDetail(null)}
        title={detail ? detail.reference : "Achat"}
        description={detail?.supplierName || "Sans fournisseur"}
        className="max-w-lg"
        footer={
          detail?.status === "PENDING" ? (
            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <Button
                variant="outline"
                onClick={() => detail && void cancel(detail)}
              >
                <X className="h-4 w-4" />
                Annuler l&apos;achat
              </Button>
              <Button
                className="bg-success text-success-foreground hover:bg-success/90"
                onClick={() => detail && void receive(detail)}
              >
                <Check className="h-4 w-4" />
                Recevoir
              </Button>
            </div>
          ) : undefined
        }
      >
        {detail ? (
          <div className="space-y-3 text-sm">
            <Badge
              variant={
                detail.status === "RECEIVED"
                  ? "success"
                  : detail.status === "CANCELLED"
                    ? "danger"
                    : "warning"
              }
            >
              {statusLabels[detail.status]}
            </Badge>
            <div className="space-y-2">
              {detail.items.map((item) => (
                <div
                  key={item.id}
                  className="flex justify-between gap-3 rounded-xl bg-surface-2 px-3 py-2"
                >
                  <div className="min-w-0">
                    <p className="truncate font-medium">{item.productName}</p>
                    <p className="text-xs text-muted-foreground">
                      {item.quantity} × {item.purchasePackName} (
                      {item.unitsPerPurchasePack} u.) ·{" "}
                      {formatCurrency(item.unitPrice)}
                    </p>
                  </div>
                  <p className="tabular-nums">
                    {formatCurrency(item.quantity * item.unitPrice)}
                  </p>
                </div>
              ))}
            </div>
            <div className="flex justify-between font-semibold">
              <span>Total</span>
              <span className="tabular-nums">
                {formatCurrency(detail.totalAmount)}
              </span>
            </div>
          </div>
        ) : null}
      </FormDialog>

      {dialog}
      <ToastViewport toast={toast} />
    </div>
  );
}
