import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center justify-center gap-1.5 rounded-full px-4 py-2 text-sm font-medium transition-colors",
  {
    variants: {
      variant: {
        default: "bg-surface text-foreground",
        outline: "border border-border bg-transparent text-foreground",
        accent: "bg-primary/15 text-primary",
        success: "bg-success/15 text-success",
        warning: "bg-warning/15 text-warning",
        danger: "bg-destructive/15 text-destructive",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

type BadgeProps = React.HTMLAttributes<HTMLSpanElement> &
  VariantProps<typeof badgeVariants>;

export function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <span className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}

type ChipProps = React.ButtonHTMLAttributes<HTMLButtonElement> &
  VariantProps<typeof badgeVariants> & {
    active?: boolean;
  };

export function Chip({
  className,
  variant = "outline",
  active = false,
  ...props
}: ChipProps) {
  return (
    <button
      type="button"
      className={cn(
        badgeVariants({ variant }),
        "cursor-pointer hover:bg-surface-active",
        active && "border-transparent bg-surface-active text-foreground",
        className,
      )}
      {...props}
    />
  );
}

export { badgeVariants };
