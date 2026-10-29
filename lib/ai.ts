// 서버 전용: "내 방식 QR"의 AI 기능 4가지
// 1) easyMenu   : 키오스크 메뉴 원문을 사용자 프로필(말 수준, 언어)에 맞게 다시 쓰기
// 2) parseOrder : 말로 한 주문을 장바구니 동작으로 바꾸는 주문 에이전트
// 3) readScreen : 아무 키오스크 화면 사진을 보고, 목표까지 다음에 누를 곳을 찾아 안내
// 4) onboard    : "어떤 점이 불편하세요?"에 대한 자유 응답을 프로필 설정으로 바꾸기
import { llmJSON, provider } from "./llm";
import { MENU, type MenuItem } from "./menu";
import { LANG_LABEL, type Profile, type Lang, type Avoid } from "./profile";

const LANG_NAME: Record<Lang, string> = { ko: "한국어", en: "English", vi: "Vietnamese", zh: "Simplified Chinese", ja: "Japanese" };

const EASY_RULES = `쉬운 말 원칙 (발달장애인, 어르신, 느린 학습자를 위한 '쉬운 정보' 작성 원칙을 따른다)
- 한 문장에는 한 가지 정보만 담는다.
- 외래어, 영어, 전문용어(에스프레소, 샷, 추출, 블렌딩, 인퓨전, 산미, 텍스처, AOP 등)는 쓰지 않고 일상어로 바꾼다.
- 맛과 느낌은 '써요', '달아요', '부드러워요', '시원해요'처럼 몸으로 느끼는 말로 쓴다.
- 존댓말 '~예요/~이에요'로 끝낸다.
- 원산지와 지명(마다가스카르, 벨기에 등)은 빼고, 낯선 재료 이름(베르가못, 허브, 티백, 요거트, 크림치즈, 탄산수, 시럽, 소스 등)은 '꽃향기', '새콤한 우유', '부드러운 치즈', '톡 쏘는 물', '단 물'처럼 일상어로 풀어 쓴다.
- 원문에 없는 사실(원산지, 효능 등)을 지어내지 않는다.`;

function levelGuide(ez: Profile["ez"]) {
  if (ez === 2) return "아주 쉬운 말: desc는 15자 안팎의 한 문장. 아이에게 말하듯 가장 쉬운 낱말만 쓴다.";
  if (ez === 1) return "쉬운 말: desc는 25자 안팎의 한 문장.";
  return "원문의 뜻을 살리되 외래어만 일상어로 바꾼다. desc는 30자 안팎.";
}

// ---------------- 1) 메뉴 쉬운 말 변환 ----------------
export interface EasyItem {
  id: string;
  name: string; // 쉬운 이름 (예: 아메리카노 → "아메리카노 (블랙커피)")
  desc: string; // 쉬운 설명
  tags: string[]; // 맛 낱말 2~3개 (예: ["써요","진해요"])
}

const easySchema = {
  type: "object",
  properties: {
    items: {
      type: "array",
      items: {
        type: "object",
        properties: {
          id: { type: "string" },
          name: { type: "string" },
          desc: { type: "string" },
          tags: { type: "array", items: { type: "string" } },
        },
        required: ["id", "name", "desc", "tags"],
      },
    },
  },
  required: ["items"],
};

