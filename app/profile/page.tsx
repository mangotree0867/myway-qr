"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import ProfileQR, { makeWalletCard } from "@/components/ProfileQR";
import MenuArt from "@/components/MenuArt";
import { AVOID_LABEL, DEFAULT_PROFILE, FONT_SCALE, LANG_LABEL, PRESETS, decodeProfile, describeProfile, encodeProfile, loadLocal, saveLocal, type Avoid, type Lang, type Profile } from "@/lib/profile";
import { listen, speak, useCanListen } from "@/lib/speech";

export default function ProfilePage() {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [picked, setPicked] = useState<string[]>([]);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [summary, setSummary] = useState<string | null>(null);
  const [p, setP] = useState<Profile>(DEFAULT_PROFILE);
  const [listening, setListening] = useState(false);
  const [saved, setSaved] = useState(false);
  const canMic = useCanListen();

  useEffect(() => {
    const h = window.location.hash;
    const fromHash = h.startsWith("#d=") ? decodeProfile(h) : null;
    const prev = fromHash || loadLocal();
    if (prev) {
      setP(prev);
      if (fromHash) setStep(2);
    }
  }, []);

  const set = <K extends keyof Profile>(k: K, v: Profile[K]) => setP((x) => ({ ...x, [k]: v }));

  const fromPresets = () => {
    let next: Profile = { ...DEFAULT_PROFILE };
    for (const id of picked) next = { ...next, ...PRESETS.find((x) => x.id === id)!.apply };
    return next;
  };

  const nextFromStep1 = async () => {
    let next = fromPresets();
    if (text.trim()) {
      setBusy(true);
      try {
        const r = await fetch("/api/onboard", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ text: text + (picked.length ? `\n(고른 항목: ${picked.map((id) => PRESETS.find((x) => x.id === id)!.label).join(", ")})` : "") }) }).then((x) => x.json());
        // 고른 항목과 AI가 고른 설정을 합친다 (더 강한 쪽을 택함)
        const a = r.profile as Partial<Profile>;
        next = {
          ...next,
          ...a,
          fs: Math.max(next.fs, a.fs ?? 1) as Profile["fs"],
          ez: Math.max(next.ez, a.ez ?? 0) as Profile["ez"],
          hc: next.hc || !!a.hc,
          lo: next.lo || !!a.lo,
          vi: next.vi || !!a.vi,
          nt: next.nt || !!a.nt,
          vo: picked.includes("deaf") ? false : a.vo ?? next.vo,
          lg: a.lg && a.lg !== "ko" ? a.lg : next.lg,
          av: Array.from(new Set([...(next.av || []), ...((a.av as Avoid[]) || [])])),
        };
        setSummary(r.summary);
        if (next.vo) speak(r.summary, "ko-KR", next.sr);
      } catch {
        setSummary(null);
      }
      setBusy(false);
    }
    setP(next);
    setStep(2);
  };

  const mic = () => {
    if (listening) return;
    setListening(true);
    const { promise } = listen("ko-KR", (s) => setText(s));
    promise.then((s) => {
      if (s) setText(s);
      setListening(false);
    });
  };

  const finish = () => {
    saveLocal(p);
    setSaved(true);
    setStep(3);
  };

  const download = async () => {
    const url = await makeWalletCard(p, window.location.origin);
    const a = document.createElement("a");
    a.href = url;
    a.download = "내방식QR_카드.png";
    a.click();
  };

  return (
    <main className="pf">
      <header className="pf-top">
        <Link href="/" className="pf-logo">
          내 방식 QR
        </Link>
        <span className="pf-steps">
          <i className={step >= 1 ? "on" : ""}>1</i>
          <i className={step >= 2 ? "on" : ""}>2</i>
          <i className={step >= 3 ? "on" : ""}>3</i>
        </span>
      </header>

      {step === 1 && (
        <section className="pf-sec">
          <h1>어떤 점이 불편하세요?</h1>
          <p className="pf-sub">해당하는 것을 모두 눌러 주세요. 직접 말하거나 써도 돼요.</p>
          <div className="pf-presets">
            {PRESETS.map((x) => (
              <button key={x.id} className={picked.includes(x.id) ? "on" : ""} aria-pressed={picked.includes(x.id)} onClick={() => setPicked((s) => (s.includes(x.id) ? s.filter((y) => y !== x.id) : [...s, x.id]))}>
                <b>{x.label}</b>
                <small>{x.hint}</small>
              </button>
            ))}
          </div>
          <div className="pf-free">
            <label htmlFor="free">직접 말하기 (AI가 알아서 설정해요)</label>
            <div className="pf-free-row">
              <textarea id="free" value={text} onChange={(e) => setText(e.target.value)} rows={2} placeholder="예) 눈이 침침해서 글씨가 안 보이고, 우유를 못 먹어요" />
              {canMic && (
                <button className={`pf-mic ${listening ? "on" : ""}`} onClick={mic} aria-label="말로 입력">
                  {listening ? "듣는 중" : "말하기"}
                </button>
              )}
            </div>
          </div>
          <button className="pf-next" onClick={nextFromStep1} disabled={busy}>
            {busy ? "AI가 맞춤 설정을 고르는 중..." : "다음"}
          </button>
        </section>
      )}

      {step === 2 && (
        <section className="pf-sec">
          <h1>이렇게 보일 거예요</h1>
          {summary && <p className="pf-ai">AI: {summary}</p>}
          <Preview p={p} />
          <div className="pf-set">
            <Row label="글씨 크기">
              {([1, 2, 3] as const).map((n) => (
                <Seg key={n} on={p.fs === n} onClick={() => set("fs", n)}>
                  <span style={{ fontSize: 13 * FONT_SCALE[n] }}>가</span>
                </Seg>
              ))}
            </Row>
            <Row label="말 수준">
              <Seg on={p.ez === 0} onClick={() => set("ez", 0)}>그대로</Seg>
              <Seg on={p.ez === 1} onClick={() => set("ez", 1)}>쉬운 말</Seg>
              <Seg on={p.ez === 2} onClick={() => set("ez", 2)}>아주 쉬운 말</Seg>
            </Row>
            <Toggle label="검은 바탕에 노란 글씨" v={p.hc} on={(v) => set("hc", v)} />
            <Toggle label="소리로 읽어주기" v={p.vo} on={(v) => set("vo", v)} />
            {p.vo && (
              <Row label="말 빠르기">
                <Seg on={p.sr <= 0.8} onClick={() => set("sr", 0.8)}>천천히</Seg>
                <Seg on={p.sr > 0.8 && p.sr < 1} onClick={() => set("sr", 0.9)}>조금 천천히</Seg>
                <Seg on={p.sr >= 1} onClick={() => set("sr", 1)}>보통</Seg>
              </Row>
            )}
            <Toggle label="말로 주문하기 먼저 보여주기" v={p.vi} on={(v) => set("vi", v)} />
            <Toggle label="버튼을 화면 아래쪽에 (휠체어)" v={p.lo} on={(v) => set("lo", v)} />
            <Toggle label="시간 제한 없이 천천히" v={p.nt} on={(v) => set("nt", v)} />
            <Row label="언어">
              <select value={p.lg} onChange={(e) => set("lg", e.target.value as Lang)} className="pf-select">
                {Object.entries(LANG_LABEL).map(([k, v]) => (
                  <option key={k} value={k}>
                    {v}
                  </option>
                ))}
              </select>
            </Row>
            <Row label="피할 재료">
              {(Object.keys(AVOID_LABEL) as Avoid[]).map((a) => (
                <Seg key={a} on={p.av.includes(a)} onClick={() => set("av", p.av.includes(a) ? p.av.filter((x) => x !== a) : [...p.av, a])}>
                  {AVOID_LABEL[a]}
                </Seg>
              ))}
            </Row>
          </div>
          <div className="pf-foot">
            <button className="pf-back" onClick={() => setStep(1)}>
              이전
            </button>
            <button className="pf-next" onClick={finish}>
              내 QR 만들기
            </button>
          </div>
        </section>
      )}

      {step === 3 && (
        <section className="pf-sec pf-done">
          <h1>내 방식 QR이 생겼어요</h1>
          <p className="pf-sub">키오스크의 QR 리더에 보여 주면, 그 키오스크가 내 방식으로 바뀌어요.</p>
          <div className="pf-qr">
            <ProfileQR profile={p} size={260} />
          </div>
          <ul className="pf-chips">
            {describeProfile(p).map((d) => (
              <li key={d}>{d}</li>
            ))}
          </ul>
          <p className="pf-privacy">이 QR에는 이름, 연락처, 장애 정보가 들어 있지 않아요. 화면 설정만 들어 있어요.</p>
          <div className="pf-actions">
            <Link className="pf-next" href={`/kiosk?d=${encodeProfile(p)}`}>
              키오스크에서 바로 써보기
            </Link>
            <button className="pf-back" onClick={download}>
              지갑 카드로 저장 (인쇄용)
            </button>
            <button className="pf-back" onClick={() => setStep(2)}>
              설정 바꾸기
            </button>
          </div>
          {saved && <p className="pf-saved">이 휴대폰에도 저장했어요. 다음에 이 사이트를 열면 바로 QR이 나와요.</p>}
        </section>
      )}
    </main>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="pf-row">
      <span className="pf-row-l">{label}</span>
      <span className="pf-row-c">{children}</span>
    </div>
  );
}
function Seg({ on, onClick, children }: { on: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button className={`pf-seg ${on ? "on" : ""}`} aria-pressed={on} onClick={onClick}>
      {children}
    </button>
  );
}
function Toggle({ label, v, on }: { label: string; v: boolean; on: (v: boolean) => void }) {
  return (
    <button className="pf-toggle" role="switch" aria-checked={v} onClick={() => on(!v)}>
      <span>{label}</span>
      <i className={v ? "on" : ""} />
    </button>
  );
}

function Preview({ p }: { p: Profile }) {
  const s = FONT_SCALE[p.fs];
  const easy = p.ez === 2 ? "쓴 커피예요. 우유가 없어요." : p.ez === 1 ? "우유를 넣지 않은 쓴 맛 커피예요." : "에스프레소 샷에 물을 더한 클린한 블랙 커피";
  return (
    <div className={`pf-prev ${p.hc ? "hc" : ""}`} style={{ fontSize: 15 * s }}>
      <MenuArt art="cup" color="#3b2416" temp="HOT" size={54 * s} />
      <div>
        <b>아메리카노{p.ez ? " (블랙커피)" : ""}</b>
        <p>{easy}</p>
      </div>
      <span className="pf-prev-p">2,000원</span>
    </div>
  );
}
