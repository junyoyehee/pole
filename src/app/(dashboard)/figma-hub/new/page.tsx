"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import Header from "@/components/Header";
import RichEditor, { fileToDataUrl } from "@/components/RichEditor";
import {
  IconArrowLeft,
  IconPhoto,
  IconClipboard,
  IconUpload,
  IconX,
  IconSend,
} from "@tabler/icons-react";
import styles from "./page.module.css";

export default function NewProjectPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const thumbnailAreaRef = useRef<HTMLDivElement>(null);

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [designerId, setDesignerId] = useState("");
  const [status, setStatus] = useState("DESIGNING");
  const [thumbnail, setThumbnail] = useState<string | null>(null);
  const [users, setUsers] = useState<{ id: string; name: string; part: string }[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    fetch("/api/v1/users")
      .then((res) => res.json())
      .then((data) => {
        if (data.success) setUsers(data.data.items ?? data.data ?? []);
      })
      .catch(() => {});
  }, []);

  // 클립보드 붙여넣기 (전체 페이지)
  const handlePaste = useCallback((e: ClipboardEvent) => {
    const items = e.clipboardData?.items;
    if (!items) return;
    for (const item of items) {
      if (item.type.startsWith("image/")) {
        e.preventDefault();
        const file = item.getAsFile();
        if (file) {
          fileToDataUrl(file).then(setThumbnail);
        }
        return;
      }
    }
  }, []);

  useEffect(() => {
    document.addEventListener("paste", handlePaste);
    return () => document.removeEventListener("paste", handlePaste);
  }, [handlePaste]);

  function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    fileToDataUrl(file).then(setThumbnail);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  async function handleClipboardBtn() {
    try {
      const items = await navigator.clipboard.read();
      for (const item of items) {
        const imageType = item.types.find((t) => t.startsWith("image/"));
        if (imageType) {
          const blob = await item.getType(imageType);
          const dataUrl = await fileToDataUrl(
            new File([blob], "clipboard.png", { type: imageType })
          );
          setThumbnail(dataUrl);
          return;
        }
      }
    } catch {}
  }

  async function handleSubmit() {
    if (!name.trim() || !designerId) return;
    setSubmitting(true);
    setErrorMsg("");

    try {
      const res = await fetch("/api/v1/figma-projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim() || null,
          designerId,
          status,
          thumbnailUrl: thumbnail,
        }),
      });
      const data = await res.json();
      if (data.success) {
        router.push("/figma-hub");
      } else {
        setErrorMsg(data.error?.message || "등록에 실패했습니다.");
      }
    } catch {
      setErrorMsg("등록에 실패했습니다.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <Header breadcrumb="피그마 허브 / 새 프로젝트" />
      <div className={styles.content}>
        {/* Header */}
        <div className={styles.pageHeader}>
          <div>
            <div className={styles.pageTitle}>새 프로젝트</div>
            <div className={styles.pageSubtitle}>새로운 디자인 프로젝트를 등록합니다</div>
          </div>
        </div>

        {/* Form */}
        <div className={styles.form}>
          {/* 프로젝트명 */}
          <div className={styles.fieldGroup}>
            <label className={styles.label}>
              프로젝트명 <span className={styles.required}>*</span>
            </label>
            <input
              type="text"
              className={styles.input}
              placeholder="예: 모바일 앱 v3 리디자인"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          {/* 담당 디자이너 + 상태 */}
          <div className={styles.fieldRow}>
            <div className={styles.fieldGroup}>
              <label className={styles.label}>
                담당 디자이너 <span className={styles.required}>*</span>
              </label>
              <select
                className={styles.select}
                value={designerId}
                onChange={(e) => setDesignerId(e.target.value)}
              >
                <option value="">선택하세요</option>
                {users.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name} ({u.part})
                  </option>
                ))}
              </select>
            </div>
            <div className={styles.fieldGroup}>
              <label className={styles.label}>상태</label>
              <select
                className={styles.select}
                value={status}
                onChange={(e) => setStatus(e.target.value)}
              >
                <option value="DESIGNING">디자인중</option>
                <option value="IN_REVIEW">리뷰중</option>
                <option value="IN_DEV">개발중</option>
                <option value="DONE">완료</option>
              </select>
            </div>
          </div>

          {/* 설명 */}
          <div className={styles.fieldGroup}>
            <label className={styles.label}>설명</label>
            <RichEditor
              content={description}
              onChange={setDescription}
              placeholder="프로젝트 목적, 범위, 일정 등을 입력하세요&#10;&#10;**굵게**, *기울임*, ### 제목, - 목록&#10;이미지를 Ctrl+V로 붙여넣을 수 있습니다"
              minHeight={120}
            />
          </div>

          <div className={styles.divider} />

          {/* 썸네일 */}
          <div className={styles.fieldGroup}>
            <label className={styles.label}>
              <IconPhoto size={12} />
              썸네일 이미지
            </label>
            <div className={styles.helperText}>
              이미지를 Ctrl+V로 붙여넣거나 파일을 업로드할 수 있습니다
            </div>

            {thumbnail ? (
              <div className={styles.thumbnailPreview}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={thumbnail} alt="썸네일" className={styles.thumbnailImg} />
                <button
                  type="button"
                  className={styles.thumbnailRemove}
                  onClick={() => setThumbnail(null)}
                >
                  <IconX size={14} />
                </button>
              </div>
            ) : (
              <div
                ref={thumbnailAreaRef}
                className={styles.thumbnailEmpty}
                onClick={() => fileInputRef.current?.click()}
              >
                <IconPhoto size={24} />
                <span>클릭하여 이미지 업로드</span>
                <span className={styles.thumbnailHint}>또는 Ctrl+V로 붙여넣기</span>
              </div>
            )}

            <div className={styles.thumbnailActions}>
              <button
                type="button"
                className={styles.btnSecondary}
                onClick={() => fileInputRef.current?.click()}
              >
                <IconUpload size={12} />
                파일 선택
              </button>
              <button
                type="button"
                className={styles.btnSecondary}
                onClick={handleClipboardBtn}
              >
                <IconClipboard size={12} />
                클립보드에서
              </button>
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              style={{ display: "none" }}
              onChange={handleFileUpload}
            />
          </div>

          {errorMsg && <div className={styles.errorMessage}>{errorMsg}</div>}

          {/* Actions */}
          <div className={styles.actions}>
            <button
              type="button"
              className={styles.btnCancel}
              onClick={() => router.push("/figma-hub")}
            >
              <IconArrowLeft size={12} />
              취소
            </button>
            <button
              type="button"
              className={styles.btnSubmit}
              disabled={!name.trim() || !designerId || submitting}
              onClick={handleSubmit}
            >
              <IconSend size={12} />
              {submitting ? "등록 중..." : "프로젝트 등록"}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
