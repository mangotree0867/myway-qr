import { NextResponse } from "next/server";
import { onboard } from "@/lib/ai";

export const runtime = "nodejs";
export const maxDuration = 30;

export async function POST(req: Request) {
  const { text } = (await req.json()) as { text: string };
  const r = await onboard((text || "").slice(0, 500));
  return NextResponse.json(r);
}
