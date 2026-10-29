// 화면 도우미 정확도 평가: 사진 속에서 '지금 누를 버튼'을 맞게 찾았는가
// 정답: 시뮬레이터 DOM에서 뽑은 실제 버튼 위치. 판정: AI가 표시한 영역의 중심이 정답 버튼 안에 들어가면 성공.
// 실행: npx tsx eval/lens_eval.ts clean|photo
import fs from "node:fs";
import { imageSize } from "./imgsize";
import { readScreen } from "../lib/ai";
import { DEFAULT_PROFILE } from "../lib/profile";
import { modelName, provider } from "../lib/llm";

const set = process.argv[2] || "clean";
const dir = new URL(`./lens/`, import.meta.url);
const cases: { img: string; goal: string; label: string; box: number[] }[] = JSON.parse(fs.readFileSync(new URL(`cases_${set}.json`, dir), "utf8"));

async function main() {
  let hit = 0, label = 0, ms = 0, fail = 0;
  const rows: unknown[] = [];
  for (const c of cases) {
    const buf = fs.readFileSync(new URL(`${set}/${c.img}`, dir));
    const { w, h } = imageSize(buf);
    const mime = c.img.endsWith(".png") ? "image/png" : "image/jpeg";
    const t0 = Date.now();
    let g;
    try {
      g = await readScreen({ mime, base64: buf.toString("base64"), w, h }, c.goal, { ...DEFAULT_PROFILE, ez: 1 });
    } catch (e) {
      fail++;
      rows.push({ ...c, error: String(e).slice(0, 200) });
      process.stdout.write("E");
      continue;
    }
    const t = Date.now() - t0;
    ms += t;
    let ok = false;
    if (g.box) {
      const cx = (g.box[0] + g.box[2]) / 2, cy = (g.box[1] + g.box[3]) / 2;
      ok = cx >= c.box[0] && cx <= c.box[2] && cy >= c.box[1] && cy <= c.box[3];
    }
    const norm = (s: string) => s.replace(/\s/g, "").toLowerCase();
    const lok = !!g.target && (norm(g.target).includes(norm(c.label)) || norm(c.label).includes(norm(g.target)));
    hit += ok ? 1 : 0;
    label += lok ? 1 : 0;
    rows.push({ img: c.img, goal: c.goal, gt: c.label, gtBox: c.box, target: g.target, box: g.box, hit: ok, labelOk: lok, instruction: g.instruction, caution: g.caution, ms: t });
    process.stdout.write(ok ? "." : "x");
  }
  const n = cases.length;
  const summary = { set, provider: provider(), model: modelName("vision"), n, boxHit: hit / n, labelAcc: label / n, errors: fail, avgMs: Math.round(ms / Math.max(1, n - fail)), at: new Date().toISOString() };
  console.log("\n", summary);
  fs.writeFileSync(new URL(`./results/lens_eval_${set}.json`, import.meta.url), JSON.stringify({ summary, rows }, null, 2));
}
main();
