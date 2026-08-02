import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import {
  LocationSummary,
  MasterFaskesData,
  OrganizationSummary,
  ServiceUnitSummary,
} from '@mitrafaskes/shared';
import { PrismaService } from '../database/prisma.service';
import {
  MasterDataValidationError,
  validateLocationInput,
  validateOrganizationInput,
  validateServiceUnitInput,
} from './master-data.validation';

const optional = (value: string | null | undefined): string | undefined =>
  value ?? undefined;

const toOrganization = (
  record: Prisma.HealthcareOrganizationGetPayload<Prisma.HealthcareOrganizationDefaultArgs>,
): OrganizationSummary => ({
  id: record.id,
  code: record.code,
  name: record.name,
  type: record.type,
  parentId: optional(record.parentId),
  addressText: optional(record.addressText),
  phone: optional(record.phone),
  email: optional(record.email),
  active: record.active,
  createdAt: record.createdAt.toISOString(),
  updatedAt: record.updatedAt.toISOString(),
});

const toServiceUnit = (
  record: Prisma.ServiceUnitGetPayload<Prisma.ServiceUnitDefaultArgs>,
): ServiceUnitSummary => ({
  id: record.id,
  organizationId: record.organizationId,
  parentId: optional(record.parentId),
  code: record.code,
  name: record.name,
  type: record.type,
  active: record.active,
  createdAt: record.createdAt.toISOString(),
  updatedAt: record.updatedAt.toISOString(),
});

const toLocation = (
  record: Prisma.LocationGetPayload<Prisma.LocationDefaultArgs>,
): LocationSummary => ({
  id: record.id,
  organizationId: record.organizationId,
  serviceUnitId: optional(record.serviceUnitId),
  parentId: optional(record.parentId),
  code: record.code,
  name: record.name,
  type: record.type,
  description: optional(record.description),
  status: record.status,
  mode: record.mode,
  physicalTypeCode: optional(record.physicalTypeCode),
  addressText: optional(record.addressText),
  city: optional(record.city),
  postalCode: optional(record.postalCode),
  countryCode: record.countryCode,
  active: record.active,
  createdAt: record.createdAt.toISOString(),
  updatedAt: record.updatedAt.toISOString(),
});

const isKnownRequestError = (
  error: unknown,
): error is Prisma.PrismaClientKnownRequestError =>
  error instanceof Prisma.PrismaClientKnownRequestError;

@Injectable()
export class MasterDataService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(): Promise<MasterFaskesData> {
    const [organizations, serviceUnits, locations] = await Promise.all([
      this.prisma.healthcareOrganization.findMany({
        orderBy: [{ active: 'desc' }, { name: 'asc' }],
      }),
      this.prisma.serviceUnit.findMany({
        orderBy: [{ active: 'desc' }, { name: 'asc' }],
      }),
      this.prisma.location.findMany({
        orderBy: [{ active: 'desc' }, { name: 'asc' }],
      }),
    ]);

