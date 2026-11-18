# Decisions

Notes on the choices in this project and on what is still open. Setup and structure are in [README.md](README.md).

## Choices

| Choice                                             | Why                                                                                                                                                                                                                     |
| -------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Vite + React SPA, not Next.js                      | Two client screens over a public API. Nothing needs server rendering, and the only server-side need is the `/api` proxy.                                                                                                |
| React Router in data mode, not TanStack Router     | Two routes. Loaders already give what the app needs: the details request starts before the page renders, a malformed id is rejected without a request, and `ScrollRestoration` handles going back. TanStack Router pays off with many routes and typed search params; here it would add a generated route tree for two paths. |
| TanStack Query                                     | Caching, retries, cancellation and infinite pagination are solved problems. The app only decides the policy.                                                                                                           |
| zustand with `persist` for favourites              | Favourites are the app's only client state, and they have to survive a reload. A small store with `persist` covers both with almost no code.                                                                            |
| zod at the API boundary                            | The API is undocumented, so types alone would be guesses. Everything from Coople is parsed, and the types are inferred from the schemas.                                                                                |
| Tailwind with shadcn (Radix)                       | Colour tokens, accessible primitives, and the component code lives in the repo, so it can be changed.                                                                                                                  |
| Biome instead of ESLint and Prettier               | A small project is a good place to try a newer tool. It replaces two tools with one and runs much faster.                                                                                                              |
| pnpm                                               | A strict dependency tree, and a minimum release age, so a freshly published (possibly compromised) version is never installed.                                                                                         |
| Vercel for the demo                                | The app itself is static and could be served from GitHub Pages, but the browser can't call Coople without a proxy. A rewrite in `vercel.json` makes Vercel forward `/api/*` to coople.com, so the same `/api` paths work in dev, preview and production. |
| Folders by role, not by feature                    | Simple enough for one domain, and easy to split into feature folders once a second domain appears.                                                                                                                     |
| Coople's response schemas in `api`, the domain model in `entities` | Coople's names (`workAssignmentName`, timestamps as numbers) stay at the edge. The UI works with `title` and `Date`.                                                                                   |
| Pages decide, components render                    | A page reads params, calls hooks and picks the screen state. Components get props. Each screen state can be read in one place.                                                                                         |
| Favourites keep only job ids                       | The saved page loads each job's details, so the data is never stale and an expired job shows up as expired. The cost is one request per saved job, which are few and cached afterwards.                              |
| Saved jobs are a page, not a filter on the list    | The API can't filter by ids, and filtering the loaded part of an infinite list would miss jobs on pages that aren't loaded yet.                                                                                       |
| Strict validation in dev, lenient in prod          | In dev a schema mismatch throws with the failing path, so a wrong schema is found at once. In prod a broken list item is dropped with a warning, and the rest of the page still renders. Details fail in both modes, there is nothing to show without them. |
| Dates in `Europe/Zurich`                           | All jobs are in Switzerland. In the viewer's own time zone, a job published just after midnight in Zurich shows the day before in the Americas.                                                                        |
| Retry network errors, 5xx, 408 and 429 only        | TanStack Query retries every error by default. These can pass on their own; other 4xx and responses that fail validation would fail the same way again.                                                               |
| The list is not refetched on mount or on focus     | Coming back to a stale list would request every loaded page again, one after another.                                                                                                                                  |
| Search reads the list in batches of 100, from the same cache as the list | The API has no search parameter, so search filters titles on the client. The list and search share one infinite query (`["jobs", "list"]`) and one page size, so a batch loaded by either is never requested again: after a search, clearing it shows the loaded jobs and scrolling continues from the next batch. An earlier version loaded `pageSize=1000` for search in a second cache, and scrolling after a search fetched pages that search had already loaded. A 100-job batch takes 0.2 to 0.3 s (about 50 KB); 1000 jobs took 0.8 to 0.9 s (about 456 KB). |
| Search has no limit; it reads batches until the pages run out | A cap would leave jobs that search can never find, and the page would have to explain it. Search keeps reading by itself, so every job can be found. The price: a query with no matches reads every batch one after another, ten requests of 0.25 s each, about 2.5 s for 901 jobs (November 2026). A query with matches shows them from the first batch on and the count grows as the rest are read. Reading all in one `pageSize=1000` request would be faster (0.8 to 0.9 s) but needs a second cache, which is what we moved away from. |
| The marker loads the next batch while the search finds little | While there are pages left, the end-of-list marker stays rendered, even with 0 matches. The header says "12+ jobs match" and the page "Searching…" instead of "No jobs match", and the next batch loads by itself. The exact count and "No jobs match" appear only after every page was read. |
| Title matching ignores case and accents, nothing else | A plain "contains" on the lowercased title, with accents removed by Unicode normalisation (`kuche` finds "Küche"). No fuzzy matching or ranking, so results keep the list order and it's clear why a job matched. A library like MiniSearch can replace `matchesTitle` later if typos turn out to matter. |
| The search query lives in the URL (`?q=`)           | It survives a reload, going back from a job and a shared link. It's written 250 ms after typing stops, replacing the history entry, so Back doesn't step through every keystroke. |

## What the live API showed

- Coople sends no CORS headers and answers the preflight with 401, so the browser can't call it directly.
- Every response is wrapped in `{ status, error, errorCode, data }`, and `error: true` can come with HTTP 200.
- An unknown UUID returns 404, but a malformed id returns 401. That's why ids are checked before any request.
- `pageNum` starts at 0. `pageNum=-1` or missing parameters return 500.
- The list shifts between requests, so the same job can come on two pages. Pages are de-duplicated by id.
- All 943 live jobs and 26 detail responses were run through the schemas. One job had an empty name, which now shows as "Untitled job".

Some things the API doesn't say, so they are assumptions:

- `currencyId` is a number without a label. `1` is shown as CHF, the only id in the data and the currency Coople's own site shows. Other ids show the amount without a currency.
- `workDuration` is the total of all shifts in minutes, and `salary` is the hourly wage times that duration.
- The description (`requirements`) is Markdown. It's rendered with `react-markdown`, which doesn't render raw HTML.

Every field and status code, with the commands to check them again, is in [.claude/rules/api.md](.claude/rules/api.md).

## Known gaps and next steps

Known gaps:

- One error text for every failure. In dev the real error is shown under it.
- A broken list item in production is reported with `console.warn`, which stands in for an error tracker.
- The interface is in English, while job titles and descriptions come in German and French as Coople publishes them.
- The total in the list header comes from the latest page, so it can change while scrolling if jobs are published meanwhile.
- If some saved jobs fail to load, the saved page shows one error with a retry above the jobs that did load.
- Favourites don't sync between open tabs.
- A query with no matches, or a rare one, reads every batch one after another: about 2.5 s today, and it grows with the number of jobs. If that gets too slow, a search endpoint on the server side is the real fix.
- The list uses page numbers, so a job that closes between two batches shifts the rest and one job can be skipped. Nothing sees this at the moment; the list had the same gap before search.
- Search doesn't treat `ß` and `ss`, or `ü` and `ue`, as the same, and words must match in the order they are typed.
- The German gender star (`Mitarbeiter*innen`) can turn into italics in a description when a line has two of them.

Next steps:

- Show the job's title from the list cache while details load
- Virtualise the list for very long sessions
- Map `jobProfileId` to a category label once there's an endpoint for it
- Prefetch a job when its card is hovered or focused, on top of the loader's prefetch
- Handle storage that refuses writes (Safari private mode)
- One Playwright smoke test against the live API through the proxy
