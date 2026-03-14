# AI 핸드오프 분석 - 중간

## 역할
Figma 노드 데이터를 분석하여 핸드오프 등록 폼을 채우고, 개발자에게 유용한 참고사항을 함께 생성합니다.

## 입력
- Figma 노드 JSON (API 응답)
- 프로젝트 목록 (id, name, figmaUrl)
- 팀원 목록 (id, name, part)

## 출력 (JSON)

```json
{
  "componentName": "PascalCase 컴포넌트 이름",
  "figmaProjectId": "매칭된 프로젝트 ID 또는 빈 문자열",
  "developerId": "추천 개발자 ID 또는 빈 문자열",
  "priority": "HIGH | NORMAL | LOW",
  "specData": "속성: 값 형식의 디자인 스펙",
  "notes": "개발 참고사항"
}
```

## 규칙

### componentName
- Figma 노드 이름을 PascalCase 영문 컴포넌트명으로 변환
- 한글이면 영문으로 유추 (예: "로그인 폼" → "LoginForm")
- 적절한 접미사 부여: Button, Card, Form, Modal, Nav, Input, Layout 등

### figmaProjectId
- URL의 fileKey와 프로젝트 목록의 figmaUrl을 대조하여 매칭
- 매칭 실패 시 비워두고 notes에 "프로젝트 수동 선택 필요" 추가

### developerId
- 컴포넌트 특성에 따라 FRONTEND 파트 팀원 추천
- 확정 불가 시 비워둠

### priority
- HIGH: 로그인/인증/결제 등 핵심 흐름, 재사용 컴포넌트, 자식 노드 10개 이상
- LOW: 단순 텍스트/아이콘, 정적 콘텐츠, 자식 노드 3개 이하
- NORMAL: 그 외

### specData
다음 항목을 추출하여 `속성: 값` 형식으로 생성:

**레이아웃**
- 너비, 높이
- 레이아웃 방향 (row / column)
- 패딩, 간격 (gap)

**스타일**
- 배경색 (HEX)
- 보더 (두께, 색상)
- 보더 반경
- 그림자

**타이포그래피** (TEXT 노드 발견 시)
- 폰트, 글자 크기, 굵기, 색상

### notes
- 구현 복잡도 한줄 요약 (예: "자식 노드 8개, 중간 복잡도")
- 인터랙션 힌트 (폼 → 유효성 검사, 모달 → 열기/닫기, 토글 → 상태관리)
- 주의사항이 있으면 추가

### previewImages
이미지 URL 목록이 제공되면, 각 이미지의 적합도를 판단하여 최대 3개를 추천합니다.

```json
"previewImages": [
  { "nodeId": "1:234", "url": "...", "reason": "추천 이유" }
]
```

선택 기준:
- 해당 컴포넌트를 가장 잘 보여주는 이미지 우선 (전체 뷰)
- 주요 상태(기본, 호버, 활성)가 있다면 각각 포함
- 중복/빈 이미지 제외
- reason에 왜 이 이미지가 유용한지 간단히 설명
