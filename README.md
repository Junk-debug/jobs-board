# Coople jobs

A minimal two-screen web app over Coople's public jobs API:

- **Job list** at `/` with infinite scroll
- **Job details** at `/job/:id`, which also opens directly from a link
- **Favourites**: mark or unmark a job on either screen, kept across reloads

## Setup

Requires Node 22.22 or newer and pnpm. The pnpm version is pinned in `package.json`; `corepack enable` installs it.

```bash
corepack enable
pnpm install
pnpm dev
```

Open http://localhost:5173.

| Command                          | What it does                                 |
| -------------------------------- | -------------------------------------------- |
| `pnpm dev`                       | Dev server with the API proxy                |
| `pnpm build` then `pnpm preview` | Production build, served with the same proxy |
| `pnpm test`                      | Unit and integration tests                   |
| `pnpm e2e`                       | Browser tests with Playwright, API mocked    |
| `pnpm check`                     | Typecheck, lint, format check and unit tests |

The first `pnpm e2e` run needs a browser: `pnpm exec playwright install chromium`.

Environment variables are optional, defaults are in `.env.example`.

**Deploy.** `vercel.json` mirrors the Vite proxy with a rewrite and sends every other path to `index.html`, so `/job/:id` opens directly. No environment variables are needed. CI (GitHub Actions) runs `pnpm check` and `pnpm e2e` on pushes to `main` and on pull requests.

## Architecture

```
routes  →  components  →  components/ui
   ↓
queries  →  api  →  entities
stores
```

| Folder           | Role                                                                                                                          |
| ---------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| `src/routes`     | Pages. Read route params, call hooks, choose the screen state (loading, error, empty, not found, data) and compose components |
| `src/components` | All UI. Components render the props they get; the favourite button is the one exception and reads its own tiny store          |
| `src/queries`    | Server state: TanStack Query options and hooks for jobs                                                                       |
| `src/stores`     | Client state owned by the browser: the favourites zustand store                                                               |
| `src/hooks`      | Generic hooks that know nothing about jobs: loading more on scroll                                                            |
| `src/api`        | Talking to Coople: HTTP client, the Coople response wrapper, schemas of Coople's responses, endpoints                         |
| `src/entities`   | The domain model: schemas that validate a Coople response and transform it into our types, which are inferred from them       |
| `src/lib`        | Pure functions: formatting                                                                                                    |

There is one domain (jobs), so the code is grouped by role rather than by feature. Something used by a single component lives next to it (`components/job-card/`) and moves to a shared folder once a second user appears. Biome (lint and format) enforces the main boundaries: no `fetch` outside the API client, no API imports from components.

### Request flow for `/job/:id`

1. The route loader validates the id as a UUID. A malformed id renders 404 without calling the API.
2. The loader starts prefetching the job into the TanStack Query cache, so the request begins before the page renders.
3. `apiClient.get` calls `/api/...`, which Vite proxies to coople.com, and unwraps the Coople response into data or a typed `ApiError` (`not_found`, `network`, `server`, `invalid_response`).
4. The entity schema validates the payload against Coople's shape and transforms it into the domain model in the same step (`workAssignmentName` → `title`, timestamps → `Date`).
5. The query client retries only network and server errors. The page renders loading, not found, error with retry, or the job.

## Decisions

- **Proxy instead of direct calls.** Coople's API sends no CORS headers and answers the preflight with 401, so a browser can't call it directly. Vite proxies `/api` in both `dev` and `preview`, and `vercel.json` does the same on Vercel with a rewrite.
- **Runtime validation with zod.** The API is undocumented, so types alone would be guesses. Schemas describe only the fields the app uses, and the UI only sees the mapped domain model.
- **Strict in dev, lenient in prod.** In development a schema mismatch throws with the exact failing path. In production a broken list item is dropped and reported with `console.warn` (where an error tracker would go), and the rest of the page still renders. Details have nothing to show without valid data, so they fail in both modes.
- **Validated against real data.** The schemas were checked against all 943 live jobs and a sample of 26 detail responses. That found one job with an empty name, which now renders as "Untitled job" instead of breaking the list.
- **Infinite scroll.** `useInfiniteQuery` for the pages, `react-intersection-observer` to notice when the end of the list is near. Pages are de-duplicated by id because the live list shifts between requests. A failed next page keeps loaded jobs and shows a retry at the bottom. Going back from a job restores the scroll position.
- **Favourites.** A small zustand store with `persist`, keeping only job ids in `localStorage`, so the list and details always agree. Stored data is validated with zod, so a corrupted value starts an empty list instead of crashing.
- **Libraries over custom plumbing.** Observing the end of the list and persisting state are solved problems, so they use well-known, maintained libraries instead of hand-written subscriptions.
- **React Router in data mode.** Two routes don't need file-based routing; loaders give early prefetch and id validation, and `ScrollRestoration` handles the back navigation.

## API notes

- Every response is wrapped in `{ status, error, errorCode, data }` (a pattern often called a response envelope), and `error: true` can arrive with HTTP 200.
- An unknown UUID returns 404, but a malformed id returns 401. That's why ids are validated before any request.
- `pageNum` starts at 0. `pageNum=-1` or missing parameters return 500.
- `currencyId`, `countryId` and `jobProfileId` are numeric ids without labels. The app shows `currencyId: 1` as CHF, the only id in the current data and the currency Coople's own site shows for these jobs. Other ids show the amount without a currency.
- `workDuration` is the total of all shifts in minutes, and `salary` is the hourly wage times that duration.
- The description (`requirements`) is Markdown and is rendered with `react-markdown`, which doesn't render raw HTML.

## Beyond the brief

The task asked for about an hour of work. I also added: infinite scroll instead of a single page, runtime validation, a typed error model, accessible states (`aria-pressed`, status regions, skeletons), tests and an agent setup (`CLAUDE.md`).

## Tests

Both suites run on real API responses saved in `src/test/fixtures`, so they don't depend on the live API.

**Unit and integration** (Vitest, Testing Library, MSW), 36 tests:

- API client: error responses with HTTP 200, 404, 5xx, network failure, responses without the Coople wrapper
- Endpoints and mapping, pagination end detection, strict and lenient validation
- Favourites store: toggling, persistence, corrupted storage
- Pages: list, empty state, error and retry, a failed next page that keeps loaded jobs, favourite toggle, direct link to a job, malformed id without an API call, unknown job

**Browser** (Playwright, API mocked with `page.route`), 17 tests:

- Infinite scroll, a failed next page with retry, scroll position restored after coming back from a job
- Direct links, not found for malformed and unknown ids, favourites across the list, details and a reload
- Layout at 375, 1024 and 1440 px: equal card heights, no horizontal scroll, the skeleton matches the card, pay and bookmark align with the title

## What I'd do next

- Show the job's title from the list cache while details load
- Virtualise the list for very long sessions
- A "favourites only" filter
- Map `jobProfileId` to a category label once there's an endpoint for it
- Prefetch a job when its card is hovered or focused, on top of the loader's prefetch
- Keep favourites in sync between open tabs and handle storage that refuses writes (Safari private mode)
- One Playwright smoke test against the live API through the proxy
