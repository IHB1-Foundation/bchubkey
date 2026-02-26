# E2E Test Suite (Deployed BCHubKey)

This suite validates `https://www.bchubkey.com` with a headless browser.

## Specs

- `live-deploy.spec.ts`: real deployed web + real deployed API smoke checks.
- `mock-coverage.spec.ts`: real deployed web + mocked API responses for branch/error/security coverage.

## Run

```bash
npm run test:e2e
npm run test:e2e:live
npm run test:e2e:mock
```

## Notes

- Base URL is fixed to production deployment in `playwright.config.ts`.
- Reports are generated into `playwright-report/`.
