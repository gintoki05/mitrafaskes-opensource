import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  LocationStatus,
  LocationType,
  OrganizationType,
  Prisma,
} from '@prisma/client';
import {
  LocationSummary,
  MasterDataListQuery,
  MasterDataListResponse,
  MasterFaskesData,
  OrganizationSummary,
  ResourceIntegrationSummary,
} from '@mitrafaskes/shared';
import { PrismaService } from '../database/prisma.service';
import { IntegrationRegistry } from '../integrations/integration-registry';
import {
  MasterDataValidationError,
  validateLocationInput,
  validateOrganizationInput,
} from './master-data.validation';

const optional = (value: string | null | undefined): string | undefined =>
  value ?? undefined;

const optionalNumber = (value: unknown): number | undefined => {
  if (typeof value === 'number') return value;
  if (
    typeof value === 'object' &&
    value !== null &&
    'toNumber' in value
  ) {
    const decimal = value as { toNumber?: () => number };
    return typeof decimal.toNumber === 'function'
      ? decimal.toNumber()
      : undefined;
  }
  return undefined;
};

const toOrganization = (
  record: Prisma.HealthcareOrganizationGetPayload<Prisma.HealthcareOrganizationDefaultArgs>,
  integrations: ResourceIntegrationSummary[] = [],
): OrganizationSummary => ({
  id: record.id,
  code: record.code,
  name: record.name,
  type: record.type,
  parentId: optional(record.parentId),
  addressText: optional(record.addressText),
  phone: optional(record.phone),
  email: optional(record.email),
  integrations,
  active: record.active,
  createdAt: record.createdAt.toISOString(),
  updatedAt: record.updatedAt.toISOString(),
});

const toLocation = (
  record: Prisma.LocationGetPayload<Prisma.LocationDefaultArgs>,
  integrations: ResourceIntegrationSummary[] = [],
): LocationSummary => ({
  id: record.id,
  organizationId: record.organizationId,
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
  integrations,
  latitude: optionalNumber(record.latitude),
  longitude: optionalNumber(record.longitude),
  altitude: optionalNumber(record.altitude),
  active: record.active,
  createdAt: record.createdAt.toISOString(),
  updatedAt: record.updatedAt.toISOString(),
});

const isKnownRequestError = (
  error: unknown,
): error is Prisma.PrismaClientKnownRequestError =>
  error instanceof Prisma.PrismaClientKnownRequestError;

const DEFAULT_PAGE = 1;
const DEFAULT_PAGE_SIZE = 25;
const MAX_PAGE_SIZE = 100;

type NormalizedListQuery = Omit<MasterDataListQuery, 'page' | 'pageSize'> & {
  page: number;
  pageSize: number;
};

const normalizeListQuery = (
  query: MasterDataListQuery = {},
): NormalizedListQuery => {
  const page = Number.isInteger(query.page) && query.page! > 0
    ? query.page!
    : DEFAULT_PAGE;
  const pageSize = Number.isInteger(query.pageSize) && query.pageSize! > 0
    ? Math.min(query.pageSize!, MAX_PAGE_SIZE)
    : DEFAULT_PAGE_SIZE;

  return { ...query, page, pageSize };
};

const searchOr = (search: string | undefined, fields: string[]) =>
  search
    ? fields.map((field) => ({
        [field]: { contains: search, mode: 'insensitive' as const },
      }))
    : undefined;

const orderBy = (query: NormalizedListQuery) => {
  const field = query.sort ?? 'name';
  const direction = query.direction ?? 'asc';
  return [{ [field]: direction }, { name: 'asc' }] as Record<string, string>[];
};

