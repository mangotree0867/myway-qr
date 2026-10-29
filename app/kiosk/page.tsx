"use client";
import { Suspense, useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import StandardKiosk from "@/components/StandardKiosk";
import MyWayKiosk from "@/components/MyWayKiosk";
import QRScanner from "@/components/QRScanner";
import { DEFAULT_PROFILE, PRESETS, decodeProfile, describeProfile, type Profile } from "@/lib/profile";
import { MENU, type CartLine } from "@/lib/menu";
import * as M from "@/lib/metrics";

const DEMOS: { label: string; p: Profile }[] = [
  { label: "어르신", p: { ...DEFAULT_PROFILE, ...PRESETS[0].apply } },
  { label: "저시력", p: { ...DEFAULT_PROFILE, ...PRESETS[1].apply } },
  { label: "휠체어", p: { ...DEFAULT_PROFILE, ...PRESETS[2].apply } },
  { label: "느린 학습자", p: { ...DEFAULT_PROFILE, ...PRESETS[3].apply } },
  { label: "외국인 (English)", p: { ...DEFAULT_PROFILE, ...PRESETS[5].apply } },
  { label: "우유 알레르기", p: { ...DEFAULT_PROFILE, av: ["milk"] } },
];

function KioskInner() {
  const sp = useSearchParams();
  const [mode, setMode] = useState<"standard" | "scan" | "myway">("standard");
  const [profile, setProfile] = useState<Profile | null>(null);
  const [key, setKey] = useState(0);
  const [record, setRecord] = useState<M.Run | null>(null);
  const timeout = Number(sp.get("timeout") ?? 60);
  const test = sp.get("test");
  const task = sp.get("task") || "";

  useEffect(() => {
    const d = sp.get("d");
    if (d) {
      const p = decodeProfile(d);
      if (p) {
        setProfile(p);
        setMode("myway");
      }
    }
    if (test) M.startRun(test, d ? "myway" : "standard", task);
  }, [sp, test, task]);

  const onProfile = useCallback((p: Profile) => {
    setProfile(p);
    setMode("myway");
  }, []);

  const onDone = (cart: CartLine[]) => {
    if (!test) return;
    const summary = cart.map((l) => `${MENU.find((m) => m.id === l.itemId)!.name}/${l.temp ?? "-"}/${l.size}/${l.qty}`).join("; ");
    setRecord(M.finishRun(summary));
  };

  return (
    <main className="kiosk-page">
      <div className="kiosk-frame" key={key}>
        {mode === "myway" && profile ? (
          <MyWayKiosk profile={profile} onExit={() => { setMode("standard"); setProfile(null); setKey((k) => k + 1); }} onDone={onDone} />
        ) : (
          <StandardKiosk onMyWay={() => setMode("scan")} timeoutSec={test ? timeout : timeout} onDone={onDone} />
        )}
        {mode === "scan" && <QRScanner onProfile={onProfile} onClose={() => setMode("standard")} />}
      </div>

      {!test && (
        <aside className="kiosk-side">
          <Link href="/" className="side-home">
            ← 내 방식 QR 소개
          </Link>
          <h2>체험 방법</h2>
          <ol>
            <li>
              왼쪽은 <b>일반 키오스크</b>예요. 먼저 그대로 주문해 보세요.
            </li>
            <li>
              <b>내 방식 QR</b> 버튼을 누르고 휴대폰의 QR을 카메라에 보여 주면 같은 키오스크가 바뀌어요.
            </li>
            <li>QR이 없으면 아래 예시 프로필을 눌러 보세요.</li>
          </ol>
          <div className="demo-list">
            {DEMOS.map((d) => (
              <button key={d.label} onClick={() => onProfile(d.p)} title={describeProfile(d.p).join(", ")}>
                {d.label}
              </button>
            ))}
          </div>
          <Link href="/profile" className="side-cta">
            내 QR 만들기 →
          </Link>
        </aside>
      )}

      {record && (
        <div className="test-done">
          <div>
            <b>기록했어요</b>
            <p>
              {record.participant} / {record.mode === "myway" ? "내 방식" : "일반"} / {((record.endedAt! - record.startedAt) / 1000).toFixed(1)}초 / 누름 {record.taps}회 / 되돌아감 {record.backs}회 / 시간초과 {record.timeouts}회
            </p>
            <Link href="/test">테스트 화면으로</Link>
          </div>
        </div>
      )}
    </main>
  );
}

export default function KioskPage() {
  return (
    <Suspense>
      <KioskInner />
    </Suspense>
  );
}
