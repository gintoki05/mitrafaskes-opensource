'use client';

import { useState } from 'react';
import Image from 'next/image';
import { Check, Copy } from 'lucide-react';
import type { ResourceIntegrationLinkage } from '@mitrafaskes/shared';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { useIntegrationCapability } from '@/hooks/useIntegrationCapabilities';

type SatusehatLinkageBadgeProps = {
  linkage?: ResourceIntegrationLinkage;
  resourceName: string;
};

export function SatusehatLinkageBadge({
  linkage,
  resourceName,
}: SatusehatLinkageBadgeProps) {
  const { available } = useIntegrationCapability('SATUSEHAT');
  const [copied, setCopied] = useState(false);

  if (!available) return null;

  if (!linkage) {
    return (
      <span
        className="inline-flex items-center gap-1.5 whitespace-nowrap text-[11px] font-semibold text-muted-foreground"
        title={`${resourceName} belum memiliki linkage SATUSEHAT.`}
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
        <span>Belum tersinkron</span>
      </span>
    );
  }

  const lastSyncedLabel = linkage.lastSyncedAt
    ? ` Terakhir: ${new Intl.DateTimeFormat('id-ID', {
        dateStyle: 'medium',
        timeStyle: 'short',
      }).format(new Date(linkage.lastSyncedAt))}.`
    : '';

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
      className="inline-flex whitespace-nowrap items-center gap-1.5 text-xs font-semibold text-success"
      title={`Terhubung ke SATUSEHAT. ${resourceName}.${lastSyncedLabel}`}
    >
      <span className="flex h-6 w-6 shrink-0 overflow-hidden rounded border border-success/25 bg-white">
        <Image
          src="/satusehat.png"
          alt=""
          width={40}
          height={40}
          className="h-full w-full object-cover"
        />
      </span>
      <span>Terhubung</span>
      <Button
        type="button"
        variant="ghost"
        size="icon-xs"
        onClick={() => void copyExternalId()}
        aria-label={`Salin ID SATUSEHAT untuk ${resourceName}`}
        title="Salin ID SATUSEHAT"
        className="text-success hover:bg-success/10 hover:text-success"
      >
        {copied ? (
          <Check className="h-3.5 w-3.5" aria-hidden="true" />
        ) : (
          <Copy className="h-3.5 w-3.5" aria-hidden="true" />
        )}
      </Button>
      <span className="sr-only">
        {resourceName} sudah tersinkron ke SATUSEHAT; gunakan tombol salin untuk menyalin ID.
        {copied ? ' ID berhasil disalin.' : ''}
      </span>
    </span>
  );
}
