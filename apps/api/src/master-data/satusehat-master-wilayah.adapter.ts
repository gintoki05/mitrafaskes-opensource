import { Injectable } from '@nestjs/common';
import type { RegionLevel } from '@mitrafaskes/shared';
import { SatusehatAuthService } from '../satusehat/satusehat-auth.service';
import {
  MasterDataProviderError,
  MasterWilayahProvider,
  MasterWilayahProviderRecord,
  MasterWilayahSnapshot,
} from './master-wilayah.provider';

const DEFAULT_TIMEOUT_MS = 15_000;
// SATUSEHAT Master Wilayah v1 accepts multiple parent codes and documents a
// maximum of 2,000 codes per request. Keep a lower operational limit so the
// encoded query remains below gateway URI limits for long district codes.
const MAX_PARENT_CODES_PER_REQUEST = 500;
const DEFAULT_SATUSEHAT_MASTER_DATA_BASE_URLS: Readonly<
  Record<string, string>
> = {
  sandbox: 'https://api-satusehat-stg.dto.kemkes.go.id/masterdata/v1',
  production: 'https://api-satusehat.kemkes.go.id/masterdata/v1',
};

type ProviderRegion = {
  code?: unknown;
  parent_code?: unknown;
  bps_code?: unknown;
  name?: unknown;
};

@Injectable()
export class SatusehatMasterWilayahAdapter implements MasterWilayahProvider {
  constructor(private readonly auth: SatusehatAuthService) {}

  async fetchSnapshot(): Promise<MasterWilayahSnapshot> {
    const token = await this.auth.getAccessToken();
    const provinces = await this.fetchRegions(
      token,
      'provinces',
      'codes',
      [],
      'PROVINCE',
    );
    const cities = await this.fetchByParents(
      token,
      'cities',
      'province_codes',
      provinces,
      'REGENCY',
    );
    const districts = await this.fetchByParents(
      token,
      'districts',
      'city_codes',
      cities,
      'DISTRICT',
    );
    const villages = await this.fetchByParents(
      token,
      'sub-districts',
      'district_codes',
      districts,
      'VILLAGE',
    );

    return {
      source: 'SATUSEHAT',
      sourceVersion: 'master-wilayah-v1',
      complete: true,
      records: [...provinces, ...cities, ...districts, ...villages],
    };
  }

  private async fetchByParents(
    token: string,
    path: string,
    parentQueryKey: string,
    parents: readonly MasterWilayahProviderRecord[],
    level: RegionLevel,
  ): Promise<MasterWilayahProviderRecord[]> {
    const parentCodes = parents.map((parent) => parent.code);
    const chunks = this.chunk(parentCodes, MAX_PARENT_CODES_PER_REQUEST);
    const records: MasterWilayahProviderRecord[] = [];

    for (const chunk of chunks) {
      records.push(
        ...(await this.fetchRegions(
          token,
          path,
          parentQueryKey,
          chunk,
          level,
        )),
      );
    }

    return records;
  }

  private async fetchRegions(
    token: string,
    path: string,
    queryKey: string,
    codes: readonly string[],
    level: RegionLevel,
  ): Promise<MasterWilayahProviderRecord[]> {
    const baseUrl = this.readBaseUrl();
    const url = new URL(`${baseUrl}/${path}`);
    url.searchParams.set(queryKey, codes.join(','));

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.readTimeout());
    let response: Response;

    try {
      response = await fetch(url, {
        method: 'GET',
        headers: {
          Accept: 'application/json',
          Authorization: `Bearer ${token}`,
        },
        signal: controller.signal,
      });
    } catch (error) {
      if (controller.signal.aborted) {
        throw new MasterDataProviderError(
          'MASTER_DATA_PROVIDER_TIMEOUT',
          'Refresh Master Wilayah SATUSEHAT melewati batas waktu',
          504,
        );
      }

      throw new MasterDataProviderError(
        'MASTER_DATA_PROVIDER_NETWORK_ERROR',
        'Tidak dapat terhubung ke provider Master Wilayah SATUSEHAT',
        503,
      );
    } finally {
      clearTimeout(timeout);
    }

