---
paths:
  - "src/**/*.{ts,tsx}"
  - "*.config.ts"
---

# Code style

## General

- No comments or JSDoc. If code needs a comment, rename or extract until it doesn't. Decisions go in the README
- Write the simplest thing that works. No abstraction, option or generic helper until a second real use appears
- Delete what you replace: no commented-out code, no unused exports or files

## TypeScript

- No `any`, no `as` casts on external data, no `!` on values that can be missing. Parse unknown data with zod at the boundary
- Derive types instead of writing them twice: `z.output<typeof schema>`, `ReturnType`, `Pick`
- Use `type`, not `interface`
- Named exports only, except where a tool requires a default export (config files)
- Prefer early returns and discriminated unions over nested conditions

## React components

- One job per component. Split when a component mixes concerns: several unrelated pieces of state, more than one data source, or JSX branching over many states. Signals that it's time: you scroll to read it, or you can't name it without "and"
- A component either decides (a page: reads params, calls hooks, picks the screen state) or renders (gets props, shows them). Not both
- One exported component per file. Small private helpers used only by that component can live in the same file
- Never define a component inside another component's body. Why: it remounts on every render and loses state
- Pass components what they need (`job`), not whole query results or setters from three levels up. If props travel more than two levels, compose with children or slots instead
- Keys are stable ids, never array indexes for lists that change
- Actions are buttons, navigation is links

## React logic

- Stateful logic with effects, subscriptions or several steps goes into a custom hook (`use-*.ts`). Pure calculations go into `src/lib` as plain functions, not hooks. Why: plain functions are easier to test and reuse
- `useEffect` only to sync with something outside React: DOM APIs, subscriptions, timers. Not to derive state, react to a user action or fetch data. Why: derived values are computed during render, actions are handled in event handlers, data comes from TanStack Query
- Don't copy props or query data into `useState`. Compute it during render
- Keep state as low as possible and lift it only as high as the components that share it
- Read external stores with `useSyncExternalStore`. Use `useEffectEvent` when an effect needs the latest callback without re-subscribing
- Components get data through props, fetching lives in hooks

## Naming

- Files are kebab-case and named after their main export (`job-card.tsx` exports `JobCard`)
- Names say what a thing is or does, without abbreviations: `toJobSummary`, `hasMoreJobs`
- Booleans read as questions: `isFavourite`, `hasNextPage`

## Errors

- Don't swallow errors. When you catch, either rethrow as a typed `ApiError` or fall back on purpose and cover the fallback with a test
