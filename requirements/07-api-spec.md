# API 명세

## 기본 규칙

### 베이스 경로
```
/api/v1/*
```

### 응답 형식
```json
// 성공
{ "success": true, "data": { ... } }

// 에러
{ "success": false, "error": { "code": "ERROR_CODE", "message": "..." } }

// 페이지네이션
{ "success": true, "data": { "items": [...], "pagination": { "page": 1, "limit": 20, "total": 100 } } }
```

---

## 인증 API

| 메서드 | 경로 | 설명 | 권한 |
|--------|------|------|------|
| POST | `/auth/login` | 로그인 | - |
| POST | `/auth/logout` | 로그아웃 | ALL |
| POST | `/auth/refresh` | 토큰 갱신 | ALL |
| GET | `/auth/me` | 내 정보 | ALL |
| POST | `/auth/invite` | 팀원 초대 | ADMIN |
| POST | `/auth/register/:token` | 초대 가입 | - |

## 사용자 API

| 메서드 | 경로 | 설명 | 권한 |
|--------|------|------|------|
| GET | `/users` | 팀원 목록 | ALL |
| GET | `/users/:id` | 팀원 상세 | ALL |
| PATCH | `/users/:id` | 팀원 정보 수정 | ADMIN / 본인 |
| PATCH | `/users/:id/status` | 근무 상태 변경 | 본인 |
| PATCH | `/users/:id/role` | 역할 변경 | ADMIN |
| GET | `/profile` | 내 프로필 | ALL |
| PATCH | `/profile` | 프로필 수정 | ALL |
| PATCH | `/profile/password` | 비밀번호 변경 | ALL |

## 프로젝트 API

| 메서드 | 경로 | 설명 | 권한 |
|--------|------|------|------|
| GET | `/projects` | 프로젝트 목록 | ALL |
| POST | `/projects` | 프로젝트 생성 | LEAD+ |
| GET | `/projects/:id` | 프로젝트 상세 | ALL |
| PATCH | `/projects/:id` | 프로젝트 수정 | PM / LEAD+ |
| DELETE | `/projects/:id` | 프로젝트 삭제 | ADMIN |
| POST | `/projects/:id/members` | 멤버 추가 | PM / LEAD+ |
| DELETE | `/projects/:id/members/:userId` | 멤버 제거 | PM / LEAD+ |

## 업무 API

| 메서드 | 경로 | 설명 | 권한 |
|--------|------|------|------|
| GET | `/projects/:id/tasks` | 업무 목록 | ALL |
| POST | `/projects/:id/tasks` | 업무 생성 | ALL |
| GET | `/tasks/:id` | 업무 상세 | ALL |
| PATCH | `/tasks/:id` | 업무 수정 | 담당자 / LEAD+ |
| DELETE | `/tasks/:id` | 업무 삭제 | 생성자 / LEAD+ |
| PATCH | `/tasks/:id/status` | 상태 변경 | 담당자 / LEAD+ |
| PATCH | `/tasks/:id/order` | 순서 변경 (칸반) | ALL |
| GET | `/my/tasks` | 내 업무 | ALL |

## Figma 프로젝트 API

| 메서드 | 경로 | 설명 | 권한 |
|--------|------|------|------|
| GET | `/figma-projects` | Figma 프로젝트 목록 | ALL |
| POST | `/figma-projects` | 프로젝트 등록 | ALL |
| GET | `/figma-projects/:id` | 프로젝트 상세 | ALL |
| PATCH | `/figma-projects/:id` | 프로젝트 수정 | 담당자 / LEAD+ |
| DELETE | `/figma-projects/:id` | 프로젝트 삭제 | ADMIN |

## 디자인 리뷰 API

| 메서드 | 경로 | 설명 | 권한 |
|--------|------|------|------|
| GET | `/figma-projects/:id/reviews` | 리뷰 목록 | ALL |
| POST | `/figma-projects/:id/reviews` | 리뷰 생성 | ALL |
| GET | `/reviews/:id` | 리뷰 상세 | ALL |
| PATCH | `/reviews/:id` | 리뷰 수정 | 작성자 |
| PATCH | `/reviews/:id/status` | 리뷰 상태 변경 | 작성자 / 리뷰어 |
| POST | `/reviews/:id/feedbacks` | 피드백 작성 | ALL |
| GET | `/reviews/:id/feedbacks` | 피드백 목록 | ALL |

