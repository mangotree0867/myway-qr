// "내 방식" 접근성 프로필
// QR 안에는 화면/소리 설정만 담고, 이름이나 장애 정보 같은 개인정보는 담지 않는다.

export type Lang = "ko" | "en" | "vi" | "zh" | "ja";
export type Avoid = "milk" | "caffeine" | "nuts" | "wheat" | "egg";

export interface Profile {
  v: 1;
  fs: 1 | 2 | 3; // 글씨 크기: 보통 / 크게 / 아주 크게
  hc: boolean; // 고대비 (검은 바탕 + 노란 글씨)
  ez: 0 | 1 | 2; // 말 수준: 그대로 / 쉬운 말 / 아주 쉬운 말
  vo: boolean; // 소리로 읽어주기
  sr: number; // 말하기 속도 (0.7 ~ 1.1)
  vi: boolean; // 말로 주문하기를 먼저 권하기
  lo: boolean; // 버튼을 화면 아래쪽에 (휠체어, 키가 작은 분)
  nt: boolean; // 시간 제한 없음
  lg: Lang; // 언어
  av: Avoid[]; // 피해야 하는 재료
}

export const DEFAULT_PROFILE: Profile = {
  v: 1,
  fs: 2,
  hc: false,
  ez: 1,
  vo: true,
  sr: 0.9,
  vi: false,
  lo: false,
  nt: true,
  lg: "ko",
  av: [],
};

export interface Preset {
  id: string;
  label: string;
  hint: string;
  apply: Partial<Profile>;
}

export const PRESETS: Preset[] = [
  {
    id: "senior",
    label: "글씨가 작고 화면이 복잡해요",
    hint: "어르신",
    apply: { fs: 3, ez: 2, vo: true, nt: true, sr: 0.85 },
  },
  {
    id: "lowvision",
    label: "화면이 잘 안 보여요",
    hint: "저시력",
    apply: { fs: 3, hc: true, vo: true, vi: true, nt: true },
  },
  {
    id: "wheelchair",
    label: "화면 위쪽에 손이 안 닿아요",
    hint: "휠체어, 키가 작은 분",
    apply: { lo: true, nt: true },
  },
  {
    id: "slow",
    label: "어려운 말이 헷갈려요",
    hint: "느린 학습자, 발달장애",
    apply: { ez: 2, vo: true, nt: true, sr: 0.8 },
  },
  {
    id: "deaf",
    label: "소리를 잘 못 들어요",
    hint: "청각장애",
    apply: { vo: false, vi: false },
  },
  {
    id: "foreign",
    label: "한국어가 어려워요",
    hint: "외국인",
    apply: { ez: 1, lg: "en" },
  },
];

export const LANG_LABEL: Record<Lang, string> = {
  ko: "한국어",
  en: "English",
  vi: "Tiếng Việt",
  zh: "中文",
  ja: "日本語",
};

export const AVOID_LABEL: Record<Avoid, string> = {
  milk: "우유",
  caffeine: "카페인",
  nuts: "견과류",
  wheat: "밀가루",
  egg: "달걀",
};

export const FONT_SCALE: Record<Profile["fs"], number> = { 1: 1, 2: 1.3, 3: 1.6 };

// ---------- QR 인코딩 ----------
// 짧은 문자열로 줄여서 QR을 작고 잘 읽히게 만든다.
// 형식: v1.<fs><hc><ez><vo><vi><lo><nt>.<sr*10>.<lg>.<av>
const AVOID_CODE: Record<Avoid, string> = { milk: "m", caffeine: "c", nuts: "n", wheat: "w", egg: "e" };
const CODE_AVOID: Record<string, Avoid> = Object.fromEntries(
  Object.entries(AVOID_CODE).map(([k, v]) => [v, k as Avoid]),
);

export function encodeProfile(p: Profile): string {
  const flags = [p.fs, p.hc ? 1 : 0, p.ez, p.vo ? 1 : 0, p.vi ? 1 : 0, p.lo ? 1 : 0, p.nt ? 1 : 0].join("");
  const av = p.av.map((a) => AVOID_CODE[a]).join("") || "-";
  return `v1.${flags}.${Math.round(p.sr * 10)}.${p.lg}.${av}`;
}

export function decodeProfile(code: string): Profile | null {
  try {
    const raw = code.includes("#d=") ? code.split("#d=")[1] : code.includes("?d=") ? code.split("?d=")[1].split("&")[0] : code;
    const s = decodeURIComponent(raw).trim();
    const [ver, flags, sr, lg, av] = s.split(".");
    if (ver !== "v1" || !flags || flags.length !== 7) return null;
    const n = flags.split("").map(Number);
    const lang = (["ko", "en", "vi", "zh", "ja"].includes(lg) ? lg : "ko") as Lang;
    const fs = ([1, 2, 3].includes(n[0]) ? n[0] : 2) as Profile["fs"];
    const ez = ([0, 1, 2].includes(n[2]) ? n[2] : 1) as Profile["ez"];
    const rate = Math.min(1.2, Math.max(0.6, Number(sr) / 10 || 0.9));
    return {
      v: 1,
      fs,
      hc: n[1] === 1,
      ez,
      vo: n[3] === 1,
      vi: n[4] === 1,
      lo: n[5] === 1,
      nt: n[6] === 1,
      sr: rate,
      lg: lang,
      av: av && av !== "-" ? av.split("").map((c) => CODE_AVOID[c]).filter(Boolean) : [],
    };
  } catch {
    return null;
  }
}

export function profileUrl(origin: string, p: Profile): string {
  return `${origin}/p#d=${encodeProfile(p)}`;
}

export function describeProfile(p: Profile): string[] {
  const out: string[] = [];
  out.push(p.fs === 3 ? "글씨 아주 크게" : p.fs === 2 ? "글씨 크게" : "글씨 보통");
  if (p.hc) out.push("검은 바탕에 노란 글씨");
  out.push(p.ez === 2 ? "아주 쉬운 말과 그림" : p.ez === 1 ? "쉬운 말" : "원래 말 그대로");
  out.push(p.vo ? "소리로 읽어주기" : "소리 없이 화면으로만");
  if (p.vi) out.push("말로 주문하기");
  if (p.lo) out.push("버튼을 화면 아래쪽에");
  if (p.nt) out.push("시간 제한 없음");
  if (p.lg !== "ko") out.push(`언어: ${LANG_LABEL[p.lg]}`);
  if (p.av.length) out.push(`피할 재료: ${p.av.map((a) => AVOID_LABEL[a]).join(", ")}`);
  return out;
}

const STORE_KEY = "myway-profile";
export function saveLocal(p: Profile) {
  try {
    localStorage.setItem(STORE_KEY, encodeProfile(p));
  } catch {}
}
export function loadLocal(): Profile | null {
  try {
    const s = localStorage.getItem(STORE_KEY);
    return s ? decodeProfile(s) : null;
  } catch {
    return null;
  }
}