    return {
      organizations: organizations.map(toOrganization),
      serviceUnits: serviceUnits.map(toServiceUnit),
      locations: locations.map(toLocation),
    };
  }

  async createOrganization(input: unknown): Promise<OrganizationSummary> {
    const validated = this.validate(() => validateOrganizationInput(input));
    await this.ensureOrganizationParent(validated.parentId);
    try {
      const record = await this.prisma.healthcareOrganization.create({
        data: validated,
      });
      return toOrganization(record);
    } catch (error) {
      this.handleWriteError(error, 'Kode organisasi sudah digunakan');
    }
  }

  async updateOrganization(
    id: string,
    input: unknown,
  ): Promise<OrganizationSummary> {
    const validated = this.validate(() => validateOrganizationInput(input));
    if (validated.parentId === id) {
      throw new ConflictException({
        code: 'ORGANIZATION_SELF_PARENT',
        message: 'Organisasi tidak dapat menjadi induk bagi dirinya sendiri',
      });
    }
    await this.ensureExists(
      () => this.prisma.healthcareOrganization.findUnique({ where: { id } }),
      'Organisasi tidak ditemukan',
    );
    await this.ensureOrganizationParent(validated.parentId, id);
    try {
      const record = await this.prisma.healthcareOrganization.update({
        where: { id },
        data: { ...validated, parentId: validated.parentId ?? null },
      });
      return toOrganization(record);
    } catch (error) {
      this.handleWriteError(error, 'Kode organisasi sudah digunakan');
    }
  }

  async createServiceUnit(input: unknown): Promise<ServiceUnitSummary> {
    const validated = this.validate(() => validateServiceUnitInput(input));
    await this.ensureOrganization(validated.organizationId);
    await this.ensureServiceUnitParent(
      validated.parentId,
      validated.organizationId,
    );
    try {
      const record = await this.prisma.serviceUnit.create({ data: validated });
      return toServiceUnit(record);
    } catch (error) {
      this.handleWriteError(
        error,
        'Kode unit layanan sudah digunakan dalam organisasi ini',
      );
    }
  }

  async updateServiceUnit(
    id: string,
    input: unknown,
  ): Promise<ServiceUnitSummary> {
    const validated = this.validate(() => validateServiceUnitInput(input));
    if (validated.parentId === id) {
      throw new ConflictException({
        code: 'SERVICE_UNIT_SELF_PARENT',
        message: 'Unit layanan tidak dapat menjadi induk bagi dirinya sendiri',
      });
    }
    await this.ensureExists(
      () => this.prisma.serviceUnit.findUnique({ where: { id } }),
      'Unit layanan tidak ditemukan',
    );
    await this.ensureOrganization(validated.organizationId);
    await this.ensureServiceUnitParent(
      validated.parentId,
      validated.organizationId,
      id,
    );
    try {
      const record = await this.prisma.serviceUnit.update({
        where: { id },
        data: { ...validated, parentId: validated.parentId ?? null },
      });
      return toServiceUnit(record);
    } catch (error) {
      this.handleWriteError(
        error,
        'Kode unit layanan sudah digunakan dalam organisasi ini',
      );
    }
  }

  async createLocation(input: unknown): Promise<LocationSummary> {
    const validated = this.validate(() => validateLocationInput(input));
    await this.ensureOrganization(validated.organizationId);
    await this.ensureServiceUnit(
      validated.serviceUnitId,
      validated.organizationId,
    );
    await this.ensureLocationParent(
      validated.parentId,
      validated.organizationId,
    );
    try {
      const record = await this.prisma.location.create({ data: validated });
      return toLocation(record);
    } catch (error) {
      this.handleWriteError(
        error,
        'Kode lokasi sudah digunakan dalam organisasi ini',
      );
    }
  }

  async updateLocation(id: string, input: unknown): Promise<LocationSummary> {
    const validated = this.validate(() => validateLocationInput(input));
    if (validated.parentId === id) {
      throw new ConflictException({
        code: 'LOCATION_SELF_PARENT',
        message: 'Lokasi tidak dapat menjadi induk bagi dirinya sendiri',
      });
    }
    await this.ensureExists(
      () => this.prisma.location.findUnique({ where: { id } }),
      'Lokasi tidak ditemukan',
    );
    await this.ensureOrganization(validated.organizationId);
    await this.ensureServiceUnit(
      validated.serviceUnitId,
      validated.organizationId,
    );
    await this.ensureLocationParent(
      validated.parentId,
      validated.organizationId,
      id,
    );
    try {
      const record = await this.prisma.location.update({
        where: { id },
        data: {
          ...validated,
          parentId: validated.parentId ?? null,
          serviceUnitId: validated.serviceUnitId ?? null,
        },
      });
      return toLocation(record);
    } catch (error) {
      this.handleWriteError(
        error,
        'Kode lokasi sudah digunakan dalam organisasi ini',
      );
    }
  }

  private validate<T>(factory: () => T): T {
    try {
      return factory();
    } catch (error) {
      if (error instanceof MasterDataValidationError) {
        throw new BadRequestException({
          code: 'MASTER_DATA_VALIDATION_FAILED',
          message: error.message,
          errors: error.issues,
        });
      }
      throw error;
    }
  }

  private async ensureOrganization(id: string): Promise<void> {
    await this.ensureExists(
      () => this.prisma.healthcareOrganization.findUnique({ where: { id } }),
      'Organisasi induk tidak ditemukan',
    );
  }

  private async ensureOrganizationParent(
    parentId?: string,
    childId?: string,
  ): Promise<void> {
    if (!parentId) return;
    await this.ensureOrganization(parentId);
    if (!childId) return;

    await this.ensureNoHierarchyCycle(
      childId,
      parentId,
      async (id) => {
        const record = await this.prisma.healthcareOrganization.findUnique({
          where: { id },
          select: { parentId: true },
        });
        return record?.parentId;
      },
      'ORGANIZATION_HIERARCHY_CYCLE',
      'Organisasi tidak dapat dipindahkan menjadi anak dari turunannya',
    );
  }

  private async ensureServiceUnit(
    id: string | undefined,
    organizationId: string,
  ): Promise<void> {
    if (!id) return;
    const unit = await this.prisma.serviceUnit.findUnique({ where: { id } });
    if (!unit) throw new NotFoundException('Unit layanan tidak ditemukan');
    if (unit.organizationId !== organizationId) {
      throw new ConflictException({
        code: 'SERVICE_UNIT_ORGANIZATION_MISMATCH',
        message: 'Unit layanan harus berada pada organisasi yang sama',
      });
    }
  }

  private async ensureServiceUnitParent(
    parentId: string | undefined,
    organizationId: string,
    childId?: string,
  ): Promise<void> {
    if (!parentId) return;
    const parent = await this.prisma.serviceUnit.findUnique({
      where: { id: parentId },
    });
    if (!parent)
      throw new NotFoundException('Induk unit layanan tidak ditemukan');
    if (parent.organizationId !== organizationId) {
      throw new ConflictException({
        code: 'SERVICE_UNIT_PARENT_ORGANIZATION_MISMATCH',
        message: 'Induk unit layanan harus berada pada organisasi yang sama',
      });
    }
    if (!childId) return;

    await this.ensureNoHierarchyCycle(
      childId,
      parentId,
      async (id) => {
        const record = await this.prisma.serviceUnit.findUnique({
          where: { id },
          select: { parentId: true },
        });
        return record?.parentId;
      },
      'SERVICE_UNIT_HIERARCHY_CYCLE',
      'Unit layanan tidak dapat dipindahkan menjadi anak dari turunannya',
    );
  }

  private async ensureLocationParent(
    parentId: string | undefined,
    organizationId: string,
    childId?: string,
  ): Promise<void> {
    if (!parentId) return;
    const parent = await this.prisma.location.findUnique({
      where: { id: parentId },
    });
    if (!parent) throw new NotFoundException('Induk lokasi tidak ditemukan');
    if (parent.organizationId !== organizationId) {
      throw new ConflictException({
        code: 'LOCATION_PARENT_ORGANIZATION_MISMATCH',
        message: 'Induk lokasi harus berada pada organisasi yang sama',
      });
    }
    if (!childId) return;

    await this.ensureNoHierarchyCycle(
      childId,
      parentId,
      async (id) => {
        const record = await this.prisma.location.findUnique({
          where: { id },
          select: { parentId: true },
        });
        return record?.parentId;
      },
      'LOCATION_HIERARCHY_CYCLE',
      'Lokasi tidak dapat dipindahkan menjadi anak dari turunannya',
    );
  }

  private async ensureNoHierarchyCycle(
    childId: string,
    parentId: string,
    readParentId: (id: string) => Promise<string | null | undefined>,
    code: string,
    message: string,
  ): Promise<void> {
    const visited = new Set<string>();
    let currentId: string | undefined = parentId;

    while (currentId) {
      if (currentId === childId || visited.has(currentId)) {
        throw new ConflictException({ code, message });
      }
      visited.add(currentId);
      currentId = (await readParentId(currentId)) ?? undefined;
    }
  }

  private async ensureExists<T>(
    query: () => Promise<T | null>,
    message: string,
  ): Promise<T> {
    const record = await query();
    if (!record) throw new NotFoundException(message);
    return record;
  }

  private handleWriteError(error: unknown, conflictMessage: string): never {
    if (isKnownRequestError(error) && error.code === 'P2002') {
      throw new ConflictException({
        code: 'MASTER_DATA_CODE_CONFLICT',
        message: conflictMessage,
      });
    }
    throw error;
  }
}
