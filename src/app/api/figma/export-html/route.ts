import { NextRequest, NextResponse } from "next/server";

const FIGMA_API_KEY = process.env.FIGMA_API_KEY || "";
const FIGMA_API_BASE = "https://api.figma.com/v1";

interface FigmaNode {
  id: string;
  name: string;
  type: string;
  absoluteBoundingBox?: { x: number; y: number; width: number; height: number };
  fills?: Array<{
    type: string;
    color?: { r: number; g: number; b: number; a: number };
    opacity?: number;
  }>;
  strokes?: Array<{
    type: string;
    color?: { r: number; g: number; b: number; a: number };
  }>;
  strokeWeight?: number;
  cornerRadius?: number;
  characters?: string;
  style?: {
    fontSize?: number;
    fontFamily?: string;
    fontWeight?: number;
    textAlignHorizontal?: string;
    lineHeightPx?: number;
    letterSpacing?: number;
  };
  children?: FigmaNode[];
}

function rgbaToCSS(color: { r: number; g: number; b: number; a: number }, opacity?: number): string {
  const r = Math.round(color.r * 255);
  const g = Math.round(color.g * 255);
  const b = Math.round(color.b * 255);
  const a = opacity !== undefined ? opacity : color.a;
  return `rgba(${r}, ${g}, ${b}, ${a.toFixed(2)})`;
}

