# Pole - 개발팀 인트라넷 플랫폼

## 기술 스택
- Next.js 16 (App Router) + React 19 + TypeScript
- Mantine v8 (다크 테마, 바이올렛 액센트)
- Tailwind CSS v4 + CSS Modules
- Prisma 7 + PostgreSQL (Supabase)
- Anthropic Claude API (AI 분석)
- Figma REST API v1

## 주요 기능
- Figma Hub: 프로젝트 관리
- Design Review: 디자인 리뷰 & 피드백
- Figma Explorer: 노드 트리 탐색
- Handoff: 디자인-개발 핸드오프 추적

## 컨벤션
- CSS 변수는 globals.css에 정의
- API 응답 형식: `{ success, data/error }`
- DB 컬럼: snake_case (@map)
- 컴포넌트 스타일: CSS Modules (*.module.css)
- 아이콘: @tabler/icons-react
- 상태 관리: React hooks (외부 라이브러리 없음)

## 환경 변수
- DATABASE_URL, FIGMA_API_KEY, ANTHROPIC_API_KEY (.env.local)

## 관련 프로젝트
- pole-template: 이 프로젝트의 기반 구조 템플릿 (../pole-template)
- jack: 템플릿 기반 새 프로젝트 (../jack)

## 프로젝트 관리
- 전체 프로젝트 관리 가이드: [../project-docs/project-manager.md](../project-docs/project-manager.md)
- GitHub: github.com/junyoyehee/project-docs
- 공통 컨벤션, 기술 스택, 신규 프로젝트 생성 절차 등은 해당 문서를 참고
