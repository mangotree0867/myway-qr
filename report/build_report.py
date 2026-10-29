# 성과보고서(PPT 양식 4장) 생성기. 실험 결과는 results.json 에서 읽어 채운다.
import json, sys, os, copy
from pptx import Presentation
from pptx.util import Emu, Pt
from pptx.dml.color import RGBColor
from pptx.enum.text import PP_ALIGN, MSO_ANCHOR
from pptx.oxml.ns import qn

TPL, IMG, OUT, RES = sys.argv[1], sys.argv[2], sys.argv[3], sys.argv[4]
R = json.load(open(RES)) if os.path.exists(RES) else {}
def r(k, default="[측정 중]"):
    return str(R.get(k, default))

BLUE = RGBColor(0x1F, 0x4F, 0xD8); INK = RGBColor(0x16, 0x18, 0x1D); SUB = RGBColor(0x4A, 0x4F, 0x5A); LBLUE = RGBColor(0x4D, 0x9C, 0xFE)
FONT = "Pretendard"
prs = Presentation(TPL)
W, H = prs.slide_width, prs.slide_height
IN = 914400
def E(inch): return Emu(int(inch * IN))

def remove(slide, ids):
    for sh in list(slide.shapes):
        if sh.shape_id in ids:
            sh._element.getparent().remove(sh._element)

def tb(slide, x, y, w, h, paras, size=20, anchor=MSO_ANCHOR.TOP):
    """paras: list of (text, opts) ; opts: size,bold,color,bullet,indent,space"""
    box = slide.shapes.add_textbox(E(x), E(y), E(w), E(h))
    tf = box.text_frame; tf.word_wrap = True; tf.vertical_anchor = anchor
    tf.margin_left = tf.margin_right = E(0.05); tf.margin_top = tf.margin_bottom = E(0.03)
    first = True
    for item in paras:
        text, o = (item, {}) if isinstance(item, str) else item
        p = tf.paragraphs[0] if first else tf.add_paragraph(); first = False
        p.space_after = Pt(o.get("space", 6))
        p.line_spacing = o.get("ls", 1.15)
        if o.get("align") == "center": p.alignment = PP_ALIGN.CENTER
        segs = text if isinstance(text, list) else [(text, {})]
        for seg in segs:
            st, so = (seg, {}) if isinstance(seg, str) else seg
            run = p.add_run(); run.text = st
            f = run.font; f.name = FONT; f.size = Pt(so.get("size", o.get("size", size)))
            f.bold = so.get("bold", o.get("bold", False))
            f.color.rgb = so.get("color", o.get("color", INK))
            rPr = run._r.get_or_add_rPr()
            ea = rPr.find(qn("a:ea"))
            if ea is None:
                ea = rPr.makeelement(qn("a:ea"), {}); rPr.append(ea)
            ea.set("typeface", FONT)
        if o.get("indent"):
            pPr = p._p.get_or_add_pPr(); pPr.set("marL", str(int(E(o["indent"])))); pPr.set("indent", str(-int(E(0.28))))
    return box

def pic(slide, name, x, y, w=None, h=None, border=False):
    path = os.path.join(IMG, name)
    p = slide.shapes.add_picture(path, E(x), E(y), E(w) if w else None, E(h) if h else None)
    if border:
        p.line.color.rgb = RGBColor(0xD9, 0xD2, 0xC3); p.line.width = Pt(1.5)
    return p

def head(slide, x, y, w, text, color=BLUE, size=24):
    return tb(slide, x, y, w, 0.6, [(text, {"bold": True, "color": color, "size": size})])

def table(slide, x, y, w, rows, colw, size=17, rowh=0.62):
    t = slide.shapes.add_table(len(rows), len(rows[0]), E(x), E(y), E(w), E(rowh * len(rows))).table
    for i, cw in enumerate(colw): t.columns[i].width = E(cw)
    for ri, row in enumerate(rows):
        for ci, val in enumerate(row):
            c = t.cell(ri, ci); c.text = ""
            c.margin_left = c.margin_right = E(0.1); c.margin_top = c.margin_bottom = E(0.05)
            c.vertical_anchor = MSO_ANCHOR.MIDDLE
            p = c.text_frame.paragraphs[0]
            lines = val.split("\n")
            for li, line in enumerate(lines):
                if li: p = c.text_frame.add_paragraph()
                run = p.add_run(); run.text = line
                run.font.name = FONT; run.font.size = Pt(size - (1 if li else 0)); run.font.bold = (ri == 0) or (ci == 0 and li == 0)
                run.font.color.rgb = RGBColor(0xFF, 0xFF, 0xFF) if ri == 0 else (INK if li == 0 else SUB)
            c.fill.solid(); c.fill.fore_color.rgb = BLUE if ri == 0 else (RGBColor(0xF4, 0xF6, 0xFB) if ri % 2 else RGBColor(0xFF, 0xFF, 0xFF))
    return t

