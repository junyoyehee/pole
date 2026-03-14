import { NextRequest, NextResponse } from "next/server";
import { readFile } from "fs/promises";
import { join } from "path";

const FIGMA_API_KEY = process.env.FIGMA_API_KEY || "";
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY || "";
const FIGMA_API_BASE = "https://api.figma.com/v1";

async function loadInstruction(): Promise<string> {
  const filePath = join(process.cwd(), "docs", "ai-review-analyze.md");
  return readFile(filePath, "utf-8");
}

function parseFigmaUrl(url: string): { fileKey: string | null; nodeId: string | null } {
  try {
    const parsed = new URL(url);
    const pathParts = parsed.pathname.split("/").filter(Boolean);
    let fileKey: string | null = null;
    const designIdx = pathParts.indexOf("design");
    const fileIdx = pathParts.indexOf("file");
    if (designIdx >= 0 && pathParts[designIdx + 1]) {
      fileKey = pathParts[designIdx + 1];
    } else if (fileIdx >= 0 && pathParts[fileIdx + 1]) {
      fileKey = pathParts[fileIdx + 1];
    }
    const nodeId = parsed.searchParams.get("node-id");
    return { fileKey, nodeId };
  } catch {
    return { fileKey: null, nodeId: null };
  }
}

function collectRenderableNodeIds(node: Record<string, unknown>): string[] {
  const ids: string[] = [];
  const nodeId = node.id as string | undefined;
  if (nodeId) ids.push(nodeId);

  const children = node.children as Record<string, unknown>[] | undefined;
  if (children) {
    for (const child of children) {
      const childId = child.id as string | undefined;
      const childType = child.type as string | undefined;
      if (childId && childType && ["FRAME", "COMPONENT", "INSTANCE", "GROUP"].includes(childType)) {
        ids.push(childId);
      }
    }
  }
  return ids.slice(0, 10);
}

async function fetchFigmaImages(
  fileKey: string,
  nodeIds: string[]
): Promise<Record<string, string>> {
  if (nodeIds.length === 0) return {};

  const params = new URLSearchParams({
    ids: nodeIds.join(","),
    format: "png",
    scale: "2",
  });

  const res = await fetch(`${FIGMA_API_BASE}/images/${fileKey}?${params}`, {
    headers: { "X-Figma-Token": FIGMA_API_KEY },
  });

  if (!res.ok) return {};

  const data = await res.json();
  return (data.images as Record<string, string>) || {};
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      figmaUrl,
      projects = [],
      users = [],
    } = body as {
      figmaUrl: string;
      projects?: { id: string; name: string; figmaUrl?: string }[];
      users?: { id: string; name: string; part: string }[];
    };

    if (!figmaUrl) {
      return NextResponse.json({ error: "figmaUrl is required" }, { status: 400 });
    }
    if (!FIGMA_API_KEY) {
      return NextResponse.json({ error: "FIGMA_API_KEY is not configured" }, { status: 500 });
    }
    if (!ANTHROPIC_API_KEY) {
      return NextResponse.json({ error: "ANTHROPIC_API_KEY is not configured" }, { status: 500 });
    }

    // 1. Parse URL
    const { fileKey, nodeId } = parseFigmaUrl(figmaUrl);
    if (!fileKey) {
      return NextResponse.json({ error: "Could not extract file key from URL" }, { status: 400 });
    }

    // 2. Fetch Figma node data
    let figmaApiUrl: string;
    if (nodeId) {
      figmaApiUrl = `${FIGMA_API_BASE}/files/${fileKey}/nodes?ids=${nodeId.replace("-", ":")}`;
    } else {
      figmaApiUrl = `${FIGMA_API_BASE}/files/${fileKey}?depth=2`;
    }

    const figmaRes = await fetch(figmaApiUrl, {
      headers: { "X-Figma-Token": FIGMA_API_KEY },
    });

    if (!figmaRes.ok) {
      return NextResponse.json(
        { error: `Figma API error: ${figmaRes.status}` },
        { status: figmaRes.status }
      );
    }

    const figmaData = await figmaRes.json();

    let nodeData: Record<string, unknown> | undefined;
    if (nodeId && figmaData.nodes) {
      const key = Object.keys(figmaData.nodes)[0];
      nodeData = figmaData.nodes[key]?.document;
    } else {
      nodeData = figmaData.document;
    }

    if (!nodeData) {
      return NextResponse.json({ error: "Node not found" }, { status: 404 });
    }

    // 3. Fetch preview images
    const renderableIds = collectRenderableNodeIds(nodeData);
    const imageMap = await fetchFigmaImages(fileKey, renderableIds);

    const imageList = Object.entries(imageMap)
      .filter(([, url]) => url)
      .map(([id, url]) => ({ nodeId: id, url }));

    // 4. Load instruction
    const instruction = await loadInstruction();

    // 5. Call Anthropic API
    const imageContext = imageList.length > 0
      ? `\n\n## 미리보기 이미지 목록\n다음 이미지 URL들 중에서 리뷰어에게 가장 유용한 이미지를 최대 3개 추천하세요.\n\`\`\`json\n${JSON.stringify(imageList, null, 2)}\n\`\`\``
      : "";

    const anthropicRes = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 2048,
        messages: [
          {
            role: "user",
            content: `${instruction}\n\n---\n\n## Figma 노드 데이터\n\`\`\`json\n${JSON.stringify(nodeData, null, 2).slice(0, 15000)}\n\`\`\`\n\n## 프로젝트 목록\n\`\`\`json\n${JSON.stringify(projects)}\n\`\`\`\n\n## 팀원 목록\n\`\`\`json\n${JSON.stringify(users)}\n\`\`\`${imageContext}\n\n위 지침에 따라 분석하고 JSON만 출력하세요. 마크다운 코드 블록 없이 순수 JSON만 반환합니다.`,
          },
        ],
      }),
    });

    if (!anthropicRes.ok) {
      const errText = await anthropicRes.text();
      return NextResponse.json(
        { error: `Anthropic API error: ${anthropicRes.status}`, details: errText },
        { status: 500 }
      );
    }

    const anthropicData = await anthropicRes.json();
    const aiText = anthropicData.content?.[0]?.text || "";

    let result;
    try {
      const jsonMatch = aiText.match(/\{[\s\S]*\}/);
      result = jsonMatch ? JSON.parse(jsonMatch[0]) : JSON.parse(aiText);
    } catch {
      result = {
        title: (nodeData.name as string) || "",
        figmaProjectId: "",
        description: aiText,
        suggestedReviewers: [],
        previewImages: [],
      };
    }

    if (!result.previewImages || result.previewImages.length === 0) {
      result.previewImages = imageList.slice(0, 3).map((img) => ({
        ...img,
        reason: "Figma 노드 렌더링 이미지",
      }));
    }

    result._allImages = imageList;

    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    return NextResponse.json(
      { error: "Analysis failed", details: String(error) },
      { status: 500 }
    );
  }
}
