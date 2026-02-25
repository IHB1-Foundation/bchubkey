# BCHubKey Deploy Guide

이 문서는 BCHubKey의 현재 배포 표준입니다.

- Frontend(Admin UI): `Vercel` (`/frontend`)
- Core App(Bot + Worker + Jobs + JSON API): `Railway` (repo root)
- DB: `Railway Postgres`
- Contract: 별도 파이프라인/지갑으로 독립 배포

## 1. 사전 준비

1. GitHub 저장소 접근 권한
2. Railway 계정
3. Vercel 계정
4. Telegram BotFather 접근 권한

## 2. 환경변수 준비 총정리

### 2.1 Core (Railway) 환경변수

아래는 Railway Core Service에 설정할 값입니다.

| 변수 | 필수 | 준비 방법 | 권장 값/예시 |
|---|---|---|---|
| `DATABASE_URL` | Yes | Railway Postgres 플러그인 연결값 참조 | `${{Postgres.DATABASE_URL}}` |
| `TELEGRAM_BOT_TOKEN` | Yes | BotFather에서 발급 | `123456:AA...` |
| `BOT_PUBLIC_NAME` | Yes | Bot username (`@` 제외) | `BCHubKeyBot` |
| `ADMIN_AUTH_ENABLED` | Yes | 고정값 권장 | `true` |
| `ADMIN_JWT_SECRET` | Yes | 랜덤 시크릿 생성 | 32+ chars |
| `ADMIN_CORS_ORIGIN` | Yes(운영) | Vercel 프로덕션 도메인 | `https://your-app.vercel.app` |
| `ADMIN_SESSION_TTL_SEC` | No | 세션 TTL | `86400` |
| `CHAIN_PROVIDER` | No | 기본값 사용 가능 | `FULCRUM` |
| `FULCRUM_URL` | No | 기본값 사용 가능 | `wss://bch.imaginary.cash:50004` |
| `TOKEN_METADATA_PROVIDER` | No | 메타데이터 사용 여부 | `PAYTACA_BCMR` 또는 `NONE` |
| `PAYTACA_BCMR_BASE_URL` | No | 메타데이터 API | `https://bcmr.paytaca.com/api` |
| `METADATA_TIMEOUT_MS` | No | 요청 타임아웃(ms) | `5000` |
| `METADATA_MAX_RETRIES` | No | 재시도 횟수 | `2` |
| `LOG_LEVEL` | No | 로그 레벨 | `info` |
| `POLL_INTERVAL_SEC` | No | 검증 폴링 주기(초) | `15` |
| `DEFAULT_VERIFY_MIN_SAT` | No | 기본 최소 sats | `2000` |
| `DEFAULT_VERIFY_MAX_SAT` | No | 기본 최대 sats | `2999` |
| `DEFAULT_VERIFY_EXPIRE_MIN` | No | 세션 만료(분) | `10` |
| `DEFAULT_RECHECK_INTERVAL_SEC` | No | 재검증 주기(초) | `300` |
| `DEFAULT_GRACE_PERIOD_SEC` | No | grace 기간(초) | `300` |

포트 관련:

- Railway에서는 `PORT`가 자동 주입됩니다.
- 앱이 `ADMIN_PORT`가 없으면 `PORT`를 자동 사용합니다.
- 즉 Railway에서는 보통 `ADMIN_PORT`를 따로 넣지 않아도 됩니다.

### 2.2 Frontend (Vercel) 환경변수

| 변수 | 필수 | 준비 방법 | 권장 값/예시 |
|---|---|---|---|
| `API_BASE_URL` | Yes | Railway Core public URL 복사 | `https://<RAILWAY_DOMAIN>` |
| `BOT_USERNAME` | Yes | `BOT_PUBLIC_NAME`와 동일값 사용 (`@` 제외) | `BCHubKeyBot` |

주의:

- `BOT_PUBLIC_NAME`(Railway)와 `BOT_USERNAME`(Vercel)은 동일해야 합니다.
- 불일치하면 Telegram 로그인 위젯/딥링크 UX가 깨집니다.

### 2.3 값 생성/확인 방법

