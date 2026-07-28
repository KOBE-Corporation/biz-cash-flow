import { Card, CardContent } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";

type ModulePlaceholderProps = {
  title: string;
  description: string;
  features: string[];
};

export function ModulePlaceholder({
  title,
  description,
  features,
}: ModulePlaceholderProps) {
  return (
    <div className="space-y-8">
      <PageHeader title={title} description={description} />
      <Card>
        <CardContent className="py-10">
          <p className="mb-4 text-sm font-medium text-foreground">
            Fonctionnalites prevues pour ce module :
          </p>
          <ul className="grid gap-2 sm:grid-cols-2">
            {features.map((feature) => (
              <li
                key={feature}
                className="rounded-xl bg-surface-2 px-4 py-3 text-sm text-muted-foreground"
              >
                {feature}
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
