import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  Optional,
} from '@nestjs/common';
import { randomBytes, scryptSync } from 'node:crypto';
import { Prisma, Role } from '@prisma/client';
import type {
  MasterDataListQuery,
  MasterDataListResponse,
  PractitionerSummary,
} from '@mitrafaskes/shared';
import { PrismaService } from '../database/prisma.service';
import { IntegrationRegistry } from '../integrations/integration-registry';
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
  locationAssignments: {
    include: {
      location: {
        select: { id: true, organizationId: true, code: true, name: true },
      },
    },
  },
};

@Injectable()
export class PractitionersService {
  constructor(
    private readonly prisma: PrismaService,
    @Optional() private readonly integrations?: IntegrationRegistry,
  ) {}

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
      const { password, locationIds, ...profile } = validated;
      await this.validatePractitionerContext(profile.organizationId, locationIds);
      const record = await this.prisma.user.create({
        data: {
          ...profile,
          locationId: locationIds[0] ?? null,
          passwordHash: this.hashPassword(password),
          locationAssignments: locationIds.length
            ? { create: locationIds.map((locationId) => ({ locationId })) }
            : undefined,
        },
        include: practitionerRelationInclude,
      });
      return this.toSummary(record);
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
    const baseWhere: Prisma.UserWhereInput = {
      role: { in: PRACTITIONER_ROLES },
    };

    if (input.organizationId) baseWhere.organizationId = input.organizationId;
    if (input.locationId) {
      baseWhere.locationAssignments = { some: { locationId: input.locationId } };
    }
    if (input.role) baseWhere.role = input.role as Role;
    if (search) {
      baseWhere.OR = [
        { username: { contains: search, mode: 'insensitive' } },
        { fullName: { contains: search, mode: 'insensitive' } },
        { nik: { contains: search, mode: 'insensitive' } },
      ];
    }

    const where: Prisma.UserWhereInput = { ...baseWhere };
    if (input.active !== undefined) where.active = input.active;
    const activeWhere: Prisma.UserWhereInput = {
      ...baseWhere,
      active: true,
    };
    const inactiveWhere: Prisma.UserWhereInput = {
      ...baseWhere,
      active: false,
    };

    const orderDirection = input.direction ?? 'asc';
    const orderBy: Prisma.UserOrderByWithRelationInput[] =
      input.sort === 'createdAt'
        ? [{ createdAt: orderDirection }]
        : input.sort === 'active'
          ? [{ active: orderDirection }, { fullName: 'asc' }]
          : [{ fullName: orderDirection }, { username: 'asc' }];

    const [records, total, activeCount, inactiveCount] = await Promise.all([
      this.prisma.user.findMany({
        where,
        orderBy,
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: practitionerRelationInclude,
      }),
      this.prisma.user.count({ where }),
      this.prisma.user.count({ where: activeWhere }),
      this.prisma.user.count({ where: inactiveWhere }),
    ]);

    const ids = records.map((record) => record.id);
    const integrations = this.integrations
      ? await this.integrations.findResourceSummaries('Practitioner', ids)
      : new Map();

    return {
      items: records.map((record) =>
        toPractitionerSummary(record, integrations.get(record.id) ?? []),
      ),
      meta: { page, pageSize, total },
      statusCounts: { active: activeCount, inactive: inactiveCount },
    };
  }

  async findById(id: string): Promise<PractitionerSummary> {
    const record = await this.getPractitionerRecord(id);
    return this.toSummary(record);
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
    const hasLocationIds = Object.prototype.hasOwnProperty.call(
      validated,
      'locationIds',
    );
    const existingLocationIds =
      existing.locationAssignments?.map((assignment) => assignment.location.id) ??
      (existing.locationId ? [existing.locationId] : []);
    const nextLocationIds = hasLocationIds
      ? validated.locationIds ?? []
      : existingLocationIds;
    await this.validatePractitionerContext(nextOrganizationId, nextLocationIds);
    try {
      const { locationIds: _locationIds, ...profile } = validated;
      const nextPrimaryLocationId = nextLocationIds.includes(existing.locationId ?? '')
        ? existing.locationId
        : nextLocationIds[0] ?? null;

      if (hasLocationIds) {
        await this.prisma.$transaction(async (transaction) => {
          await transaction.user.update({
            where: { id },
            data: { ...profile, locationId: nextPrimaryLocationId },
          });
          await transaction.practitionerLocationAssignment.deleteMany({
            where: { practitionerId: id },
          });
          if (nextLocationIds.length > 0) {
            await transaction.practitionerLocationAssignment.createMany({
              data: nextLocationIds.map((locationId) => ({
                practitionerId: id,
                locationId,
              })),
            });
          }
        });
      } else {
        await this.prisma.user.update({
          where: { id },
          data: profile,
        });
      }
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
    locationIds: string[],
  ): Promise<void> {
    if (locationIds.length > 0 && !organizationId) {
      throw new ConflictException({
        code: 'PRACTITIONER_ORGANIZATION_REQUIRED_FOR_LOCATION',
        message: 'Pilih Organization sebelum memilih Location.',
        field: 'organizationId',
      });
    }
    if (!organizationId && locationIds.length === 0) return;

    if (organizationId) {
      const organization = await this.prisma.healthcareOrganization.findUnique({
        where: { id: organizationId },
        select: { id: true },
      });
      if (!organization) {
        throw new NotFoundException(
          'Organization Practitioner tidak ditemukan.',
        );
      }
    }

    if (locationIds.length === 0) return;

    const locations = await this.prisma.location.findMany({
      where: { id: { in: locationIds } },
      select: { id: true, organizationId: true },
    });
    if (locations.length !== locationIds.length) {
      throw new NotFoundException('Location Practitioner tidak ditemukan.');
    }
    if (locations.some((location) => location.organizationId !== organizationId)) {
      throw new ConflictException({
        code: 'PRACTITIONER_LOCATION_ORGANIZATION_MISMATCH',
        message: 'Semua Location harus berada pada Organization yang dipilih.',
        field: 'locationIds',
      });
    }
  }

  async getPractitionerForExternalIntegration(id: string) {
    return this.getPractitionerRecord(id);
  }

  private async toSummary(record: Awaited<ReturnType<PractitionersService['getPractitionerRecord']>>) {
    const integrations = this.integrations
      ? await this.integrations.findResourceSummaries('Practitioner', [record.id])
      : new Map();
    return toPractitionerSummary(record, integrations.get(record.id) ?? []);
  }

  private normalizePositiveInteger(
    value: number | undefined,
    fallback: number,
  ) {
    return Number.isInteger(value) && value! > 0 ? value! : fallback;
  }

  private isUniqueConstraintError(
    error: unknown,
  ): error is Prisma.PrismaClientKnownRequestError {
    return (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002'
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
