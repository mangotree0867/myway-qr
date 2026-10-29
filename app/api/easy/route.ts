import { NextResponse } from "next/server";
import { easyMenu, type EasyItem } from "@/lib/ai";
import { MENU } from "@/lib/menu";
import type { Lang, Profile } from "@/lib/profile";
import cache from "@/lib/data/easy-cache.json";

export const runtime = "nodejs";
export const maxDuration = 60;

// 같은 (말 수준, 언어) 조합은 한 번만 만들고 재사용한다
const mem = new Map<string, EasyItem[]>();

export async function POST(req: Request) {
  const { ez, lg } = (await req.json()) as { ez: Profile["ez"]; lg: Lang };
  const key = `${ez}-${lg}`;
  const pre = (cache as Record<string, EasyItem[]>)[key];
  if (pre?.length) return NextResponse.json({ items: pre, source: "cache" });
  if (mem.has(key)) return NextResponse.json({ items: mem.get(key), source: "memory" });
  try {
    const items = await easyMenu(MENU, ez, lg);
    mem.set(key, items);
    return NextResponse.json({ items, source: "ai" });
  } catch (e) {
    return NextResponse.json({ items: [], source: "none", error: String(e).slice(0, 200) }, { status: 200 });
  }
}
