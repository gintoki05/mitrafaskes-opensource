# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Mitra Faskes is used by clinic administrators handling patient registration and queues, nurses handling triage and vital signs, and doctors completing outpatient electronic medical records.

## Product Purpose

Provide an open-source Indonesian electronic medical record workspace that lets a facility manage patients, outpatient queues, clinical documentation, master facility data, and SATUSEHAT synchronization in one workflow. Success means staff can complete the next clinical or administrative task quickly, with clear status and recovery when synchronization fails.

## Positioning

The product combines local clinical workflows with SATUSEHAT-oriented resource and synchronization handling, so the facility's operational records and external health-data integration can be managed from the same workspace.

## Operating Context

The application is used in busy outpatient clinic settings where registration, queue handling, triage, examination, prescription entry, and synchronization may happen in parallel. Doctors and staff need scan-friendly data, fast search, keyboard-friendly forms, and explicit status feedback during short patient encounters.

## Capabilities and Constraints

- Preserve the existing Next.js web application, routes, permissions, API contracts, and Indonesian product terminology.
- Core surfaces include login, patient registration and queue, doctor RME, master facility data, SATUSEHAT monitoring, and access-denied states.
- Clinical status must be communicated with explicit text and not color alone.
- The redesign may replace the visual system and application shell, but it must not fabricate clinical, regulatory, customer, or performance claims.

## Brand Commitments

- Preserve the product name Mitra Faskes.
- The user-selected reference establishes the desired operational interface grammar: persistent navigation, a utility bar, strong page title, search-led data work, table/list rows, and lightweight row actions.
- The supplied reference's brand name, logo, and sample data are visual inspiration only and must not be copied into the product.

## Evidence on Hand

- `docs/design_system.md`
- `docs/ui_ux_psychology_rme.md`
- Existing route and component implementation under `apps/web`
- User-provided screenshot reference in the current conversation
- Public dashboard patterns reviewed from the [Figma dashboard templates](https://www.figma.com/templates/dashboard-designs/) page

## Product Principles

1. Make the next clinic task obvious within seconds.
2. Keep data dense enough for operations but calm enough for long sessions.
3. Make status, ownership, and recovery actions explicit.
4. Reduce repeated entry through search, keyboard flow, and reusable clinical patterns.
5. Preserve product truth while allowing the visual system to evolve.

## Accessibility & Inclusion

Target WCAG AA behavior where applicable: keyboard navigation, visible focus, readable contrast, semantic controls, clear form labels, responsive layouts, and status communication that does not depend on color alone.
