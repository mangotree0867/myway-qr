"use client";
// 사용자 테스트(사전검증)용 기록: 주문 시작부터 결제 완료까지 걸린 시간, 누른 횟수, 되돌아간 횟수, 시간 초과 횟수
// 개인정보는 기록하지 않고, 참가자 번호(P1, P2...)만 쓴다.

export interface Run {
  id: string;
  participant: string;
  mode: "standard" | "myway";
  task: string;
  startedAt: number;
  endedAt?: number;
  taps: number;
  backs: number;
  timeouts: number;
  wrongItems?: number; // 목표와 다른 메뉴를 담은 수 (완료 후 판정)
  cart?: string;
  completed: boolean;
}

const KEY = "myway-runs";

let active: Run | null = null;

export function startRun(participant: string, mode: Run["mode"], task: string) {
  active = { id: Math.random().toString(36).slice(2, 8), participant, mode, task, startedAt: Date.now(), taps: 0, backs: 0, timeouts: 0, completed: false };
}
export function isRunning() {
  return !!active;
}
export function tap() {
  if (active) active.taps++;
}
export function back() {
  if (active) active.backs++;
}
export function timeout() {
  if (active) active.timeouts++;
}
export function finishRun(cart: string, completed = true) {
  if (!active) return null;
  active.endedAt = Date.now();
  active.cart = cart;
  active.completed = completed;
  const runs = loadRuns();
  runs.push(active);
  try {
    localStorage.setItem(KEY, JSON.stringify(runs));
  } catch {}
  const r = active;
  active = null;
  return r;
}
export function loadRuns(): Run[] {
  try {
    return JSON.parse(localStorage.getItem(KEY) || "[]");
  } catch {
    return [];
  }
}
export function clearRuns() {
  try {
    localStorage.removeItem(KEY);
  } catch {}
}
