# Design QA — RME Vital Signs

source visual truth: `C:\Users\user\AppData\Local\Temp\codex-clipboard-fefeab48-1671-4cb7-b362-244765e0ca08.png`

implementation screenshot: `C:\Users\user\Documents\Developments\Ajie\mitrafaskes-opensource\design-qa-rme-vital-signs.png`

viewport: 1142 × 234 CSS px

source pixels: 1142 × 234

implementation pixels: 1134 × 232 (the in-app browser capture excludes its scrollbar gutter)

density normalization: no resampling; the comparison focused on the shared card content region. The source and implementation were captured in the empty/default form state.

## Full-view comparison evidence

The card keeps the same single-row desktop composition, pale background, white surface, cool border, green activity icon, dark title, eight metric labels, and outlined inputs. The implementation now reserves a consistent two-line label area, so every input starts on the same baseline instead of dropping below labels that wrap.

## Focused region comparison evidence

The label/input grid was inspected at the desktop viewport and at 390 × 844 CSS px. Desktop measurements showed all eight inputs at the same y-position (`149px`, `48px` high). The mobile check showed two-column wrapping with no horizontal overflow.

## Required fidelity surfaces

- Fonts and typography: title increased to the reference hierarchy (`text-lg`); labels use readable `text-sm` sizing with consistent `leading-5`; input values retain the medical monospace treatment.
- Spacing and layout rhythm: card padding, title-to-field gap, column gap, label reserve, and input height were tuned to the reference; all desktop inputs share one baseline.
- Colors and visual tokens: existing application tokens remain in use for foreground, success icon, card, border, and input states; no global token changes were made.
- Image quality and asset fidelity: the reference uses a UI icon, not a raster asset; the existing `Activity` icon library component is retained.
- Copy and content: all Indonesian labels and field IDs remain unchanged, including `SpO₂ (%)` and `/menit`.

## Comparison history

### Iteration 1

- [P1] Input baseline drift: labels that wrapped onto two lines pushed only some inputs downward. Fixed with a shared `min-h-10` label area and consistent label spacing.
- [P2] Form density was smaller than the source: title, field labels, card spacing, and controls were visually compact. Fixed with the existing card tokens plus `text-lg` title, `text-sm` labels, `h-12` inputs, and five-unit column spacing.

### Iteration 2

- [P2] The first pass placed labels about 8px too high relative to the source. Fixed by increasing the card header/content gap from `gap-5` to `gap-7`.
- Post-fix evidence: card height measured about 201px and all eight inputs measured `y=149px`, `height=48px`; no horizontal overflow was present at the mobile check.

## Findings

No actionable P0, P1, or P2 differences remain.

## Open Questions

None.

## Implementation Checklist

- [x] Align desktop vital-sign inputs despite wrapped labels.
- [x] Preserve all existing field IDs, types, ranges, and change handlers.
- [x] Verify desktop source comparison and mobile overflow behavior.
- [x] Check browser console for errors; none were reported.

## Follow-up Polish

No P3 follow-up is required for this focused UI fix.

final result: passed
