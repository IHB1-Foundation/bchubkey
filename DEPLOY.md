# BCHubKey Deploy Guide

이 문서는 현재 기준 배포 표준입니다.

- Frontend(Admin UI): `Vercel` (`/frontend`)
- Core App(Bot + Worker + Jobs + JSON API): `Railway` (repo root)
- DB: `Railway Postgres`
- Contract: 별도 파이프라인/지갑으로 독립 배포

## 1. 사전 준비

1. GitHub에 현재 브랜치 푸시
2. 계정 준비:
   - Railway
   - Vercel
   - Telegram BotFather (봇 토큰 확인)
3. 필수 값 준비:
   - `TELEGRAM_BOT_TOKEN`
   - `BOT_PUBLIC_NAME` (예: `BCHubKeyBot`, `@` 제외)
   - `ADMIN_JWT_SECRET` (32자 이상 랜덤 문자열)

## 2. 로컬 사전 검증

배포 전에 최소 빌드 검증:

```bash
npm ci
npm run build
```

선택 검증:

```bash
npm run lint
npm run test:security
```

## 3. Railway 배포 (Core + Postgres)

### 3.1 프로젝트/DB 생성

1. Railway에서 New Project 생성
2. `PostgreSQL` 추가
3. 같은 프로젝트에 GitHub Repo 기반 Service 추가 (이 레포 루트)

### 3.2 Service Build/Start 설정

Railway Service 설정값:

- Install Command: `npm ci`
- Build Command: `npm run build`
- Start Command: `npm run start:railway`

`start:railway`는 아래 순서로 실행됩니다.

1. `prisma migrate deploy`
2. `node dist/index.js`

### 3.3 Railway 환경변수 설정

Core Service에 아래 변수 설정:

| 변수 | 필수 | 설명 |
|---|---|---|
| `DATABASE_URL` | Yes | Railway Postgres 연결 문자열 (`Postgres` 플러그인 값 연결) |
| `TELEGRAM_BOT_TOKEN` | Yes | BotFather 발급 토큰 |
| `BOT_PUBLIC_NAME` | Yes | 봇 유저명 (`@` 제외) |
| `ADMIN_AUTH_ENABLED` | Yes | `true` 권장 |
| `ADMIN_JWT_SECRET` | Yes | 32자 이상 랜덤 문자열 |
| `ADMIN_SESSION_TTL_SEC` | No | 기본 `86400` |
| `ADMIN_CORS_ORIGIN` | Yes(운영) | Vercel 운영 도메인 (예: `https://your-app.vercel.app`) |
| `CHAIN_PROVIDER` | No | 기본 `FULCRUM` |
| `FULCRUM_URL` | No | 기본값 사용 가능 |
| `TOKEN_METADATA_PROVIDER` | No | `PAYTACA_BCMR` 또는 `NONE` |

포트 관련:

- 코드가 `ADMIN_PORT`가 없으면 Railway 기본 `PORT`를 자동 사용합니다.
- 즉, Railway에서 `ADMIN_PORT`를 별도로 넣지 않아도 JSON API가 올라옵니다.

### 3.4 도메인/헬스체크

1. Railway public domain 발급
2. 아래 확인:

```bash
curl -s https://<RAILWAY_DOMAIN>/api/health
```

정상 시 `status: "ok"` JSON이 반환됩니다.

## 4. Vercel 배포 (Frontend)

### 4.1 프로젝트 연결

1. Vercel에서 New Project
2. 같은 GitHub 레포 선택
3. **Root Directory를 `frontend`로 설정**
4. `vercel.json`이 있으므로 빌드 설정은 기본값 유지해도 됩니다.

### 4.2 Vercel 환경변수

Vercel Project 환경변수:

| 변수 | 필수 | 값 |
|---|---|---|
| `API_BASE_URL` | Yes | Railway Core URL (예: `https://<RAILWAY_DOMAIN>`) |
| `BOT_USERNAME` | Yes | Telegram bot username (`@` 제외, `BOT_PUBLIC_NAME`과 동일 권장) |

`frontend/generate-env.sh`가 배포 시 `env.js`를 생성합니다.

### 4.3 배포 후 확인

1. Vercel URL 접속
2. 브라우저 콘솔 CORS 에러 없는지 확인
3. 대시보드에서 그룹 목록 조회 확인

## 5. Contract 배포 (별도)

1. 컨트랙트는 별도 프로세스로 배포
2. 배포 후 `token category ID` 기록
3. Telegram `/setup` 플로우에서 해당 토큰 ID/조건 입력

중요:

- 컨트랙트 변경이 있어도 앱 재배포가 항상 필요한 구조는 아닙니다.
- 운영 정책은 `/setup`으로 런타임에 관리됩니다.

## 6. 권장 실제 배포 순서

1. Contract (변경이 있을 때만)
2. Railway Core (마이그레이션 포함)
3. Vercel Frontend
4. 스모크 테스트

## 7. 배포 후 스모크 테스트

1. Railway health

```bash
curl -s https://<RAILWAY_DOMAIN>/api/health
```

2. 인증 후 그룹 목록 조회 (`<JWT>`는 로그인 후 발급 토큰)

```bash
curl -s https://<RAILWAY_DOMAIN>/api/groups \
  -H "Authorization: Bearer <JWT>"
```

3. Telegram에서 봇 응답 확인 (`/start`, `/help`)
4. Vercel UI 로그인/데이터 로드 확인

## 8. 롤백

1. Railway: Deployments에서 이전 정상 배포로 Rollback
2. Vercel: 이전 배포를 Production으로 Promote
3. DB: Prisma는 down migration 자동 지원이 없으므로 수동 SQL 롤백 전략 필요

## 9. 자주 나는 실수 체크리스트

1. `BOT_PUBLIC_NAME`와 `BOT_USERNAME` 불일치
2. `ADMIN_CORS_ORIGIN` 미설정으로 Vercel에서 CORS 실패
3. Railway에서 `DATABASE_URL` 미연결
4. `ADMIN_JWT_SECRET` 길이 부족 또는 누락
5. Vercel Root Directory를 `frontend`로 안 잡아서 정적 파일 배포 실패
