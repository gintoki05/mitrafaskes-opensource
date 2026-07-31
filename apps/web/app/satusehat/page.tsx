'use client';

import React, { useEffect, useState } from 'react';
import { RefreshCw, CheckCircle2, AlertTriangle, Clock, Code } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AccessPermission } from '@mitrafaskes/shared';
import { RouteGuard } from '@/components/RouteGuard';
import { apiFetch, can, getSession } from '@/lib/auth';

export default function SatusehatPage() {
  const [logs, setLogs] = useState<any[]>([]);
  const [selectedLog, setSelectedLog] = useState<any | null>(null);
  const [loading, setLoading] = useState(false);
  const canReadPayload = can(getSession()?.user ?? null, AccessPermission.SYNC_PAYLOAD_READ);
  const canRetry = can(getSession()?.user ?? null, AccessPermission.SYNC_RETRY);

  const fetchLogs = async () => {
    try {
      const res = await apiFetch('http://localhost:4000/api/satusehat/logs');
      const data = await res.json();
      setLogs(data);
      if (data.length > 0 && !selectedLog) {
        setSelectedLog(data[0]);
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  const handleRetrySync = async (logId: string) => {
    setLoading(true);
    try {
      const res = await apiFetch(`http://localhost:4000/api/satusehat/sync/${logId}/retry`, {
        method: 'POST',
      });
      if (res.ok) {
        fetchLogs();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <RouteGuard permission={AccessPermission.SYNC_STATUS_READ}>
    <div className="space-y-8">
      {/* Header Banner */}
      <div className="clinical-panel flex flex-col justify-between gap-4 p-6 md:flex-row md:items-center">
        <div>
          <h1 className="flex items-center gap-2 text-xl font-bold text-foreground">
            <RefreshCw className="h-6 w-6 text-primary" />
            SATUSEHAT Kemenkes Sync Audit Log
          </h1>
          <p className="mt-1 text-xs text-muted-foreground">
            Audit Trail Payload HL7 FHIR (Encounter, Condition, Observation) & Automatic Retry Engine
          </p>
        </div>
        <Button
          onClick={fetchLogs}
          variant="secondary"
          className="border-primary/20 text-xs font-semibold text-primary"
        >
          <RefreshCw className="w-4 h-4 mr-1.5" />
          Refresh Log
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Log List */}
        <div className="lg:col-span-2 space-y-4">
          <Card className="overflow-hidden">
            <CardHeader className="flex flex-row items-center justify-between border-b border-border px-6 py-4">
              <CardTitle className="text-sm font-bold text-foreground">Daftar Log Riwayat Sinkronisasi</CardTitle>
              <Badge className="border-primary/30 bg-primary/10 font-mono text-xs font-bold text-primary">
                {logs.length} Log Total
              </Badge>
            </CardHeader>

            <div className="divide-y divide-border">
              {logs.map(log => (
                <div
                  key={log.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => setSelectedLog(log)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault();
                      setSelectedLog(log);
                    }
                  }}
                  aria-pressed={selectedLog?.id === log.id}
                  className={`flex w-full cursor-pointer items-center justify-between gap-4 p-4 text-left transition-colors ${
                    selectedLog?.id === log.id ? 'bg-primary/10' : 'hover:bg-muted'
                  }`}
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <Badge className="border-primary/30 bg-primary/10 font-mono text-xs font-bold text-primary">
                        {log.resourceType}
                      </Badge>
                      <span className="font-mono text-xs text-muted-foreground">ID: {log.resourceId}</span>
                    </div>
                    <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                      <Clock className="w-3 h-3" />
                      <span>{new Date(log.updatedAt).toLocaleString('id-ID')}</span>
                      {log.satusehatId && (
                        <span className="font-mono text-success">SATUSEHAT ID: {log.satusehatId}</span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
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
                        onClick={(e: React.MouseEvent) => {
                          e.stopPropagation();
                          handleRetrySync(log.id);
                        }}
                        disabled={loading}
                        className="border-primary/30 bg-primary/10 text-[11px] font-semibold text-primary hover:bg-primary/15"
                      >
                        Retry
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>

        {/* Right Column: FHIR Payload Inspector */}
        {canReadPayload && <div className="space-y-4">
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
                  <div className="flex items-center justify-between border-b border-border pb-2 text-xs">
                    <span className="text-muted-foreground">Resource: <strong className="font-mono text-primary">{selectedLog.resourceType}</strong></span>
                    <span className="font-mono text-muted-foreground">ID: {selectedLog.id}</span>
                  </div>

                  <div className="relative">
                    <pre className="max-h-96 overflow-x-auto rounded-[var(--radius-card)] border border-border bg-muted p-4 font-mono text-[11px] text-foreground">
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
