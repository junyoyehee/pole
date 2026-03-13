"use client";

import { useState, useMemo, useEffect, useCallback } from "react";
import Link from "next/link";
import Header from "@/components/Header";
import { IconPlus, IconSearch, IconRefresh } from "@tabler/icons-react";
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

interface FigmaProjectData {
  id: string;
  name: string;
  description: string | null;
  figmaUrl: string;
  fileKey: string;
  status: DBStatus;
  thumbnailUrl: string | null;
  createdAt: string;
  designer: { id: string; name: string; avatarUrl: string | null; part: string };
  _count: { reviews: number; handoffs: number };
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
    // Load recent explores from figma-explorer localStorage
    try {
      const saved = localStorage.getItem("figma-explorer-recent");
      if (saved) setRecentExplores(JSON.parse(saved));
    } catch { /* ignore */ }
  }, [fetchProjects]);

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
        {recentExplores.length > 0 && (
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
            <Link href="/figma-explorer">
              <button className={styles.btnPrimary}>
                <IconPlus size={12} />새 프로젝트
              </button>
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

        {/* Project Grid */}
        {loading ? (
          <div className={styles.emptyState}>로딩 중...</div>
        ) : filtered.length === 0 ? (
          <div className={styles.emptyState}>
            {projects.length === 0
              ? "아직 공유된 Figma 프로젝트가 없습니다. Figma 탐색기에서 디자인을 공유해보세요!"
              : "검색 결과가 없습니다."}
          </div>
        ) : (
          <div className={styles.projectGrid}>
            {filtered.map((project) => {
              const statusLabel = STATUS_MAP[project.status];
              return (
                <Link
                  key={project.id}
                  href={project.figmaUrl}
                  target="_blank"
                  className={styles.projectCard}
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

                    {/* Reviews & Handoffs info */}
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
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </>
  );
}
