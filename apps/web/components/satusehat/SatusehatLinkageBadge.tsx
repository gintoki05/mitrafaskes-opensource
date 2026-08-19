'use client';

import { useState } from 'react';
import Image from 'next/image';
import { Check, Copy } from 'lucide-react';
import type {
  ResourceIntegrationLinkage,
  ResourceIntegrationSync,
} from '@mitrafaskes/shared';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { useIntegrationCapability } from '@/hooks/useIntegrationCapabilities';
import { formatSatusehatRemoteStatus } from './satusehat-status';

type SatusehatLinkageBadgeProps = {
  linkage?: ResourceIntegrationLinkage;
  latestSync?: ResourceIntegrationSync;
  resourceName: string;
};

export function SatusehatLinkageBadge({
  linkage,
  latestSync,
  resourceName,
}: SatusehatLinkageBadgeProps) {
  const { available } = useIntegrationCapability('SATUSEHAT');
  const [copied, setCopied] = useState(false);

  if (!available) return null;

  if (!linkage) {
    return (
      <span
        className="inline-flex items-center gap-1.5 whitespace-nowrap text-xs font-semibold text-muted-foreground"
        title={`${resourceName} belum terhubung ke SATUSEHAT.`}
      >
        <span className="flex h-6 w-6 shrink-0 overflow-hidden rounded border border-border bg-white">
          <Image
            src="/satusehat.png"
            alt=""
            width={40}
            height={40}
            className="h-full w-full object-cover grayscale"
          />
        </span>
        <span className="text-foreground">SATUSEHAT</span>
        <span>· Belum terhubung</span>
      </span>
    );
  }

  const lastSyncedLabel = linkage.lastSyncedAt
    ? ` Terakhir: ${new Intl.DateTimeFormat('id-ID', {
        dateStyle: 'medium',
        timeStyle: 'short',
      }).format(new Date(linkage.lastSyncedAt))}.`
    : '';
  const remoteStatusLabel = formatSatusehatRemoteStatus(linkage.remoteStatus);
  const latestSyncFailed = latestSync?.status === 'FAILED';
  const statusClassName = latestSyncFailed ? 'text-warning' : 'text-success';

  const copyExternalId = async () => {
    try {
      await navigator.clipboard.writeText(linkage.externalResourceId);
      setCopied(true);
      toast.success('ID SATUSEHAT berhasil disalin.');
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      toast.error('ID SATUSEHAT tidak dapat disalin.');
    }
  };

  return (
    <span
      className={`inline-flex min-w-0 flex-wrap items-center gap-1.5 text-xs font-semibold sm:flex-nowrap ${statusClassName}`}
      title={`Terhubung ke SATUSEHAT. ${resourceName}.${remoteStatusLabel ? ` Status SATUSEHAT: ${remoteStatusLabel}.` : ''}${lastSyncedLabel}${latestSyncFailed ? ` Sinkronisasi terakhir gagal${latestSync.errorMessage ? `: ${latestSync.errorMessage}` : '.'}` : ''}`}
    >
      <span className={`flex h-6 w-6 shrink-0 overflow-hidden rounded border bg-white ${latestSyncFailed ? 'border-warning/25' : 'border-success/25'}`}>
        <Image
          src="/satusehat.png"
          alt=""
          width={40}
          height={40}
          className="h-full w-full object-cover"
        />
      </span>
      <span className="text-foreground">SATUSEHAT</span>
      <span aria-hidden="true">·</span>
      <span>Terhubung</span>
      {remoteStatusLabel ? (
        <span className="font-medium text-foreground">
          · Status: {remoteStatusLabel}
        </span>
      ) : null}
      <Button
        type="button"
        variant="ghost"
        size="icon-xs"
        onClick={() => void copyExternalId()}
        aria-label={`Salin ID SATUSEHAT untuk ${resourceName}`}
        title="Salin ID SATUSEHAT"
        className={
          latestSyncFailed
            ? 'min-h-9 min-w-9 text-warning hover:bg-warning/10 hover:text-warning sm:min-h-8 sm:min-w-8'
            : 'min-h-9 min-w-9 text-success hover:bg-success/10 hover:text-success sm:min-h-8 sm:min-w-8'
        }
      >
        {copied ? (
          <Check className="h-3.5 w-3.5" aria-hidden="true" />
        ) : (
          <Copy className="h-3.5 w-3.5" aria-hidden="true" />
        )}
      </Button>
      <span className="sr-only">
        {resourceName} terhubung ke SATUSEHAT
        {remoteStatusLabel ? ` dengan status ${remoteStatusLabel}` : ''}; gunakan tombol salin untuk menyalin ID.
        {copied ? ' ID berhasil disalin.' : ''}
      </span>
    </span>
  );
}
