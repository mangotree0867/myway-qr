// 쉬운 말 변환 평가 + 메뉴 캐시 생성
// - 지표: 설명 글자 수, 어려운 말(외래어, 전문용어) 개수, 원문에 없는 사실을 지어냈는지(AI 검수)
// - 결과로 나온 변환문은 lib/data/easy-cache.json 에 저장해 키오스크가 바로 쓴다 (메뉴가 바뀔 때만 다시 생성)
// 실행: npx tsx eval/easy_eval.ts
import fs from "node:fs";
import { easyMenu, type EasyItem } from "../lib/ai";
import { llmJSON, modelName, provider } from "../lib/llm";
import { MENU } from "../lib/menu";
import type { Lang } from "../lib/profile";

const JARGON = ["에스프레소", "샷", "클린", "블랙", "스팀", "밀크", "밸런스", "시럽", "시그니처", "빈", "저온", "추출", "산미", "롱블랙", "수제", "비엔나", "스타일", "소스", "휘핑", "파우더", "페이스트", "블렌딩", "요거트", "베이스", "탄산수", "디카페인", "허브", "티백", "인퓨전", "베르가못", "크림치즈", "텍스처", "AOP", "라미네이팅", "고메", "게랑드", "토핑", "꼬끄", "가나슈", "필링", "CO2", "공법", "마다가스카르", "벨기에산", "다크", "꾸덕"];
const countJ = (s: string) => JARGON.reduce((n, j) => n + (s.includes(j) ? 1 : 0), 0);

async function factCheck(items: EasyItem[]) {
  const schema = { type: "object", properties: { results: { type: "array", items: { type: "object", properties: { id: { type: "string" }, invented: { type: "boolean" }, reason: { type: "string" } }, required: ["id", "invented", "reason"] } } }, required: ["results"] };
  const pairs = items.map((e) => ({ id: e.id, original: MENU.find((m) => m.id === e.id)!.name + ": " + MENU.find((m) => m.id === e.id)!.desc, rewritten: e.name + ": " + e.desc + " (" + e.tags.join(", ") + ")" }));
  const r = await llmJSON<{ results: { id: string; invented: boolean; reason: string }[] }>({
    system: "당신은 엄격한 검수자입니다. 다시 쓴 글이 원문에 없는 사실(재료, 원산지, 효능, 맛)을 새로 지어냈으면 invented=true. 원문의 뜻을 쉬운 말로 바꾸거나 메뉴 이름에서 당연히 알 수 있는 것(아메리카노는 커피, 라떼에는 우유)은 지어낸 것이 아니다.",
    user: JSON.stringify(pairs),
    schema,
    kind: "fast",
    maxTokens: 3000,
  });
  return r.results;
}

async function main() {
  const cache: Record<string, EasyItem[]> = {};
  const report: Record<string, unknown> = {};
  const orig = { avgLen: avg(MENU.map((m) => m.desc.length)), jargon: MENU.reduce((n, m) => n + countJ(m.desc), 0) };
  const langs: Lang[] = ["ko", "en", "vi", "zh", "ja"];
  for (const lg of langs) {
    for (const ez of [1, 2] as const) {
      const t0 = Date.now();
      const items = await easyMenu(MENU, ez, lg);
      const ms = Date.now() - t0;
      cache[`${ez}-${lg}`] = items;
      const entry: Record<string, unknown> = { ms, n: items.length };
      if (lg === "ko") {
        entry.avgLen = avg(items.map((i) => i.desc.length));
        entry.jargon = items.reduce((n, i) => n + countJ(i.desc), 0);
        const fc = await factCheck(items);
        entry.invented = fc.filter((x) => x.invented);
        entry.samples = items.slice(0, 18).map((i) => ({ id: i.id, before: MENU.find((m) => m.id === i.id)!.desc, after: `${i.name}: ${i.desc}`, tags: i.tags }));
      } else {
        entry.samples = items.slice(0, 4).map((i) => `${i.name}: ${i.desc}`);
        entry.hangulLeak = items.filter((i) => /[가-힣]/.test(i.name + i.desc + i.tags.join(""))).length;
      }
      report[`${ez}-${lg}`] = entry;
      console.log(`${ez}-${lg}`, ms + "ms", entry.avgLen ?? "", entry.jargon ?? "");
    }
  }
  fs.writeFileSync(new URL("../lib/data/easy-cache.json", import.meta.url), JSON.stringify(cache, null, 1));
  fs.writeFileSync(new URL("./results/easy_eval.json", import.meta.url), JSON.stringify({ provider: provider(), model: modelName("fast"), original: orig, report, at: new Date().toISOString() }, null, 2));
  console.log("original", orig);
}
const avg = (a: number[]) => Math.round((a.reduce((s, x) => s + x, 0) / a.length) * 10) / 10;
main();
