import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { randomBytes, scryptSync } from 'node:crypto';
import { Prisma, Role } from '@prisma/client';
import type {
  MasterDataListQuery,
  MasterDataListResponse,
  PractitionerSummary,
  SatusehatLinkageSummary,
  SatusehatSyncSummary,
} from '@mitrafaskes/shared';
import { PrismaService } from '../database/prisma.service';
import {
  DEFAULT_SATUSEHAT_ENVIRONMENT,
  LOCAL_PRACTITIONER_RESOURCE_TYPE,
  PRACTITIONER_RESOURCE_TYPE,
  SATUSEHAT_PROVIDER,
} from './practitioner.constants';
import { toPractitionerSummary } from './practitioner.mapper';
import {
  PractitionerValidationError,
  validatePractitionerCreate,
  validatePractitionerUpdate,
} from './practitioner.validation';

const PRACTITIONER_ROLES = [Role.DOKTER, Role.PERAWAT];
const DEFAULT_PAGE = 1;
const DEFAULT_PAGE_SIZE = 25;
const MAX_PAGE_SIZE = 100;

const practitionerRelationInclude = {
  organization: {
    select: { id: true, code: true, name: true },
  },
  location: {
    select: { id: true, organizationId: true, code: true, name: true },
  },
};

type PractitionerLinkRecord = {
  localResourceId: string;
  externalResourceId: string;
  lastSyncedAt: Date | null;
};

type PractitionerLogRecord = {
  resourceId: string;
  status: 'PENDING' | 'SUCCESS' | 'FAILED';
  errorMessage: string | null;
  updatedAt: Date;
};

@Injectable()
export class PractitionersService {
  constructor(private readonly prisma: PrismaService) {}

  async create(input: unknown): Promise<PractitionerSummary> {
    let validated: ReturnType<typeof validatePractitionerCreate>;
    try {
      validated = validatePractitionerCreate(input);
    } catch (error) {
      if (error instanceof PractitionerValidationError) {
        throw new BadRequestException({
          code: 'PRACTITIONER_VALIDATION_FAILED',
          message: error.message,
          errors: error.issues,
        });
      }
      throw error;
    }

    try {
      const { password, ...profile } = validated;
      await this.validatePractitionerContext(
        profile.organizationId,
        profile.locationId,
      );
      const record = await this.prisma.user.create({
        data: {
          ...profile,
          passwordHash: this.hashPassword(password),
        },
        include: practitionerRelationInclude,
      });
      return toPractitionerSummary(record);
    } catch (error) {
      const conflictField = this.readUniqueConflictField(error);
      if (conflictField === 'nik') {
        throw new ConflictException({
          code: 'PRACTITIONER_NIK_ALREADY_EXISTS',
          message: 'NIK tersebut sudah digunakan oleh tenaga kesehatan lain.',
          field: 'nik',
        });
      }
      if (conflictField === 'username') {
        throw new ConflictException({
          code: 'PRACTITIONER_USERNAME_ALREADY_EXISTS',
          message: 'Username tersebut sudah digunakan.',
          field: 'username',
        });
      }
      throw error;
    }
  }

