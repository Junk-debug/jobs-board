---
paths:
  - "src/api/**/*.ts"
  - "src/entities/**/*.ts"
---

# Coople API

## Endpoints

- List: `GET https://www.coople.com/ch/resources/api/work-assignments/public-jobs/list?pageNum=0&pageSize=100`
- Details: `GET https://www.coople.com/ch/resources/api/work-assignments/public-jobs/{id}`
- The app never calls coople.com from the browser. It calls `/api/...`, which is proxied to `/ch/resources/api/...`: by Vite in dev and preview, by the rewrite in `vercel.json` in production

## What the API does

Checked against the live API. Re-check with the commands at the end before relying on a fact that looks surprising.

| Request                                  | Response                                                                                    |
| ---------------------------------------- | ------------------------------------------------------------------------------------------- |
| `OPTIONS` preflight from another origin  | 401, no `Access-Control-*` headers. A browser can't call the API directly                   |
| `GET` list or details                    | No `Access-Control-Allow-Origin`, `cache-control: no-store`. All caching is TanStack Query  |
| List with `pageNum=0`                    | 200. Pages start at 0                                                                       |
| List with `pageNum=-1` or without params | 500                                                                                         |
| Details with an unknown UUID             | 404 with `error: true`, `errorCode: "Object_not_found"`                                    |
| Details with a malformed id (`12345`)    | 401, not 404. That's why ids are validated as UUID before any request                       |

- Every response is wrapped: `{ status, error, errorCode, errorId, errorDetails, data }`, with the payload in `data`. `error: true` can come with HTTP 200, so every request goes through `apiClient` in `src/api/client.ts`
- The list payload is `{ items, total }`. `pageSize=1000` returns the whole list in one request, which is how schemas are checked against real data
- The list changes between requests (new jobs shift others to the next page), so pages are de-duplicated by id

## Fields

| Field                                                              | Where   | Meaning                                                                                                                        |
| ------------------------------------------------------------------ | ------- | ------------------------------------------------------------------------------------------------------------------------------ |
| `workAssignmentId`                                                 | both    | UUID                                                                                                                           |
| `workAssignmentName`                                               | both    | Title, plain text: `*` is the German gender star, not Markdown. Has been empty for one job, which shows as "Untitled job"       |
| `hourlyWage`, `salary`                                             | both    | `{ amount, currencyId }`. `salary` is the hourly wage times `workDuration` (25.10 × 53 h = 1330.30)                            |
| `jobLocation`                                                      | both    | `{ zip, city, state, countryId }`                                                                                              |
| `periodFrom`, `datePublished`                                      | both    | Epoch milliseconds                                                                                                             |
| `branchLink`                                                       | both    | The job on coople.com, used for "Apply on Coople"                                                                              |
| `periodTo`                                                         | details | Epoch milliseconds                                                                                                             |
| `requirements`                                                     | details | Markdown description. Can be missing                                                                                           |
| `shiftsCount`, `workDuration`                                      | details | Number of shifts and their total length in minutes                                                                             |
| `waReadableId`, `jobSkill`, `clothingRequirements`, `firstShiftTo` | various | Sent but not used by the app                                                                                                   |

- `currencyId` and `countryId` are numbers without labels. Every live job has `1` for both. The app shows currency `1` as CHF, the currency Coople's own site shows, and any other id as a plain amount
- `jobSkill.jobProfileId` is a category id with no endpoint for its label
- All jobs are in Switzerland. Dates are formatted in `Europe/Zurich`, not in the viewer's time zone

## Schemas

- Schemas in `src/api` describe only the fields the app uses, in Coople's names. `src/entities` transforms them into the domain model, and types are inferred from it. UI never sees DTO fields
- Model what the API sends, not what it should send: fields that look required can be empty. Before making a schema stricter, run it against the full live list
- Validation is strict in dev (throws with the failing path) and lenient in prod (drops a broken list item and warns). Details fail in both modes

## Errors and retries

- `ApiError.kind` is `not_found`, `network`, `server` or `invalid_response`. Pages branch on the kind, never on the message
- Network errors, 5xx, 408 and 429 are retried. Other 4xx and invalid responses are not: they would fail the same way again

## Tests

- Every new error path gets a test. Use the real responses in `src/test/fixtures`, mocked with MSW

## Re-checking the API

```bash
B=https://www.coople.com/ch/resources/api/work-assignments/public-jobs
curl -s "$B/list?pageNum=0&pageSize=1000" -o list.json
curl -s -o /dev/null -w "%{http_code}\n" "$B/12345"
curl -s -o /dev/null -w "%{http_code}\n" -X OPTIONS -H "Origin: http://localhost:5173" -H "Access-Control-Request-Method: GET" "$B/list?pageNum=0&pageSize=1"
```
