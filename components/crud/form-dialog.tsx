import { Dialog } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

type FormDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  className?: string;
};

export function FormDialog({
  open,
  onOpenChange,
  title,
  description,
  children,
  footer,
  className,
}: FormDialogProps) {
  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title={title}
      description={description}
      className={cn("max-w-lg", className)}
      footer={footer}
    >
      <div className="space-y-4">{children}</div>
    </Dialog>
  );
}
