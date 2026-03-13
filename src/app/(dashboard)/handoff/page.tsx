"use client";

import { useState, useMemo } from "react";
import Header from "@/components/Header";
import {
  IconPlus,
  IconSearch,
  IconList,
  IconLayoutKanban,
  IconExternalLink,
  IconArrowRight,
} from "@tabler/icons-react";
import styles from "./page.module.css";

type Status = "대기" | "진행중" | "구현완료" | "검수완료";
type Priority = "높음" | "보통" | "낮음";

interface HandoffItem {
  id: number;
  name: string;
  icon: string;
  designer: string;
  developer: string;
  status: Status;
  priority: Priority;
  figmaUrl: string;
  specs: { label: string; value: string }[];
  notes: string[];
}

const STATUSES: Status[] = ["대기", "진행중", "구현완료", "검수완료"];

const STATUS_CLASS: Record<Status, string> = {
  "대기": styles.statusPending,
  "진행중": styles.statusProgress,
  "구현완료": styles.statusImplemented,
  "검수완료": styles.statusVerified,
};

const STATUS_DOT_COLOR: Record<Status, string> = {
  "대기": "var(--gray-badge)",
  "진행중": "var(--blue)",
  "구현완료": "var(--orange)",
  "검수완료": "var(--green)",
};

const PRIORITY_DOT: Record<Priority, string> = {
  "높음": styles.priorityHigh,
  "보통": styles.priorityNormal,
  "낮음": styles.priorityLow,
};

const PRIORITY_BADGE: Record<Priority, string> = {
  "높음": styles.priorityBadgeHigh,
  "보통": styles.priorityBadgeNormal,
  "낮음": styles.priorityBadgeLow,
};

