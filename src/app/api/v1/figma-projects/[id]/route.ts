import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { success, error } from "@/lib/api";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const item = await prisma.figmaProject.findUnique({
    where: { id },
    include: {
      designer: { select: { id: true, name: true, avatarUrl: true, part: true } },
      reviews: {
        include: {
          author: { select: { id: true, name: true } },
          _count: { select: { feedbacks: true } },
        },
        orderBy: { createdAt: "desc" },
      },
      handoffs: {
        include: {
          developer: { select: { id: true, name: true } },
        },
        orderBy: { createdAt: "desc" },
      },
    },
  });

  if (!item) return error("NOT_FOUND", "Figma project not found", 404);
  return success(item);
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const body = await request.json();
    const item = await prisma.figmaProject.update({
      where: { id },
      data: body,
    });
    return success(item);
  } catch {
    return error("UPDATE_FAILED", "Failed to update figma project", 500);
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    await prisma.figmaProject.delete({ where: { id } });
    return success({ deleted: true });
  } catch {
    return error("DELETE_FAILED", "Failed to delete figma project", 500);
  }
}