s1, s2, s3, s4 = prs.slides
# 안내 문구 제거
remove(s1, {21}); remove(s2, {21}); remove(s3, {5, 6, 8}); remove(s4, {8})
for s in (s2, s3, s4):
    for sh in s.shapes:
        if sh.has_text_frame and sh.text_frame.text.startswith(("2.", "4.", "6.")):
            sh.width = E(16)

# ---------------- 1장: AI 기술명 + 참여인력 + 문제 정의 ----------------
tb(s1, 1.36, 1.8, 16.6, 1.6, [
    ([("내 방식 QR", {"bold": True, "color": BLUE, "size": 40}), ("  생성형 AI가 키오스크 화면을 사람마다 다시 그려 주는 범용 접근성 프로필 패스", {"bold": True, "size": 30})], {"ls": 1.1}),
])
tb(s1, 1.36, 3.35, 16.4, 0.6, [("QR 하나만 보여 주면, 같은 키오스크가 큰 글씨, 쉬운 말, 소리 안내, 말로 주문하기, 낮은 버튼 위치로 바뀝니다. 기기를 바꾸지 않고 소프트웨어만 더하는 방식입니다.", {"size": 20, "color": SUB})])

head(s1, 1.36, 4.35, 8, "탐구 참여 인력")
table(s1, 1.36, 4.95, 16.4, [
    ["성명", "소속", "역할"],
    ["이강록 (대표, 1인)", "광운대학교 소프트웨어학부 인공지능전공", "문제 정의, AI 설계와 개발, 평가셋 구축, 사용자 검증, 보고서 작성"],
], [3.4, 6.0, 7.0], size=18, rowh=0.55)

head(s1, 1.36, 6.45, 8, "문제 정의")
tb(s1, 1.36, 7.05, 16.4, 6.6, [
    ([("키오스크 앞에서 멈추는 사람들. ", {"bold": True}), ("키오스크 이용자의 47%가 불편을 겪었고, 60대 이상은 53%가 조작이 어렵다고 답했습니다(한국소비자원, 2022). 55세 이상 고령층의 디지털 정보화 역량은 일반 국민의 56.2% 수준입니다(한국지능정보사회진흥원, 2025 디지털정보격차 실태조사).", {})], {"size": 19, "indent": 0.3, "space": 10}),
    ([("의무는 시작됐지만 기기 교체는 어렵습니다. ", {"bold": True}), ("2026년 1월 28일부터 장애인, 고령자가 쓸 수 있는 키오스크 설치 의무가 전면 시행됐고 위반 시 과태료는 최대 3천만 원입니다. 그러나 시각장애인용 기술을 갖춘 국내 업체는 2곳뿐이고, 교체 비용과 사후관리 비용이 소상공인에게 큰 부담입니다(뉴시스, 2026.1.27).", {})], {"size": 19, "indent": 0.3, "space": 10}),
    ([("핵심 원인은 '한 가지 화면'입니다. ", {"bold": True}), ("저시력인은 큰 글씨와 고대비, 휠체어 이용자는 아래쪽 버튼, 느린 학습자는 쉬운 말, 외국인은 모국어가 필요한데 키오스크는 모두에게 같은 화면을 보여 줍니다. 필요한 방식은 사람이 들고 다니고, 화면은 키오스크가 그 사람에 맞춰 바꾸면 됩니다.", {})], {"size": 19, "indent": 0.3, "space": 10}),
])
# 오른쪽: 바뀌기 전과 후
tb(s1, 18.3, 1.75, 7.6, 0.5, [("같은 키오스크, QR을 보여 주기 전과 후", {"bold": True, "size": 18, "align": "center"})])
pic(s1, "before_menu.png", 18.3, 2.35, h=6.5, border=True)
pic(s1, "after_item.png", 22.15, 2.35, h=6.5, border=True)
tb(s1, 18.3, 8.9, 3.65, 0.5, [("일반 화면: 작은 글씨, 영어 메뉴", {"size": 15, "color": SUB, "align": "center"})])
tb(s1, 22.15, 8.9, 3.65, 0.5, [("내 방식: 큰 글씨, AI 쉬운 말", {"size": 15, "color": BLUE, "bold": True, "align": "center"})])
pic(s1, "after_hc.png", 18.3, 9.55, h=4.3, border=True)
pic(s1, "after_low.png", 20.85, 9.55, h=4.3, border=True)
pic(s1, "profile3.png", 23.4, 9.55, h=4.3, border=True)
tb(s1, 18.3, 13.88, 7.6, 0.5, [("저시력(고대비) / 휠체어(버튼 아래) / 휴대폰 속 내 방식 QR", {"size": 14, "color": SUB, "align": "center"})])

