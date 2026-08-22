import {
  IntegrationRegistry,
  IntegrationDisabledError,
  IntegrationProviderNotFoundError,
} from './integration-registry';
import type { IntegrationCoreOptions } from './integration.types';

const options: IntegrationCoreOptions = {
  providers: [
    {
      provider: 'SATUSEHAT',
      displayName: 'SATUSEHAT',
      environment: 'sandbox',
      resources: [
        'Organization',
        'Location',
        'Practitioner',
        'Patient',
        'Encounter',
      ],
      operations: ['search', 'import', 'preview', 'sync', 'link', 'logs'],
    },
  ],
};

describe('IntegrationRegistry', () => {
  it('describes a known provider as disabled until its plugin is registered', async () => {
    const registry = new IntegrationRegistry(options);

    await expect(registry.getCapabilities()).resolves.toEqual({
      integrations: [
        expect.objectContaining({
          provider: 'SATUSEHAT',
          enabled: false,
          status: 'DISABLED',
        }),
      ],
    });
    await expect(
      registry.getConnectionStatus('satusehat'),
    ).rejects.toBeInstanceOf(IntegrationDisabledError);
    await expect(registry.getConnectionSummary('satusehat')).resolves.toEqual({
      provider: 'SATUSEHAT',
      displayName: 'SATUSEHAT',
      enabled: false,
      status: 'DISABLED',
      environment: 'sandbox',
    });
  });

  it('returns only the connection summary for authenticated status indicators', async () => {
    const registry = new IntegrationRegistry(options);
    registry.register({
      provider: 'SATUSEHAT',
      getConnectionStatus: jest.fn().mockResolvedValue({
        provider: 'SATUSEHAT',
        displayName: 'SATUSEHAT',
        enabled: true,
        status: 'CONNECTED',
        environment: 'sandbox',
        resources: [],
        operations: [],
        connection: { token: 'must-not-leak' },
      }),
    } as never);

    await expect(registry.getConnectionSummary('SATUSEHAT')).resolves.toEqual({
      provider: 'SATUSEHAT',
      displayName: 'SATUSEHAT',
      enabled: true,
      status: 'CONNECTED',
      environment: 'sandbox',
    });
  });

  it('returns a typed 503 for a known provider without a plugin', () => {
    const registry = new IntegrationRegistry(options);

    expect(() => registry.getPlugin('SATUSEHAT')).toThrow(
      IntegrationDisabledError,
    );
    try {
      registry.getPlugin('SATUSEHAT');
    } catch (error) {
      expect(error).toBeInstanceOf(IntegrationDisabledError);
      expect((error as IntegrationDisabledError).getStatus()).toBe(503);
      expect((error as IntegrationDisabledError).getResponse()).toEqual(
        expect.objectContaining({ code: 'INTEGRATION_DISABLED' }),
      );
    }
  });

  it('blocks Encounter sync routing while the optional plugin is disabled', () => {
    const registry = new IntegrationRegistry(options);

    expect(() => registry.getResourceHandler('SATUSEHAT', 'Encounter')).toThrow(
      IntegrationDisabledError,
    );
  });

  it('returns a typed 404 for an unknown provider', () => {
    const registry = new IntegrationRegistry(options);

    expect(() => registry.getPlugin('unknown-provider')).toThrow(
      IntegrationProviderNotFoundError,
    );
    try {
      registry.getPlugin('unknown-provider');
    } catch (error) {
      expect(error).toBeInstanceOf(IntegrationProviderNotFoundError);
      expect((error as IntegrationProviderNotFoundError).getStatus()).toBe(404);
      expect((error as IntegrationProviderNotFoundError).getResponse()).toEqual(
        expect.objectContaining({ code: 'INTEGRATION_PROVIDER_NOT_FOUND' }),
      );
    }
  });
});
