import { PasswordService } from './password.service';

describe('PasswordService', () => {
  const service = new PasswordService();

  it('hashes and verifies passwords with Argon2id', async () => {
    const passwordHash = await service.hash('dok12345');

    expect(passwordHash).toMatch(/^\$argon2id\$/);
    await expect(service.verify(passwordHash, 'dok12345')).resolves.toBe(true);
    await expect(service.verify(passwordHash, 'wrong-password')).resolves.toBe(
      false,
    );
  });

  it('does not accept missing or malformed stored hashes', async () => {
    await expect(service.verify(undefined, 'anything')).resolves.toBe(false);
    await expect(
      service.verify('not-a-password-hash', 'anything'),
    ).resolves.toBe(false);
  });
});
