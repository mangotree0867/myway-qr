// 규칙을 다듬은 뒤, 처음 보는 문장 10개로 다시 확인 (과적합 점검)
import fs from "node:fs";
import { onboard } from "../lib/ai";
const cases: { u: string; e: Record<string, unknown> }[] = [
  { u: "요즘 노안이 와서 작은 글씨를 못 읽겠어", e: { fs: 3 } },
  { u: "메뉴 이름이 다 외래어라서 뭐가 뭔지 몰라요", e: { ez: 2, lg: "ko" } },
  { u: "파킨슨병 때문에 손이 많이 떨려요", e: { vi: true } },
  { u: "전동 휠체어를 타고 다녀요", e: { lo: true } },
  { u: "보청기를 껴도 잘 안 들려요", e: { vo: false } },
  { u: "견과류를 먹으면 안 돼요", e: { av: ["nuts"] } },
  { u: "Tôi không đọc được tiếng Hàn", e: { lg: "vi" } },
  { u: "Please make it English, I'm a tourist", e: { lg: "en" } },
  { u: "빨리 누르라고 재촉하는 게 너무 싫어요", e: { nt: true } },
  { u: "앞이 거의 안 보이는 시각장애인입니다", e: { hc: true, vi: true } },
];
(async () => {
  let ok = 0; const rows = [];
  for (const c of cases) {
    const r = await onboard(c.u); const p = r.profile as Record<string, unknown>;
    const miss = Object.entries(c.e).filter(([k, v]) => (Array.isArray(v) ? !(v as string[]).every((x) => (p[k] as string[] | undefined)?.includes(x)) : p[k] !== v));
    ok += miss.length ? 0 : 1; rows.push({ u: c.u, expect: c.e, got: p, good: !miss.length });
    process.stdout.write(miss.length ? "x" : ".");
  }
  const summary = { n: cases.length, acc: ok / cases.length, at: new Date().toISOString() };
  console.log("\n", summary);
  fs.writeFileSync(new URL("./results/onboard_holdout.json", import.meta.url), JSON.stringify({ summary, rows }, null, 2));
})();
