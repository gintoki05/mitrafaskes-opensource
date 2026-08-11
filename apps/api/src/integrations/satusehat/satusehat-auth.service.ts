import { Injectable } from '@nestjs/common';
import type { SatusehatAuthStatus as SatusehatAuthStatusContract } from '@mitrafaskes/shared';

const DEFAULT_ENVIRONMENT = 'sandbox';
const DEFAULT_HTTP_TIMEOUT_MS = 10_000;
const DEFAULT_REFRESH_SKEW_SECONDS = 60;
const DEFAULT_FAILURE_COOLDOWN_MS = 60_000;

interface SatusehatConfig {
  environment: string;
  organizationId?: string;
  clientId?: string;
  clientSecret?: string;
  oauthBaseUrl: string;
  timeoutMs: number;
  refreshSkewSeconds: number;
  failureCooldownMs: number;
}

interface CachedToken {
  accessToken: string;
  tokenType: string;
  expiresAt: number;
}

export type SatusehatAuthStatus = SatusehatAuthStatusContract;

export class SatusehatAuthError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly httpStatus?: number,
  ) {
    super(message);
    this.name = 'SatusehatAuthError';
  }
}

@Injectable()
export class SatusehatAuthService {
  private cachedToken?: CachedToken;
  private inFlightTokenRequest?: Promise<CachedToken>;
  private failedTokenRequest?: {
    error: SatusehatAuthError;
    retryAt: number;
  };

  async getAccessToken(): Promise<string> {
    const cachedToken = this.getUsableCachedToken();
    if (cachedToken) return cachedToken.accessToken;

    const failedTokenRequest = this.getActiveFailure();
    if (failedTokenRequest) throw failedTokenRequest;

    if (!this.inFlightTokenRequest) {
      const config = this.readConfig();
      this.inFlightTokenRequest = this.requestAccessToken()
        .catch((error: unknown) => {
          const authError = this.toAuthError(error);
          this.failedTokenRequest = {
            error: authError,
            retryAt: Date.now() + config.failureCooldownMs,
          };
          throw authError;
        })
        .finally(() => {
          this.inFlightTokenRequest = undefined;
        });
    }

    const token = await this.inFlightTokenRequest;
    return token.accessToken;
  }

  clearTokenCache(): void {
    this.cachedToken = undefined;
    this.failedTokenRequest = undefined;
  }

  async getConnectionStatus(): Promise<SatusehatAuthStatus> {
    const config = this.readConfig();
    const baseStatus = {
      environment: config.environment,
      oauthBaseUrl: config.oauthBaseUrl,
      credentialsConfigured: Boolean(config.clientId && config.clientSecret),
      organizationConfigured: Boolean(config.organizationId),
    };

    if (!config.clientId || !config.clientSecret) {
      return {
        ...baseStatus,
        status: 'NOT_CONFIGURED',
        token: { available: false },
      };
    }

    try {
      await this.getAccessToken();
      const token = this.cachedToken;
      return {
        ...baseStatus,
        status: 'CONNECTED',
        token: {
          available: true,
          expiresAt: token
            ? new Date(token.expiresAt).toISOString()
            : undefined,
        },
      };
    } catch (error) {
      const authError = this.toAuthError(error);
      return {
        ...baseStatus,
        status: 'ERROR',
        token: { available: false },
        error: {
          code: authError.code,
          message: authError.message,
          httpStatus: authError.httpStatus,
        },
      };
    }
  }

