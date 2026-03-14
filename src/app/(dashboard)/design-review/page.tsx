"use client";

import { useState, useMemo, useEffect, useRef } from "react";
import Link from "next/link";
import Header from "@/components/Header";
import RichEditor, { renderMarkdown, type Attachment } from "@/components/RichEditor";
import {
  IconPlus,
  IconSearch,
  IconMessage,
  IconCalendar,
  IconExternalLink,
  IconBrandFigma,
  IconPhoto,
  IconSend,
  IconCheck,
  IconAlertCircle,
  IconMessagePlus,
} from "@tabler/icons-react";
import styles from "./page.module.css";

type ReviewStatus = "진행중" | "수정중" | "승인완료";

interface SavedImage {
  url: string;
  source: string;
  reason: string;
}

interface Feedback {
  id: string;
  content: string;
  category: string;
  priority: string;
  type: string;
  createdAt: string;
  author: { name: string };
}

interface DesignReview {
  id: string;
  title: string;
  figmaUrl: string;
  figmaProjectUrl: string;
  projectName: string;
  requester: string;
  requesterInitial: string;
  status: ReviewStatus;
  deadline: string;
  feedbackCount: number;
  createdAt: string;
  description: string;
  previewImages: SavedImage[];
  feedbacks: Feedback[];
}

const STATUS_MAP: Record<string, ReviewStatus> = {
  OPEN: "진행중",
  IN_REVISION: "수정중",
  APPROVED: "승인완료",
};

const CATEGORY_LABELS: Record<string, string> = {
  UI: "UI",
  UX: "UX",
  A11Y: "접근성",
  TECHNICAL: "기술",
  OTHER: "기타",
};

const TYPE_LABELS: Record<string, string> = {
  COMMENT: "코멘트",
  CHANGE_REQUEST: "수정 요청",
  APPROVAL: "승인",
};

const TYPE_STYLE: Record<string, string> = {
  COMMENT: styles.feedbackTypeComment,
  CHANGE_REQUEST: styles.feedbackTypeChange,
  APPROVAL: styles.feedbackTypeApproval,
};

interface ApiReview {
  id: string;
  title: string;
  description: string | null;
  figmaUrl: string | null;
  status: string;
  dueDate: string | null;
  previewImages: string | null;
  createdAt: string;
  figmaProject: { name: string; figmaUrl: string };
  author: { name: string };
  feedbacks: {
    id: string;
    content: string;
    category: string;
    priority: string;
    type: string;
    createdAt: string;
    author: { name: string };
  }[];
}

function mapApiToReview(r: ApiReview): DesignReview {
  let images: SavedImage[] = [];
  if (r.previewImages) {
    try { images = JSON.parse(r.previewImages); } catch {}
  }

  return {
    id: r.id,
    title: r.title,
    figmaUrl: r.figmaUrl || "",
    figmaProjectUrl: r.figmaProject.figmaUrl,
    projectName: r.figmaProject.name,
    requester: r.author.name,
    requesterInitial: r.author.name.charAt(0),
    status: STATUS_MAP[r.status] ?? "진행중",
    deadline: r.dueDate ?? "-",
    feedbackCount: r.feedbacks.length,
    createdAt: new Date(r.createdAt).toLocaleDateString("ko-KR"),
    description: r.description ?? "",
    previewImages: images,
    feedbacks: r.feedbacks,
  };
}

const STATUS_TABS: (ReviewStatus | null)[] = [null, "진행중", "수정중", "승인완료"];
const STATUS_LABELS_MAP: Record<string, string> = {
  all: "전체",
  "진행중": "진행중",
  "수정중": "수정중",
  "승인완료": "승인완료",
};

const STATUS_STYLE: Record<ReviewStatus, string> = {
  "진행중": styles.statusInProgress,
  "수정중": styles.statusRevision,
  "승인완료": styles.statusApproved,
};

