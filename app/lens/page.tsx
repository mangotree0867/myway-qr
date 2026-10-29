"use client";
// 화면 도우미: 내 방식 QR을 지원하지 않는 키오스크라도, 휴대폰으로 화면을 찍으면
// AI가 화면을 읽고 "지금 어디를 누르면 되는지"를 내 방식(쉬운 말, 큰 글씨, 소리)으로 알려준다.
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { DEFAULT_PROFILE, FONT_SCALE, loadLocal, type Profile } from "@/lib/profile";
import { SPEECH_LANG } from "@/lib/i18n";
import { listen, speak, useCanListen } from "@/lib/speech";

interface Guide {
  isScreen: boolean;
  screen: string;
  instruction: string;
  target: string;
  box: [number, number, number, number] | null;
  next: string[];
  caution: string | null;
  error?: string;
}

const GOALS = ["아메리카노 한 잔 주문하고 싶어요", "카드로 결제하고 싶어요", "처음 화면으로 가고 싶어요", "이 화면이 뭔지 알려 주세요"];
const SAMPLES = [
  { src: "/samples/kiosk-menu.jpg", label: "카페 메뉴 화면" },
  { src: "/samples/kiosk-option.jpg", label: "옵션 선택 화면" },
  { src: "/samples/kiosk-payment.jpg", label: "결제 화면" },
];

export default function LensPage() {
  const [p, setP] = useState<Profile>({ ...DEFAULT_PROFILE });
  const [img, setImg] = useState<{ url: string; w: number; h: number } | null>(null);
  const [goal, setGoal] = useState(GOALS[0]);
  const [busy, setBusy] = useState(false);
  const [g, setG] = useState<Guide | null>(null);
  const [listening, setListening] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const canMic = useCanListen();

  useEffect(() => {
    const l = loadLocal();
    if (l) setP(l);
  }, []);

  const loadImage = (src: string) =>
    new Promise<{ url: string; w: number; h: number }>((resolve, reject) => {
      const im = new Image();
      im.crossOrigin = "anonymous";
      im.onload = () => {
        const max = 1280;
        const k = Math.min(1, max / Math.max(im.width, im.height));
        const w = Math.round(im.width * k),
          h = Math.round(im.height * k);
        const c = document.createElement("canvas");
        c.width = w;
        c.height = h;
        c.getContext("2d")!.drawImage(im, 0, 0, w, h);
        resolve({ url: c.toDataURL("image/jpeg", 0.85), w, h });
      };
      im.onerror = reject;
      im.src = src;
    });

  const onFile = async (f: File | undefined) => {
    if (!f) return;
    const url = URL.createObjectURL(f);
    setImg(await loadImage(url));
    setG(null);
  };

  const ask = async () => {
    if (!img) return;
    setBusy(true);
    setG(null);
    try {
      const r = await fetch("/api/lens", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ image: img.url, w: img.w, h: img.h, goal, profile: p }) });
      const d = (await r.json()) as Guide;
      setG(d);
      setTimeout(() => document.querySelector(".lens-out")?.scrollIntoView({ behavior: "smooth", block: "center" }), 50);
      if (!d.error && p.vo) speak(`${d.instruction} ${d.caution ?? ""}`, SPEECH_LANG[p.lg], p.sr);
    } catch {
      setG({ error: "연결이 잠시 느려요. 다시 눌러 주세요." } as Guide);
    }
    setBusy(false);
  };

  const mic = () => {
    setListening(true);
    const { promise } = listen(SPEECH_LANG[p.lg], (s) => setGoal(s));
    promise.then((s) => {
      if (s) setGoal(s);
      setListening(false);
    });
  };

  const s = FONT_SCALE[p.fs];
  return (
    <main className={`lens ${p.hc ? "hc" : ""}`} style={{ fontSize: 16 * s }}>
      <header className="pf-top">
        <Link href="/" className="pf-logo">
          내 방식 QR
        </Link>
        <span className="lens-tag">화면 도우미</span>
      </header>
      <section className="lens-sec">
        <h1>키오스크 화면을 찍어 주세요</h1>
        <p className="lens-sub">어떤 키오스크든 괜찮아요. AI가 지금 어디를 누르면 되는지 알려 드려요.</p>

        <input ref={fileRef} type="file" accept="image/*" capture="environment" hidden onChange={(e) => onFile(e.target.files?.[0])} />
        <button className="lens-shot" onClick={() => fileRef.current?.click()}>
          📷 사진 찍기
        </button>
        <div className="lens-samples">
          <span>사진이 없으면 예시로 해 보기:</span>
          {SAMPLES.map((x) => (
            <button
              key={x.src}
              onClick={async () => {
                setImg(await loadImage(x.src));
                setG(null);
              }}
            >
              {x.label}
            </button>
          ))}
        </div>

        {img && (
          <div className="lens-img">
            <img src={img.url} alt="찍은 키오스크 화면" />
            {g?.box && (
              <div
                className="lens-box"
                style={{ left: `${g.box[0] * 100}%`, top: `${g.box[1] * 100}%`, width: `${(g.box[2] - g.box[0]) * 100}%`, height: `${(g.box[3] - g.box[1]) * 100}%` }}
              >
                <span>여기!</span>
              </div>
            )}
          </div>
        )}

        {g && (
          <div className="lens-out" aria-live="polite">
            {g.error ? (
              <p className="lens-err">{g.error}</p>
            ) : (
              <>
                <p className="lens-screen">{g.screen}</p>
                <p className="lens-inst">{g.instruction}</p>
                {g.target && (
                  <p className="lens-target">
                    누를 버튼: <b>{g.target}</b>
                  </p>
                )}
                {g.caution && <p className="lens-caution">⚠ {g.caution}</p>}
                {g.next?.length > 0 && (
                  <ol className="lens-next">
                    {g.next.map((n) => (
                      <li key={n}>{n}</li>
                    ))}
                  </ol>
                )}
                <div className="lens-again">
                  {p.vo && <button onClick={() => speak(`${g.instruction} ${g.caution ?? ""}`, SPEECH_LANG[p.lg], p.sr)}>🔊 다시 듣기</button>}
                  <button onClick={() => fileRef.current?.click()}>누르고 나서 다음 화면 찍기</button>
                </div>
              </>
            )}
          </div>
        )}
        {img && (
          <>
            <label className="lens-label">무엇을 하고 싶으세요?</label>
            <div className="lens-goals">
              {GOALS.map((x) => (
                <button key={x} className={goal === x ? "on" : ""} onClick={() => setGoal(x)}>
                  {x}
                </button>
              ))}
            </div>
            <div className="lens-goal-row">
              <input value={goal} onChange={(e) => setGoal(e.target.value)} aria-label="하고 싶은 것" />
              {canMic && (
                <button onClick={mic} className={listening ? "on" : ""}>
                  {listening ? "듣는 중" : "말하기"}
                </button>
              )}
            </div>
            <button className="lens-ask" onClick={ask} disabled={busy}>
              {busy ? "AI가 화면을 읽는 중..." : "어디를 누르면 돼요?"}
            </button>
          </>
        )}

      </section>
    </main>
  );
}
