import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type PageHeaderProps = {
  title: string;
  description?: string;
  actions?: React.ReactNode;
};

export function PageHeader({ title, description, actions }: PageHeaderProps) {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">
          {title}
        </h1>
        {description ? (
          <p className="mt-1 text-sm text-slate-500">{description}</p>
        ) : null}
      </div>
      {actions ? (
        <div className="flex flex-wrap items-center gap-2">{actions}</div>
      ) : null}
    </div>
  );
}

type StatCardProps = {
  title: string;
  value: string | number;
  subtitle: string;
  icon?: React.ReactNode;
  variant?: "default" | "success" | "warning" | "danger";
};

export function StatCard({
  title,
  value,
  subtitle,
  icon,
  variant = "default",
}: StatCardProps) {
  const variantStyles = {
    default: "border-slate-200/80 bg-white",
    success: "border-emerald-100 bg-white",
    warning: "border-amber-100 bg-amber-50/40",
    danger: "border-red-100 bg-red-50/40",
  };

  return (
    <Card className={cn("p-5", variantStyles[variant])}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-medium text-slate-500">{title}</p>
          <p className="mt-2 truncate text-2xl font-bold text-slate-900">
            {value}
          </p>
          <p className="mt-1 text-xs text-slate-500">{subtitle}</p>
        </div>
        {icon ? (
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-slate-50 text-slate-500">
            {icon}
          </div>
        ) : null}
      </div>
    </Card>
  );
}
