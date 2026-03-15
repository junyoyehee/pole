# POLE 컴포넌트 재사용 가이드

> POLE 프로젝트의 컴포넌트, 디자인 시스템, 유틸리티를 다른 프로젝트에서 재사용하는 3가지 방법을 설명합니다.

---

## 재사용 대상 파일 목록

| 파일 | 역할 | 의존성 |
|------|------|--------|
| `src/app/globals.css` | CSS 변수 (디자인 토큰 전체) | Tailwind CSS v4 |
| `src/theme/index.ts` | Mantine 다크 테마 + 바이올렛 액센트 | @mantine/core |
| `src/components/Sidebar.tsx` | 사이드바 네비게이션 (섹션, 활성 라우트, 유저카드) | next/navigation, @tabler/icons-react |
| `src/components/Sidebar.module.css` | 사이드바 스타일 (180px 고정, 다크 테마) | globals.css 변수 |
| `src/components/Header.tsx` | 상단 헤더 (브레드크럼, 검색, 알림) | @tabler/icons-react |
| `src/components/Header.module.css` | 헤더 스타일 (42px 높이, sticky) | globals.css 변수 |
| `src/components/RichEditor.tsx` | 마크다운 에디터 (포맷팅, 이미지 붙여넣기, 첨부파일) | @tabler/icons-react |
| `src/components/RichEditor.module.css` | 에디터 스타일 (툴바, 프리뷰, 첨부 목록) | globals.css 변수 |
| `src/lib/prisma.ts` | Prisma 클라이언트 싱글턴 | @prisma/client |
| `src/lib/api.ts` | API 응답 포맷 헬퍼 (success/error/pagination) | 없음 |

### 공통 필수 패키지

```bash
npm install @mantine/core @mantine/hooks @mantine/notifications @tabler/icons-react
npm install @tailwindcss/postcss
```

---

## 방법 1: 직접 복사 (가장 간단)

프로젝트 간 빠르게 적용할 때 적합합니다. 설정이 필요 없고 즉시 사용 가능합니다.

### 1-1. 복사 순서

```bash
# 새 프로젝트에서 실행
# 1) 패키지 설치
npm install @mantine/core @mantine/hooks @mantine/notifications @tabler/icons-react
npm install @tailwindcss/postcss

# 2) 디자인 토큰 복사
cp [pole경로]/src/app/globals.css        src/app/globals.css

# 3) 테마 복사
mkdir -p src/theme
cp [pole경로]/src/theme/index.ts         src/theme/index.ts

# 4) 컴포넌트 복사
mkdir -p src/components
cp [pole경로]/src/components/Sidebar.tsx          src/components/
cp [pole경로]/src/components/Sidebar.module.css   src/components/
cp [pole경로]/src/components/Header.tsx            src/components/
cp [pole경로]/src/components/Header.module.css     src/components/
cp [pole경로]/src/components/RichEditor.tsx         src/components/
cp [pole경로]/src/components/RichEditor.module.css  src/components/

# 5) 유틸리티 복사
mkdir -p src/lib
cp [pole경로]/src/lib/prisma.ts          src/lib/
cp [pole경로]/src/lib/api.ts             src/lib/
```

### 1-2. 복사 후 수정이 필요한 부분

#### Sidebar.tsx - 네비게이션 메뉴 변경

```typescript
// 원본 (POLE 프로젝트용)
const NAV_SECTIONS: NavSection[] = [
  {
    title: "Figma",
    items: [
      { label: "피그마 허브", href: "/figma-hub", icon: <IconPalette size={15} /> },
      { label: "디자인 리뷰", href: "/design-review", icon: <IconMessageCircle size={15} /> },
      { label: "Figma 탐색기", href: "/figma-explorer", icon: <IconSearch size={15} /> },
      { label: "핸드오프", href: "/handoff", icon: <IconArrowRight size={15} /> },
    ],
  },
];

// 새 프로젝트에 맞게 변경
const NAV_SECTIONS: NavSection[] = [
  {
    title: "메인",
    items: [
      { label: "대시보드", href: "/", icon: <IconHome size={15} /> },
      { label: "프로젝트", href: "/projects", icon: <IconFolder size={15} /> },
      // ... 새 프로젝트의 라우트에 맞게 추가
    ],
  },
];
```

#### Sidebar.tsx - 앱 이름과 사용자 정보 변경

