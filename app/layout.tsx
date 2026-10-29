import type { Metadata, Viewport } from "next";
import "pretendard/dist/web/variable/pretendardvariable-dynamic-subset.css";
import "./globals.css";

export const metadata: Metadata = {
  title: "내 방식 QR | 누구나 쓰는 키오스크",
  description: "QR 하나로 어떤 키오스크든 내가 쓰기 편한 방식으로. 큰 글씨, 쉬운 말, 소리 안내, 말로 주문하기를 생성형 AI가 맞춰 줍니다.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#1f4fd8",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
