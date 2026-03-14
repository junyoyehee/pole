import { NextRequest, NextResponse } from "next/server";

const FIGMA_API_KEY = process.env.FIGMA_API_KEY || "";
const FIGMA_API_BASE = "https://api.figma.com/v1";

function rgbaToHex(r: number, g: number, b: number, a: number): string {
  const toHex = (v: number) =>
    Math.round(v * 255)
      .toString(16)
      .padStart(2, "0");
  const hex = `#${toHex(r)}${toHex(g)}${toHex(b)}`;
  return a < 1 ? `${hex} (${Math.round(a * 100)}%)` : hex;
}

function extractSpecs(node: Record<string, unknown>): Record<string, string> {
  const specs: Record<string, string> = {};
  const box = node.absoluteBoundingBox as
    | { width: number; height: number }
    | undefined;

  if (box) {
    specs["너비"] = `${Math.round(box.width)}px`;
    specs["높이"] = `${Math.round(box.height)}px`;
  }

  // Padding (from layout)
  const pt = node.paddingTop as number | undefined;
  const pr = node.paddingRight as number | undefined;
  const pb = node.paddingBottom as number | undefined;
  const pl = node.paddingLeft as number | undefined;
  if (pt !== undefined || pr !== undefined) {
    if (pt === pb && pl === pr && pt === pl) {
      specs["패딩"] = `${pt ?? 0}px`;
    } else if (pt === pb && pl === pr) {
      specs["패딩"] = `${pt ?? 0}px ${pr ?? 0}px`;
    } else {
      specs["패딩"] = `${pt ?? 0}px ${pr ?? 0}px ${pb ?? 0}px ${pl ?? 0}px`;
    }
  }

  // Item spacing (gap)
  const itemSpacing = node.itemSpacing as number | undefined;
  if (itemSpacing !== undefined && itemSpacing > 0) {
    specs["간격 (gap)"] = `${itemSpacing}px`;
  }

  // Layout mode
  const layoutMode = node.layoutMode as string | undefined;
  if (layoutMode && layoutMode !== "NONE") {
    specs["레이아웃"] = layoutMode === "HORIZONTAL" ? "가로 (row)" : "세로 (column)";
  }

  // Border radius
  const cr = node.cornerRadius as number | undefined;
  if (cr && cr > 0) {
    specs["보더 반경"] = `${cr}px`;
  }

  // Fills (background)
  const fills = node.fills as Array<{
    type: string;
    visible?: boolean;
    color?: { r: number; g: number; b: number; a: number };
    opacity?: number;
  }> | undefined;
  if (fills && fills.length > 0) {
    const visible = fills.filter((f) => f.visible !== false);
    if (visible.length > 0) {
      const colors = visible.map((f) => {
        if (f.type === "SOLID" && f.color) {
          return rgbaToHex(f.color.r, f.color.g, f.color.b, f.opacity ?? f.color.a);
        }
        return f.type;
      });
      specs["배경"] = colors.join(", ");
    }
  }

  // Strokes (border)
  const strokes = node.strokes as Array<{
    type: string;
    visible?: boolean;
    color?: { r: number; g: number; b: number; a: number };
  }> | undefined;
  const strokeWeight = node.strokeWeight as number | undefined;
  if (strokes && strokes.length > 0 && strokeWeight) {
    const visible = strokes.filter((s) => s.visible !== false);
    if (visible.length > 0 && visible[0].color) {
      const c = visible[0].color;
      specs["보더"] = `${strokeWeight}px solid ${rgbaToHex(c.r, c.g, c.b, c.a)}`;
    }
  }

  // Effects (shadow)
  const effects = node.effects as Array<{
    type: string;
    visible?: boolean;
    color?: { r: number; g: number; b: number; a: number };
    offset?: { x: number; y: number };
    radius?: number;
    spread?: number;
  }> | undefined;
  if (effects && effects.length > 0) {
    const shadows = effects.filter(
      (e) => e.visible !== false && (e.type === "DROP_SHADOW" || e.type === "INNER_SHADOW")
    );
    if (shadows.length > 0) {
      const s = shadows[0];
      const c = s.color;
      const prefix = s.type === "INNER_SHADOW" ? "inset " : "";
      if (c) {
        specs["그림자"] =
          `${prefix}${s.offset?.x ?? 0}px ${s.offset?.y ?? 0}px ${s.radius ?? 0}px ${s.spread ?? 0}px ${rgbaToHex(c.r, c.g, c.b, c.a)}`;
      }
    }
  }

  // Typography (for text nodes)
  const style = node.style as {
    fontFamily?: string;
    fontSize?: number;
    fontWeight?: number;
    lineHeightPx?: number;
    letterSpacing?: number;
  } | undefined;
  if (style) {
    if (style.fontFamily) specs["폰트"] = style.fontFamily;
    if (style.fontSize) specs["글자 크기"] = `${style.fontSize}px`;
    if (style.fontWeight) specs["굵기"] = String(style.fontWeight);
    if (style.lineHeightPx) specs["줄 높이"] = `${Math.round(style.lineHeightPx)}px`;
    if (style.letterSpacing) specs["자간"] = `${style.letterSpacing}px`;
  }

  // Opacity
  const opacity = node.opacity as number | undefined;
  if (opacity !== undefined && opacity < 1) {
    specs["투명도"] = `${Math.round(opacity * 100)}%`;
  }

  return specs;
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const figmaUrl = searchParams.get("url");

  if (!figmaUrl) {
    return NextResponse.json({ error: "url parameter is required" }, { status: 400 });
  }

  if (!FIGMA_API_KEY) {
    return NextResponse.json(
      { error: "FIGMA_API_KEY is not configured" },
      { status: 500 }
    );
  }

  // Parse Figma URL to extract fileKey and nodeId
  let fileKey: string | null = null;
  let nodeId: string | null = null;

  try {
    const parsed = new URL(figmaUrl);
    // URL format: https://www.figma.com/design/{fileKey}/...?node-id={nodeId}
    const pathParts = parsed.pathname.split("/").filter(Boolean);
    const designIdx = pathParts.indexOf("design");
    const fileIdx = pathParts.indexOf("file");
    if (designIdx >= 0 && pathParts[designIdx + 1]) {
      fileKey = pathParts[designIdx + 1];
    } else if (fileIdx >= 0 && pathParts[fileIdx + 1]) {
      fileKey = pathParts[fileIdx + 1];
    }
    nodeId = parsed.searchParams.get("node-id");
  } catch {
    return NextResponse.json({ error: "Invalid Figma URL" }, { status: 400 });
  }

  if (!fileKey) {
    return NextResponse.json({ error: "Could not extract file key from URL" }, { status: 400 });
  }

  if (!nodeId) {
    return NextResponse.json({ error: "URL에 node-id 파라미터가 없습니다. 특정 노드를 선택한 URL을 사용하세요." }, { status: 400 });
  }

  try {
    const apiUrl = `${FIGMA_API_BASE}/files/${fileKey}/nodes?ids=${nodeId.replace("-", ":")}`;
    const res = await fetch(apiUrl, {
      headers: { "X-Figma-Token": FIGMA_API_KEY },
    });

    if (!res.ok) {
      const text = await res.text();
      return NextResponse.json(
        { error: `Figma API error: ${res.status}`, details: text },
        { status: res.status }
      );
    }

    const data = await res.json();
    const nodes = data.nodes;
    const nodeKey = Object.keys(nodes)[0];
    const nodeData = nodes[nodeKey]?.document;

    if (!nodeData) {
      return NextResponse.json({ error: "Node not found" }, { status: 404 });
    }

    const specs = extractSpecs(nodeData);

    return NextResponse.json({
      success: true,
      data: {
        nodeName: nodeData.name,
        nodeType: nodeData.type,
        specs,
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to fetch from Figma API", details: String(error) },
      { status: 500 }
    );
  }
}
