import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { success, error, paginated } from "@/lib/api";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const page = Math.max(1, Number(searchParams.get("page")) || 1);
  const limit = Math.min(50, Math.max(1, Number(searchParams.get("limit")) || 20));
  const status = searchParams.get("status");
  const search = searchParams.get("search");

  const where: Record<string, unknown> = {};
  if (status) where.status = status;
  if (search) {
    where.OR = [
      { name: { contains: search, mode: "insensitive" } },
      { description: { contains: search, mode: "insensitive" } },
    ];
  }

  const [items, total] = await Promise.all([
    prisma.figmaProject.findMany({
      where,
      include: {
        designer: { select: { id: true, name: true, avatarUrl: true, part: true } },
        _count: { select: { reviews: true, handoffs: true } },
      },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.figmaProject.count({ where }),
  ]);

  return paginated(items, page, limit, total);
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, figmaUrl, fileKey, description, status: projectStatus, designerId, thumbnailUrl } = body;

    if (!name) {
      return error("MISSING_FIELDS", "name is required");
    }

    // designerId가 없으면 첫 번째 사용자를 자동 할당
    let resolvedDesignerId = designerId;
    if (!resolvedDesignerId) {
      const firstUser = await prisma.user.findFirst({ select: { id: true } });
      if (!firstUser) {
        return error("NO_USER", "No users found in database", 400);
      }
      resolvedDesignerId = firstUser.id;
    }

    const item = await prisma.figmaProject.create({
      data: {
        name,
        figmaUrl: figmaUrl || null,
        fileKey: fileKey || null,
        description: description || null,
        status: projectStatus || "DESIGNING",
        designer: { connect: { id: resolvedDesignerId } },
        thumbnailUrl: thumbnailUrl || null,
      },
      include: {
        designer: { select: { id: true, name: true, avatarUrl: true, part: true } },
      },
    });

    return success(item, 201);
  } catch (e) {
    return error("CREATE_FAILED", String(e), 500);
  }
}
