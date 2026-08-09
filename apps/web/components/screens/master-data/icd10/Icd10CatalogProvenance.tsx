import type { Icd10Summary } from '@mitrafaskes/shared';
import { Database } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

function distinct(values: string[]): string[] {
  return [...new Set(values)];
}

export function Icd10CatalogProvenance({
  items,
}: {
  items: Icd10Summary[];
}) {
  const sources = distinct(items.map((item) => item.source));
  const sourceVersions = distinct(
    items
      .map((item) => item.sourceVersion)
      .filter((version): version is string => Boolean(version)),
  );

  return (
    <Card size="sm" className="border-info/25 bg-info/5">
      <CardHeader className="border-b border-info/15">
        <CardTitle className="flex items-center gap-2 text-sm">
          <Database className="h-4 w-4 text-info" aria-hidden="true" />
          Provenance snapshot lokal
          <Badge variant="secondary">Read-only</Badge>
        </CardTitle>
        <CardDescription>
          Metadata berikut diambil dari record ICD-10 yang sedang tampil. Tidak
          ada refresh provider atau CRUD dari katalog ini.
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-3">
        <dl className="grid gap-3 text-xs sm:grid-cols-2">
          <div>
            <dt className="text-muted-foreground">Source</dt>
            <dd className="mt-1 font-mono font-semibold text-foreground">
              {sources.length > 0 ? sources.join(', ') : 'Belum tersedia'}
            </dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Source version</dt>
            <dd className="mt-1 font-mono font-semibold text-foreground">
              {sourceVersions.length > 0
                ? sourceVersions.join(', ')
                : 'Belum tersedia'}
            </dd>
          </div>
        </dl>
      </CardContent>
    </Card>
  );
}
