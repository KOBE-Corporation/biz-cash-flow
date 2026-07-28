import { cn } from "@/lib/utils";

type StockMeterProps = {
  percent: number;
  status: "ok" | "low" | "out";
  className?: string;
};

export function StockMeter({ percent, status, className }: StockMeterProps) {
  return (
    <div
      className={cn("h-1.5 w-full overflow-hidden rounded-full bg-surface-active", className)}
      aria-hidden
    >
      <div
        className={cn(
          "h-full rounded-full transition-all duration-300",
          status === "ok" && "bg-success",
          status === "low" && "bg-warning",
          status === "out" && "bg-destructive",
        )}
        style={{ width: `${Math.min(100, Math.max(0, percent))}%` }}
      />
    </div>
  );
}