# ---------------- 2장: 아이디어명 + 기술요약 + 구조 ----------------
tb(s2, 1.36, 1.85, 22, 0.7, [([("아이디어명  ", {"bold": True, "color": BLUE}), (R.get("idea_no", "") + "내 방식 QR : 범용 접근성 프로필 패스", {"bold": True}), ("  (AI 라이프 아이디어 챌린지 수상 후보작)", {"color": SUB, "size": 20})], {"size": 26})])
head(s2, 1.36, 2.85, 8, "기술 요약")
tb(s2, 1.36, 3.45, 21.6, 3.2, [
    ([("① ", {"bold": True, "color": BLUE}), ("사용자가 불편한 점을 고르거나 말하면 AI가 화면 설정을 만들어 QR 하나에 담고(이름, 장애 정보는 담지 않음), 키오스크는 QR을 읽는 순간 같은 메뉴를 그 사람 방식의 화면으로 다시 그립니다.", {})], {"size": 21, "space": 8}),
    ([("② ", {"bold": True, "color": BLUE}), ("생성형 AI가 메뉴 설명을 쉬운 말(2단계)과 5개 언어로 다시 쓰고, 말로 한 주문을 장바구니로 바꾸며, 모호하면 되묻고 피해야 할 재료는 먼저 알려 줍니다.", {})], {"size": 21, "space": 8}),
    ([("③ ", {"bold": True, "color": BLUE}), ("QR을 지원하지 않는 키오스크도 휴대폰으로 화면을 찍으면 비전 AI가 '지금 누를 버튼'을 찾아 사진 위에 표시하고 소리로 안내합니다.", {})], {"size": 21, "space": 8}),
])
head(s2, 1.36, 6.75, 10, "서비스 구조와 AI가 쓰이는 곳")
pic(s2, "arch.png", 1.36, 7.35, w=21.6)
tb(s2, 1.36, 13.2, 21.6, 0.5, [("사용 기술: Claude API(텍스트, 비전), 구조화 출력(도구 호출), 브라우저 음성 합성과 음성 인식, QR 생성과 인식(jsQR), Next.js 웹앱(키오스크 브라우저와 휴대폰에서 바로 실행), Vercel 배포", {"size": 16, "color": SUB})])

