"use client";

import { useState, useMemo, useEffect, useCallback } from "react";
import Link from "next/link";
import Header from "@/components/Header";
import {
  IconPlus,
  IconSearch,
  IconRefresh,
  IconMessage,
  IconCode,
  IconCalendar,
  IconCheck,
  IconAlertCircle,
  IconClock,
  IconExternalLink,
  IconBrandFigma,
  IconX,
} from "@tabler/icons-react";
import styles from "./page.module.css";

type DBStatus = "DESIGNING" | "IN_REVIEW" | "IN_DEV" | "DONE";

const STATUS_MAP: Record<DBStatus, string> = {
  DESIGNING: "디자인중",
  IN_REVIEW: "리뷰중",
  IN_DEV: "개발중",
  DONE: "완료",
};

const STATUS_BADGE_CLASS: Record<string, string> = {
  디자인중: "badgeDesigning",
  리뷰중: "badgeReview",
  개발중: "badgeDev",
  완료: "badgeDone",
};

const REVIEW_STATUS_MAP: Record<string, string> = {
  OPEN: "진행중",
  IN_REVISION: "수정중",
  APPROVED: "승인완료",
};

const REVIEW_STATUS_CLASS: Record<string, string> = {
  OPEN: "badgeReview",
  IN_REVISION: "badgeDesigning",
  APPROVED: "badgeDone",
};

const HANDOFF_STATUS_MAP: Record<string, string> = {
  PENDING: "대기",
  IN_PROGRESS: "진행중",
  IMPLEMENTED: "구현완료",
  VERIFIED: "검증완료",
};

const HANDOFF_STATUS_CLASS: Record<string, string> = {
  PENDING: "badgeDesigning",
  IN_PROGRESS: "badgeReview",
  IMPLEMENTED: "badgeDev",
  VERIFIED: "badgeDone",
};

const PRIORITY_MAP: Record<string, string> = {
  HIGH: "높음",
  NORMAL: "보통",
  LOW: "낮음",
};

interface FigmaProjectData {
  id: string;
  name: string;
  description: string | null;
  figmaUrl: string | null;
  fileKey: string | null;
  status: DBStatus;
  thumbnailUrl: string | null;
  createdAt: string;
  designer: { id: string; name: string; avatarUrl: string | null; part: string };
  _count: { reviews: number; handoffs: number };
}

interface ReviewItem {
  id: string;
  title: string;
  status: string;
  createdAt: string;
  dueDate: string | null;
  author: { id: string; name: string };
  _count: { feedbacks: number };
}

interface HandoffItem {
  id: string;
  componentName: string;
  status: string;
  priority: string;
  createdAt: string;
  developer: { id: string; name: string };
}

interface ProjectDetail {
  id: string;
  name: string;
  description: string | null;
  figmaUrl: string | null;
  status: DBStatus;
  thumbnailUrl: string | null;
  createdAt: string;
  designer: { id: string; name: string; avatarUrl: string | null; part: string };
  reviews: ReviewItem[];
  handoffs: HandoffItem[];
}

interface RecentExploreItem {
  url: string;
  fileKey: string;
  nodeId?: string;
  nodeName?: string;
  timestamp: number;
}

type FilterStatus = string | null;

const STATUS_TABS: FilterStatus[] = [null, "디자인중", "리뷰중", "개발중", "완료"];

