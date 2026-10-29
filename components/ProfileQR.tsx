"use client";
import { useEffect, useRef } from "react";
import QRCode from "qrcode";
import { profileUrl, describeProfile, type Profile } from "@/lib/profile";

export function useOrigin() {
  if (typeof window === "undefined") return "https://myway-qr.vercel.app";
  return window.location.origin;
}

export default function ProfileQR({ profile, size = 260 }: { profile: Profile; size?: number }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const origin = useOrigin();
  useEffect(() => {
    if (!ref.current) return;
    QRCode.toCanvas(ref.current, profileUrl(origin, profile), { width: size, margin: 2, errorCorrectionLevel: "M", color: { dark: "#111111", light: "#ffffff" } });
  }, [profile, size, origin]);
  return <canvas ref={ref} width={size} height={size} className="qr-canvas" aria-label="내 방식 QR 코드" />;
}

// 지갑에 넣고 다닐 수 있는 인쇄용 카드 이미지 (스마트폰이 없는 분을 위해)
export async function makeWalletCard(profile: Profile, origin: string): Promise<string> {
  const W = 1012,
    H = 638; // 신용카드 비율
  const c = document.createElement("canvas");
  c.width = W;
  c.height = H;
  const g = c.getContext("2d")!;
  g.fillStyle = "#1f4fd8";
  g.fillRect(0, 0, W, H);
  g.fillStyle = "#ffffff";
  roundRect(g, 24, 24, W - 48, H - 48, 36);
  g.fill();
  const qr = document.createElement("canvas");
  await QRCode.toCanvas(qr, profileUrl(origin, profile), { width: 470, margin: 1, errorCorrectionLevel: "M" });
  g.drawImage(qr, W - 470 - 64, (H - 470) / 2);
  g.fillStyle = "#1f4fd8";
  g.font = "900 64px 'Pretendard Variable', 'Noto Sans CJK KR', sans-serif";
  g.fillText("내 방식 QR", 70, 140);
  g.fillStyle = "#16181d";
  g.font = "600 30px 'Pretendard Variable', 'Noto Sans CJK KR', sans-serif";
  g.fillText("키오스크의 QR 리더에 보여 주세요", 70, 196);
  g.font = "500 27px 'Pretendard Variable', 'Noto Sans CJK KR', sans-serif";
  const lines = describeProfile(profile).slice(0, 7);
  lines.forEach((l, i) => {
    g.fillStyle = "#1f4fd8";
    g.beginPath();
    g.arc(84, 262 + i * 46, 8, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = "#16181d";
    g.fillText(l, 104, 272 + i * 46);
  });
  g.fillStyle = "#6b7280";
  g.font = "500 20px 'Pretendard Variable', sans-serif";
  g.fillText("이름이나 장애 정보는 담겨 있지 않아요", 70, H - 56);
  return c.toDataURL("image/png");
}

function roundRect(g: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  g.beginPath();
  g.moveTo(x + r, y);
  g.arcTo(x + w, y, x + w, y + h, r);
  g.arcTo(x + w, y + h, x, y + h, r);
  g.arcTo(x, y + h, x, y, r);
  g.arcTo(x, y, x + w, y, r);
  g.closePath();
}
