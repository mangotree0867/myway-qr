"use client";
// 일반 키오스크 (비교 기준). 실제 매장 키오스크에서 흔히 겪는 불편을 그대로 재현한다:
// 작은 글씨, 영어와 외래어, 한 화면에 많은 선택지, 필수 옵션 팝업, 적립 팝업, 시간 제한
import { useEffect, useRef, useState } from "react";
import { CATEGORIES, MENU, SIZE_UP_PRICE, addLine, cartTotal, linePrice, won, type CartLine, type Category, type MenuItem } from "@/lib/menu";
import MenuArt from "./MenuArt";
import * as M from "@/lib/metrics";

type Screen = "start" | "menu" | "place" | "payment" | "point" | "card" | "done";

export default function StandardKiosk({ onMyWay, timeoutSec = 60, onDone }: { onMyWay: () => void; timeoutSec?: number; onDone?: (cart: CartLine[]) => void }) {
  const [screen, setScreen] = useState<Screen>("start");
  const [cat, setCat] = useState<Category>("coffee");
  const [cart, setCart] = useState<CartLine[]>([]);
  const [opt, setOpt] = useState<MenuItem | null>(null);
  const [temp, setTemp] = useState<"HOT" | "ICE" | null>(null);
  const [size, setSize] = useState<"R" | "L">("R");
  const [shot, setShot] = useState(0);
  const [cup, setCup] = useState<string | null>(null);
  const [warn, setWarn] = useState<string | null>(null);
  const [left, setLeft] = useState(timeoutSec);
  const [orderNo] = useState(() => 100 + Math.floor(Math.random() * 800));
  const last = useRef(Date.now());

  // 시간 제한
  useEffect(() => {
    if (!timeoutSec || screen === "start" || screen === "done") return;
    const id = setInterval(() => {
      const remain = timeoutSec - Math.floor((Date.now() - last.current) / 1000);
      setLeft(remain);
      if (remain <= 0) {
        M.timeout();
        setCart([]);
        setOpt(null);
        setScreen("start");
        setWarn("시간이 초과되어 처음 화면으로 돌아갑니다.");
      }
    }, 500);
    return () => clearInterval(id);
  }, [screen, timeoutSec]);

  const touch = () => {
    last.current = Date.now();
    setLeft(timeoutSec);
    M.tap();
  };

  const openOpt = (m: MenuItem) => {
    setOpt(m);
    setTemp(null);
    setSize("R");
    setShot(0);
    setCup(null);
  };
  const addOpt = () => {
    if (!opt) return;
    if (opt.temps.length > 1 && !temp) return setWarn("HOT/ICE를 선택해주세요.");
    if (opt.cat !== "dessert" && !cup) return setWarn("컵 선택은 필수 옵션입니다.");
    setCart((c) => addLine(c, opt.id, opt.temps.length ? temp ?? opt.temps[0] : null, size, 1));
    setOpt(null);
  };

  return (
    <div className="sk" onPointerDown={touch}>
      <header className="sk-top">
        <span className="sk-logo">MODU CAFÉ</span>
        <span className="sk-top-r">
          {screen !== "start" && screen !== "done" && timeoutSec > 0 && <span className="sk-timer">{left}s</span>}
          <span>KOR | ENG | 中文</span>
        </span>
      </header>

      {screen === "start" && (
        <div className="sk-start">
          <div className="sk-hero">
            <p className="sk-hero-en">Fresh Coffee, Every Day</p>
            <p className="sk-hero-ko">신메뉴 시즌 한정 출시</p>
          </div>
          <div className="sk-start-btns">
            <button onClick={() => setScreen("menu")}>
              <b>매장</b>
              <small>Eat in</small>
            </button>
            <button onClick={() => setScreen("menu")}>
              <b>포장</b>
              <small>Take out</small>
            </button>
          </div>
          <button className="sk-myway" onClick={onMyWay} aria-label="내 방식 QR로 주문하기">
            <span className="sk-myway-icon">QR</span> 내 방식 QR
          </button>
        </div>
      )}

      {screen === "menu" && (
        <>
          <nav className="sk-tabs">
            {CATEGORIES.map((c) => (
              <button key={c.id} className={c.id === cat ? "on" : ""} onClick={() => setCat(c.id)}>
                {c.en}
              </button>
            ))}
            <button disabled>SEASON</button>
            <button disabled>MD</button>
          </nav>
          <div className="sk-grid">
            {MENU.filter((m) => m.cat === cat).map((m) => (
              <button key={m.id} className="sk-item" onClick={() => openOpt(m)}>
                <MenuArt art={m.art} color={m.color} temp={m.temps[0] ?? null} size={56} />
                <span className="sk-name">{m.en}</span>
                <span className="sk-name-ko">{m.name}</span>
                <span className="sk-price">{m.price.toLocaleString()}</span>
              </button>
            ))}
          </div>
          <footer className="sk-cart">
            <div className="sk-cart-list">
              {cart.length === 0 && <span className="sk-empty">선택된 메뉴가 없습니다</span>}
              {cart.map((l) => {
                const m = MENU.find((x) => x.id === l.itemId)!;
                return (
                  <div key={l.key} className="sk-line">
                    <span>
                      {m.en} {l.temp ? `(${l.temp})` : ""} {l.size === "L" ? "L" : ""}
                    </span>
                    <span>
                      <button onClick={() => setCart((c) => c.map((x) => (x.key === l.key ? { ...x, qty: Math.max(1, x.qty - 1) } : x)))}>-</button>
                      {l.qty}
                      <button onClick={() => setCart((c) => c.map((x) => (x.key === l.key ? { ...x, qty: x.qty + 1 } : x)))}>+</button>
                      <button onClick={() => setCart((c) => c.filter((x) => x.key !== l.key))}>×</button>
                    </span>
                    <span>{linePrice(l).toLocaleString()}</span>
                  </div>
                );
              })}
            </div>
            <div className="sk-cart-side">
              <span className="sk-total">{won(cartTotal(cart))}</span>
              <button className="sk-pay" disabled={!cart.length} onClick={() => setScreen("place")}>
                결제하기
              </button>
              <button className="sk-reset" onClick={() => { M.back(); setCart([]); setScreen("start"); }}>
                전체취소
              </button>
            </div>
          </footer>
        </>
      )}

      {opt && (
        <div className="sk-modal">
          <div className="sk-modal-in">
            <div className="sk-modal-h">
              <MenuArt art={opt.art} color={opt.color} temp={temp} size={48} />
              <div>
                <b>{opt.en}</b>
                <p>{opt.desc}</p>
              </div>
            </div>
            {opt.temps.length > 1 && (
              <div className="sk-opt">
                <span>Temperature *</span>
                {opt.temps.map((t) => (
                  <button key={t} className={temp === t ? "on" : ""} onClick={() => setTemp(t)}>
                    {t}
                  </button>
                ))}
              </div>
            )}
            {opt.cat !== "dessert" && (
              <>
                <div className="sk-opt">
                  <span>Size</span>
                  <button className={size === "R" ? "on" : ""} onClick={() => setSize("R")}>Regular</button>
                  <button className={size === "L" ? "on" : ""} onClick={() => setSize("L")}>Large +{SIZE_UP_PRICE}</button>
                </div>
                {opt.cat === "coffee" && (
                  <div className="sk-opt">
                    <span>Shot</span>
                    <button className={shot === 0 ? "on" : ""} onClick={() => setShot(0)}>기본</button>
                    <button className={shot === 1 ? "on" : ""} onClick={() => setShot(1)}>연하게</button>
                    <button className={shot === 2 ? "on" : ""} onClick={() => setShot(2)}>샷추가 +500</button>
                  </div>
                )}
                <div className="sk-opt">
                  <span>Syrup</span>
                  <button>바닐라 +500</button>
                  <button>헤이즐넛 +500</button>
                  <button>카라멜 +500</button>
                </div>
                <div className="sk-opt">
                  <span>Cup *</span>
                  {["매장컵", "일회용컵", "개인컵(텀블러)"].map((c) => (
                    <button key={c} className={cup === c ? "on" : ""} onClick={() => setCup(c)}>
                      {c}
                    </button>
                  ))}
                </div>
              </>
            )}
            <div className="sk-modal-f">
              <button onClick={() => { M.back(); setOpt(null); }}>취소</button>
              <button className="sk-pay" onClick={addOpt}>
                주문담기
              </button>
            </div>
          </div>
        </div>
      )}

      {screen === "place" && (
        <div className="sk-center">
          <p>식사 장소를 선택해 주세요 / Dine-in or Take-out?</p>
          <div className="sk-row">
            <button onClick={() => setScreen("payment")}>매장 Dine-in</button>
            <button onClick={() => setScreen("payment")}>포장 Take-out</button>
          </div>
          <button className="sk-link" onClick={() => { M.back(); setScreen("menu"); }}>이전</button>
        </div>
      )}

      {screen === "payment" && (
        <div className="sk-center">
          <p>결제수단을 선택해 주세요 / Payment</p>
          <div className="sk-pay-grid">
            <button onClick={() => setScreen("point")}>신용/체크카드</button>
            <button onClick={() => setWarn("휴대폰 결제 단말기를 인식해주세요")}>삼성페이</button>
            <button onClick={() => setWarn("QR 코드를 스캐너에 인식해주세요")}>카카오페이</button>
            <button onClick={() => setWarn("바코드를 스캐너에 인식해주세요")}>기프티콘</button>
            <button onClick={() => setWarn("쿠폰 번호를 입력해주세요")}>쿠폰</button>
            <button onClick={() => setWarn("포인트 회원만 사용 가능합니다")}>포인트</button>
          </div>
          <p className="sk-small">결제 금액 {won(cartTotal(cart))} / 할부는 5만원 이상부터 가능합니다</p>
          <button className="sk-link" onClick={() => { M.back(); setScreen("place"); }}>이전</button>
        </div>
      )}

      {screen === "point" && (
        <div className="sk-modal">
          <div className="sk-modal-in sk-point">
            <b>MODU 멤버십 포인트를 적립하시겠습니까?</b>
            <p>휴대폰 번호를 입력하시면 결제금액의 3%가 적립됩니다.</p>
            <div className="sk-keypad">
              {["1", "2", "3", "4", "5", "6", "7", "8", "9", "010", "0", "←"].map((k) => (
                <button key={k}>{k}</button>
              ))}
            </div>
            <div className="sk-modal-f">
              <button className="sk-tiny" onClick={() => setScreen("card")}>적립안함</button>
              <button className="sk-pay" onClick={() => setWarn("휴대폰 번호를 입력해주세요")}>적립하기</button>
            </div>
          </div>
        </div>
      )}

      {screen === "card" && (
        <div className="sk-center">
          <p>IC카드를 투입구에 꽂아주세요</p>
          <p className="sk-small">결제가 완료될 때까지 카드를 빼지 마세요</p>
          <button className="sk-card" onClick={() => { setScreen("done"); onDone?.(cart); }}>
            ▣ 카드 꽂기 (체험)
          </button>
        </div>
      )}

      {screen === "done" && (
        <div className="sk-center">
          <p>결제가 완료되었습니다</p>
          <p className="sk-no">주문번호 {orderNo}</p>
          <button className="sk-link" onClick={() => { setCart([]); setScreen("start"); }}>처음으로</button>
        </div>
      )}

      {warn && (
        <div className="sk-alert" onClick={() => setWarn(null)}>
          <div>
            <p>{warn}</p>
            <button>확인</button>
          </div>
        </div>
      )}
    </div>
  );
}
