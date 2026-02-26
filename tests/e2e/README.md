# E2E Test Suite (Deployed BCHubKey)

This suite validates `https://www.bchubkey.com` in a headless browser with both:
- live production checks
- deterministic mocked branch coverage

## Coverage map

- `live-deploy.spec.ts`: live UI smoke (boot, auth boundary, refresh, token/session behavior)
- `live-api-contract.spec.ts`: live API contract assertions for auth + health
- `live-observability.spec.ts`: latency budget, uptime monotonicity, runtime env consistency, delivery headers
- `ui-quality.spec.ts`: runtime stability, keyboard flow, mobile viewport integrity
- `mock-coverage.spec.ts`: auth/no-auth branches, API failure paths, 403 handling, XSS escaping checks

## Execution

```bash
npm run test:e2e              # full default suite (chromium)
npm run test:e2e:mock         # mocked branch coverage only
npm run test:e2e:live         # deployed-site live UI smoke only
npm run test:e2e:live:all     # all live checks (UI + contracts + observability + quality)
npm run test:e2e:contracts    # live API/observability contracts
npm run test:e2e:ui           # live UI quality checks
npm run test:e2e:matrix       # full browser matrix (chromium/firefox/webkit/mobile)
```

## CI posture

- Pull requests: fast mocked coverage + live smoke
- Scheduled runs: full browser matrix with artifacts
- Output: HTML report + JUnit XML (`test-results/junit.xml`)

## Notes

- Production base URL is fixed in `playwright.config.ts`.
- Matrix execution is opt-in via `PW_FULL_MATRIX=1`.