  async findMany(
    input: MasterDataListQuery = {},
  ): Promise<MasterDataListResponse<PractitionerSummary>> {
    const page = this.normalizePositiveInteger(input.page, DEFAULT_PAGE);
    const pageSize = Math.min(
      this.normalizePositiveInteger(input.pageSize, DEFAULT_PAGE_SIZE),
      MAX_PAGE_SIZE,
    );
    const search = input.search?.trim();
    const where: Prisma.UserWhereInput = {
      role: { in: PRACTITIONER_ROLES },
    };

    if (input.active !== undefined) where.active = input.active;
    if (search) {
      where.OR = [
        { username: { contains: search, mode: 'insensitive' } },
        { fullName: { contains: search, mode: 'insensitive' } },
        { nik: { contains: search, mode: 'insensitive' } },
      ];
    }

    const orderDirection = input.direction ?? 'asc';
    const orderBy: Prisma.UserOrderByWithRelationInput[] =
      input.sort === 'createdAt'
        ? [{ createdAt: orderDirection }]
        : input.sort === 'active'
          ? [{ active: orderDirection }, { fullName: 'asc' }]
        : [{ fullName: orderDirection }, { username: 'asc' }];

    const [records, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        orderBy,
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: practitionerRelationInclude,
      }),
      this.prisma.user.count({ where }),
    ]);

    const ids = records.map((record) => record.id);
    const [links, logs] = await Promise.all([
      this.findLinkages(ids),
      this.findLatestLogs(ids),
    ]);

    return {
      items: records.map((record) =>
        toPractitionerSummary(
          record,
          this.toLinkage(links.get(record.id)),
          this.toSyncSummary(logs.get(record.id)),
        ),
      ),
      meta: { page, pageSize, total },
    };
  }

  async findById(id: string): Promise<PractitionerSummary> {
    const record = await this.getPractitionerRecord(id);
    const [link, log] = await Promise.all([
      this.findLinkage(id),
      this.findLatestLog(id),
    ]);
    return toPractitionerSummary(
      record,
      this.toLinkage(link),
      this.toSyncSummary(log),
    );
  }

  async update(id: string, input: unknown): Promise<PractitionerSummary> {
    let validated: ReturnType<typeof validatePractitionerUpdate>;
    try {
      validated = validatePractitionerUpdate(input);
    } catch (error) {
      if (error instanceof PractitionerValidationError) {
        throw new BadRequestException({
          code: 'PRACTITIONER_VALIDATION_FAILED',
          message: error.message,
          errors: error.issues,
        });
      }
      throw error;
    }

    const existing = await this.getPractitionerRecord(id);
    const nextOrganizationId = Object.prototype.hasOwnProperty.call(
      validated,
      'organizationId',
    )
      ? validated.organizationId
      : existing.organizationId;
    const nextLocationId = Object.prototype.hasOwnProperty.call(
      validated,
      'locationId',
    )
      ? validated.locationId
      : existing.locationId;
    await this.validatePractitionerContext(nextOrganizationId, nextLocationId);
    try {
      await this.prisma.user.update({
        where: { id },
        data: validated,
      });
    } catch (error) {
      if (this.isUniqueConstraintError(error)) {
        throw new ConflictException({
          code: 'PRACTITIONER_NIK_ALREADY_EXISTS',
          message: 'NIK tersebut sudah digunakan oleh tenaga kesehatan lain.',
          field: 'nik',
        });
      }
      throw error;
    }

    return this.findById(id);
  }

  async getPractitionerRecord(id: string) {
    const record = await this.prisma.user.findUnique({
      where: { id },
      include: practitionerRelationInclude,
    });
    if (
      !record ||
      (record.role !== Role.DOKTER && record.role !== Role.PERAWAT)
    ) {
      throw new NotFoundException('Tenaga kesehatan tidak ditemukan');
    }
    return record;
  }

  private async validatePractitionerContext(
    organizationId: string | null | undefined,
    locationId: string | null | undefined,
  ): Promise<void> {
    if (locationId && !organizationId) {
      throw new ConflictException({
        code: 'PRACTITIONER_ORGANIZATION_REQUIRED_FOR_LOCATION',
        message: 'Pilih Organization sebelum memilih Location.',
        field: 'organizationId',
      });
    }
    if (!organizationId && !locationId) return;

    if (organizationId) {
      const organization = await this.prisma.healthcareOrganization.findUnique({
        where: { id: organizationId },
        select: { id: true },
      });
      if (!organization) {
        throw new NotFoundException('Organization Practitioner tidak ditemukan.');
      }
    }

    if (locationId) {
      const location = await this.prisma.location.findUnique({
        where: { id: locationId },
        select: { id: true, organizationId: true },
      });
      if (!location) {
        throw new NotFoundException('Location Practitioner tidak ditemukan.');
      }
      if (location.organizationId !== organizationId) {
        throw new ConflictException({
          code: 'PRACTITIONER_LOCATION_ORGANIZATION_MISMATCH',
          message: 'Location harus berada pada Organization yang dipilih.',
          field: 'locationId',
        });
      }
    }
  }

  async getPractitionerForSatusehat(id: string) {
    const record = await this.getPractitionerRecord(id);
    if (!record.nik) {
      throw new ConflictException({
        code: 'SATUSEHAT_PRACTITIONER_NIK_REQUIRED',
        message:
          'NIK tenaga kesehatan wajib diisi sebelum mencari Practitioner SATUSEHAT.',
      });
    }
    return record;
  }

  async findLinkageByExternalId(externalResourceId: string, environment: string) {
    return this.prisma.externalResourceLink.findUnique({
      where: {
        externalResourceScope: {
          provider: SATUSEHAT_PROVIDER,
          environment,
          resourceType: PRACTITIONER_RESOURCE_TYPE,
          externalResourceId,
        },
      },
    });
  }

  private async findLinkages(
    localResourceIds: string[],
  ): Promise<Map<string, PractitionerLinkRecord>> {
    const result = new Map<string, PractitionerLinkRecord>();
    if (localResourceIds.length === 0) return result;

    const records = await this.prisma.externalResourceLink.findMany({
      where: {
        provider: SATUSEHAT_PROVIDER,
        environment: this.readEnvironment(),
        resourceType: PRACTITIONER_RESOURCE_TYPE,
        localResourceType: LOCAL_PRACTITIONER_RESOURCE_TYPE,
        localResourceId: { in: localResourceIds },
      },
      select: {
        localResourceId: true,
        externalResourceId: true,
        lastSyncedAt: true,
      },
    });
    for (const record of records) result.set(record.localResourceId, record);
    return result;
  }

  private async findLinkage(
    localResourceId: string,
  ): Promise<PractitionerLinkRecord | null> {
    return this.prisma.externalResourceLink.findUnique({
      where: {
        localResourceScope: {
          provider: SATUSEHAT_PROVIDER,
          environment: this.readEnvironment(),
          resourceType: PRACTITIONER_RESOURCE_TYPE,
          localResourceType: LOCAL_PRACTITIONER_RESOURCE_TYPE,
          localResourceId,
        },
      },
      select: {
        localResourceId: true,
        externalResourceId: true,
        lastSyncedAt: true,
      },
    });
  }

  private async findLatestLogs(
    localResourceIds: string[],
  ): Promise<Map<string, PractitionerLogRecord>> {
    const result = new Map<string, PractitionerLogRecord>();
    if (localResourceIds.length === 0) return result;
    const records = await this.prisma.satusehatSyncLog.findMany({
      where: {
        resourceType: PRACTITIONER_RESOURCE_TYPE,
        resourceId: { in: localResourceIds },
      },
      orderBy: { updatedAt: 'desc' },
      select: {
        resourceId: true,
        status: true,
        errorMessage: true,
        updatedAt: true,
      },
    });
    for (const record of records) {
      if (!result.has(record.resourceId)) {
        result.set(record.resourceId, {
          resourceId: record.resourceId,
          status: record.status,
          errorMessage: record.errorMessage,
          updatedAt: record.updatedAt,
        });
      }
    }
    return result;
  }

  private async findLatestLog(
    localResourceId: string,
  ): Promise<PractitionerLogRecord | null> {
    const record = await this.prisma.satusehatSyncLog.findFirst({
      where: {
        resourceType: PRACTITIONER_RESOURCE_TYPE,
        resourceId: localResourceId,
      },
      orderBy: { updatedAt: 'desc' },
      select: {
        resourceId: true,
        status: true,
        errorMessage: true,
        updatedAt: true,
      },
    });
    return record;
  }

  private toLinkage(
    record: PractitionerLinkRecord | null | undefined,
  ): SatusehatLinkageSummary | undefined {
    if (!record) return undefined;
    return {
      externalResourceId: record.externalResourceId,
      lastSyncedAt: record.lastSyncedAt?.toISOString(),
    };
  }

  private toSyncSummary(
    record: PractitionerLogRecord | null | undefined,
  ): SatusehatSyncSummary | undefined {
    if (!record) return undefined;
    return {
      status: record.status,
      errorMessage: record.errorMessage ?? undefined,
      updatedAt: record.updatedAt.toISOString(),
    };
  }

  private readEnvironment(): string {
    return (
      process.env.SATUSEHAT_ENVIRONMENT?.trim() || DEFAULT_SATUSEHAT_ENVIRONMENT
    );
  }

  private normalizePositiveInteger(value: number | undefined, fallback: number) {
    return Number.isInteger(value) && value! > 0 ? value! : fallback;
  }

  private isUniqueConstraintError(
    error: unknown,
  ): error is Prisma.PrismaClientKnownRequestError {
    return (
      error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002'
    );
  }

  private readUniqueConflictField(
    error: unknown,
  ): 'nik' | 'username' | undefined {
    if (!this.isUniqueConstraintError(error)) return undefined;
    const target = error.meta?.target;
    if (Array.isArray(target) && target.includes('nik')) return 'nik';
    if (Array.isArray(target) && target.includes('username')) return 'username';
    return undefined;
  }

  private hashPassword(password: string): string {
    const salt = randomBytes(16).toString('hex');
    const derivedKey = scryptSync(password, salt, 64).toString('hex');
    return `${salt}:${derivedKey}`;
  }
}
