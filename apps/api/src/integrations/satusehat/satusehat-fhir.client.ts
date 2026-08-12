import { Injectable } from '@nestjs/common';
import { SatusehatAuthService } from './satusehat-auth.service';
import {
  getSatusehatOperationOutcomeMessage,
  parseSatusehatOperationOutcome,
  type SatusehatOperationOutcome,
} from './satusehat-operation-outcome';
import {
  classifySatusehatFhirFailure,
  type SatusehatFhirErrorClassification,
} from './satusehat-fhir-error-classification';

const DEFAULT_HTTP_TIMEOUT_MS = 10_000;
const DEFAULT_MAX_PAGINATION_PAGES = 100;

type FhirRequestMethod = 'GET' | 'POST' | 'PUT' | 'PATCH';
type FhirQuery = Record<string, string | undefined>;

export type SatusehatFhirErrorCode =
  | 'SATUSEHAT_FHIR_TIMEOUT'
  | 'SATUSEHAT_FHIR_NETWORK_ERROR'
  | 'SATUSEHAT_FHIR_REQUEST_FAILED'
  | 'SATUSEHAT_FHIR_PAGINATION_LIMIT'
  | 'SATUSEHAT_FHIR_PAGINATION_LOOP'
  | 'SATUSEHAT_FHIR_PAGINATION_RESPONSE_INVALID'
  | 'SATUSEHAT_FHIR_PAGINATION_URL_INVALID'
  | 'SATUSEHAT_FHIR_BASE_URL_MISSING'
  | 'SATUSEHAT_FHIR_URL_INVALID';

export interface SatusehatFhirErrorContract {
  code: SatusehatFhirErrorCode;
  message: string;
  classification: SatusehatFhirErrorClassification;
  httpStatus?: number;
  operationOutcome?: SatusehatOperationOutcome;
}

export class SatusehatFhirError
  extends Error
  implements SatusehatFhirErrorContract
{
  readonly classification: SatusehatFhirErrorClassification;

  constructor(
    public readonly code: SatusehatFhirErrorCode,
    message: string,
    public readonly httpStatus?: number,
    public readonly operationOutcome?: SatusehatOperationOutcome,
  ) {
    super(message);
    this.name = 'SatusehatFhirError';
    this.classification = classifySatusehatFhirFailure({
      code,
      httpStatus,
      operationOutcome,
    });
  }

  toContract(): SatusehatFhirErrorContract {
    return {
      code: this.code,
      message: this.message,
      classification: this.classification,
      ...(this.httpStatus === undefined ? {} : { httpStatus: this.httpStatus }),
      ...(this.operationOutcome
        ? { operationOutcome: this.operationOutcome }
        : {}),
    };
  }
}

@Injectable()
export class SatusehatFhirClient {
  constructor(private readonly auth: SatusehatAuthService) {}

  getOrganization(id: string): Promise<unknown> {
    return this.request('GET', ['Organization', id]);
  }

  async searchOrganizations(query: FhirQuery): Promise<unknown> {
    const firstPage = await this.request(
      'GET',
      ['Organization'],
      undefined,
      query,
    );
    return this.mergeSearchPages(firstPage);
  }

  createOrganization(payload: unknown): Promise<unknown> {
    return this.request('POST', ['Organization'], payload);
  }

  updateOrganization(id: string, payload: unknown): Promise<unknown> {
    return this.request('PUT', ['Organization', id], payload);
  }

  getPractitioner(id: string): Promise<unknown> {
    return this.request('GET', ['Practitioner', id]);
  }

  async searchPractitioners(query: FhirQuery): Promise<unknown> {
    const firstPage = await this.request(
      'GET',
      ['Practitioner'],
      undefined,
      query,
    );
    return this.mergeSearchPages(firstPage);
  }

  getPatient(id: string): Promise<unknown> {
    return this.request('GET', ['Patient', id]);
  }

  async searchPatients(query: FhirQuery): Promise<unknown> {
    const firstPage = await this.request('GET', ['Patient'], undefined, query);
    return this.mergeSearchPages(firstPage);
  }

