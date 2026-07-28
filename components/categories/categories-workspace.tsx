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
import { ToastViewport, useToast } from "@/components/ui/toast";
import { useConfirmDialog } from "@/components/ui/use-confirm-dialog";
import { useEntityList } from "@/hooks/use-entity-list";
import {
  countProductsInCategory,
  createCategory,
  listCategories,
  removeCategory,
  updateCategory,
} from "@/lib/repositories/categories";
import type { Category } from "@/lib/types";

type CategoryFormState = {
  name: string;
  description: string;
  isActive: boolean;
};

const emptyForm: CategoryFormState = {
  name: "",
  description: "",
  isActive: true,
};

export function CategoriesWorkspace() {
  const { confirm, dialog } = useConfirmDialog();
  const { toast, showToast } = useToast();
  const [version, setVersion] = useState(0);
  const [form, setForm] = useState<CategoryFormState>(emptyForm);
  const [error, setError] = useState<string | null>(null);

  const items = useMemo(() => {
    void version;
    return listCategories();
  }, [version]);

  const filterFn = useCallback(
    (item: Category, query: string) => {
      const q = query.trim().toLowerCase();
      if (!q) return true;
      return (
        item.name.toLowerCase().includes(q) ||
        (item.description?.toLowerCase().includes(q) ?? false)
      );
    },
    [],
  );

  const list = useEntityList(items, filterFn);

  const activeCount = items.filter((item) => item.isActive).length;

  const openCreate = () => {
    setForm(emptyForm);
    setError(null);
    list.openCreate();
  };

  const openEdit = (item: Category) => {
    setForm({
      name: item.name,
      description: item.description ?? "",
      isActive: item.isActive,
    });
    setError(null);
    list.openEdit(item);
  };

  const handleSave = () => {
    const payload = {
      name: form.name,
      description: form.description,
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
    setVersion((value) => value + 1);
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
    setVersion((value) => value + 1);
    showToast(`« ${item.name} » supprimee`, "success");
  };

  const columns: DataColumn<Category>[] = [
    {
      key: "name",
      header: "Nom",
      cell: (row) => (
        <div className="min-w-0">
          <p className="truncate font-medium text-foreground">{row.name}</p>
          {row.description ? (
            <p className="truncate text-xs text-muted-foreground">
              {row.description}
            </p>
          ) : null}
        </div>
      ),
    },
    {
      key: "products",
      header: "Produits",
      cell: (row) => (
        <span className="tabular-nums">{countProductsInCategory(row.id)}</span>
      ),
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
        description="Organisez votre catalogue par familles de produits."
        actions={
          <Button variant="success" onClick={openCreate}>
            <Plus className="h-4 w-4" />
            Nouvelle categorie
          </Button>
        }
      />

      <div className="grid gap-3 sm:grid-cols-2">
        <StatCard title="Categories" value={items.length} />
        <StatCard title="Actives" value={activeCount} variant="success" />
      </div>

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
        emptyDescription="Creez votre premiere categorie pour classer les produits."
        onRowClick={openEdit}
      />

      <FormDialog
        open={list.formOpen}
        onOpenChange={(open) => {
          if (!open) list.closeForm();
          else list.setFormOpen(true);
        }}
        title={list.editing ? "Modifier la categorie" : "Nouvelle categorie"}
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
            placeholder="Ex. Smartphones"
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
