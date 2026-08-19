# Mitra Faskes RME — Arctic Cyan + Ink

## Design contract

Mitra Faskes is an operational workspace for Indonesian clinics. The visual system should feel dependable, scan-friendly, and ready for busy outpatient work: crisp white-blue surfaces, an ink navy utility shell, a cyan clinical action color, explicit clinical statuses, and one obvious next action per context.

The supplied RME screenshot and the public [Figma dashboard templates](https://www.figma.com/templates/dashboard-designs/) page informed the interaction grammar only. Product data, brand identity, and logo treatment remain Mitra Faskes-owned.

## Visual world

- **Primary:** cyan-teal (`#0B7285`) for primary actions, page titles, and selected affordances; ink navy owns the persistent sidebar and topbar.
- **Canvas:** pale blue-white background (`#F5FAFC` direction) with white tables and form surfaces (`#FFFFFF`).
- **Signals:** green-teal for connected/success, amber for waiting/attention, coral-red for destructive/error, and restrained slate-blue for information.
- **Typography:** system sans for UI and clinical text; system mono for NIK, medical record numbers, ICD-10 codes, vital signs, and FHIR identifiers.
- **Geometry:** 8px controls, 10px cards, 12px panels. Borders carry structure; shadows are reserved for dialogs and the login frame.

## Application shell

Desktop uses a 256px persistent sidebar and an ink-navy utility topbar. The sidebar owns facility identity, feature search, role-aware navigation, support, and logout. The topbar owns facility context, SATUSEHAT connection state, user identity, and logout. The sidebar follows a shadcn-style provider/trigger pattern: it collapses to an icon rail, keeps labels available to assistive technology, persists the choice locally, and responds to `Ctrl+B` / `Cmd+B`.

When collapsed, the main content and topbar follow the narrower rail width so the work surface never sits underneath the navigation. On smaller screens the sidebar is replaced by a horizontal, scrollable navigation bar below the topbar. The main content reserves the topbar space and avoids horizontal page overflow.

## Core surfaces

### Login

The login surface is a split workspace: an ink-navy product/context panel and a focused white authentication panel. Demo accounts remain available for local development. Labels are visible, credentials use browser autocomplete hints, and the primary action is full-width.

### Pendaftaran & Antrean

The registration screen focuses on creating patients and managing the active queue. Patient creation is a focused dialog, while the queue remains a separate status surface rather than competing with the clinical examination workspace.

### RME and integration screens

RME, Master Faskes, and SATUSEHAT use the same shell, tokens, border language, status vocabulary, focus ring, and responsive content width. Existing clinical workflows, permission gates, API calls, and Indonesian terminology remain intact.

Within RME, SATUSEHAT completion is presented as one four-step operational
sequence: Encounter awal, Condition diagnosis, Observation tanda vital, then
Encounter selesai. Each step names its dependency, uses linkage from
`ExternalResourceLink`, preserves a successful linkage when the latest retry
fails, and keeps resource actions inside the completion panel instead of
scattering them through clinical form sections. Observation progress covers
every saved item, but it does not block Encounter `finished` unless an official
profile later requires that dependency.

## Interaction rules

1. Keep status text explicit; never rely on color alone.
2. Use `data-surface` for data tables and operational lists; use cards for contextual groups and dialogs.
3. Keep one clear primary action visible at the page or dialog level.
4. Preserve semantic table headers, dialog labels/descriptions, visible focus, keyboard shortcuts, and horizontal scrolling for dense tables on small screens.
5. Do not introduce decorative gradients, glass surfaces, oversized shadows, or duplicated “dashboard card” summaries without new information.

## Source of truth

- Tokens and responsive shell: `apps/web/app/globals.css`
- Shell/navigation: `apps/web/components/Navbar.tsx`
- Page heading: `apps/web/components/PageHeader.tsx`
- Patient work surface: `apps/web/components/screens/PendaftaranScreen.tsx`
- Login work surface: `apps/web/components/screens/LoginScreen.tsx`
- Product context: `PRODUCT.md`
