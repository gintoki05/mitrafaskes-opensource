import { Injectable } from '@nestjs/common';
import { SatusehatAuthService } from './satusehat-auth.service';

const DEFAULT_HTTP_TIMEOUT_MS = 10_000;

export class SatusehatFhirError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly httpStatus?: number,
  ) {
    super(message);
    this.name = 'SatusehatFhirError';
  }
}

@Injectable()
export class SatusehatFhirClient {
  constructor(private readonly auth: SatusehatAuthService) {}

  getOrganization(id: string): Promise<unknown> {
    return this.request('GET', ['Organization', id]);
  }

  createOrganization(payload: unknown): Promise<unknown> {
    return this.request('POST', ['Organization'], payload);
  }

  updateOrganization(id: string, payload: unknown): Promise<unknown> {
    return this.request('PUT', ['Organization', id], payload);
  }

  private async request(
    method: 'GET' | 'POST' | 'PUT',
    pathSegments: string[],
    body?: unknown,
  ): Promise<unknown> {
    const resourceUrl = this.buildResourceUrl(pathSegments);
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
      throw new SatusehatFhirError(
        'SATUSEHAT_FHIR_REQUEST_FAILED',
        this.getResponseErrorMessage(responseBody, response.status),
        response.status,
      );
    }

    return responseBody;
  }

  private buildResourceUrl(pathSegments: string[]): URL {
    const baseUrl = process.env.SATUSEHAT_FHIR_BASE_URL?.trim().replace(
      /\/+$/,
      '',
    );
    if (!baseUrl) {
      throw new SatusehatFhirError(
        'SATUSEHAT_FHIR_BASE_URL_MISSING',
        'SATUSEHAT_FHIR_BASE_URL wajib diisi di environment API',
        503,
      );
    }

    try {
      return new URL(
        `${baseUrl}/${pathSegments.map((segment) => encodeURIComponent(segment)).join('/')}`,
      );
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

  private getResponseErrorMessage(body: unknown, status: number): string {
    if (this.isRecord(body)) {
      const issue = this.isUnknownArray(body.issue) ? body.issue[0] : undefined;
      if (this.isRecord(issue) && this.isRecord(issue.details)) {
        const text = issue.details.text;
        if (typeof text === 'string' && text.trim()) return text;
      }
    }
    return `Request FHIR SATUSEHAT gagal (HTTP ${status})`;
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

  private isUnknownArray(value: unknown): value is readonly unknown[] {
    return Array.isArray(value);
  }
}