# ---------------- 3장: 최종목표 + 개발 내용 및 결과 ----------------
head(s3, 1.36, 1.85, 6, "최종 목표")
tb(s3, 1.36, 2.4, 22.6, 1.2, [
    "키오스크 기기를 바꾸지 않고 소프트웨어와 QR 하나로, 고령층, 장애인, 느린 학습자, 외국인이 남의 도움 없이 혼자 주문을 끝내게 합니다.",
    "사전검증 목표: AI 기능별 정확도를 평가셋으로 재고, 실제 사용자에게 일반 화면과 비교해 주문 시간, 실수, 도움 없이 끝낸 비율이 좋아지는지 확인합니다.",
], size=20)
head(s3, 1.36, 3.95, 8, "개발 내용")
tb(s3, 1.36, 4.55, 11.2, 9.2, [
    ([("내 방식 프로필과 QR  ", {"bold": True}), ("6가지 불편 유형 선택 또는 자유 발화를 AI 설정 에이전트가 10개 설정 값으로 변환. QR에는 설정 값만 30자 안팎으로 담아 작고 잘 읽히며, 휴대폰이 없는 분을 위해 지갑 카드 인쇄 지원", {})], {"size": 18, "indent": 0.3, "space": 9}),
    ([("내 방식 화면 엔진  ", {"bold": True}), ("같은 메뉴 데이터를 한 화면 한 질문 흐름으로 다시 구성. 글씨 3단계, 고대비, 버튼 아래 배치, 시간 제한 해제, 질문마다 소리 안내", {})], {"size": 18, "indent": 0.3, "space": 9}),
    ([("AI ① 쉬운 말 다시 쓰기  ", {"bold": True}), ("쉬운 정보 작성 원칙(한 문장 한 정보, 외래어 금지, 몸으로 느끼는 말)을 지시하고, 원문에 없는 사실은 쓰지 않게 한 뒤 별도 AI 검수 단계로 확인", {})], {"size": 18, "indent": 0.3, "space": 9}),
    ([("AI ② 말로 주문하는 에이전트  ", {"bold": True}), ("메뉴 목록을 주고 구조화 출력으로 담기, 빼기, 되묻기를 결정. '아아', '뜨아' 같은 줄임말, 사투리, 5개 언어 처리. AI 장애 시 규칙 기반 주문으로 자동 전환", {})], {"size": 18, "indent": 0.3, "space": 9}),
    ([("AI ③ 화면 도우미  ", {"bold": True}), ("사진과 목표를 받아 지금 누를 버튼 하나의 위치와 글자, 다음 단계, 결제 주의점을 출력하고 사진 위에 표시", {})], {"size": 18, "indent": 0.3, "space": 9}),
    ([("평가셋 직접 구축  ", {"bold": True}), ("제공 데이터가 없어, 시뮬레이터 화면에서 정답 버튼 좌표를 자동 추출하고 휴대폰 촬영 조건(기울기, 반사광, 흐림)을 합성. 주문 문장 50개는 줄임말, 사투리, 외국어, 모호한 말을 섞어 작성", {})], {"size": 18, "indent": 0.3, "space": 9}),
])
head(s3, 13.0, 3.95, 10, "검증 결과")
table(s3, 13.0, 4.55, 12.4, [
    ["검증 항목", "방법", "결과"],
    ["말로 주문 정확도", "50문장 (줄임말, 사투리,\n5개 언어, 되묻기 포함)", f"AI {r('order_ai')}\n규칙 기반 {r('order_rule')}"],
    ["화면 도우미\n버튼 찾기", "8개 화면, 24개 목표\n깨끗한 화면 / 휴대폰 사진 합성", f"적중 {r('lens_clean')} / {r('lens_photo')}\n평균 응답 {r('lens_ms')}"],
    ["쉬운 말 변환", "메뉴 18개, 어려운 말 수,\n없는 사실 지어냄 검수", f"어려운 말 {r('jargon')}\n지어낸 사실 {r('invented')}"],
    ["사용자 테스트", f"{r('ut_desc', '어르신 등 [ ]명')}, 같은 과제를\n일반 화면과 내 방식으로 비교", f"주문 시간 {r('ut_time')}\n실수 {r('ut_err')}, 도움 없이 {r('ut_alone')}"],
], [2.6, 5.0, 4.8], size=16, rowh=1.0)
tb(s3, 13.0, 9.75, 12.4, 0.9, [(R.get("result_note", "정확도 판정: 주문은 장바구니가 정답과 완전히 같을 때만 정답. 화면 도우미는 AI가 표시한 영역의 중심이 실제 버튼 안에 들어가야 적중."), {"size": 14, "color": SUB})])
pic(s3, R.get("s3_img1", "after_kind.png"), 13.0, 10.75, h=3.0, border=True)
pic(s3, R.get("s3_img2", "before_option.png"), 14.85, 10.75, h=3.0, border=True)
if os.path.exists(os.path.join(IMG, "lens_result.png")):
    pic(s3, "lens_result.png", 16.7, 10.75, h=3.0, border=True)

