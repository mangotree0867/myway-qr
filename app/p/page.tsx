"use client";
// 휴대폰 카메라로 "내 방식 QR"을 찍었을 때 열리는 화면
import { useEffect, useState } from "react";
import Link from "next/link";
import ProfileQR from "@/components/ProfileQR";
import { decodeProfile, describeProfile, encodeProfile, saveLocal, type Profile } from "@/lib/profile";

export default function ProfileView() {
  const [p, setP] = useState<Profile | null>(null);
  const [bad, setBad] = useState(false);
  const [saved, setSaved] = useState(false);
  useEffect(() => {
    const r = decodeProfile(window.location.hash);
    if (r) setP(r);
    else setBad(true);
  }, []);

  if (bad)
    return (
      <main className="pf">
        <section className="pf-sec">
          <h1>QR을 읽지 못했어요</h1>
          <Link className="pf-next" href="/profile">
            새로 만들기
          </Link>
        </section>
      </main>
    );
  if (!p) return null;
  return (
    <main className="pf">
      <header className="pf-top">
        <Link href="/" className="pf-logo">
          내 방식 QR
        </Link>
      </header>
      <section className="pf-sec pf-done">
        <h1>내 방식 프로필</h1>
        <p className="pf-sub">이 화면을 키오스크의 QR 리더에 보여 주세요.</p>
        <div className="pf-qr">
          <ProfileQR profile={p} size={260} />
        </div>
        <ul className="pf-chips">
          {describeProfile(p).map((d) => (
            <li key={d}>{d}</li>
          ))}
        </ul>
        <div className="pf-actions">
          <button
            className="pf-next"
            onClick={() => {
              saveLocal(p);
              setSaved(true);
            }}
          >
            {saved ? "저장했어요" : "이 휴대폰에 저장"}
          </button>
          <Link className="pf-back" href={`/kiosk?d=${encodeProfile(p)}`}>
            체험 키오스크에서 써보기
          </Link>
          <Link className="pf-back" href={`/profile#d=${encodeProfile(p)}`}>
            설정 바꾸기
          </Link>
        </div>
      </section>
    </main>
  );
}
