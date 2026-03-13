# Figma Explorer

Figma 파일의 구조를 시각적으로 탐색하고, Claude Code(MCP)와의 연동 작업을 편리하게 도와주는 내부 도구입니다.

## 접속

```
http://localhost:3000/figma-explorer
```

## 기능

### 1. Figma 파일 탐색

- Figma URL을 입력하면 파일의 노드 구조를 **트리 형태**로 표시
- URL에 `node-id`가 포함되어 있으면 해당 노드 기준으로 조회
- `node-id`가 없으면 파일 전체 구조를 조회

### 2. 깊이(Depth) 조절

트리 조회 깊이를 1~4단계 또는 전체로 선택 가능합니다.

| 깊이 | 용도 |
|------|------|
| 1 | 페이지 목록만 확인 |
| 2 | 페이지 + 최상위 프레임 (기본값) |
| 3~4 | 컴포넌트 내부 구조까지 확인 |
| 전체 | 모든 하위 노드 포함 (대형 파일은 느릴 수 있음) |

### 3. 노드 타입별 컬러 구분

| 타입 | 색상 | 설명 |
|------|------|------|
| CANVAS | 보라 | Figma 페이지 |
| FRAME | 파랑 | 프레임/아트보드 |
| COMPONENT | 초록 | 재사용 컴포넌트 |
| COMPONENT_SET | 틸 | 컴포넌트 세트 (Variants) |
| INSTANCE | 시안 | 컴포넌트 인스턴스 |
| GROUP | 노랑 | 그룹 |
| TEXT | 주황 | 텍스트 레이어 |
| RECTANGLE | 회색 | 사각형 |
| VECTOR | 핑크 | 벡터 도형 |
| SECTION | 인디고 | 섹션 |

### 4. 노드 선택 및 미리보기

트리에서 노드를 클릭하면 우측 패널에 다음 정보가 표시됩니다:

- **노드 이름 및 타입**
- **PNG 미리보기 이미지** (Figma API를 통해 렌더링)
- **하위 요소 개수**

### 5. 복사 기능 (3종)

노드 선택 후 버튼 클릭으로 클립보드에 복사할 수 있습니다.

| 버튼 | 복사 내용 | 사용처 |
|------|----------|--------|
| **Node ID 복사** | `123-456` | Figma URL 조합, MCP 명령어 작성 |
| **MCP 명령어** | `get_figma_data(fileKey="...", nodeId="...")` | Claude Code에 붙여넣어 바로 조회 |
| **Figma URL** | `https://www.figma.com/design/fileKey/?node-id=...` | Figma에서 해당 노드로 이동 |

트리의 각 노드 오른쪽에 표시되는 `node-id` 코드를 클릭해도 Node ID가 복사됩니다.

## 파일 구조

```
src/
├── app/
│   ├── api/
│   │   └── figma/
│   │       ├── route.ts          # Figma 파일 데이터 조회 API
│   │       └── images/
│   │           └── route.ts      # Figma 노드 이미지 조회 API
│   └── figma-explorer/
│       └── page.tsx              # Explorer UI (Mantine)
```

## API 엔드포인트

### GET /api/figma

Figma 파일 또는 특정 노드의 데이터를 조회합니다.

| 파라미터 | 필수 | 설명 |
|---------|------|------|
| `fileKey` | O | Figma 파일 키 |
| `nodeId` | X | 특정 노드 ID (없으면 파일 전체 조회) |
| `depth` | X | 트리 조회 깊이 제한 |

### GET /api/figma/images

특정 노드의 PNG 이미지를 조회합니다.

| 파라미터 | 필수 | 설명 |
|---------|------|------|
| `fileKey` | O | Figma 파일 키 |
| `nodeId` | O | 이미지를 생성할 노드 ID |

## 환경 변수

`.env.local` 파일에 Figma API 키가 설정되어 있어야 합니다.

```env
FIGMA_API_KEY=figd_xxxxx
```

## 기술 스택

- **Next.js 16** (App Router)
- **Mantine UI** (컴포넌트 라이브러리)
- **Figma REST API** (파일/이미지 조회)
- **TypeScript**

## Claude Code 연동 워크플로우

1. Figma Explorer에서 구현할 컴포넌트를 찾고 선택
2. **MCP 명령어** 버튼으로 명령어 복사
3. Claude Code에 붙여넣어 디자인 데이터 조회
4. 또는 **Figma URL** 버튼으로 URL 복사 후 Claude Code에 전달하여 구현 요청
