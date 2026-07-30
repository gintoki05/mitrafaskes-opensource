'use client';

import React, { useEffect, useState } from 'react';
import { RefreshCw, CheckCircle2, AlertTriangle, Clock, Code } from 'lucide-react';

export default function SatusehatPage() {
  const [logs, setLogs] = useState<any[]>([]);
  const [selectedLog, setSelectedLog] = useState<any | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchLogs = async () => {
    try {
      const res = await fetch('http://localhost:4000/api/satusehat/logs');
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
      const res = await fetch(`http://localhost:4000/api/satusehat/sync/${logId}/retry`, {
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
    <div className="space-y-8">
      {/* Header Banner */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <RefreshCw className="w-6 h-6 text-teal-400" />
            SATUSEHAT Kemenkes Sync Audit Log
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Audit Trail Payload HL7 FHIR (Encounter, Condition, Observation) & Automatic Retry Engine
          </p>
        </div>
        <button
          onClick={fetchLogs}
          className="flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-teal-400 border border-teal-500/20 text-xs font-semibold transition-all"
        >
          <RefreshCw className="w-4 h-4" />
          Refresh Log
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Log List */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-800 flex justify-between items-center">
              <h2 className="text-sm font-bold text-slate-200">Daftar Log Riwayat Sinkronisasi</h2>
              <span className="text-[11px] text-teal-400 font-mono font-semibold">{logs.length} Log Total</span>
            </div>

            <div className="divide-y divide-slate-800/60">
              {logs.map(log => (
                <div
                  key={log.id}
                  onClick={() => setSelectedLog(log)}
                  className={`p-4 cursor-pointer transition-colors flex items-center justify-between gap-4 ${
                    selectedLog?.id === log.id ? 'bg-slate-800/80' : 'hover:bg-slate-800/40'
                  }`}
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded bg-teal-500/10 text-teal-400 border border-teal-500/30 text-xs font-mono font-bold">
                        {log.resourceType}
                      </span>
                      <span className="text-xs font-mono text-slate-400">ID: {log.resourceId}</span>
                    </div>
                    <div className="text-[11px] text-slate-500 flex items-center gap-2">
                      <Clock className="w-3 h-3" />
                      <span>{new Date(log.updatedAt).toLocaleString('id-ID')}</span>
                      {log.satusehatId && (
                        <span className="text-emerald-400 font-mono">SATUSEHAT ID: {log.satusehatId}</span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <span
                      className={`px-2.5 py-1 rounded-md text-[10px] font-bold flex items-center gap-1 ${
                        log.status === 'SUCCESS'
                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                          : log.status === 'PENDING'
                          ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                          : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                      }`}
                    >
                      {log.status === 'SUCCESS' ? (
                        <>
                          <CheckCircle2 className="w-3 h-3" /> SUKSES
                        </>
                      ) : log.status === 'PENDING' ? (
                        <>
                          <Clock className="w-3 h-3" /> PENDING
                        </>
                      ) : (
                        <>
                          <AlertTriangle className="w-3 h-3" /> GAGAL
                        </>
                      )}
                    </span>

                    {log.status !== 'SUCCESS' && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRetrySync(log.id);
                        }}
                        disabled={loading}
                        className="px-2.5 py-1 rounded-lg bg-teal-500/20 hover:bg-teal-500/30 text-teal-300 border border-teal-500/30 text-[11px] font-semibold transition-all"
                      >
                        Retry
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column: FHIR Payload Inspector */}
        <div className="space-y-4">
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 space-y-4">
            <h2 className="text-sm font-bold text-white flex items-center gap-2">
              <Code className="w-4 h-4 text-teal-400" />
              Inspector Payload HL7 FHIR
            </h2>

            {selectedLog ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between text-xs border-b border-slate-800 pb-2">
                  <span className="text-slate-400">Resource: <strong className="text-teal-400">{selectedLog.resourceType}</strong></span>
                  <span className="text-slate-400 font-mono">ID: {selectedLog.id}</span>
                </div>

                <div className="relative">
                  <pre className="p-4 rounded-xl bg-slate-950 border border-slate-800 text-teal-300 text-[11px] font-mono overflow-x-auto max-h-96">
                    {JSON.stringify(selectedLog.payload, null, 2)}
                  </pre>
                </div>
              </div>
            ) : (
              <div className="text-xs text-slate-500 text-center py-8">
                Pilih log di sebelah kiri untuk melihat payload FHIR JSON.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
