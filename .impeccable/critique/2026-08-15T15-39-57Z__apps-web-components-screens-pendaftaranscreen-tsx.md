---
target: workspace Pendaftaran + shared shell
total_score: 23
max_score: 40
na_heuristics: 
p0_count: 0
p1_count: 4
timestamp: 2026-08-15T15-39-57Z
slug: apps-web-components-screens-pendaftaranscreen-tsx
---
Method: dual-agent (A: Arendt · B: Gibbs)

# Impeccable critique — workspace Pendaftaran + shared shell

## Design Health Score

| # | Heuristic | Score | Key Issue |
|---|---|---:|---|
| 1 | Visibility of System Status | 3/4 | Loading, error, toast, and linkage states exist, but search and row-level busy feedback are weak. |
| 2 | Match Between System / Real World | 3/4 | Clinic concepts are present, but `Encounter`, `Location`, and lifecycle language leak into front-desk work. |
| 3 | User Control and Freedom | 3/4 | Cancel, Escape, retry, and unsaved-change protection are good; search has no clear/reset path. |
| 4 | Consistency and Standards | 2/4 | Styling is broadly shared, but terminology, action priority, and the non-functional feature search undermine trust. |
| 5 | Error Prevention | 3/4 | Validation and dependent fields help; queue cancellation needs stronger protection. |
| 6 | Recognition Rather Than Recall | 2/4 | Labels are generally present, but row actions rely on icon recognition and hover titles. |
| 7 | Flexibility and Efficiency | 2/4 | Sidebar collapse and keyboard tab flow help; there are no task shortcuts, bulk actions, or search-focus shortcut. |
| 8 | Aesthetic and Minimalist Design | 2/4 | Orderly but visually noisy: small text, border repetition, wide rows, badges, and peer-level actions. |
| 9 | Error Recovery | 2/4 | Retry exists in some flows; initial patient-list failure can strand the operator without a direct retry. |
| 10 | Help and Documentation | 1/4 | “Bantuan sistem” is static text and there is no contextual workflow help. |
| **Total** |  | **23/40** | **Acceptable, but significant improvement is needed.** |

## Design Specificity Verdict

### LLM assessment

The product is specific in its data and language—NIK, nomor rekam medis, antrean, SATUSEHAT, and permissions—but visually it is category-interchangeable: dark SaaS sidebar, dark topbar, pale canvas, white bordered cards, teal buttons, pill filters, Lucide icons, and a dense CRUD table.

The complaint that the UI feels “mual” is justified. It is not one bad font or one bad color. It is cumulative visual friction:

- many small labels (`text-xs`, `text-[10px]`, `text-[11px]`) and uppercase letter spacing;
- multiple border-radius + border surfaces around heading, tabs, toolbar, table, dialogs, and rows;
- repeated teal/green/amber/red signals, so color does not establish a clear priority;
- wide, information-heavy rows that require horizontal scanning;
- four peer-level icon actions where one action is the real next step.

The system feels more like a generic admin dashboard carrying clinic vocabulary than a calm, purpose-built registration workspace.

### Deterministic scan

The Impeccable detector scanned `Navbar.tsx`, `PageHeader.tsx`, `PendaftaranScreen.tsx`, `LoginScreen.tsx`, and the `screens/pendaftaran` feature tree. It returned `[]` with exit code `0`: zero mechanical findings, with no rule names, severities, or locations, and no false positives.

This is useful evidence, not a clean bill of health. The detector does not measure operational density, hierarchy, reading fatigue, or whether four actions have equal visual weight.

### Browser evidence

The local app was inspected at `1280×720` and `390×844` on fresh tabs. `/pendaftaran` remained at the access gate (`Memeriksa akses`) after about 4.5 seconds, so the authenticated table was not pixel-inspected. The shared shell measured `256px` sidebar + `64px` topbar on desktop. `/login` rendered successfully:

- desktop frame: `1208×688` at x=`32`, y=`32`;
- brand panel: `470px`, auth panel: `736px`;
- mobile login frame: `350px` wide and `1054px` tall; the submit button begins below the initial `844px` viewport;
- sampled contrast was strong: body `13.01:1`, shell text `11.48:1`, submit button `5.59:1`.

