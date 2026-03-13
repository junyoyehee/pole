import { NextRequest, NextResponse } from "next/server";

const FIGMA_API_KEY = process.env.FIGMA_API_KEY || "";
const FIGMA_API_BASE = "https://api.figma.com/v1";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const fileKey = searchParams.get("fileKey");
  const nodeId = searchParams.get("nodeId");
  const depth = searchParams.get("depth");

  if (!fileKey) {
    return NextResponse.json({ error: "fileKey is required" }, { status: 400 });
  }

  if (!FIGMA_API_KEY) {
    return NextResponse.json(
      { error: "FIGMA_API_KEY is not configured in .env.local" },
      { status: 500 }
    );
  }

  try {
    let url: string;

    if (nodeId) {
      const params = new URLSearchParams({ ids: nodeId.replace("-", ":") });
      if (depth) params.set("depth", depth);
      url = `${FIGMA_API_BASE}/files/${fileKey}/nodes?${params}`;
    } else {
      const params = new URLSearchParams();
      if (depth) params.set("depth", depth);
      url = `${FIGMA_API_BASE}/files/${fileKey}?${params}`;
    }

    const res = await fetch(url, {
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
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to fetch from Figma API", details: String(error) },
      { status: 500 }
    );
  }
}