## 핸드오프 API

| 메서드 | 경로 | 설명 | 권한 |
|--------|------|------|------|
| GET | `/figma-projects/:id/handoffs` | 핸드오프 목록 | ALL |
| POST | `/figma-projects/:id/handoffs` | 핸드오프 등록 | ALL |
| GET | `/handoffs/:id` | 핸드오프 상세 | ALL |
| PATCH | `/handoffs/:id` | 핸드오프 수정 | 담당자 |
| PATCH | `/handoffs/:id/status` | 상태 변경 | 담당자 |

## 게시판 API

| 메서드 | 경로 | 설명 | 권한 |
|--------|------|------|------|
| GET | `/posts` | 게시글 목록 (board_type 필터) | ALL |
| POST | `/posts` | 게시글 작성 | ALL (공지: LEAD+) |
| GET | `/posts/:id` | 게시글 상세 | ALL |
| PATCH | `/posts/:id` | 게시글 수정 | 작성자 / ADMIN |
| DELETE | `/posts/:id` | 게시글 삭제 | 작성자 / ADMIN |
| POST | `/posts/:id/like` | 좋아요 | ALL |

## 댓글 API (공통)

| 메서드 | 경로 | 설명 | 권한 |
|--------|------|------|------|
| GET | `/comments` | 댓글 목록 (target_type + target_id) | ALL |
| POST | `/comments` | 댓글 작성 | ALL |
| PATCH | `/comments/:id` | 댓글 수정 | 작성자 |
| DELETE | `/comments/:id` | 댓글 삭제 | 작성자 / ADMIN |

## 회의록 API

| 메서드 | 경로 | 설명 | 권한 |
|--------|------|------|------|
| GET | `/meetings` | 회의록 목록 | ALL |
| POST | `/meetings` | 회의록 작성 | ALL |
| GET | `/meetings/:id` | 회의록 상세 | ALL |
| PATCH | `/meetings/:id` | 회의록 수정 | 작성자 |
| POST | `/meetings/:id/actions` | 액션 아이템 추가 | ALL |
| PATCH | `/actions/:id` | 액션 아이템 수정 | 담당자 |
| POST | `/actions/:id/to-task` | 업무로 변환 | 담당자 / LEAD+ |

## 위키 API

| 메서드 | 경로 | 설명 | 권한 |
|--------|------|------|------|
| GET | `/wiki` | 문서 트리 | ALL |
| POST | `/wiki` | 문서 생성 | ALL |
| GET | `/wiki/:id` | 문서 조회 | ALL |
| PATCH | `/wiki/:id` | 문서 수정 | ALL |
| DELETE | `/wiki/:id` | 문서 삭제 | 작성자 / ADMIN |
| GET | `/wiki/:id/history` | 수정 이력 | ALL |

## 스니펫 API

| 메서드 | 경로 | 설명 | 권한 |
|--------|------|------|------|
| GET | `/snippets` | 스니펫 목록 | ALL |
| POST | `/snippets` | 스니펫 등록 | ALL |
| GET | `/snippets/:id` | 스니펫 상세 | ALL |
| PATCH | `/snippets/:id` | 스니펫 수정 | 작성자 |
| DELETE | `/snippets/:id` | 스니펫 삭제 | 작성자 / ADMIN |
| POST | `/snippets/:id/like` | 좋아요 | ALL |

## 배포 API

| 메서드 | 경로 | 설명 | 권한 |
|--------|------|------|------|
| GET | `/deploys` | 배포 목록 | ALL |
| POST | `/deploys` | 배포 기록 등록 | LEAD+ |
| GET | `/deploys/status` | 환경별 최신 배포 현황 | ALL |

## 알림 API

| 메서드 | 경로 | 설명 | 권한 |
|--------|------|------|------|
| GET | `/notifications` | 알림 목록 | ALL |
| PATCH | `/notifications/:id/read` | 읽음 처리 | ALL |
| PATCH | `/notifications/read-all` | 전체 읽음 | ALL |
| GET | `/notifications/settings` | 알림 설정 조회 | ALL |
| PATCH | `/notifications/settings` | 알림 설정 변경 | ALL |

## Figma 프록시 API

| 메서드 | 경로 | 설명 | 권한 |
|--------|------|------|------|
| GET | `/figma` | Figma 파일 데이터 조회 | ALL |
| GET | `/figma/images` | Figma 노드 이미지 조회 | ALL |
