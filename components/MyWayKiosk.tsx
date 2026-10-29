"use client";
// "내 방식" 키오스크: QR로 받은 프로필에 맞춰 같은 키오스크를 다시 그린다.
// 한 화면에 한 가지 질문, 큰 글씨, 쉬운 말(AI), 소리 안내, 말로 주문(AI 에이전트), 시간 제한 없음
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { CATEGORIES, MENU, SIZE_UP_PRICE, addLine, cartTotal, linePrice, won, type CartLine, type Category, type MenuItem } from "@/lib/menu";
import { AVOID_LABEL, FONT_SCALE, describeProfile, type Profile } from "@/lib/profile";
import { t, SPEECH_LANG, type Key } from "@/lib/i18n";
import { speak, stopSpeak, listen, useCanListen } from "@/lib/speech";
import MenuArt from "./MenuArt";
import * as M from "@/lib/metrics";

type Step = "kind" | "item" | "temp" | "size" | "qty" | "more" | "place" | "confirm" | "card" | "done";
interface Easy {
  id: string;
  name: string;
  desc: string;
  tags: string[];
}

export default function MyWayKiosk({ profile, onExit, onDone }: { profile: Profile; onExit: () => void; onDone?: (cart: CartLine[]) => void }) {
  const lg = profile.lg;
  const L = useCallback((k: Key) => t(k, lg), [lg]);
  const [step, setStep] = useState<Step>("kind");
  const [hist, setHist] = useState<Step[]>([]);
  const [cat, setCat] = useState<Category | null>(null);
  const [item, setItem] = useState<MenuItem | null>(null);
  const [temp, setTemp] = useState<"HOT" | "ICE" | null>(null);
  const [size, setSize] = useState<"R" | "L">("R");
  const [qty, setQty] = useState(1);
  const [cart, setCart] = useState<CartLine[]>([]);
  const [easy, setEasy] = useState<Record<string, Easy>>({});
  const [voice, setVoice] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [orderNo] = useState(() => 100 + Math.floor(Math.random() * 800));
  const canMic = useCanListen();

  // 쉬운 말 메뉴 받아오기 (AI)
  useEffect(() => {
    if (profile.ez === 0 && lg === "ko") return;
    let alive = true;
    fetch("/api/easy", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ ez: profile.ez, lg }) })
      .then((r) => r.json())
      .then((d) => {
        if (!alive || !d.items) return;
        const map: Record<string, Easy> = {};
        for (const it of d.items as Easy[]) map[it.id] = it;
        setEasy(map);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [profile.ez, lg]);

  const nameOf = (m: MenuItem) => easy[m.id]?.name || (lg === "ko" ? m.name : m.en);
  const descOf = (m: MenuItem) => easy[m.id]?.desc || m.desc;
  const unit = (m: MenuItem) => (m.cat === "dessert" ? L("piece") : L("cup"));
  const say = useCallback((s: string) => profile.vo && speak(s, SPEECH_LANG[lg], profile.sr), [profile.vo, profile.sr, lg]);

  const go = (s: Step) => {
    setHist((h) => [...h, step]);
    setStep(s);
  };
  const goBack = () => {
    M.back();
    setHist((h) => {
      if (!h.length) return h;
      setStep(h[h.length - 1]);
      return h.slice(0, -1);
    });
  };

  // 화면마다 질문을 소리로 읽어준다
  const question = useMemo(() => {
    switch (step) {
      case "kind":
        return `${cart.length ? "" : L("greet") + " "}${L("chooseKind")}`;
      case "item":
        return L("chooseItem");
      case "temp":
        return L("tempQ");
      case "size":
        return L("sizeQ");
      case "qty":
        return L("qtyQ");
      case "more":
        return `${item ? nameOf(item) : ""} ${L("added")} ${L("moreQ")}`;
      case "place":
        return L("placeQ");
      case "confirm":
        return `${L("confirmQ")} ${cart.map((l) => { const m = MENU.find((x) => x.id === l.itemId)!; return `${nameOf(m)} ${l.temp ? (l.temp === "HOT" ? L("hot") : L("ice")) : ""} ${l.qty}${unit(m)}`; }).join(", ")}. ${L("total")} ${won(cartTotal(cart))}.`;
      case "card":
        return L("insertCard");
      case "done":
        return `${L("done")} ${L("orderNo")} ${orderNo}.`;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, lg, cart, easy]);

  const spokenStep = useRef<string>("");
  useEffect(() => {
    if (voice) return;
    // 같은 화면에서 쉬운 말이 늦게 도착해도 한 번만 읽는다 (confirm 제외)
    const k = step + (step === "confirm" || step === "more" ? question : "");
    if (spokenStep.current === k) return;
    spokenStep.current = k;
    say(question);
  }, [step, question, say, voice]);
  useEffect(() => () => stopSpeak(), []);

  const pickItem = (m: MenuItem) => {
    setItem(m);
    setTemp(m.temps.length === 1 ? m.temps[0] : null);
    setSize("R");
    setQty(1);
    if (m.temps.length > 1) go("temp");
    else if (m.cat !== "dessert") go("size");
    else go("qty");
  };
  const commit = () => {
    if (!item) return;
    setCart((c) => addLine(c, item.id, item.temps.length ? temp ?? item.temps[0] : null, size, qty));
    go("more");
  };
  const finish = () => {
    go("done");
    onDone?.(cart);
  };

  const scale = FONT_SCALE[profile.fs];
  const cls = `mw ${profile.hc ? "mw-hc" : ""} ${profile.lo ? "mw-lo" : ""}`;
  const items = cat ? MENU.filter((m) => m.cat === cat) : [];
  const avoidHit = (m: MenuItem) => m.contains.filter((a) => profile.av.includes(a));

  return (
    <div className={cls} style={{ fontSize: `${17 * scale}px` }} onPointerDown={() => M.tap()}>
      <div className="mw-bar">
        <span className="mw-badge" title={describeProfile(profile).join(", ")}>
          내 방식 QR
        </span>
        <span className="mw-bar-r">
          {profile.vo && (
            <button className="mw-mini" onClick={() => say(question)}>
              🔊 {L("repeat")}
            </button>
          )}
          <button className="mw-mini" onClick={onExit}>
            ✕
          </button>
        </span>
      </div>

      <div className="mw-body">
        <h1 className="mw-q" aria-live="polite">
          {step === "kind" && !cart.length && <span className="mw-greet">{L("greet")}</span>}
          {step === "more" ? (
            <>
              <span className="mw-greet">
                {item ? nameOf(item) : ""} {L("added")}
              </span>
              {L("moreQ")}
            </>
          ) : step === "confirm" ? (
            L("confirmQ")
          ) : step === "card" ? (
            L("insertCard")
          ) : step === "done" ? (
            L("done")
          ) : step === "kind" ? (
            L("chooseKind")
          ) : (
            question
          )}
        </h1>

        <div className="mw-content">
          {step === "kind" && (
            <>
              {(profile.vi || canMic) && (
                <button className={`mw-voice ${profile.vi ? "mw-voice-main" : ""}`} onClick={() => setVoice(true)}>
                  <MicIcon /> {L("speak")}
                </button>
              )}
              <div className="mw-grid2">
                {CATEGORIES.map((c) => (
                  <button key={c.id} className="mw-card" onClick={() => { setCat(c.id); go("item"); }}>
                    <MenuArt art={MENU.find((m) => m.cat === c.id)!.art} color={MENU.find((m) => m.cat === c.id)!.color} temp={c.id === "tea" ? "HOT" : null} size={72 * scale} />
                    <span className="mw-card-t">{L(c.id)}</span>
                  </button>
                ))}
              </div>
            </>
          )}

          {step === "item" && (
            <div className="mw-list">
              {items.map((m) => {
                const hit = avoidHit(m);
                return (
                  <button key={m.id} className={`mw-row ${hit.length ? "mw-row-warn" : ""}`} onClick={() => pickItem(m)}>
                    <MenuArt art={m.art} color={m.color} temp={m.temps[0] ?? null} size={64 * scale} />
                    <span className="mw-row-txt">
                      <span className="mw-row-name">{nameOf(m)}</span>
                      <span className="mw-row-desc">{descOf(m)}</span>
                      {easy[m.id]?.tags?.length ? (
                        <span className="mw-tags">
                          {easy[m.id].tags.slice(0, 3).map((g) => (
                            <span key={g}>{g}</span>
                          ))}
                        </span>
                      ) : null}
                      {hit.length > 0 && (
                        <span className="mw-warn">
                          ⚠ {L("contains")}: {hit.map((a) => AVOID_LABEL[a]).join(", ")}
                        </span>
                      )}
                    </span>
                    <span className="mw-row-price">{won(m.price)}</span>
                  </button>
                );
              })}
            </div>
          )}

          {step === "temp" && item && (
            <div className="mw-grid2">
              {(["HOT", "ICE"] as const).map((tp) => (
                <button key={tp} className={`mw-card mw-temp-${tp}`} onClick={() => { setTemp(tp); go(item.cat === "dessert" ? "qty" : "size"); }}>
                  <MenuArt art={item.art} color={item.color} temp={tp} size={96 * scale} />
                  <span className="mw-card-t">{tp === "HOT" ? L("hot") : L("ice")}</span>
                </button>
              ))}
            </div>
          )}

          {step === "size" && item && (
            <div className="mw-grid2">
              <button className="mw-card" onClick={() => { setSize("R"); go("qty"); }}>
                <MenuArt art={item.art} color={item.color} temp={temp} size={70 * scale} />
                <span className="mw-card-t">{L("regular")}</span>
                <span className="mw-card-s">{won(item.price)}</span>
              </button>
              <button className="mw-card" onClick={() => { setSize("L"); go("qty"); }}>
                <MenuArt art={item.art} color={item.color} temp={temp} size={100 * scale} />
                <span className="mw-card-t">{L("large")}</span>
                <span className="mw-card-s">{L("more500")}</span>
              </button>
            </div>
          )}

          {step === "qty" && item && (
            <div className="mw-qty">
              <div className="mw-qty-row">
                <button aria-label="하나 빼기" onClick={() => setQty((q) => Math.max(1, q - 1))}>
                  −
                </button>
                <span>
                  {qty}
                  {unit(item)}
                </span>
                <button aria-label="하나 더하기" onClick={() => setQty((q) => Math.min(9, q + 1))}>
                  +
                </button>
              </div>
              <p className="mw-sum">
                {nameOf(item)} {temp ? (temp === "HOT" ? L("hot") : L("ice")) : ""} {size === "L" ? L("large") : ""} = {won((item.price + (size === "L" ? SIZE_UP_PRICE : 0)) * qty)}
              </p>
              <button className="mw-primary" onClick={commit}>
                {L("ok")}
              </button>
            </div>
          )}

          {step === "more" && (
            <>
              <CartBox cart={cart} nameOf={nameOf} L={L} unit={unit} onRemove={(k) => setCart((c) => c.filter((x) => x.key !== k))} />
              <div className="mw-grid2">
                <button className="mw-card" onClick={() => go("kind")}>
                  <span className="mw-big">＋</span>
                  <span className="mw-card-t">{L("moreYes")}</span>
                </button>
                <button className="mw-card mw-card-go" onClick={() => go("place")}>
                  <span className="mw-big">✓</span>
                  <span className="mw-card-t">{L("moreNo")}</span>
                </button>
              </div>
            </>
          )}

          {step === "place" && (
            <div className="mw-grid2">
              <button className="mw-card" onClick={() => go("confirm")}>
                <span className="mw-big">🍽</span>
                <span className="mw-card-t">{L("here")}</span>
              </button>
              <button className="mw-card" onClick={() => go("confirm")}>
                <span className="mw-big">🛍</span>
                <span className="mw-card-t">{L("togo")}</span>
              </button>
            </div>
          )}

          {step === "confirm" && (
            <>
              <CartBox cart={cart} nameOf={nameOf} L={L} unit={unit} onRemove={(k) => setCart((c) => c.filter((x) => x.key !== k))} />
              <p className="mw-total">
                {L("total")} <b>{won(cartTotal(cart))}</b>
              </p>
              <button className="mw-primary" disabled={!cart.length} onClick={() => go("card")}>
                {L("pay")}
              </button>
              <button className="mw-secondary" onClick={() => go("kind")}>
                {L("fix")}
              </button>
            </>
          )}

          {step === "card" && (
            <div className="mw-cardslot">
              <div className="mw-slot-arrow">⬇</div>
              <button className="mw-primary" onClick={finish}>
                {L("cardDone")}
              </button>
            </div>
          )}

          {step === "done" && (
            <div className="mw-done">
              <span className="mw-no-label">{L("orderNo")}</span>
              <span className="mw-no">{orderNo}</span>
              <button className="mw-secondary" onClick={onExit}>
                {L("home")}
              </button>
            </div>
          )}
        </div>

        {step !== "kind" && step !== "done" && (
          <div className="mw-nav">
            <button onClick={goBack}>← {L("back")}</button>
            <button onClick={() => { M.back(); setHist([]); setStep("kind"); }}>{L("home")}</button>
          </div>
        )}
      </div>

      {voice && (
        <VoiceOrder
          profile={profile}
          cart={cart}
          L={L}
          onApply={(next) => setCart(next)}
          onClose={(goNext) => {
            setVoice(false);
            if (goNext) {
              setHist((h) => [...h, step]);
              setStep("place");
            }
          }}
          say={say}
          setToast={setToast}
        />
      )}
      {toast && (
        <div className="mw-toast" onClick={() => setToast(null)}>
          {toast}
        </div>
      )}
    </div>
  );
}


function CartBox({ cart, nameOf, L, unit, onRemove }: { cart: CartLine[]; nameOf: (m: MenuItem) => string; L: (k: Key) => string; unit: (m: MenuItem) => string; onRemove: (k: string) => void }) {
  if (!cart.length) return null;
  return (
    <div className="mw-cartbox">
      <span className="mw-cart-h">{L("cart")}</span>
      {cart.map((l) => {
        const m = MENU.find((x) => x.id === l.itemId)!;
        return (
          <div key={l.key} className="mw-cart-line">
            <MenuArt art={m.art} color={m.color} temp={l.temp} size={44} />
            <span className="mw-cart-name">
              {nameOf(m)} {l.temp ? (l.temp === "HOT" ? L("hot") : L("ice")) : ""} {l.size === "L" ? L("large") : ""} × {l.qty}
              {unit(m)}
            </span>
            <span className="mw-cart-p">{won(linePrice(l))}</span>
            <button className="mw-x" onClick={() => onRemove(l.key)} aria-label={L("remove")}>
              {L("remove")}
            </button>
          </div>
        );
      })}
    </div>
  );
}

function MicIcon() {
  return (
    <svg viewBox="0 0 24 24" width="1.2em" height="1.2em" aria-hidden="true">
      <rect x="9" y="3" width="6" height="11" rx="3" fill="currentColor" />
      <path d="M5 11a7 7 0 0 0 14 0M12 18v3" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" />
    </svg>
  );
}

function VoiceOrder({ profile, cart, L, onApply, onClose, say, setToast }: { profile: Profile; cart: CartLine[]; L: (k: Key) => string; onApply: (c: CartLine[]) => void; onClose: (goNext: boolean) => void; say: (s: string) => void; setToast: (s: string | null) => void }) {
  const [heard, setHeard] = useState("");
  const [typed, setTyped] = useState("");
  const [state, setState] = useState<"idle" | "listening" | "thinking" | "answered">("idle");
  const [reply, setReply] = useState("");
  const [local, setLocal] = useState<CartLine[]>(cart);
  const stopRef = useRef<() => void>(() => {});
  const canMic = useCanListen();

  const send = async (text: string) => {
    if (!text.trim()) return;
    setState("thinking");
    setHeard(text);
    try {
      const r = await fetch("/api/order", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ text, profile, cart: local.map(({ itemId, temp, size, qty }) => ({ itemId, temp, size, qty })) }),
      }).then((x) => x.json());
      let next = local;
      for (const a of r.actions || []) {
        if (a.op === "clear") next = [];
        else if (a.op === "remove") next = next.filter((l) => l.itemId !== a.itemId);
        else next = addLine(next, a.itemId, a.temp === "NONE" ? null : a.temp, a.size || "R", Math.max(1, Math.min(9, a.qty || 1)));
      }
      setLocal(next);
      onApply(next);
      const msg = r.clarify || r.reply || "";
      setReply(msg);
      say(msg);
      setState("answered");
    } catch {
      setToast("잠시 연결이 느려요. 다시 한 번 말씀해 주세요.");
      setState("idle");
    }
  };

  const start = () => {
    setReply("");
    setHeard("");
    setState("listening");
    const { promise, stop } = listen(SPEECH_LANG[profile.lg], (s) => setHeard(s));
    stopRef.current = stop;
    promise.then((text) => {
      if (text) send(text);
      else setState("idle");
    });
  };

  useEffect(() => {
    say(L("listening"));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="mw-voice-layer">
      <div className="mw-voice-panel">
        <h2>{state === "listening" ? L("listening") : state === "thinking" ? L("thinking") : L("speak")}</h2>
        {canMic && (
          <button className={`mw-mic ${state === "listening" ? "on" : ""}`} onClick={() => (state === "listening" ? stopRef.current() : start())} aria-label={L("speak")}>
            <MicIcon />
          </button>
        )}
        {heard && <p className="mw-heard">“{heard}”</p>}
        {reply && <p className="mw-reply">{reply}</p>}
        <form
          className="mw-type"
          onSubmit={(e) => {
            e.preventDefault();
            send(typed);
            setTyped("");
          }}
        >
          <input value={typed} onChange={(e) => setTyped(e.target.value)} placeholder={L("typeHere")} />
          <button type="submit">{L("send")}</button>
        </form>
        {local.length > 0 && (
          <div className="mw-voice-cart">
            {local.map((l) => {
              const m = MENU.find((x) => x.id === l.itemId)!;
              return (
                <span key={l.key}>
                  {m.name} {l.temp ? (l.temp === "HOT" ? "따뜻하게" : "차갑게") : ""} {l.size === "L" ? "크게" : ""} × {l.qty}
                </span>
              );
            })}
          </div>
        )}
        <div className="mw-voice-f">
          <button className="mw-secondary" onClick={() => onClose(false)}>
            {L("back")}
          </button>
          <button className="mw-primary" disabled={!local.length} onClick={() => onClose(true)}>
            {L("moreNo")}
          </button>
        </div>
      </div>
    </div>
  );
}
