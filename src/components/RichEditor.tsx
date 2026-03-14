"use client";

import { useState, useRef, useCallback } from "react";
import {
  IconBold,
  IconItalic,
  IconHeading,
  IconList,
  IconUpload,
  IconClipboard,
  IconEye,
  IconEdit,
  IconX,
  IconPaperclip,
} from "@tabler/icons-react";
import styles from "./RichEditor.module.css";

export function renderMarkdown(md: string): string {
  let html = md
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

  html = html.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img src="$2" alt="$1" style="max-width:100%;border-radius:6px;margin:4px 0;" />');
  html = html.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
  html = html.replace(/\*(.+?)\*/g, "<em>$1</em>");
  html = html.replace(/^### (.+)$/gm, '<span style="font-size:13px;font-weight:700;display:block;margin:6px 0 2px;">$1</span>');
  html = html.replace(/^## (.+)$/gm, '<span style="font-size:14px;font-weight:700;display:block;margin:6px 0 2px;">$1</span>');
  html = html.replace(/^- (.+)$/gm, '<span style="display:block;padding-left:12px;">• $1</span>');
  html = html.replace(/\n/g, "<br/>");

  return html;
}

export function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export interface Attachment {
  name: string;
  url: string;
  type: string;
}

interface RichEditorProps {
  content: string;
  onChange: (v: string) => void;
  attachments?: Attachment[];
  onAttachmentsChange?: (v: Attachment[]) => void;
  placeholder?: string;
  minHeight?: number;
}

export default function RichEditor({
  content,
  onChange,
  attachments = [],
  onAttachmentsChange,
  placeholder = "마크다운으로 작성하세요...\n\n**굵게**, *기울임*, ### 제목, - 목록\n이미지를 Ctrl+V로 붙여넣을 수 있습니다",
  minHeight = 120,
}: RichEditorProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [previewMode, setPreviewMode] = useState(false);

  function insertAtCursor(before: string, after: string = "") {
    const ta = textareaRef.current;
    if (!ta) return;
    const start = ta.selectionStart;
    const end = ta.selectionEnd;
    const selected = content.substring(start, end);
    const newText = content.substring(0, start) + before + selected + after + content.substring(end);
    onChange(newText);
    setTimeout(() => {
      ta.focus();
      ta.setSelectionRange(start + before.length, start + before.length + selected.length);
    }, 0);
  }

  const handlePaste = useCallback((e: React.ClipboardEvent) => {
    const items = e.clipboardData?.items;
    if (!items) return;
    for (const item of items) {
      if (item.type.startsWith("image/")) {
        e.preventDefault();
        const file = item.getAsFile();
        if (file) {
          fileToDataUrl(file).then((dataUrl) => {
            const imgMarkdown = `![붙여넣기 이미지](${dataUrl})\n`;
            const ta = textareaRef.current;
            if (ta) {
              const pos = ta.selectionStart;
              onChange(content.substring(0, pos) + imgMarkdown + content.substring(pos));
            } else {
              onChange(content + imgMarkdown);
            }
          });
        }
        return;
      }
    }
  }, [content, onChange]);

  function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (!files) return;

    Array.from(files).forEach(async (file) => {
      const dataUrl = await fileToDataUrl(file);
      if (file.type.startsWith("image/")) {
        const imgMarkdown = `![${file.name}](${dataUrl})\n`;
        onChange(content + imgMarkdown);
      } else if (onAttachmentsChange) {
        onAttachmentsChange([
          ...attachments,
          { name: file.name, url: dataUrl, type: file.type },
        ]);
      }
    });

    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function removeAttachment(idx: number) {
    if (onAttachmentsChange) {
      onAttachmentsChange(attachments.filter((_, i) => i !== idx));
    }
  }

  return (
    <div className={styles.richEditor}>
      {/* Toolbar */}
      <div className={styles.editorToolbar}>
        <div className={styles.toolbarGroup}>
          <button type="button" className={styles.toolbarBtn} onClick={() => insertAtCursor("**", "**")} title="굵게">
            <IconBold size={14} />
          </button>
          <button type="button" className={styles.toolbarBtn} onClick={() => insertAtCursor("*", "*")} title="기울임">
            <IconItalic size={14} />
          </button>
          <button type="button" className={styles.toolbarBtn} onClick={() => insertAtCursor("### ")} title="제목">
            <IconHeading size={14} />
          </button>
          <button type="button" className={styles.toolbarBtn} onClick={() => insertAtCursor("- ")} title="목록">
            <IconList size={14} />
          </button>
        </div>
        <div className={styles.toolbarDivider} />
        <div className={styles.toolbarGroup}>
          <button
            type="button"
            className={styles.toolbarBtn}
            onClick={() => fileInputRef.current?.click()}
            title="이미지/파일 첨부"
          >
            <IconUpload size={14} />
          </button>
          <button
            type="button"
            className={styles.toolbarBtn}
            onClick={() => {
              navigator.clipboard.read().then((items) => {
                for (const item of items) {
                  const imageType = item.types.find((t) => t.startsWith("image/"));
                  if (imageType) {
                    item.getType(imageType).then((blob) => {
                      fileToDataUrl(new File([blob], "clipboard.png", { type: imageType })).then((dataUrl) => {
                        onChange(content + `![클립보드 이미지](${dataUrl})\n`);
                      });
                    });
                  }
                }
              }).catch(() => {});
            }}
            title="클립보드에서 이미지 붙여넣기"
          >
            <IconClipboard size={14} />
          </button>
        </div>
        <div className={styles.toolbarSpacer} />
        <button
          type="button"
          className={`${styles.toolbarBtn} ${previewMode ? styles.toolbarBtnActive : ""}`}
          onClick={() => setPreviewMode(!previewMode)}
          title={previewMode ? "편집" : "미리보기"}
        >
          {previewMode ? <IconEdit size={14} /> : <IconEye size={14} />}
          <span className={styles.toolbarLabel}>{previewMode ? "편집" : "미리보기"}</span>
        </button>
      </div>

      {/* Editor / Preview */}
      {previewMode ? (
        <div
          className={styles.editorPreview}
          style={{ minHeight }}
          dangerouslySetInnerHTML={{ __html: renderMarkdown(content) || '<span style="color:var(--text-muted)">내용이 없습니다</span>' }}
        />
      ) : (
        <textarea
          ref={textareaRef}
          className={styles.editorTextarea}
          style={{ minHeight }}
          placeholder={placeholder}
          value={content}
          onChange={(e) => onChange(e.target.value)}
          onPaste={handlePaste}
        />
      )}

      {/* Attachments */}
      {attachments.length > 0 && (
        <div className={styles.attachmentList}>
          {attachments.map((att, idx) => (
            <div key={idx} className={styles.attachmentItem}>
              <IconPaperclip size={10} />
              <span className={styles.attachmentName}>{att.name}</span>
              <button
                type="button"
                className={styles.attachmentRemove}
                onClick={() => removeAttachment(idx)}
              >
                <IconX size={10} />
              </button>
            </div>
          ))}
        </div>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*,.pdf,.zip,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.sketch,.fig"
        multiple
        style={{ display: "none" }}
        onChange={handleFileUpload}
      />
    </div>
  );
}
