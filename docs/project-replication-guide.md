# POLE 프로젝트 복제 지침서

> 이 문서는 POLE 프로젝트와 동일한 외형, 데이터베이스, Figma API, AI 활용, 탐색 모드, 컴포넌트 구성을 가진 새 프로젝트를 구축하기 위한 완전한 지침서입니다.

---

## 1. 기술 스택 (Tech Stack)

| 영역 | 기술 | 버전 |
|------|------|------|
| 프레임워크 | Next.js (App Router) | 16.x |
| UI 런타임 | React | 19.x |
| 언어 | TypeScript | 5.x |
| UI 라이브러리 | Mantine | 8.x |
| 아이콘 | Tabler Icons React | 3.x |
| CSS | Tailwind CSS | 4.x |
| ORM | Prisma | 7.x |
| 데이터베이스 | PostgreSQL (Supabase) | - |
| AI | Anthropic Claude (Sonnet 4) | - |
| 외부 API | Figma REST API v1 | - |
| 인증 | bcryptjs + jsonwebtoken | - |

### 설치 명령

```bash
npx create-next-app@latest [project-name] --typescript --app --tailwind
cd [project-name]

# UI 라이브러리
npm install @mantine/core @mantine/hooks @mantine/notifications
npm install @tabler/icons-react

# 데이터베이스
npm install prisma @prisma/client @prisma/adapter-pg pg
npm install -D tsx tsconfig-paths

# AI
npm install @anthropic-ai/sdk  # 또는 직접 fetch 사용

# 인증
npm install bcryptjs jsonwebtoken
npm install -D @types/bcryptjs @types/jsonwebtoken

# PostCSS (Tailwind v4)
npm install @tailwindcss/postcss
```

---

## 2. 디렉토리 구조

```
/project-root
├── /src
│   ├── /app
│   │   ├── layout.tsx                    # 루트 레이아웃 (Mantine Provider, 폰트)
│   │   ├── globals.css                   # CSS 변수, 테마 토큰
│   │   ├── /(dashboard)                  # 보호된 라우트 그룹
│   │   │   ├── layout.tsx                # 대시보드 레이아웃 (Sidebar + Header)
│   │   │   ├── page.tsx                  # 홈/대시보드
│   │   │   ├── /[feature-1]             # 기능별 페이지
│   │   │   │   ├── page.tsx
│   │   │   │   └── /new/page.tsx        # 생성 폼
│   │   │   ├── /[feature-2]
│   │   │   └── /[explorer]              # 탐색 모드 페이지
│   │   └── /api
│   │       ├── /figma                    # Figma API 프록시
│   │       │   ├── route.ts
│   │       │   ├── /ai-analyze/route.ts
│   │       │   ├── /images/route.ts
│   │       │   └── /export-html/route.ts
│   │       └── /v1                       # REST API
│   │           ├── /[resource]/route.ts
│   │           └── /[resource]/[id]/route.ts
│   ├── /components
│   │   ├── Header.tsx                    # 상단 헤더 (브레드크럼, 검색)
│   │   ├── Sidebar.tsx                   # 사이드바 네비게이션
│   │   ├── RichEditor.tsx                # 마크다운 에디터
│   │   └── *.module.css                  # 컴포넌트별 CSS 모듈
│   ├── /lib
│   │   ├── prisma.ts                     # Prisma 싱글턴
│   │   └── api.ts                        # API 응답 헬퍼
│   ├── /theme
│   │   └── index.ts                      # Mantine 테마 설정
│   ├── /types
│   │   └── *.d.ts                        # 타입 정의
│   └── /generated
│       └── /prisma                       # Prisma 생성 타입
├── /prisma
│   ├── schema.prisma                     # DB 스키마
│   ├── seed.ts                           # 시드 데이터
│   └── /migrations                       # 마이그레이션
├── /docs                                 # AI 프롬프트 & 가이드
├── /public                               # 정적 자산
└── 설정 파일들
```

---

## 3. 외형 및 디자인 시스템