1. `ADMIN_JWT_SECRET` 생성

```bash
openssl rand -base64 48 | tr -d '\n'
```

2. Bot username 확인

- BotFather에서 확인하거나, 아래 API로 확인:

```bash
curl -s "https://api.telegram.org/bot<TELEGRAM_BOT_TOKEN>/getMe"
```

응답 JSON의 `result.username` 값을 사용합니다 (`@` 없이 저장).

3. 로컬 템플릿 준비

```bash
cp .env.example .env
```

## 3. 전체 빌드 검증 (권장 순서)

아래 순서로 실행하면 배포 전 검증을 한 번에 끝낼 수 있습니다.

```bash
npm ci
npm run format:check
npm run lint
npm run build
docker compose up -d postgres
DATABASE_URL=postgresql://bchubkey:bchubkey@localhost:5432/bchubkey npm run db:migrate:deploy
DATABASE_URL=postgresql://bchubkey:bchubkey@localhost:5432/bchubkey npm run test:security
```

## 4. Railway 배포 (Core + Postgres)

### 4.1 프로젝트/DB 생성

1. Railway에서 New Project 생성
2. `PostgreSQL` 추가
3. 같은 프로젝트에 GitHub Repo 기반 Service 추가 (레포 루트 사용)

### 4.2 Build/Start 설정

- Install: `npm ci`
- Build: `npm run build`
- Start: `npm run start:railway`

`start:railway` 실행 순서:

1. `prisma migrate deploy`
2. `node dist/index.js`

### 4.3 환경변수 입력

Section 2.1 표 기준으로 Railway Service Variables 입력

### 4.4 Health 확인

```bash
curl -i https://<RAILWAY_DOMAIN>/api/health
```

정상:

- HTTP `200`
- JSON `status: "ok"`, `db: "ok"`

DB 문제 시:

- HTTP `503`
- JSON `status: "degraded"`, `db: "error"`

## 5. Vercel 배포 (Frontend)

### 5.1 프로젝트 연결

1. Vercel New Project
2. 같은 GitHub 레포 선택
3. **Root Directory = `frontend`**
4. `vercel.json` 그대로 사용

### 5.2 환경변수 입력

Section 2.2 표 기준으로 Vercel Environment Variables 입력

### 5.3 배포 후 확인

1. Vercel URL 접속
2. 로그인 위젯 정상 표시 확인
3. 콘솔 CORS 에러 없는지 확인
4. 그룹 목록/API 로드 확인

## 6. Contract 배포 (별도)

1. 컨트랙트는 별도 프로세스로 배포
2. 배포 후 `token category ID` 확보
3. Telegram `/setup` 플로우에서 토큰 조건 입력

중요:

- 컨트랙트 변경은 앱 재배포와 분리할 수 있습니다.
- 운영 정책은 `/setup`으로 런타임 관리합니다.

## 7. 권장 실제 배포 순서

1. Contract (변경이 있을 때만)
2. Railway Core
3. Vercel Frontend
4. 스모크 테스트

## 8. 배포 후 스모크 테스트

1. Core Health

```bash
curl -s https://<RAILWAY_DOMAIN>/api/health
```

2. 인증 후 그룹 목록

```bash
curl -s https://<RAILWAY_DOMAIN>/api/groups \
  -H "Authorization: Bearer <JWT>"
```

3. Telegram 봇 응답 확인 (`/start`, `/help`, `/setup`)
4. Vercel UI 로그인/데이터 조회 확인

## 9. 롤백

1. Railway: Deployments에서 이전 정상 배포로 Rollback
2. Vercel: 이전 배포를 Production으로 Promote
3. DB: Prisma는 자동 down migration이 없으므로 수동 SQL 롤백 필요

## 10. 자주 나는 실수

1. `BOT_PUBLIC_NAME`와 `BOT_USERNAME` 불일치
2. `ADMIN_CORS_ORIGIN` 누락으로 CORS 실패
3. Railway에서 `DATABASE_URL` 미연결
4. `ADMIN_JWT_SECRET` 약하거나 누락
5. Vercel Root Directory를 `frontend`로 설정하지 않음
