import { NextResponse } from "next/server";
import { readScreen } from "@/lib/ai";
import type { Profile } from "@/lib/profile";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(req: Request) {
  const { image, w, h, goal, profile } = (await req.json()) as { image: string; w: number; h: number; goal: string; profile: Profile };
  const m = image?.match(/^data:(image\/\w+);base64,(.+)$/);
  if (!m) return NextResponse.json({ error: "사진을 읽지 못했어요." }, { status: 400 });
  try {
    const r = await readScreen({ mime: m[1], base64: m[2], w, h }, (goal || "").slice(0, 200), profile);
    return NextResponse.json(r);
  } catch (e) {
    const msg = String(e);
    return NextResponse.json({ error: msg.includes("NO_AI_KEY") ? "AI 연결이 아직 설정되지 않았어요." : "AI가 잠시 응답하지 않아요. 다시 한 번 눌러 주세요.", detail: msg.slice(0, 200) }, { status: 503 });
  }
}