### 3.1 전체 테마 원칙

- **다크 모드 전용** (defaultColorScheme: "dark")
- **바이올렛 액센트** (#A78BFA)를 Primary Color로 사용
- **미니멀 다크 UI** - 배경은 거의 검정에 가까운 짙은 회색 계열
- **서브틀한 보더** - rgba 기반 반투명 보더
- **부드러운 전환** - 0.18s cubic-bezier 트랜지션

### 3.2 CSS 변수 (globals.css에 정의)

```css
:root {
  /* 배경 계층 */
  --bg-primary: #0C0C0F;       /* 최하위 배경 */
  --bg-secondary: #131317;     /* 카드/패널 배경 */
  --bg-tertiary: #1A1A20;      /* 입력 필드 배경 */
  --bg-elevated: #202028;      /* 떠있는 요소 */
  --bg-hover: #24242E;         /* 호버 상태 */
  --bg-active: #2A2A36;        /* 활성 상태 */

  /* 보더 */
  --border-subtle: rgba(255,255,255,0.05);
  --border-medium: rgba(255,255,255,0.09);
  --border-focus: rgba(167,139,250,0.5);

  /* 텍스트 계층 */
  --text-primary: #EDEDF0;     /* 주요 텍스트 */
  --text-secondary: #9898A6;   /* 보조 텍스트 */
  --text-tertiary: #5C5C72;    /* 비활성 텍스트 */
  --text-muted: #44445A;       /* 뮤트된 텍스트 */

  /* 액센트 컬러 */
  --accent: #A78BFA;           /* 바이올렛 (Primary) */
  --accent-bright: #C4B5FD;
  --accent-dim: rgba(167,139,250,0.12);
  --accent-glow: rgba(167,139,250,0.22);

  /* 시맨틱 컬러 (각각 dim 버전 포함) */
  --teal: #2DD4BF;       --teal-dim: rgba(45,212,191,0.10);
  --blue: #60A5FA;       --blue-dim: rgba(96,165,250,0.10);
  --green: #4ADE80;      --green-dim: rgba(74,222,128,0.10);
  --orange: #FB923C;     --orange-dim: rgba(251,146,60,0.10);
  --pink: #F472B6;       --pink-dim: rgba(244,114,182,0.10);
  --yellow: #FACC15;     --yellow-dim: rgba(250,204,21,0.08);
  --cyan: #22D3EE;       --cyan-dim: rgba(34,211,238,0.10);
  --indigo: #818CF8;     --indigo-dim: rgba(129,140,248,0.10);
  --red: #F87171;        --red-dim: rgba(248,113,113,0.10);

  /* 레이아웃 */
  --radius-xs: 4px;
  --radius-sm: 6px;
  --radius-md: 10px;
  --radius-lg: 14px;
  --shadow-md: 0 4px 24px rgba(0,0,0,0.55);
  --shadow-lg: 0 12px 40px rgba(0,0,0,0.65);
  --transition: 0.18s cubic-bezier(0.4, 0, 0.2, 1);

  /* 폰트 */
  --font-sans: 'Plus Jakarta Sans', -apple-system, sans-serif;
  --font-mono: 'JetBrains Mono', monospace;
}
```

### 3.3 글로벌 스타일 규칙

```css
* { margin: 0; padding: 0; box-sizing: border-box; }

body {
  font-family: var(--font-sans);
  background: var(--bg-primary);
  color: var(--text-primary);
  -webkit-font-smoothing: antialiased;
}

/* 커스텀 스크롤바 (5px, 투명 트랙, 둥근 thumb) */
::-webkit-scrollbar { width: 5px; height: 5px; }
::-webkit-scrollbar-track { background: transparent; }
::-webkit-scrollbar-thumb { background: var(--border-medium); border-radius: 99px; }
::-webkit-scrollbar-thumb:hover { background: var(--text-tertiary); }
```

### 3.4 Mantine 테마 설정 (`/src/theme/index.ts`)

```typescript
import { createTheme, MantineColorsTuple } from '@mantine/core';

const violet: MantineColorsTuple = [
  '#f3edff', '#e1d5fb', '#c4b5fd', '#a78bfa', '#8b5cf6',
  '#7c3aed', '#6d28d9', '#5b21b6', '#4c1d95', '#3b0764',
];

export const theme = createTheme({
  primaryColor: 'violet',
  colors: {
    violet,
    dark: [
      '#EDEDF0', '#9898A6', '#5C5C72', '#44445A', '#2A2A36',
      '#24242E', '#1A1A20', '#131317', '#0C0C0F', '#080810',
    ],
  },
  fontFamily: "'Plus Jakarta Sans', -apple-system, sans-serif",
  fontFamilyMonospace: "'JetBrains Mono', monospace",
  headings: {
    fontFamily: "'Plus Jakarta Sans', -apple-system, sans-serif",
    fontWeight: '700',
  },
  radius: { xs: '4px', sm: '6px', md: '10px', lg: '14px', xl: '20px' },
  defaultRadius: 'sm',
  cursorType: 'pointer',
});
```

### 3.5 폰트 로딩 (Root Layout)

```typescript
import { Plus_Jakarta_Sans, JetBrains_Mono } from 'next/font/google';

const plusJakarta = Plus_Jakarta_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800'],
  variable: '--font-sans',
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  variable: '--font-mono',
});
```

### 3.6 스타일링 방식

| 방식 | 용도 |
|------|------|
| CSS 변수 (globals.css) | 전역 디자인 토큰 |
| CSS Modules (*.module.css) | 컴포넌트 스코프 스타일 |
| Tailwind 유틸리티 | 인라인 유틸리티 클래스 |
| Mantine 테마 | 컴포넌트 라이브러리 테마 |

---

## 4. 레이아웃 구성

### 4.1 루트 레이아웃 (`/src/app/layout.tsx`)

```tsx
import { MantineProvider, ColorSchemeScript } from '@mantine/core';
import { Notifications } from '@mantine/notifications';
import { theme } from '@/theme';
import '@mantine/core/styles.css';
import '@mantine/notifications/styles.css';
import './globals.css';

export default function RootLayout({ children }) {
  return (
    <html lang="ko">
      <head>
        <ColorSchemeScript defaultColorScheme="dark" />
      </head>
      <body className={`${plusJakarta.variable} ${jetbrainsMono.variable}`}>
        <MantineProvider theme={theme} defaultColorScheme="dark">
          <Notifications />
          {children}
        </MantineProvider>
      </body>
    </html>
  );
}
```

### 4.2 대시보드 레이아웃 (`/(dashboard)/layout.tsx`)

- **2열 구성**: 좌측 Sidebar (고정) + 우측 메인 콘텐츠
- CSS Module로 그리드 정의
- Sidebar는 항상 보이며 메인 콘텐츠 영역은 스크롤 가능

```css
/* layout.module.css */
.container {
  display: grid;
  grid-template-columns: 260px 1fr;
  min-height: 100vh;
}
.main {
  overflow-y: auto;
  max-height: 100vh;
}
```

### 4.3 Sidebar 컴포넌트

**구성 요소:**
- 로고/앱 이름 영역
- 네비게이션 섹션 (아이콘 + 라벨)
- 활성 라우트 하이라이팅 (바이올렛 배경)
- 사용자 카드 (하단)
- 각 메뉴 아이템에 Tabler 아이콘 사용

**네비게이션 패턴:**
```typescript
const menuItems = [
  { label: 'Home', icon: IconHome, href: '/' },
  { label: 'Figma Hub', icon: IconBrandFigma, href: '/figma-hub' },
  { label: 'Design Review', icon: IconEye, href: '/design-review' },
  { label: 'Figma Explorer', icon: IconSitemap, href: '/figma-explorer' },
  { label: 'Handoff', icon: IconTransfer, href: '/handoff' },
];
```

### 4.4 Header 컴포넌트

- 브레드크럼 네비게이션
- 검색 입력 (Mantine Autocomplete)
- 알림 벨 아이콘
- 테마 토글 (다크/라이트)

---

## 5. 사용 컴포넌트 패턴

### 5.1 Mantine 컴포넌트 사용 목록

| 컴포넌트 | 용도 |
|----------|------|
| `Button` | 액션 버튼 (variant: filled, light, subtle, outline) |
| `Select` | 드롭다운 선택 |
| `Textarea` | 멀티라인 입력 |
| `TextInput` | 단일 입력 |
| `Autocomplete` | 검색 자동완성 |
| `Badge` | 상태 레이블 (color별 구분) |
| `Paper` | 카드/패널 컨테이너 |
| `Stack` | 수직 레이아웃 |
| `Group` | 수평 레이아웃 |
| `ScrollArea` | 스크롤 영역 |
| `Modal` | 모달 다이얼로그 |
| `Tabs` | 탭 네비게이션 |
| `Tooltip` | 툴팁 |
| `Loader` | 로딩 스피너 |
| `Notification` | 토스트 알림 |
| `ActionIcon` | 아이콘 버튼 |

### 5.2 Badge 색상 컨벤션

```typescript
// 상태별 색상 매핑
const statusColors = {
  DESIGNING: 'blue',
  IN_REVIEW: 'yellow',
  IN_DEV: 'orange',
  DONE: 'green',
  OPEN: 'cyan',
  APPROVED: 'green',
  PENDING: 'gray',
  IN_PROGRESS: 'blue',
  IMPLEMENTED: 'teal',
  VERIFIED: 'green',
};

// 우선순위별 색상
const priorityColors = {
  HIGH: 'red',
  NORMAL: 'blue',
  LOW: 'gray',
};
```

### 5.3 페이지 레이아웃 패턴 (목록 + 상세)

대부분의 페이지는 **2패널 구조**:

```
┌──────────────────────────────────────────┐
│ Header (검색 + 필터 + 생성 버튼)            │
├──────────────────┬───────────────────────┤
│                  │                       │
│   목록 패널       │    상세 패널            │
│   (좌측 40%)     │    (우측 60%)          │
│                  │                       │
│  - 카드 리스트    │  - 선택 항목 상세       │
│  - 클릭으로 선택  │  - 탭 (상세/피드백/...)  │
│                  │                       │
└──────────────────┴───────────────────────┘
```

### 5.4 커스텀 CSS Module 패턴

각 페이지/컴포넌트의 스타일은 CSS Module로 분리:
- CSS 변수를 참조하여 테마 일관성 유지
- `var(--bg-secondary)` 등으로 배경 지정
- 호버, 활성, 선택 상태 모두 CSS 변수로 처리

```css
/* 예시: 목록 아이템 */
.item {
  padding: 14px 16px;
  border-bottom: 1px solid var(--border-subtle);
  cursor: pointer;
  transition: background var(--transition);
}
.item:hover {
  background: var(--bg-hover);
}
.itemActive {
  background: var(--accent-dim);
  border-left: 3px solid var(--accent);
}
```

---

## 6. 데이터베이스 설계

### 6.1 Prisma 설정

**prisma.config.ts:**
```typescript
import path from 'node:path';
import type { PrismaConfig } from 'prisma';

export default {
  earlyAccess: true,
  schema: path.join('prisma', 'schema.prisma'),
} satisfies PrismaConfig;
```

**schema.prisma 헤더:**
```prisma
generator client {
  provider = "prisma-client-js"
  output   = "../src/generated/prisma"
}

datasource db {
  provider = "postgresql"
}
```

### 6.2 모델 설계 원칙

- **UUID를 PK로 사용** (`@id @default(uuid())`)
- **snake_case 매핑** (`@@map("table_name")`, `@map("column_name")`)
- **문자열 Enum** (`String` + 주석으로 허용값 명시)
- **JSON은 String으로 저장** (`specData`, `previewImages`)
- **Cascade 삭제** (`onDelete: Cascade`) - 부모 삭제시 자식도 삭제
- **createdAt 자동 생성** (`@default(now())`)
- **관계 네이밍** (`@relation("RelationName")`)

### 6.3 핵심 모델 구조

```
User (팀원)
 ├── FigmaProject (디자인 프로젝트)
 │    ├── DesignReview (디자인 리뷰)
 │    │    └── ReviewFeedback (리뷰 피드백)
 │    └── Handoff (핸드오프 항목)
 └── Comment (댓글 - 다형성, targetType으로 구분)
```

### 6.4 Prisma 싱글턴 (`/src/lib/prisma.ts`)

```typescript
import { PrismaClient } from '@/generated/prisma';

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

export const prisma = globalForPrisma.prisma || new PrismaClient();

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;
```

### 6.5 시드 데이터 패턴

- `prisma/seed.ts`에서 20명의 사용자 + 샘플 프로젝트 생성
- `package.json`에 `"prisma": { "seed": "npx tsx prisma/seed.ts" }` 설정
- `npx prisma db seed` 명령으로 실행

---

## 7. API 설계

### 7.1 API 응답 형식

```typescript
// /src/lib/api.ts
// 성공 응답
{ success: true, data: T }

// 에러 응답
{ success: true, error: { code: string, message: string } }

// 페이지네이션 응답
{
  success: true,
  data: {
    items: T[],
    pagination: { page: number, limit: number, total: number }
  }
}
```

### 7.2 REST API 라우트 구조 (`/api/v1/`)

```
/api/v1/[resource]
  GET  → 목록 조회 (쿼리파라미터: page, limit, status, search)
  POST → 생성

/api/v1/[resource]/[id]
  GET    → 상세 조회 (include로 관계 포함)
  PATCH  → 수정
  DELETE → 삭제
```

### 7.3 Figma API 프록시 라우트 (`/api/figma/`)

```
GET  /api/figma              → 파일/노드 데이터 조회
GET  /api/figma/images       → 프리뷰 이미지 가져오기
POST /api/figma/ai-analyze   → AI 분석 (핸드오프 스펙 생성)
POST /api/figma/export-html  → HTML+CSS 변환
POST /api/figma/extract-spec → 디자인 스펙 추출
```

---

## 8. Figma API 연동

### 8.1 기본 설정

```typescript
const FIGMA_BASE = 'https://api.figma.com/v1';
const headers = {
  'X-Figma-Token': process.env.FIGMA_API_KEY!,
};
```

### 8.2 주요 API 호출

```typescript
// 파일 전체 정보
GET ${FIGMA_BASE}/files/${fileKey}

// 특정 노드 조회
GET ${FIGMA_BASE}/files/${fileKey}/nodes?ids=${nodeId}&depth=${depth}

// 이미지 렌더링
GET ${FIGMA_BASE}/images/${fileKey}?ids=${nodeIds}&format=png&scale=2
```

### 8.3 Figma URL 파싱

```typescript
// URL에서 fileKey 추출
// https://www.figma.com/design/ABC123/... → fileKey: ABC123
const fileKeyMatch = url.match(/\/(file|design)\/([a-zA-Z0-9]+)/);

// URL에서 nodeId 추출 (URL의 node-id 파라미터)
// ?node-id=123-456 → nodeId: 123:456 (대시를 콜론으로 변환)
```

### 8.4 노드 트리 구조 처리

```typescript
interface FigmaNode {
  id: string;
  name: string;
  type: string;         // CANVAS, FRAME, COMPONENT, INSTANCE, GROUP, TEXT, ...
  children?: FigmaNode[];
  visible?: boolean;
  // 위치, 크기, 스타일 등 추가 속성
}
```

---

## 9. AI 활용

### 9.1 Anthropic Claude 연동

```typescript
// API 호출 패턴
const response = await fetch('https://api.anthropic.com/v1/messages', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'x-api-key': process.env.ANTHROPIC_API_KEY!,
    'anthropic-version': '2023-06-01',
  },
  body: JSON.stringify({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 4096,
    messages: [{ role: 'user', content: prompt }],
  }),
});
```

### 9.2 AI 분석 레벨

| 레벨 | 프롬프트 파일 | 용도 |
|------|-------------|------|
| simple | `docs/ai-handoff-simple.md` | 기본 스펙 생성 |
| medium | `docs/ai-handoff-medium.md` | 표준 분석 |
| detailed | `docs/ai-handoff-detailed.md` | 상세 분석 (코드 예시 포함) |

### 9.3 AI 프롬프트 관리 방식

- `/docs/` 폴더에 마크다운 파일로 프롬프트 저장
- `fs.readFileSync()`로 런타임에 로드
- Figma 노드 JSON 데이터를 프롬프트에 주입
- AI 응답은 JSON으로 파싱하여 구조화된 데이터로 반환

### 9.4 AI 활용 포인트

1. **핸드오프 스펙 자동 생성** - Figma 노드 데이터 → 컴포넌트 명세
2. **디자인 리뷰 메타데이터 생성** - 제목, 설명, 카테고리 자동 제안
3. **디자인 토큰 추출** - 색상, 타이포그래피, 간격 자동 추출
4. **담당자 추천** - 작업 특성에 맞는 개발자/디자이너 추천

---

## 10. 탐색 모드 (Figma Explorer)

### 10.1 개요

Figma 파일의 노드 트리를 시각적으로 탐색할 수 있는 인터랙티브 브라우저.

### 10.2 핵심 기능

```
┌─────────────────────────────────────────────────────┐
│  [URL 입력] [탐색 버튼]           [히든 노드 토글]     │
├────────────────┬───────────────┬────────────────────┤
│                │               │                    │
│   노드 트리     │   프리뷰 이미지 │   노드 속성 패널    │
│   (좌측)       │   (중앙)       │   (우측)           │
│                │               │                    │
│  - 계층 구조    │  - 선택 노드    │  - id, name, type  │
│  - 깊이별 색상  │    렌더링      │  - 크기, 위치      │
│  - 접기/펼치기  │  - 2x 스케일    │  - 스타일 속성     │
│  - 타입별 아이콘 │               │                    │
└────────────────┴───────────────┴────────────────────┘
```

### 10.3 노드 타입별 시각 구분

```typescript
const nodeTypeColors = {
  CANVAS: 'blue',
  FRAME: 'violet',
  COMPONENT: 'green',
  COMPONENT_SET: 'teal',
  INSTANCE: 'cyan',
  GROUP: 'orange',
  TEXT: 'yellow',
  VECTOR: 'pink',
  RECTANGLE: 'indigo',
  ELLIPSE: 'pink',
  LINE: 'gray',
  BOOLEAN_OPERATION: 'red',
};
```

### 10.4 트리 렌더링 패턴

```typescript
// 재귀적 트리 렌더링
function renderNode(node: FigmaNode, depth: number) {
  return (
    <div style={{ paddingLeft: depth * 16 }}>
      {/* 깊이 표시 블록 (색상 줄무늬) */}
      {Array.from({ length: depth }).map((_, i) => (
        <span key={i} className={styles.depthBlock}
              style={{ background: depthColors[i % depthColors.length] }} />
      ))}
      {/* 확장/축소 아이콘 */}
      {node.children && <IconChevronRight />}
      {/* 노드 타입 배지 */}
      <Badge color={nodeTypeColors[node.type]} size="xs">{node.type}</Badge>
      {/* 노드 이름 */}
      <span>{node.name}</span>
    </div>
  );
}
```

### 10.5 최근 탐색 기록

```typescript
// localStorage에 최근 탐색 기록 저장
const STORAGE_KEY = 'figma-explorer-recent';
const MAX_ITEMS = 20;

interface RecentExplore {
  fileKey: string;
  nodeId?: string;
  name: string;
  timestamp: number;
}

// 저장
localStorage.setItem(STORAGE_KEY, JSON.stringify(items));

// 불러오기
JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
```

---

## 11. 환경 변수

### `.env.local` 파일

```bash
# Figma API
FIGMA_API_KEY=figd_xxxxx

# Anthropic AI
ANTHROPIC_API_KEY=sk-ant-api03-xxxxx

# Database (PostgreSQL / Supabase)
DATABASE_URL=postgresql://user:password@host:port/database
```

---

## 12. 설정 파일

### next.config.ts

```typescript
import type { NextConfig } from 'next';
const nextConfig: NextConfig = {};
export default nextConfig;
```

### postcss.config.mjs

```javascript
const config = { plugins: { "@tailwindcss/postcss": {} } };
export default config;
```

### tsconfig.json 주요 설정

```json
{
  "compilerOptions": {
    "target": "ES2017",
    "lib": ["dom", "dom.iterable", "esnext"],
    "strict": true,
    "jsx": "preserve",
    "paths": { "@/*": ["./src/*"] }
  }
}
```

---

## 13. 새 프로젝트 적용 체크리스트

### Phase 1: 기본 구조 설정
- [ ] Next.js 프로젝트 생성 (App Router, TypeScript)
- [ ] 패키지 설치 (Mantine, Tabler Icons, Prisma, Tailwind v4)
- [ ] `globals.css` 에 CSS 변수 전체 복사
- [ ] `/src/theme/index.ts` Mantine 테마 설정
- [ ] 루트 레이아웃에 MantineProvider + 폰트 설정
- [ ] PostCSS 설정 (Tailwind v4)

### Phase 2: 레이아웃
- [ ] Sidebar 컴포넌트 구현
- [ ] Header 컴포넌트 구현
- [ ] `(dashboard)` 라우트 그룹 + 2열 레이아웃
- [ ] 메인 대시보드 페이지 (기능 카드 그리드)

### Phase 3: 데이터베이스
- [ ] Prisma 스키마 정의 (도메인에 맞게)
- [ ] 마이그레이션 실행
- [ ] Prisma 싱글턴 설정
- [ ] 시드 데이터 작성

### Phase 4: API
- [ ] `/src/lib/api.ts` 응답 헬퍼 생성
- [ ] REST API 라우트 구현 (`/api/v1/`)
- [ ] Figma API 프록시 라우트 구현

### Phase 5: 기능 페이지
- [ ] 목록 + 상세 2패널 페이지 구현
- [ ] 필터, 검색, 정렬 기능
- [ ] 생성 폼 페이지

### Phase 6: Figma 탐색 모드
- [ ] 노드 트리 렌더러 구현
- [ ] 프리뷰 이미지 로딩
- [ ] 노드 속성 패널
- [ ] 최근 기록 (localStorage)

### Phase 7: AI 연동
- [ ] AI 프롬프트 마크다운 파일 작성
- [ ] AI 분석 API 라우트 구현
- [ ] 분석 결과 UI 표시

### Phase 8: 마무리
- [ ] 인증 시스템 (bcryptjs + JWT)
- [ ] 에러 핸들링
- [ ] 로딩 상태 및 스켈레톤 UI
- [ ] 반응형 대응

---

## 14. 핵심 컨벤션 요약

| 항목 | 컨벤션 |
|------|--------|
| 파일명 | kebab-case (page.tsx, route.ts) |
| 컴포넌트 | PascalCase (Header.tsx, Sidebar.tsx) |
| CSS | CSS Modules (*.module.css) + CSS 변수 |
| API 응답 | `{ success, data/error }` 통일 |
| DB 컬럼 | snake_case (@map) |
| 상태 관리 | React hooks (useState, useCallback) |
| 아이콘 | @tabler/icons-react |
| 폰트 | Plus Jakarta Sans (본문) + JetBrains Mono (코드) |
| 컬러 스킴 | 다크 모드 전용, 바이올렛 액센트 |
| 데이터 ID | UUID v4 |
