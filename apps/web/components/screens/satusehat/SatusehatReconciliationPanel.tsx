'use client';

import { AlertTriangle, CheckCircle2, RefreshCw, ShieldAlert } from 'lucide-react';
import type { IntegrationReconciliationResponse } from '@mitrafaskes/shared';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

type SatusehatReconciliationPanelProps = {
  report: IntegrationReconciliationResponse | null;
  loading: boolean;
  error: string;
  onReconcile: () => void;
};

const issueLabels: Record<string, string> = {
  LINKAGE_WITHOUT_SUCCESS_LOG: 'Linkage tanpa log sukses',
  SUCCESS_LOG_WITHOUT_LINKAGE: 'Log sukses tanpa linkage',
  SUCCESS_LOG_LINKAGE_MISMATCH: 'ID log dan linkage berbeda',
  STALE_PENDING_LOG: 'Log pending terlalu lama',
};

export function SatusehatReconciliationPanel({
  report,
  loading,
  error,
  onReconcile,
}: SatusehatReconciliationPanelProps) {
  return (
    <Card>
      <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-3 border-b border-border">
        <div>
          <CardTitle className="flex items-center gap-2 text-sm font-bold text-foreground">
            <ShieldAlert className="h-4 w-4 text-primary" aria-hidden="true" />
            Rekonsiliasi linkage dan log
          </CardTitle>
          <p className="mt-1 text-xs text-muted-foreground">
            Pemeriksaan read-only; linkage tidak dihapus atau diperbaiki otomatis.
          </p>
        </div>
        <Button
          type="button"
          size="sm"
          variant="secondary"
          onClick={onReconcile}
          disabled={loading}
          aria-busy={loading}
          title="Periksa konsistensi linkage dan log SATUSEHAT"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? 'motion-safe:animate-spin' : ''}`} aria-hidden="true" />
          {loading ? 'Memeriksa...' : 'Cek konsistensi'}
        </Button>
      </CardHeader>
      <CardContent className="space-y-3 pt-4" aria-live="polite">
        {error ? (
          <p className="rounded-[var(--radius-card)] border border-destructive/30 bg-destructive/5 p-3 text-xs text-destructive">
            {error}
          </p>
        ) : null}
        {!report && !error ? (
          <p className="text-xs text-muted-foreground">
            Jalankan pemeriksaan untuk mendeteksi log dan linkage yang tidak konsisten.
          </p>
        ) : null}
        {report ? (
          <>
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <Badge variant="outline">{report.checkedLinks} linkage diperiksa</Badge>
              <Badge variant="outline">{report.checkedLogs} log diperiksa</Badge>
              <span className="text-muted-foreground">
                {new Date(report.checkedAt).toLocaleString('id-ID')}
              </span>
            </div>
            {report.issues.length === 0 ? (
              <div className="flex items-center gap-2 rounded-[var(--radius-card)] border border-success/30 bg-success/5 p-3 text-xs text-success">
                <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
                Tidak ditemukan inkonsistensi pada environment {report.environment}.
              </div>
            ) : (
              <div className="space-y-2">
                {report.issues.map((issue, index) => (
                  <div
                    key={`${issue.code}-${issue.resourceType}-${issue.resourceId}-${index}`}
                    className="flex min-w-0 gap-2 rounded-[var(--radius-card)] border border-warning/30 bg-warning/5 p-3 text-xs"
                  >
                    {issue.severity === 'ERROR' ? (
                      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" aria-hidden="true" />
                    ) : (
                      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-warning" aria-hidden="true" />
                    )}
                    <div className="min-w-0 space-y-1">
                      <p className="font-semibold text-foreground">
                        {issueLabels[issue.code] ?? issue.code}
                      </p>
                      <p className="text-muted-foreground">{issue.message}</p>
                      <p className="truncate font-mono text-[11px] text-muted-foreground">
                        {issue.resourceType} / {issue.resourceId}
                        {issue.externalResourceId ? ` / ${issue.externalResourceId}` : ''}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        ) : null}
      </CardContent>
    </Card>
  );
}