  private async requestAccessToken(): Promise<CachedToken> {
    const config = this.readConfig();
    if (!config.clientId || !config.clientSecret) {
      throw new SatusehatAuthError(
        'SATUSEHAT_CREDENTIALS_MISSING',
        'SATUSEHAT_CLIENT_ID dan SATUSEHAT_CLIENT_SECRET wajib diisi di environment API',
        503,
      );
    }

    const tokenUrl = this.buildTokenUrl(config.oauthBaseUrl);
    const requestBody = new URLSearchParams({
      client_id: config.clientId,
      client_secret: config.clientSecret,
    });
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), config.timeoutMs);

    let response: Response;
    try {
      response = await fetch(tokenUrl, {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: requestBody.toString(),
        signal: controller.signal,
      });
    } catch {
      if (controller.signal.aborted) {
        throw new SatusehatAuthError(
          'SATUSEHAT_TOKEN_TIMEOUT',
          `Request token SATUSEHAT melebihi batas waktu ${config.timeoutMs} ms`,
          504,
        );
      }

      throw new SatusehatAuthError(
        'SATUSEHAT_TOKEN_NETWORK_ERROR',
        'Tidak dapat terhubung ke endpoint token SATUSEHAT',
        503,
      );
    } finally {
      clearTimeout(timeout);
    }

    const responseBody = await this.readResponseBody(response);
    if (!response.ok) {
      throw new SatusehatAuthError(
        'SATUSEHAT_TOKEN_REQUEST_FAILED',
        this.getResponseErrorMessage(responseBody, response.status),
        response.status,
      );
    }

    const accessToken = this.getString(responseBody, 'access_token');
    const expiresIn = this.getPositiveNumber(responseBody, 'expires_in');
    if (!accessToken || expiresIn === undefined) {
      throw new SatusehatAuthError(
        'SATUSEHAT_TOKEN_RESPONSE_INVALID',
        'Response token SATUSEHAT tidak memiliki access_token atau expires_in yang valid',
        502,
      );
    }

    const token: CachedToken = {
      accessToken,
      tokenType: this.getString(responseBody, 'token_type') || 'BearerToken',
      expiresAt: Date.now() + expiresIn * 1000,
    };
    this.cachedToken = token;
    this.failedTokenRequest = undefined;
    return token;
  }

  private readConfig(): SatusehatConfig {
    return {
      environment: process.env.SATUSEHAT_ENVIRONMENT || DEFAULT_ENVIRONMENT,
      organizationId: this.optionalEnv('SATUSEHAT_ORGANIZATION_ID'),
      clientId: this.optionalEnv('SATUSEHAT_CLIENT_ID'),
      clientSecret: this.optionalEnv('SATUSEHAT_CLIENT_SECRET'),
      oauthBaseUrl: this.normalizeBaseUrl(
        this.optionalEnv('SATUSEHAT_OAUTH_BASE_URL') || '',
      ),
      timeoutMs: this.readPositiveInteger(
        process.env.SATUSEHAT_HTTP_TIMEOUT_MS,
        DEFAULT_HTTP_TIMEOUT_MS,
      ),
      refreshSkewSeconds: this.readPositiveInteger(
        process.env.SATUSEHAT_TOKEN_REFRESH_SKEW_SECONDS,
        DEFAULT_REFRESH_SKEW_SECONDS,
      ),
      failureCooldownMs: this.readPositiveInteger(
        process.env.SATUSEHAT_TOKEN_FAILURE_COOLDOWN_MS,
        DEFAULT_FAILURE_COOLDOWN_MS,
      ),
    };
  }

  private getUsableCachedToken(): CachedToken | undefined {
    if (!this.cachedToken) return undefined;

    const refreshSkewMs = this.readConfig().refreshSkewSeconds * 1000;
    if (this.cachedToken.expiresAt - Date.now() <= refreshSkewMs) {
      this.cachedToken = undefined;
      return undefined;
    }

    return this.cachedToken;
  }

  private getActiveFailure(): SatusehatAuthError | undefined {
    if (!this.failedTokenRequest) return undefined;
    if (Date.now() >= this.failedTokenRequest.retryAt) {
      this.failedTokenRequest = undefined;
      return undefined;
    }
    return this.failedTokenRequest.error;
  }

  private buildTokenUrl(oauthBaseUrl: string): URL {
    if (!oauthBaseUrl) {
      throw new SatusehatAuthError(
        'SATUSEHAT_OAUTH_BASE_URL_MISSING',
        'SATUSEHAT_OAUTH_BASE_URL wajib diisi di environment API',
        503,
      );
    }

    try {
      const tokenUrl = new URL(`${oauthBaseUrl}/accesstoken`);
      tokenUrl.searchParams.set('grant_type', 'client_credentials');
      return tokenUrl;
    } catch {
      throw new SatusehatAuthError(
        'SATUSEHAT_OAUTH_URL_INVALID',
        'SATUSEHAT_OAUTH_BASE_URL bukan URL yang valid',
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
    if (typeof body === 'string' && body.trim()) {
      return `SATUSEHAT menolak request token (HTTP ${status})`;
    }

    if (this.isRecord(body)) {
      const issue = this.isUnknownArray(body.issue) ? body.issue[0] : undefined;
      if (this.isRecord(issue)) {
        const details = this.isRecord(issue.details)
          ? this.getString(issue.details, 'text')
          : undefined;
        if (details) return details;
      }

      const errorDescription = this.getString(body, 'error_description');
      if (errorDescription) return errorDescription;
      const message = this.getString(body, 'message');
      if (message) return message;
    }

    return `Request token SATUSEHAT gagal (HTTP ${status})`;
  }

  private toAuthError(error: unknown): SatusehatAuthError {
    if (error instanceof SatusehatAuthError) return error;
    return new SatusehatAuthError(
      'SATUSEHAT_TOKEN_UNKNOWN_ERROR',
      'Terjadi kesalahan saat mengambil token SATUSEHAT',
      500,
    );
  }

  private optionalEnv(name: string): string | undefined {
    const value = process.env[name]?.trim();
    return value || undefined;
  }

  private normalizeBaseUrl(value: string): string {
    return value.replace(/\/+$/, '');
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

  private getString(value: unknown, key: string): string | undefined {
    if (!this.isRecord(value)) return undefined;
    const candidate = value[key];
    return typeof candidate === 'string' && candidate.trim()
      ? candidate
      : undefined;
  }

  private getPositiveNumber(value: unknown, key: string): number | undefined {
    if (!this.isRecord(value)) return undefined;
    const candidate = value[key];
    const parsed =
      typeof candidate === 'number' ? candidate : Number(candidate);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : undefined;
  }
}
