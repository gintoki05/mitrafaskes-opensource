# API integration architecture

- Register optional providers only from `apps/api/src/app.module.ts`, the
  composition root. Domain modules must depend on generic contracts such as
  `IntegrationRegistry`, never on a provider client or provider adapter.
- `IntegrationGatewayController` owns generic capability, connection, log, and
  resource-operation routes. Provider controllers must not be added to Patient,
  Practitioner, Encounter, or Master Data core modules.
- Local CRUD, validation, and transactions must remain usable when all optional
  integrations are disabled. They may read provider-neutral integration
  summaries, but must not initialize OAuth/FHIR clients or read
  `SatusehatSyncLog`.
- An unknown provider returns `404 INTEGRATION_PROVIDER_NOT_FOUND`; a known
  provider that is not registered returns `503 INTEGRATION_DISABLED`.
- The SATUSEHAT plugin owns auth, FHIR, FHIR mappers, remote services, master
  data adapters, and `SatusehatSyncLog` access. Its feature flag is opt-in and
  must be exactly `INTEGRATION_SATUSEHAT_ENABLED=true`.