```typescript
// 로고 영역
<span className={styles.title}>Figma Explorer</span>
// → 새 프로젝트 이름으로 변경

// 사용자 카드 (하드코딩된 부분을 props나 auth로 교체)
<div className={styles.userName}>일달러</div>
<div className={styles.userRole}>Frontend Lead</div>
// → props로 받거나 인증 시스템에서 가져오도록 변경
```

#### Root Layout - MantineProvider 설정

```typescript
// src/app/layout.tsx에 반드시 포함해야 하는 내용
import { MantineProvider, ColorSchemeScript } from '@mantine/core';
import { Notifications } from '@mantine/notifications';
import { theme } from '@/theme';
import '@mantine/core/styles.css';
import '@mantine/notifications/styles.css';
import './globals.css';

// <head> 안에:
<ColorSchemeScript defaultColorScheme="dark" />

// <body> 안에:
<MantineProvider theme={theme} defaultColorScheme="dark">
  <Notifications />
  {children}
</MantineProvider>
```

#### PostCSS 설정

```javascript
// postcss.config.mjs
const config = { plugins: { "@tailwindcss/postcss": {} } };
export default config;
```

### 1-3. 장단점

| 장점 | 단점 |
|------|------|
| 즉시 사용 가능, 추가 설정 없음 | POLE 컴포넌트 업데이트 시 수동으로 다시 복사해야 함 |
| 새 프로젝트에서 자유롭게 수정 가능 | 프로젝트가 많아지면 동기화 관리 어려움 |
| 의존성 단순 | 복사한 파일이 많을수록 유지보수 부담 증가 |

---

## 방법 2: 공유 패키지 (Monorepo)

여러 프로젝트가 동일한 컴포넌트를 항상 최신 상태로 공유해야 할 때 적합합니다.

### 2-1. 디렉토리 구조

```
/aiworks/githubs/
├── package.json                  # 루트 워크스페이스 설정
├── /packages/
│   └── /pole-ui/                 # 공유 UI 패키지
│       ├── package.json
│       ├── index.ts              # 공개 API (export)
│       ├── globals.css
│       ├── /theme/
│       │   └── index.ts
│       ├── /components/
│       │   ├── Sidebar.tsx
│       │   ├── Sidebar.module.css
│       │   ├── Header.tsx
│       │   ├── Header.module.css
│       │   ├── RichEditor.tsx
│       │   └── RichEditor.module.css
│       └── /lib/
│           ├── prisma.ts
│           └── api.ts
├── /pole/                        # 기존 프로젝트
│   └── package.json              # "@pole-ui": "workspace:*"
└── /new-project/                 # 새 프로젝트
    └── package.json              # "@pole-ui": "workspace:*"
```

### 2-2. 루트 package.json

```json
{
  "name": "aiworks-monorepo",
  "private": true,
  "workspaces": [
    "packages/*",
    "pole",
    "new-project"
  ]
}
```

### 2-3. 공유 패키지 package.json

```json
{
  "name": "@pole-ui/core",
  "version": "1.0.0",
  "private": true,
  "main": "index.ts",
  "exports": {
    ".": "./index.ts",
    "./globals.css": "./globals.css",
    "./theme": "./theme/index.ts",
    "./components/*": "./components/*.tsx",
    "./lib/*": "./lib/*.ts"
  },
  "peerDependencies": {
    "@mantine/core": "^8.0.0",
    "@mantine/hooks": "^8.0.0",
    "@mantine/notifications": "^8.0.0",
    "@tabler/icons-react": "^3.0.0",
    "next": "^15.0.0 || ^16.0.0",
    "react": "^19.0.0"
  }
}
```

### 2-4. 공유 패키지 index.ts

```typescript
// 컴포넌트
export { default as Sidebar } from './components/Sidebar';
export { default as Header } from './components/Header';
export { default as RichEditor, renderMarkdown, fileToDataUrl } from './components/RichEditor';
export type { Attachment } from './components/RichEditor';

// 테마
export { theme } from './theme';

// 유틸리티
export { prisma } from './lib/prisma';
export { successResponse, errorResponse, paginatedResponse } from './lib/api';
```

### 2-5. Sidebar를 설정 가능하게 변경

공유 패키지에서는 네비게이션 메뉴를 하드코딩하지 않고 props로 받도록 수정합니다:

