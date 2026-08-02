# Design QA — Arctic Cyan + Ink RME

final result: passed

Date: 2026-08-02

## Review coverage

- `/login` reviewed at the default desktop viewport and at 390×844. The split ink-navy/white layout with a blue-white canvas fits the viewport without horizontal overflow.
- `/rme` reviewed with a signed-in doctor demo session. The new shell, navigation, page heading, patient context, queue, clinical forms, and status treatments render together.
- `/pendaftaran` reviewed with a signed-in admin demo session. The table-first layout, search toolbar, queue rows, responsive table scroll container, and patient-registration dialog were checked.
- Desktop sidebar reviewed in expanded and collapsed icon-rail states. The topbar trigger, persisted state, accessible navigation labels, and content/topbar offset were checked.
- The patient list API returned an empty list in this local run; the empty table state was reviewed, while the queue rendered two existing local encounters.
- Mobile metrics at 390×844: document scroll width stayed within the viewport; the dense table used an intentional 850px inner scroll width inside a 348px container.
- Arctic Cyan + Ink palette spot-check: body text on blue-white measured 13.01:1, primary button text on cyan-teal 5.59:1, sidebar text on ink navy 11.48:1, and sidebar secondary text 7.58:1.

## Interaction checks

- Login submit navigated to the role default route.
- Role-aware navigation exposed the expected links for doctor and admin sessions.
- Sidebar trigger collapsed the rail from 256px to 72px; `Ctrl+B` / `Cmd+B` toggled it back, and the main content followed the rail without horizontal overflow.
- Registration navigation opened `/pendaftaran` through the product menu.
- “Pasien Baru” opened a labelled dialog with the NIK field focused.
- Escape/cancel path remains wired to close the dialog.
- Console errors and warnings were empty during the final browser check.

## Automated checks

- Impeccable detector: `[]`
- `npm --workspace=apps/web run lint`: passed with one pre-existing warning in `apps/web/types/env.d.ts` (`NodeJS` unused).
- `npm run build`: passed for API, shared, database, and web workspaces.
