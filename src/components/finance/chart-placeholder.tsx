import { BarChart3 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function ChartPlaceholder({
  title,
  description,
  height = 260,
}: {
  title: string;
  description?: string;
  height?: number;
}) {
  return (
    <Card className="border-border/70">
      <CardHeader>
        <CardTitle className="text-base font-semibold">{title}</CardTitle>
        {description && <p className="text-sm text-muted-foreground">{description}</p>}
      </CardHeader>
      <CardContent>
        <div
          className="grid place-items-center rounded-lg border border-dashed border-border bg-muted/30 text-muted-foreground"
          style={{ height }}
        >
          <div className="flex flex-col items-center gap-2 text-sm">
            <BarChart3 className="h-6 w-6 opacity-60" />
            Chart coming soon
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