export async function easyMenu(items: MenuItem[], ez: Profile["ez"], lg: Lang): Promise<EasyItem[]> {
  const system = `당신은 키오스크 화면의 글을 누구나 이해할 수 있게 고쳐 쓰는 접근성 편집자입니다.
${EASY_RULES}
${levelGuide(ez)}
- name: 원래 이름을 남기고, 뜻을 알기 어려우면 괄호 안에 쉬운 설명을 붙인다. (예: "아인슈페너 (크림 올린 커피)")
- tags: 맛이나 특징을 나타내는 아주 짧은 낱말 2~3개. 온도(시원해요, 따뜻해요)는 손님이 따로 고르므로 tags에 쓰지 않는다. 원문과 이름에서 알 수 있는 것만 쓴다.
- 출력 언어: ${LANG_NAME[lg]}. ${lg !== "ko" ? "모든 필드를 이 언어로 쓰고, name은 그 나라 사람이 알아듣는 이름으로 쓴다. 쉬운 말 원칙은 그 언어로 똑같이 지킨다." : ""}`;
  const user = `다음 메뉴를 고쳐 써 주세요. id는 그대로 둡니다.\n${JSON.stringify(
    items.map((m) => ({ id: m.id, name: m.name, english: m.en, desc: m.desc })),
    null,
    0,
  )}`;
  const langNote = lg !== "ko" ? `\n\nIMPORTANT: Write every name, desc and tag in ${LANG_NAME[lg]} only. Do not write any Korean (Hangul).` : "";
  let out = await llmJSON<{ items: EasyItem[] }>({ system, user: user + langNote, schema: easySchema, kind: "fast", maxTokens: 4000 });
  // 다른 언어를 골랐는데 한글이 섞여 나오면 한 번 더 요청한다
  const hasHangul = (it: EasyItem) => /[가-힣]/.test(it.name + it.desc + it.tags.join(""));
  if (lg !== "ko" && out.items.some(hasHangul)) {
    out = await llmJSON<{ items: EasyItem[] }>({ system: `You rewrite kiosk menu text into very easy ${LANG_NAME[lg]} for older adults, people with intellectual disabilities and newcomers. Short sentences, everyday words, no jargon, no invented facts. Never use Korean.`, user: user + langNote, schema: easySchema, kind: "fast", maxTokens: 4000 });
  }
  return out.items;
}

// ---------------- 2) 말로 주문하기 ----------------
export interface OrderAction {
  op: "add" | "remove" | "clear";
  itemId: string;
  temp: "HOT" | "ICE" | "NONE";
  size: "R" | "L";
  qty: number;
}
export interface OrderResult {
  actions: OrderAction[];
  reply: string; // 사용자에게 소리로 읽어줄 확인 문장
  clarify: string | null; // 다시 물어볼 것이 있으면 질문
  source: "ai" | "rule";
}

const orderSchema = {
  type: "object",
  properties: {
    actions: {
      type: "array",
      items: {
        type: "object",
        properties: {
          op: { type: "string", enum: ["add", "remove", "clear"] },
          itemId: { type: "string" },
          temp: { type: "string", enum: ["HOT", "ICE", "NONE"] },
          size: { type: "string", enum: ["R", "L"] },
          qty: { type: "integer" },
        },
        required: ["op", "itemId", "temp", "size", "qty"],
      },
    },
    reply: { type: "string" },
    clarify: { type: "string", nullable: true },
  },
  required: ["actions", "reply"],
};

export async function parseOrder(utterance: string, profile: Profile, cart: { itemId: string; temp: string | null; size: string; qty: number }[]): Promise<OrderResult> {
  const avoid = profile.av.length ? `이 손님이 피해야 하는 재료: ${profile.av.join(", ")}. 이런 재료가 든 메뉴를 고르면 담기는 하되 reply에서 꼭 알려준다.` : "";
  const system = `당신은 카페 키오스크의 주문 도우미입니다. 손님이 말로 한 주문을 장바구니 동작으로 바꿉니다.
메뉴 (id, 이름, 가능한 온도, 들어간 재료):
${MENU.map((m) => `- ${m.id}: ${m.name} (${m.en}) / 온도: ${m.temps.length ? m.temps.join(",") : "NONE"} / 재료: ${m.contains.join(",") || "없음"}`).join("\n")}

규칙
- 메뉴에 있는 id만 쓴다. 온도를 말하지 않았고 HOT/ICE 둘 다 가능하면, 손님 말에 '차가운/시원한/아이스'가 없으면 HOT으로 둔다. 디저트는 NONE.
- '커피 하나'처럼 종류만 말하면 가장 기본 메뉴(커피는 americano, 차는 yuja)를 담고 reply에서 무엇을 담았는지 분명히 말한다.
- '달달한 거', '안 쓴 거'처럼 고를 수 없을 만큼 모호하면 actions를 비우고 clarify에 2~3개 보기를 넣어 묻는다.
- '큰 거', '라지'는 size L, 나머지는 R. 수량을 말하지 않으면 1.
- '빼 주세요', '취소'는 remove, '전부 취소'는 clear.
- reply는 담은 내용을 짧게 다시 말해 확인한다. ${EASY_RULES.split("\n")[1]}
- reply와 clarify의 언어: ${LANG_NAME[profile.lg]}. ${profile.ez >= 1 ? "쉬운 말로 짧게." : ""}
${avoid}`;
  const user = `지금 장바구니: ${JSON.stringify(cart)}\n손님의 말: "${utterance}"`;
  try {
    const r = await llmJSON<Omit<OrderResult, "source">>({ system, user, schema: orderSchema, kind: "fast", maxTokens: 800 });
    const actions = (r.actions || []).filter((a) => a.op === "clear" || MENU.some((m) => m.id === a.itemId));
    return { actions, reply: r.reply, clarify: r.clarify ?? null, source: "ai" };
  } catch (e) {
    if (provider()) console.error("parseOrder AI 실패, 규칙 기반으로 대체", e);
    return ruleOrder(utterance);
  }
}

