"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Check, Plus, Trash2, X } from "lucide-react";
import { ProductSearchSelect } from "@/components/purchases/product-search-select";
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
  categoryNeedsLotFields,
  DEFAULT_CATEGORY_TRACKING,
  formatDateInput,
  normalizeCategoryTracking,
  parseDateInput,
  suggestExpiryFromManufactured,
} from "@/lib/inventory/expiry";
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
  CategoryTracking,
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
  manufacturedAt: string;
  expiresAt: string;
  batchNumber: string;
  serialNumber: string;
};

type NewProductForm = {
  name: string;
  sku: string;
  barcode: string;
  categoryId: string;
  packPurchasePrice: string;
  unitsPerPurchasePack: string;
  purchasePackName: string;
  /** Prix de vente de l'unite de base (saisi manuellement). */
  salePrice: string;
  /** Prix de vente du lot achete (ex. casier / carton). */
  packSalePrice: string;
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
    manufacturedAt: "",
    expiresAt: "",
    batchNumber: "",
    serialNumber: "",
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
    salePrice: "",
    packSalePrice: "",
    minStock: "0",
    description: "",
  });
  const [inlineCategory, setInlineCategory] = useState<{
    name: string;
    baseUnitName: string;
    packLevels: PackLevelTemplate[];
    tracking: CategoryTracking;
  }>({
    name: "",
    baseUnitName: "piece",
    packLevels: defaultCategoryPacks("piece"),
    tracking: { ...DEFAULT_CATEGORY_TRACKING },
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

  const minSaleHint = useMemo(
    () => suggestBaseSalePrice(suggestedCost),
    [suggestedCost],
  );

  const unitSale = Number(newProduct.salePrice) || 0;
  const packSale = Number(newProduct.packSalePrice) || 0;
  const unitsInLot = Math.max(1, Number(newProduct.unitsPerPurchasePack) || 1);
  const packCost = Number(newProduct.packPurchasePrice) || 0;
  const potentialGainUnit = unitSale - suggestedCost;
  const potentialGainPack = packSale - packCost;

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
        salePrice: "",
        packSalePrice: "",
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
        manufacturedAt: formatDateInput(item.manufacturedAt),
        expiresAt: formatDateInput(item.expiresAt),
        batchNumber: item.batchNumber ?? "",
        serialNumber: item.serialNumber ?? "",
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
      tracking: inlineCategory.tracking,
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
    setInlineCategory({
      name: "",
      baseUnitName: "piece",
      packLevels: defaultCategoryPacks("piece"),
      tracking: { ...DEFAULT_CATEGORY_TRACKING },
    });
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
    const sale = Number(newProduct.salePrice);
    if (!newProduct.salePrice.trim() || sale <= 0) {
      setProductError(
        `Indiquez le prix de vente / ${category.baseUnitName} (saisie manuelle)`,
      );
      return;
    }

    const packSaleRaw = newProduct.packSalePrice.trim();
    const packSale =
      packSaleRaw !== ""
        ? Number(packSaleRaw)
        : sale * units;
    if (packSaleRaw !== "" && (!(packSale > 0) || Number.isNaN(packSale))) {
      setProductError("Prix de vente du lot invalide");
      return;
    }

    const packLevels: ProductPackPrice[] = templatesToProductPrices(
      category.packLevels,
      cost,
    ).map((level) => {
      if (level.unitsOfBase === 1) {
        return { ...level, salePrice: sale };
      }
      if (
        level.name === newProduct.purchasePackName ||
        level.unitsOfBase === units
      ) {
        return { ...level, salePrice: packSale };
      }
      return level;
    });

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
      `Produit « ${product.name} » cree (stock 0 — reception pour alimenter)`,
      "success",
    );
  };

  const handleSave = () => {
    if (lines.some((line) => !line.productId)) {
      setError("Selectionnez ou creez un produit pour chaque ligne");
      return;
    }

    for (const line of lines) {
      const product = products.find((p) => p.id === line.productId);
      if (!product) continue;
      const tracking = normalizeCategoryTracking(
        categories.find((c) => c.id === product.categoryId)?.tracking,
      );
      if (tracking.tracksExpiry && !parseDateInput(line.expiresAt)) {
        setError(
          `Date de peremption requise pour « ${product.name} » (categorie avec suivi peremption).`,
        );
        return;
      }
      if (tracking.tracksManufacturedAt && !parseDateInput(line.manufacturedAt)) {
        setError(
          `Date de fabrication requise pour « ${product.name} ».`,
        );
        return;
      }
      if (tracking.tracksBatchNumber && !line.batchNumber.trim()) {
        setError(`Numero de lot requis pour « ${product.name} ».`);
        return;
      }
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
        manufacturedAt: parseDateInput(line.manufacturedAt),
        expiresAt: parseDateInput(line.expiresAt),
        batchNumber: line.batchNumber.trim() || undefined,
        serialNumber: line.serialNumber.trim() || undefined,
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
      description: `L'achat ${purchase.reference} passera au statut Annule. Aucun stock ne sera ajoute.`,
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
            <>
              <Button
                size="sm"
                variant="outline"
                className="h-8"
                onClick={() => void cancel(row)}
              >
                <X className="h-3.5 w-3.5" />
                Annuler
              </Button>
              <Button
                size="sm"
                className="h-8 bg-success text-success-foreground hover:bg-success/90"
                onClick={() => void receive(row)}
              >
                <Check className="h-3.5 w-3.5" />
                Recevoir
              </Button>
            </>
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
                  <ProductSearchSelect
                    products={products}
                    value={line.productId}
                    placeholder="Nom, SKU ou code-barres…"
                    onChange={(productId, next) => {
                      const pack = next?.packLevels.at(-1);
                      const category = next
                        ? categories.find((c) => c.id === next.categoryId)
                        : undefined;
                      setLines((prev) =>
                        prev.map((item, i) =>
                          i === index
                            ? {
                                ...item,
                                productId,
                                unitPrice: next
                                  ? String(
                                      (next.purchasePrice ?? 0) *
                                        (pack?.unitsOfBase ?? 1),
                                    )
                                  : item.unitPrice,
                                purchasePackName: next
                                  ? (pack?.name ?? next.baseUnitName ?? "piece")
                                  : item.purchasePackName,
                                unitsPerPurchasePack: next
                                  ? String(pack?.unitsOfBase ?? 1)
                                  : item.unitsPerPurchasePack,
                                manufacturedAt: next
                                  ? formatDateInput(next.manufacturedAt)
                                  : "",
                                expiresAt: next
                                  ? formatDateInput(next.expiresAt)
                                  : "",
                                batchNumber: next?.batchNumber ?? "",
                                serialNumber: next?.serialNumber ?? "",
                                ...(category?.tracking?.defaultShelfLifeDays &&
                                next &&
                                !next.expiresAt &&
                                next.manufacturedAt
                                  ? {
                                      expiresAt: formatDateInput(
                                        suggestExpiryFromManufactured(
                                          next.manufacturedAt,
                                          category.tracking.defaultShelfLifeDays,
                                        ),
                                      ),
                                    }
                                  : {}),
                              }
                            : item,
                        ),
                      );
                    }}
                  />
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
                {(() => {
                  const category = product
                    ? categories.find((c) => c.id === product.categoryId)
                    : undefined;
                  const tracking = normalizeCategoryTracking(category?.tracking);
                  if (!categoryNeedsLotFields(tracking)) return null;
                  return (
                    <div className="space-y-2 rounded-lg border border-border/80 bg-card/60 p-2">
                      <p className="text-[11px] font-medium text-foreground">
                        Dates / lot du nouveau stock
                        {category ? (
                          <span className="font-normal text-muted-foreground">
                            {" "}
                            · {category.name}
                          </span>
                        ) : null}
                      </p>
                      <div className="grid gap-2 sm:grid-cols-2">
                      {tracking.tracksManufacturedAt ? (
                        <div className="space-y-1">
                          <p className="text-[10px] text-muted-foreground">
                            Fabrication
                          </p>
                          <Input
                            type="date"
                            className="h-10"
                            value={line.manufacturedAt}
                            onChange={(e) => {
                              const manufacturedAt = e.target.value;
                              setLines((prev) =>
                                prev.map((item, i) => {
                                  if (i !== index) return item;
                                  const next = { ...item, manufacturedAt };
                                  if (
                                    tracking.defaultShelfLifeDays &&
                                    manufacturedAt &&
                                    tracking.tracksExpiry
                                  ) {
                                    const mfg = parseDateInput(manufacturedAt);
                                    if (mfg) {
                                      next.expiresAt = formatDateInput(
                                        suggestExpiryFromManufactured(
                                          mfg,
                                          tracking.defaultShelfLifeDays,
                                        ),
                                      );
                                    }
                                  }
                                  return next;
                                }),
                              );
                            }}
                          />
                        </div>
                      ) : null}
                      {tracking.tracksExpiry ? (
                        <div className="space-y-1">
                          <p className="text-[10px] text-muted-foreground">
                            Peremption
                          </p>
                          <Input
                            type="date"
                            className="h-10"
                            value={line.expiresAt}
                            onChange={(e) =>
                              setLines((prev) =>
                                prev.map((item, i) =>
                                  i === index
                                    ? { ...item, expiresAt: e.target.value }
                                    : item,
                                ),
                              )
                            }
                          />
                        </div>
                      ) : null}
                      {tracking.tracksBatchNumber ? (
                        <div className="space-y-1">
                          <p className="text-[10px] text-muted-foreground">
                            N° lot
                          </p>
                          <Input
                            className="h-10"
                            value={line.batchNumber}
                            onChange={(e) =>
                              setLines((prev) =>
                                prev.map((item, i) =>
                                  i === index
                                    ? { ...item, batchNumber: e.target.value }
                                    : item,
                                ),
                              )
                            }
                          />
                        </div>
                      ) : null}
                      {tracking.tracksSerialNumber ? (
                        <div className="space-y-1">
                          <p className="text-[10px] text-muted-foreground">
                            N° serie
                          </p>
                          <Input
                            className="h-10"
                            value={line.serialNumber}
                            onChange={(e) =>
                              setLines((prev) =>
                                prev.map((item, i) =>
                                  i === index
                                    ? { ...item, serialNumber: e.target.value }
                                    : item,
                                ),
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
        description="Stock initial = 0. Seule une reception d'achat augmente le stock. Prix de vente saisis manuellement."
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
              placeholder="Ex. BEAUFORT-33CL"
              onChange={(e) =>
                setNewProduct((p) => ({ ...p, sku: e.target.value }))
              }
            />
            <p className="text-[11px] text-muted-foreground">
              Reference interne unique (pas le code-barres). Sert a retrouver le
              produit vite.
            </p>
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
            <Label>Prix d&apos;achat du lot</Label>
            <Input
              type="number"
              min={0}
              value={newProduct.packPurchasePrice}
              onChange={(e) =>
                setNewProduct((p) => ({
                  ...p,
                  packPurchasePrice: e.target.value,
                }))
              }
            />
          </div>
          <div className="space-y-1.5">
            <Label>
              Cout / {selectedCategory?.baseUnitName || "unite"}
            </Label>
            <div className="flex h-11 items-center rounded-xl border border-border bg-surface-2 px-4 text-sm tabular-nums">
              {formatCurrency(suggestedCost)}
            </div>
            <p className="text-[11px] text-muted-foreground">
              Calcule : prix du lot ÷ {unitsInLot} unites (minimum pour ne pas
              perdre)
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
          <div className="space-y-1.5">
            <Label>
              Prix vente / {selectedCategory?.baseUnitName || "unite"}
            </Label>
            <Input
              type="number"
              min={0}
              value={newProduct.salePrice}
              placeholder={`Min. conseille ${minSaleHint || suggestedCost}`}
              onChange={(e) =>
                setNewProduct((p) => ({ ...p, salePrice: e.target.value }))
              }
            />
            <p
              className={`text-[11px] ${
                unitSale > 0 && potentialGainUnit < 0
                  ? "text-destructive"
                  : "text-muted-foreground"
              }`}
            >
              {unitSale > 0
                ? `Gain potentiel / unite : ${formatCurrency(potentialGainUnit)}${
                    isSalePriceBelowCost(unitSale, suggestedCost)
                      ? " — sous le cout !"
                      : ""
                  }`
                : `Saisie manuelle — ne pas descendre sous ${formatCurrency(suggestedCost)}`}
            </p>
          </div>
          <div className="space-y-1.5">
            <Label>
              Prix vente / {newProduct.purchasePackName || "lot"}
            </Label>
            <Input
              type="number"
              min={0}
              value={newProduct.packSalePrice}
              placeholder={
                unitSale > 0
                  ? `Ex. ${unitSale * unitsInLot} (= ${unitsInLot} × unite)`
                  : "Saisie manuelle"
              }
              onChange={(e) =>
                setNewProduct((p) => ({ ...p, packSalePrice: e.target.value }))
              }
            />
            <p
              className={`text-[11px] ${
                packSale > 0 && potentialGainPack < 0
                  ? "text-destructive"
                  : "text-muted-foreground"
              }`}
            >
              {packSale > 0
                ? `Gain potentiel / lot : ${formatCurrency(potentialGainPack)}`
                : packCost > 0
                  ? `Cout du lot : ${formatCurrency(packCost)} — vide = ${unitsInLot} × prix unite`
                  : "Pour vendre le lot entier (casier, carton…)"}
            </p>
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
        description="Conditionnements + suivi dates (uniquement si utile pour cette famille)."
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
        <div className="space-y-2 rounded-xl border border-border p-3">
          <p className="text-sm font-medium">Suivi lot & dates</p>
          <p className="text-xs text-muted-foreground">
            Cochez seulement ce qui est pertinent (ex. bieres/cigarettes : oui —
            smartphones : non, sauf n° serie).
          </p>
          {(
            [
              ["tracksManufacturedAt", "Date de fabrication"],
              ["tracksExpiry", "Date de peremption"],
              ["tracksBatchNumber", "Numero de lot"],
              ["tracksSerialNumber", "Numero de serie"],
            ] as const
          ).map(([key, label]) => (
            <label key={key} className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={inlineCategory.tracking[key]}
                onChange={(e) =>
                  setInlineCategory((p) => ({
                    ...p,
                    tracking: normalizeCategoryTracking({
                      ...p.tracking,
                      [key]: e.target.checked,
                    }),
                  }))
                }
                className="h-4 w-4 rounded border-border"
              />
              {label}
            </label>
          ))}
          {inlineCategory.tracking.tracksExpiry ? (
            <div className="grid gap-2 sm:grid-cols-2">
              <div className="space-y-1">
                <Label className="text-xs">Alerte (jours)</Label>
                <Input
                  type="number"
                  min={0}
                  value={inlineCategory.tracking.expiryAlertDays}
                  onChange={(e) =>
                    setInlineCategory((p) => ({
                      ...p,
                      tracking: normalizeCategoryTracking({
                        ...p.tracking,
                        expiryAlertDays: Number(e.target.value) || 0,
                      }),
                    }))
                  }
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Remise suggeree %</Label>
                <Input
                  type="number"
                  min={0}
                  max={90}
                  value={
                    inlineCategory.tracking.suggestedNearExpiryDiscountPercent ??
                    ""
                  }
                  onChange={(e) =>
                    setInlineCategory((p) => ({
                      ...p,
                      tracking: normalizeCategoryTracking({
                        ...p.tracking,
                        suggestedNearExpiryDiscountPercent: e.target.value
                          ? Number(e.target.value) || undefined
                          : undefined,
                      }),
                    }))
                  }
                />
              </div>
            </div>
          ) : null}
        </div>
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