```typescript
// packages/pole-ui/components/Sidebar.tsx
interface SidebarProps {
  appName?: string;
  appIcon?: React.ReactNode;
  sections: NavSection[];
  user?: { name: string; role: string; initial: string };
}

export default function Sidebar({ appName, appIcon, sections, user }: SidebarProps) {
  const pathname = usePathname();
  return (
    <aside className={styles.sidebar}>
      <div className={styles.header}>
        <div className={styles.logo}>{appIcon || <IconBrandFigma size={14} />}</div>
        <span className={styles.title}>{appName || 'App'}</span>
      </div>
      <nav className={styles.nav}>
        {sections.map((section) => (
          /* ... 기존 렌더링 로직 동일 ... */
        ))}
      </nav>
      {user && (
        <div className={styles.footer}>
          <div className={styles.userCard}>
            <div className={styles.userAvatar}>{user.initial}</div>
            <div style={{ flex: 1 }}>
              <div className={styles.userName}>{user.name}</div>
              <div className={styles.userRole}>{user.role}</div>
            </div>
            <div className={`${styles.statusDot} ${styles.online}`} />
          </div>
        </div>
      )}
    </aside>
  );
}
```

### 2-6. 새 프로젝트에서 사용

```bash
# 새 프로젝트의 package.json에 의존성 추가
npm install  # workspace가 자동으로 링크
```

```typescript
// src/app/layout.tsx
import { MantineProvider, ColorSchemeScript } from '@mantine/core';
import { theme } from '@pole-ui/core/theme';
import '@pole-ui/core/globals.css';
import '@mantine/core/styles.css';
```

```typescript
// src/app/(dashboard)/layout.tsx
import { Sidebar, Header } from '@pole-ui/core';

const sections = [
  {
    title: "메인",
    items: [
      { label: "대시보드", href: "/", icon: <IconHome size={15} /> },
      { label: "분석", href: "/analytics", icon: <IconChartBar size={15} /> },
    ],
  },
];

export default function DashboardLayout({ children }) {
  return (
    <div className={styles.container}>
      <Sidebar appName="My App" sections={sections} user={currentUser} />
      <main className={styles.main}>
        <Header breadcrumb="대시보드" />
        {children}
      </main>
    </div>
  );
}
```

### 2-7. Next.js transpile 설정

워크스페이스 패키지의 TypeScript/CSS Module을 Next.js가 처리하도록 설정:

```typescript
// next.config.ts
const nextConfig = {
  transpilePackages: ['@pole-ui/core'],
};
export default nextConfig;
```

### 2-8. 장단점

| 장점 | 단점 |
|------|------|
| 한 곳 수정하면 모든 프로젝트에 반영 | monorepo 초기 설정 필요 |
| 버전 관리 가능 | 프로젝트별 커스텀이 제한적 |
| 일관된 UI 보장 | 빌드 설정이 복잡해질 수 있음 |
| 타입 자동 공유 | CSS Module 경로 해석 이슈 가능 |

---

## 방법 3: 템플릿 프로젝트 (권장 - 새 프로젝트 빠른 시작)

POLE의 기반 구조만 추출한 스타터 템플릿을 만들어 새 프로젝트 시작점으로 사용합니다.

### 3-1. 템플릿 생성

```bash
mkdir pole-template && cd pole-template
npm init -y
```

### 3-2. 템플릿에 포함할 파일

```
/pole-template/
├── package.json                    # 의존성 목록 (도메인 패키지 제외)
├── tsconfig.json                   # TypeScript 설정 (path alias 포함)
├── next.config.ts                  # Next.js 설정
├── postcss.config.mjs              # Tailwind v4
├── eslint.config.mjs               # ESLint 설정
├── prisma/
│   └── schema.prisma               # 기본 User 모델만 포함
├── src/
│   ├── app/
│   │   ├── globals.css             # CSS 변수 전체 (그대로 복사)
│   │   ├── layout.tsx              # MantineProvider + 폰트 설정
│   │   └── /(dashboard)/
│   │       ├── layout.tsx          # Sidebar + Header 2열 레이아웃
│   │       ├── layout.module.css   # 레이아웃 그리드
│   │       └── page.tsx            # 빈 대시보드 (환영 메시지)
│   ├── components/
│   │   ├── Sidebar.tsx             # 메뉴 비워둠 (TODO 주석)
│   │   ├── Sidebar.module.css
│   │   ├── Header.tsx
│   │   ├── Header.module.css
│   │   ├── RichEditor.tsx
│   │   └── RichEditor.module.css
│   ├── theme/
│   │   └── index.ts
│   ├── lib/
│   │   ├── prisma.ts
│   │   └── api.ts
│   └── types/
│       └── index.d.ts
├── .env.example                    # 환경변수 템플릿
└── .gitignore
```

### 3-3. 템플릿 package.json

