# 데이터베이스 스키마

## 엔티티 관계 개요

```
Users ──┬── Projects (N:M, 참여)
        ├── Tasks (1:N, 담당)
        ├── FigmaProjects (1:N, 담당)
        ├── DesignReviews (1:N, 작성/리뷰)
        ├── Handoffs (1:N, 담당)
        ├── Posts (1:N, 작성)
        ├── MeetingNotes (N:M, 참석)
        ├── WikiDocs (1:N, 작성/수정)
        ├── Snippets (1:N, 작성)
        ├── Deploys (1:N, 배포자)
        └── Notifications (1:N, 수신)

Projects ──┬── Tasks (1:N)
           └── FigmaProjects (1:N, 연결)

FigmaProjects ──┬── DesignReviews (1:N)
                └── Handoffs (1:N)
```

---

## 엔티티 정의

### Users
| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | UUID | PK |
| email | VARCHAR(255) | 이메일 (UNIQUE) |
| password_hash | VARCHAR(255) | 비밀번호 해시 |
| name | VARCHAR(100) | 이름 |
| avatar_url | VARCHAR(500) | 프로필 이미지 |
| role | ENUM | MEMBER, LEAD, ADMIN |
| part | ENUM | FRONTEND, BACKEND, DESIGN, PM, QA |
| position | VARCHAR(100) | 직책 |
| status | ENUM | WORKING, IN_MEETING, AWAY, VACATION, OFFLINE |
| slack_handle | VARCHAR(100) | Slack 핸들 |
| bio | VARCHAR(300) | 한줄 소개 |
| created_at | TIMESTAMP | 가입일 |

### Projects
| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | UUID | PK |
| name | VARCHAR(200) | 프로젝트 이름 |
| description | TEXT | 설명 |
| pm_id | UUID | FK → Users |
| status | ENUM | PREPARING, IN_PROGRESS, ON_HOLD, DONE |
| priority | ENUM | URGENT, HIGH, NORMAL, LOW |
| start_date | DATE | 시작일 |
| end_date | DATE | 마감일 |
| created_at | TIMESTAMP | 생성일 |

### ProjectMembers
| 컬럼 | 타입 | 설명 |
|------|------|------|
| project_id | UUID | FK → Projects |
| user_id | UUID | FK → Users |
| role | VARCHAR(50) | 프로젝트 내 역할 |

### Tasks
| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | UUID | PK |
| project_id | UUID | FK → Projects |
| title | VARCHAR(300) | 제목 |
| description | TEXT | 설명 (마크다운) |
| status | ENUM | TODO, IN_PROGRESS, IN_REVIEW, DONE |
| priority | ENUM | URGENT, HIGH, NORMAL, LOW |
| label | VARCHAR(50) | Frontend, Backend, Design, Bug 등 |
| due_date | DATE | 마감일 |
| figma_url | VARCHAR(500) | 관련 Figma 링크 |
| sort_order | INTEGER | 칸반 내 순서 |
| created_by | UUID | FK → Users |
| created_at | TIMESTAMP | 생성일 |

### TaskAssignees
| 컬럼 | 타입 | 설명 |
|------|------|------|
| task_id | UUID | FK → Tasks |
| user_id | UUID | FK → Users |

### FigmaProjects
| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | UUID | PK |
| name | VARCHAR(200) | 프로젝트 이름 |
| figma_url | VARCHAR(500) | Figma 파일 URL |
| file_key | VARCHAR(50) | Figma fileKey |
| description | TEXT | 설명 |
| status | ENUM | DESIGNING, IN_REVIEW, IN_DEV, DONE |
| project_id | UUID | FK → Projects (nullable) |
| designer_id | UUID | FK → Users |
| thumbnail_url | VARCHAR(500) | 썸네일 이미지 |
| created_at | TIMESTAMP | 생성일 |

### DesignReviews
| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | UUID | PK |
| figma_project_id | UUID | FK → FigmaProjects |
| title | VARCHAR(300) | 리뷰 제목 |
| description | TEXT | 설명 |
| figma_node_id | VARCHAR(100) | 리뷰 대상 node-id |
| status | ENUM | OPEN, IN_REVISION, APPROVED |
| author_id | UUID | FK → Users |
| due_date | DATE | 마감일 |
| created_at | TIMESTAMP | 생성일 |

### ReviewFeedbacks
| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | UUID | PK |
| review_id | UUID | FK → DesignReviews |
| author_id | UUID | FK → Users |
| content | TEXT | 피드백 내용 |
| category | ENUM | UI, UX, A11Y, TECHNICAL, OTHER |
| priority | ENUM | HIGH, NORMAL, LOW |
| type | ENUM | COMMENT, CHANGE_REQUEST, APPROVAL |
| created_at | TIMESTAMP | 작성일 |

