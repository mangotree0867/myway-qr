import { NextResponse } from "next/server";
import { provider, modelName } from "@/lib/llm";
export async function GET() {
  return NextResponse.json({ ok: true, provider: provider(), fast: modelName("fast"), vision: modelName("vision") });
}
