import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

type OrganizationHierarchyBadgeProps = {
  isRoot: boolean;
  className?: string;
};

export function OrganizationHierarchyBadge({
  isRoot,
  className,
}: OrganizationHierarchyBadgeProps) {
  return (
    <Badge
      variant="outline"
      title={
        isRoot
          ? "Organization induk/root tanpa parent"
          : "Sub-organisasi yang memiliki Organization induk"
      }
      className={cn(
        "text-[10px] font-bold",
        isRoot
          ? "border-primary/30 bg-primary/10 text-primary"
          : "border-border bg-muted/50 text-muted-foreground",
        className,
      )}
    >
      {isRoot ? "ROOT / INDUK" : "SUB-ORGANISASI"}
    </Badge>
  );
}