const HANDOFF_DATA: HandoffItem[] = [
  {
    id: 1,
    name: "LoginForm",
    icon: "🔐",
    designer: "김디자",
    developer: "김민수",
    status: "진행중",
    priority: "높음",
    figmaUrl: "https://figma.com/file/login-form",
    specs: [
      { label: "너비", value: "400px" },
      { label: "패딩", value: "32px" },
      { label: "배경", value: "#FFFFFF" },
      { label: "보더", value: "1px solid #E9ECEF, radius 12px" },
      { label: "그림자", value: "0 4px 24px rgba(0,0,0,0.06)" },
    ],
    notes: [
      "비밀번호 필드에 눈 아이콘(표시/숨기기) 토글 추가 필요",
      "소셜 로그인 버튼은 Google, GitHub 2가지",
      "에러 메시지 WCAG AA 기준 대비율 확인 완료",
      "로딩 상태 시 버튼에 스피너 표시",
    ],
  },
  {
    id: 2,
    name: "DashboardWidget",
    icon: "📊",
    designer: "윤서아",
    developer: "일달러",
    status: "진행중",
    priority: "높음",
    figmaUrl: "https://figma.com/file/dashboard-widget",
    specs: [
      { label: "너비", value: "100%" },
      { label: "최소 높이", value: "280px" },
      { label: "패딩", value: "24px" },
      { label: "보더", value: "1px solid var(--border-subtle)" },
    ],
    notes: [
      "차트 라이브러리는 Recharts 사용",
      "반응형 브레이크포인트: 768px, 1024px",
      "데이터 로딩 시 스켈레톤 UI 적용",
    ],
  },
  {
    id: 3,
    name: "UserProfileCard",
    icon: "👤",
    designer: "김디자",
    developer: "김민수",
    status: "구현완료",
    priority: "보통",
    figmaUrl: "https://figma.com/file/user-profile",
    specs: [
      { label: "너비", value: "320px" },
      { label: "아바타 크기", value: "64px" },
      { label: "보더 반경", value: "12px" },
    ],
    notes: [
      "아바타 이미지 lazy loading 적용",
      "온라인 상태 인디케이터 포함",
    ],
  },
  {
    id: 4,
    name: "NotificationPanel",
    icon: "🔔",
    designer: "윤서아",
    developer: "이수진",
    status: "대기",
    priority: "보통",
    figmaUrl: "https://figma.com/file/notification",
    specs: [
      { label: "너비", value: "380px" },
      { label: "최대 높이", value: "480px" },
      { label: "아이템 높이", value: "64px" },
    ],
    notes: [
      "읽음/안읽음 상태 시각 구분",
      "무한 스크롤 적용",
      "알림 타입별 아이콘 구분 필요",
    ],
  },
  {
    id: 5,
    name: "TaskCard",
    icon: "📋",
    designer: "김디자",
    developer: "일달러",
    status: "검수완료",
    priority: "보통",
    figmaUrl: "https://figma.com/file/task-card",
    specs: [
      { label: "너비", value: "100%" },
      { label: "패딩", value: "16px" },
      { label: "보더 반경", value: "8px" },
    ],
    notes: [
      "드래그 앤 드롭 지원",
      "우선순위 컬러 코딩 적용",
    ],
  },
  {
    id: 6,
    name: "SideNavigation",
    icon: "🧭",
    designer: "김디자",
    developer: "김민수",
    status: "검수완료",
    priority: "낮음",
    figmaUrl: "https://figma.com/file/side-nav",
    specs: [
      { label: "너비", value: "240px (확장), 64px (축소)" },
      { label: "배경", value: "var(--bg-secondary)" },
    ],
    notes: [
      "축소/확장 애니메이션 적용",
      "활성 메뉴 하이라이트",
      "키보드 네비게이션 지원",
    ],
  },
  {
    id: 7,
    name: "DesignReviewPanel",
    icon: "🎨",
    designer: "윤서아",
    developer: "미정",
    status: "대기",
    priority: "높음",
    figmaUrl: "https://figma.com/file/design-review",
    specs: [
      { label: "너비", value: "100%" },
      { label: "최소 높이", value: "600px" },
    ],
    notes: [
      "코멘트 스레드 기능 포함",
      "이미지 비교 뷰어 (Before/After)",
      "승인/반려 워크플로우 구현 필요",
    ],
  },
  {
    id: 8,
    name: "MarkdownEditor",
    icon: "📝",
    designer: "김디자",
    developer: "미정",
    status: "대기",
    priority: "낮음",
    figmaUrl: "https://figma.com/file/markdown-editor",
    specs: [
      { label: "너비", value: "100%" },
      { label: "최소 높이", value: "400px" },
      { label: "툴바 높이", value: "44px" },
    ],
    notes: [
      "실시간 미리보기 분할 뷰",
      "이미지 드래그 앤 드롭 업로드",
      "코드 블록 구문 강조",
    ],
  },
  {
    id: 9,
    name: "DataTable",
    icon: "📑",
    designer: "윤서아",
    developer: "조수빈",
    status: "진행중",
    priority: "보통",
    figmaUrl: "https://figma.com/file/data-table",
    specs: [
      { label: "너비", value: "100%" },
      { label: "행 높이", value: "48px" },
      { label: "헤더 높이", value: "40px" },
    ],
    notes: [
      "컬럼 정렬 기능",
      "행 선택 및 다중 선택",
      "페이지네이션 포함",
    ],
  },
  {
    id: 10,
    name: "FileUploader",
    icon: "📤",
    designer: "김디자",
    developer: "이수진",
    status: "구현완료",
    priority: "높음",
    figmaUrl: "https://figma.com/file/file-uploader",
    specs: [
      { label: "드롭존 높이", value: "200px" },
      { label: "최대 파일 크기", value: "50MB" },
      { label: "보더", value: "2px dashed var(--border-medium)" },
    ],
    notes: [
      "드래그 앤 드롭 업로드 지원",
      "업로드 진행률 표시",
      "파일 타입 제한 (이미지, PDF)",
    ],
  },
];

const ASSIGNEES = Array.from(
  new Set(HANDOFF_DATA.map((item) => item.developer))
).sort();

