"use client";

import { useState, useCallback, useEffect, useRef, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import {
  Autocomplete,
  TextInput,
  Textarea,
  Button,
  Group,
  Select,
  Text,
  Badge,
  Paper,
  Stack,
  ScrollArea,
  UnstyledButton,
  Image,
  Skeleton,
  Alert,
  CopyButton,
  Tooltip,
  Code,
  Divider,
  Box,
  Loader,
  Center,
  ThemeIcon,
  Modal,
  Notification,
} from "@mantine/core";

const FIGMA_URL_HISTORY_KEY = "figma-explorer-url-history";
const MAX_HISTORY = 20;

function timeAgo(ts: number): string {
  const diff = Date.now() - ts;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "방금 전";
  if (mins < 60) return `${mins}분 전`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}시간 전`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}일 전`;
  return `${Math.floor(days / 7)}주 전`;
}

interface FigmaNode {
  id: string;
  name: string;
  type: string;
  visible?: boolean;
  children?: FigmaNode[];
}

interface NodeDetail {
  node: FigmaNode;
  imageUrl: string | null;
  loading: boolean;
}

function parseFigmaUrl(url: string) {
  try {
    const match = url.match(/figma\.com\/(?:file|design)\/([a-zA-Z0-9]+)/);
    const fileKey = match?.[1] || "";
    const urlObj = new URL(url);
    const nodeId = urlObj.searchParams.get("node-id") || "";
    return { fileKey, nodeId };
  } catch {
    return { fileKey: "", nodeId: "" };
  }
}

const TYPE_COLORS: Record<string, string> = {
  CANVAS: "violet",
  FRAME: "blue",
  COMPONENT: "green",
  COMPONENT_SET: "teal",
  INSTANCE: "cyan",
  GROUP: "yellow",
  TEXT: "orange",
  RECTANGLE: "gray",
  VECTOR: "pink",
  SECTION: "indigo",
};

const DEPTH_COLORS = [
  "#A78BFA", // violet
  "#60A5FA", // blue
  "#34D399", // green
  "#FBBF24", // yellow
  "#FB923C", // orange
  "#F472B6", // pink
];

function TreeNode({
  node,
  depth,
  onSelect,
  selectedId,
  showHidden,
}: {
  node: FigmaNode;
  depth: number;
  onSelect: (node: FigmaNode) => void;
  selectedId: string | null;
  showHidden: boolean;
}) {
  const [expanded, setExpanded] = useState(depth < 2);
  const hasChildren = node.children && node.children.length > 0;
  const isSelected = selectedId === node.id;
  const nodeId = node.id.replace(":", "-");
  const color = TYPE_COLORS[node.type] || "gray";
  const depthColor = DEPTH_COLORS[depth % DEPTH_COLORS.length];
  const isHidden = node.visible === false;

  if (!showHidden && isHidden) return null;

  return (
    <div>
      <UnstyledButton
        onClick={() => onSelect(node)}
        w="100%"
        py={2}
        px={0}
        style={{
          borderRadius: 6,
          backgroundColor: isSelected
            ? "rgba(167, 139, 250, 0.15)"
            : undefined,
          border: isSelected
            ? "1px solid rgba(167, 139, 250, 0.4)"
            : "1px solid transparent",
          transition: "background-color 0.15s ease",
          opacity: isHidden ? 0.4 : 1,
        }}
        styles={{
          root: {
            "&:hover": {
              backgroundColor: isSelected
                ? "rgba(167, 139, 250, 0.15)"
                : "rgba(255, 255, 255, 0.04)",
            },
          },
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 0 }}>
          {/* Depth indicator blocks - visual indentation */}
          {depth > 0 && (
            <div style={{ display: "flex", flexShrink: 0 }}>
              {Array.from({ length: depth }).map((_, i) => (
                <div
                  key={i}
                  style={{
                    width: 2,
                    height: 20,
                    backgroundColor: DEPTH_COLORS[i % DEPTH_COLORS.length],
                    opacity: 0.4,
                    marginRight: 14,
                    borderRadius: 2,
                    flexShrink: 0,
                  }}
                />
              ))}
              <div style={{ width: 4 }} />
            </div>
          )}
          {depth === 0 && <div style={{ width: 8 }} />}

          {/* Expand/collapse toggle */}
          {hasChildren ? (
            <Box
              component="span"
              onClick={(e: React.MouseEvent) => {
                e.stopPropagation();
                setExpanded(!expanded);
              }}
              fz={9}
              w={14}
              ta="center"
              style={{
                cursor: "pointer",
                userSelect: "none",
                color: depthColor,
                lineHeight: 1,
                flexShrink: 0,
              }}
            >
              {expanded ? "▾" : "▸"}
            </Box>
          ) : (
            <Box w={14} style={{ textAlign: "center", color: "rgba(255,255,255,0.1)", fontSize: 5, lineHeight: 1, flexShrink: 0 }}>●</Box>
          )}

          {/* Type badge */}
          <Badge
            size="xs"
            variant="light"
            color={color}
            radius="sm"
            style={{ flexShrink: 0, minWidth: 48, textAlign: "center", marginLeft: 2, marginRight: 4 }}
            fz={8}
          >
            {node.type}
          </Badge>

          {/* Hidden indicator */}
          {isHidden && (
            <Tooltip label="숨겨진 레이어" withArrow>
              <Text fz={10} c="#F87171" style={{ flexShrink: 0, marginRight: 4, lineHeight: 1 }}>👁‍🗨</Text>
            </Tooltip>
          )}

          {/* Node name */}
          <Text
            fz={11}
            truncate
            flex={1}
            c={isHidden ? "#8B8FA3" : isSelected ? "#FFFFFF" : "#E0E2EA"}
            fw={isSelected ? 600 : 400}
            td={isHidden ? "line-through" : undefined}
          >
            {node.name}
          </Text>

          {/* Child count */}
          {hasChildren && (
            <Text fz={9} c="#8B8FA3" style={{ flexShrink: 0, marginLeft: 4 }}>
              {node.children!.length}
            </Text>
          )}

          {/* Node ID copy */}
          <CopyButton value={nodeId}>
            {({ copied, copy }) => (
              <Tooltip label={copied ? "복사됨!" : "Node ID 복사"} withArrow>
                <Code
                  onClick={(e) => {
                    e.stopPropagation();
                    copy();
                  }}
                  style={{
                    cursor: "pointer",
                    fontSize: 10,
                    flexShrink: 0,
                    marginLeft: 4,
                    marginRight: 8,
                    color: "#6B7080",
                  }}
                  color={copied ? "teal" : "dark"}
                >
                  {nodeId}
                </Code>
              </Tooltip>
            )}
          </CopyButton>
        </div>
      </UnstyledButton>

      {hasChildren && expanded && (
        <div>
          {node.children!.map((child) => (
            <TreeNode
              key={child.id}
              node={child}
              depth={depth + 1}
              onSelect={onSelect}
              selectedId={selectedId}
              showHidden={showHidden}
            />
          ))}
        </div>
      )}
    </div>
  );
}

