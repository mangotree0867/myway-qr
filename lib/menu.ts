import type { Avoid } from "./profile";

export type Category = "coffee" | "noncoffee" | "tea" | "dessert";

export interface MenuItem {
  id: string;
  cat: Category;
  name: string; // 키오스크에 실제로 적힌 이름
  en: string;
  desc: string; // 키오스크에 실제로 적힌 설명 (외래어, 전문용어가 섞인 원문)
  price: number;
  temps: ("HOT" | "ICE")[]; // 빈 배열이면 온도 선택 없음 (디저트)
  contains: Avoid[];
  art: string; // 일러스트 종류
  color: string; // 일러스트 주 색
}

export const CATEGORIES: { id: Category; label: string; en: string }[] = [
  { id: "coffee", label: "커피", en: "COFFEE" },
  { id: "noncoffee", label: "논커피", en: "NON-COFFEE" },
  { id: "tea", label: "티", en: "TEA" },
  { id: "dessert", label: "디저트", en: "DESSERT" },
];

export const MENU: MenuItem[] = [
  { id: "americano", cat: "coffee", name: "아메리카노", en: "Americano", desc: "에스프레소 샷에 물을 더한 클린한 블랙 커피", price: 2000, temps: ["HOT", "ICE"], contains: ["caffeine"], art: "cup", color: "#3b2416" },
  { id: "decaf", cat: "coffee", name: "디카페인 아메리카노", en: "Decaf Americano", desc: "CO2 공법 디카페인 원두 사용, 카페인 97% 제거", price: 2500, temps: ["HOT", "ICE"], contains: [], art: "cup", color: "#5a3a26" },
  { id: "latte", cat: "coffee", name: "카페라떼", en: "Caffè Latte", desc: "에스프레소와 스팀 밀크의 부드러운 밸런스", price: 3000, temps: ["HOT", "ICE"], contains: ["caffeine", "milk"], art: "latte", color: "#c79a6b" },
  { id: "vanilla", cat: "coffee", name: "바닐라 라떼", en: "Vanilla Latte", desc: "마다가스카르 바닐라 빈 시럽을 더한 시그니처 라떼", price: 3500, temps: ["HOT", "ICE"], contains: ["caffeine", "milk"], art: "latte", color: "#e3c39a" },
  { id: "coldbrew", cat: "coffee", name: "콜드브루", en: "Cold Brew", desc: "12시간 저온 추출한 산미가 적은 커피", price: 3500, temps: ["ICE"], contains: ["caffeine"], art: "cup", color: "#24140c" },
  { id: "einspanner", cat: "coffee", name: "아인슈페너", en: "Einspänner", desc: "진한 롱블랙 위에 수제 크림을 올린 비엔나 스타일", price: 4000, temps: ["ICE"], contains: ["caffeine", "milk"], art: "cream", color: "#2e1b10" },
  { id: "mocha", cat: "coffee", name: "카페모카", en: "Caffè Mocha", desc: "에스프레소, 초콜릿 소스, 스팀 밀크, 휘핑크림", price: 3800, temps: ["HOT", "ICE"], contains: ["caffeine", "milk"], art: "cream", color: "#6b3f22" },
  { id: "choco", cat: "noncoffee", name: "초코라떼", en: "Chocolate Latte", desc: "벨기에산 다크 초콜릿 파우더와 밀크", price: 3500, temps: ["HOT", "ICE"], contains: ["milk"], art: "latte", color: "#5b3420" },
  { id: "sweetpotato", cat: "noncoffee", name: "고구마라떼", en: "Sweet Potato Latte", desc: "국내산 고구마 페이스트와 밀크", price: 3500, temps: ["HOT", "ICE"], contains: ["milk"], art: "latte", color: "#c98a3c" },
  { id: "strawberry", cat: "noncoffee", name: "딸기 스무디", en: "Strawberry Smoothie", desc: "생딸기와 요거트 베이스를 블렌딩", price: 4000, temps: ["ICE"], contains: ["milk"], art: "smoothie", color: "#e2465a" },
  { id: "lemonade", cat: "noncoffee", name: "레몬에이드", en: "Lemonade", desc: "수제 레몬청과 탄산수", price: 3500, temps: ["ICE"], contains: [], art: "ade", color: "#f2d03b" },
  { id: "chamomile", cat: "tea", name: "캐모마일", en: "Chamomile", desc: "디카페인 허브 티백 인퓨전", price: 3000, temps: ["HOT", "ICE"], contains: [], art: "tea", color: "#e7c35a" },
  { id: "yuja", cat: "tea", name: "유자차", en: "Citron Tea", desc: "고흥산 유자청 블렌딩", price: 3300, temps: ["HOT", "ICE"], contains: [], art: "tea", color: "#f0a92a" },
  { id: "earlgrey", cat: "tea", name: "얼그레이", en: "Earl Grey", desc: "베르가못 향 블랙티", price: 3000, temps: ["HOT", "ICE"], contains: ["caffeine"], art: "tea", color: "#8a5a3b" },
  { id: "cheesecake", cat: "dessert", name: "뉴욕 치즈케이크", en: "NY Cheesecake", desc: "크림치즈 베이스의 꾸덕한 텍스처", price: 4500, temps: [], contains: ["milk", "egg", "wheat"], art: "cake", color: "#f3dc9b" },
  { id: "croissant", cat: "dessert", name: "버터 크루아상", en: "Butter Croissant", desc: "프랑스산 AOP 버터 라미네이팅", price: 3000, temps: [], contains: ["milk", "wheat", "egg"], art: "bread", color: "#d99a4e" },
  { id: "saltbread", cat: "dessert", name: "소금빵", en: "Salt Bread", desc: "고메 버터와 게랑드 소금 토핑", price: 2800, temps: [], contains: ["milk", "wheat"], art: "bread", color: "#e0b071" },
  { id: "macaron", cat: "dessert", name: "마카롱", en: "Macaron", desc: "아몬드 꼬끄와 가나슈 필링", price: 2000, temps: [], contains: ["nuts", "egg", "milk"], art: "macaron", color: "#e98fb0" },
];

export const SIZE_UP_PRICE = 500;

export interface CartLine {
  key: string;
  itemId: string;
  temp: "HOT" | "ICE" | null;
  size: "R" | "L";
  qty: number;
}

export function lineKey(itemId: string, temp: string | null, size: string) {
  return `${itemId}|${temp ?? "-"}|${size}`;
}

export function linePrice(l: CartLine) {
  const item = MENU.find((m) => m.id === l.itemId)!;
  return (item.price + (l.size === "L" ? SIZE_UP_PRICE : 0)) * l.qty;
}

export function cartTotal(lines: CartLine[]) {
  return lines.reduce((s, l) => s + linePrice(l), 0);
}

export function addLine(lines: CartLine[], itemId: string, temp: "HOT" | "ICE" | null, size: "R" | "L", qty: number): CartLine[] {
  const key = lineKey(itemId, temp, size);
  const found = lines.find((l) => l.key === key);
  if (found) return lines.map((l) => (l.key === key ? { ...l, qty: l.qty + qty } : l));
  return [...lines, { key, itemId, temp, size, qty }];
}

export const won = (n: number) => n.toLocaleString("ko-KR") + "원";
