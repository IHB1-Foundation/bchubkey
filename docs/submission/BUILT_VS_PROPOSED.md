# Built vs. Proposed

## Summary

프로젝트: **BCHubKey**  
목표: CashTokens 기반 Telegram 그룹 접근제어 자동화

## What We Proposed

1. Telegram 그룹 토큰 게이팅 자동화
2. 주소 소유권 검증(whale address 복붙 방지)
3. FT/NFT 기준 게이트 정책
4. 주기적 재검증 + grace enforcement
5. 관리자 관찰/운영 도구

## What We Built

1. Telegram setup wizard + deep-link onboarding
2. 마이크로 트랜잭션 기반 소유권 검증 플로우
3. FT/NFT 토큰 조건 게이팅
4. 스케줄러 기반 재검증 및 자동 제한/해제
5. Admin JSON API + Vercel 프론트엔드 대시보드
6. Railway(Postgres) 배포 가이드 및 운영 체크리스트

## Delta (Changes from Initial Plan)

1. Admin UI 제공 방식
   - 초기: 서버 렌더링 대시보드 중심
   - 현재: Railway JSON API + Vercel 정적 FE 분리
2. 데이터 계층
   - 초기 문서 일부 MySQL 표현
   - 현재: Prisma + Postgres로 통일
3. 배포 토폴로지
   - FE(Vercel), Core/Runnable services(Railway), DB(Railway Postgres), Contract(외부 분리 배포)

## Current Scope Status

- 완료: MVP 핵심 플로우(설정 → 검증 → 게이트 판정 → 자동 enforcement)
- 완료: 배포 문서/운영 절차 정리
- 진행 예정: 실사용 피드백 기반 정책/UX 개선 및 운영 자동화 강화
