"use client";
import { useEffect, useRef, useState } from "react";
import jsQR from "jsqr";
import { decodeProfile, type Profile } from "@/lib/profile";

// 키오스크 카메라로 "내 방식 QR"을 읽는다 (실제 키오스크의 QR 리더 역할)
export default function QRScanner({ onProfile, onClose }: { onProfile: (p: Profile) => void; onClose: () => void }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let stream: MediaStream | null = null;
    let timer: number | undefined;
    let stopped = false;
    (async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user", width: { ideal: 1280 } }, audio: false });
        const v = videoRef.current!;
        v.srcObject = stream;
        await v.play();
        const tick = () => {
          if (stopped) return;
          const c = canvasRef.current!;
          if (v.videoWidth) {
            c.width = v.videoWidth;
            c.height = v.videoHeight;
            const ctx = c.getContext("2d", { willReadFrequently: true })!;
            ctx.drawImage(v, 0, 0);
            const img = ctx.getImageData(0, 0, c.width, c.height);
            const code = jsQR(img.data, img.width, img.height, { inversionAttempts: "attemptBoth" });
            if (code?.data) {
              const p = decodeProfile(code.data);
              if (p) {
                stopped = true;
                onProfile(p);
                return;
              }
            }
          }
          timer = window.setTimeout(tick, 180);
        };
        tick();
      } catch {
        setErr("카메라를 켤 수 없어요. 아래 '예시 프로필'로 체험해 보세요.");
      }
    })();
    return () => {
      stopped = true;
      if (timer) clearTimeout(timer);
      stream?.getTracks().forEach((t) => t.stop());
    };
  }, [onProfile]);

  return (
    <div className="scan-wrap">
      <div className="scan-box">
        <video ref={videoRef} playsInline muted className="scan-video" />
        <div className="scan-frame" />
        <canvas ref={canvasRef} style={{ display: "none" }} />
      </div>
      <p className="scan-text">{err ?? "휴대폰이나 카드의 '내 방식 QR'을 카메라에 보여 주세요"}</p>
      <button className="scan-close" onClick={onClose}>
        닫기
      </button>
    </div>
  );
}
