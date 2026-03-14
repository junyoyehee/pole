import { prisma } from "@/lib/prisma";
import { success, error } from "@/lib/api";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      title,
      figmaProjectId,
      figmaNodeId,
      figmaUrl,
      description,
      authorId,
      dueDate,
      previewImages,
    } = body;

    if (!title || !figmaProjectId || !authorId) {
      return error(
        "VALIDATION_ERROR",
        "리뷰 제목, Figma 프로젝트, 작성자는 필수입니다.",
        400
      );
    }

    const review = await prisma.designReview.create({
      data: {
        title,
        figmaProjectId,
        figmaNodeId: figmaNodeId || null,
        figmaUrl: figmaUrl || null,
        description: description || null,
        authorId,
        dueDate: dueDate || null,
        previewImages: previewImages ? JSON.stringify(previewImages) : null,
        status: "OPEN",
      },
      include: {
        figmaProject: { select: { name: true } },
        author: { select: { name: true } },
      },
    });

    return success(review, 201);
  } catch (err) {
    console.error("Design review creation error:", err);
    return error("INTERNAL_ERROR", "리뷰 등록에 실패했습니다.", 500);
  }
}

export async function GET() {
  try {
    const reviews = await prisma.designReview.findMany({
      include: {
        figmaProject: { select: { name: true, figmaUrl: true } },
        author: { select: { name: true } },
        feedbacks: {
          select: {
            id: true,
            content: true,
            category: true,
            priority: true,
            type: true,
            createdAt: true,
            author: { select: { name: true } },
          },
          orderBy: { createdAt: "asc" as const },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return success(reviews);
  } catch (err) {
    console.error("Design review list error:", err);
    return error("INTERNAL_ERROR", "리뷰 목록을 불러올 수 없습니다.", 500);
  }
}