export default function DesignReviewPage() {
  const [activeStatus, setActiveStatus] = useState<ReviewStatus | null>(null);
  const [search, setSearch] = useState("");
  const [reviews, setReviews] = useState<DesignReview[]>([]);
  const [selectedId, setSelectedId] = useState<string>("");
  const [loading, setLoading] = useState(true);

  function loadReviews() {
    fetch("/api/v1/design-reviews")
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          const mapped = (data.data as ApiReview[]).map(mapApiToReview);
          setReviews(mapped);
          if (!selectedId && mapped.length > 0) setSelectedId(mapped[0].id);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }

  useEffect(() => { loadReviews(); }, []);

  const filtered = useMemo(() => {
    return reviews.filter((r) => {
      if (activeStatus && r.status !== activeStatus) return false;
      if (search && !r.title.toLowerCase().includes(search.toLowerCase()) && !r.requester.includes(search)) return false;
      return true;
    });
  }, [reviews, activeStatus, search]);

  const statusCounts = useMemo(() => {
    const base = search
      ? reviews.filter((r) => r.title.toLowerCase().includes(search.toLowerCase()) || r.requester.includes(search))
      : reviews;
    return {
      all: base.length,
      "진행중": base.filter((r) => r.status === "진행중").length,
      "수정중": base.filter((r) => r.status === "수정중").length,
      "승인완료": base.filter((r) => r.status === "승인완료").length,
    };
  }, [reviews, search]);

  const selectedReview = reviews.find((r) => r.id === selectedId);

  if (loading) {
    return (
      <>
        <Header breadcrumb="디자인 리뷰" />
        <div className={styles.content}>
          <div className={styles.emptyState}>데이터를 불러오는 중...</div>
        </div>
      </>
    );
  }

  return (
    <>
      <Header breadcrumb="디자인 리뷰" />
      <div className={styles.content}>
        {/* Page Header */}
        <div className={styles.pageHeader}>
          <div>
            <div className={styles.pageTitle}>디자인 리뷰</div>
            <div className={styles.pageSubtitle}>총 {statusCounts.all}건의 리뷰</div>
          </div>
          <Link href="/design-review/request" className={styles.btnPrimary} style={{ textDecoration: "none" }}>
            <IconPlus size={12} />
            리뷰 요청
          </Link>
        </div>

        {/* Filter Bar */}
        <div className={styles.filterBar}>
          {STATUS_TABS.map((status) => {
            const key = status ?? "all";
            const label = STATUS_LABELS_MAP[key];
            const count = statusCounts[key as keyof typeof statusCounts];
            return (
              <button
                key={key}
                className={`${styles.filterTab} ${activeStatus === status ? styles.filterTabActive : ""}`}
                onClick={() => setActiveStatus(status)}
              >
                {label} ({count})
              </button>
            );
          })}
          <div className={styles.searchWrap}>
            <IconSearch size={12} className={styles.searchIcon} />
            <input
              type="text"
              className={styles.searchInput}
              placeholder="리뷰 검색..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        {/* Main Layout */}
        <div className={`${styles.mainLayout} ${selectedId ? styles.mainLayoutExpanded : ""}`}>
          {/* List */}
          <div className={styles.reviewListPanel}>
            <div className={styles.listHeader}>
              <span className={styles.listTitle}>
                리뷰 목록
                <span className={styles.listCount}>{filtered.length}</span>
              </span>
            </div>
            <div className={styles.listBody}>
              {filtered.length === 0 && (
                <div className={styles.emptyState}>검색 결과가 없습니다.</div>
              )}
              {filtered.map((review) => (
                <div
                  key={review.id}
                  className={`${styles.reviewItem} ${review.id === selectedId ? styles.reviewItemActive : ""}`}
                  onClick={() => setSelectedId(review.id)}
                >
                  <div className={styles.reviewItemTop}>
                    <span className={styles.reviewItemTitle}>{review.title}</span>
                    <span className={`${styles.statusBadge} ${STATUS_STYLE[review.status]}`}>
                      {review.status}
                    </span>
                  </div>
                  <div className={styles.reviewItemMeta}>
                    <span>{review.requester}</span>
                    <span><IconMessage size={10} /> {review.feedbackCount}</span>
                    <span><IconCalendar size={10} /> {review.deadline}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Detail Panel */}
          <div className={styles.detailPanel}>
            {selectedReview ? (
              <DetailPanel review={selectedReview} onFeedbackAdded={loadReviews} />
            ) : (
              <div className={styles.detailEmpty}>리뷰를 선택하세요</div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

/* ===== DETAIL PANEL ===== */


/* ===== DETAIL PANEL ===== */

function DetailPanel({
  review,
  onFeedbackAdded,
}: {
  review: DesignReview;
  onFeedbackAdded: () => void;
}) {
  const [selectedImgIdx, setSelectedImgIdx] = useState(0);
  const [fbContent, setFbContent] = useState("");
  const [fbAttachments, setFbAttachments] = useState<Attachment[]>([]);
  const [fbCategory, setFbCategory] = useState("UI");
  const [fbType, setFbType] = useState("COMMENT");
  const [fbSubmitting, setFbSubmitting] = useState(false);
  const [fbAuthorId, setFbAuthorId] = useState("");
  const [users, setUsers] = useState<{ id: string; name: string; part: string }[]>([]);
  const feedbackScrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch("/api/v1/users")
      .then((res) => res.json())
      .then((data) => {
        if (data.success) setUsers(data.data.items ?? data.data ?? []);
      })
      .catch(() => {});
  }, []);

  // 피드백 목록이 변경되면 최신(맨 아래)으로 스크롤
  useEffect(() => {
    const el = feedbackScrollRef.current;
    if (el) {
      el.scrollTop = el.scrollHeight;
    }
  }, [review.feedbacks]);

  async function handleSubmitFeedback() {
    if (!fbContent.trim() || !fbAuthorId || fbSubmitting) return;

    setFbSubmitting(true);
    try {
      // Combine content + attachment references
      let fullContent = fbContent.trim();
      if (fbAttachments.length > 0) {
        fullContent += "\n\n---\n**첨부파일:** " + fbAttachments.map((a) => a.name).join(", ");
      }

      const res = await fetch("/api/v1/review-feedbacks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reviewId: review.id,
          authorId: fbAuthorId,
          content: fullContent,
          category: fbCategory,
          type: fbType,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setFbContent("");
        setFbAttachments([]);
        onFeedbackAdded();
      }
    } catch {}
    finally { setFbSubmitting(false); }
  }

  const figmaLink = review.figmaUrl || review.figmaProjectUrl;

  return (
    <>
      {/* Header */}
      <div className={styles.detailHeader}>
        <div className={styles.detailTitleRow}>
          <div className={styles.detailTitle}>{review.title}</div>
          <span className={`${styles.statusBadge} ${STATUS_STYLE[review.status]}`}>
            {review.status}
          </span>
        </div>
        <div className={styles.detailMeta}>
          <span>요청자: {review.requester}</span>
          <span>프로젝트: {review.projectName}</span>
          <span>마감: {review.deadline}</span>
          <span>{review.createdAt}</span>
        </div>
      </div>

      {/* Body - 2 Column */}
      <div className={styles.detailBody}>
        {/* Left: Design Preview + Description */}
        <div className={styles.detailLeft}>
          {/* Preview Images */}
          {review.previewImages.length > 0 ? (
            <div className={styles.previewSection}>
              <div className={styles.previewMain}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={review.previewImages[selectedImgIdx]?.url}
                  alt="디자인 미리보기"
                  className={styles.previewImg}
                />
                {review.previewImages[selectedImgIdx]?.reason && (
                  <div className={styles.previewCaption}>
                    {review.previewImages[selectedImgIdx].reason}
                  </div>
                )}
              </div>
              {review.previewImages.length > 1 && (
                <div className={styles.previewThumbs}>
                  {review.previewImages.map((img, idx) => (
                    <button
                      key={idx}
                      type="button"
                      className={`${styles.previewThumb} ${idx === selectedImgIdx ? styles.previewThumbActive : ""}`}
                      onClick={() => setSelectedImgIdx(idx)}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={img.url} alt="" className={styles.previewThumbImg} />
                    </button>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className={styles.previewEmpty}>
              <IconPhoto size={20} />
              <span>미리보기 이미지 없음</span>
            </div>
          )}

          {/* Description */}
          {review.description && (
            <div className={styles.section}>
              <div className={styles.sectionTitle}>리뷰 설명</div>
              <div className={styles.descriptionContent}>
                {review.description.split("\n").map((line, i) => (
                  <p key={i}>{line || "\u00A0"}</p>
                ))}
              </div>
            </div>
          )}

          {/* Figma link in left column */}
          {figmaLink && (
            <a
              href={figmaLink}
              target="_blank"
              rel="noopener noreferrer"
              className={styles.btnFigma}
            >
              <IconBrandFigma size={14} />
              Figma에서 보기
              <IconExternalLink size={11} />
            </a>
          )}
        </div>

        {/* Right: Feedbacks (scroll) + Editor (fixed bottom) */}
        <div className={styles.detailRight}>
          {/* Scrollable feedback list */}
          <div className={styles.detailRightScroll} ref={feedbackScrollRef}>
            <div className={styles.section}>
              <div className={styles.sectionTitle}>
                피드백
                <span className={styles.sectionCount}>{review.feedbacks.length}</span>
              </div>

              {review.feedbacks.length === 0 ? (
                <div className={styles.noFeedback}>
                  <IconMessagePlus size={16} />
                  아직 피드백이 없습니다. 첫 번째 피드백을 남겨보세요.
                </div>
              ) : (
                <div className={styles.feedbackList}>
                  {review.feedbacks.map((fb) => (
                    <div key={fb.id} className={styles.feedbackItem}>
                      <div className={styles.feedbackHeader}>
                        <span className={styles.feedbackAuthor}>
                          <span className={styles.authorInitial}>{fb.author.name.charAt(0)}</span>
                          {fb.author.name}
                        </span>
                        <div className={styles.feedbackBadges}>
                          <span className={styles.categoryBadge}>
                            {CATEGORY_LABELS[fb.category] ?? fb.category}
                          </span>
                          <span className={`${styles.typeBadge} ${TYPE_STYLE[fb.type] ?? ""}`}>
                            {fb.type === "APPROVAL" && <IconCheck size={9} />}
                            {fb.type === "CHANGE_REQUEST" && <IconAlertCircle size={9} />}
                            {TYPE_LABELS[fb.type] ?? fb.type}
                          </span>
                        </div>
                      </div>
                      <div
                        className={styles.feedbackContent}
                        dangerouslySetInnerHTML={{ __html: renderMarkdown(fb.content) }}
                      />
                      <div className={styles.feedbackTime}>
                        {new Date(fb.createdAt).toLocaleDateString("ko-KR")}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Fixed editor at bottom */}
          <div className={styles.detailRightFixed}>
            <div className={styles.section}>
              <div className={styles.sectionTitle}>피드백 작성</div>
              <div className={styles.feedbackForm}>
                <div className={styles.fbFormRow}>
                  <select
                    className={styles.fbSelect}
                    value={fbAuthorId}
                    onChange={(e) => setFbAuthorId(e.target.value)}
                  >
                    <option value="">작성자</option>
                    {users.map((u) => (
                      <option key={u.id} value={u.id}>{u.name} ({u.part})</option>
                    ))}
                  </select>
                  <select
                    className={styles.fbSelect}
                    value={fbCategory}
                    onChange={(e) => setFbCategory(e.target.value)}
                  >
                    <option value="UI">UI</option>
                    <option value="UX">UX</option>
                    <option value="A11Y">접근성</option>
                    <option value="TECHNICAL">기술</option>
                    <option value="OTHER">기타</option>
                  </select>
                  <select
                    className={styles.fbSelect}
                    value={fbType}
                    onChange={(e) => setFbType(e.target.value)}
                  >
                    <option value="COMMENT">코멘트</option>
                    <option value="CHANGE_REQUEST">수정 요청</option>
                    <option value="APPROVAL">승인</option>
                  </select>
                </div>
                <RichEditor
                  content={fbContent}
                  onChange={setFbContent}
                  attachments={fbAttachments}
                  onAttachmentsChange={setFbAttachments}
                  placeholder="마크다운으로 피드백을 작성하세요..."
                  minHeight={80}
                />
                <div className={styles.fbActions}>
                  <button
                    type="button"
                    className={styles.btnFeedback}
                    disabled={!fbContent.trim() || !fbAuthorId || fbSubmitting}
                    onClick={handleSubmitFeedback}
                  >
                    <IconSend size={12} />
                    {fbSubmitting ? "등록 중..." : "피드백 등록"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>{/* close detailRight */}
      </div>
    </>
  );
}
