import { HttpException, Injectable, Optional } from '@nestjs/common';
import type { SatusehatConditionPreview } from './satusehat-condition.contract';
import { SatusehatConditionPreflightService } from './satusehat-condition-preflight.service';
import { SatusehatEncounterService } from './satusehat-encounter.service';

@Injectable()
export class SatusehatConditionEncounterLifecycleService {
  constructor(
    private readonly preflight: SatusehatConditionPreflightService,
    @Optional() private readonly encounters?: SatusehatEncounterService,
  ) {}

  async preparePreview(
    localResourceId: string,
    environment: string,
  ): Promise<{
    preview: SatusehatConditionPreview;
    encounterBootstrapSyncLogId?: string;
  }> {
    try {
      return {
        preview: await this.preflight.preparePreview(
          localResourceId,
          environment,
        ),
      };
    } catch (error) {
      const encounterId = this.recoverableEncounterId(error);
      if (!encounterId || !this.encounters) throw error;

      const bootstrap =
        await this.encounters.syncHistoricalInProgressEncounter(encounterId);
      return {
        preview: await this.preflight.preparePreview(
          localResourceId,
          environment,
        ),
        encounterBootstrapSyncLogId: bootstrap.syncLogId,
      };
    }
  }

  async projectFinished(encounterId: string): Promise<string | undefined> {
    if (!this.encounters) return undefined;
    try {
      const result = await this.encounters.syncEncounter(encounterId);
      return result.syncLogId;
    } catch {
      // Condition remains successful. EncounterService owns the separate
      // failed audit entry and the operator can retry the final projection.
      return undefined;
    }
  }

  private recoverableEncounterId(error: unknown): string | undefined {
    if (!(error instanceof HttpException)) return undefined;
    const response = error.getResponse();
    if (!isRecord(response)) return undefined;
    const dependencies = response.dependencies;
    if (
      response.code !== 'SATUSEHAT_CONDITION_DEPENDENCY_MISSING' ||
      !Array.isArray(dependencies) ||
      dependencies.length !== 1 ||
      dependencies[0] !== 'Encounter' ||
      !Array.isArray(response.issues)
    ) {
      return undefined;
    }

    const encounterIssue = (response.issues as unknown[]).find(
      (issue) =>
        isRecord(issue) &&
        issue.resourceType === 'Encounter' &&
        typeof issue.localResourceId === 'string',
    );
    return isRecord(encounterIssue)
      ? (encounterIssue.localResourceId as string)
      : undefined;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}