# ---------------- 4장: 애로점 + 기대효과 ----------------
head(s4, 1.36, 1.85, 10, "개발 과정의 어려움과 해결")
table(s4, 1.36, 2.45, 12.0, [
    ["어려움", "해결"],
    ["학습, 평가 데이터가 없음", "시뮬레이터에서 정답 버튼 좌표를 자동 추출해 평가셋 구축, 휴대폰 촬영 조건을 합성하고 실제 키오스크 사진으로 추가 확인"],
    ["AI가 메뉴에 없는 사실을\n지어낼 위험", "원문에 없는 사실 금지 규칙 + 별도 AI 검수, 메뉴 변환은 미리 만들어 검수 후 저장해 두고 사용"],
    ["AI 응답이 늦거나 끊기면\n키오스크가 멈춤", "규칙 기반 주문으로 자동 전환, 쉬운 말 변환 결과 저장(캐시)으로 즉시 표시"],
    ["장애 정보는 민감정보", "장애 유형 대신 '필요한 화면 방식'만 QR에 담음. 서버에 저장하지 않음"],
    ["기기마다 음성 인식 지원이 다름", "말하기가 안 되면 글로 쓰기, 버튼 선택으로 같은 기능 제공"],
], [3.9, 8.1], size=15, rowh=1.0)
head(s4, 14.0, 1.85, 10, "기대효과")
tb(s4, 14.0, 2.45, 11.4, 6.4, [
    ([("디지털 포용  ", {"bold": True, "color": BLUE}), ("고령층, 장애인, 느린 학습자, 외국인이 뒷사람 눈치 없이 혼자 주문. 한 번 만든 설정이 어느 매장에서든 따라감", {})], {"size": 18, "indent": 0.3, "space": 9}),
    ([("비용 없는 의무 대응  ", {"bold": True, "color": BLUE}), ("기기 교체 대신 기존 키오스크에 화면 엔진만 추가해 배리어프리 의무에 대응. 키오스크 업체에 SDK로 제공하고 매장당 월 구독으로 운영하는 사업 모델", {})], {"size": 18, "indent": 0.3, "space": 9}),
    ([("지금 바로 쓰는 도우미  ", {"bold": True, "color": BLUE}), ("QR을 지원하지 않는 키오스크도 휴대폰 화면 도우미로 즉시 사용 가능", {})], {"size": 18, "indent": 0.3, "space": 9}),
    ([("확장  ", {"bold": True, "color": BLUE}), ("같은 QR로 무인 민원발급기, 병원 접수기, 승차권 발매기, ATM까지. 지역 소상공인 매장에 우선 보급하면 지역 간 격차도 줄어듦", {})], {"size": 18, "indent": 0.3, "space": 9}),
])
head(s4, 14.0, 8.85, 10, "한계와 개선 방안", color=INK, size=21)
tb(s4, 14.0, 9.4, 11.4, 2.6, [
    ("평가는 시뮬레이터와 합성 사진 중심이라 실제 매장 시범 적용으로 다시 검증해야 합니다.", {"size": 16, "indent": 0.3, "space": 5}),
    ("사용자 테스트 인원이 적어, 장애인 단체와 함께 표본을 늘릴 계획입니다.", {"size": 16, "indent": 0.3, "space": 5}),
    ("실제 결제 단말 연동, 점자와 진동 같은 촉각 안내는 키오스크 업체와 협력해 구현해야 합니다.", {"size": 16, "indent": 0.3, "space": 5}),
])
tb(s4, 1.36, 9.0, 12.0, 4.5, [
    ("결과물 바로가기", {"bold": True, "size": 21, "color": INK}),
    ([("테스트 URL  ", {"bold": True}), (R.get("url", "[배포 후 기재]"), {"color": BLUE})], {"size": 18}),
    ([("시연 영상  ", {"bold": True}), (R.get("video", "[업로드 후 기재]"), {"color": BLUE})], {"size": 18}),
    ([("코드 저장소  ", {"bold": True}), (R.get("github", "[업로드 후 기재]"), {"color": BLUE})], {"size": 18}),
    ("체험 순서: 키오스크 체험 → 예시 프로필(어르신, 저시력, 휠체어, 외국인) 누르기 → 화면 도우미에서 예시 사진으로 안내 받기", {"size": 15, "color": SUB}),
])
prs.save(OUT)
print("saved", OUT)