export default function HandoffPage() {
  const [viewMode, setViewMode] = useState<"list" | "kanban">("list");
  const [selectedId, setSelectedId] = useState<number>(1);
  const [filterStatus, setFilterStatus] = useState<string>("전체");
  const [filterPriority, setFilterPriority] = useState<string>("전체");
  const [filterAssignee, setFilterAssignee] = useState<string>("전체");
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    return HANDOFF_DATA.filter((item) => {
      if (filterStatus !== "전체" && item.status !== filterStatus) return false;
      if (filterPriority !== "전체" && item.priority !== filterPriority)
        return false;
      if (filterAssignee !== "전체" && item.developer !== filterAssignee)
        return false;
      if (search && !item.name.toLowerCase().includes(search.toLowerCase()))
        return false;
      return true;
    });
  }, [filterStatus, filterPriority, filterAssignee, search]);

  const selectedItem = HANDOFF_DATA.find((item) => item.id === selectedId);

  return (
    <>
      <Header breadcrumb="핸드오프" />
      <div className={styles.content}>
        {/* Page Header */}
        <div className={styles.pageHeader}>
          <div>
            <div className={styles.pageTitle}>디자인-개발 핸드오프</div>
            <div className={styles.pageSubtitle}>
              총 {filtered.length}개 항목
            </div>
          </div>
          <button className={styles.btnPrimary}>
            <IconPlus size={14} />
            핸드오프 등록
          </button>
        </div>

        {/* Toolbar */}
        <div className={styles.toolbar}>
          <div className={styles.viewToggle}>
            <button
              className={`${styles.viewBtn} ${viewMode === "list" ? styles.viewBtnActive : ""}`}
              onClick={() => setViewMode("list")}
            >
              <IconList size={14} />
              List
            </button>
            <button
              className={`${styles.viewBtn} ${viewMode === "kanban" ? styles.viewBtnActive : ""}`}
              onClick={() => setViewMode("kanban")}
            >
              <IconLayoutKanban size={14} />
              Kanban
            </button>
          </div>

          <select
            className={styles.filterSelect}
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
          >
            <option value="전체">전체 상태</option>
            {STATUSES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>

          <select
            className={styles.filterSelect}
            value={filterPriority}
            onChange={(e) => setFilterPriority(e.target.value)}
          >
            <option value="전체">전체 우선순위</option>
            <option value="높음">높음</option>
            <option value="보통">보통</option>
            <option value="낮음">낮음</option>
          </select>

          <select
            className={styles.filterSelect}
            value={filterAssignee}
            onChange={(e) => setFilterAssignee(e.target.value)}
          >
            <option value="전체">전체 담당자</option>
            {ASSIGNEES.map((a) => (
              <option key={a} value={a}>
                {a}
              </option>
            ))}
          </select>

          <input
            type="text"
            className={styles.searchInput}
            placeholder="컴포넌트 검색..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {/* Content */}
        {viewMode === "list" ? (
          <ListView
            items={filtered}
            selectedId={selectedId}
            selectedItem={selectedItem ?? null}
            onSelect={setSelectedId}
          />
        ) : (
          <KanbanView items={filtered} />
        )}
      </div>
    </>
  );
}

/* ===== LIST VIEW ===== */