// AI가 응답하지 않을 때를 위한 규칙 기반 대체 (서비스가 멈추지 않도록)
const ALIAS: [RegExp, string][] = [
  [/디카페인/, "decaf"],
  [/아메리카노|블랙\s*커피/, "americano"],
  [/바닐라/, "vanilla"],
  [/카페\s*라떼|라떼(?!.*(초코|고구마|바닐라))/, "latte"],
  [/콜드\s*브루/, "coldbrew"],
  [/아인슈페너|크림\s*커피/, "einspanner"],
  [/모카/, "mocha"],
  [/초코/, "choco"],
  [/고구마/, "sweetpotato"],
  [/딸기|스무디/, "strawberry"],
  [/레몬/, "lemonade"],
  [/캐모마일|카모마일/, "chamomile"],
  [/유자/, "yuja"],
  [/얼그레이|홍차/, "earlgrey"],
  [/치즈\s*케이크|케이크/, "cheesecake"],
  [/크루아상|크로와상/, "croissant"],
  [/소금빵/, "saltbread"],
  [/마카롱/, "macaron"],
  [/커피/, "americano"],
  [/차\b|따뜻한\s*차/, "yuja"],
];
const NUM: Record<string, number> = { 한: 1, 하나: 1, 두: 2, 둘: 2, 세: 3, 셋: 3, 네: 4, 넷: 4, 다섯: 5 };

export function ruleOrder(text: string): OrderResult {
  const actions: OrderAction[] = [];
  const parts = text.split(/,|그리고|하고|랑|이랑|와\s|과\s/);
  for (const part of parts) {
    const hit = ALIAS.find(([re]) => re.test(part));
    if (!hit) continue;
    const item = MENU.find((m) => m.id === hit[1])!;
    const qm = part.match(/(\d+)\s*(잔|개)|(한|하나|두|둘|세|셋|네|넷|다섯)\s*(잔|개)?/);
    const qty = qm ? Number(qm[1]) || NUM[qm[3]] || 1 : 1;
    const cold = /아이스|차가|시원|찬\s/.test(part);
    const temp = item.temps.length === 0 ? "NONE" : cold && item.temps.includes("ICE") ? "ICE" : item.temps.includes("HOT") ? "HOT" : "ICE";
    const size = /큰|라지|라아지|large/i.test(part) ? "L" : "R";
    actions.push({ op: /빼|취소/.test(part) ? "remove" : "add", itemId: item.id, temp, size, qty });
  }
  if (!actions.length) return { actions, reply: "", clarify: "잘 못 알아들었어요. 메뉴 이름을 한 번 더 말씀해 주세요.", source: "rule" };
  const said = actions.map((a) => `${MENU.find((m) => m.id === a.itemId)!.name} ${a.qty}${MENU.find((m) => m.id === a.itemId)!.cat === "dessert" ? "개" : "잔"}`).join(", ");
  return { actions, reply: `${said} 담았어요.`, clarify: null, source: "rule" };
}

// ---------------- 3) 화면 사진 읽고 안내하기 ----------------
export interface ScreenGuide {
  isScreen: boolean; // 키오스크나 기계 화면이 맞는지
  screen: string; // 이 화면이 무엇인지 한 문장
  instruction: string; // 지금 할 일 한 문장
  target: string; // 눌러야 할 버튼에 적힌 글자
  box: [number, number, number, number] | null; // [x0,y0,x1,y1] 0~1 정규화
  next: string[]; // 그 다음 할 일들 (짧게, 최대 3개)
  caution: string | null; // 주의할 점 (결제, 개인정보, 사기 의심 등)
}

