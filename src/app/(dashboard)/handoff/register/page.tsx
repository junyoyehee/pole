"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import Header from "@/components/Header";
import {
  IconArrowLeft,
  IconDeviceFloppy,
  IconCheck,
  IconLoader2,
  IconSparkles,
  IconBolt,
  IconFlame,
  IconRocket,
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
  type?: string;
  source: "ai" | "upload" | "clipboard";
}

type Priority = "HIGH" | "NORMAL" | "LOW";
type AnalysisLevel = "simple" | "medium" | "detailed";

const PRIORITY_LABELS: Record<Priority, string> = {
  HIGH: "높음",
  NORMAL: "보통",
  LOW: "낮음",
};

const ANALYSIS_LEVELS: {
  value: AnalysisLevel;
  label: string;
  desc: string;
  icon: typeof IconBolt;
}[] = [
  { value: "simple", label: "간단", desc: "컴포넌트 이름 + 기본 스펙", icon: IconBolt },
  { value: "medium", label: "중간", desc: "스펙 + 참고사항 + 담당자 추천", icon: IconFlame },
  { value: "detailed", label: "상세", desc: "전체 분석 + 코드 스니펫 + 접근성", icon: IconRocket },
];

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

export default function HandoffRegisterPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [componentName, setComponentName] = useState("");
  const [figmaProjectId, setFigmaProjectId] = useState("");
  const [figmaUrl, setFigmaUrl] = useState("");
  const [developerId, setDeveloperId] = useState("");
  const [priority, setPriority] = useState<Priority>("NORMAL");
  const [specData, setSpecData] = useState("");
  const [notes, setNotes] = useState("");
  const [analysisLevel, setAnalysisLevel] = useState<AnalysisLevel>("medium");
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

  // 클립보드 붙여넣기 이벤트
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

  // 파일 업로드
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

    // input 초기화
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function removeImage(idx: number) {
    setPreviewImages((prev) => prev.filter((_, i) => i !== idx));
    if (selectedImageIdx >= idx && selectedImageIdx > 0) {
      setSelectedImageIdx(selectedImageIdx - 1);
    }
  }

  async function handleAnalyze() {
    if (!figmaUrl.trim() || !isFigmaUrl(figmaUrl) || analyzing) return;

    setAnalyzing(true);
    setAnalyzed(false);
    setErrorMsg("");

    try {
      const res = await fetch("/api/figma/ai-analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          figmaUrl: figmaUrl.trim(),
          level: analysisLevel,
          projects: projects.map((p) => ({ id: p.id, name: p.name, figmaUrl: p.figmaUrl })),
          users: users.map((u) => ({ id: u.id, name: u.name, part: u.part })),
        }),
      });

      const data = await res.json();

      if (data.success && data.data) {
        const d = data.data;
        if (d.componentName) setComponentName(d.componentName);
        if (d.figmaProjectId) setFigmaProjectId(d.figmaProjectId);
        if (d.developerId) setDeveloperId(d.developerId);
        if (d.priority && ["HIGH", "NORMAL", "LOW"].includes(d.priority)) {
          setPriority(d.priority as Priority);
        }
        if (d.specData) setSpecData(d.specData);
        if (d.notes) setNotes(d.notes);

        // AI 추천 이미지 추가 (기존 사용자 업로드 이미지 유지)
        if (d.previewImages && d.previewImages.length > 0) {
          const aiImages: PreviewImage[] = d.previewImages.map(
            (img: { nodeId?: string; url: string; reason?: string; type?: string }) => ({
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

  const canSubmit = componentName.trim() && figmaProjectId && developerId;

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

      // AI 이미지 URL을 base64로 변환 (Figma URL은 일시적이므로)
      const savedImages = await Promise.all(
        previewImages.map(async (img) => {
          let dataUrl = img.url;
          if (img.source === "ai" && img.url.startsWith("http")) {
            try {
              dataUrl = await urlToDataUrl(img.url);
            } catch {
              // 변환 실패 시 원본 URL 유지
            }
          }
          return { url: dataUrl, source: img.source, reason: img.reason || "" };
        })
      );

      const res = await fetch("/api/v1/handoffs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          componentName: componentName.trim(),
          figmaProjectId,
          figmaNodeId: extractedNodeId,
          figmaUrl: url || undefined,
          developerId,
          priority,
          specData: specData.trim() || undefined,
          notes: notes.trim() || undefined,
          previewImages: savedImages.length > 0 ? savedImages : undefined,
        }),
      });

      const data = await res.json();

      if (data.success) {
        setSuccessMsg("핸드오프가 등록되었습니다.");
        setTimeout(() => router.push("/handoff"), 1200);
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
      <Header breadcrumb="핸드오프 / 등록" />
      <div className={styles.content}>
        <div className={styles.pageHeader}>
          <div>
            <div className={styles.pageTitle}>핸드오프 등록</div>
            <div className={styles.pageSubtitle}>
              디자인-개발 핸드오프 항목을 등록합니다
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
            <input
              type="text"
              className={styles.input}
              placeholder="https://www.figma.com/design/abc123?node-id=123:456"
              value={figmaUrl}
              onChange={(e) => {
                setFigmaUrl(e.target.value);
                setAnalyzed(false);
              }}
            />
            <span className={styles.helperText}>
              Figma 링크를 입력하고 AI 분석 버튼을 클릭하세요
            </span>
          </div>

          <div className={styles.analysisRow}>
            <div className={styles.levelSelector}>
              {ANALYSIS_LEVELS.map((l) => {
                const Icon = l.icon;
                return (
                  <button
                    key={l.value}
                    type="button"
                    className={`${styles.levelOption} ${
                      analysisLevel === l.value ? styles.levelOptionActive : ""
                    }`}
                    onClick={() => setAnalysisLevel(l.value)}
                  >
                    <Icon size={13} />
                    <span className={styles.levelLabel}>{l.label}</span>
                    <span className={styles.levelDesc}>{l.desc}</span>
                  </button>
                );
              })}
            </div>

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

          {/* 메인 미리보기 */}
          <div className={styles.previewMain}>
            {mainPreview ? (
              <>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={mainPreview.url}
                  alt="미리보기"
                  className={styles.previewMainImg}
                />
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

          {/* 썸네일 목록 + 업로드 버튼 */}
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

            {/* 업로드 버튼들 */}
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
              onClick={() => navigator.clipboard.read().then((items) => {
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
              }).catch(() => {})}
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
              컴포넌트 이름 <span className={styles.required}>*</span>
              {analyzed && componentName && (
                <span className={styles.autoFillBadge}><IconSparkles size={9} /> AI</span>
              )}
            </label>
            <input
              type="text"
              className={styles.input}
              placeholder="예: LoginForm, DashboardWidget"
              value={componentName}
              onChange={(e) => setComponentName(e.target.value)}
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
              <select className={styles.select} value={figmaProjectId} onChange={(e) => setFigmaProjectId(e.target.value)}>
                <option value="">프로젝트 선택</option>
                {projects.map((p) => (<option key={p.id} value={p.id}>{p.name}</option>))}
              </select>
            </div>

            <div className={styles.fieldGroup}>
              <label className={styles.label}>
                담당 개발자 <span className={styles.required}>*</span>
                {analyzed && developerId && (
                  <span className={styles.autoFillBadge}><IconSparkles size={9} /> AI</span>
                )}
              </label>
              <select className={styles.select} value={developerId} onChange={(e) => setDeveloperId(e.target.value)}>
                <option value="">개발자 선택</option>
                {users.map((u) => (<option key={u.id} value={u.id}>{u.name} ({u.part})</option>))}
              </select>
            </div>
          </div>

          <div className={styles.divider} />

          {/* 우선순위 */}
          <div className={styles.sectionTitle}>
            우선순위
            {analyzed && (<span className={styles.autoFillBadge}><IconSparkles size={9} /> AI</span>)}
          </div>

          <div className={styles.priorityOptions}>
            {(["HIGH", "NORMAL", "LOW"] as Priority[]).map((p) => (
              <button
                key={p}
                type="button"
                className={`${styles.priorityOption} ${
                  priority === p
                    ? p === "HIGH" ? styles.priorityHigh : p === "NORMAL" ? styles.priorityNormal : styles.priorityLow
                    : ""
                }`}
                onClick={() => setPriority(p)}
              >
                {PRIORITY_LABELS[p]}
              </button>
            ))}
          </div>

          <div className={styles.divider} />

          {/* 디자인 스펙 */}
          <div className={styles.sectionTitle}>
            디자인 스펙
            {analyzed && specData && (<span className={styles.autoFillBadge}><IconSparkles size={9} /> AI</span>)}
          </div>

          <div className={styles.fieldGroup}>
            <textarea
              className={`${styles.textarea} ${styles.specTextarea}`}
              placeholder={`Figma URL을 입력하고 AI 분석을 실행하면 자동으로 채워집니다\n\n수동 입력 예시:\n너비: 400px\n패딩: 32px\n배경: #FFFFFF`}
              value={specData}
              onChange={(e) => setSpecData(e.target.value)}
            />
            <span className={styles.helperText}>자동 추출된 스펙을 확인하고 필요에 따라 수정하세요</span>
          </div>

          <div className={styles.fieldGroup}>
            <label className={styles.label}>
              비고
              {analyzed && notes && (<span className={styles.autoFillBadge}><IconSparkles size={9} /> AI</span>)}
            </label>
            <textarea
              className={styles.textarea}
              placeholder="개발 시 참고사항을 입력하세요"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>

          {/* Actions */}
          <div className={styles.actions}>
            <button type="button" className={styles.btnCancel} onClick={() => router.push("/handoff")}>
              <IconArrowLeft size={13} />
              취소
            </button>
            <button type="submit" className={styles.btnSubmit} disabled={!canSubmit || submitting}>
              <IconDeviceFloppy size={13} />
              {submitting ? "등록 중..." : "핸드오프 등록"}
            </button>
          </div>
        </form>
      </div>
    </>
  );
}
