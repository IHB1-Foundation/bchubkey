# BCH-1 Final Submission Checklist

기준일: **2026-02-25**

공유받은 일정 기준:
- 최종 제출 마감: **2026-02-26**
- Demo Day/심사: **2026-03-01 주간**
- 수상 발표: **2026-03-05**

## 1) 제출 필수물

- [ ] Live demo URL
  - FE (Vercel): `https://...vercel.app`
  - Core API (Railway): `https://...up.railway.app/api/health` 정상 응답
- [ ] GitHub repository URL
- [ ] Demo video URL (2~3분)
- [ ] What you built vs. what you proposed 문서
  - 파일: `docs/submission/BUILT_VS_PROPOSED.md`
- [ ] Post-sprint development plan 문서
  - 파일: `docs/submission/POST_SPRINT_PLAN.md`
- [ ] 스크린샷 세트
  - `docs/submission/screenshots/README.md` 항목 충족

## 2) 운영 체크 (제출 전)

- [ ] `npm run build` 성공
- [ ] Railway 로그에서 `prisma migrate deploy` 성공 확인
- [ ] Telegram에서 `/start`, `/help`, `/setup` 기본 동작 확인
- [ ] FE에서 로그인/그룹 로드 확인 (CORS 오류 없음)

## 3) BCH-1 프로세스 대응

- [ ] Track 확정 (현재: Applications Track 권장)
- [ ] 주간 체크인 기록 정리
- [ ] 공개 소셜 업데이트 3회 링크 정리
  - 파일: `docs/submission/SOCIAL_UPDATES.md`
- [ ] 제출 폼에 아래 4개 최종 반영
  - Demo URL
  - GitHub URL
  - Demo Video URL
  - Built vs Proposed 요약

## 4) 제출 직전 10분 체크

- [ ] 발표용 데모 계정 로그인 상태 점검
- [ ] 봇 토큰/시크릿 등 민감정보 화면 노출 여부 확인
- [ ] Demo 흐름 리허설 (3분 내)
- [ ] 장애 대비: 데모 영상 백업 링크 준비
