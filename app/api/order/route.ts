import { NextResponse } from "next/server";
import { parseOrder } from "@/lib/ai";
import type { Profile } from "@/lib/profile";

export const runtime = "nodejs";
export const maxDuration = 30;

export async function POST(req: Request) {
  const { text, profile, cart } = (await req.json()) as { text: string; profile: Profile; cart: { itemId: string; temp: string | null; size: string; qty: number }[] };
  if (!text?.trim()) return NextResponse.json({ actions: [], reply: "", clarify: "다시 한 번 말씀해 주세요.", source: "rule" });
  const r = await parseOrder(text.slice(0, 300), profile, cart || []);
  return NextResponse.json(r);
}
