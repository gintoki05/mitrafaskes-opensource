import { SessionService } from './session.service';

describe('SessionService token handling', () => {
  const service = new SessionService({} as never);

  it('stores only a deterministic SHA-256 digest and prefers bearer tokens', () => {
    const token = 'opaque-session-token';
    const digest = service.hashToken(token);

    expect(digest).toHaveLength(64);
    expect(service.hashToken(token)).toBe(digest);
    expect(
      service.extractToken({
        headers: { authorization: `Bearer ${token}` },
        cookies: { mitrafaskes_session: 'cookie-token' },
      }),
    ).toBe(token);
  });

  it('falls back to the HttpOnly session cookie', () => {
    expect(
      service.extractToken({
        headers: {},
        cookies: { mitrafaskes_session: 'cookie-token' },
      }),
    ).toBe('cookie-token');
  });
});
