"use client";

import { IconSearch, IconBell, IconMoon } from "@tabler/icons-react";
import styles from "./Header.module.css";

interface HeaderProps {
  breadcrumb?: string;
}

export default function Header({ breadcrumb = "대시보드" }: HeaderProps) {
  return (
    <header className={styles.header}>
      <div className={styles.breadcrumb}>
        <span className={styles.current}>{breadcrumb}</span>
      </div>
      <div className={styles.actions}>
        <button className={styles.iconBtn}>
          <IconSearch size={14} />
        </button>
        <button className={styles.iconBtn}>
          <IconBell size={14} />
          <span className={styles.notiDot} />
        </button>
        <button className={styles.iconBtn}>
          <IconMoon size={14} />
        </button>
      </div>
    </header>
  );
}
