"use client";

import { useCallback, useMemo, useState } from "react";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { DataTable, type DataColumn } from "@/components/crud/data-table";
import { FormDialog } from "@/components/crud/form-dialog";
import { CrudToolbar } from "@/components/crud/toolbar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PageHeader, StatCard } from "@/components/ui/page-header";
import { useConfirmDialog } from "@/components/ui/use-confirm-dialog";
import { useEntityList } from "@/hooks/use-entity-list";
import {
  createSupplier,
  listSuppliers,
  removeSupplier,
  updateSupplier,
} from "@/lib/repositories/suppliers";
import type { Supplier } from "@/lib/types";

type SupplierFormState = {
  name: string;
  email: string;
  phone: string;
  address: string;
  notes: string;
  isActive: boolean;
};

const emptyForm: SupplierFormState = {
  name: "",
  email: "",
  phone: "",
  address: "",
  notes: "",
  isActive: true,
};

export function SuppliersWorkspace() {
  const { confirm, dialog } = useConfirmDialog();
  const [version, setVersion] = useState(0);
  const [form, setForm] = useState<SupplierFormState>(emptyForm);
  const [error, setError] = useState<string | null>(null);

  const items = useMemo(() => {
    void version;
    return listSuppliers();
  }, [version]);

  const filterFn = useCallback((item: Supplier, query: string) => {
    const q = query.trim().toLowerCase();
    if (!q) return true;
    return (
      item.name.toLowerCase().includes(q) ||
      (item.email?.toLowerCase().includes(q) ?? false) ||
      (item.phone?.toLowerCase().includes(q) ?? false)
    );
  }, []);

  const list = useEntityList(items, filterFn);

  const openCreate = () => {
    setForm(emptyForm);
    setError(null);
    list.openCreate();
  };

  const openEdit = (item: Supplier) => {
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
    setVersion((value) => value + 1);
  };

  const handleDelete = async (item: Supplier) => {
    const ok = await confirm({
      title: `Supprimer « ${item.name} » ?`,
      description: "Cette action est irreversible.",
      confirmLabel: "Supprimer",
      variant: "destructive",
    });
    if (!ok) return;
    const result = removeSupplier(item.id);
    if (!result.ok) {
      await confirm({
        title: "Suppression impossible",
        description: result.error,
        confirmLabel: "OK",
        variant: "warning",
      });
      return;
    }
    setVersion((value) => value + 1);
  };

  const columns: DataColumn<Supplier>[] = [
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
        <div className="flex justify-end gap-1" onClick={(e) => e.stopPropagation()}>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(row)}>
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
        description="Gerez vos partenaires d'approvisionnement."
        actions={
          <Button onClick={openCreate}>
            <Plus className="h-4 w-4" />
            Nouveau fournisseur
          </Button>
        }
      />

      <div className="grid gap-3 sm:grid-cols-2">
        <StatCard title="Fournisseurs" value={items.length} />
        <StatCard
          title="Actifs"
          value={items.filter((item) => item.isActive).length}
          variant="success"
        />
      </div>

      <CrudToolbar
        search={list.search}
        onSearchChange={list.setSearch}
        searchPlaceholder="Rechercher un fournisseur…"
      />

      <DataTable
        rows={list.filtered}
        columns={columns}
        rowKey={(row) => row.id}
        emptyTitle="Aucun fournisseur"
        onRowClick={openEdit}
      />

      <FormDialog
        open={list.formOpen}
        onOpenChange={(open) => (!open ? list.closeForm() : list.setFormOpen(true))}
        title={list.editing ? "Modifier le fournisseur" : "Nouveau fournisseur"}
        className="max-w-xl"
        footer={
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button variant="outline" onClick={list.closeForm}>
              Annuler
            </Button>
            <Button onClick={handleSave}>Enregistrer</Button>
          </div>
        }
      >
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="sup-name">Nom</Label>
            <Input
              id="sup-name"
              value={form.name}
              onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="sup-email">Email</Label>
            <Input
              id="sup-email"
              type="email"
              value={form.email}
              onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="sup-phone">Telephone</Label>
            <Input
              id="sup-phone"
              value={form.phone}
              onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value }))}
            />
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="sup-address">Adresse</Label>
            <Input
              id="sup-address"
              value={form.address}
              onChange={(e) => setForm((p) => ({ ...p, address: e.target.value }))}
            />
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="sup-notes">Notes</Label>
            <Input
              id="sup-notes"
              value={form.notes}
              onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))}
            />
          </div>
        </div>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={form.isActive}
            onChange={(e) => setForm((p) => ({ ...p, isActive: e.target.checked }))}
            className="h-4 w-4 rounded border-border"
          />
          Fournisseur actif
        </label>
        {error ? <p className="text-sm text-destructive">{error}</p> : null}
      </FormDialog>

      {dialog}
    </div>
  );
}