    const body = await this.readBody(response);
    if (!response.ok) {
      if (response.status === 429) {
        const retryAfter = this.readRetryAfter(response.headers.get('retry-after'));
        throw new MasterDataProviderError(
          'MASTER_DATA_PROVIDER_RATE_LIMITED',
          retryAfter
            ? `Provider Master Wilayah SATUSEHAT sedang membatasi request (HTTP 429). Coba lagi dalam ${retryAfter}. Snapshot lokal terakhir tetap digunakan.`
            : 'Provider Master Wilayah SATUSEHAT sedang membatasi request (HTTP 429). Coba lagi beberapa saat lagi. Snapshot lokal terakhir tetap digunakan.',
          429,
        );
      }

      throw new MasterDataProviderError(
        'MASTER_DATA_PROVIDER_HTTP_ERROR',
        `Provider Master Wilayah SATUSEHAT mengembalikan HTTP ${response.status}`,
        response.status >= 500 ? 503 : 502,
      );
    }

    if (!this.isRecord(body) || !Array.isArray(body.data)) {
      throw new MasterDataProviderError(
        'MASTER_DATA_PROVIDER_RESPONSE_INVALID',
        'Response provider Master Wilayah SATUSEHAT tidak memiliki data yang valid',
        502,
      );
    }

    return body.data.map((item: unknown) =>
      this.toRecord(item, level),
    );
  }

  private toRecord(item: unknown, level: RegionLevel): MasterWilayahProviderRecord {
    if (!this.isRecord(item)) {
      throw new MasterDataProviderError(
        'MASTER_DATA_PROVIDER_RESPONSE_INVALID',
        'Provider Master Wilayah SATUSEHAT mengirim record yang tidak valid',
        502,
      );
    }

    const providerRegion = item as ProviderRegion;
    const code = this.requiredString(providerRegion.code);
    const name = this.requiredString(providerRegion.name);
    if (!code || !name) {
      throw new MasterDataProviderError(
        'MASTER_DATA_PROVIDER_RESPONSE_INVALID',
        'Provider Master Wilayah SATUSEHAT mengirim code atau name kosong',
        502,
      );
    }

    return {
      level,
      code,
      parentCode: this.optionalString(providerRegion.parent_code),
      bpsCode: this.optionalString(providerRegion.bps_code),
      name,
    };
  }

  private readBaseUrl(): string {
    const configured = process.env.SATUSEHAT_MASTER_DATA_BASE_URL?.trim();
    const environment = process.env.SATUSEHAT_ENVIRONMENT?.trim() || 'sandbox';
    const baseUrl =
      configured || DEFAULT_SATUSEHAT_MASTER_DATA_BASE_URLS[environment];

    if (!baseUrl) {
      throw new MasterDataProviderError(
        'MASTER_DATA_PROVIDER_BASE_URL_INVALID',
        'Environment SATUSEHAT untuk Master Wilayah tidak dikenali',
        503,
      );
    }

    try {
      return new URL(baseUrl).toString().replace(/\/+$/, '');
    } catch {
      throw new MasterDataProviderError(
        'MASTER_DATA_PROVIDER_BASE_URL_INVALID',
        'SATUSEHAT_MASTER_DATA_BASE_URL bukan URL yang valid',
        503,
      );
    }
  }

  private readTimeout(): number {
    const parsed = Number(process.env.SATUSEHAT_HTTP_TIMEOUT_MS);
    return Number.isInteger(parsed) && parsed > 0 ? parsed : DEFAULT_TIMEOUT_MS;
  }

  private async readBody(response: Response): Promise<unknown> {
    const rawBody = await response.text();
    if (!rawBody) return {};
    try {
      return JSON.parse(rawBody) as unknown;
    } catch {
      return rawBody;
    }
  }

  private readRetryAfter(value: string | null): string | undefined {
    if (!value) return undefined;

    const seconds = Number(value);
    if (Number.isFinite(seconds) && seconds >= 0) {
      const roundedSeconds = Math.max(1, Math.ceil(seconds));
      return `${roundedSeconds} detik`;
    }

    const retryAt = Date.parse(value);
    if (Number.isNaN(retryAt)) return undefined;

    const remainingSeconds = Math.max(
      1,
      Math.ceil((retryAt - Date.now()) / 1000),
    );
    return `${remainingSeconds} detik`;
  }

  private chunk(values: readonly string[], size: number): string[][] {
    const chunks: string[][] = [];
    for (let index = 0; index < values.length; index += size) {
      chunks.push(values.slice(index, index + size));
    }
    return chunks;
  }

  private isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null;
  }

  private requiredString(value: unknown): string | undefined {
    return typeof value === 'string' && value.trim() ? value.trim() : undefined;
  }

  private optionalString(value: unknown): string | undefined {
    return this.requiredString(value);
  }
}
