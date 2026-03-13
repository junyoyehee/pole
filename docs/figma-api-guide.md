# Figma REST API 활용 가이드

프로젝트에서 Figma REST API를 사용하면서 알게 된 기능, 한계, 주의사항을 정리한 문서입니다.

---

## 1. 사용 중인 API 엔드포인트

### GET `/v1/files/{fileKey}/nodes`

노드 구조(트리)를 가져옵니다.

```
GET https://api.figma.com/v1/files/{fileKey}/nodes?ids={nodeId}&depth={n}
Headers: X-Figma-Token: {API_KEY}
```

| 파라미터 | 설명 |
|---------|------|
| `ids` | 조회할 노드 ID (콜론 구분, 예: `8:3`). 여러 개는 쉼표로 구분 |
| `depth` | 트리 깊이 제한. 생략하면 전체 하위 노드 반환 |

**응답 구조:**
```json
{
  "nodes": {
    "8:3": {
      "document": {
        "id": "8:3",
        "name": "Frame 1",
        "type": "FRAME",
        "visible": true,
        "absoluteBoundingBox": { "x": 0, "y": 0, "width": 400, "height": 600 },
        "children": [...]
      }
    }
  }
}
```

**주의사항:**
- `depth`를 너무 크게 설정하면 응답이 매우 커질 수 있음 (depth=10 정도가 적당)
- `visible` 속성은 생략될 수 있으며, 생략 시 `true`로 간주
- `visible: false`인 노드도 구조에는 포함됨 (이미지 렌더링과는 별개)

---

### GET `/v1/images/{fileKey}`

노드를 PNG/SVG/JPG/PDF로 렌더링한 이미지 URL을 반환합니다.

```
GET https://api.figma.com/v1/images/{fileKey}?ids={nodeIds}&format=png&scale=2
Headers: X-Figma-Token: {API_KEY}
```

| 파라미터 | 설명 |
|---------|------|
| `ids` | 렌더링할 노드 ID (쉼표 구분, 한 번에 최대 50개 권장) |
| `format` | `png`, `svg`, `jpg`, `pdf` |
| `scale` | 배율 (1~4). `scale=2`이면 2배 해상도 |

**응답 구조:**
```json
{
  "images": {
    "8:3": "https://figma-alpha-api.s3.us-west-2.amazonaws.com/images/...",
    "8:7": null
  }
}
```

**주의사항:**
- 반환된 이미지 URL은 **임시 URL** (유효기간 약 14일)
- 한 번에 너무 많은 노드를 요청하면 타임아웃 발생 → **50개 단위 배치 처리** 권장

---

## 2. 발견한 한계 및 문제점

### 2.1. `visible: false` 노드는 렌더링 불가

**문제:** Figma에서 숨겨진 레이어(`visible: false`)의 이미지를 `/v1/images`로 요청하면 `null`이 반환됩니다.

**영향:**
- 숨겨진 레이어의 이미지를 다운로드할 수 없음
- "숨겨진 레이어 적용" 같은 기능 구현 시, 이미지가 없어서 시각적 미리보기 불가

**대응:**
- 트리 구조에서 `visible: false`를 표시만 하고, 이미지가 없음을 UI에 안내
- Figma Plugin API를 사용하면 visibility를 임시 변경 후 렌더링 가능하지만, REST API로는 불가

---

### 2.2. 개별 레이어 합성 ≠ 전체 프레임 렌더

**문제:** 각 자식 노드를 개별 렌더링하여 CSS `position: absolute`로 겹치면 전체 프레임 렌더와 다른 결과가 나옵니다.

**원인:**
- Figma API는 각 노드를 **독립적으로** 렌더링 (해당 노드만 단독 렌더)
- 블렌드 모드 (Multiply, Overlay 등) 손실
- 클리핑 마스크 효과 손실
- 부모-자식 간 합성 효과 손실

**시각적 결과:**
```
fullRender(프레임) ≠ layer1.png + layer2.png + layer3.png (겹치기)
```

**대응 전략:**
| 방법 | 정확도 | 속도 | 설명 |
|-----|--------|------|------|
| 전체 렌더만 사용 | 완벽 | 빠름 | 합성 없이 전체 프레임 이미지만 표시 |
| depth-0 합성 | 높음 | 보통 | 최상위 자식만 합성 (내부 블렌딩 보존) |
| 모든 depth 합성 | 낮음 | 느림 | 부모/자식 이미지 중복 → 깨짐 |

**권장:** depth-0 (직계 자식) 단위로만 합성. 하위 레이어 토글은 미리보기 용도로만 사용.

---

### 2.3. 하위 레이어 선택적 제외 불가

**문제:** "프레임 전체를 렌더링하되 특정 자식만 제외" 하는 기능이 REST API에 없습니다.

**영향:**
- 레이어 토글로 특정 하위 레이어를 숨긴 상태의 프레임을 렌더링할 수 없음
- `/v1/images`는 항상 해당 노드의 모든 자식을 포함하여 렌더링

