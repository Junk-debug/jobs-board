---
paths:
  - "src/api/**/*.ts"
---

# Coople API rules

## Facts

- No CORS on coople.com. The app calls `/api`, and Vite proxies it to `/ch/resources/api` in dev and preview. Never call coople.com from the browser
- Every response is wrapped: `{ status, error, errorCode, data }`, with the payload in `data`. `error: true` can come with HTTP 200, so all requests go through `apiClient` in `src/api/client.ts`
- An unknown UUID returns 404, a malformed id returns 401. Ids are validated as UUID before any request
- `pageNum` starts at 0. `pageNum=-1` or missing parameters return 500
- The list changes between requests, so pages are de-duplicated by id
- `workDuration` is the total of all shifts in minutes. `salary` is the hourly wage times that duration
- `currencyId` is a number without a currency code. The app maps only `1` to CHF; any other id shows the amount without a currency

## Schemas

- Schemas here describe only the fields the app uses, in Coople's names. The transform into the domain model lives in `src/entities`, and the types are inferred from it. UI never sees DTO fields
- Model what the API sends, not what it should send: fields that look required can be empty. Before making a schema stricter, run it against the full live list (`pageSize=1000`)
- Validation is strict in dev (throws with the failing path) and lenient in prod (drops a broken list item and warns). Details fail in both modes

## Tests

- Every new error path gets a test. Use the real responses in `src/test/fixtures`, mocked with MSW