@Injectable()
export class MasterDataService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly integrations?: IntegrationRegistry,
  ) {}

  async findAll(): Promise<MasterFaskesData> {
    const [organizations, locations] = await Promise.all([
      this.prisma.healthcareOrganization.findMany({
        orderBy: [{ active: 'desc' }, { name: 'asc' }],
      }),
      this.prisma.location.findMany({
        orderBy: [{ active: 'desc' }, { name: 'asc' }],
      }),
    ]);

    const [organizationIntegrations, locationIntegrations] = this.integrations
      ? await Promise.all([
          this.integrations.findResourceSummaries(
            'Organization',
            organizations.map((organization) => organization.id),
          ),
          this.integrations.findResourceSummaries(
            'Location',
            locations.map((location) => location.id),
          ),
        ])
      : [new Map(), new Map()];

    return {
      organizations: organizations.map((organization) =>
        toOrganization(
          organization,
          organizationIntegrations.get(organization.id) ?? [],
        ),
      ),
      locations: locations.map((location) =>
        toLocation(location, locationIntegrations.get(location.id) ?? []),
      ),
    };
  }

  async findOrganizations(
    input: MasterDataListQuery = {},
  ): Promise<MasterDataListResponse<OrganizationSummary>> {
    const query = normalizeListQuery(input);
    const baseWhere: Prisma.HealthcareOrganizationWhereInput = {};
    const search = searchOr(query.search, ['code', 'name', 'addressText']);

    if (search) baseWhere.OR = search;
    if (query.type) baseWhere.type = query.type as OrganizationType;

    const where: Prisma.HealthcareOrganizationWhereInput = {
      ...baseWhere,
    };
    if (query.active !== undefined) where.active = query.active;
    const activeWhere: Prisma.HealthcareOrganizationWhereInput = {
      ...baseWhere,
      active: true,
    };
    const inactiveWhere: Prisma.HealthcareOrganizationWhereInput = {
      ...baseWhere,
      active: false,
    };

    const [records, total, activeCount, inactiveCount] = await Promise.all([
      this.prisma.healthcareOrganization.findMany({
        where,
        orderBy: orderBy(query),
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
      }),
      this.prisma.healthcareOrganization.count({ where }),
      this.prisma.healthcareOrganization.count({ where: activeWhere }),
      this.prisma.healthcareOrganization.count({ where: inactiveWhere }),
    ]);
    const integrations = this.integrations
      ? await this.integrations.findResourceSummaries(
          'Organization',
          records.map((record) => record.id),
        )
      : new Map();

    return {
      items: records.map((record) =>
        toOrganization(record, integrations.get(record.id) ?? []),
      ),
      meta: { page: query.page, pageSize: query.pageSize, total },
      statusCounts: { active: activeCount, inactive: inactiveCount },
    };
  }

  async findLocations(
    input: MasterDataListQuery = {},
  ): Promise<MasterDataListResponse<LocationSummary>> {
    const query = normalizeListQuery(input);
    const baseWhere: Prisma.LocationWhereInput = {};
    const search = searchOr(query.search, ['code', 'name', 'city']);

    if (search) baseWhere.OR = search;
    if (query.type) baseWhere.type = query.type as LocationType;
    if (query.status) baseWhere.status = query.status as LocationStatus;
    if (query.organizationId) baseWhere.organizationId = query.organizationId;

    const where: Prisma.LocationWhereInput = { ...baseWhere };
    if (query.active !== undefined) where.active = query.active;
    const activeWhere: Prisma.LocationWhereInput = {
      ...baseWhere,
      active: true,
    };
    const inactiveWhere: Prisma.LocationWhereInput = {
      ...baseWhere,
      active: false,
    };

    const [records, total, activeCount, inactiveCount] = await Promise.all([
      this.prisma.location.findMany({
        where,
        orderBy: orderBy(query),
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
      }),
      this.prisma.location.count({ where }),
      this.prisma.location.count({ where: activeWhere }),
      this.prisma.location.count({ where: inactiveWhere }),
    ]);
    const integrations = this.integrations
      ? await this.integrations.findResourceSummaries(
          'Location',
          records.map((record) => record.id),
        )
      : new Map();

    return {
      items: records.map((record) =>
        toLocation(record, integrations.get(record.id) ?? []),
      ),
      meta: { page: query.page, pageSize: query.pageSize, total },
      statusCounts: { active: activeCount, inactive: inactiveCount },
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

  async createLocation(input: unknown): Promise<LocationSummary> {
    const validated = this.validate(() => validateLocationInput(input));
    await this.ensureOrganization(validated.organizationId);
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
          latitude: validated.latitude ?? null,
          longitude: validated.longitude ?? null,
          altitude: validated.altitude ?? null,
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
