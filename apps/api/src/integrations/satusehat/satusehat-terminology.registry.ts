import { Inject, Injectable, Optional } from '@nestjs/common';
import {
  AMBULATORY_CLASS,
  ATTENDER_PARTICIPATION,
} from './satusehat-encounter.constants';

export interface SatusehatTerminologyCoding {
  system: string;
  code: string;
  display: string;
}

export type SatusehatTerminologyKey =
  | 'encounter.class.ambulatory'
  | 'encounter.participant.attender'
  | 'encounter.serviceType';

export type SatusehatTerminologySource =
  'OFFICIAL_FIXED' | 'DATA_OR_CONFIGURATION';

export interface SatusehatTerminologyDefinition {
  key: SatusehatTerminologyKey;
  source: SatusehatTerminologySource;
  coding?: SatusehatTerminologyCoding;
}

export interface SatusehatTerminologyRegistryConfiguration {
  entries?: Partial<
    Record<SatusehatTerminologyKey, readonly SatusehatTerminologyCoding[]>
  >;
}

export const SATUSEHAT_TERMINOLOGY_CONFIGURATION = Symbol(
  'SATUSEHAT_TERMINOLOGY_CONFIGURATION',
);

export type SatusehatTerminologyErrorCode =
  'SATUSEHAT_TERMINOLOGY_MISSING' | 'SATUSEHAT_TERMINOLOGY_UNSUPPORTED';

export class SatusehatTerminologyError extends Error {
  constructor(
    public readonly code: SatusehatTerminologyErrorCode,
    message: string,
    public readonly terminologyKey: string,
  ) {
    super(message);
    this.name = 'SatusehatTerminologyError';
  }
}

const TERMINOLOGY_DEFINITIONS: readonly SatusehatTerminologyDefinition[] = [
  {
    key: 'encounter.class.ambulatory',
    source: 'OFFICIAL_FIXED',
    coding: AMBULATORY_CLASS,
  },
  {
    key: 'encounter.participant.attender',
    source: 'OFFICIAL_FIXED',
    coding: ATTENDER_PARTICIPATION,
  },
  {
    key: 'encounter.serviceType',
    source: 'DATA_OR_CONFIGURATION',
  },
];

@Injectable()
export class SatusehatTerminologyRegistry {
  private readonly definitions = new Map(
    TERMINOLOGY_DEFINITIONS.map((definition) => [definition.key, definition]),
  );

  constructor(
    @Optional()
    @Inject(SATUSEHAT_TERMINOLOGY_CONFIGURATION)
    private readonly configuration: SatusehatTerminologyRegistryConfiguration = {},
  ) {}

  listDefinitions(): readonly SatusehatTerminologyDefinition[] {
    return TERMINOLOGY_DEFINITIONS;
  }

  resolve(
    terminologyKey: SatusehatTerminologyKey,
    requested?: Pick<SatusehatTerminologyCoding, 'system' | 'code'>,
  ): SatusehatTerminologyCoding {
    const definition = this.definitions.get(terminologyKey);
    if (!definition) {
      throw new SatusehatTerminologyError(
        'SATUSEHAT_TERMINOLOGY_UNSUPPORTED',
        `Terminology SATUSEHAT tidak didukung: ${terminologyKey}`,
        terminologyKey,
      );
    }

    if (definition.source === 'OFFICIAL_FIXED') {
      const coding = definition.coding;
      if (!coding) {
        throw this.missingTerminology(terminologyKey);
      }
      if (
        requested &&
        (requested.system !== coding.system || requested.code !== coding.code)
      ) {
        throw this.unsupportedTerminology(terminologyKey);
      }
      return { ...coding };
    }

    if (!requested?.system.trim() || !requested.code.trim()) {
      throw this.missingTerminology(terminologyKey);
    }

    const configuredCoding = this.configuration.entries?.[terminologyKey]?.find(
      (coding) =>
        this.isCompleteCoding(coding) &&
        coding.system === requested.system &&
        coding.code === requested.code,
    );
    if (!configuredCoding) {
      throw this.unsupportedTerminology(terminologyKey);
    }

    return { ...configuredCoding };
  }

  private missingTerminology(
    terminologyKey: SatusehatTerminologyKey,
  ): SatusehatTerminologyError {
    return new SatusehatTerminologyError(
      'SATUSEHAT_TERMINOLOGY_MISSING',
      `Terminology SATUSEHAT wajib tersedia: ${terminologyKey}`,
      terminologyKey,
    );
  }

  private unsupportedTerminology(
    terminologyKey: SatusehatTerminologyKey,
  ): SatusehatTerminologyError {
    return new SatusehatTerminologyError(
      'SATUSEHAT_TERMINOLOGY_UNSUPPORTED',
      `Terminology SATUSEHAT tidak didukung: ${terminologyKey}`,
      terminologyKey,
    );
  }

  private isCompleteCoding(coding: SatusehatTerminologyCoding): boolean {
    return Boolean(
      coding.system.trim() && coding.code.trim() && coding.display.trim(),
    );
  }
}
