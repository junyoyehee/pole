"use client";

import { useState, useMemo, useEffect } from "react";
import Link from "next/link";
import Header from "@/components/Header";
import {
  IconPlus,
  IconList,
  IconLayoutKanban,
  IconExternalLink,
  IconArrowRight,
  IconPhoto,
} from "@tabler/icons-react";
import styles from "./page.module.css";

type Status = "대기" | "진행중" | "구현완료" | "검수완료";
type Priority = "높음" | "보통" | "낮음";

interface SavedImage {
  url: string;
  source: string;
  reason: string;
}

interface HandoffItem {
  id: string;
  name: string;
  designer: string;
  developer: string;
  status: Status;
  priority: Priority;
  figmaUrl: string;
  previewImages: SavedImage[];
  specs: { label: string; value: string }[];
  notes: string[];
}

const STATUS_MAP: Record<string, Status> = {
  PENDING: "대기",
  IN_PROGRESS: "진행중",
  IMPLEMENTED: "구현완료",
  VERIFIED: "검수완료",
};

const PRIORITY_MAP: Record<string, Priority> = {
  HIGH: "높음",
  NORMAL: "보통",
  LOW: "낮음",
};

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

function parseSpecData(specData: string | null): { label: string; value: string }[] {
  if (!specData) return [];
  try {
    const parsed = JSON.parse(specData);
    return Object.entries(parsed).map(([label, value]) => ({
      label,
      value: String(value),
    }));
  } catch {
    return specData
      .split("\n")
      .filter(Boolean)
      .map((line) => {
        const [label, ...rest] = line.split(":");
        return { label: label.trim(), value: rest.join(":").trim() };
      });
  }
}

function parseNotes(notes: string | null): string[] {
  if (!notes) return [];
  return notes.split("\n").filter(Boolean);
}

interface ApiHandoff {
  id: string;
  componentName: string;
  figmaUrl: string | null;
  status: string;
  priority: string;
  specData: string | null;
  notes: string | null;
  previewImages: string | null;
  figmaProject: { name: string; fileKey: string; designerId: string; designer: { name: string } };
  developer: { name: string };
}

function parsePreviewImages(raw: string | null): SavedImage[] {
  if (!raw) return [];
  try {
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

function mapApiToItem(h: ApiHandoff): HandoffItem {
  return {
    id: h.id,
    name: h.componentName,
    designer: h.figmaProject.designer.name,
    developer: h.developer.name,
    status: STATUS_MAP[h.status] ?? "대기",
    priority: PRIORITY_MAP[h.priority] ?? "보통",
    figmaUrl: h.figmaUrl ?? "",
    previewImages: parsePreviewImages(h.previewImages),
    specs: parseSpecData(h.specData),
    notes: parseNotes(h.notes),
  };
}

export default function HandoffPage() {
  const [viewMode, setViewMode] = useState<"list" | "kanban">("list");
  const [selectedId, setSelectedId] = useState<string>("");
  const [filterStatus, setFilterStatus] = useState<string>("전체");
  const [filterPriority, setFilterPriority] = useState<string>("전체");
  const [filterAssignee, setFilterAssignee] = useState<string>("전체");
  const [search, setSearch] = useState("");
  const [items, setItems] = useState<HandoffItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/v1/handoffs")
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          const mapped = (data.data as ApiHandoff[]).map(mapApiToItem);
          setItems(mapped);
          if (mapped.length > 0) setSelectedId(mapped[0].id);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const assignees = useMemo(
    () => Array.from(new Set(items.map((item) => item.developer))).sort(),
    [items]
  );

  const filtered = useMemo(() => {
    return items.filter((item) => {
      if (filterStatus !== "전체" && item.status !== filterStatus) return false;
      if (filterPriority !== "전체" && item.priority !== filterPriority) return false;
      if (filterAssignee !== "전체" && item.developer !== filterAssignee) return false;
      if (search && !item.name.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    });
  }, [items, filterStatus, filterPriority, filterAssignee, search]);

  const selectedItem = items.find((item) => item.id === selectedId);

  if (loading) {
    return (
      <>
        <Header breadcrumb="핸드오프" />
        <div className={styles.content}>
          <div className={styles.emptyState}>데이터를 불러오는 중...</div>
        </div>
      </>
    );
  }

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
          <Link href="/handoff/register" className={styles.btnPrimary} style={{ textDecoration: "none" }}>
            <IconPlus size={14} />
            핸드오프 등록
          </Link>
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
            {assignees.map((a) => (
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

/* ===== DESIGN PREVIEW ===== */

function DesignPreview({ images }: { images: SavedImage[] }) {
  const [selectedIdx, setSelectedIdx] = useState(0);

  if (images.length === 0) {
    return (
      <div className={styles.designPreview}>
        <div className={styles.previewPlaceholder}>
          <IconPhoto size={20} />
          <span>미리보기 이미지 없음</span>
        </div>
      </div>
    );
  }

  const current = images[selectedIdx] ?? images[0];

  return (
    <div className={styles.previewSection}>
      <div className={styles.designPreview} style={{ padding: 0 }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={current.url}
          alt="디자인 미리보기"
          className={styles.previewImage}
        />
        {current.reason && (
          <div className={styles.previewCaption}>{current.reason}</div>
        )}
      </div>
      {images.length > 1 && (
        <div className={styles.previewThumbs}>
          {images.map((img, idx) => (
            <button
              key={idx}
              type="button"
              className={`${styles.previewThumb} ${idx === selectedIdx ? styles.previewThumbActive : ""}`}
              onClick={() => setSelectedIdx(idx)}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={img.url} alt="" className={styles.previewThumbImg} />
              <span className={styles.previewThumbSource}>
                {img.source === "ai" ? "AI" : img.source === "clipboard" ? "붙여넣기" : "업로드"}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
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
  selectedId: string;
  selectedItem: HandoffItem | null;
  onSelect: (id: string) => void;
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
              <div className={styles.handoffThumb}>📦</div>
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
              <DesignPreview images={selectedItem.previewImages} />

              {selectedItem.specs.length > 0 && (
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
              )}

              {selectedItem.notes.length > 0 && (
                <div className={styles.specSection}>
                  <div className={styles.specTitle}>참고사항</div>
                  <div className={styles.notesContent}>
                    {selectedItem.notes.map((note, idx) => (
                      <p key={idx}>• {note}</p>
                    ))}
                  </div>
                </div>
              )}
            </div>
            <div className={styles.detailActions}>
              {selectedItem.figmaUrl && (
                <a
                  href={selectedItem.figmaUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={styles.btnViolet}
                >
                  <IconExternalLink size={14} />
                  Figma에서 보기
                </a>
              )}
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
                    📦 {item.name}
                  </div>
                  <div className={styles.kanbanCardMeta}>
                    <div className={styles.kanbanCardRow}>
                      <span
                        className={`${styles.priorityBadge} ${PRIORITY_BADGE[item.priority]}`}
                      >
                        {item.priority}
                      </span>
                      {item.figmaUrl && (
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
                      )}
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
