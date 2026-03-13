import { NextRequest, NextResponse } from "next/server";

const FIGMA_API_KEY = process.env.FIGMA_API_KEY || "";
const FIGMA_API_BASE = "https://api.figma.com/v1";

// Returns Figma image URLs for given nodes (client downloads and saves)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      fileKey,
      nodes,
      format = "png",
      scale = 2,
    }: {
      fileKey: string;
      nodes: Array<{ id: string; name: string }>;
      format?: "png" | "jpg" | "svg" | "pdf";
      scale?: number;
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
      imageUrl: string;
      status: "success" | "failed";
      error?: string;
    }> = [];

    const batchSize = 50;

    for (let i = 0; i < nodes.length; i += batchSize) {
      const batch = nodes.slice(i, i + batchSize);
      const ids = batch.map((n) => n.id.replace("-", ":")).join(",");

      const params = new URLSearchParams({
        ids,
        format,
        scale: String(scale),
      });

      const figmaRes = await fetch(
        `${FIGMA_API_BASE}/images/${fileKey}?${params}`,
        { headers: { "X-Figma-Token": FIGMA_API_KEY } }
      );

      if (!figmaRes.ok) {
        for (const node of batch) {
          results.push({
            nodeId: node.id,
            nodeName: node.name,
            fileName: "",
            imageUrl: "",
            status: "failed",
            error: `Figma API error: ${figmaRes.status}`,
          });
        }
        continue;
      }

      const figmaData = await figmaRes.json();
      const images: Record<string, string | null> = figmaData.images || {};

      for (const node of batch) {
        const figmaId = node.id.replace("-", ":");
        const imageUrl = images[figmaId];

        if (!imageUrl) {
          results.push({
            nodeId: node.id,
            nodeName: node.name,
            fileName: "",
            imageUrl: "",
            status: "failed",
            error: "No image URL returned",
          });
          continue;
        }

        const safeName = node.name
          .replace(/[<>:"/\\|?*]/g, "_")
          .replace(/\s+/g, "_")
          .substring(0, 100);
        const fileName = `${safeName}_${node.id.replace(":", "-")}.${format}`;

        results.push({
          nodeId: node.id,
          nodeName: node.name,
          fileName,
          imageUrl,
          status: "success",
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
        format,
        results,
      },
    });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
