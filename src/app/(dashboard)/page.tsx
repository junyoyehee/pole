"use client";

import Link from "next/link";
import {
  IconPalette,
  IconMessageCircle,
  IconSearch,
  IconArrowRight,
  IconBrandFigma,
} from "@tabler/icons-react";
import Header from "@/components/Header";
import styles from "./page.module.css";

const TOOLS = [
  {
    title: "피그마 허브",
    description: "Figma 프로젝트를 관리하고 최근 탐색 기록을 한눈에 파악합니다",
    href: "/figma-hub",
    icon: <IconPalette size={22} />,
    color: "#A78BFA",
  },
  {
    title: "디자인 리뷰",
    description: "디자인 리뷰를 요청하고 피드백을 주고받습니다",
    href: "/design-review",
    icon: <IconMessageCircle size={22} />,
    color: "#34D399",
  },
  {
    title: "Figma 탐색기",
    description: "Figma 파일의 노드 구조를 탐색하고 HTML로 내보냅니다",
    href: "/figma-explorer",
    icon: <IconSearch size={22} />,
    color: "#60A5FA",
  },
  {
    title: "핸드오프",
    description: "디자인-개발 간 핸드오프 현황을 추적합니다",
    href: "/handoff",
    icon: <IconArrowRight size={22} />,
    color: "#F472B6",
  },
];

export default function DashboardPage() {
  return (
    <>
      <Header breadcrumb="홈" />

      <div className={styles.content}>
        <div className={styles.pageHeader}>
          <div className={styles.heroIcon}>
            <IconBrandFigma size={28} />
          </div>
          <div>
            <div className={styles.pageTitle}>Figma Explorer</div>
            <div className={styles.pageSubtitle}>
              Figma 디자인 작업을 위한 도구 모음
            </div>
          </div>
        </div>

        <div className={styles.toolGrid}>
          {TOOLS.map((tool) => (
            <Link key={tool.href} href={tool.href} className={styles.toolCard}>
              <div
                className={styles.toolIcon}
                style={{ background: `${tool.color}20`, color: tool.color }}
              >
                {tool.icon}
              </div>
              <div className={styles.toolTitle}>{tool.title}</div>
              <div className={styles.toolDesc}>{tool.description}</div>
              <div className={styles.toolArrow} style={{ color: tool.color }}>
                바로가기 →
              </div>
            </Link>
          ))}
        </div>
      </div>
    </>
  );
}