function ListView({
  items,
  selectedId,
  selectedItem,
  onSelect,
}: {
  items: HandoffItem[];
  selectedId: number;
  selectedItem: HandoffItem | null;
  onSelect: (id: number) => void;
}) {
  return (
    <div className={styles.listLayout}>
      {/* List */}
      <div className={styles.handoffList}>
        <div className={styles.listHeader}>
          <span className={styles.listTitle}>
            컴포넌트
            <span className={styles.listCount}>{items.length}</span>
          </span>
        </div>
        <div className={styles.listBody}>
          {items.length === 0 && (
            <div className={styles.emptyState}>
              검색 결과가 없습니다.
            </div>
          )}
          {items.map((item) => (
            <div
              key={item.id}
              className={`${styles.handoffItem} ${item.id === selectedId ? styles.handoffItemActive : ""}`}
              onClick={() => onSelect(item.id)}
            >
              <div className={styles.handoffThumb}>{item.icon}</div>
              <div className={styles.handoffInfo}>
                <div className={styles.handoffName}>{item.name}</div>
                <div className={styles.handoffMeta}>
                  <span
                    className={`${styles.statusBadge} ${STATUS_CLASS[item.status]}`}
                  >
                    {item.status}
                  </span>
                  <span
                    className={`${styles.priorityDot} ${PRIORITY_DOT[item.priority]}`}
                    title={item.priority}
                  />
                  <span>담당: {item.developer}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Detail Panel */}
      <div className={styles.handoffDetail}>
        {selectedItem ? (
          <>
            <div className={styles.detailHeader}>
              <div className={styles.detailTitle}>{selectedItem.name}</div>
              <div className={styles.detailBadges}>
                <span
                  className={`${styles.statusBadge} ${STATUS_CLASS[selectedItem.status]}`}
                >
                  {selectedItem.status}
                </span>
                <span
                  className={`${styles.priorityBadge} ${PRIORITY_BADGE[selectedItem.priority]}`}
                >
                  {selectedItem.priority}
                </span>
              </div>
              <div className={styles.detailMeta}>
                <span>담당: {selectedItem.developer}</span>
                <span>디자이너: {selectedItem.designer}</span>
              </div>
            </div>
            <div className={styles.detailBody}>
              <div className={styles.designPreview}>
                {selectedItem.icon} Figma 디자인 미리보기 ({selectedItem.name})
              </div>

              <div className={styles.specSection}>
                <div className={styles.specTitle}>디자인 스펙</div>
                <table className={styles.specTable}>
                  <thead>
                    <tr>
                      <th>속성</th>
                      <th>값</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedItem.specs.map((spec, idx) => (
                      <tr key={idx}>
                        <td>{spec.label}</td>
                        <td>{spec.value}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className={styles.specSection}>
                <div className={styles.specTitle}>참고사항</div>
                <div className={styles.notesContent}>
                  {selectedItem.notes.map((note, idx) => (
                    <p key={idx}>• {note}</p>
                  ))}
                </div>
              </div>
            </div>
            <div className={styles.detailActions}>
              <a
                href={selectedItem.figmaUrl}
                target="_blank"
                rel="noopener noreferrer"
                className={styles.btnViolet}
              >
                <IconExternalLink size={14} />
                Figma에서 보기
              </a>
              <button className={styles.btnGreen}>
                <IconArrowRight size={14} />
                {selectedItem.status === "구현완료" ? "검수 완료" : "구현 완료"}
              </button>
            </div>
          </>
        ) : (
          <div className={styles.detailEmpty}>
            항목을 선택하세요
          </div>
        )}
      </div>
    </div>
  );
}

/* ===== KANBAN VIEW ===== */

function KanbanView({ items }: { items: HandoffItem[] }) {
  const columns: { status: Status; label: string }[] = [
    { status: "대기", label: "대기" },
    { status: "진행중", label: "진행중" },
    { status: "구현완료", label: "구현완료" },
    { status: "검수완료", label: "검수완료" },
  ];

  return (
    <div className={styles.kanbanBoard}>
      {columns.map((col) => {
        const colItems = items.filter((item) => item.status === col.status);
        return (
          <div key={col.status} className={styles.kanbanColumn}>
            <div className={styles.kanbanColumnHeader}>
              <span
                className={styles.kanbanColumnDot}
                style={{ background: STATUS_DOT_COLOR[col.status] }}
              />
              <span className={styles.kanbanColumnTitle}>{col.label}</span>
              <span className={styles.kanbanColumnCount}>{colItems.length}</span>
            </div>
            <div className={styles.kanbanColumnBody}>
              {colItems.map((item) => (
                <div key={item.id} className={styles.kanbanCard}>
                  <div className={styles.kanbanCardName}>
                    {item.icon} {item.name}
                  </div>
                  <div className={styles.kanbanCardMeta}>
                    <div className={styles.kanbanCardRow}>
                      <span
                        className={`${styles.priorityBadge} ${PRIORITY_BADGE[item.priority]}`}
                      >
                        {item.priority}
                      </span>
                      <a
                        href={item.figmaUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={styles.figmaLink}
                        onClick={(e) => e.stopPropagation()}
                      >
                        Figma
                        <IconExternalLink size={10} />
                      </a>
                    </div>
                  </div>
                  <div className={styles.kanbanCardFooter}>
                    <div className={styles.kanbanCardAssignees}>
                      <span>👤 {item.developer}</span>
                    </div>
                    <span style={{ fontSize: 10, color: "var(--text-muted)" }}>
                      {item.designer}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