interface SaveFormData {
  name: string;
  description: string;
  thumbnailUrl: string | null;
  aiSummary: string;
  analyzing: boolean;
}

export default function FigmaExplorerPage() {
  return (
    <Suspense>
      <FigmaExplorer />
    </Suspense>
  );
}

function FigmaExplorer() {
  const [url, setUrl] = useState("");
  const [fileKey, setFileKey] = useState("");
  const [fileName, setFileName] = useState("");
  const [nodes, setNodes] = useState<FigmaNode[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [selectedDetail, setSelectedDetail] = useState<NodeDetail | null>(null);
  const [depthLimit, setDepthLimit] = useState<string | null>("5");
  const [showHidden, setShowHidden] = useState(true);

  // URL history (localStorage)
  const [urlHistory, setUrlHistory] = useState<string[]>([]);
  const [recentExplores, setRecentExplores] = useState<{ url: string; fileKey: string; nodeId?: string; nodeName?: string; timestamp: number }[]>([]);
  useEffect(() => {
    try {
      const saved = localStorage.getItem(FIGMA_URL_HISTORY_KEY);
      if (saved) setUrlHistory(JSON.parse(saved));
    } catch { /* ignore */ }
    try {
      const recent = localStorage.getItem("figma-explorer-recent");
      if (recent) setRecentExplores(JSON.parse(recent));
    } catch { /* ignore */ }
  }, []);

  const saveUrlToHistory = useCallback((figmaUrl: string) => {
    setUrlHistory((prev) => {
      const filtered = prev.filter((u) => u !== figmaUrl);
      const updated = [figmaUrl, ...filtered].slice(0, MAX_HISTORY);
      try { localStorage.setItem(FIGMA_URL_HISTORY_KEY, JSON.stringify(updated)); } catch { /* ignore */ }
      return updated;
    });
  }, []);

  const saveRecentExplore = useCallback((figmaUrl: string, fk: string, nodeName?: string, nid?: string) => {
    try {
      const key = "figma-explorer-recent";
      const saved = localStorage.getItem(key);
      const list = saved ? JSON.parse(saved) : [];
      const item = { url: figmaUrl, fileKey: fk, nodeId: nid, nodeName, timestamp: Date.now() };
      const filtered = list.filter((e: { url: string }) => e.url !== figmaUrl);
      const updated = [item, ...filtered].slice(0, 20);
      localStorage.setItem(key, JSON.stringify(updated));
    } catch { /* ignore */ }
  }, []);

  // Raw JSON data
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [rawJson, setRawJson] = useState<any>(null);
  const [jsonModalOpen, setJsonModalOpen] = useState(false);
  const [jsonLoading, setJsonLoading] = useState(false);
  const [jsonView, setJsonView] = useState<"file" | "node">("file");

  // Save modal state
  const [saveModalOpen, setSaveModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveForm, setSaveForm] = useState<SaveFormData>({
    name: "",
    description: "",
    thumbnailUrl: null,
    aiSummary: "",
    analyzing: false,
  });

  // Export settings
  const [exportSettingsOpen, setExportSettingsOpen] = useState(false);
  const [imageDirHandle, setImageDirHandle] = useState<FileSystemDirectoryHandle | null>(null);
  const [htmlDirHandle, setHtmlDirHandle] = useState<FileSystemDirectoryHandle | null>(null);
  const [imageDirName, setImageDirName] = useState<string>("");
  const [htmlDirName, setHtmlDirName] = useState<string>("");
  const [exportFormat, setExportFormat] = useState<string | null>("png");
  const [exportScale, setExportScale] = useState<string | null>("2");
  const [exporting, setExporting] = useState(false);
  const [exportResult, setExportResult] = useState<string | null>(null);

  const pickDirectory = useCallback(async (purpose: "image" | "html") => {
    try {
      const handle = await window.showDirectoryPicker({ mode: "readwrite" });
      if (purpose === "image") {
        setImageDirHandle(handle);
        setImageDirName(handle.name);
      } else {
        setHtmlDirHandle(handle);
        setHtmlDirName(handle.name);
      }
    } catch {
      // User cancelled
    }
  }, []);

  const handleOpenSaveModal = useCallback(async () => {
    setSaveForm({
      name: fileName || "",
      description: "",
      thumbnailUrl: null,
      aiSummary: "",
      analyzing: true,
    });
    setSaveModalOpen(true);

    // AI 분석 & 썸네일 자동 생성
    try {
      const res = await fetch("/api/v1/figma-projects/summarize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fileKey }),
      });
      const data = await res.json();
      if (data.success) {
        setSaveForm((prev) => ({
          ...prev,
          name: prev.name || data.data.fileName,
          description: data.data.summary,
          thumbnailUrl: data.data.thumbnailUrl,
          aiSummary: data.data.summary,
          analyzing: false,
        }));
      } else {
        setSaveForm((prev) => ({ ...prev, analyzing: false }));
      }
    } catch {
      setSaveForm((prev) => ({ ...prev, analyzing: false }));
    }
  }, [fileKey, fileName]);

  const handleSave = useCallback(async () => {
    if (!saveForm.name || !fileKey) return;
    setSaving(true);

    try {
      const res = await fetch("/api/v1/figma-projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: saveForm.name,
          figmaUrl: url,
          fileKey,
          description: saveForm.description,
          thumbnailUrl: saveForm.thumbnailUrl,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setSaveModalOpen(false);
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 3000);
      } else {
        setError(data.error?.message || "저장에 실패했습니다.");
      }
    } catch {
      setError("저장 중 오류가 발생했습니다.");
    } finally {
      setSaving(false);
    }
  }, [saveForm, fileKey, url]);

  const fetchFile = useCallback(async () => {
    const { fileKey: fk, nodeId } = parseFigmaUrl(url);
    if (!fk) {
      setError("올바른 Figma URL을 입력해주세요.");
      return;
    }

    setLoading(true);
    setError("");
    setNodes([]);
    setSelectedDetail(null);
    setFileKey(fk);

    try {
      const params = new URLSearchParams({ fileKey: fk });
      if (depthLimit) params.set("depth", depthLimit);
      if (nodeId) params.set("nodeId", nodeId);

      const res = await fetch(`/api/figma?${params}`);
      const data = await res.json();

      if (data.error) {
        setError(data.error);
        return;
      }

      setRawJson(data);
      saveUrlToHistory(url);

      let rootName = "";
      if (data.nodes) {
        const nodeEntries = Object.values(data.nodes) as Array<{
          document: FigmaNode;
        }>;
        const docs = nodeEntries.map((n) => n.document);
        rootName = docs[0]?.name || data.name || "";
        setFileName(data.name || "");
        setNodes(docs);
      } else if (data.document) {
        rootName = data.name || "";
        setFileName(data.name || "");
        setNodes(data.document.children || []);
      }

      saveRecentExplore(url, fk, rootName || data.name, nodeId);
    } catch {
      setError("Figma API 요청에 실패했습니다.");
    } finally {
      setLoading(false);
    }
  }, [url, depthLimit, saveUrlToHistory, saveRecentExplore]);

  // Auto-fetch from URL query param (e.g., ?url=https://figma.com/...)
  const searchParams = useSearchParams();
  const autoFetched = useRef(false);
  useEffect(() => {
    const paramUrl = searchParams.get("url");
    if (paramUrl && !autoFetched.current) {
      autoFetched.current = true;
      setUrl(paramUrl);
    }
  }, [searchParams]);
  useEffect(() => {
    if (autoFetched.current && url && nodes.length === 0 && !loading && !error) {
      fetchFile();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [url]);

  const handleSelectNode = useCallback(
    async (node: FigmaNode) => {
      setSelectedDetail({ node, imageUrl: null, loading: true });

      try {
        const nodeId = node.id.replace(":", "-");
        const res = await fetch(
          `/api/figma/images?fileKey=${fileKey}&nodeId=${nodeId}`
        );
        const data = await res.json();
        const images = data.images || {};
        const imageUrl = Object.values(images)[0] as string | null;
        setSelectedDetail({ node, imageUrl: imageUrl || null, loading: false });
      } catch {
        setSelectedDetail({ node, imageUrl: null, loading: false });
      }
    },
    [fileKey]
  );

  // JSON export: fetch full node JSON for selected node
  const handleFetchNodeJson = useCallback(async () => {
    if (!selectedDetail || !fileKey) return;
    setJsonLoading(true);
    setJsonView("node");
    try {
      const nodeId = selectedDetail.node.id.replace(":", "-");
      const params = new URLSearchParams({ fileKey, nodeId, depth: "10" });
      const res = await fetch(`/api/figma?${params}`);
      const data = await res.json();
      setRawJson(data);
      setJsonModalOpen(true);
    } catch {
      setError("노드 JSON을 불러오는데 실패했습니다.");
    } finally {
      setJsonLoading(false);
    }
  }, [selectedDetail, fileKey]);

  // Download JSON as file
  const handleDownloadJson = useCallback(() => {
    if (!rawJson) return;
    const jsonStr = JSON.stringify(rawJson, null, 2);
    const blob = new Blob([jsonStr], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `figma-${fileKey}${selectedDetail ? `-${selectedDetail.node.id.replace(":", "-")}` : ""}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, [rawJson, fileKey, selectedDetail]);

  // Open file-level JSON viewer
  const handleViewFileJson = useCallback(() => {
    setJsonView("file");
    setJsonModalOpen(true);
  }, []);

  // Export images: get URLs from server, download & save via File System Access API
  const handleExportImages = useCallback(
    async (targetNodes: Array<{ id: string; name: string; type: string }>, label: string) => {
      if (!fileKey || !targetNodes.length) return;

      let dirHandle = imageDirHandle;
      if (!dirHandle) {
        try {
          dirHandle = await window.showDirectoryPicker({ mode: "readwrite" });
          setImageDirHandle(dirHandle);
          setImageDirName(dirHandle.name);
        } catch {
          return; // User cancelled
        }
      }

      setExporting(true);
      setExportResult(null);
      try {
        // 1. Get image URLs from server
        const res = await fetch("/api/figma/export-images", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            fileKey,
            nodes: targetNodes.map((n) => ({ id: n.id.replace("-", ":"), name: n.name })),
            format: exportFormat || "png",
            scale: Number(exportScale) || 2,
          }),
        });
        const data = await res.json();
        if (!data.success) {
          setExportResult(`내보내기 실패: ${data.error}`);
          return;
        }

        // 2. Download each image and save to chosen folder
        let savedCount = 0;
        for (const item of data.data.results) {
          if (item.status !== "success" || !item.imageUrl) continue;
          try {
            const imgRes = await fetch(item.imageUrl);
            const blob = await imgRes.blob();
            const fileHandle = await dirHandle.getFileHandle(item.fileName, { create: true });
            const writable = await fileHandle.createWritable();
            await writable.write(blob);
            await writable.close();
            savedCount++;
          } catch {
            // skip individual failures
          }
        }

        setExportResult(
          `${label} 이미지 내보내기 완료: ${savedCount}/${data.data.total}개 저장 → ${dirHandle.name}/`
        );
      } catch {
        setExportResult("이미지 내보내기 중 오류가 발생했습니다.");
      } finally {
        setExporting(false);
        setTimeout(() => setExportResult(null), 5000);
      }
    },
    [fileKey, imageDirHandle, exportFormat, exportScale]
  );

  // Export HTML: generate on server, save via File System Access API
  const handleExportHtml = useCallback(
    async (targetNodes: Array<{ id: string; name: string; type: string }>, label: string) => {
      if (!fileKey || !targetNodes.length) return;

      let dirHandle = htmlDirHandle;
      if (!dirHandle) {
        try {
          dirHandle = await window.showDirectoryPicker({ mode: "readwrite" });
          setHtmlDirHandle(dirHandle);
          setHtmlDirName(dirHandle.name);
        } catch {
          return; // User cancelled
        }
      }

      setExporting(true);
      setExportResult(null);
      try {
        // 1. Generate HTML on server
        const res = await fetch("/api/figma/export-html", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            fileKey,
            nodes: targetNodes.map((n) => ({
              id: n.id.replace("-", ":"),
              name: n.name,
              type: n.type,
            })),
          }),
        });
        const data = await res.json();
        if (!data.success) {
          setExportResult(`내보내기 실패: ${data.error}`);
          return;
        }

        // 2. Save each HTML file to chosen folder
        let savedCount = 0;
        for (const item of data.data.results) {
          if (item.status !== "success" || !item.htmlContent) continue;
          try {
            const fileHandle = await dirHandle.getFileHandle(item.fileName, { create: true });
            const writable = await fileHandle.createWritable();
            await writable.write(item.htmlContent);
            await writable.close();
            savedCount++;
          } catch {
            // skip individual failures
          }
        }

        setExportResult(
          `${label} HTML 내보내기 완료: ${savedCount}/${data.data.total}개 저장 → ${dirHandle.name}/`
        );
      } catch {
        setExportResult("HTML 내보내기 중 오류가 발생했습니다.");
      } finally {
        setExporting(false);
        setTimeout(() => setExportResult(null), 5000);
      }
    },
    [fileKey, htmlDirHandle]
  );

  // Export AI-generated HTML: process one node at a time to avoid timeout
  const handleExportHtmlAi = useCallback(
    async (targetNodes: Array<{ id: string; name: string; type: string }>, label: string) => {
      if (!fileKey || !targetNodes.length) return;

      let dirHandle = htmlDirHandle;
      if (!dirHandle) {
        try {
          dirHandle = await window.showDirectoryPicker({ mode: "readwrite" });
          setHtmlDirHandle(dirHandle);
          setHtmlDirName(dirHandle.name);
        } catch {
          return;
        }
      }

      setExporting(true);
      setExportResult(null);

      let savedCount = 0;
      let imageCount = 0;
      let failCount = 0;

      try {
        // Process each node individually to avoid server timeout
        for (let ni = 0; ni < targetNodes.length; ni++) {
          const n = targetNodes[ni];
          setExportResult(
            `${label} AI 생성 중... (${ni + 1}/${targetNodes.length}) "${n.name}"`
          );

          try {
            const res = await fetch("/api/figma/export-html-ai", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                fileKey,
                nodes: [{
                  id: n.id.replace("-", ":"),
                  name: n.name,
                  type: n.type,
                }],
              }),
            });
            const data = await res.json();
            if (!data.success) {
              failCount++;
              continue;
            }

            const item = data.data.results[0];
            if (!item || item.status !== "success" || !item.htmlContent) {
              failCount++;
              continue;
            }

            // Create project folder
            const projectDir = await dirHandle.getDirectoryHandle(item.folderName, { create: true });

            // Save index.html
            const htmlHandle = await projectDir.getFileHandle(item.htmlFileName, { create: true });
            const htmlWritable = await htmlHandle.createWritable();
            await htmlWritable.write(item.htmlContent);
            await htmlWritable.close();
            savedCount++;

            // Download images into images/ subfolder
            if (item.images?.length > 0) {
              const imagesDir = await projectDir.getDirectoryHandle("images", { create: true });
              const concurrency = 6;

              const downloadImage = async (img: { fileName: string; downloadUrl: string }) => {
                try {
                  const imgRes = await fetch(img.downloadUrl);
                  if (!imgRes.ok) return;
                  const blob = await imgRes.blob();
                  const imgHandle = await imagesDir.getFileHandle(img.fileName, { create: true });
                  const imgWritable = await imgHandle.createWritable();
                  await imgWritable.write(blob);
                  await imgWritable.close();
                  imageCount++;
                } catch {
                  // skip
                }
              };

              for (let i = 0; i < item.images.length; i += concurrency) {
                const batch = item.images.slice(i, i + concurrency);
                await Promise.all(batch.map(downloadImage));
                setExportResult(
                  `"${n.name}" 이미지 다운로드 (${Math.min(i + concurrency, item.images.length)}/${item.images.length}) — 전체 ${ni + 1}/${targetNodes.length}`
                );
              }
            }
          } catch {
            failCount++;
          }
        }

        const msg = failCount > 0
          ? `${label} AI HTML: ${savedCount}개 완료, ${failCount}개 실패, ${imageCount}개 이미지 → ${dirHandle.name}/`
          : `${label} AI HTML 완료: ${savedCount}개 HTML + ${imageCount}개 이미지 → ${dirHandle.name}/`;
        setExportResult(msg);
      } catch {
        setExportResult("AI HTML 내보내기 중 오류가 발생했습니다.");
      } finally {
        setExporting(false);
        setTimeout(() => setExportResult(null), 12000);
      }
    },
    [fileKey, htmlDirHandle]
  );

  // Collect all frames from a canvas or all canvases
  const collectFrameNodes = useCallback(
    (targetNodes: FigmaNode[]): Array<{ id: string; name: string; type: string }> => {
      const frames: Array<{ id: string; name: string; type: string }> = [];
      for (const node of targetNodes) {
        if (["FRAME", "COMPONENT", "COMPONENT_SET"].includes(node.type)) {
          frames.push({ id: node.id, name: node.name, type: node.type });
        }
        if (node.children) {
          // Only go one level deep for direct frames
          for (const child of node.children) {
            if (["FRAME", "COMPONENT", "COMPONENT_SET"].includes(child.type)) {
              frames.push({ id: child.id, name: child.name, type: child.type });
            }
          }
        }
      }
      return frames;
    },
    []
  );

  const getNodeId = (id: string) => id.replace(":", "-");

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100vh", overflow: "hidden", paddingTop: 8 }}>
      {/* Compact Search Bar - only shown after search */}
      {nodes.length > 0 && (
        <div style={{
          padding: "8px 16px",
          borderBottom: "1px solid rgba(255,255,255,0.06)",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          gap: 6,
          flexShrink: 0,
        }}>
          <Text fz={10} fw={700} c="violet" style={{ letterSpacing: -0.3 }}>F</Text>
          {fileName && (
            <Text fz={9} c="dimmed" truncate maw={120}>
              {fileName}
            </Text>
          )}
          <Autocomplete
            w={400}
            placeholder="Figma URL"
            value={url}
            onChange={setUrl}
            onKeyDown={(e) => e.key === "Enter" && fetchFile()}
            data={urlHistory}
            maxDropdownHeight={200}
            size="xs"
            styles={{ input: { fontSize: 10, height: 26 } }}
          />
          <Select
            w={80}
            size="xs"
            value={depthLimit}
            onChange={setDepthLimit}
            data={[
              { value: "2", label: "깊이 2" },
              { value: "3", label: "깊이 3" },
              { value: "4", label: "깊이 4" },
              { value: "5", label: "깊이 5" },
              { value: "6", label: "깊이 6" },
              { value: "8", label: "깊이 8" },
              { value: "10", label: "깊이 10" },
            ]}
            placeholder="깊이"
            clearable
            styles={{ input: { fontSize: 10, height: 26 } }}
          />
          <Button onClick={fetchFile} loading={loading} size="compact-xs" fz={10}>
            탐색
          </Button>
        </div>
      )}

      {/* Main Content */}
      <div style={{ flex: 1, overflow: "auto", padding: nodes.length > 0 ? "10px 16px" : 0 }}>
        {error && (
          <Alert color="red" mb="md" withCloseButton onClose={() => setError("")}>
            {error}
          </Alert>
        )}

        {loading && (
          <Center h={300}>
            <Stack align="center" gap="xs">
              <Loader size="md" />
              <Text fz={11} c="dimmed">Figma 파일을 불러오는 중...</Text>
            </Stack>
          </Center>
        )}

        {!loading && nodes.length === 0 && !error && (
          <div style={{ display: "flex", flexDirection: "column", height: "calc(100vh - 60px)" }}>
            {/* Search Engine Hero */}
            <Center flex={recentExplores.length > 0 ? "0 0 auto" : 1} pt={recentExplores.length > 0 ? 60 : 0}>
              <Stack align="center" gap="md" w="100%" maw={520}>
                <Stack align="center" gap={4}>
                  <Text fz={24} fw={800} variant="gradient" gradient={{ from: "violet", to: "blue" }} component="span" style={{ letterSpacing: -1 }}>
                    Figma Explorer
                  </Text>
                  <Text fz={11} c="dimmed" ta="center">
                    Figma URL을 입력하면 파일 구조를 트리로 탐색할 수 있습니다
                  </Text>
                </Stack>
                <Group gap={6} w="100%">
                  <Autocomplete
                    flex={1}
                    placeholder="Figma URL을 붙여넣으세요..."
                    value={url}
                    onChange={setUrl}
                    onKeyDown={(e) => e.key === "Enter" && fetchFile()}
                    data={urlHistory}
                    maxDropdownHeight={200}
                    size="sm"
                    styles={{ input: { borderRadius: 20, paddingLeft: 16, fontSize: 11 } }}
                  />
                  <Select
                    w={100}
                    size="sm"
                    value={depthLimit}
                    onChange={setDepthLimit}
                    data={[
                      { value: "2", label: "깊이 2" },
                      { value: "3", label: "깊이 3" },
                      { value: "4", label: "깊이 4" },
                      { value: "5", label: "깊이 5" },
                      { value: "6", label: "깊이 6" },
                      { value: "8", label: "깊이 8" },
                      { value: "10", label: "깊이 10" },
                    ]}
                    placeholder="깊이"
                    clearable
                    styles={{ input: { borderRadius: 20, fontSize: 11 } }}
                  />
                  <Button onClick={fetchFile} loading={loading} size="sm" radius="xl" px="lg" fz={11}>
                    탐색
                  </Button>
                </Group>
              </Stack>
            </Center>

            {/* Recent Explores - centered article style */}
            {recentExplores.length > 0 && (
              <div style={{ flex: 1, display: "flex", justifyContent: "center", overflow: "auto", paddingTop: 28, paddingBottom: 16 }}>
                <div style={{ width: "100%", maxWidth: 640 }}>
                  <Group justify="space-between" mb={10}>
                    <Group gap={6}>
                      <Text fz={11} fw={700} c="var(--text-primary)">최근 탐색 기록</Text>
                      <Badge size="xs" variant="light" color="violet" fz={9}>{recentExplores.length}</Badge>
                    </Group>
                    <Button
                      size="compact-xs"
                      variant="subtle"
                      color="gray"
                      fz={9}
                      onClick={() => {
                        localStorage.removeItem("figma-explorer-recent");
                        setRecentExplores([]);
                      }}
                    >
                      전체 삭제
                    </Button>
                  </Group>
                  <Stack gap={8}>
                    {recentExplores.slice(0, 12).map((item, i) => (
                      <Paper
                        key={i}
                        withBorder
                        radius="md"
                        px="md"
                        py="sm"
                        style={{
                          cursor: "pointer",
                          transition: "all 0.15s ease",
                          borderColor: "rgba(255,255,255,0.06)",
                        }}
                        styles={{
                          root: {
                            "&:hover": {
                              borderColor: "rgba(139,92,246,0.3)",
                              background: "rgba(139,92,246,0.04)",
                            },
                          },
                        }}
                        onClick={() => { setUrl(item.url); }}
                      >
                        <Group justify="space-between" wrap="nowrap">
                          <Group gap={8} wrap="nowrap" style={{ flex: 1, minWidth: 0 }}>
                            <ThemeIcon size={28} variant="light" color="violet" radius="sm" style={{ flexShrink: 0 }}>
                              <Text fz={11} fw={700}>F</Text>
                            </ThemeIcon>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <Group gap={6} mb={2}>
                                <Text fz={12} fw={600} c="var(--text-primary)" truncate>
                                  {item.nodeName || "Untitled"}
                                </Text>
                                {item.nodeId && (
                                  <Badge size="xs" variant="dot" color="blue" fz={8}>
                                    Node {item.nodeId}
                                  </Badge>
                                )}
                              </Group>
                              <Group gap={6}>
                                <Code fz={9} style={{ background: "rgba(255,255,255,0.04)" }}>
                                  {item.fileKey}
                                </Code>
                                <Text fz={9} c="dimmed" truncate style={{ flex: 1, minWidth: 0 }}>
                                  {item.url.replace(/https?:\/\/(www\.)?/, "")}
                                </Text>
                              </Group>
                            </div>
                          </Group>
                          <Text fz={9} c="dimmed" style={{ flexShrink: 0 }}>{timeAgo(item.timestamp)}</Text>
                        </Group>
                      </Paper>
                    ))}
                  </Stack>
                </div>
              </div>
            )}
          </div>
        )}

        {nodes.length > 0 && (
          <div style={{ display: "flex", gap: 8, height: "100%" }}>
            {/* Tree Panel */}
            <Paper
              withBorder
              radius="md"
              style={{ flex: 1, overflow: "hidden", display: "flex", flexDirection: "column" }}
            >
              <Stack px="sm" py={6} gap={4} style={{ borderBottom: "1px solid var(--border-medium, rgba(255,255,255,0.08))" }}>
                <Group justify="space-between">
                  <Group gap={4}>
                    <Text fz={11} fw={600}>노드 트리</Text>
                    <Badge size="xs" variant="light" color="blue" fz={9}>
                      {nodes.length}개 페이지
                    </Badge>
                  </Group>
                  <Button
                    size="compact-xs"
                    variant={showHidden ? "light" : "filled"}
                    color={showHidden ? "gray" : "red"}
                    onClick={() => setShowHidden(!showHidden)}
                    fz={9}
                  >
                    {showHidden ? "숨김 표시중" : "숨김 숨김"}
                  </Button>
                </Group>
                <Group gap={4}>
                  <Tooltip label="전체 캔버스의 프레임을 이미지로 내보내기">
                    <Button
                      size="compact-xs"
                      variant="light"
                      color="teal"
                      fz={9}
                      loading={exporting}
                      onClick={() => {
                        const allFrames = collectFrameNodes(nodes);
                        if (allFrames.length === 0) {
                          setError("내보낼 프레임이 없습니다.");
                          return;
                        }
                        handleExportImages(allFrames, `전체 (${allFrames.length}개 프레임)`);
                      }}
                    >
                      전체 이미지 내보내기
                    </Button>
                  </Tooltip>
                  <Tooltip label="전체 캔버스의 프레임을 HTML로 내보내기">
                    <Button
                      size="compact-xs"
                      variant="light"
                      color="orange"
                      fz={9}
                      loading={exporting}
                      onClick={() => {
                        const allFrames = collectFrameNodes(nodes);
                        if (allFrames.length === 0) {
                          setError("내보낼 프레임이 없습니다.");
                          return;
                        }
                        handleExportHtml(allFrames, `전체 (${allFrames.length}개 프레임)`);
                      }}
                    >
                      전체 HTML 내보내기
                    </Button>
                  </Tooltip>
                  <Tooltip label="AI가 Figma 구조를 분석하여 개발자 친화적 HTML 생성">
                    <Button
                      size="compact-xs"
                      variant="filled"
                      color="violet"
                      fz={9}
                      loading={exporting}
                      onClick={() => {
                        const allFrames = collectFrameNodes(nodes);
                        if (allFrames.length === 0) {
                          setError("내보낼 프레임이 없습니다.");
                          return;
                        }
                        handleExportHtmlAi(allFrames, `전체 (${allFrames.length}개 프레임)`);
                      }}
                    >
                      AI HTML 내보내기
                    </Button>
                  </Tooltip>
                  <div style={{ marginLeft: "auto" }} />
                  <Button
                    onClick={() => setExportSettingsOpen(true)}
                    size="compact-xs"
                    variant="light"
                    color="grape"
                    fz={9}
                  >
                    내보내기 설정
                  </Button>
                  <Button
                    onClick={handleOpenSaveModal}
                    size="compact-xs"
                    variant="gradient"
                    gradient={{ from: "violet", to: "blue" }}
                    fz={9}
                  >
                    허브에 등록
                  </Button>
                </Group>
              </Stack>
              {/* Column Headers */}
              <div style={{
                display: "flex",
                alignItems: "center",
                padding: "4px 8px",
                borderBottom: "1px solid rgba(255,255,255,0.06)",
                gap: 0,
              }}>
                <Text fz={8} c="#6B7080" fw={600} style={{ width: 8 + 14 + 2, flexShrink: 0 }}></Text>
                <Text fz={8} c="#6B7080" fw={600} style={{ minWidth: 48, flexShrink: 0, textAlign: "center", marginRight: 4 }}>타입</Text>
                <Text fz={8} c="#6B7080" fw={600} flex={1}>노드 이름</Text>
                <Text fz={8} c="#6B7080" fw={600} style={{ flexShrink: 0, marginLeft: 4 }}>하위</Text>
                <Text fz={8} c="#6B7080" fw={600} style={{ flexShrink: 0, marginLeft: 4, marginRight: 8 }}>ID</Text>
              </div>
              <ScrollArea flex={1} p="xs">
                {nodes.map((node) => (
                  <TreeNode
                    key={node.id}
                    node={node}
                    depth={0}
                    onSelect={handleSelectNode}
                    selectedId={selectedDetail?.node.id || null}
                    showHidden={showHidden}
                  />
                ))}
              </ScrollArea>
              {nodes.length > 0 && (
                <Group px="md" py={6} gap={6} style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
                  <Button
                    onClick={handleViewFileJson}
                    size="compact-xs"
                    variant="subtle"
                    color="gray"
                    fz={10}
                  >
                    JSON 보기
                  </Button>
                  <Button
                    onClick={handleDownloadJson}
                    size="compact-xs"
                    variant="subtle"
                    color="gray"
                    fz={10}
                  >
                    JSON 다운로드
                  </Button>
                </Group>
              )}
            </Paper>

            {/* Detail Panel */}
            <Paper
              withBorder
              radius="md"
              w={360}
              style={{ overflow: "hidden", display: "flex", flexDirection: "column", flexShrink: 0 }}
            >
              {selectedDetail ? (
                <>
                  <Stack px="sm" py={6} gap={2} style={{ borderBottom: "1px solid var(--border-medium, rgba(255,255,255,0.08))" }}>
                    <Text fz={11} fw={600} truncate>
                      {selectedDetail.node.name}
                    </Text>
                    <Group gap={4}>
                      <Badge
                        size="xs"
                        variant="light"
                        color={TYPE_COLORS[selectedDetail.node.type] || "gray"}
                        fz={9}
                      >
                        {selectedDetail.node.type}
                      </Badge>
                      <Code fz={9}>{selectedDetail.node.id}</Code>
                    </Group>
                  </Stack>

                  <ScrollArea flex={1} p="sm">
                    <Stack gap="sm">
                      {/* Action Buttons */}
                      <Group gap={4}>
                        <CopyButton value={getNodeId(selectedDetail.node.id)}>
                          {({ copied, copy }) => (
                            <Button
                              size="compact-xs"
                              variant="light"
                              color={copied ? "teal" : "gray"}
                              onClick={copy}
                              fz={9}
                            >
                              {copied ? "복사됨!" : "Node ID"}
                            </Button>
                          )}
                        </CopyButton>

                        <CopyButton
                          value={`get_figma_data(fileKey="${fileKey}", nodeId="${getNodeId(selectedDetail.node.id)}")`}
                        >
                          {({ copied, copy }) => (
                            <Button
                              size="compact-xs"
                              variant="light"
                              color={copied ? "teal" : "blue"}
                              onClick={copy}
                              fz={9}
                            >
                              {copied ? "복사됨!" : "MCP"}
                            </Button>
                          )}
                        </CopyButton>

                        <CopyButton
                          value={`https://www.figma.com/design/${fileKey}/?node-id=${getNodeId(selectedDetail.node.id)}`}
                        >
                          {({ copied, copy }) => (
                            <Button
                              size="compact-xs"
                              variant="light"
                              color={copied ? "teal" : "violet"}
                              onClick={copy}
                              fz={9}
                            >
                              {copied ? "복사됨!" : "URL"}
                            </Button>
                          )}
                        </CopyButton>

                        <Button
                          size="compact-xs"
                          variant="light"
                          color="orange"
                          onClick={handleFetchNodeJson}
                          loading={jsonLoading}
                          fz={9}
                        >
                          JSON
                        </Button>
                      </Group>

                      {/* Export Buttons */}
                      {["CANVAS", "FRAME", "COMPONENT", "COMPONENT_SET", "SECTION"].includes(
                        selectedDetail.node.type
                      ) && (
                        <Group gap={4}>
                          <Button
                            size="compact-xs"
                            variant="light"
                            color="teal"
                            fz={9}
                            loading={exporting}
                            onClick={() => {
                              const node = selectedDetail.node;
                              if (node.type === "CANVAS" && node.children) {
                                const frames = collectFrameNodes([node]);
                                if (frames.length === 0) {
                                  setError("캔버스에 내보낼 프레임이 없습니다.");
                                  return;
                                }
                                handleExportImages(frames, `캔버스 "${node.name}" (${frames.length}개)`);
                              } else {
                                handleExportImages(
                                  [{ id: node.id, name: node.name, type: node.type }],
                                  `"${node.name}"`
                                );
                              }
                            }}
                          >
                            {selectedDetail.node.type === "CANVAS" ? "캔버스 이미지" : "이미지"}
                          </Button>
                          <Button
                            size="compact-xs"
                            variant="light"
                            color="orange"
                            fz={9}
                            loading={exporting}
                            onClick={() => {
                              const node = selectedDetail.node;
                              if (node.type === "CANVAS" && node.children) {
                                const frames = collectFrameNodes([node]);
                                if (frames.length === 0) {
                                  setError("캔버스에 내보낼 프레임이 없습니다.");
                                  return;
                                }
                                handleExportHtml(frames, `캔버스 "${node.name}" (${frames.length}개)`);
                              } else {
                                handleExportHtml(
                                  [{ id: node.id, name: node.name, type: node.type }],
                                  `"${node.name}"`
                                );
                              }
                            }}
                          >
                            {selectedDetail.node.type === "CANVAS" ? "캔버스 HTML" : "HTML"}
                          </Button>
                          <Button
                            size="compact-xs"
                            variant="filled"
                            color="violet"
                            fz={9}
                            loading={exporting}
                            onClick={() => {
                              const node = selectedDetail.node;
                              if (node.type === "CANVAS" && node.children) {
                                const frames = collectFrameNodes([node]);
                                if (frames.length === 0) {
                                  setError("캔버스에 내보낼 프레임이 없습니다.");
                                  return;
                                }
                                handleExportHtmlAi(frames, `캔버스 "${node.name}" (${frames.length}개)`);
                              } else {
                                handleExportHtmlAi(
                                  [{ id: node.id, name: node.name, type: node.type }],
                                  `"${node.name}"`
                                );
                              }
                            }}
                          >
                            {selectedDetail.node.type === "CANVAS" ? "캔버스 AI HTML" : "AI HTML"}
                          </Button>
                        </Group>
                      )}

                      <Divider />

                      {/* Preview Image */}
                      <div>
                        <Text size="xs" fw={600} c="dimmed" mb="xs">
                          미리보기
                        </Text>
                        {selectedDetail.loading ? (
                          <Skeleton height={200} radius="md" />
                        ) : selectedDetail.imageUrl ? (
                          <Paper
                            withBorder
                            radius="md"
                            p="xs"
                            bg="var(--bg-tertiary, rgba(255,255,255,0.03))"
                          >
                            <Image
                              src={selectedDetail.imageUrl}
                              alt={selectedDetail.node.name}
                              radius="sm"
                              fit="contain"
                            />
                          </Paper>
                        ) : (
                          <Paper
                            withBorder
                            radius="md"
                            p="lg"
                            bg="var(--bg-tertiary, rgba(255,255,255,0.03))"
                          >
                            <Stack gap="xs">
                              <Group gap="xs">
                                <ThemeIcon size={24} variant="light" color="yellow" radius="md">
                                  <Text fz={12}>⚠</Text>
                                </ThemeIcon>
                                <Text fz={11} fw={600} c="var(--text-primary, #E5E7EB)">
                                  미리보기를 불러올 수 없습니다
                                </Text>
                              </Group>

                              <Divider color="var(--border-medium, rgba(255,255,255,0.06))" />

                              <Text size="xs" fw={600} c="var(--text-secondary, #9CA3AF)" mb={-4}>
                                가능한 원인
                              </Text>
                              <Stack gap={8}>
                                <Group gap="xs" wrap="nowrap" align="flex-start">
                                  <Text size="xs" c="yellow" fw={700} style={{ flexShrink: 0 }}>1</Text>
                                  <Text size="xs" c="var(--text-secondary, #D1D5DB)">
                                    FIGMA_API_KEY가 .env.local에 설정되지 않았습니다
                                  </Text>
                                </Group>
                                <Group gap="xs" wrap="nowrap" align="flex-start">
                                  <Text size="xs" c="yellow" fw={700} style={{ flexShrink: 0 }}>2</Text>
                                  <Text size="xs" c="var(--text-secondary, #D1D5DB)">
                                    해당 노드가 이미지로 렌더링할 수 없는 타입입니다
                                  </Text>
                                </Group>
                                <Group gap="xs" wrap="nowrap" align="flex-start">
                                  <Text size="xs" c="yellow" fw={700} style={{ flexShrink: 0 }}>3</Text>
                                  <Text size="xs" c="var(--text-secondary, #D1D5DB)">
                                    빈 프레임이거나 보이지 않는 요소입니다
                                  </Text>
                                </Group>
                              </Stack>
                            </Stack>
                          </Paper>
                        )}
                      </div>

                      {/* Node Info */}
                      {selectedDetail.node.children && (
                        <>
                          <Divider />
                          <div>
                            <Text size="xs" fw={600} c="dimmed" mb="xs">
                              정보
                            </Text>
                            <Group gap="xs">
                              <Badge size="sm" variant="dot" color="blue">
                                하위 요소 {selectedDetail.node.children.length}개
                              </Badge>
                            </Group>
                          </div>
                        </>
                      )}
                    </Stack>
                  </ScrollArea>
                </>
              ) : (
                <Center h="100%">
                  <Stack align="center" gap={4}>
                    <Text c="dimmed" fz={24}>
                      👈
                    </Text>
                    <Text fz={11} c="dimmed">
                      노드를 선택하면 상세 정보가 표시됩니다
                    </Text>
                  </Stack>
                </Center>
              )}
            </Paper>
          </div>
        )}
      </div>
      {/* JSON Viewer Modal */}
      <Modal
        opened={jsonModalOpen}
        onClose={() => setJsonModalOpen(false)}
        title={`Figma JSON ${jsonView === "file" ? "- 전체 파일" : "- 선택 노드"}`}
        size="xl"
        styles={{ body: { padding: 0 } }}
      >
        <Stack gap={0}>
          <Group px="md" py="xs" style={{ borderBottom: "1px solid var(--mantine-color-dark-4)" }}>
            <CopyButton value={rawJson ? JSON.stringify(rawJson, null, 2) : ""}>
              {({ copied, copy }) => (
                <Button size="xs" variant="light" color={copied ? "teal" : "blue"} onClick={copy}>
                  {copied ? "복사됨!" : "JSON 복사"}
                </Button>
              )}
            </CopyButton>
            <Button size="xs" variant="light" color="blue" onClick={handleDownloadJson}>
              다운로드
            </Button>
            <Badge size="sm" variant="light" color="gray">
              {rawJson ? `${JSON.stringify(rawJson).length.toLocaleString()} bytes` : "0 bytes"}
            </Badge>
          </Group>
          <ScrollArea h={500} p="md">
            <Code block style={{ fontSize: 11, whiteSpace: "pre-wrap", wordBreak: "break-all" }}>
              {rawJson ? JSON.stringify(rawJson, null, 2) : "데이터 없음"}
            </Code>
          </ScrollArea>
        </Stack>
      </Modal>

      {/* Save Modal */}
      <Modal
        opened={saveModalOpen}
        onClose={() => setSaveModalOpen(false)}
        title="피그마 허브에 등록"
        size="lg"
      >
        <Stack gap="md">
          <TextInput
            label="프로젝트 이름"
            placeholder="디자인 프로젝트 이름"
            value={saveForm.name}
            onChange={(e) => {
              const val = e.currentTarget.value;
              setSaveForm((prev) => ({ ...prev, name: val }));
            }}
            required
          />

          {saveForm.thumbnailUrl && (
            <div>
              <Text size="sm" fw={500} mb={4}>
                썸네일 미리보기
              </Text>
              <Paper withBorder radius="md" p="xs" bg="var(--mantine-color-dark-7)">
                <Image
                  src={saveForm.thumbnailUrl}
                  alt="thumbnail"
                  radius="sm"
                  fit="contain"
                  h={200}
                />
              </Paper>
            </div>
          )}

          <div>
            <Group justify="space-between" mb={4}>
              <Text size="sm" fw={500}>
                AI 분석 요약
              </Text>
              {saveForm.analyzing && (
                <Group gap={4}>
                  <Loader size={12} />
                  <Text size="xs" c="dimmed">
                    AI가 디자인을 분석하고 있습니다...
                  </Text>
                </Group>
              )}
            </Group>
            <Textarea
              placeholder={
                saveForm.analyzing
                  ? "AI가 디자인 파일을 분석 중..."
                  : "디자인 설명을 입력하거나 AI 분석 결과를 수정하세요"
              }
              value={saveForm.description}
              onChange={(e) => {
                const val = e.currentTarget.value;
                setSaveForm((prev) => ({
                  ...prev,
                  description: val,
                }));
              }}
              minRows={4}
              maxRows={8}
              autosize
              disabled={saveForm.analyzing}
            />
          </div>

          <Group gap="xs">
            <Badge size="sm" variant="light" color="gray">
              File Key: {fileKey}
            </Badge>
            <Badge size="sm" variant="light" color="violet">
              URL 저장됨
            </Badge>
          </Group>

          <Group justify="flex-end" mt="md">
            <Button variant="subtle" onClick={() => setSaveModalOpen(false)}>
              취소
            </Button>
            <Button
              onClick={handleSave}
              loading={saving}
              disabled={!saveForm.name || saveForm.analyzing}
              variant="gradient"
              gradient={{ from: "violet", to: "blue" }}
            >
              저장 및 공유
            </Button>
          </Group>
        </Stack>
      </Modal>

      {/* Export Settings Modal */}
      <Modal
        opened={exportSettingsOpen}
        onClose={() => setExportSettingsOpen(false)}
        title="내보내기 설정"
        size="md"
      >
        <Stack gap="md">
          <div>
            <Text size="sm" fw={500} mb={4}>이미지 내보내기 폴더</Text>
            <Text size="xs" c="dimmed" mb={8}>이미지가 저장될 폴더를 선택하세요</Text>
            <Group gap="sm">
              <Button
                variant="light"
                color="teal"
                size="sm"
                onClick={() => pickDirectory("image")}
                flex={1}
              >
                {imageDirName ? `${imageDirName} (변경)` : "폴더 선택"}
              </Button>
              {imageDirName && (
                <Badge size="lg" variant="light" color="teal" radius="sm">
                  {imageDirName}
                </Badge>
              )}
            </Group>
          </div>

          <div>
            <Text size="sm" fw={500} mb={4}>HTML 내보내기 폴더</Text>
            <Text size="xs" c="dimmed" mb={8}>HTML 파일이 저장될 폴더를 선택하세요</Text>
            <Group gap="sm">
              <Button
                variant="light"
                color="orange"
                size="sm"
                onClick={() => pickDirectory("html")}
                flex={1}
              >
                {htmlDirName ? `${htmlDirName} (변경)` : "폴더 선택"}
              </Button>
              {htmlDirName && (
                <Badge size="lg" variant="light" color="orange" radius="sm">
                  {htmlDirName}
                </Badge>
              )}
            </Group>
          </div>

          <Divider />

          <Group gap="md" grow>
            <Select
              label="이미지 형식"
              value={exportFormat}
              onChange={setExportFormat}
              data={[
                { value: "png", label: "PNG" },
                { value: "jpg", label: "JPG" },
                { value: "svg", label: "SVG" },
                { value: "pdf", label: "PDF" },
              ]}
            />
            <Select
              label="이미지 스케일"
              value={exportScale}
              onChange={setExportScale}
              data={[
                { value: "1", label: "1x" },
                { value: "2", label: "2x" },
                { value: "3", label: "3x" },
                { value: "4", label: "4x" },
              ]}
            />
          </Group>

          <Alert variant="light" color="blue" radius="md">
            <Text size="xs">
              폴더를 미리 선택하지 않아도 내보내기 시 폴더 선택 다이얼로그가 자동으로 열립니다.
            </Text>
          </Alert>

          <Group justify="flex-end">
            <Button variant="subtle" onClick={() => setExportSettingsOpen(false)}>
              닫기
            </Button>
          </Group>
        </Stack>
      </Modal>

      {/* Save Success Notification */}
      {saveSuccess && (
        <Notification
          color="teal"
          title="저장 완료!"
          onClose={() => setSaveSuccess(false)}
          style={{
            position: "fixed",
            bottom: 20,
            right: 20,
            zIndex: 1000,
            width: 320,
          }}
        >
          피그마 허브에 등록되었습니다. 피그마 허브에서 확인하세요.
        </Notification>
      )}

      {/* Export Result Notification */}
      {exportResult && (
        <Notification
          color={exportResult.includes("실패") || exportResult.includes("오류") ? "red" : "teal"}
          title="내보내기 결과"
          onClose={() => setExportResult(null)}
          style={{
            position: "fixed",
            bottom: saveSuccess ? 90 : 20,
            right: 20,
            zIndex: 1000,
            width: 400,
          }}
        >
          {exportResult}
        </Notification>
      )}
    </div>
  );
}
