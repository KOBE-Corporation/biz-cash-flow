import { cva, type VariantProps } from "class-variance-authority";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type PageHeaderProps = {
  title: string;
  description?: string;
  actions?: React.ReactNode;
  className?: string;
  titleClassName?: string;
};

export function PageHeader({
  title,
  description,
  actions,
  className,
  titleClassName,
}: PageHeaderProps) {
  return (
    <div
      className={cn(
        "flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between",
        className,
      )}
    >
      <div>
        <h1
          className={cn(
            "text-2xl font-bold tracking-tight text-foreground sm:text-3xl",
            titleClassName,
          )}
        >
          {title}
        </h1>
        {description ? (
          <p className="mt-1.5 text-sm text-muted-foreground">{description}</p>
        ) : null}
      </div>
      {actions ? (
        <div className="flex flex-wrap items-center gap-2">{actions}</div>
      ) : null}
    </div>
  );
}

const statCardVariants = cva("border-border bg-card p-5", {
  variants: {
    variant: {
      default: "",
      success: "border-success/20",
      warning: "border-warning/20",
      danger: "border-destructive/20",
    },
  },
  defaultVariants: {
    variant: "default",
  },
});

type StatCardProps = {
  title: string;
  value: string | number;
  subtitle?: string;
  icon?: React.ReactNode;
} & VariantProps<typeof statCardVariants>;

export function StatCard({
  title,
  value,
  subtitle,
  icon,
  variant = "default",
}: StatCardProps) {
  return (
    <Card className={cn(statCardVariants({ variant }))}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-3xl font-bold tracking-tight text-foreground">
            {value}
          </p>
          <p className="mt-2 text-sm text-muted-foreground">{title}</p>
          {subtitle ? (
            <p className="mt-0.5 text-xs text-muted-foreground/70">{subtitle}</p>
          ) : null}
        </div>
        {icon ? (
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-surface-active text-muted-foreground">
            {icon}
          </div>
        ) : null}
      </div>
    </Card>
  );
}
