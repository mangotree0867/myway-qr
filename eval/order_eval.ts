// 말로 주문하기 정확도 평가: AI 주문 에이전트 vs 규칙 기반(키워드) 비교
// 실행: npx tsx eval/order_eval.ts
import fs from "node:fs";
import { parseOrder, ruleOrder, type OrderAction } from "../lib/ai";
import { DEFAULT_PROFILE, type Lang } from "../lib/profile";
import { modelName, provider } from "../lib/llm";

interface Case { u: string; e?: string[]; clarify?: boolean; lg?: Lang }
const cases: Case[] = JSON.parse(fs.readFileSync(new URL("./order_cases.json", import.meta.url), "utf8"));

function toCart(actions: OrderAction[]): string[] {
  const m = new Map<string, number>();
  for (const a of actions) {
    if (a.op === "clear") { m.clear(); continue; }
    const k = `${a.itemId}/${a.temp}/${a.size}`;
    if (a.op === "remove") { for (const key of [...m.keys()]) if (key.startsWith(a.itemId + "/")) m.delete(key); continue; }
    m.set(k, (m.get(k) || 0) + (a.qty || 1));
  }
  return [...m.entries()].map(([k, q]) => `${k}/${q}`).sort();
}

function judge(c: Case, actions: OrderAction[], clarify: string | null) {
  if (c.clarify) return actions.length === 0 && !!clarify;
  return JSON.stringify(toCart(actions)) === JSON.stringify([...(c.e || [])].sort());
}

async function main() {
  const rows: unknown[] = [];
  let ai = 0, rule = 0, aiMs = 0;
  for (const c of cases) {
    const prof = { ...DEFAULT_PROFILE, lg: c.lg || "ko" };
    const t0 = Date.now();
    const r = await parseOrder(c.u, prof, []);
    const ms = Date.now() - t0;
    aiMs += ms;
    const rr = ruleOrder(c.u);
    const okA = judge(c, r.actions, r.clarify);
    const okR = judge(c, rr.actions, rr.clarify);
    ai += okA ? 1 : 0;
    rule += okR ? 1 : 0;
    rows.push({ u: c.u, expect: c.clarify ? "되묻기" : c.e, ai: c.clarify ? r.clarify : toCart(r.actions), aiOk: okA, aiSource: r.source, reply: r.reply || r.clarify, rule: toCart(rr.actions), ruleOk: okR, ms });
    process.stdout.write(okA ? "." : "x");
  }
  const summary = { provider: provider(), model: modelName("fast"), n: cases.length, aiAcc: ai / cases.length, ruleAcc: rule / cases.length, aiAvgMs: Math.round(aiMs / cases.length), at: new Date().toISOString() };
  console.log("\n", summary);
  fs.writeFileSync(new URL("./results/order_eval.json", import.meta.url), JSON.stringify({ summary, rows }, null, 2));
}
main();
