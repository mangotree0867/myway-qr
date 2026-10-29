"use client";
// 사용자 테스트(사전검증) 진행 화면
// 같은 과제를 일반 키오스크와 내 방식 키오스크로 한 번씩 해 보고, 시간, 누른 횟수, 되돌아간 횟수, 정확도, 만족도를 비교한다.
import { useEffect, useState } from "react";
import Link from "next/link";
import { DEFAULT_PROFILE, PRESETS, encodeProfile, loadLocal, type Profile } from "@/lib/profile";
import { clearRuns, loadRuns, type Run } from "@/lib/metrics";

const TASK = "차가운 아메리카노 1잔과 치즈케이크 1개를 포장으로 주문하기";
const EXPECT = ["아메리카노/ICE/R/1", "뉴욕 치즈케이크/-/R/1"];

interface Survey {
  participant: string;
  mode: "standard" | "myway";
  easy: number;
  alone: number;
  again: number;
  note: string;
}
const SKEY = "myway-survey";

export default function TestPage() {
  const [pid, setPid] = useState("P1");
  const [preset, setPreset] = useState("senior");
  const [runs, setRuns] = useState<Run[]>([]);
  const [surveys, setSurveys] = useState<Survey[]>([]);
  const [sv, setSv] = useState<Survey>({ participant: "P1", mode: "standard", easy: 3, alone: 3, again: 3, note: "" });

  useEffect(() => {
    setRuns(loadRuns());
    try {
      setSurveys(JSON.parse(localStorage.getItem(SKEY) || "[]"));
    } catch {}
  }, []);

  const prof = (): Profile => {
    if (preset === "saved") return loadLocal() || DEFAULT_PROFILE;
    return { ...DEFAULT_PROFILE, ...PRESETS.find((x) => x.id === preset)!.apply };
  };
  const n = Number(pid.replace(/\D/g, "")) || 1;
  const firstStd = n % 2 === 1;

  const correct = (r: Run) => {
    const got = (r.cart || "").split("; ").filter(Boolean).sort();
    return JSON.stringify(got) === JSON.stringify([...EXPECT].sort());
  };

  const saveSurvey = () => {
    const next = [...surveys, { ...sv, participant: pid }];
    setSurveys(next);
    localStorage.setItem(SKEY, JSON.stringify(next));
  };

  const exportAll = () => {
    const data = { task: TASK, runs: runs.map((r) => ({ ...r, seconds: r.endedAt ? (r.endedAt - r.startedAt) / 1000 : null, correct: correct(r) })), surveys };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `myway-test-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
  };

  const avg = (mode: Run["mode"], f: (r: Run) => number) => {
    const rs = runs.filter((r) => r.mode === mode && r.endedAt);
    if (!rs.length) return "-";
    return (rs.reduce((s, r) => s + f(r), 0) / rs.length).toFixed(1);
  };

  return (
    <main className="pf test">
      <header className="pf-top">
        <Link href="/" className="pf-logo">
          내 방식 QR
        </Link>
        <span className="lens-tag">사용자 테스트</span>
      </header>
      <section className="pf-sec">
        <h1>사용자 테스트</h1>
        <p className="pf-sub">
          과제: <b>{TASK}</b>
        </p>
        <div className="test-box">
          <label>
            참가자 번호 <input value={pid} onChange={(e) => setPid(e.target.value)} />
          </label>
          <label>
            내 방식 프로필
            <select value={preset} onChange={(e) => setPreset(e.target.value)}>
              {PRESETS.map((x) => (
                <option key={x.id} value={x.id}>
                  {x.hint}: {x.label}
                </option>
              ))}
              <option value="saved">이 기기에 저장된 내 QR</option>
            </select>
          </label>
          <p className="test-order">
            순서 (순서 효과를 줄이려고 번갈아 진행): <b>{firstStd ? "일반 → 내 방식" : "내 방식 → 일반"}</b>
          </p>
          <div className="pf-actions">
            <Link className={firstStd ? "pf-next" : "pf-back"} href={`/kiosk?test=${pid}&task=${encodeURIComponent(TASK)}&timeout=60`}>
              일반 키오스크로 시작
            </Link>
            <Link className={!firstStd ? "pf-next" : "pf-back"} href={`/kiosk?test=${pid}&task=${encodeURIComponent(TASK)}&d=${encodeProfile(prof())}`}>
              내 방식으로 시작
            </Link>
          </div>
        </div>

        <h2>끝난 뒤 설문 (1 전혀 아니다 ~ 5 매우 그렇다)</h2>
        <div className="test-box">
          <label>
            방금 쓴 화면
            <select value={sv.mode} onChange={(e) => setSv({ ...sv, mode: e.target.value as Survey["mode"] })}>
              <option value="standard">일반 키오스크</option>
              <option value="myway">내 방식</option>
            </select>
          </label>
          {(
            [
              ["easy", "쓰기 쉬웠다"],
              ["alone", "다른 사람 도움 없이 할 수 있었다"],
              ["again", "다음에도 이 방식으로 쓰고 싶다"],
            ] as const
          ).map(([k, label]) => (
            <div key={k} className="test-likert">
              <span>{label}</span>
              {[1, 2, 3, 4, 5].map((v) => (
                <button key={v} className={sv[k] === v ? "on" : ""} onClick={() => setSv({ ...sv, [k]: v })}>
                  {v}
                </button>
              ))}
            </div>
          ))}
          <label>
            한마디 (어려웠던 점, 좋았던 점)
            <input value={sv.note} onChange={(e) => setSv({ ...sv, note: e.target.value })} />
          </label>
          <button className="pf-next" onClick={saveSurvey}>
            설문 저장
          </button>
        </div>

        <h2>기록 ({runs.length}건)</h2>
        <div className="test-sum">
          <div>
            <b>일반</b> 평균 {avg("standard", (r) => (r.endedAt! - r.startedAt) / 1000)}초 / 누름 {avg("standard", (r) => r.taps)}회 / 되돌아감 {avg("standard", (r) => r.backs)}회 / 시간초과 {avg("standard", (r) => r.timeouts)}회
          </div>
          <div>
            <b>내 방식</b> 평균 {avg("myway", (r) => (r.endedAt! - r.startedAt) / 1000)}초 / 누름 {avg("myway", (r) => r.taps)}회 / 되돌아감 {avg("myway", (r) => r.backs)}회 / 시간초과 {avg("myway", (r) => r.timeouts)}회
          </div>
        </div>
        <table className="test-table">
          <thead>
            <tr>
              <th>참가자</th>
              <th>화면</th>
              <th>시간(초)</th>
              <th>누름</th>
              <th>되돌아감</th>
              <th>시간초과</th>
              <th>정확</th>
            </tr>
          </thead>
          <tbody>
            {runs.map((r) => (
              <tr key={r.id}>
                <td>{r.participant}</td>
                <td>{r.mode === "myway" ? "내 방식" : "일반"}</td>
                <td>{r.endedAt ? ((r.endedAt - r.startedAt) / 1000).toFixed(1) : "-"}</td>
                <td>{r.taps}</td>
                <td>{r.backs}</td>
                <td>{r.timeouts}</td>
                <td>{correct(r) ? "O" : "X"}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="pf-actions">
          <button className="pf-next" onClick={exportAll}>
            결과 파일 내려받기
          </button>
          <button
            className="pf-back"
            onClick={() => {
              if (confirm("기록을 모두 지울까요?")) {
                clearRuns();
                localStorage.removeItem(SKEY);
                setRuns([]);
                setSurveys([]);
              }
            }}
          >
            기록 지우기
          </button>
        </div>
      </section>
    </main>
  );
}