  createPatient(payload: unknown): Promise<unknown> {
    return this.request('POST', ['Patient'], payload);
  }

  patchPatient(id: string, payload: unknown): Promise<unknown> {
    return this.request('PATCH', ['Patient', id], payload);
  }

  createLocation(payload: unknown): Promise<unknown> {
    return this.request('POST', ['Location'], payload);
  }

  updateLocation(id: string, payload: unknown): Promise<unknown> {
    return this.request('PUT', ['Location', id], payload);
  }

  getLocation(id: string): Promise<unknown> {
    return this.request('GET', ['Location', id]);
  }

  async searchLocations(query: FhirQuery): Promise<unknown> {
    const firstPage = await this.request('GET', ['Location'], undefined, query);
    return this.mergeSearchPages(firstPage);
  }

  private async request(
    method: FhirRequestMethod,
    pathSegments: string[],
    body?: unknown,
    query?: FhirQuery,
  ): Promise<unknown> {
    const resourceUrl = this.buildResourceUrl(pathSegments, query);
    return this.requestUrl(resourceUrl, method, body);
  }

  private async requestUrl(
    resourceUrl: URL,
    method: FhirRequestMethod,
    body?: unknown,
  ): Promise<unknown> {
    const accessToken = await this.auth.getAccessToken();
    const controller = new AbortController();
    const timeout = setTimeout(
      () => controller.abort(),
      this.readPositiveInteger(
        process.env.SATUSEHAT_HTTP_TIMEOUT_MS,
        DEFAULT_HTTP_TIMEOUT_MS,
      ),
    );

    let response: Response;
    try {
      const headers: Record<string, string> = {
        Accept: 'application/json',
        Authorization: `Bearer ${accessToken}`,
      };
      if (body !== undefined) headers['Content-Type'] = 'application/json';

      response = await fetch(resourceUrl, {
        method,
        headers,
        ...(body === undefined ? {} : { body: JSON.stringify(body) }),
        signal: controller.signal,
      });
    } catch {
      if (controller.signal.aborted) {
        throw new SatusehatFhirError(
          'SATUSEHAT_FHIR_TIMEOUT',
          'Request resource SATUSEHAT melebihi batas waktu yang ditentukan',
          504,
        );
      }
      throw new SatusehatFhirError(
        'SATUSEHAT_FHIR_NETWORK_ERROR',
        'Tidak dapat terhubung ke FHIR API SATUSEHAT',
        503,
      );
    } finally {
      clearTimeout(timeout);
    }

    const responseBody = await this.readResponseBody(response);
    if (!response.ok) {
      const operationOutcome = parseSatusehatOperationOutcome(responseBody);
      throw new SatusehatFhirError(
        'SATUSEHAT_FHIR_REQUEST_FAILED',
        getSatusehatOperationOutcomeMessage(operationOutcome, response.status),
        response.status,
        operationOutcome,
      );
    }

    return responseBody;
  }

  private async mergeSearchPages(firstPage: unknown): Promise<unknown> {
    if (!this.isBundle(firstPage)) return firstPage;

    const entries: unknown[] = [];
    const visitedNextUrls = new Set<string>();
    const maxPages = this.readPositiveInteger(
      process.env.SATUSEHAT_MAX_PAGINATION_PAGES,
      DEFAULT_MAX_PAGINATION_PAGES,
    );
    let currentPage = firstPage;
    let pageCount = 0;

    while (true) {
      pageCount += 1;
      if (this.isUnknownArray(currentPage.entry)) {
        entries.push(...currentPage.entry);
      }

      const nextUrl = this.readNextPageUrl(currentPage);
      if (!nextUrl) break;
      if (pageCount >= maxPages) {
        throw new SatusehatFhirError(
          'SATUSEHAT_FHIR_PAGINATION_LIMIT',
          `Pencarian FHIR SATUSEHAT melebihi batas ${maxPages} halaman`,
          502,
        );
      }

      const nextUrlKey = nextUrl.toString();
      if (visitedNextUrls.has(nextUrlKey)) {
        throw new SatusehatFhirError(
          'SATUSEHAT_FHIR_PAGINATION_LOOP',
          'SATUSEHAT mengembalikan link pagination yang berulang',
          502,
        );
      }
      visitedNextUrls.add(nextUrlKey);

      const nextPage = await this.requestUrl(nextUrl, 'GET');
      if (!this.isBundle(nextPage)) {
        throw new SatusehatFhirError(
          'SATUSEHAT_FHIR_PAGINATION_RESPONSE_INVALID',
          'Halaman lanjutan FHIR SATUSEHAT bukan Bundle yang valid',
          502,
        );
      }
      currentPage = nextPage;
    }

    const mergedPage: Record<string, unknown> = {
      ...firstPage,
      entry: entries,
    };
    delete mergedPage.link;
    if (mergedPage.total === undefined) mergedPage.total = entries.length;
    return mergedPage;
  }

