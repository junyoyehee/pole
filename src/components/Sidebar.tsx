"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import {
  IconBrandFigma,
  IconPalette,
  IconMessageCircle,
  IconSearch,
  IconArrowRight,
  IconSettings,
} from "@tabler/icons-react";
import styles from "./Sidebar.module.css";

interface NavItem {
  label: string;
  href: string;
  icon: React.ReactNode;
  badge?: number;
}

interface NavSection {
  title: string;
  items: NavItem[];
}

const NAV_SECTIONS: NavSection[] = [
  {
    title: "Figma",
    items: [
      { label: "피그마 허브", href: "/figma-hub", icon: <IconPalette size={15} /> },
      { label: "디자인 리뷰", href: "/design-review", icon: <IconMessageCircle size={15} /> },
      { label: "Figma 탐색기", href: "/figma-explorer", icon: <IconSearch size={15} /> },
      { label: "핸드오프", href: "/handoff", icon: <IconArrowRight size={15} /> },
    ],
  },
  {
    title: "설정",
    items: [
      { label: "설정", href: "/settings", icon: <IconSettings size={15} /> },
    ],
  },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className={styles.sidebar}>
      <div className={styles.header}>
        <div className={styles.logo}>
          <IconBrandFigma size={14} />
        </div>
        <span className={styles.title}>Figma Explorer</span>
      </div>

      <nav className={styles.nav}>
        {NAV_SECTIONS.map((section) => (
          <div key={section.title} className={styles.section}>
            <div className={styles.sectionTitle}>{section.title}</div>
            {section.items.map((item) => {
              const isActive =
                item.href === "/"
                  ? pathname === "/"
                  : pathname.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`${styles.navItem} ${isActive ? styles.active : ""}`}
                >
                  <span className={styles.navIcon}>{item.icon}</span>
                  {item.label}
                  {item.badge && (
                    <span className={styles.badge}>{item.badge}</span>
                  )}
                </Link>
              );
            })}
          </div>
        ))}
      </nav>

      <div className={styles.footer}>
        <div className={styles.userCard}>
          <div className={styles.userAvatar}>일</div>
          <div style={{ flex: 1 }}>
            <div className={styles.userName}>일달러</div>
            <div className={styles.userRole}>Frontend Lead</div>
          </div>
          <div className={`${styles.statusDot} ${styles.online}`} />
        </div>
      </div>
    </aside>
  );
}