**대응:**
- depth-0 단위로만 on/off 가능 (각 depth-0 그룹은 완전한 렌더 단위)
- 더 세밀한 제어가 필요하면 Figma Plugin API 필요

---

### 2.4. 이미지 URL의 CORS 제약

**문제:** Figma API가 반환하는 이미지 URL(`figma-alpha-api.s3.us-west-2.amazonaws.com`)은 CORS 헤더가 설정되어 있지만, `file://` 프로토콜에서는 접근이 제한될 수 있습니다.

**영향:**
- 로컬 HTML 파일에서 Canvas API로 Figma 이미지를 그릴 때 CORS 에러 가능
- `img.crossOrigin = 'anonymous'` 설정 필요

**대응:**
- 이미지를 서버에서 다운로드하여 로컬 파일로 저장 후 참조
- Canvas 합성 시 서버 프록시를 통해 이미지 전달

---

## 3. API 키 설정

```env
# .env.local
FIGMA_API_KEY=figd_xxxxxxxxxxxxx
```

- Figma 계정 → Settings → Personal Access Tokens에서 생성
- `.env.local`에 저장 (Next.js 서버 전용, 클라이언트에 노출되지 않음)
- `NODE_TLS_REJECT_UNAUTHORIZED=0` 설정 시 인증서 검증 비활성화 경고 발생 (개발 환경 전용)

---

## 4. Rate Limiting

Figma API는 rate limit이 있습니다:
- 분당 약 30~60 요청 (정확한 수치는 비공개)
- 이미지 렌더링 요청은 더 엄격할 수 있음
- 429 응답 시 재시도 로직 필요

**대응:**
- 이미지 렌더링은 50개씩 배치 처리
- 대량 내보내기 시 노드를 하나씩 순차 처리 (타임아웃 방지)

---

## 5. 노드 ID 형식

| 컨텍스트 | 형식 | 예시 |
|---------|------|------|
| Figma 내부 / API 응답 | 콜론 구분 | `8:3` |
| URL 파라미터 | 하이픈 구분 | `8-3` |

```typescript
// 변환
const figmaNodeId = urlNodeId.replace("-", ":"); // URL → API
const urlNodeId = figmaNodeId.replace(":", "-");  // API → URL
```

**주의:** `replace`는 첫 번째 매치만 변환합니다. 노드 ID에 콜론이 하나만 있으므로 `replace`로 충분하지만, 안전을 위해 `replaceAll`도 고려.

---

## 6. `absoluteBoundingBox` 활용

각 노드의 절대 좌표와 크기를 제공합니다.

```json
{
  "absoluteBoundingBox": {
    "x": 120,
    "y": 340,
    "width": 200,
    "height": 150
  }
}
```

**프레임 기준 상대 좌표 계산:**
```typescript
const relativeX = node.absoluteBoundingBox.x - frame.absoluteBoundingBox.x;
const relativeY = node.absoluteBoundingBox.y - frame.absoluteBoundingBox.y;
```

**주의:**
- `absoluteBoundingBox`는 **캔버스 전체 기준** 절대 좌표
- 프레임 내 배치를 위해서는 반드시 프레임 좌표를 빼야 함
- 너무 작은 노드(`width < 2 || height < 2`)는 렌더링에서 제외 권장

---

## 7. 프로젝트 내 구현 현황

| 엔드포인트 | 파일 | 용도 |
|-----------|------|------|
| `GET /api/figma` | `src/app/api/figma/route.ts` | 노드 구조 프록시 |
| `GET /api/figma/images` | `src/app/api/figma/images/route.ts` | 이미지 URL 프록시 |
| `POST /api/figma/export-html` | `src/app/api/figma/export-html/route.ts` | 기본 HTML 내보내기 |
| `POST /api/figma/export-html-ai` | `src/app/api/figma/export-html-ai/route.ts` | 인터랙티브 HTML 내보내기 (레이어 뷰어) |
| `POST /api/figma/render-composite` | `src/app/api/figma/render-composite/route.ts` | 선택 노드 재렌더링 (합성용) |

---

## 8. 트러블슈팅 이력

### Claude API 모델 ID 404
- `claude-sonnet-4-6-20250514` → 404
- `claude-sonnet-4-5-20241022` → 404
- **정상 동작:** `claude-sonnet-4-20250514`, `claude-haiku-4-5-20251001`

### 대량 내보내기 타임아웃
- 4개 프레임을 한 POST에 요청 → 3분 이상 소요
- **해결:** 프레임별로 개별 POST 요청 + 진행률 표시

### Next.js dev 서버 포트 충돌
- 이전 서버가 종료되지 않으면 `.next/dev/lock` 파일 에러 발생
- **해결:** `taskkill //F //IM node.exe` 후 재시작

### TextInput import 누락
- Mantine `TextInput` → `Autocomplete`로 교체 시 import 제거했으나, 다른 곳(저장 모달)에서 여전히 사용 중
- **해결:** `TextInput`과 `Autocomplete` 모두 import 유지
