import { NextRequest, NextResponse } from "next/server";

const FIGMA_API_KEY = process.env.FIGMA_API_KEY || "";
const FIGMA_API_BASE = "https://api.figma.com/v1";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);

  // URL 프록시 모드: ?url=https://... → 이미지 바이너리 반환
  const proxyUrl = searchParams.get("url");
  if (proxyUrl) {
    try {
      const res = await fetch(proxyUrl);
      if (!res.ok) {
        return NextResponse.json(
          { error: `Image fetch failed: ${res.status}` },
          { status: res.status }
        );
      }
      const blob = await res.blob();
      return new NextResponse(blob, {
        headers: {
          "Content-Type": blob.type || "image/png",
          "Content-Length": String(blob.size),
        },
      });
    } catch (error) {
      return NextResponse.json(
        { error: "Failed to proxy image", details: String(error) },
        { status: 500 }
      );
    }
  }

  // 기존 Figma 이미지 URL 조회 모드
  const fileKey = searchParams.get("fileKey");
  const nodeId = searchParams.get("nodeId");

  if (!fileKey || !nodeId) {
    return NextResponse.json(
      { error: "fileKey and nodeId (or url) are required" },
      { status: 400 }
    );
  }

  try {
    const params = new URLSearchParams({
      ids: nodeId.replaceAll("-", ":"),
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
