import { Role } from '@prisma/client';
import { hashPassword } from '../src/auth/password.service';

export type InMemoryAuthUser = {
  id: string;
  username: string;
  passwordHash: string;
  fullName: string;
  role: Role;
  active: boolean;
  sipNumber?: string;
  strNumber?: string;
};

type InMemoryAuthSession = {
  id: string;
  userId: string;
  tokenHash: string;
  createdAt: Date;
  lastSeenAt: Date;
  expiresAt: Date;
  revokedAt: Date | null;
  revokeReason: string | null;
  userAgent: string | null;
  ipAddress: string | null;
};

type SessionWhere = {
  id?: string | { not: string };
  tokenHash?: string;
  userId?: string;
  revokedAt?: null;
};

function matchesSession(
  session: InMemoryAuthSession,
  where: SessionWhere,
): boolean {
  if (where.id) {
    if (typeof where.id === 'string' && session.id !== where.id) return false;
    if (typeof where.id !== 'string' && session.id === where.id.not)
      return false;
  }
  if (where.tokenHash && session.tokenHash !== where.tokenHash) return false;
  if (where.userId && session.userId !== where.userId) return false;
  if (where.revokedAt === null && session.revokedAt !== null) return false;
  return true;
}

export async function createInMemoryAuthPrisma() {
  const passwordByUsername: Record<string, string> = {
    admin: 'admin123',
    dr_budi: 'dok123',
    perawat_ani: 'perawat123',
    pendaftaran_siti: 'daftar123',
  };
  const users = new Map<string, InMemoryAuthUser>();
  const usersById = new Map<string, InMemoryAuthUser>();
  const sessions = new Map<string, InMemoryAuthSession>();
  let sessionSequence = 1;

  for (const [username, password] of Object.entries(passwordByUsername)) {
    const role =
      username === 'admin'
        ? Role.ADMIN
        : username === 'dr_budi'
          ? Role.DOKTER
          : username === 'pendaftaran_siti'
            ? Role.PETUGAS_PENDAFTARAN
            : Role.PERAWAT;
    const user: InMemoryAuthUser = {
      id: `usr-${username}`,
      username,
      passwordHash: await hashPassword(password),
      fullName:
        username === 'admin'
          ? 'Siti Rahma (Admin Pendaftaran)'
          : username === 'dr_budi'
            ? 'dr. Budi Santoso, Sp.PD'
            : username === 'pendaftaran_siti'
              ? 'Siti Rahma, A.Md.RMIK'
              : 'Ani Wijaya, S.Kep',
      role,
      active: true,
      ...(username === 'dr_budi' ? { sipNumber: 'SIP-449/123/2023' } : {}),
    };
    users.set(username, user);
    usersById.set(user.id, user);
  }

  const user = {
    findUnique: async (args: { where: { username?: string; id?: string } }) =>
      args.where.username
        ? (users.get(args.where.username) ?? null)
        : (usersById.get(args.where.id ?? '') ?? null),
    update: async (args: {
      where: { id: string };
      data: { passwordHash: string };
    }) => {
      const current = usersById.get(args.where.id);
      if (!current) return null;
      current.passwordHash = args.data.passwordHash;
      return current;
    },
  };

  const authSession = {
    create: async (args: {
      data: {
        userId: string;
        tokenHash: string;
        expiresAt: Date;
        userAgent?: string;
        ipAddress?: string;
      };
    }) => {
      const now = new Date();
      const session: InMemoryAuthSession = {
        id: `auth-session-${sessionSequence++}`,
        userId: args.data.userId,
        tokenHash: args.data.tokenHash,
        createdAt: now,
        lastSeenAt: now,
        expiresAt: args.data.expiresAt,
        revokedAt: null,
        revokeReason: null,
        userAgent: args.data.userAgent ?? null,
        ipAddress: args.data.ipAddress ?? null,
      };
      sessions.set(session.id, session);
      return session;
    },
    findUnique: async (args: { where: { tokenHash: string } }) => {
      const session = [...sessions.values()].find(
        (candidate) => candidate.tokenHash === args.where.tokenHash,
      );
      if (!session) return null;
      return { ...session, user: usersById.get(session.userId) };
    },
    update: async (args: {
      where: { id: string };
      data: { lastSeenAt: Date };
    }) => {
      const session = sessions.get(args.where.id);
      if (!session) return null;
      session.lastSeenAt = args.data.lastSeenAt;
      return session;
    },
    updateMany: async (args: {
      where: SessionWhere;
      data: { revokedAt?: Date; revokeReason?: string; lastSeenAt?: Date };
    }) => {
      let count = 0;
      for (const session of sessions.values()) {
        if (!matchesSession(session, args.where)) continue;
        if (args.data.revokedAt) session.revokedAt = args.data.revokedAt;
        if (args.data.revokeReason)
          session.revokeReason = args.data.revokeReason;
        if (args.data.lastSeenAt) session.lastSeenAt = args.data.lastSeenAt;
        count += 1;
      }
      return { count };
    },
  };

  return { user, authSession };
}
