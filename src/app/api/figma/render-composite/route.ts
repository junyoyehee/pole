import { NextRequest, NextResponse } from "next/server";

const FIGMA_API_KEY = process.env.FIGMA_API_KEY || "";
const FIGMA_API_BASE = "https://api.figma.com/v1";

function corsHeaders() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  };
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders() });
}

export async function POST(request: NextRequest) {
  try {
    const { fileKey, nodeIds }: { fileKey: string; nodeIds: string[] } =
      await request.json();

    if (!fileKey || !nodeIds?.length) {
      return NextResponse.json(
        { error: "fileKey and nodeIds are required" },
        { status: 400, headers: corsHeaders() }
      );
    }

    if (!FIGMA_API_KEY) {
      return NextResponse.json(
        { error: "FIGMA_API_KEY is not configured" },
        { status: 500, headers: corsHeaders() }
      );
    }

    // Render each visible node via Figma API
    const ids = nodeIds.join(",");
    const res = await fetch(
      `${FIGMA_API_BASE}/images/${fileKey}?ids=${ids}&format=png&scale=2`,
      { headers: { "X-Figma-Token": FIGMA_API_KEY } }
    );

    if (!res.ok) {
      return NextResponse.json(
        { error: `Figma API error: ${res.status}` },
        { status: 502, headers: corsHeaders() }
      );
    }

    const data = await res.json();
    return NextResponse.json(
      { images: data.images || {} },
      { headers: corsHeaders() }
    );
  } catch (e) {
    return NextResponse.json(
      { error: String(e) },
      { status: 500, headers: corsHeaders() }
    );
  }
}
