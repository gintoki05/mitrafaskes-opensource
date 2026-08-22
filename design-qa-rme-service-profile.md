# Design QA — RME service profile alignment

source visual truth: `C:/Users/user/AppData/Local/Temp/codex-clipboard-03b1d662-e773-4c92-84b7-ccd080c7d6cf.png`

implementation screenshot: `C:/Users/user/AppData/Local/Temp/mitrafaskes-rme-header-after.png`

viewport: 795 × 400 CSS px for the browser capture; the source is a 795 × 155 px focused crop. Both were captured at 1× density, with no resampling. The focused comparison is the RME context header status row.

state: local signed-in application, selected encounter with SATUSEHAT linkage and remote status “Menunggu”. The source crop excludes the surrounding patient context; the implementation capture keeps the surrounding app chrome so the same header can be located and checked.

## Comparison

- Full view: the RME context card remains within the existing Arctic Cyan + Ink design system; no global tokens, copy, or SATUSEHAT controls changed.
- Focused region: “Rawat jalan umum” stays to the left of the SATUSEHAT linkage badge, is vertically centered against the 32px linkage group, and remains on the same row at the 795px reference width and at the 1280px desktop check.
- Typography, spacing, colors, imagery, and copy remain inherited from the existing primitives and assets. The change only adjusts flex sizing/alignment.

## Comparison history

1. Before fix: at the 795px responsive width, the status wrapper shrank to 387.7px, forcing “Rawat jalan umum” onto a separate line above SATUSEHAT. Evidence: `C:/Users/user/AppData/Local/Temp/mitrafaskes-rme-header-before.png`.
2. Fix: added `shrink-0` to preserve the status wrapper’s intrinsic width and `items-center` to align its children vertically.
3. After fix: the status group measured 443.9px, with the service badge and SATUSEHAT group sharing the same row. Evidence: `C:/Users/user/AppData/Local/Temp/mitrafaskes-rme-header-after.png`.

## Verification

- Primary visual path checked: load `/rme` from the existing session; the session’s role redirected to `/triase`, which renders the shared `RmeWorkspaceContext` used by RME and triage.
- Responsive checks: 795px reference width and the default 1280px desktop viewport.
- Browser console errors: none reported.
- `npm.cmd --workspace=apps/web run lint`: passed.
- `npm.cmd --workspace=apps/web run test`: passed, 30 tests.
- `npm.cmd --workspace=apps/web run build`: passed.
- `git diff --check`: passed.

final result: passed
