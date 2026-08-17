'use client';

import { Copy, RefreshCw } from 'lucide-react';
import { ScreenState } from '@/components/ScreenState';
import { Button } from '@/components/ui/button';
import type { RmeVersionConflict } from './rme-workspace-model';

export function RmeConflictNotice({
  conflict,
  localVersion,
  onCopyDraft,
  onReload,
}: {
  conflict: RmeVersionConflict;
  localVersion: number;
  onCopyDraft: () => Promise<void>;
  onReload: () => void;
}) {
  const versionDetail = conflict.currentVersion === undefined
    ? `Versi lokal yang sedang dibuka: ${localVersion}.`
    : `Versi lokal ${localVersion}; versi server ${conflict.currentVersion}.`;

  return (
    <ScreenState
      kind="error"
      compact
      title="Konflik versi draft"
      description={`${conflict.message} ${versionDetail} Salin perubahan bila perlu, lalu muat versi terbaru sebelum menyimpan lagi.`}
      action={(
        <>
          <Button type="button" size="sm" variant="outline" onClick={() => void onCopyDraft()}>
            <Copy className="h-4 w-4" aria-hidden="true" />
            Salin draft saya
          </Button>
          <Button type="button" size="sm" onClick={onReload}>
            <RefreshCw className="h-4 w-4" aria-hidden="true" />
            Muat versi terbaru
          </Button>
        </>
      )}
    />
  );
}