```json
{
  "name": "pole-template",
  "version": "1.0.0",
  "private": true,
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "next lint"
  },
  "dependencies": {
    "next": "^16.0.0",
    "react": "^19.0.0",
    "react-dom": "^19.0.0",
    "@mantine/core": "^8.0.0",
    "@mantine/hooks": "^8.0.0",
    "@mantine/notifications": "^8.0.0",
    "@tabler/icons-react": "^3.0.0",
    "@prisma/client": "^7.0.0",
    "@prisma/adapter-pg": "^7.0.0",
    "pg": "^8.0.0",
    "bcryptjs": "^3.0.0",
    "jsonwebtoken": "^9.0.0"
  },
  "devDependencies": {
    "typescript": "^5.0.0",
    "@types/bcryptjs": "^3.0.0",
    "@types/jsonwebtoken": "^9.0.0",
    "@tailwindcss/postcss": "^4.0.0",
    "tsx": "^4.0.0",
    "prisma": "^7.0.0"
  },
  "prisma": {
    "seed": "npx tsx prisma/seed.ts"
  }
}
```

### 3-4. 템플릿 Sidebar (커스터마이징 포인트 표시)

```typescript
// src/components/Sidebar.tsx
"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { IconSettings } from "@tabler/icons-react";
import styles from "./Sidebar.module.css";

// ========================================
// TODO: 새 프로젝트에 맞게 수정하세요
// ========================================
const APP_NAME = "My App";

const NAV_SECTIONS = [
  {
    title: "메인",
    items: [
      // { label: "페이지 이름", href: "/route", icon: <Icon size={15} /> },
    ],
  },
  {
    title: "설정",
    items: [
      { label: "설정", href: "/settings", icon: <IconSettings size={15} /> },
    ],
  },
];

const USER = {
  name: "사용자",
  role: "역할",
  initial: "U",
};
// ========================================

export default function Sidebar() {
  const pathname = usePathname();
  // ... 나머지 렌더링 로직은 원본과 동일
}
```

### 3-5. 템플릿 .env.example

```bash
# 데이터베이스
DATABASE_URL=postgresql://user:password@localhost:5432/dbname

# Figma API (Figma 연동 시)
FIGMA_API_KEY=

# AI (Anthropic Claude 연동 시)
ANTHROPIC_API_KEY=
```

### 3-6. 템플릿 사용 방법

#### Git 저장소에서 복제

```bash
# 방법 A: degit (히스토리 없이 복사)
npx degit your-username/pole-template my-new-project

# 방법 B: git clone 후 원격 제거
git clone https://github.com/your-username/pole-template.git my-new-project
cd my-new-project
rm -rf .git
git init
```

#### 로컬에서 복사

```bash
cp -r /path/to/pole-template my-new-project
cd my-new-project
rm -rf node_modules .next
npm install
```

#### 초기 설정

```bash
cd my-new-project

# 1) 의존성 설치
npm install

# 2) 환경변수 설정
cp .env.example .env.local
# .env.local 편집하여 실제 값 입력

# 3) 데이터베이스 초기화
npx prisma migrate dev --name init
npx prisma db seed

# 4) 개발 서버 시작
npm run dev
```

### 3-7. 장단점

| 장점 | 단점 |
|------|------|
| 새 프로젝트를 1분 내 시작 가능 | 템플릿 업데이트가 기존 프로젝트에 자동 반영 안 됨 |
| 각 프로젝트가 독립적으로 진화 | 템플릿 자체의 버전 관리 필요 |
| 설정 고민 없이 바로 개발 시작 | 공통 변경 시 각 프로젝트에 수동 적용 |
| git 히스토리가 깨끗 | - |

---

## 방법 비교 요약

| 기준 | 직접 복사 | 공유 패키지 | 템플릿 |
|------|----------|------------|--------|
| **초기 설정 난이도** | 쉬움 | 어려움 | 보통 |
| **프로젝트 수 1~2개** | 적합 | 과도함 | 적합 |
| **프로젝트 수 3개 이상** | 관리 어려움 | 적합 | 적합 |
| **UI 일관성 유지** | 수동 | 자동 | 수동 |
| **커스터마이징 자유도** | 높음 | 제한적 | 높음 |
| **컴포넌트 업데이트 전파** | 수동 | 자동 | 수동 |
| **빌드 복잡도** | 없음 | 높음 | 없음 |

### 선택 기준

- **한두 번만 재사용**: 방법 1 (직접 복사)
- **동일 UI를 여러 프로젝트에서 항상 동기화**: 방법 2 (공유 패키지)
- **같은 스타일로 새 프로젝트를 자주 시작**: 방법 3 (템플릿)
