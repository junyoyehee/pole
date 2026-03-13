import { NextResponse } from "next/server";

export function success(data: unknown, status = 200) {
  return NextResponse.json({ success: true, data }, { status });
}

export function error(code: string, message: string, status = 400) {
  return NextResponse.json(
    { success: false, error: { code, message } },
    { status }
  );
}

export function paginated(
  items: unknown[],
  page: number,
  limit: number,
  total: number
) {
  return NextResponse.json({
    success: true,
    data: { items, pagination: { page, limit, total } },
  });
}
