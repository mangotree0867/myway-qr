// 메뉴 일러스트 (사진 대신 단순한 그림. 저시력 사용자도 모양을 알아보기 쉽게 크고 단순하게)
export default function MenuArt({ art, color, temp, size = 96 }: { art: string; color: string; temp?: "HOT" | "ICE" | null; size?: number }) {
  const cupBody = (fill: string, glass = false) => (
    <>
      <path d="M26 34 L74 34 L68 86 Q67 92 61 92 L39 92 Q33 92 32 86 Z" fill={glass ? "#dff3ff" : "#ffffff"} stroke="#1b1b1f" strokeWidth="3" />
      <path d="M29 46 L71 46 L67 84 Q66 88 61 88 L39 88 Q34 88 33 84 Z" fill={fill} />
    </>
  );
  const steam = (
    <g stroke="#9aa0a6" strokeWidth="3" fill="none" strokeLinecap="round">
      <path d="M40 26 q-5 -6 0 -12 q5 -6 0 -12" />
      <path d="M52 26 q-5 -6 0 -12 q5 -6 0 -12" />
      <path d="M64 26 q-5 -6 0 -12 q5 -6 0 -12" />
    </g>
  );
  const ice = (
    <g fill="#ffffff" stroke="#8ccbe8" strokeWidth="2" opacity="0.95">
      <rect x="36" y="50" width="12" height="12" rx="2" transform="rotate(-12 42 56)" />
      <rect x="52" y="56" width="12" height="12" rx="2" transform="rotate(10 58 62)" />
      <rect x="42" y="66" width="11" height="11" rx="2" />
    </g>
  );
  let body: React.ReactNode;
  switch (art) {
    case "cup":
    case "latte":
    case "tea":
    case "ade":
    case "smoothie":
      body = (
        <>
          {temp === "HOT" && steam}
          {cupBody(color, temp === "ICE" || art === "ade" || art === "smoothie")}
          {art === "latte" && <ellipse cx="50" cy="48" rx="18" ry="4" fill="#f6ead8" />}
          {art === "tea" && <path d="M70 40 l10 -14" stroke="#1b1b1f" strokeWidth="2" />}
          {art === "ade" && <circle cx="66" cy="38" r="9" fill="#f7e463" stroke="#1b1b1f" strokeWidth="2" />}
          {(temp === "ICE" || art === "ade") && ice}
          {(temp === "ICE" || art === "smoothie" || art === "ade") && <path d="M58 34 L64 8" stroke="#1b1b1f" strokeWidth="4" strokeLinecap="round" />}
        </>
      );
      break;
    case "cream":
      body = (
        <>
          {temp === "HOT" && steam}
          {cupBody(color, temp !== "HOT")}
          <path d="M28 40 q6 -16 22 -12 q16 -6 22 12 Z" fill="#fffaf0" stroke="#1b1b1f" strokeWidth="2.5" />
        </>
      );
      break;
    case "cake":
      body = (
        <>
          <path d="M18 72 L50 40 L84 64 L84 82 L18 82 Z" fill={color} stroke="#1b1b1f" strokeWidth="3" strokeLinejoin="round" />
          <path d="M18 72 L84 72" stroke="#b7863f" strokeWidth="5" />
          <path d="M50 40 L84 64 L18 72 Z" fill="#fbecc2" stroke="#1b1b1f" strokeWidth="3" strokeLinejoin="round" />
        </>
      );
      break;
    case "bread":
      body = (
        <>
          <path d="M14 66 Q20 38 50 36 Q80 38 86 66 Q80 76 50 76 Q20 76 14 66 Z" fill={color} stroke="#1b1b1f" strokeWidth="3" />
          <path d="M34 42 Q38 56 34 72 M50 38 Q54 56 50 74 M66 42 Q70 56 66 72" stroke="#a8692d" strokeWidth="3" fill="none" />
        </>
      );
      break;
    case "macaron":
      body = (
        <>
          <ellipse cx="50" cy="44" rx="30" ry="12" fill={color} stroke="#1b1b1f" strokeWidth="3" />
          <rect x="24" y="50" width="52" height="8" rx="4" fill="#fff4f8" stroke="#1b1b1f" strokeWidth="2" />
          <ellipse cx="50" cy="66" rx="30" ry="12" fill={color} stroke="#1b1b1f" strokeWidth="3" />
        </>
      );
      break;
    default:
      body = <circle cx="50" cy="50" r="30" fill={color} />;
  }
  return (
    <svg viewBox="0 0 100 100" width={size} height={size} aria-hidden="true">
      {body}
    </svg>
  );
}
