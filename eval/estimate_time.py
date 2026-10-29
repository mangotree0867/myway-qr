# 고령자(80대 가정) 주문 시간 추정 모델 (실제 측정이 아닌 예상치)
# 방법: KLM(키 입력 수준 모델, Card, Moran, Newell 1980)의 기본 시간값
#   M(생각, 결정) 1.35초, P(손 뻗어 누르기) 1.1초, 시각 탐색은 화면의 선택지 절반을 훑는다고 가정
# 에 고령자 보정 계수와, 화면별 선택지 수, 흔한 실수 확률과 복구 시간을 곱해 계산한다.
# 과제: 차가운 아메리카노 1잔 + 치즈케이크 1개 포장 주문 (사용자 테스트 페이지와 같은 과제)
import json, itertools

KLM_M, KLM_P = 1.35, 1.1

# (화면 이름, 선택지 수, 글자 조건) 글자 조건: small_en = 작은 글씨+영어, large_ko = 큰 글씨+쉬운 한국어
STANDARD = [
    ("시작: 매장/포장", 3, "small_en"),
    ("메뉴: Americano 찾기", 13, "small_en"),
    ("옵션: ICE", 14, "small_en"),
    ("옵션: 컵(필수)", 14, "small_en"),
    ("주문담기", 2, "small_en"),
    ("DESSERT 탭", 6, "small_en"),
    ("NY Cheesecake", 4, "small_en"),
    ("주문담기", 2, "small_en"),
    ("결제하기", 3, "small_en"),
    ("포장 Take-out", 2, "small_en"),
    ("결제수단", 6, "small_en"),
    ("적립안함 찾기", 14, "small_en"),
    ("카드 꽂기", 1, "small_en"),
]
STANDARD_ERRORS = [  # (실수, 일어날 확률, 복구 시간 초)
    ("필수 옵션(컵) 빠뜨려 경고 후 다시 선택", 0.6, 10),
    ("적립 팝업에서 작은 '적립안함'을 못 찾아 헤맴", 0.5, 8),
    ("영어 메뉴 이름을 잘못 알고 다른 메뉴를 눌렀다 취소", 0.3, 12),
]
MYWAY = [
    ("무엇을 드시겠어요? (커피)", 4, "large_ko"),
    ("아메리카노 고르기 (쉬운 설명 읽기)", 7, "large_ko_desc"),
    ("따뜻하게/차갑게", 2, "large_ko"),
    ("크기", 2, "large_ko"),
    ("이대로 담기", 1, "large_ko"),
    ("더 고를래요", 2, "large_ko"),
    ("빵과 케이크", 4, "large_ko"),
    ("치즈케이크 고르기", 4, "large_ko_desc"),
    ("이대로 담기", 1, "large_ko"),
    ("다 골랐어요", 2, "large_ko"),
    ("가져가요", 2, "large_ko"),
    ("주문 확인 듣고 결제", 2, "large_ko"),
    ("카드 꽂기", 1, "large_ko"),
]
MYWAY_ERRORS = [("뒤로 가서 다시 고름", 0.2, 6)]
# 말로 주문: 말하기(문장 길이 기준 6초) + AI 응답 1.3초(평가 평균) + 확인 듣기 4초 + 이후 4번 누르기
VOICE_FIXED = 6 + 1.3 + 4
VOICE_STEPS = [("다 골랐어요", 2, "large_ko"), ("가져가요", 2, "large_ko"), ("결제", 2, "large_ko"), ("카드 꽂기", 1, "large_ko")]

def run(steps, errors, scan, age, extra=0.0):
    t = extra
    for _, n, cond in steps:
        s = scan[cond]
        search = (n / 2) * s
        t += search + KLM_M * age["M"] + KLM_P * (age["P_small"] if cond == "small_en" else age["P_large"])
    for _, p, cost in errors:
        t += p * cost * age["M"]
    return t

# 가정값의 낮은 쪽과 높은 쪽으로 범위를 낸다
SCAN = {
    "low": {"small_en": 0.7, "large_ko": 0.3, "large_ko_desc": 0.6},
    "high": {"small_en": 1.2, "large_ko": 0.5, "large_ko_desc": 1.0},
}
AGE = {
    "low": {"M": 1.4, "P_small": 1.5, "P_large": 1.2},
    "high": {"M": 2.0, "P_small": 2.2, "P_large": 1.5},
}
out = {}
for k in ["low", "high"]:
    std = run(STANDARD, STANDARD_ERRORS, SCAN[k], AGE[k])
    mw = run(MYWAY, MYWAY_ERRORS, SCAN[k], AGE[k])
    vo = run(VOICE_STEPS, [], SCAN[k], AGE[k], VOICE_FIXED)
    out[k] = {"standard": round(std, 1), "myway_touch": round(mw, 1), "myway_voice": round(vo, 1)}
std_mid = (out["low"]["standard"] + out["high"]["standard"]) / 2
mw_mid = (out["low"]["myway_touch"] + out["high"]["myway_touch"]) / 2
vo_mid = (out["low"]["myway_voice"] + out["high"]["myway_voice"]) / 2
out["mid"] = {"standard": round(std_mid, 1), "myway_touch": round(mw_mid, 1), "myway_voice": round(vo_mid, 1),
              "cut_touch_pct": round((1 - mw_mid / std_mid) * 100), "cut_voice_pct": round((1 - vo_mid / std_mid) * 100)}
out["expected_errors"] = {"standard": round(sum(p for _, p, _ in STANDARD_ERRORS), 2), "myway": round(sum(p for _, p, _ in MYWAY_ERRORS), 2)}
out["note"] = "실제 측정이 아닌 추정치. 80대 고령자 1인 사용을 가정."
print(json.dumps(out, ensure_ascii=False, indent=1))
json.dump(out, open("/home/claude/myway-qr/eval/results/time_estimate.json", "w"), ensure_ascii=False, indent=1)
