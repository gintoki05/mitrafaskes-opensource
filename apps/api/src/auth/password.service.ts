import { Injectable } from '@nestjs/common';
import argon2 from 'argon2';

export const ARGON2_OPTIONS = {
  type: argon2.argon2id,
  memoryCost: 19_456,
  timeCost: 2,
  parallelism: 1,
  raw: false as const,
} satisfies argon2.HashOptions & { raw: false };

export function hashPassword(password: string): Promise<string> {
  return argon2.hash(password, ARGON2_OPTIONS);
}

@Injectable()
export class PasswordService {
  private readonly dummyHash = argon2.hash(
    'mitrafaskes-invalid-user-password',
    ARGON2_OPTIONS,
  );

  hash(password: string): Promise<string> {
    return hashPassword(password);
  }

  async verify(
    passwordHash: string | undefined,
    password: string,
  ): Promise<boolean> {
    const candidate = passwordHash ?? (await this.dummyHash);
    try {
      return await argon2.verify(candidate, password);
    } catch {
      return false;
    }
  }
}
