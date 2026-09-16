"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ArrowRight,
  Package,
  Pencil,
  Plus,
  ShoppingCart,
  Trash2,
  TrendingDown,
} from "lucide-react";
import { DataTable, type DataColumn } from "@/components/crud/data-table";
import { FormDialog } from "@/components/crud/form-dialog";
import { CrudToolbar } from "@/components/crud/toolbar";
import { Badge, Chip } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Dialog } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PageHeader, StatCard } from "@/components/ui/page-header";
import { Separator } from "@/components/ui/separator";
import { ToastViewport, useToast } from "@/components/ui/toast";
import { useConfirmDialog } from "@/components/ui/use-confirm-dialog";
import { useBcfRefresh } from "@/hooks/use-bcf-refresh";
import { useEntityList } from "@/hooks/use-entity-list";
import {
  createSupplier,
  getSupplierDetail,
  getSupplierOverview,
  listSupplierSummaries,
  removeSupplier,
  updateSupplier,
  type SupplierDetail,
  type SupplierSummary,
} from "@/lib/repositories/suppliers";
import { cn, formatCurrency } from "@/lib/utils";

type SupplierFormState = {
  name: string;
  email: string;
  phone: string;
  address: string;
  notes: string;
  isActive: boolean;
};

type StatusFilter = "all" | "active" | "inactive" | "pending";

const emptyForm: SupplierFormState = {
  name: "",
  email: "",
  phone: "",
  address: "",
  notes: "",
  isActive: true,
};

function formatShortDate(date: Date | null) {
  if (!date) return "—";
  const d = new Date(date);
  return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;
}

const purchaseStatusLabel = {
  PENDING: "En attente",
  RECEIVED: "Recu",
  CANCELLED: "Annule",
} as const;

