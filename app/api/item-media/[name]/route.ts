import { NextResponse } from "next/server";
export const runtime = "nodejs";
export async function GET(
  _request: Request,
  context: { params: Promise<{ name: string }> },
) {
  const { name } = await context.params;
  if (!/^item-[a-zA-Z0-9-]+\.(?:png|jpe?g|webp|gif)$/.test(name))
    return new NextResponse(null, { status: 404 });
  const base =
    process.env.API_URL ??
    process.env.NEXT_PUBLIC_API_URL ??
    "http://localhost:3001/api/v1";
  const origin = new URL(base).origin;
  try {
    const result = await fetch(
      `${origin}/uploads/items/${encodeURIComponent(name)}`,
      {
        redirect: "error",
        signal: AbortSignal.timeout(15000),
        cache: "no-store",
      },
    );
    const type = result.headers.get("content-type") ?? "";
    if (!result.ok || !/^image\/(png|jpeg|webp|gif)(;|$)/.test(type))
      return new NextResponse(null, { status: 404 });
    return new NextResponse(result.body, {
      headers: {
        "content-type": type,
        "cache-control": "public, max-age=3600",
        "x-content-type-options": "nosniff",
      },
    });
  } catch {
    return new NextResponse(null, { status: 502 });
  }
}