No user-visible detector overlay is available: browser page evaluation was read-only, so injection was skipped. The actual render and DOM were still inspected; no horizontal overflow was observed on the unauthenticated shell.

## Overall Impression

The foundation is competent and accessible enough to operate, but the default reading surface is over-specified. The single biggest opportunity is to redesign the first viewport around one clinic task: **find patient → confirm identity → enter queue**. Make that path quieter, wider in type, narrower in information, and clearer in action priority.

## What's Working

- The patient/queue split in `PendaftaranScreen.tsx` matches real clinic work.
- Status is usually explicit text rather than color alone: `AKTIF`, `MENUNGGU`, `Terhubung`, `Belum tersinkron`, and `Sync terakhir gagal`.
- Accessibility foundations are solid: skip link, semantic tabs, focus rings, table headers/caption, labeled icon actions, modal Escape handling, and unsaved-change protection.

## Cognitive Load

The surface has high extraneous load:

- **Digestible groups — fail:** up to 8 navigation items, 2 tabs, 3 status filters, 6–7 table columns, status messaging, and up to 4 row actions are visible in one task surface.
- **Grouping — partial:** patient and queue work are separated, but each row mixes identity, demographics, status, linkage, diagnostics, and actions.
- **Visual hierarchy — fail:** page title, selected tab, teal buttons, badges, SATUSEHAT status, and row actions compete.
- **One thing at a time — fail:** users search, filter, identify, inspect status, and choose an action simultaneously.
- **Minimal choices — fail at the aggregate level:** individual controls are reasonable, but the full decision surface exceeds 4 choices.
- **Working memory — fail:** operators must retain identity while interpreting RM, NIK, demographic lines, statuses, and icons.
- **Progressive disclosure — mixed:** patient detail and forms use collapsible sections well; the main list exposes too much.

Visible decision counts:

- sidebar: up to 8 top-level destinations;
- patient status: 3 filters (`Aktif`, `Nonaktif`, `Semua`);
- patient row: up to 4 actions (view, edit, SATUSEHAT sync, add to queue);
- queue row: up to 3 actions (start, cancel, sync);
- new-patient form: roughly 9 visible controls before optional sections expand.

## Emotional Journey

1. Arrival feels authoritative but cold and busy.
2. Search promises speed, but the result leads into a dense reading surface with weak search/loading feedback.
3. Identity data supports accuracy, but name, RM, NIK, status, SATUSEHAT, and warnings are packed together.
4. Action selection is the anxiety point: four icon-only controls must be decoded before acting.
5. The queue dialog is more reassuring because it focuses the task and exposes clear cancel/submit actions; `Location` and `Encounter` terminology weaken that confidence.
6. Errors and toasts help in some flows, but a patient-list failure can leave the operator without a clear retry.
7. Completion is mostly a transient toast; there is no strong “next patient” or “continue” cue.

## Priority Issues

### [P1] The patient table is too wide and vertically overpacked

**Why it matters:** `min-w-[1180px]` in `components/screens/pendaftaran/PatientDirectory.tsx` forces horizontal scanning at ordinary laptop widths. Rows also stack demographic lines, RM, NIK, status, SATUSEHAT state, readiness warnings, and actions. Small secondary text makes long sessions tiring.

**Fix:** Make name and RM the primary scan fields. Move marital status and secondary demographics into detail. Keep SATUSEHAT status compact and explicit; move diagnostics into detail. Add a responsive list/card treatment below a practical desktop breakpoint.

**Suggested command:** `$impeccable layout` and `$impeccable distill`

### [P1] The primary action is buried among peer icon buttons

**Why it matters:** Eye, edit, sync, and queue icons appear as equal 32px controls. The most important action—putting a patient into the queue—is represented only by a list icon, so the operator must decode the interface before acting.

**Fix:** Make `Daftar ke antrean` the one visually obvious row action. Put view/edit/sync into a single overflow menu. Keep informative `aria-label` and `title` values, but do not make icon recognition carry the workflow.

