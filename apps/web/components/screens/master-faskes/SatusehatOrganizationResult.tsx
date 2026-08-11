import { CheckCircle2, Link2 } from "lucide-react";
import type { SatusehatOrganizationRemoteSummary } from "@mitrafaskes/shared";
import { ActiveStatusBadge } from "@/components/ActiveStatusBadge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { OrganizationHierarchyBadge } from "./OrganizationHierarchyBadge";

type SatusehatOrganizationResultProps = {
  item: SatusehatOrganizationRemoteSummary;
  selected: boolean;
  checked?: boolean;
  currentLocalResourceId?: string;
  onSelect: () => void;
  onCheckedChange?: (checked: boolean) => void;
};

export function SatusehatOrganizationResult({
  item,
  selected,
  checked,
  currentLocalResourceId,
  onSelect,
  onCheckedChange,
}: SatusehatOrganizationResultProps) {
  const isRoot = !item.parentExternalResourceId;
  const linkedToCurrent = Boolean(
    currentLocalResourceId &&
    item.linkedLocalResourceId === currentLocalResourceId,
  );
  const linkedElsewhere = Boolean(
    item.linkedLocalResourceId && !linkedToCurrent,
  );

  return (
    <Card
      className={
        selected
          ? "border-primary/60 bg-primary/5"
          : "border-border bg-background"
      }
    >
      <CardContent className="flex flex-col gap-3 p-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex min-w-0 flex-1 items-start gap-3">
          {onCheckedChange ? (
            <Checkbox
              checked={Boolean(checked)}
              disabled={linkedElsewhere || linkedToCurrent}
              onCheckedChange={onCheckedChange}
              aria-label={`Pilih ${item.name}`}
              className="mt-0.5"
            />
          ) : null}
          <div className="min-w-0 space-y-1.5">
            <div className="flex flex-wrap items-center gap-2">
              <strong className="text-sm text-foreground">{item.name}</strong>
              <OrganizationHierarchyBadge isRoot={isRoot} />
              <ActiveStatusBadge active={item.active} className="text-[10px]" />
            </div>
            <div className="text-xs text-muted-foreground">
              {item.typeDisplay || item.typeCode || "Organisasi/faskes"}
              {item.parentDisplay ? ` · Induk: ${item.parentDisplay}` : ""}
            </div>
            <p className="font-mono text-[10px] text-muted-foreground">
              ID SATUSEHAT: {item.externalResourceId}
            </p>
            {item.addressText ? (
              <p className="text-xs text-muted-foreground">
                {item.addressText}
              </p>
            ) : null}
            {item.identifiers.length > 0 ? (
              <p className="font-mono text-[10px] text-muted-foreground">
                Kode/nomor dari SATUSEHAT: {item.identifiers[0].value}
              </p>
            ) : null}
            {linkedToCurrent ? (
              <p className="flex items-center gap-1 text-xs font-semibold text-success">
                <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
                Data ini sudah terhubung ke organisasi lokal ini
              </p>
            ) : linkedElsewhere ? (
              <p className="text-xs font-semibold text-destructive">
                Data ini sudah terhubung ke data lokal lain
              </p>
            ) : null}
          </div>
        </div>
        <Button
          type="button"
          size="sm"
          variant={selected ? "default" : "outline"}
          disabled={linkedElsewhere || linkedToCurrent}
          onClick={onSelect}
          className="shrink-0"
        >
          <Link2 className="h-3.5 w-3.5" aria-hidden="true" />
          {selected ? "Dipilih" : "Pilih data ini"}
        </Button>
      </CardContent>
    </Card>
  );
}