export function SuppliersWorkspace() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { confirm, dialog } = useConfirmDialog();
  const { toast, showToast } = useToast();
  const { version, bump, mounted } = useBcfRefresh();
  const [form, setForm] = useState<SupplierFormState>(emptyForm);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const items = useMemo(() => {
    if (!mounted) return [];
    void version;
    return listSupplierSummaries();
  }, [version, mounted]);

  const overview = useMemo(() => {
    if (!mounted) {
      return {
        total: 0,
        activeCount: 0,
        inactiveCount: 0,
        withPendingCount: 0,
        totalReceivedSpend: 0,
        totalPendingSpend: 0,
        topBySpend: [] as SupplierSummary[],
        offerCount: 0,
      };
    }
    void version;
    return getSupplierOverview();
  }, [version, mounted]);

  const detail = useMemo(() => {
    if (!mounted || !selectedId) return null;
    void version;
    return getSupplierDetail(selectedId);
  }, [version, mounted, selectedId]);

  const filterFn = useCallback(
    (item: SupplierSummary, query: string) => {
      if (statusFilter === "active" && !item.isActive) return false;
      if (statusFilter === "inactive" && item.isActive) return false;
      if (statusFilter === "pending" && item.pendingPurchaseCount <= 0) {
        return false;
      }
      const q = query.trim().toLowerCase();
      if (!q) return true;
      return (
        item.name.toLowerCase().includes(q) ||
        (item.email?.toLowerCase().includes(q) ?? false) ||
        (item.phone?.toLowerCase().includes(q) ?? false) ||
        (item.address?.toLowerCase().includes(q) ?? false)
      );
    },
    [statusFilter],
  );

  const list = useEntityList(items, filterFn);

  useEffect(() => {
    const id = searchParams.get("id");
    if (id) setSelectedId(id);
  }, [searchParams]);

  const openCreate = () => {
    setForm(emptyForm);
    setError(null);
    list.openCreate();
  };

  const openEdit = (item: SupplierSummary) => {
    setForm({
      name: item.name,
      email: item.email ?? "",
      phone: item.phone ?? "",
      address: item.address ?? "",
      notes: item.notes ?? "",
      isActive: item.isActive,
    });
    setError(null);
    list.openEdit(item);
  };

  const handleSave = () => {
    const payload = {
      name: form.name,
      email: form.email,
      phone: form.phone,
      address: form.address,
      notes: form.notes,
      isActive: form.isActive,
    };
    const result = list.editing
      ? updateSupplier(list.editing.id, payload)
      : createSupplier(payload);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    list.closeForm();
    bump();
    showToast(
      list.editing ? "Fournisseur mis a jour" : "Fournisseur cree",
      "success",
    );
  };

  const handleDelete = async (item: SupplierSummary) => {
    const ok = await confirm({
      title: `Supprimer « ${item.name} » ?`,
      description:
        item.offerCount > 0
          ? `${item.offerCount} offre(s) de prix seront aussi retirees. Les achats / produits lies bloquent la suppression.`
          : "Cette action est irreversible.",
      confirmLabel: "Supprimer",
      variant: "destructive",
    });
    if (!ok) return;
    const result = removeSupplier(item.id);
    if (!result.ok) {
      showToast(result.error, "error");
      return;
    }
    if (selectedId === item.id) setSelectedId(null);
    bump();
    showToast(`« ${item.name} » supprime`, "success");
  };

  const openPurchase = (supplierId: string) => {
    router.push(`/achats?nouveau=1&supplierId=${encodeURIComponent(supplierId)}`);
  };

  const columns: DataColumn<SupplierSummary>[] = [
    {
      key: "name",
      header: "Fournisseur",
      cell: (row) => (
        <div className="min-w-0">
          <p className="truncate font-medium">{row.name}</p>
          {row.address ? (
            <p className="truncate text-xs text-muted-foreground">{row.address}</p>
          ) : null}
        </div>
      ),
    },
    {
      key: "contact",
      header: "Contact",
      hideOnMobile: true,
      cell: (row) => (
        <div className="min-w-0 text-xs text-muted-foreground">
          <p className="truncate">{row.email || "—"}</p>
          <p className="truncate">{row.phone || "—"}</p>
        </div>
      ),
    },
    {
      key: "activity",
      header: "Activite",
      hideOnMobile: true,
      cell: (row) => (
        <div className="text-xs tabular-nums text-muted-foreground">
          <p>
            {row.productCount} prod. · {row.purchaseCount} achat
            {row.purchaseCount > 1 ? "s" : ""}
          </p>
          <p>
            {row.offerCount} offre{row.offerCount > 1 ? "s" : ""} ·{" "}
            {formatShortDate(row.lastPurchaseAt)}
          </p>
        </div>
      ),
    },
    {
      key: "spend",
      header: "Volume recu",
      cell: (row) => (
        <div className="text-right text-sm">
          <p className="font-medium tabular-nums">
            {formatCurrency(row.receivedSpend)}
          </p>
          {row.pendingPurchaseCount > 0 ? (
            <p className="text-[11px] text-warning">
              {row.pendingPurchaseCount} en attente ·{" "}
              {formatCurrency(row.pendingSpend)}
            </p>
          ) : null}
        </div>
      ),
    },
    {
      key: "status",
      header: "Statut",
      cell: (row) => (
        <Badge variant={row.isActive ? "success" : "outline"}>
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
            title="Nouvel achat"
            onClick={() => openPurchase(row.id)}
          >
            <ShoppingCart className="h-3.5 w-3.5" />
          </Button>
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

  return (
    <div className="space-y-6">
      <PageHeader
        title="Fournisseurs"
        description="Hub approvisionnement : contacts, achats, offres de prix et comparaisons."
        actions={
          <>
            <Link
              href="/achats"
              className={cn(buttonVariants({ variant: "outline" }))}
            >
              <ShoppingCart className="h-4 w-4" />
              Achats
            </Link>
            <Button variant="success" onClick={openCreate}>
              <Plus className="h-4 w-4" />
              Nouveau fournisseur
            </Button>
          </>
        }
      />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Fournisseurs"
          value={overview.total}
          subtitle="Tous"
          active={statusFilter === "all"}
          onClick={() => setStatusFilter("all")}
        />
        <StatCard
          title="Actifs"
          value={overview.activeCount}
          variant="success"
          subtitle="Cliquer pour filtrer"
          active={statusFilter === "active"}
          onClick={() => setStatusFilter("active")}
        />
        <StatCard
          title="Inactifs"
          value={overview.inactiveCount}
          subtitle="Cliquer pour filtrer"
          active={statusFilter === "inactive"}
          onClick={() => setStatusFilter("inactive")}
        />
        <StatCard
          title="Achats en attente"
          value={overview.withPendingCount}
          variant={overview.withPendingCount > 0 ? "warning" : "default"}
          subtitle={formatCurrency(overview.totalPendingSpend)}
          active={statusFilter === "pending"}
          onClick={() => setStatusFilter("pending")}
        />
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard
          title="Depenses recues"
          value={formatCurrency(overview.totalReceivedSpend)}
          subtitle="Achats receptionnes"
          variant="success"
        />
        <StatCard
          title="Offres de prix"
          value={overview.offerCount}
          subtitle="Comparees a la reception"
        />
        <Card className="sm:col-span-2 lg:col-span-1">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Top volume
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-1.5">
            {overview.topBySpend.filter((s) => s.receivedSpend > 0).length ===
            0 ? (
              <p className="text-sm text-muted-foreground">Aucun achat recu</p>
            ) : (
              overview.topBySpend
                .filter((s) => s.receivedSpend > 0)
                .slice(0, 3)
                .map((s, i) => (
                  <button
                    key={s.id}
                    type="button"
                    className="flex w-full items-center justify-between gap-2 rounded-lg bg-surface-2 px-2.5 py-1.5 text-left hover:bg-surface-active"
                    onClick={() => setSelectedId(s.id)}
                  >
                    <span className="truncate text-sm font-medium">
                      {i + 1}. {s.name}
                    </span>
                    <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
                      {formatCurrency(s.receivedSpend)}
                    </span>
                  </button>
                ))
            )}
          </CardContent>
        </Card>
      </div>

      <CrudToolbar
        search={list.search}
        onSearchChange={list.setSearch}
        searchPlaceholder="Nom, email, telephone, adresse…"
        filters={
          <>
            {(
              [
                ["all", "Tous"],
                ["active", "Actifs"],
                ["inactive", "Inactifs"],
                ["pending", "En attente"],
              ] as const
            ).map(([value, label]) => (
              <Chip
                key={value}
                active={statusFilter === value}
                onClick={() => setStatusFilter(value)}
                className="px-2.5 py-1 text-xs"
              >
                {label}
              </Chip>
            ))}
          </>
        }
      />

      <DataTable
        rows={list.filtered}
        columns={columns}
        rowKey={(row) => row.id}
        emptyTitle="Aucun fournisseur"
        onRowClick={(row) => setSelectedId(row.id)}
      />

      <SupplierDetailDialog
        detail={detail}
        open={!!selectedId}
        onOpenChange={(open) => {
          if (!open) {
            setSelectedId(null);
            if (searchParams.get("id")) {
              router.replace("/fournisseurs", { scroll: false });
            }
          }
        }}
        onEdit={(d) => {
          setSelectedId(null);
          openEdit(d);
        }}
        onPurchase={openPurchase}
        onDelete={(d) => void handleDelete(d)}
      />

      <FormDialog
        open={list.formOpen}
        onOpenChange={(open) =>
          !open ? list.closeForm() : list.setFormOpen(true)
        }
        title={list.editing ? "Modifier le fournisseur" : "Nouveau fournisseur"}
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
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="sup-name">Nom</Label>
            <Input
              id="sup-name"
              value={form.name}
              onChange={(e) =>
                setForm((p) => ({ ...p, name: e.target.value }))
              }
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="sup-email">Email</Label>
            <Input
              id="sup-email"
              type="email"
              value={form.email}
              onChange={(e) =>
                setForm((p) => ({ ...p, email: e.target.value }))
              }
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="sup-phone">Telephone</Label>
            <Input
              id="sup-phone"
              value={form.phone}
              onChange={(e) =>
                setForm((p) => ({ ...p, phone: e.target.value }))
              }
            />
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="sup-address">Adresse</Label>
            <Input
              id="sup-address"
              value={form.address}
              onChange={(e) =>
                setForm((p) => ({ ...p, address: e.target.value }))
              }
            />
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="sup-notes">Notes</Label>
            <Input
              id="sup-notes"
              value={form.notes}
              onChange={(e) =>
                setForm((p) => ({ ...p, notes: e.target.value }))
              }
            />
          </div>
        </div>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={form.isActive}
            onChange={(e) =>
              setForm((p) => ({ ...p, isActive: e.target.checked }))
            }
            className="h-4 w-4 rounded border-border"
          />
          Fournisseur actif
        </label>
        {error ? <p className="text-sm text-destructive">{error}</p> : null}
      </FormDialog>

      {dialog}
      <ToastViewport toast={toast} />
    </div>
  );
}

function SupplierDetailDialog({
  detail,
  open,
  onOpenChange,
  onEdit,
  onPurchase,
  onDelete,
}: {
  detail: SupplierDetail | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEdit: (detail: SupplierDetail) => void;
  onPurchase: (supplierId: string) => void;
  onDelete: (detail: SupplierDetail) => void;
}) {
  if (!detail) {
    return (
      <Dialog
        open={open}
        onOpenChange={onOpenChange}
        title="Fournisseur"
        description="Chargement…"
      />
    );
  }

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title={detail.name}
      description={
        detail.isActive ? "Fournisseur actif" : "Fournisseur inactif"
      }
      className="max-w-2xl"
      footer={
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-between">
          <Button
            variant="outline"
            className="text-destructive"
            onClick={() => onDelete(detail)}
          >
            <Trash2 className="h-4 w-4" />
            Supprimer
          </Button>
          <div className="flex flex-col-reverse gap-2 sm:flex-row">
            <Button variant="outline" onClick={() => onEdit(detail)}>
              <Pencil className="h-4 w-4" />
              Modifier
            </Button>
            <Button variant="success" onClick={() => onPurchase(detail.id)}>
              <ShoppingCart className="h-4 w-4" />
              Nouvel achat
            </Button>
          </div>
        </div>
      }
    >
      <div className="max-h-[min(65vh,560px)] space-y-4 overflow-y-auto pr-1">
        <div className="grid gap-2 sm:grid-cols-2 text-sm">
          <div>
            <p className="text-xs text-muted-foreground">Email</p>
            <p>{detail.email || "—"}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Telephone</p>
            <p>{detail.phone || "—"}</p>
          </div>
          <div className="sm:col-span-2">
            <p className="text-xs text-muted-foreground">Adresse</p>
            <p>{detail.address || "—"}</p>
          </div>
          {detail.notes ? (
            <div className="sm:col-span-2">
              <p className="text-xs text-muted-foreground">Notes</p>
              <p>{detail.notes}</p>
            </div>
          ) : null}
        </div>

        <div className="grid gap-2 sm:grid-cols-3">
          <div className="rounded-xl bg-surface-2 px-3 py-2">
            <p className="text-[11px] text-muted-foreground">Volume recu</p>
            <p className="font-semibold tabular-nums">
              {formatCurrency(detail.receivedSpend)}
            </p>
          </div>
          <div className="rounded-xl bg-surface-2 px-3 py-2">
            <p className="text-[11px] text-muted-foreground">En attente</p>
            <p className="font-semibold tabular-nums text-warning">
              {formatCurrency(detail.pendingSpend)}
            </p>
          </div>
          <div className="rounded-xl bg-surface-2 px-3 py-2">
            <p className="text-[11px] text-muted-foreground">Dernier achat</p>
            <p className="font-semibold">{formatShortDate(detail.lastPurchaseAt)}</p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <Link
            href={`/produits?supplierId=${encodeURIComponent(detail.id)}`}
            className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
          >
            <Package className="h-3.5 w-3.5" />
            Voir produits ({detail.productCount})
          </Link>
          <Link
            href={`/achats?supplierId=${encodeURIComponent(detail.id)}`}
            className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
          >
            <ShoppingCart className="h-3.5 w-3.5" />
            Voir achats ({detail.purchaseCount})
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>

        <Separator />

        <section className="space-y-2">
          <h3 className="text-sm font-semibold">Achats recents</h3>
          {detail.purchases.length === 0 ? (
            <p className="text-sm text-muted-foreground">Aucun achat.</p>
          ) : (
            <div className="space-y-1.5">
              {detail.purchases.slice(0, 6).map((p) => (
                <div
                  key={p.id}
                  className="flex items-center justify-between gap-2 rounded-lg bg-surface-2 px-3 py-2 text-sm"
                >
                  <div className="min-w-0">
                    <p className="truncate font-medium">{p.reference}</p>
                    <p className="text-[11px] text-muted-foreground">
                      {formatShortDate(p.purchasedAt)} ·{" "}
                      {purchaseStatusLabel[p.status]}
                    </p>
                  </div>
                  <p className="shrink-0 tabular-nums font-medium">
                    {formatCurrency(p.totalAmount)}
                  </p>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="space-y-2">
          <h3 className="text-sm font-semibold">Produits preferentiels</h3>
          {detail.products.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Aucun produit avec ce fournisseur preferentiel.
            </p>
          ) : (
            <div className="space-y-1.5">
              {detail.products.slice(0, 8).map((p) => (
                <div
                  key={p.id}
                  className="flex items-center justify-between gap-2 rounded-lg bg-surface-2 px-3 py-2 text-sm"
                >
                  <div className="min-w-0">
                    <p className="truncate font-medium">{p.name}</p>
                    <p className="text-[11px] text-muted-foreground">
                      {p.sku} · stock {p.quantity}
                    </p>
                  </div>
                  <p className="shrink-0 tabular-nums text-xs text-muted-foreground">
                    cout {formatCurrency(p.purchasePrice)}
                  </p>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="space-y-2">
          <h3 className="flex items-center gap-2 text-sm font-semibold">
            <TrendingDown className="h-4 w-4 text-success" />
            Offres & comparaison
          </h3>
          {detail.priceEdges.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Aucune offre connue — receptionnez un achat pour enregistrer les
              prix.
            </p>
          ) : (
            <div className="space-y-2">
              {detail.priceEdges.map((edge) => (
                <div
                  key={edge.productId}
                  className="rounded-xl border border-border px-3 py-2"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">
                        {edge.productName}
                      </p>
                      <p className="text-[11px] text-muted-foreground">
                        {edge.productSku}
                      </p>
                    </div>
                    <Badge variant={edge.isBest ? "success" : "warning"}>
                      {edge.isBest ? "Meilleur prix" : "Plus cher"}
                    </Badge>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Chez ce fournisseur :{" "}
                    <span className="font-medium text-foreground tabular-nums">
                      {formatCurrency(edge.thisSupplierCost)}
                    </span>
                    {" / u. · meilleur marche : "}
                    <span className="tabular-nums">
                      {formatCurrency(edge.bestCost)}
                    </span>
                    {edge.potentialSavingPerBase > 0
                      ? ` · ecart max ${formatCurrency(edge.potentialSavingPerBase)}`
                      : ""}
                  </p>
                  <div className="mt-1.5 flex flex-wrap gap-1.5">
                    {edge.offers.map((o) => (
                      <Badge
                        key={`${o.supplierId}-${o.purchasePackName}`}
                        variant={
                          o.costPerBaseUnit <= edge.bestCost
                            ? "success"
                            : "outline"
                        }
                        className="text-[10px]"
                      >
                        {o.supplierName}: {formatCurrency(o.costPerBaseUnit)}/
                        {o.purchasePackName}
                      </Badge>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </Dialog>
  );
}
