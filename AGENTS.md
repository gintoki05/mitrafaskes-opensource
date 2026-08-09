# Repository architecture rules

These rules apply to the whole repository. More specific `AGENTS.md` files may
add rules for their directory.

## Keep code organized by responsibility

- Keep route/page files thin. A route should compose a feature screen instead
  of containing business logic, data fetching, or a large form implementation.
- A screen or component should have one primary responsibility. Split UI,
  forms, data access, state management, and presentation when they become
  separate concerns.
- Prefer feature-local folders for related components, types, constants, and
  utilities. Do not create a generic shared abstraction until there is a real
  reuse case.
- A line count is not a design rule by itself, but treat a file above roughly
  300 lines as a refactor signal and review every file above 500 lines before
  adding more code. A file above 500 lines needs a clear justification or a
  responsibility-based split.
- Do not solve a crowded file only by moving declarations to the bottom. Move
  coherent behavior behind a named component, hook, utility, or feature module.

## Types, constants, and reuse

- Keep domain/API contracts in `packages/shared` when they cross app
  boundaries. Keep UI-only draft form types and display options inside the
  owning feature.
- Keep constants close to their feature unless they are genuinely shared.
- Reuse existing UI primitives and feature components before creating another
  implementation of the same pattern.
- Avoid generic components with many unrelated props. A smaller feature
  component with a focused interface is preferred.

## Safe refactoring workflow

- Preserve current behavior, permissions, accessibility labels, route imports,
  and user-visible copy unless the task explicitly changes them.
- Before extracting a component, identify its state owner and callback
  contract. Keep one source of truth for each piece of state.
- Do not move server/client boundaries casually. Keep interactive logic in the
  smallest client component that needs it.
- After a structural refactor, run the narrowest relevant lint/type check first,
  then the application build when practical. Review the final diff for import
  cycles, accidental behavior changes, and duplicated code.

## AI implementation checklist

Before adding substantial code to an existing file, the AI should:

1. Inspect the file size and list its current responsibilities.
2. Search for existing feature-local components, hooks, types, and UI
   primitives that can be reused.
3. Split a crowded file before extending it when the new code introduces a new
   responsibility or pushes the file beyond the review thresholds above.
4. Report which files were changed and which verification commands were run.

## Product sequence and decision gates

- Follow the current resource sequence unless the user explicitly changes it:
  `Organization -> Location -> Practitioner -> Patient -> Encounter ->
  Condition -> Observation`.
- Treat the catalog, domain dependency rules, and the user's explicit scope as
  the source of truth for what comes next. Do not infer the next resource only
  from an implementation detail or an isolated FHIR reference.
- Before implementing a new resource, write down its prerequisite resources,
  local-first behavior, remote operation, linkage/log behavior, and the manual
  test scenario. If the order or intended behavior is ambiguous, stop and ask
  instead of choosing a different sequence silently.

## Frontend design-system contract

- Reuse the existing shadcn-compatible primitives under
  `apps/web/components/ui` and feature wrappers before creating a new control.
  Selects must use the shared Select/SelectField implementation; do not add a
  one-off native select or duplicate dropdown styling without a documented
  reason.
- Treat `apps/web/app/globals.css`, the shared UI primitives, and neighboring
  screens as the incumbent visual system. Fix a local visual defect at the
  narrowest component level; do not change global tokens to solve one state.
- Keep domain/API contracts in `packages/shared`; keep form draft state and
  display-only options feature-local.

## Server boundary and delivery gates

- Next pages should remain Server Components by default and compose the
  smallest client boundary needed for interaction. In this repository,
  application data access belongs in the NestJS API and frontend hooks; use
  `'use server'` only for an intentional Next Server Action, not as a generic
  replacement for the API.
- Before commit, verify the affected architecture with the narrowest relevant
  tests, lint/typecheck, build, migration/schema checks when applicable, and a
  browser/manual path for UI changes. Review the final diff for duplicated
  components, accidental route/import changes, oversized files, and false
  sync status.
- A feature is not complete merely because its local form works: its loading,
  empty, error, disabled, permission, linkage, and repeat-sync states must be
  accounted for when they apply.

## SATUSEHAT integration rules

These rules apply to every feature or resource that interacts with SATUSEHAT,
including Organization, Location, Practitioner, Patient, and future FHIR
resources.

- Local data must remain usable and editable independently from SATUSEHAT. A
  local create or update must not be treated as a remote sync automatically.
- Every list or detail surface that contains a syncable local record must expose
  a per-record `Sinkronkan SATUSEHAT` action. The action may open a preview
  first, but it must provide the complete path to send the selected record.
- After a successful remote create, update, link, or import, persist the
  provider/environment/resource linkage in `ExternalResourceLink` and record
  the attempt in `SatusehatSyncLog`. The linkage is the source of truth for
  whether a local record has been connected to SATUSEHAT.
- List responses for syncable resources must expose the linkage status needed by
  the UI. The UI must display the SATUSEHAT logo and a clear connected status
  after a successful linkage, and a clear not-yet-synced state when no
  successful linkage exists. Do not infer this status from local fields or
  temporary dialog state.
- Refresh the affected list after a successful sync so the logo, external ID,
  and current status are visible without a full page reload. A later sync of a
  linked record must use the resource's update operation and preserve the
  linkage.
- Remote failures must not create a false connected status. Keep the failure in
  `SatusehatSyncLog`, show an actionable error to the user, and retain an
  existing successful linkage only as a last-known connection while making the
  latest failure discoverable.
- Enforce FHIR dependency order before sending a resource. If a referenced
  Organization, parent Location, Practitioner, or other prerequisite is not
  linked, block the sync with a specific dependency message and do not attempt
  an invalid remote request.
- Reuse the shared SATUSEHAT status/logo and preview/sync patterns. Add unit
  tests for linkage persistence and failure handling, plus a manual sandbox
  check for one new record and one repeat sync whenever a new resource adapter
  is introduced.

## Local runtime cleanup

- Assume the frontend and backend are already running when manual verification
  is needed. Access the existing project ports directly instead of starting
  another frontend or backend process.
- Do not stop, restart, or otherwise take ownership of the user's frontend or
  backend processes after verification. If a required port is unavailable,
  report it to the user rather than starting a replacement server.