### Handoffs
| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | UUID | PK |
| figma_project_id | UUID | FK → FigmaProjects |
| component_name | VARCHAR(200) | 컴포넌트 이름 |
| figma_node_id | VARCHAR(100) | Figma node-id |
| figma_url | VARCHAR(500) | Figma URL |
| developer_id | UUID | FK → Users |
| status | ENUM | PENDING, IN_PROGRESS, IMPLEMENTED, VERIFIED |
| priority | ENUM | HIGH, NORMAL, LOW |
| spec_data | JSON | 자동 추출된 디자인 스펙 |
| notes | TEXT | 참고사항 |
| created_at | TIMESTAMP | 생성일 |

### Posts (공지사항 + 게시판)
| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | UUID | PK |
| board_type | ENUM | NOTICE, FREE, TECH, QUESTION, SUGGESTION |
| title | VARCHAR(300) | 제목 |
| content | TEXT | 본문 (마크다운) |
| author_id | UUID | FK → Users |
| is_pinned | BOOLEAN | 고정 여부 |
| like_count | INTEGER | 좋아요 수 |
| view_count | INTEGER | 조회수 |
| created_at | TIMESTAMP | 작성일 |

### Comments
| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | UUID | PK |
| target_type | ENUM | POST, TASK, HANDOFF |
| target_id | UUID | 대상 ID |
| author_id | UUID | FK → Users |
| parent_id | UUID | FK → Comments (대댓글) |
| content | TEXT | 내용 |
| created_at | TIMESTAMP | 작성일 |

### MeetingNotes
| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | UUID | PK |
| title | VARCHAR(300) | 회의 제목 |
| meeting_type | ENUM | REGULAR, SPRINT, PLANNING, RETRO, OTHER |
| meeting_date | TIMESTAMP | 회의 일시 |
| content | TEXT | 회의 내용 (마크다운) |
| decisions | TEXT | 결정 사항 |
| author_id | UUID | FK → Users |
| figma_url | VARCHAR(500) | 관련 Figma (선택) |
| created_at | TIMESTAMP | 작성일 |

### ActionItems
| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | UUID | PK |
| meeting_id | UUID | FK → MeetingNotes |
| title | VARCHAR(300) | 항목 제목 |
| assignee_id | UUID | FK → Users |
| due_date | DATE | 기한 |
| is_done | BOOLEAN | 완료 여부 |
| task_id | UUID | FK → Tasks (변환 시) |

### WikiDocs
| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | UUID | PK |
| title | VARCHAR(300) | 문서 제목 |
| content | TEXT | 내용 (마크다운) |
| category | VARCHAR(100) | 카테고리 |
| parent_id | UUID | FK → WikiDocs (트리 구조) |
| author_id | UUID | FK → Users |
| last_editor_id | UUID | FK → Users |
| sort_order | INTEGER | 정렬 순서 |
| created_at | TIMESTAMP | 생성일 |
| updated_at | TIMESTAMP | 수정일 |

### Snippets
| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | UUID | PK |
| title | VARCHAR(200) | 제목 |
| description | TEXT | 설명 |
| language | VARCHAR(50) | 언어 |
| code | TEXT | 코드 내용 |
| tags | VARCHAR(300) | 태그 (쉼표 구분) |
| figma_url | VARCHAR(500) | 관련 Figma (선택) |
| author_id | UUID | FK → Users |
| like_count | INTEGER | 좋아요 수 |
| created_at | TIMESTAMP | 생성일 |

### Deploys
| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | UUID | PK |
| project_id | UUID | FK → Projects |
| environment | ENUM | DEV, STAGING, PRODUCTION |
| version | VARCHAR(50) | 버전 |
| status | ENUM | SUCCESS, FAILED, ROLLBACK |
| deployer_id | UUID | FK → Users |
| changes | TEXT | 변경사항 |
| deployed_at | TIMESTAMP | 배포 시간 |

### Notifications
| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | UUID | PK |
| user_id | UUID | FK → Users (수신자) |
| type | VARCHAR(50) | 알림 유형 |
| title | VARCHAR(300) | 알림 제목 |
| message | VARCHAR(500) | 알림 내용 |
| link | VARCHAR(500) | 클릭 시 이동 경로 |
| is_read | BOOLEAN | 읽음 여부 |
| created_at | TIMESTAMP | 생성일 |
