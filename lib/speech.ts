"use client";
import { useEffect, useState } from "react";
// 브라우저 내장 음성 합성(TTS)과 음성 인식(STT). 별도 서버 비용 없이 휴대폰, 키오스크 브라우저에서 동작.

let currentUtter: SpeechSynthesisUtterance | null = null;

export function speak(text: string, lang = "ko-KR", rate = 0.9) {
  if (typeof window === "undefined" || !("speechSynthesis" in window) || !text) return;
  try {
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = lang;
    u.rate = rate;
    const voices = window.speechSynthesis.getVoices();
    const v = voices.find((x) => x.lang === lang) || voices.find((x) => x.lang.startsWith(lang.slice(0, 2)));
    if (v) u.voice = v;
    currentUtter = u;
    window.speechSynthesis.speak(u);
  } catch {}
}

export function stopSpeak() {
  try {
    window.speechSynthesis?.cancel();
    currentUtter = null;
  } catch {}
}

type SR = {
  lang: string;
  interimResults: boolean;
  maxAlternatives: number;
  continuous: boolean;
  onresult: ((e: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
  onerror: ((e: unknown) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
};

export function canListen(): boolean {
  if (typeof window === "undefined") return false;
  const w = window as unknown as { SpeechRecognition?: unknown; webkitSpeechRecognition?: unknown };
  return !!(w.SpeechRecognition || w.webkitSpeechRecognition);
}

export function listen(lang = "ko-KR", onPartial?: (s: string) => void): { promise: Promise<string>; stop: () => void } {
  const w = window as unknown as { SpeechRecognition?: new () => SR; webkitSpeechRecognition?: new () => SR };
  const Ctor = w.SpeechRecognition || w.webkitSpeechRecognition;
  if (!Ctor) return { promise: Promise.resolve(""), stop: () => {} };
  const rec = new Ctor();
  rec.lang = lang;
  rec.interimResults = true;
  rec.maxAlternatives = 1;
  rec.continuous = false;
  let finalText = "";
  const promise = new Promise<string>((resolve) => {
    rec.onresult = (e) => {
      let s = "";
      for (let i = 0; i < e.results.length; i++) s += e.results[i][0].transcript;
      finalText = s;
      onPartial?.(s);
    };
    rec.onerror = () => resolve(finalText);
    rec.onend = () => resolve(finalText);
  });
  try {
    stopSpeak();
    rec.start();
  } catch {}
  return { promise, stop: () => rec.stop() };
}

// 서버 렌더링과 어긋나지 않도록, 화면이 뜬 뒤에 음성 인식 지원 여부를 확인한다
export function useCanListen() {
  const [ok, setOk] = useState(false);
  useEffect(() => setOk(canListen()), []);
  return ok;
}