export async function readScreen(img: { mime: string; base64: string; w: number; h: number }, goal: string, profile: Profile): Promise<ScreenGuide> {
  const p = provider();
  const coordGuide =
    p === "gemini"
      ? `box는 눌러야 할 버튼 영역을 [ymin, xmin, ymax, xmax] 형식으로, 이미지 전체를 0~1000으로 본 좌표로 준다.`
      : `이미지 크기는 가로 ${img.w}px, 세로 ${img.h}px이다. box는 눌러야 할 버튼 영역을 [x0, y0, x1, y1] 픽셀 좌표로 준다.`;
  const system = `당신은 시각장애인, 어르신, 외국인, 느린 학습자 곁에서 키오스크 사용을 돕는 안내자입니다.
사진 속 화면을 보고, 사용자의 목표를 이루려면 '지금 바로' 어디를 눌러야 하는지 한 곳만 알려줍니다.
- 화면에 실제로 보이는 버튼만 고른다. 보이지 않으면 box는 null, instruction에 화면을 넘기거나 다시 찍으라고 안내한다.
- target에는 버튼에 적힌 글자를 그대로 적는다.
- 위치는 '화면 왼쪽 아래 노란 버튼'처럼 방향과 색으로도 말해준다 (보기 힘든 사람을 위해).
- 결제, 개인정보 입력, 현금 투입 단계면 caution에 확인할 점을 적는다. 문제 없으면 null.
- 사진이 키오스크나 기계 화면이 아니면 isScreen=false.
${coordGuide}
${EASY_RULES}
${levelGuide(profile.ez)}
- 출력 언어: ${LANG_NAME[profile.lg]} (target은 화면에 적힌 원래 글자 그대로).`;
  const user = `사용자의 목표: "${goal || "이 화면에서 무엇을 해야 하는지 알고 싶어요"}"`;
  const schema = {
    type: "object",
    properties: {
      isScreen: { type: "boolean" },
      screen: { type: "string" },
      instruction: { type: "string" },
      target: { type: "string" },
      box: { type: "array", items: { type: "number" }, nullable: true },
      next: { type: "array", items: { type: "string" } },
      caution: { type: "string", nullable: true },
    },
    required: ["isScreen", "screen", "instruction", "target", "next"],
  };
  const r = await llmJSON<ScreenGuide>({ system, user, image: { mime: img.mime, base64: img.base64 }, schema, kind: "vision", maxTokens: 1200 });
  let box: ScreenGuide["box"] = null;
  if (Array.isArray(r.box) && r.box.length === 4 && r.box.every((n) => typeof n === "number")) {
    if (p === "gemini") {
      const [y0, x0, y1, x1] = r.box;
      box = [x0 / 1000, y0 / 1000, x1 / 1000, y1 / 1000];
    } else {
      const [x0, y0, x1, y1] = r.box;
      box = [x0 / img.w, y0 / img.h, x1 / img.w, y1 / img.h];
    }
    box = box.map((n) => Math.min(1, Math.max(0, n))) as ScreenGuide["box"];
    if (box && (box[2] <= box[0] || box[3] <= box[1])) box = null;
  }
  return { ...r, box, next: (r.next || []).slice(0, 3), caution: r.caution || null };
}

// ---------------- 4) 프로필 만들기 대화 ----------------
export interface OnboardResult {
  profile: Partial<Profile>;
  summary: string;
  source: "ai" | "rule";
}

