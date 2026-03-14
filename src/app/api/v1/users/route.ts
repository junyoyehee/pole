import { prisma } from "@/lib/prisma";
import { success, error } from "@/lib/api";

export async function GET() {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        part: true,
        position: true,
        avatarUrl: true,
      },
      orderBy: { name: "asc" },
    });

    return success(users);
  } catch (err) {
    console.error("Users list error:", err);
    return error("INTERNAL_ERROR", "사용자 목록을 불러올 수 없습니다.", 500);
  }
}
