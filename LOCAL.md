# 로컬 실행 가이드 (MySQL + Docker)

이 프로젝트는 **Prisma + MySQL**을 사용합니다. 로컬에서는 `docker-compose.yml`로 MySQL을 띄우고, Prisma 마이그레이션을 적용한 뒤 봇을 실행하면 됩니다.

## 0) 준비물

- Node.js 20+ / npm
- Docker + `docker compose` (v2)
- Telegram 봇 토큰 (`TELEGRAM_BOT_TOKEN`)

## 1) 의존성 설치

```bash
npm install
```

## 2) 로컬 MySQL 실행 (Docker)

```bash
docker compose up -d mysql
```

상태 확인:

```bash
docker compose ps
```

MySQL 접속(선택):

```bash
docker compose exec mysql mysql -uroot -p
# password: bchubkey_root
```

## 3) 환경변수 설정 (.env)

`.env.example`을 복사해서 `.env`를 만들고 값을 채웁니다.

```bash
cp .env.example .env
```

필수 값:

- `TELEGRAM_BOT_TOKEN`: @BotFather에서 발급
- `BOT_PUBLIC_NAME`: 봇 유저네임 (딥링크 생성용)
- `DATABASE_URL`: 로컬 MySQL 연결 문자열

로컬 기본값(도커 컴포즈와 동일):

```env
DATABASE_URL=mysql://bchubkey:bchubkey@localhost:3306/bchubkey
```

## 4) Prisma Client 생성

이 레포는 Prisma Client를 `src/generated/prisma`로 생성합니다(깃에는 커밋되지 않음). 최초 1회는 아래를 실행하세요.

```bash
npm run db:generate
```

## 5) 마이그레이션 적용

```bash
npm run db:migrate:dev
```

## 6) 서버(봇) 실행

개발 모드(핫리로드):

```bash
npm run dev
```

프로덕션 빌드/실행:

```bash
npm run build
npm start
```

## 7) 데모 모드(선택)

데모 모드는 빠른 주기 설정 + 대시보드(기본 3000 포트)를 켜서 실행합니다.

```bash
npm run demo
```

주의: `demo`는 DB 마이그레이션을 자동으로 돌리지 않습니다. 위 4~5단계를 먼저 해두세요.

## 8) 데이터 리셋

### 8.1 행(row)만 삭제 (스키마 유지)

```bash
npm run demo:reset
```

### 8.2 DB 볼륨까지 완전 초기화 (스키마 포함)

```bash
docker compose down -v
docker compose up -d mysql
npm run db:migrate:dev
```

## 9) 트러블슈팅

### MySQL이 아직 준비가 안 됨

`prisma migrate`가 연결 실패하면 MySQL이 아직 `healthy`가 아닐 수 있습니다.

```bash
docker compose ps
docker compose logs -f mysql
```

### 3306 포트 충돌

다른 MySQL이 이미 3306을 쓰고 있으면 `docker-compose.yml`의 포트 매핑을 바꾼 뒤, `DATABASE_URL`도 같은 포트로 맞추세요.

예: `3307:3306`으로 바꾸면

```env
DATABASE_URL=mysql://bchubkey:bchubkey@localhost:3307/bchubkey
```

### `@prisma/client did not initialize yet` 오류

이 프로젝트는 `@prisma/client`가 아니라 `src/generated/prisma`를 사용합니다.

- `npm run db:generate`를 먼저 실행했는지 확인
- 앱/스크립트에서는 `src/db/client`를 통해 Prisma를 사용

### macOS에서 Node 실행이 `libicui18n`으로 깨질 때

Homebrew Node/ICU 버전 꼬임으로 아래 같은 오류가 날 수 있습니다:

`Library not loaded: ... libicui18n.*.dylib`

해결 방법 중 하나를 선택하세요:

- `brew reinstall node`
- `nvm` 같은 버전 매니저로 Node 20을 재설치/고정
