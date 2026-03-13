import { NextRequest, NextResponse } from "next/server";

const FIGMA_API_KEY = process.env.FIGMA_API_KEY || "";
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY || "";

interface FigmaNode {
  id: string;
  name: string;
  type: string;
  children?: FigmaNode[];
}

function extractStructure(node: FigmaNode, depth = 0, maxDepth = 3): string {
  if (depth > maxDepth) return "";
  const indent = "  ".repeat(depth);
  let result = `${indent}[${node.type}] ${node.name}\n`;
  if (node.children) {
    for (const child of node.children.slice(0, 20)) {
      result += extractStructure(child, depth + 1, maxDepth);
    }
    if (node.children.length > 20) {
      result += `${indent}  ... and ${node.children.length - 20} more\n`;
    }
  }
  return result;
}

function countNodes(node: FigmaNode): { total: number; types: Record<string, number> } {
  const types: Record<string, number> = {};
  let total = 0;

  function walk(n: FigmaNode) {
    total++;
    types[n.type] = (types[n.type] || 0) + 1;
    if (n.children) n.children.forEach(walk);
  }
  walk(node);
  return { total, types };
}

export async function POST(request: NextRequest) {
  try {
    const { fileKey, nodeId } = await request.json();

    if (!fileKey) {
      return NextResponse.json({ error: "fileKey is required" }, { status: 400 });
    }

    if (!FIGMA_API_KEY) {
      return NextResponse.json({ error: "FIGMA_API_KEY not configured" }, { status: 500 });
    }

    // Fetch Figma file data
    let figmaUrl: string;
    if (nodeId) {
      figmaUrl = `https://api.figma.com/v1/files/${fileKey}/nodes?ids=${nodeId.replace("-", ":")}`;
    } else {
      figmaUrl = `https://api.figma.com/v1/files/${fileKey}?depth=3`;
    }

    const figmaRes = await fetch(figmaUrl, {
      headers: { "X-Figma-Token": FIGMA_API_KEY },
    });

    if (!figmaRes.ok) {
      return NextResponse.json({ error: "Failed to fetch Figma data" }, { status: 500 });
    }

    const figmaData = await figmaRes.json();
    const fileName = figmaData.name || "Untitled";

    // Get root document node
    let rootNode: FigmaNode;
    if (nodeId && figmaData.nodes) {
      const nodeKey = Object.keys(figmaData.nodes)[0];
      rootNode = figmaData.nodes[nodeKey]?.document;
    } else {
      rootNode = figmaData.document;
    }

    if (!rootNode) {
      return NextResponse.json({ error: "Could not parse Figma document" }, { status: 500 });
    }

    const structure = extractStructure(rootNode);
    const stats = countNodes(rootNode);

    // Fetch thumbnail
    let thumbnailUrl: string | null = null;
    try {
      const targetNodeId = nodeId || rootNode.children?.[0]?.id;
      if (targetNodeId) {
        const imgRes = await fetch(
          `https://api.figma.com/v1/images/${fileKey}?ids=${targetNodeId.replace("-", ":")}&format=png&scale=2`,
          { headers: { "X-Figma-Token": FIGMA_API_KEY } }
        );
        if (imgRes.ok) {
          const imgData = await imgRes.json();
          const images = imgData.images || {};
          thumbnailUrl = Object.values(images)[0] as string || null;
        }
      }
    } catch {
      // thumbnail fetch is optional
    }

    // Generate AI summary if API key available
    let summary: string;

    if (ANTHROPIC_API_KEY) {
      const prompt = `You are analyzing a Figma design file for a Figma design tools platform.

File name: ${fileName}

Node structure (abbreviated):
${structure.slice(0, 3000)}

Node statistics:
- Total nodes: ${stats.total}
- Types: ${JSON.stringify(stats.types)}

Please provide a concise summary in Korean (3-5 sentences) covering:
1. What this design appears to be (page type, feature, component)
2. Key UI components identified
3. Design complexity and notable patterns
4. Recommended development approach

Be specific and technical, useful for developers who will implement this design.`;

      try {
        const aiRes = await fetch("https://api.anthropic.com/v1/messages", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-api-key": ANTHROPIC_API_KEY,
            "anthropic-version": "2023-06-01",
          },
          body: JSON.stringify({
            model: "claude-haiku-4-5-20251001",
            max_tokens: 500,
            messages: [{ role: "user", content: prompt }],
          }),
        });

        if (aiRes.ok) {
          const aiData = await aiRes.json();
          summary = aiData.content?.[0]?.text || generateFallbackSummary(fileName, stats);
        } else {
          summary = generateFallbackSummary(fileName, stats);
        }
      } catch {
        summary = generateFallbackSummary(fileName, stats);
      }
    } else {
      summary = generateFallbackSummary(fileName, stats);
    }

    return NextResponse.json({
      success: true,
      data: {
        fileName,
        summary,
        thumbnailUrl,
        stats: {
          totalNodes: stats.total,
          types: stats.types,
        },
        pages: rootNode.children?.map((c: FigmaNode) => c.name) || [],
      },
    });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

function generateFallbackSummary(
  fileName: string,
  stats: { total: number; types: Record<string, number> }
): string {
  const components = stats.types["COMPONENT"] || 0;
  const componentSets = stats.types["COMPONENT_SET"] || 0;
  const frames = stats.types["FRAME"] || 0;
  const texts = stats.types["TEXT"] || 0;
  const instances = stats.types["INSTANCE"] || 0;

  const parts: string[] = [];
  parts.push(`"${fileName}" 피그마 파일로, 총 ${stats.total}개의 노드로 구성되어 있습니다.`);

  if (components > 0 || componentSets > 0) {
    parts.push(`${componentSets}개의 컴포넌트 세트와 ${components}개의 컴포넌트가 정의되어 있으며, ${instances}개의 인스턴스가 사용되고 있습니다.`);
  }

  if (frames > 0) {
    parts.push(`${frames}개의 프레임과 ${texts}개의 텍스트 요소가 포함되어 있습니다.`);
  }

  parts.push("상세한 AI 분석을 위해 ANTHROPIC_API_KEY를 .env에 설정해주세요.");

  return parts.join(" ");
}
