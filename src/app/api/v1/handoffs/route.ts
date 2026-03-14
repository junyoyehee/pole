import { prisma } from "@/lib/prisma";
import { success, error } from "@/lib/api";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      componentName,
      figmaProjectId,
      figmaNodeId,
      figmaUrl,
      developerId,
      priority,
      specData,
      notes,
      previewImages,
    } = body;

    if (!componentName || !figmaProjectId || !developerId) {
      return error(
        "VALIDATION_ERROR",
        "컴포넌트 이름, Figma 프로젝트, 담당 개발자는 필수입니다.",
        400
      );
    }

    const handoff = await prisma.handoff.create({
      data: {
        componentName,
        figmaProjectId,
        figmaNodeId: figmaNodeId || null,
        figmaUrl: figmaUrl || null,
        developerId,
        priority: priority || "NORMAL",
        specData: specData || null,
        notes: notes || null,
        previewImages: previewImages ? JSON.stringify(previewImages) : null,
        status: "PENDING",
      },
      include: {
        figmaProject: { select: { name: true } },
        developer: { select: { name: true } },
      },
    });

    return success(handoff, 201);
  } catch (err) {
    console.error("Handoff creation error:", err);
    return error("INTERNAL_ERROR", "핸드오프 등록에 실패했습니다.", 500);
  }
}

export async function GET() {
  try {
    const handoffs = await prisma.handoff.findMany({
      include: {
        figmaProject: { select: { name: true, fileKey: true, designerId: true, designer: { select: { name: true } } } },
        developer: { select: { name: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    return success(handoffs);
  } catch (err) {
    console.error("Handoff list error:", err);
    return error("INTERNAL_ERROR", "핸드오프 목록을 불러올 수 없습니다.", 500);
  }
}
