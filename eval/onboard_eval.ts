// 말로 설정 만들기 평가: 자유 발화 20개에서 핵심 설정을 맞게 골랐는가 (말한 것과 관련된 항목만 채점)
import fs from "node:fs";
import { onboard } from "../lib/ai";
type C = { u: string; e: Record<string, unknown> };
const cases: C[] = [
  { u: "눈이 침침해서 글씨가 안 보여요", e: { fs: 3 } },
  { u: "눈이 침침하고 영어로 된 메뉴는 무슨 뜻인지 모르겠어요", e: { fs: 3, ez: 2, lg: "ko" } },
  { u: "시각장애가 있어서 화면이 거의 안 보여요", e: { hc: true, vi: true, vo: true } },
  { u: "휠체어를 타서 위쪽 버튼에 손이 안 닿아요", e: { lo: true } },
  { u: "키가 작아서 화면 위가 안 닿아요", e: { lo: true } },
  { u: "귀가 잘 안 들려요", e: { vo: false } },
  { u: "청각장애인이에요", e: { vo: false } },
  { u: "손이 떨려서 작은 버튼을 누르기 어려워요", e: { vi: true } },
  { u: "어려운 말이 나오면 헷갈려요", e: { ez: 2 } },
  { u: "천천히 해야 해요. 시간이 지나면 처음으로 가 버려서 싫어요", e: { nt: true } },
  { u: "우유를 마시면 배가 아파요", e: { av: ["milk"] } },
  { u: "땅콩 알레르기가 있어요", e: { av: ["nuts"] } },
  { u: "임신 중이라 카페인을 피해야 해요", e: { av: ["caffeine"] } },
  { u: "I am from Vietnam and Korean is hard", e: { lg: "vi" } },
  { u: "저는 베트남 사람이에요. 한국어가 어려워요", e: { lg: "vi" } },
  { u: "I can't read Korean", e: { lg: "en" } },
  { u: "我是中国人，看不懂韩语", e: { lg: "zh" } },
  { u: "日本人です。韓国語が読めません", e: { lg: "ja" } },
  { u: "외국어 메뉴가 많아서 어려워요", e: { ez: 2, lg: "ko" } },
  { u: "눈부셔서 하얀 화면을 오래 못 봐요", e: { hc: true } },
];
(async () => {
  let ok = 0;
  const rows = [];
  for (const c of cases) {
    const r = await onboard(c.u);
    const p = r.profile as Record<string, unknown>;
    const miss = Object.entries(c.e).filter(([k, v]) => (Array.isArray(v) ? !(v as string[]).every((x) => (p[k] as string[] | undefined)?.includes(x)) : p[k] !== v));
    const good = miss.length === 0;
    ok += good ? 1 : 0;
    rows.push({ u: c.u, expect: c.e, got: p, good, summary: r.summary, source: r.source });
    process.stdout.write(good ? "." : "x");
  }
  const summary = { n: cases.length, acc: ok / cases.length, at: new Date().toISOString() };
  console.log("\n", summary);
  fs.writeFileSync(new URL("./results/onboard_eval.json", import.meta.url), JSON.stringify({ summary, rows }, null, 2));
})();