export async function onboard(text: string): Promise<OnboardResult> {
  const system = `당신은 키오스크 접근성 설정을 도와주는 상담원입니다. 사용자가 불편한 점을 자유롭게 말하면, 그에 맞는 화면 설정을 고릅니다.
설정 항목
- fs: 글씨 크기 1(보통) 2(크게) 3(아주 크게)
- hc: 검은 바탕 노란 글씨 고대비 (저시력, 눈부심)
- ez: 0(원래 말) 1(쉬운 말) 2(아주 쉬운 말과 그림)
- vo: 소리로 읽어주기 (청각장애면 false)
- vi: 말로 주문하기를 먼저 권하기 (손 사용이 어렵거나 잘 안 보일 때)
- lo: 버튼을 화면 아래쪽에 (휠체어, 키가 작음, 팔을 올리기 어려움)
- nt: 시간 제한 없음 (천천히 해야 할 때)
- sr: 말하기 속도 0.7~1.1
- lg: ko/en/vi/zh/ja. 사용자가 한국어가 아닌 언어로 말했거나, 모국어나 원하는 언어를 직접 말했을 때만 바꾼다. '영어 메뉴가 어렵다', '외래어를 모르겠다'는 영어를 원한다는 뜻이 아니라 쉬운 한국어(ez 2)가 필요하다는 뜻이므로 lg는 ko로 둔다.
- av: 피해야 하는 재료 milk/caffeine/nuts/wheat/egg (알레르기, 임신, 수면 등 사용자가 직접 말한 것만)
고르는 기준
- 글씨가 안 보인다, 눈이 침침하다, 노안 → fs 3. 거의 안 보인다, 시각장애 → fs 3, hc true, vi true.
- 말이 어렵다, 헷갈린다, 외래어나 영어, 외국어 메뉴를 모르겠다 → ez 2.
- 손이 떨린다, 손을 쓰기 힘들다, 작은 버튼을 누르기 어렵다 → vi true, lo true.
- 사용자가 영어 등 다른 언어로 썼으면 그 언어를 lg로 고른다.
사용자가 말하지 않은 것은 무난한 기본값(fs 2, ez 1, vo true, nt true, sr 0.9)을 둔다. 장애 여부를 짐작해서 적지 않는다.
summary는 고른 설정을 사용자 언어로, 쉬운 말 두 문장 이내로 설명한다.`;
  const schema = {
    type: "object",
    properties: {
      fs: { type: "integer", enum: [1, 2, 3] },
      hc: { type: "boolean" },
      ez: { type: "integer", enum: [0, 1, 2] },
      vo: { type: "boolean" },
      vi: { type: "boolean" },
      lo: { type: "boolean" },
      nt: { type: "boolean" },
      sr: { type: "number" },
      lg: { type: "string", enum: Object.keys(LANG_LABEL) },
      av: { type: "array", items: { type: "string", enum: ["milk", "caffeine", "nuts", "wheat", "egg"] } },
      summary: { type: "string" },
    },
    required: ["fs", "hc", "ez", "vo", "vi", "lo", "nt", "sr", "lg", "av", "summary"],
  };
  try {
    const r = await llmJSON<Profile & { summary: string }>({ system, user: text, schema, kind: "fast", maxTokens: 600 });
    const { summary, ...rest } = r;
    return { profile: { ...rest, sr: Math.min(1.1, Math.max(0.7, rest.sr || 0.9)) }, summary, source: "ai" };
  } catch (e) {
    if (provider()) console.error("onboard AI 실패, 규칙 기반으로 대체", e);
    return ruleOnboard(text);
  }
}

export function ruleOnboard(t: string): OnboardResult {
  const p: Partial<Profile> = { fs: 2, ez: 1, vo: true, nt: true, sr: 0.9 };
  if (/안\s*보|침침|작아|글씨/.test(t)) Object.assign(p, { fs: 3 });
  if (/잘\s*안\s*보|시각|눈부/.test(t)) Object.assign(p, { hc: true, vi: true });
  if (/어려운\s*말|영어|헷갈|이해/.test(t)) Object.assign(p, { ez: 2 });
  if (/휠체어|손이\s*안|높아|키가/.test(t)) Object.assign(p, { lo: true });
  if (/안\s*들|청각|귀/.test(t)) Object.assign(p, { vo: false });
  if (/천천히|느려|급해|시간/.test(t)) Object.assign(p, { nt: true, sr: 0.8 });
  const av: Avoid[] = [];
  if (/우유|유당/.test(t)) av.push("milk");
  if (/카페인|잠/.test(t)) av.push("caffeine");
  if (/견과|땅콩|아몬드/.test(t)) av.push("nuts");
  p.av = av;
  return { profile: p, summary: "말씀하신 내용에 맞게 설정을 골랐어요. 아래에서 바꿀 수 있어요.", source: "rule" };
}
