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