  private readNextPageUrl(response: Record<string, unknown>): URL | undefined {
    if (!this.isUnknownArray(response.link)) return undefined;
    const nextLink = response.link.find(
      (link) => this.isRecord(link) && link.relation === 'next',
    );
    if (!this.isRecord(nextLink)) return undefined;

    const rawUrl = nextLink.url;
    if (typeof rawUrl !== 'string' || !rawUrl.trim()) {
      throw new SatusehatFhirError(
        'SATUSEHAT_FHIR_PAGINATION_URL_INVALID',
        'Link pagination FHIR SATUSEHAT tidak memiliki URL yang valid',
        502,
      );
    }

    const baseUrl = this.getFhirBaseUrl();
    let nextUrl: URL;
    try {
      nextUrl = new URL(rawUrl, baseUrl);
    } catch {
      throw new SatusehatFhirError(
        'SATUSEHAT_FHIR_PAGINATION_URL_INVALID',
        'Link pagination FHIR SATUSEHAT bukan URL yang valid',
        502,
      );
    }

    if (
      nextUrl.origin !== baseUrl.origin ||
      !nextUrl.pathname.startsWith(baseUrl.pathname)
    ) {
      throw new SatusehatFhirError(
        'SATUSEHAT_FHIR_PAGINATION_URL_INVALID',
        'Link pagination FHIR SATUSEHAT berada di luar endpoint yang dikonfigurasi',
        502,
      );
    }

    return nextUrl;
  }

  private buildResourceUrl(pathSegments: string[], query?: FhirQuery): URL {
    const baseUrl = this.getFhirBaseUrl();
    const resourceUrl = new URL(
      pathSegments.map((segment) => encodeURIComponent(segment)).join('/'),
      baseUrl,
    );
    for (const [key, value] of Object.entries(query ?? {})) {
      if (value) resourceUrl.searchParams.set(key, value);
    }
    return resourceUrl;
  }

  private getFhirBaseUrl(): URL {
    const rawBaseUrl = process.env.SATUSEHAT_FHIR_BASE_URL?.trim().replace(
      /\/+$/,
      '',
    );
    if (!rawBaseUrl) {
      throw new SatusehatFhirError(
        'SATUSEHAT_FHIR_BASE_URL_MISSING',
        'SATUSEHAT_FHIR_BASE_URL wajib diisi di environment API',
        503,
      );
    }

    try {
      return new URL(`${rawBaseUrl}/`);
    } catch {
      throw new SatusehatFhirError(
        'SATUSEHAT_FHIR_URL_INVALID',
        'SATUSEHAT_FHIR_BASE_URL bukan URL yang valid',
        500,
      );
    }
  }

  private async readResponseBody(response: Response): Promise<unknown> {
    const rawBody = await response.text();
    if (!rawBody) return {};
    try {
      return JSON.parse(rawBody) as unknown;
    } catch {
      return rawBody;
    }
  }

  private readPositiveInteger(
    value: string | undefined,
    fallback: number,
  ): number {
    const parsed = Number(value);
    return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
  }

  private isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null;
  }

  private isBundle(value: unknown): value is Record<string, unknown> {
    return this.isRecord(value) && value.resourceType === 'Bundle';
  }

  private isUnknownArray(value: unknown): value is readonly unknown[] {
    return Array.isArray(value);
  }
}
