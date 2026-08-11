'use client';

import { useEffect, type MouseEvent } from 'react';
import { RefreshCw, CheckCircle2, AlertTriangle, Clock, Code } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { PaginationControl } from '@/components/ui/pagination';
import { AccessPermission } from '@mitrafaskes/shared';
import { RouteGuard } from '@/components/RouteGuard';
import { can } from '@/lib/auth';
import { PageHeader } from '@/components/PageHeader';
import { ScreenState } from '@/components/ScreenState';
import { useSession } from '@/hooks/useSession';
import { useSyncLogs } from '@/hooks/useSyncLogs';
import { useIntegrationCapability } from '@/hooks/useIntegrationCapabilities';
import { toast } from 'sonner';

export default function SatusehatPage() {
  const session = useSession();
  const satusehat = useIntegrationCapability('SATUSEHAT');
  const canReadPayload = can(session?.user ?? null, AccessPermission.SYNC_PAYLOAD_READ);
  const canRetry = can(session?.user ?? null, AccessPermission.SYNC_RETRY);
  const {
    logs,
    logsMeta,
    selectedLog,
    logsLoading,
    retryingId,
    error,
    retryError,
    successMessage,
    refresh,
    retry,
    selectLog,
  } = useSyncLogs(satusehat.available);
  const totalPages = Math.max(1, Math.ceil(logsMeta.total / logsMeta.pageSize));

  useEffect(() => {
    if (successMessage) {
      toast.success('Retry diminta', { description: successMessage });
    }
  }, [successMessage]);

  useEffect(() => {
    if (retryError) {
      toast.error('Retry sinkronisasi gagal', {
        description: retryError,
        duration: 7000,
      });
    }
  }, [retryError]);

  return (
    <RouteGuard
      permission={AccessPermission.SYNC_STATUS_READ}
      integrationProvider="SATUSEHAT"
    >
    <div className="min-w-0 space-y-6 sm:space-y-8">
      <PageHeader
        icon={<RefreshCw className="h-6 w-6" />}
        title="Monitoring Sinkronisasi SATUSEHAT"
        description="Status pengiriman resource HL7 FHIR dan tindakan retry yang tersedia sesuai izin pengguna."
        action={
          <Button
            onClick={() => void refresh(logsMeta.page)}
            variant="secondary"
            disabled={logsLoading}
            aria-busy={logsLoading}
            className="border-primary/20 text-xs font-semibold text-primary"
          >
            <RefreshCw className={`h-4 w-4 ${logsLoading ? 'motion-safe:animate-spin' : ''}`} />
            Muat ulang log
          </Button>
        }
      />

      {error ? <ScreenState kind="error" title="Sinkronisasi tidak tersedia" description={error} compact /> : null}

      <div className={`grid min-w-0 grid-cols-1 gap-6 lg:gap-8 ${canReadPayload ? 'lg:grid-cols-3' : ''}`}>
        {/* Left Column: Log List */}
        <div className={`min-w-0 space-y-4 ${canReadPayload ? 'lg:col-span-2' : ''}`}>
          <Card className="overflow-hidden">
            <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2 border-b border-border px-4 py-4 sm:px-6">
              <CardTitle className="text-sm font-bold text-foreground">Daftar Log Riwayat Sinkronisasi</CardTitle>
              <Badge className="border-primary/30 bg-primary/10 font-mono text-xs font-bold text-primary">
                {logsMeta.total} Log Total
              </Badge>
            </CardHeader>

            <div className="divide-y divide-border">
              {logsLoading ? (
                <div className="p-4">
                  <ScreenState kind="loading" title="Memuat log sinkronisasi" description="Status terbaru sedang diambil." />
                </div>
              ) : logs.length === 0 && !error ? (
                <div className="p-4">
                  <ScreenState
                    kind="empty"
                    title="Belum ada log sinkronisasi"
                    description="Riwayat akan muncul setelah proses sinkronisasi tersedia."
                  />
                </div>
              ) : logs.map(log => (
                <div
                  key={log.id}
                  className={`flex min-w-0 flex-col gap-3 p-4 transition-colors sm:flex-row sm:items-center sm:justify-between ${
                    selectedLog?.id === log.id ? 'bg-primary/10' : 'hover:bg-muted'
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => selectLog(log)}
                    aria-pressed={selectedLog?.id === log.id}
                    className="min-w-0 flex-1 rounded-[var(--radius-control)] text-left"
                  >
                  <div className="min-w-0 space-y-1">
                    <div className="flex items-center gap-2">
                      <Badge className="border-primary/30 bg-primary/10 font-mono text-xs font-bold text-primary">
                        {log.resourceType}
                      </Badge>
                      <span className="min-w-0 truncate font-mono text-xs text-muted-foreground">ID: {log.resourceId}</span>
                    </div>
                    <div className="flex min-w-0 flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
                      <Clock className="w-3 h-3" />
                      <span>{new Date(log.updatedAt).toLocaleString('id-ID')}</span>
                      {log.externalResourceId && (
                        <span className="font-mono text-success">ID eksternal: {log.externalResourceId}</span>
                      )}
                    </div>
                  </div>
                  </button>

                  <div className="flex shrink-0 flex-wrap items-center gap-3">
                    <Badge
                      className={
                        log.status === 'SUCCESS'
                          ? 'clinical-status-success border text-[10px] font-bold'
                          : log.status === 'PENDING'
                          ? 'clinical-status-warning border text-[10px] font-bold'
                          : 'clinical-status-error border text-[10px] font-bold'
                      }
                    >
                      {log.status === 'SUCCESS' ? (
                        <>
                          <CheckCircle2 className="w-3 h-3 mr-1 inline" /> SUKSES
                        </>
                      ) : log.status === 'PENDING' ? (
                        <>
                          <Clock className="w-3 h-3 mr-1 inline" /> PENDING
                        </>
                      ) : (
                        <>
                          <AlertTriangle className="w-3 h-3 mr-1 inline" /> GAGAL
                        </>
                      )}
                    </Badge>

                      {canRetry && log.status !== 'SUCCESS' && (
                        <Button
                          size="sm"
                        onClick={(e: MouseEvent<HTMLButtonElement>) => {
                          e.stopPropagation();
                          void retry(log.id, logsMeta.page);
                        }}
                          disabled={retryingId !== null || !satusehat.configured}
                          aria-busy={retryingId === log.id}
                          title={!satusehat.configured ? 'Kredensial SATUSEHAT belum dikonfigurasi' : 'Retry sinkronisasi'}
                        className="border-primary/30 bg-primary/10 text-[11px] font-semibold text-primary hover:bg-primary/15"
                      >
                        {retryingId === log.id ? 'Mencoba ulang...' : 'Retry'}
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
            {totalPages > 1 ? (
              <div className="flex flex-col gap-2 border-t border-border bg-muted/30 px-4 py-3 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between sm:px-6">
                <span>
                  Halaman {logsMeta.page} dari {totalPages} · {logsMeta.total} log
                </span>
                <PaginationControl
                  page={logsMeta.page}
                  totalPages={totalPages}
                  onPageChange={(page) => void refresh(page)}
                  disabled={logsLoading}
                  showLabels={false}
                  aria-label="Navigasi halaman log sinkronisasi"
                  className="mx-0 w-auto"
                />
              </div>
            ) : null}
          </Card>
        </div>

        {/* Right Column: FHIR Payload Inspector */}
        {canReadPayload && <div className="min-w-0 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-sm font-bold text-foreground">
                <Code className="h-4 w-4 text-primary" />
                Inspector Payload HL7 FHIR
              </CardTitle>
            </CardHeader>
            <CardContent>
              {selectedLog ? (
                <div className="space-y-3">
                  <div className="flex min-w-0 flex-wrap items-center justify-between gap-2 border-b border-border pb-2 text-xs">
                    <span className="text-muted-foreground">Resource: <strong className="font-mono text-primary">{selectedLog.resourceType}</strong></span>
                    <span className="font-mono text-muted-foreground">ID: {selectedLog.id}</span>
                  </div>

                  <div className="relative">
                    <pre className="max-h-96 max-w-full overflow-auto rounded-[var(--radius-card)] border border-border bg-muted p-4 font-mono text-[11px] text-foreground">
                      {JSON.stringify(selectedLog.payload, null, 2)}
                    </pre>
                  </div>
                </div>
              ) : (
                <div className="py-8 text-center text-xs text-muted-foreground">
                  Pilih log di sebelah kiri untuk melihat payload FHIR JSON.
                </div>
              )}
            </CardContent>
          </Card>
        </div>}
      </div>
    </div>
    </RouteGuard>
  );
}
