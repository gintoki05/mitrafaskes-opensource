import {
  OrganizationSummary,
  SatusehatOrganizationPayload,
} from '@mitrafaskes/shared';

export interface OrganizationTransformInput {
  organization: OrganizationSummary;
  rootOrganizationId: string;
  parentExternalId?: string;
  parentDisplay?: string;
  externalId?: string;
}

export class SatusehatOrganizationTransformer {
  static transform(
    input: OrganizationTransformInput,
  ): SatusehatOrganizationPayload {
    const isSubOrganization = input.organization.type === 'SUB_ORGANIZATION';
    const payload: SatusehatOrganizationPayload = {
      resourceType: 'Organization',
      identifier: [
        {
          use: 'official',
          system: `http://sys-ids.kemkes.go.id/organization/${input.rootOrganizationId}`,
          value: input.organization.code,
        },
      ],
      active: input.organization.active,
      type: [
        {
          coding: [
            {
              system: 'http://terminology.hl7.org/CodeSystem/organization-type',
              code: isSubOrganization ? 'dept' : 'prov',
              display: isSubOrganization
                ? 'Hospital Department'
                : 'Healthcare Provider',
            },
          ],
        },
      ],
      name: input.organization.name,
    };

    if (input.externalId) payload.id = input.externalId;

    const telecom = [
      input.organization.phone
        ? {
            system: 'phone' as const,
            value: input.organization.phone,
            use: 'work' as const,
          }
        : undefined,
      input.organization.email
        ? {
            system: 'email' as const,
            value: input.organization.email,
            use: 'work' as const,
          }
        : undefined,
    ].filter((item): item is NonNullable<typeof item> => Boolean(item));
    if (telecom.length > 0) payload.telecom = telecom;

    if (input.organization.addressText) {
      payload.address = [
        {
          use: 'work',
          type: 'both',
          text: input.organization.addressText,
          line: [input.organization.addressText],
          country: 'ID',
        },
      ];
    }

    if (input.parentExternalId) {
      payload.partOf = {
        reference: `Organization/${input.parentExternalId}`,
        display: input.parentDisplay,
      };
    }

    return payload;
  }
}
