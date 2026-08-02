import {
  SatusehatAuthError,
  SatusehatAuthService,
} from './satusehat-auth.service';

const SATUSEHAT_ENV_KEYS = [
  'SATUSEHAT_ENVIRONMENT',
  'SATUSEHAT_ORGANIZATION_ID',
  'SATUSEHAT_CLIENT_ID',
  'SATUSEHAT_CLIENT_SECRET',
  'SATUSEHAT_OAUTH_BASE_URL',
  'SATUSEHAT_HTTP_TIMEOUT_MS',
  'SATUSEHAT_TOKEN_REFRESH_SKEW_SECONDS',
  'SATUSEHAT_TOKEN_FAILURE_COOLDOWN_MS',
] as const;

describe('SatusehatAuthService', () => {
  const originalEnvironment: Partial<
    Record<(typeof SATUSEHAT_ENV_KEYS)[number], string>
  > = {};
  let fetchMock: jest.Mock;

  beforeEach(() => {
    for (const key of SATUSEHAT_ENV_KEYS) {
      originalEnvironment[key] = process.env[key];
      delete process.env[key];
    }
    process.env.SATUSEHAT_OAUTH_BASE_URL =
      'https://satusehat.example.test/oauth2/v1';
    fetchMock = jest.fn();
    global.fetch = fetchMock;
  });

  afterEach(() => {
    for (const key of SATUSEHAT_ENV_KEYS) {
      const originalValue = originalEnvironment[key];
      if (originalValue === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = originalValue;
      }
      delete originalEnvironment[key];
    }
  });

  it('reports missing credentials without making a network request', async () => {
    const service = new SatusehatAuthService();

    await expect(service.getConnectionStatus()).resolves.toEqual(
      expect.objectContaining({
        credentialsConfigured: false,
        status: 'NOT_CONFIGURED',
        token: { available: false },
      }),
    );
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('requests and caches the SATUSEHAT access token', async () => {
    process.env.SATUSEHAT_CLIENT_ID = 'client-id';
    process.env.SATUSEHAT_CLIENT_SECRET = 'client-secret';
    process.env.SATUSEHAT_OAUTH_BASE_URL =
      'https://satusehat.example.test/oauth2/v1/';
    fetchMock.mockResolvedValue({
      ok: true,
      status: 200,
      text: jest.fn().mockResolvedValue(
        JSON.stringify({
          access_token: 'access-token',
          token_type: 'BearerToken',
          expires_in: '3599',
        }),
      ),
    });

    const service = new SatusehatAuthService();
    await expect(service.getAccessToken()).resolves.toBe('access-token');
    await expect(service.getAccessToken()).resolves.toBe('access-token');

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, options] = fetchMock.mock.calls[0] as [URL, RequestInit];
    expect(String(url)).toBe(
      'https://satusehat.example.test/oauth2/v1/accesstoken?grant_type=client_credentials',
    );
    expect(options.method).toBe('POST');
    expect(options.headers).toEqual({
      Accept: 'application/json',
      'Content-Type': 'application/x-www-form-urlencoded',
    });
    expect(options.body).toBe(
      'client_id=client-id&client_secret=client-secret',
    );
  });

  it('does not expose the access token in connection status', async () => {
    process.env.SATUSEHAT_CLIENT_ID = 'client-id';
    process.env.SATUSEHAT_CLIENT_SECRET = 'client-secret';
    fetchMock.mockResolvedValue({
      ok: true,
      status: 200,
      text: jest
        .fn()
        .mockResolvedValue(
          JSON.stringify({ access_token: 'secret-token', expires_in: 3599 }),
        ),
    });

    const status = await new SatusehatAuthService().getConnectionStatus();

    expect(status.status).toBe('CONNECTED');
    expect(status.token.available).toBe(true);
    expect(status).not.toHaveProperty('accessToken');
    expect(JSON.stringify(status)).not.toContain('secret-token');
  });

  it('maps SATUSEHAT error responses without leaking request credentials', async () => {
    process.env.SATUSEHAT_CLIENT_ID = 'client-id';
    process.env.SATUSEHAT_CLIENT_SECRET = 'client-secret';
    fetchMock.mockResolvedValue({
      ok: false,
      status: 401,
      text: jest.fn().mockResolvedValue(
        JSON.stringify({
          resourceType: 'OperationOutcome',
          issue: [
            {
              details: {
                text: 'The user or system was not able to be authenticated',
              },
            },
          ],
        }),
      ),
    });

    const service = new SatusehatAuthService();
    await expect(service.getAccessToken()).rejects.toMatchObject({
      code: 'SATUSEHAT_TOKEN_REQUEST_FAILED',
      httpStatus: 401,
      message: 'The user or system was not able to be authenticated',
    } satisfies Partial<SatusehatAuthError>);
  });

  it('backs off after a failed token request', async () => {
    process.env.SATUSEHAT_CLIENT_ID = 'client-id';
    process.env.SATUSEHAT_CLIENT_SECRET = 'client-secret';
    process.env.SATUSEHAT_TOKEN_FAILURE_COOLDOWN_MS = '60000';
    fetchMock.mockResolvedValue({
      ok: false,
      status: 401,
      text: jest.fn().mockResolvedValue('{}'),
    });

    const service = new SatusehatAuthService();
    await expect(service.getAccessToken()).rejects.toBeInstanceOf(
      SatusehatAuthError,
    );
    await expect(service.getAccessToken()).rejects.toMatchObject({
      code: 'SATUSEHAT_TOKEN_REQUEST_FAILED',
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