const STATUS_LABEL: Record<string, string> = {
  전체: "전체",
  디자인중: "디자인중",
  리뷰중: "리뷰중",
  개발중: "개발중",
  완료: "완료",
};

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}분 전`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}시간 전`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}일 전`;
  const weeks = Math.floor(days / 7);
  return `${weeks}주 전`;
}

export default function FigmaHubPage() {
  const [activeStatus, setActiveStatus] = useState<FilterStatus>(null);
  const [search, setSearch] = useState("");
  const [projects, setProjects] = useState<FigmaProjectData[]>([]);
  const [loading, setLoading] = useState(true);
  const [recentExplores, setRecentExplores] = useState<RecentExploreItem[]>([]);
  const [selectedId, setSelectedId] = useState<string>("");
  const [detail, setDetail] = useState<ProjectDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const fetchProjects = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ limit: "50" });
      const res = await fetch(`/api/v1/figma-projects?${params}`);
      const data = await res.json();
      if (data.success) {
        setProjects(data.data.items);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProjects();
    try {
      const saved = localStorage.getItem("figma-explorer-recent");
      if (saved) setRecentExplores(JSON.parse(saved));
    } catch { /* ignore */ }
  }, [fetchProjects]);

  // Fetch detail when project selected
  useEffect(() => {
    if (!selectedId) {
      setDetail(null);
      return;
    }
    setDetailLoading(true);
    fetch(`/api/v1/figma-projects/${selectedId}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.success) setDetail(data.data);
      })
      .catch(() => {})
      .finally(() => setDetailLoading(false));
  }, [selectedId]);

  const filtered = useMemo(() => {
    return projects.filter((p) => {
      const statusLabel = STATUS_MAP[p.status];
      if (activeStatus && statusLabel !== activeStatus) return false;
      if (
        search &&
        !p.name.toLowerCase().includes(search.toLowerCase()) &&
        !(p.description || "").toLowerCase().includes(search.toLowerCase())
      )
        return false;
      return true;
    });
  }, [activeStatus, search, projects]);

  return (
    <>
      <Header breadcrumb="피그마 허브" />
      <div className={styles.content}>
        {/* Recent Explores */}
        {recentExplores.length > 0 && !selectedId && (
          <div className={styles.recentSection}>
            <div className={styles.recentHeader}>
              <span className={styles.recentTitle}>최근 탐색</span>
              <button
                className={styles.recentClear}
                onClick={() => {
                  localStorage.removeItem("figma-explorer-recent");
                  setRecentExplores([]);
                }}
              >
                전체 삭제
              </button>
            </div>
            <div className={styles.recentList}>
              {recentExplores.slice(0, 8).map((item, i) => (
                <Link
                  key={i}
                  href={`/figma-explorer?url=${encodeURIComponent(item.url)}`}
                  className={styles.recentCard}
                >
                  <div className={styles.recentName}>
                    {item.nodeName || item.fileKey}
                  </div>
                  <div className={styles.recentMeta}>
                    {item.nodeId ? `Node ${item.nodeId}` : "파일 전체"} · {timeAgo(new Date(item.timestamp).toISOString())}
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Page Header */}
        <div className={styles.pageHeader}>
          <div>
            <div className={styles.pageTitle}>피그마 허브</div>
            <div className={styles.pageSubtitle}>
              팀의 Figma 프로젝트를 관리하세요
            </div>
          </div>
          <div style={{ display: "flex", gap: 6 }}>
            <button
              className={styles.btnPrimary}
              onClick={fetchProjects}
              style={{ background: "var(--bg-tertiary)", color: "var(--text-secondary)" }}
            >
              <IconRefresh size={12} />새로고침
            </button>
            <Link href="/figma-hub/new" className={styles.btnPrimary} style={{ textDecoration: "none" }}>
              <IconPlus size={12} />새 프로젝트
            </Link>
          </div>
        </div>

        {/* Filter Bar */}
        <div className={styles.filterBar}>
          {STATUS_TABS.map((status) => {
            const label = status ?? "전체";
            return (
              <button
                key={label}
                className={`${styles.filterTab} ${
                  activeStatus === status ? styles.filterTabActive : ""
                }`}
                onClick={() => setActiveStatus(status)}
              >
                {STATUS_LABEL[label]}
              </button>
            );
          })}
          <div style={{ position: "relative", marginLeft: "auto" }}>
            <IconSearch
              size={12}
              style={{
                position: "absolute",
                left: 8,
                top: "50%",
                transform: "translateY(-50%)",
                color: "var(--text-muted)",
                pointerEvents: "none",
              }}
            />
            <input
              type="text"
              className={styles.searchInput}
              placeholder="프로젝트 검색..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ paddingLeft: 30 }}
            />
          </div>
        </div>

        {/* Main Layout: Grid + Detail */}
        <div className={`${styles.mainLayout} ${selectedId ? styles.mainLayoutExpanded : ""}`}>
          {/* Project Grid */}
          <div className={styles.gridPanel}>
            {loading ? (
              <div className={styles.emptyState}>로딩 중...</div>
            ) : filtered.length === 0 ? (
              <div className={styles.emptyState}>
                {projects.length === 0
                  ? "아직 프로젝트가 없습니다. 새 프로젝트를 등록해보세요!"
                  : "검색 결과가 없습니다."}
              </div>
            ) : (
              <div className={styles.projectGrid}>
                {filtered.map((project) => {
                  const statusLabel = STATUS_MAP[project.status];
                  const isSelected = project.id === selectedId;
                  return (
                    <div
                      key={project.id}
                      className={`${styles.projectCard} ${isSelected ? styles.projectCardActive : ""}`}
                      onClick={() => setSelectedId(isSelected ? "" : project.id)}
                    >
                      {/* Thumbnail */}
                      <div
                        className={styles.projectThumb}
                        style={
                          project.thumbnailUrl
                            ? {
                                backgroundImage: `url(${project.thumbnailUrl})`,
                                backgroundSize: "cover",
                                backgroundPosition: "center",
                              }
                            : undefined
                        }
                      >
                        <div className={styles.projectStatusBar}>
                          <span
                            className={`${styles.badge} ${styles[STATUS_BADGE_CLASS[statusLabel]]}`}
                          >
                            {statusLabel}
                          </span>
                        </div>
                        {!project.thumbnailUrl && (
                          <span className={styles.projectThumbPlaceholder}>
                            🎨
                          </span>
                        )}
                      </div>

                      {/* Body */}
                      <div className={styles.projectBody}>
                        <div className={styles.projectName}>{project.name}</div>
                        <div className={styles.projectDesc}>
                          {project.description || "설명 없음"}
                        </div>
                        <div className={styles.projectMeta}>
                          <div className={styles.projectPeople}>
                            <div
                              className={`${styles.projectAvatar} ${styles.avatarDesign}`}
                            >
                              {project.designer.name.charAt(0)}
                            </div>
                          </div>
                          <span className={styles.projectDate}>
                            {timeAgo(project.createdAt)}
                          </span>
                        </div>
                        <div className={styles.handoffBar}>
                          {project._count.handoffs > 0 ? (
                            <>
                              <div
                                className={`${styles.handoffSeg} ${styles.handoffDone}`}
                                style={{ flex: project._count.reviews }}
                              />
                              <div
                                className={`${styles.handoffSeg} ${styles.handoffProgress}`}
                                style={{ flex: project._count.handoffs }}
                              />
                            </>
                          ) : (
                            <div
                              className={`${styles.handoffSeg} ${styles.handoffPending}`}
                              style={{ flex: 1 }}
                            />
                          )}
                        </div>
                        <div className={styles.handoffLabel}>
                          리뷰 {project._count.reviews}건 · 핸드오프{" "}
                          {project._count.handoffs}건
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Detail Panel */}
          <div className={styles.detailPanel}>
            {selectedId && (
              detailLoading ? (
                <div className={styles.detailEmpty}>불러오는 중...</div>
              ) : detail ? (
                <ProjectDetailPanel
                  detail={detail}
                  onClose={() => setSelectedId("")}
                />
              ) : (
                <div className={styles.detailEmpty}>프로젝트 정보를 불러올 수 없습니다.</div>
              )
            )}
          </div>
        </div>
      </div>
    </>
  );
}

/* ===== Project Detail Panel ===== */

function ProjectDetailPanel({
  detail,
  onClose,
}: {
  detail: ProjectDetail;
  onClose: () => void;
}) {
  const [activeTab, setActiveTab] = useState<"reviews" | "handoffs">("reviews");
  const statusLabel = STATUS_MAP[detail.status];

  return (
    <div className={styles.detailContent}>
      {/* Detail Header */}
      <div className={styles.detailHeader}>
        <div className={styles.detailHeaderTop}>
          <div className={styles.detailTitle}>{detail.name}</div>
          <button type="button" className={styles.detailClose} onClick={onClose}>
            <IconX size={14} />
          </button>
        </div>
        <div className={styles.detailMeta}>
          <span className={`${styles.badge} ${styles[STATUS_BADGE_CLASS[statusLabel]]}`}>
            {statusLabel}
          </span>
          <span className={styles.detailMetaText}>
            {detail.designer.name} ({detail.designer.part})
          </span>
          <span className={styles.detailMetaText}>
            {new Date(detail.createdAt).toLocaleDateString("ko-KR")}
          </span>
        </div>
        {detail.description && (
          <div className={styles.detailDesc}>{detail.description}</div>
        )}
        {detail.figmaUrl && (
          <a
            href={detail.figmaUrl}
            target="_blank"
            rel="noopener noreferrer"
            className={styles.btnFigma}
          >
            <IconBrandFigma size={12} />
            Figma에서 보기
            <IconExternalLink size={10} />
          </a>
        )}
      </div>

      {/* Tabs */}
      <div className={styles.detailTabs}>
        <button
          className={`${styles.detailTab} ${activeTab === "reviews" ? styles.detailTabActive : ""}`}
          onClick={() => setActiveTab("reviews")}
        >
          <IconMessage size={12} />
          리뷰 <span className={styles.tabCount}>{detail.reviews.length}</span>
        </button>
        <button
          className={`${styles.detailTab} ${activeTab === "handoffs" ? styles.detailTabActive : ""}`}
          onClick={() => setActiveTab("handoffs")}
        >
          <IconCode size={12} />
          핸드오프 <span className={styles.tabCount}>{detail.handoffs.length}</span>
        </button>
      </div>

      {/* Tab Content */}
      <div className={styles.detailBody}>
        {activeTab === "reviews" ? (
          detail.reviews.length === 0 ? (
            <div className={styles.tabEmpty}>
              <IconMessage size={18} />
              <span>등록된 리뷰가 없습니다</span>
              <Link href="/design-review/request" className={styles.btnSmall}>
                리뷰 요청하기
              </Link>
            </div>
          ) : (
            <div className={styles.itemList}>
              {detail.reviews.map((review) => (
                <Link
                  key={review.id}
                  href="/design-review"
                  className={styles.itemCard}
                >
                  <div className={styles.itemTop}>
                    <span className={styles.itemTitle}>{review.title}</span>
                    <span className={`${styles.badge} ${styles[REVIEW_STATUS_CLASS[review.status] ?? "badgeDesigning"]}`}>
                      {REVIEW_STATUS_MAP[review.status] ?? review.status}
                    </span>
                  </div>
                  <div className={styles.itemMeta}>
                    <span className={styles.itemMetaItem}>
                      {review.author.name}
                    </span>
                    <span className={styles.itemMetaItem}>
                      <IconMessage size={10} />
                      {review._count.feedbacks}
                    </span>
                    {review.dueDate && (
                      <span className={styles.itemMetaItem}>
                        <IconCalendar size={10} />
                        {review.dueDate}
                      </span>
                    )}
                    <span className={styles.itemMetaItem}>
                      <IconClock size={10} />
                      {timeAgo(review.createdAt)}
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          )
        ) : (
          detail.handoffs.length === 0 ? (
            <div className={styles.tabEmpty}>
              <IconCode size={18} />
              <span>등록된 핸드오프가 없습니다</span>
              <Link href="/handoff/register" className={styles.btnSmall}>
                핸드오프 등록하기
              </Link>
            </div>
          ) : (
            <div className={styles.itemList}>
              {detail.handoffs.map((handoff) => (
                <Link
                  key={handoff.id}
                  href="/handoff"
                  className={styles.itemCard}
                >
                  <div className={styles.itemTop}>
                    <span className={styles.itemTitle}>{handoff.componentName}</span>
                    <span className={`${styles.badge} ${styles[HANDOFF_STATUS_CLASS[handoff.status] ?? "badgeDesigning"]}`}>
                      {HANDOFF_STATUS_MAP[handoff.status] ?? handoff.status}
                    </span>
                  </div>
                  <div className={styles.itemMeta}>
                    <span className={styles.itemMetaItem}>
                      {handoff.developer.name}
                    </span>
                    <span className={styles.itemMetaItem}>
                      <IconAlertCircle size={10} />
                      {PRIORITY_MAP[handoff.priority] ?? handoff.priority}
                    </span>
                    <span className={styles.itemMetaItem}>
                      <IconClock size={10} />
                      {timeAgo(handoff.createdAt)}
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          )
        )}
      </div>
    </div>
  );
}
