import { NextRequest, NextResponse } from "next/server";
import { saveDigest, type Digest } from "@/lib/storage";

export async function POST(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  const secret = process.env.PORTAL_API_SECRET;

  if (!secret || authHeader !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: Omit<Digest, "published_at">;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!body.date || !Array.isArray(body.articles)) {
    return NextResponse.json({ error: "Missing date or articles" }, { status: 400 });
  }

  await saveDigest({ ...body, published_at: new Date().toISOString() });

  return NextResponse.json({ success: true, date: body.date });
}
