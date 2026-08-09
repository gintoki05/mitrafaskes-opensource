'use client';

import type { SatusehatPatientPatchOperation } from '@mitrafaskes/shared';

export function PatientPatchPreview({
  payload,
}: {
  payload: SatusehatPatientPatchOperation[];
}) {
  return (
    <div className="space-y-3 rounded-[var(--radius-card)] border border-border bg-background p-4">
      <div>
        <p className="text-sm font-semibold text-foreground">Perubahan yang akan dikirim</p>
        <p className="mt-1 text-xs text-muted-foreground">Record sudah memiliki linkage; SATUSEHAT akan menerima operasi update.</p>
      </div>
      <div className="space-y-2">
        {payload.map((operation, index) => (
          <div key={`${operation.path}-${index}`} className="grid gap-1 rounded-md border border-border bg-muted/20 p-3 sm:grid-cols-[9rem_minmax(0,1fr)]">
            <code className="text-xs font-semibold text-primary">{operation.path}</code>
            <code className="break-all text-xs text-foreground">{formatPatchValue(operation.value)}</code>
          </div>
        ))}
      </div>
    </div>
  );
}

export function isPatientPatchPayload(
  payload: unknown,
): payload is SatusehatPatientPatchOperation[] {
  return Array.isArray(payload);
}

function formatPatchValue(value: unknown): string {
  if (typeof value === 'string') return value;
  try {
    return JSON.stringify(value) ?? 'Belum diisi';
  } catch {
    return 'Nilai tidak dapat ditampilkan';
  }
}
