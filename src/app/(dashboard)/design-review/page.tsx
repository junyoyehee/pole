"use client";

import { useState, useMemo } from "react";
import Header from "@/components/Header";
import {
  IconPlus,
  IconSearch,
  IconMessage,
  IconCalendar,
  IconExternalLink,
  IconBrandFigma,
} from "@tabler/icons-react";
import styles from "./page.module.css";

type ReviewStatus = "진행중" | "수정중" | "승인완료";

interface Reviewer {
  name: string;
  initial: string;
  color: string;
  bgColor: string;
}

interface DesignReview {
  id: number;
  title: string;
  figmaLink: string;
  requester: string;
  requesterInitial: string;
  reviewers: Reviewer[];
  status: ReviewStatus;
  deadline: string;
  feedbackCount: number;
  createdAt: string;
  description: string;
}

const REVIEWS: DesignReview[] = [
  {
    id: 1,
    title: "로그인 화면 v3 리뷰",
    figmaLink: "https://figma.com/file/abc123",
    requester: "김디자",
    requesterInitial: "김",
    reviewers: [
      { name: "일달러", initial: "일", color: "var(--blue)", bgColor: "var(--blue-dim)" },
      { name: "김민수", initial: "김", color: "var(--accent)", bgColor: "var(--accent-dim)" },
      { name: "최지은", initial: "최", color: "var(--orange)", bgColor: "var(--orange-dim)" },
    ],
    status: "진행중",
    deadline: "2026.03.15",
    feedbackCount: 4,
    createdAt: "2026.03.10",
    description: "로그인 페이지 UI 개선 - 소셜 로그인 추가 및 레이아웃 변경",
  },
  {
    id: 2,
    title: "대시보드 메인 위젯 리디자인",
    figmaLink: "https://figma.com/file/def456",
    requester: "윤서아",
    requesterInitial: "윤",
    reviewers: [
      { name: "정하늘", initial: "정", color: "var(--green)", bgColor: "var(--green-dim)" },
      { name: "일달러", initial: "일", color: "var(--blue)", bgColor: "var(--blue-dim)" },
    ],
    status: "수정중",
    deadline: "2026.03.14",
    feedbackCount: 7,
    createdAt: "2026.03.08",
    description: "대시보드 핵심 위젯 카드 스타일 및 데이터 시각화 개선",
  },
  {
    id: 3,
    title: "모바일 네비게이션 바 디자인",
    figmaLink: "https://figma.com/file/ghi789",
    requester: "김디자",
    requesterInitial: "김",
    reviewers: [
      { name: "박서연", initial: "박", color: "var(--accent)", bgColor: "var(--accent-dim)" },
      { name: "최유진", initial: "최", color: "var(--orange)", bgColor: "var(--orange-dim)" },
      { name: "김민수", initial: "김", color: "var(--blue)", bgColor: "var(--blue-dim)" },
      { name: "조수빈", initial: "조", color: "var(--green)", bgColor: "var(--green-dim)" },
    ],
    status: "승인완료",
    deadline: "2026.03.12",
    feedbackCount: 5,
    createdAt: "2026.03.05",
    description: "반응형 모바일 하단 네비게이션 및 제스처 인터랙션",
  },
  {
    id: 4,
    title: "프로필 설정 페이지 UI",
    figmaLink: "https://figma.com/file/jkl012",
    requester: "윤서아",
    requesterInitial: "윤",
    reviewers: [
      { name: "일달러", initial: "일", color: "var(--blue)", bgColor: "var(--blue-dim)" },
      { name: "정하늘", initial: "정", color: "var(--green)", bgColor: "var(--green-dim)" },
    ],
    status: "진행중",
    deadline: "2026.03.18",
    feedbackCount: 2,
    createdAt: "2026.03.12",
    description: "사용자 프로필 편집, 알림 설정, 테마 설정 페이지",
  },
  {
    id: 5,
    title: "알림 센터 드롭다운 디자인",
    figmaLink: "https://figma.com/file/mno345",
    requester: "김디자",
    requesterInitial: "김",
    reviewers: [
      { name: "김민수", initial: "김", color: "var(--accent)", bgColor: "var(--accent-dim)" },
      { name: "최지은", initial: "최", color: "var(--orange)", bgColor: "var(--orange-dim)" },
    ],
    status: "수정중",
    deadline: "2026.03.16",
    feedbackCount: 3,
    createdAt: "2026.03.11",
    description: "실시간 알림 목록, 읽음/안읽음 상태, 알림 카테고리 필터",
  },
  {
    id: 6,
    title: "온보딩 플로우 일러스트",
    figmaLink: "https://figma.com/file/pqr678",
    requester: "윤서아",
    requesterInitial: "윤",
    reviewers: [
      { name: "정하늘", initial: "정", color: "var(--green)", bgColor: "var(--green-dim)" },
      { name: "최유진", initial: "최", color: "var(--orange)", bgColor: "var(--orange-dim)" },
      { name: "일달러", initial: "일", color: "var(--blue)", bgColor: "var(--blue-dim)" },
    ],
    status: "승인완료",
    deadline: "2026.03.10",
    feedbackCount: 6,
    createdAt: "2026.03.03",
    description: "신규 사용자 온보딩 3단계 플로우 및 일러스트레이션",
  },
];

