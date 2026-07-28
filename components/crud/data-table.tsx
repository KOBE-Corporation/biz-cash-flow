import { EmptyState } from "@/components/crud/empty-state";
import { cn } from "@/lib/utils";

export type DataColumn<T> = {
  key: string;
  header: string;
  className?: string;
  hideOnMobile?: boolean;
  cell: (row: T) => React.ReactNode;
};

type DataTableProps<T> = {
  rows: T[];
  columns: DataColumn<T>[];
  rowKey: (row: T) => string;
  emptyTitle?: string;
  emptyDescription?: string;
  onRowClick?: (row: T) => void;
  className?: string;
};

export function DataTable<T>({
  rows,
  columns,
  rowKey,
  emptyTitle = "Aucun element",
  emptyDescription,
  onRowClick,
  className,
}: DataTableProps<T>) {
  if (rows.length === 0) {
    return (
      <EmptyState title={emptyTitle} description={emptyDescription} />
    );
  }

  return (
    <div className={cn("space-y-3", className)}>
      <div className="hidden overflow-hidden rounded-2xl border border-border md:block">
        <table className="w-full min-w-0 text-left text-sm">
          <thead className="border-b border-border bg-surface-2 text-xs uppercase tracking-wide text-muted-foreground">
            <tr>
              {columns.map((column) => (
                <th
                  key={column.key}
                  className={cn("px-4 py-3 font-medium", column.className)}
                >
                  {column.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr
                key={rowKey(row)}
                className={cn(
                  "border-b border-border last:border-0",
                  onRowClick && "cursor-pointer hover:bg-surface-active/60",
                )}
                onClick={() => onRowClick?.(row)}
              >
                {columns.map((column) => (
                  <td
                    key={column.key}
                    className={cn("px-4 py-3 align-middle", column.className)}
                  >
                    {column.cell(row)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="grid gap-2 md:hidden">
        {rows.map((row) => (
          <div
            key={rowKey(row)}
            role={onRowClick ? "button" : undefined}
            tabIndex={onRowClick ? 0 : undefined}
            className={cn(
              "rounded-2xl border border-border bg-card p-3 text-left shadow-card",
              onRowClick &&
                "cursor-pointer active:bg-surface-active focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40",
            )}
            onClick={() => onRowClick?.(row)}
            onKeyDown={(event) => {
              if (!onRowClick) return;
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                onRowClick(row);
              }
            }}
          >
            <dl className="space-y-2">
              {columns
                .filter((column) => !column.hideOnMobile)
                .map((column) => (
                  <div
                    key={column.key}
                    className="flex items-start justify-between gap-3"
                  >
                    <dt className="text-[11px] text-muted-foreground">
                      {column.header}
                    </dt>
                    <dd className="min-w-0 text-right text-sm text-foreground">
                      {column.cell(row)}
                    </dd>
                  </div>
                ))}
            </dl>
          </div>
        ))}
      </div>
    </div>
  );
}
