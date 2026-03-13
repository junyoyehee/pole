import { NextRequest, NextResponse } from "next/server";

const FIGMA_API_KEY = process.env.FIGMA_API_KEY || "";
const FIGMA_API_BASE = "https://api.figma.com/v1";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const fileKey = searchParams.get("fileKey");
  const nodeId = searchParams.get("nodeId");

  if (!fileKey || !nodeId) {
    return NextResponse.json(
      { error: "fileKey and nodeId are required" },
      { status: 400 }
    );
  }

  try {
    const params = new URLSearchParams({
      ids: nodeId.replace("-", ":"),
      format: "png",
      scale: "1",
    });

    const res = await fetch(
      `${FIGMA_API_BASE}/images/${fileKey}?${params}`,
      { headers: { "X-Figma-Token": FIGMA_API_KEY } }
    );

    if (!res.ok) {
      return NextResponse.json(
        { error: `Figma API error: ${res.status}` },
        { status: res.status }
      );
    }

    const data = await res.json();
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to fetch image", details: String(error) },
      { status: 500 }
    );
  }
}