function nodeToHTML(node: FigmaNode, parentBBox?: { x: number; y: number }, imageMap: Record<string, string> = {}): string {
  const bbox = node.absoluteBoundingBox;
  if (!bbox) return "";

  const offsetX = parentBBox ? bbox.x - parentBBox.x : 0;
  const offsetY = parentBBox ? bbox.y - parentBBox.y : 0;

  const styles: string[] = [
    "position: absolute",
    `left: ${offsetX}px`,
    `top: ${offsetY}px`,
    `width: ${bbox.width}px`,
    `height: ${bbox.height}px`,
  ];

  if (node.fills?.length) {
    const solidFill = node.fills.find((f) => f.type === "SOLID" && f.color);
    if (solidFill?.color) {
      styles.push(`background-color: ${rgbaToCSS(solidFill.color, solidFill.opacity)}`);
    }
  }

  if (node.strokes?.length && node.strokeWeight) {
    const stroke = node.strokes.find((s) => s.type === "SOLID" && s.color);
    if (stroke?.color) {
      styles.push(`border: ${node.strokeWeight}px solid ${rgbaToCSS(stroke.color)}`);
    }
  }

  if (node.cornerRadius) {
    styles.push(`border-radius: ${node.cornerRadius}px`);
  }

  if (node.type === "TEXT" && node.style) {
    if (node.style.fontSize) styles.push(`font-size: ${node.style.fontSize}px`);
    if (node.style.fontFamily) styles.push(`font-family: '${node.style.fontFamily}', sans-serif`);
    if (node.style.fontWeight) styles.push(`font-weight: ${node.style.fontWeight}`);
    if (node.style.lineHeightPx) styles.push(`line-height: ${node.style.lineHeightPx}px`);
    if (node.style.letterSpacing) styles.push(`letter-spacing: ${node.style.letterSpacing}px`);
    if (node.style.textAlignHorizontal) styles.push(`text-align: ${node.style.textAlignHorizontal.toLowerCase()}`);

    const textFill = node.fills?.find((f) => f.type === "SOLID" && f.color);
    if (textFill?.color) {
      styles.push(`color: ${rgbaToCSS(textFill.color)}`);
    }
  }

  const styleStr = styles.join("; ");
  const safeName = node.name.replace(/[<>"&]/g, "_");
  const nodeId = node.id.replace(":", "-");

  const imgSrc = imageMap[node.id];

  if (node.type === "TEXT") {
    const text = (node.characters || "").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    return `  <div class="figma-node" data-node-id="${nodeId}" data-name="${safeName}" style="${styleStr}">${text}</div>\n`;
  }

  if (imgSrc) {
    return `  <div class="figma-node" data-node-id="${nodeId}" data-name="${safeName}" style="${styleStr}"><img src="${imgSrc}" style="width:100%;height:100%;object-fit:cover;" alt="${safeName}" /></div>\n`;
  }

  let html = `  <div class="figma-node" data-node-id="${nodeId}" data-name="${safeName}" style="${styleStr}">\n`;

  if (node.children) {
    for (const child of node.children) {
      html += nodeToHTML(child, bbox, imageMap);
    }
  }

  html += `  </div>\n`;
  return html;
}

function generateFullHTML(node: FigmaNode, fileName: string, imageMap: Record<string, string> = {}): string {
  const bbox = node.absoluteBoundingBox || { x: 0, y: 0, width: 1440, height: 900 };

  return `<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${fileName} - ${node.name}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      background: #1a1a2e;
      display: flex;
      justify-content: center;
      padding: 40px;
      min-height: 100vh;
    }
    .figma-canvas {
      position: relative;
      width: ${bbox.width}px;
      height: ${bbox.height}px;
      overflow: hidden;
      background: #fff;
      box-shadow: 0 4px 32px rgba(0,0,0,0.3);
      border-radius: 8px;
    }
    .figma-node { overflow: hidden; }
    .figma-node:hover {
      outline: 1px dashed rgba(167, 139, 250, 0.5);
      outline-offset: -1px;
    }
    .figma-info {
      position: fixed;
      bottom: 16px;
      left: 16px;
      background: rgba(0,0,0,0.8);
      color: #fff;
      padding: 8px 16px;
      border-radius: 8px;
      font-family: 'JetBrains Mono', monospace;
      font-size: 12px;
    }
    .figma-info span { color: #A78BFA; }
  </style>
</head>
<body>
  <div class="figma-canvas">
${node.children ? node.children.map((child) => nodeToHTML(child, bbox, imageMap)).join("") : nodeToHTML(node, undefined, imageMap)}
  </div>
  <div class="figma-info">
    <span>Figma Export</span> | ${node.name} | ${bbox.width}x${bbox.height}
  </div>
  <script>
    document.querySelectorAll('.figma-node').forEach(el => {
      el.addEventListener('click', (e) => {
        e.stopPropagation();
        const info = document.querySelector('.figma-info');
        info.innerHTML = '<span>' + el.dataset.name + '</span> | node-id: ' + el.dataset.nodeId;
      });
    });
  </script>
</body>
</html>`;
}

// Returns generated HTML content (does not write to disk)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      fileKey,
      nodes,
    }: {
      fileKey: string;
      nodes: Array<{ id: string; name: string; type: string }>;
    } = body;

    if (!fileKey || !nodes?.length) {
      return NextResponse.json(
        { error: "fileKey and nodes are required" },
        { status: 400 }
      );
    }

    if (!FIGMA_API_KEY) {
      return NextResponse.json(
        { error: "FIGMA_API_KEY is not configured" },
        { status: 500 }
      );
    }

    const results: Array<{
      nodeId: string;
      nodeName: string;
      fileName: string;
      htmlContent: string;
      status: "success" | "failed";
      error?: string;
    }> = [];

    for (const node of nodes) {
      try {
        const figmaNodeId = node.id.replace("-", ":");
        const nodeRes = await fetch(
          `${FIGMA_API_BASE}/files/${fileKey}/nodes?ids=${figmaNodeId}&depth=10`,
          { headers: { "X-Figma-Token": FIGMA_API_KEY } }
        );

        if (!nodeRes.ok) {
          results.push({
            nodeId: node.id,
            nodeName: node.name,
            fileName: "",
            htmlContent: "",
            status: "failed",
            error: `Figma API error: ${nodeRes.status}`,
          });
          continue;
        }

        const nodeData = await nodeRes.json();
        const nodeKey = Object.keys(nodeData.nodes)[0];
        const figmaDoc = nodeData.nodes[nodeKey]?.document;

        if (!figmaDoc) {
          results.push({
            nodeId: node.id,
            nodeName: node.name,
            fileName: "",
            htmlContent: "",
            status: "failed",
            error: "Could not parse node data",
          });
          continue;
        }

        // Collect image fill node IDs and get their URLs (embedded as data URIs won't work, use Figma CDN URLs)
        const imageMap: Record<string, string> = {};
        const imageNodeIds: string[] = [];
        function collectImageNodes(n: FigmaNode) {
          const imageTypes = ["RECTANGLE", "ELLIPSE", "VECTOR", "STAR", "LINE", "REGULAR_POLYGON"];
          if (imageTypes.includes(n.type) && n.fills?.some((f) => f.type === "IMAGE")) {
            imageNodeIds.push(n.id);
          }
          n.children?.forEach(collectImageNodes);
        }
        collectImageNodes(figmaDoc);

        if (imageNodeIds.length > 0) {
          const ids = imageNodeIds.join(",");
          const imgRes = await fetch(
            `${FIGMA_API_BASE}/images/${fileKey}?ids=${ids}&format=png&scale=2`,
            { headers: { "X-Figma-Token": FIGMA_API_KEY } }
          );
          if (imgRes.ok) {
            const imgData = await imgRes.json();
            const images = imgData.images || {};
            for (const [id, url] of Object.entries(images)) {
              if (url) imageMap[id] = url as string;
            }
          }
        }

        const safeName = node.name
          .replace(/[<>:"/\\|?*]/g, "_")
          .replace(/\s+/g, "_")
          .substring(0, 100);
        const htmlFileName = `${safeName}_${node.id.replace(":", "-")}.html`;
        const htmlContent = generateFullHTML(figmaDoc, nodeData.name || "Figma Export", imageMap);

        results.push({
          nodeId: node.id,
          nodeName: node.name,
          fileName: htmlFileName,
          htmlContent,
          status: "success",
        });
      } catch (e) {
        results.push({
          nodeId: node.id,
          nodeName: node.name,
          fileName: "",
          htmlContent: "",
          status: "failed",
          error: String(e),
        });
      }
    }

    const successCount = results.filter((r) => r.status === "success").length;

    return NextResponse.json({
      success: true,
      data: {
        total: results.length,
        successCount,
        failCount: results.length - successCount,
        results,
      },
    });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
