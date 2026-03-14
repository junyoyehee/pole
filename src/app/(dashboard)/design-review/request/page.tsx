"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Header from "@/components/Header";
import {
  IconArrowLeft,
  IconSend,
  IconCheck,
  IconSparkles,
  IconLoader2,
  IconUpload,
  IconClipboard,
  IconX,
  IconPhoto,
} from "@tabler/icons-react";
import styles from "./page.module.css";

interface FigmaProject {
  id: string;
  name: string;
  figmaUrl?: string;
}

interface User {
  id: string;
  name: string;
  part: string;
}

interface PreviewImage {
  nodeId?: string;
  url: string;
  reason?: string;
  source: "ai" | "upload" | "clipboard";
}

function isFigmaUrl(url: string): boolean {
  try {
    return new URL(url).hostname.includes("figma.com");
  } catch {
    return false;
  }
}

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

async function urlToDataUrl(url: string): Promise<string> {
  const res = await fetch(url);
  const blob = await res.blob();
  return fileToDataUrl(new File([blob], "image.png", { type: blob.type }));
}

export default function DesignReviewRequestPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const autoAnalyzeTriggered = useRef(false);

  const [title, setTitle] = useState("");
  const [figmaProjectId, setFigmaProjectId] = useState("");
  const [figmaUrl, setFigmaUrl] = useState(searchParams.get("figmaUrl") || "");
  const [description, setDescription] = useState("");
  const [authorId, setAuthorId] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [selectedReviewers, setSelectedReviewers] = useState<string[]>([]);
  const [previewImages, setPreviewImages] = useState<PreviewImage[]>([]);
  const [selectedImageIdx, setSelectedImageIdx] = useState(0);

  const [projects, setProjects] = useState<FigmaProject[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [analyzed, setAnalyzed] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    fetch("/api/v1/figma-projects")
      .then((res) => res.json())
      .then((data) => {
        if (data.success) setProjects(data.data.items ?? data.data ?? []);
      })
      .catch(() => {});

    fetch("/api/v1/users")
      .then((res) => res.json())
      .then((data) => {
        if (data.success) setUsers(data.data.items ?? data.data ?? []);
      })
      .catch(() => {});
  }, []);

  // URL 파라미터로 figmaUrl이 전달된 경우 데이터 로드 후 자동 분석
  useEffect(() => {
    if (
      !autoAnalyzeTriggered.current &&
      figmaUrl &&
      isFigmaUrl(figmaUrl) &&
      projects.length > 0 &&
      users.length > 0
    ) {
      autoAnalyzeTriggered.current = true;
      handleAnalyze();
    }
  }, [projects, users]); // eslint-disable-line react-hooks/exhaustive-deps

  // 클립보드 붙여넣기
  const handlePaste = useCallback((e: ClipboardEvent) => {
    const items = e.clipboardData?.items;
    if (!items) return;

    for (const item of items) {
      if (item.type.startsWith("image/")) {
        e.preventDefault();
        const file = item.getAsFile();
        if (file) {
          fileToDataUrl(file).then((dataUrl) => {
            setPreviewImages((prev) => [
              ...prev,
              { url: dataUrl, reason: "클립보드에서 붙여넣기", source: "clipboard" },
            ]);
          });
        }
        break;
      }
    }
  }, []);

  useEffect(() => {
    document.addEventListener("paste", handlePaste);
    return () => document.removeEventListener("paste", handlePaste);
  }, [handlePaste]);

  function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (!files) return;

    Array.from(files).forEach(async (file) => {
      if (!file.type.startsWith("image/")) return;
      const dataUrl = await fileToDataUrl(file);
      setPreviewImages((prev) => [
        ...prev,
        { url: dataUrl, reason: `파일 업로드: ${file.name}`, source: "upload" },
      ]);
    });

    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function removeImage(idx: number) {
    setPreviewImages((prev) => prev.filter((_, i) => i !== idx));
    if (selectedImageIdx >= idx && selectedImageIdx > 0) {
      setSelectedImageIdx(selectedImageIdx - 1);
    }
  }

  function toggleReviewer(userId: string) {
    setSelectedReviewers((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]
    );
  }

  async function handleAnalyze() {
    if (!figmaUrl.trim() || !isFigmaUrl(figmaUrl) || analyzing) return;

    setAnalyzing(true);
    setAnalyzed(false);
    setErrorMsg("");

    try {
      const res = await fetch("/api/figma/ai-review-analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          figmaUrl: figmaUrl.trim(),
          projects: projects.map((p) => ({ id: p.id, name: p.name, figmaUrl: p.figmaUrl })),
          users: users.map((u) => ({ id: u.id, name: u.name, part: u.part })),
        }),
      });

      const data = await res.json();

      if (data.success && data.data) {
        const d = data.data;
        if (d.title) setTitle(d.title);
        if (d.figmaProjectId) setFigmaProjectId(d.figmaProjectId);
        if (d.description) setDescription(d.description);
        if (d.suggestedReviewers && d.suggestedReviewers.length > 0) {
          setSelectedReviewers(d.suggestedReviewers);
        }

        // AI 추천 이미지
        if (d.previewImages && d.previewImages.length > 0) {
          const aiImages: PreviewImage[] = d.previewImages.map(
            (img: { nodeId?: string; url: string; reason?: string }) => ({
              ...img,
              source: "ai" as const,
            })
          );
          setPreviewImages((prev) => {
            const userImages = prev.filter((p) => p.source !== "ai");
            return [...aiImages, ...userImages];
          });
          setSelectedImageIdx(0);
        }

        setAnalyzed(true);
      } else {
        setErrorMsg(data.error || "AI 분석에 실패했습니다.");
      }
    } catch {
      setErrorMsg("AI 분석 서버 연결에 실패했습니다.");
    } finally {
      setAnalyzing(false);
    }
  }

  const canSubmit = title.trim() && figmaProjectId && authorId;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit || submitting) return;

    setSubmitting(true);
    setErrorMsg("");
    setSuccessMsg("");

    try {
      const url = figmaUrl.trim();
      let extractedNodeId: string | undefined;
      if (url) {
        try {
          const parsed = new URL(url);
          const nodeParam = parsed.searchParams.get("node-id");
          if (nodeParam) extractedNodeId = nodeParam;
        } catch {}
      }

      // AI 이미지 URL을 base64로 변환
      const savedImages = await Promise.all(
        previewImages.map(async (img) => {
          let dataUrl = img.url;
          if (img.source === "ai" && img.url.startsWith("http")) {
            try {
              dataUrl = await urlToDataUrl(img.url);
            } catch {}
          }
          return { url: dataUrl, source: img.source, reason: img.reason || "" };
        })
      );

      const res = await fetch("/api/v1/design-reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          figmaProjectId,
          figmaNodeId: extractedNodeId,
          figmaUrl: url || undefined,
          description: description.trim() || undefined,
          authorId,
          dueDate: dueDate || undefined,
          previewImages: savedImages.length > 0 ? savedImages : undefined,
        }),
      });

      const data = await res.json();

      if (data.success) {
        setSuccessMsg("디자인 리뷰가 등록되었습니다.");
        setTimeout(() => router.push("/design-review"), 1200);
      } else {
        setErrorMsg(data.error?.message || "등록에 실패했습니다.");
      }
    } catch {
      setErrorMsg("서버 연결에 실패했습니다.");
    } finally {
      setSubmitting(false);
    }
  }

  const mainPreview = previewImages[selectedImageIdx];

  return (
    <>
      <Header breadcrumb="디자인 리뷰 / 리뷰 요청" />
      <div className={styles.content}>
        <div className={styles.pageHeader}>
          <div>
            <div className={styles.pageTitle}>리뷰 요청</div>
            <div className={styles.pageSubtitle}>
              Figma URL로 AI 분석하여 리뷰 요청을 자동으로 작성합니다
            </div>
          </div>
        </div>

        {successMsg && (
          <div className={styles.successMessage}>
            <IconCheck size={14} />
            {successMsg}
          </div>
        )}
        {errorMsg && <div className={styles.errorMessage}>{errorMsg}</div>}

        <form className={styles.form} onSubmit={handleSubmit}>
          {/* AI 분석 */}
          <div className={styles.sectionTitle}>
            <IconSparkles size={14} />
            AI 자동 분석
          </div>

          <div className={styles.fieldGroup}>
            <label className={styles.label}>Figma URL</label>
            <div className={styles.analyzeRow}>
              <input
                type="text"
                className={styles.input}
                placeholder="https://www.figma.com/design/abc123?node-id=123:456"
                value={figmaUrl}
                onChange={(e) => {
                  setFigmaUrl(e.target.value);
                  setAnalyzed(false);
                }}
                style={{ flex: 1 }}
              />
              <button
                type="button"
                className={styles.btnAnalyze}
                disabled={!isFigmaUrl(figmaUrl) || analyzing}
                onClick={handleAnalyze}
              >
                {analyzing ? (
                  <>
                    <IconLoader2 size={13} className={styles.spinner} />
                    분석 중...
                  </>
                ) : (
                  <>
                    <IconSparkles size={13} />
                    AI 분석
                  </>
                )}
              </button>
            </div>
            <span className={styles.helperText}>
              Figma 링크를 입력하고 AI 분석을 실행하면 제목, 설명, 리뷰어가 자동으로 채워집니다
            </span>
          </div>

          {analyzed && (
            <div className={styles.analyzedBanner}>
              <IconCheck size={12} />
              AI 분석이 완료되었습니다. 아래 내용을 확인하고 수정하세요.
            </div>
          )}

          <div className={styles.divider} />

          {/* 미리보기 이미지 */}
          <div className={styles.sectionTitle}>
            <IconPhoto size={14} />
            미리보기 이미지
            {previewImages.some((p) => p.source === "ai") && (
              <span className={styles.autoFillBadge}>
                <IconSparkles size={9} />
                AI 추천
              </span>
            )}
          </div>

          <div className={styles.previewMain}>
            {mainPreview ? (
              <>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={mainPreview.url} alt="미리보기" className={styles.previewMainImg} />
                {mainPreview.reason && (
                  <div className={styles.previewReason}>
                    {mainPreview.source === "ai" && <IconSparkles size={10} />}
                    {mainPreview.reason}
                  </div>
                )}
              </>
            ) : (
              <div className={styles.previewEmpty}>
                <IconPhoto size={24} />
                <span>AI 분석으로 이미지를 가져오거나</span>
                <span>클립보드 붙여넣기(Ctrl+V) / 파일 업로드로 추가하세요</span>
              </div>
            )}
          </div>

          <div className={styles.previewThumbs}>
            {previewImages.map((img, idx) => (
              <div
                key={idx}
                className={`${styles.thumbWrap} ${idx === selectedImageIdx ? styles.thumbActive : ""}`}
                onClick={() => setSelectedImageIdx(idx)}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={img.url} alt="" className={styles.thumbImg} />
                <span className={styles.thumbSource}>
                  {img.source === "ai" ? "AI" : img.source === "clipboard" ? "붙여넣기" : "업로드"}
                </span>
                <button
                  type="button"
                  className={styles.thumbRemove}
                  onClick={(e) => {
                    e.stopPropagation();
                    removeImage(idx);
                  }}
                >
                  <IconX size={10} />
                </button>
              </div>
            ))}

            <button
              type="button"
              className={styles.thumbAdd}
              onClick={() => fileInputRef.current?.click()}
              title="파일에서 이미지 선택"
            >
              <IconUpload size={14} />
              <span>파일</span>
            </button>
            <button
              type="button"
              className={styles.thumbAdd}
              onClick={() =>
                navigator.clipboard
                  .read()
                  .then((items) => {
                    for (const item of items) {
                      const imageType = item.types.find((t) => t.startsWith("image/"));
                      if (imageType) {
                        item.getType(imageType).then((blob) => {
                          fileToDataUrl(new File([blob], "clipboard.png", { type: imageType })).then(
                            (dataUrl) => {
                              setPreviewImages((prev) => [
                                ...prev,
                                { url: dataUrl, reason: "클립보드에서 붙여넣기", source: "clipboard" },
                              ]);
                            }
                          );
                        });
                      }
                    }
                  })
                  .catch(() => {})
              }
              title="클립보드에서 붙여넣기 (또는 Ctrl+V)"
            >
              <IconClipboard size={14} />
              <span>붙여넣기</span>
            </button>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              style={{ display: "none" }}
              onChange={handleFileUpload}
            />
          </div>

          <div className={styles.divider} />

          {/* 기본 정보 */}
          <div className={styles.sectionTitle}>기본 정보</div>

          <div className={styles.fieldGroup}>
            <label className={styles.label}>
              리뷰 제목 <span className={styles.required}>*</span>
              {analyzed && title && (
                <span className={styles.autoFillBadge}><IconSparkles size={9} /> AI</span>
              )}
            </label>
            <input
              type="text"
              className={styles.input}
              placeholder="예: 로그인 화면 v2 리뷰"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>

          <div className={styles.fieldRow}>
            <div className={styles.fieldGroup}>
              <label className={styles.label}>
                Figma 프로젝트 <span className={styles.required}>*</span>
                {analyzed && figmaProjectId && (
                  <span className={styles.autoFillBadge}><IconSparkles size={9} /> AI</span>
                )}
              </label>
              <select
                className={styles.select}
                value={figmaProjectId}
                onChange={(e) => setFigmaProjectId(e.target.value)}
              >
                <option value="">프로젝트 선택</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>

            <div className={styles.fieldGroup}>
              <label className={styles.label}>
                요청자 <span className={styles.required}>*</span>
              </label>
              <select
                className={styles.select}
                value={authorId}
                onChange={(e) => setAuthorId(e.target.value)}
              >
                <option value="">요청자 선택</option>
                {users.map((u) => (
                  <option key={u.id} value={u.id}>{u.name} ({u.part})</option>
                ))}
              </select>
            </div>
          </div>

          <div className={styles.divider} />

          {/* 리뷰 상세 */}
          <div className={styles.sectionTitle}>
            리뷰 상세
            {analyzed && description && (
              <span className={styles.autoFillBadge}><IconSparkles size={9} /> AI</span>
            )}
          </div>

          <div className={styles.fieldGroup}>
            <label className={styles.label}>설명 및 리뷰 포인트</label>
            <textarea
              className={styles.textarea}
              placeholder="AI 분석을 실행하면 리뷰 포인트가 자동으로 작성됩니다&#10;&#10;수동 작성 시: 리뷰 요청 배경, 확인 포인트 등을 작성하세요"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          <div className={styles.fieldGroup}>
            <label className={styles.label}>마감일</label>
            <input
              type="date"
              className={styles.input}
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
            />
          </div>

          <div className={styles.divider} />

          {/* 리뷰어 지정 */}
          <div className={styles.sectionTitle}>
            리뷰어 지정
            {analyzed && selectedReviewers.length > 0 && (
              <span className={styles.autoFillBadge}><IconSparkles size={9} /> AI 추천</span>
            )}
          </div>
          <span className={styles.helperText}>
            피드백을 요청할 팀원을 선택하세요
          </span>

          <div className={styles.reviewerGrid}>
            {users
              .filter((u) => u.id !== authorId)
              .map((u) => (
                <button
                  key={u.id}
                  type="button"
                  className={`${styles.reviewerChip} ${
                    selectedReviewers.includes(u.id) ? styles.reviewerChipSelected : ""
                  }`}
                  onClick={() => toggleReviewer(u.id)}
                >
                  <span className={styles.reviewerInitial}>{u.name.charAt(0)}</span>
                  {u.name}
                  <span className={styles.reviewerPart}>{u.part}</span>
                </button>
              ))}
            {users.length === 0 && (
              <span className={styles.helperText}>등록된 팀원이 없습니다</span>
            )}
          </div>

          {/* Actions */}
          <div className={styles.actions}>
            <button
              type="button"
              className={styles.btnCancel}
              onClick={() => router.push("/design-review")}
            >
              <IconArrowLeft size={13} />
              취소
            </button>
            <button
              type="submit"
              className={styles.btnSubmit}
              disabled={!canSubmit || submitting}
            >
              <IconSend size={13} />
              {submitting ? "요청 중..." : "리뷰 요청"}
            </button>
          </div>
        </form>
      </div>
    </>
  );
}
