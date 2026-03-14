import { prisma } from "@/lib/prisma";
import { success, error } from "@/lib/api";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { reviewId, authorId, content, category, priority, type } = body;

    if (!reviewId || !authorId || !content) {
      return error(
        "VALIDATION_ERROR",
        "리뷰 ID, 작성자, 내용은 필수입니다.",
        400
      );
    }

    const feedback = await prisma.reviewFeedback.create({
      data: {
        reviewId,
        authorId,
        content,
        category: category || "OTHER",
        priority: priority || "NORMAL",
        type: type || "COMMENT",
      },
      include: {
        author: { select: { name: true } },
      },
    });

    return success(feedback, 201);
  } catch (err) {
    console.error("Feedback creation error:", err);
    return error("INTERNAL_ERROR", "피드백 등록에 실패했습니다.", 500);
  }
}