**Suggested command:** `$impeccable clarify` and `$impeccable distill`

### [P1] The shell adds navigation load and contains a false affordance

**Why it matters:** The sidebar exposes up to eight peer destinations, and mobile turns them into a horizontal strip. `Cari fitur di sini` looks like a fast feature search, but its current behavior does not filter navigation. A control that appears to work but does nothing damages trust.

**Fix:** Implement keyboard-searchable navigation or remove the field. Group low-frequency areas under fewer operational categories and privilege Pendaftaran/Antrean for front-desk roles.

**Suggested command:** `$impeccable distill` and `$impeccable clarify`

### [P1] Initial patient fetch failure can strand the operator

**Why it matters:** When the first patient request fails without existing rows, `PatientDirectory.tsx` can render an empty table without a useful table-level retry. The page-level error branch in `PendaftaranScreen.tsx` has no direct recovery action.

**Fix:** Render an error row with `Coba lagi`; preserve stale rows during refresh; add `aria-busy`; disable duplicate submits; and show `Memuat...` on the search action.

**Suggested command:** `$impeccable harden`

### [P2] Backend/FHIR terminology leaks into front-desk work

**Why it matters:** Phrases such as `Encounter lokal berhasil dibuat`, `Location pelayanan`, `Dokter ter-assign`, and `lifecycle kunjungan` force translation during a high-pressure interaction.

**Fix:** Use `Kunjungan`, `Poli/ruangan`, `Dokter pemeriksa`, and `Nomor SATUSEHAT/IHS` in the operational path. Reserve FHIR vocabulary for integration previews and technical detail.

**Suggested command:** `$impeccable clarify`

## Persona Red Flags

### Alex — power user

- No shortcut to focus search, open `Pasien Baru`, or register a selected patient.
- Sidebar search looks like an accelerator but is non-functional.
- No bulk selection or batch operation.
- Four row icons require recognition or hover.
- No quick “save and add another” path for repeated registration.

### Sam — accessibility-dependent user

- Good: semantic tabs, focus rings, skip link, table caption/headers, explicit status text, modal focus handling, and ARIA labels.
- The `1180px` table is hostile at 200% zoom.
- `11px` uppercase headers and muted secondary text are tiring for low-vision users.
- Icon actions are technically labeled but still visually dependent on recognition.
- Search loading and initial patient errors lack sufficiently actionable feedback.
- Global `overflow-wrap: anywhere` can create awkward mid-token wrapping for names and identifiers.

### Clinic operator / admin pendaftaran

- Default `Aktif` filtering can hide nonactive patients without making that consequence prominent.
- The primary task—find a patient and queue them—is hidden behind a small icon.
- Each row requires scanning too many fields before action.
- Queue dialog does not visibly remember the usual poli/dokter.
- Technical terms make simple registration feel more complex and risky.

## Minor Observations

- `Kelola pasien dan antrean kunjungan.` is accurate but does not tell the operator what to do first.
- `Pasien Baru`, `Daftarkan pasien baru`, and `Pasien baru` vary in framing/capitalization.
- Heading, tabs, toolbar, table, and dialogs all use bordered rounded surfaces; together they create “border soup.”
- SATUSEHAT capability loading can add a navigation item and table column after initial render, causing layout movement.
- The topbar SATUSEHAT badge is hidden below `sm`, removing a useful status signal on mobile.
- `app/layout.tsx` contains an “Apricot & Plum” design-contract comment while `DESIGN.md` defines “Arctic Cyan + Ink”; resolve this drift.

## Questions to Consider

- If the real task is “find patient → confirm identity → enter queue,” why does the first viewport prioritize a full registry table?
- Does marital status belong in the default scan surface?
- Why is a feature-search field visible if it cannot search?
- Can each row have one obvious next action instead of four peer icons?
- Should FHIR nouns appear in the front-desk workflow at all?
- At 1366px and 200% zoom, can the operator see identity and action simultaneously?
- Does every row need full SATUSEHAT readiness copy, or can diagnostics move to detail?
- What would a calmer version look like if saturated color were reserved for exceptions?