const STATUS_TABS: (ReviewStatus | null)[] = [null, "진행중", "수정중", "승인완료"];
const STATUS_LABELS: Record<string, string> = {
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

  const filtered = useMemo(() => {
    return REVIEWS.filter((r) => {
      if (activeStatus && r.status !== activeStatus) return false;
      if (search && !r.title.toLowerCase().includes(search.toLowerCase()) && !r.requester.includes(search)) return false;
      return true;
    });
  }, [activeStatus, search]);

  const statusCounts = useMemo(() => {
    const base = search
      ? REVIEWS.filter((r) => r.title.toLowerCase().includes(search.toLowerCase()) || r.requester.includes(search))
      : REVIEWS;
    return {
      all: base.length,
      "진행중": base.filter((r) => r.status === "진행중").length,
      "수정중": base.filter((r) => r.status === "수정중").length,
      "승인완료": base.filter((r) => r.status === "승인완료").length,
    };
  }, [search]);

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
          <button className={styles.btnPrimary}>
            <IconPlus size={12} />
            리뷰 요청
          </button>
        </div>

        {/* Filter Bar */}
        <div className={styles.filterBar}>
          {STATUS_TABS.map((status) => {
            const key = status ?? "all";
            const label = STATUS_LABELS[key];
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

        {/* Review List */}
        {filtered.length === 0 && (
          <div className={styles.emptyState}>검색 결과가 없습니다.</div>
        )}

        <div className={styles.reviewList}>
          {filtered.map((review) => (
            <div key={review.id} className={styles.reviewCard}>
              <div className={styles.cardTop}>
                <div className={styles.cardTitleRow}>
                  <h3 className={styles.cardTitle}>{review.title}</h3>
                  <span className={`${styles.statusBadge} ${STATUS_STYLE[review.status]}`}>
                    {review.status}
                  </span>
                </div>
                <p className={styles.cardDescription}>{review.description}</p>
              </div>

              <div className={styles.cardMeta}>
                <div className={styles.metaLeft}>
                  {/* Figma Link */}
                  <span className={styles.figmaTag}>
                    <IconBrandFigma size={13} />
                    Figma
                    <IconExternalLink size={11} />
                  </span>

                  {/* Requester */}
                  <span className={styles.metaItem}>
                    <span className={styles.requesterAvatar}>{review.requesterInitial}</span>
                    {review.requester}
                  </span>

                  {/* Deadline */}
                  <span className={styles.metaItem}>
                    <IconCalendar size={13} />
                    {review.deadline}
                  </span>

                  {/* Feedback Count */}
                  <span className={styles.metaItem}>
                    <IconMessage size={13} />
                    {review.feedbackCount}
                  </span>
                </div>

                <div className={styles.metaRight}>
                  {/* Reviewers */}
                  <div className={styles.reviewerAvatars}>
                    {review.reviewers.map((reviewer, i) => (
                      <div
                        key={i}
                        className={styles.reviewerAvatar}
                        style={{ background: reviewer.bgColor, color: reviewer.color, zIndex: review.reviewers.length - i }}
                        title={reviewer.name}
                      >
                        {reviewer.initial}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
