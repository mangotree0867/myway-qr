// 시연 영상 녹화: 실제 배포된 서비스(myway-qr.vercel.app)를 그대로 조작하며 녹화한다
const { chromium } = require('playwright');
const path = require('path');
const BASE = 'https://myway-qr.vercel.app';
const OUT = process.argv[2];
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
(async () => {
  const b = await chromium.launch({ args: ['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream', '--autoplay-policy=no-user-gesture-required'] });
  const ctx = await b.newContext({ viewport: { width: 1920, height: 1080 }, recordVideo: { dir: OUT, size: { width: 1920, height: 1080 } }, permissions: ['camera', 'microphone'] });
  const p = await ctx.newPage();
  const S = (fn, ...a) => p.evaluate(([fn, a]) => window.S[fn](...a), [fn, a]);
  await p.goto('file://' + path.join(__dirname, 'stage.html'));
  const K = p.frameLocator('#kiosk');
  const P = p.frameLocator('#phone');
  const setSrc = async (id, url) => { await p.evaluate((id) => (document.getElementById(id).parentElement.style.opacity = '0.15'), id); await p.evaluate(([id, url]) => (document.getElementById(id).src = url), [id, url]); await sleep(2000); await p.evaluate((id) => (document.getElementById(id).parentElement.style.opacity = '1'), id); await sleep(300); };
  const tap = async (loc, wait = 900) => {
    const el = loc.first();
    await el.scrollIntoViewIfNeeded().catch(() => {});
    const bb = await el.boundingBox();
    if (bb) await S('tap', bb.x + bb.width / 2, bb.y + bb.height / 2);
    await sleep(280);
    await el.click();
    await sleep(wait);
  };
  const t0 = Date.now();
  const mark = (s) => console.log(((Date.now() - t0) / 1000).toFixed(1) + 's', s);

  // 1. 제목
  await S('card', `<p style="color:#ffd43b;font-weight:800">2026 AI 라이프 솔루션 챌린지</p><h1>QR 하나로,<br>어떤 키오스크든 <em>내 방식</em>으로.</h1><p>내 방식 QR : 범용 접근성 프로필 패스</p>`);
  await setSrc('kiosk', BASE + '/kiosk?timeout=0');
  await sleep(4500); mark('title');
  // 2. 문제
  await S('card', `<h1 style="font-size:70px">키오스크 앞에서 멈추는 사람들</h1><div class="stats"><div class="stat"><div class="n">53%</div><div class="t">60대 이상 이용자 중<br>조작이 어려웠다는 비율</div><div class="s">한국소비자원 (2022)</div></div><div class="stat"><div class="n">56.2</div><div class="t">일반 국민을 100으로 볼 때<br>고령층 디지털 역량</div><div class="s">한국지능정보사회진흥원 (2025)</div></div><div class="stat"><div class="n">2026.1.28</div><div class="t">접근성 키오스크<br>설치 의무 전면 시행</div><div class="s">기기 교체 비용은 소상공인 부담</div></div></div>`);
  await sleep(7500); mark('problem');
  await S('uncard'); await S('show', true, false);
  // 3. 일반 키오스크
  await S('cap', '지금의 키오스크', '모두에게 <em>똑같은</em><br>한 가지 화면', '작은 글씨, 영어 메뉴, 필수 옵션 팝업.<br>천천히 하면 시간이 초과됩니다.');
  await sleep(2500);
  await tap(K.locator('.sk-start-btns button'), 1500);
  await tap(K.locator('.sk-item:has-text("Americano")'), 1800);
  await tap(K.locator('.sk-modal-f button:has-text("주문담기")'), 2200);
  await tap(K.locator('.sk-alert button'), 600);
  await tap(K.locator('.sk-opt button:has-text("ICE")'), 500);
  await tap(K.locator('.sk-modal-f button:has-text("주문담기")'), 1800);
  await tap(K.locator('.sk-alert button'), 1200);
  await S('cap', '지금의 키오스크', '어르신에게는<br><em>어디를 눌러야 할지</em><br>보이지 않습니다', '"컵 선택은 필수 옵션입니다"<br>무엇이 잘못됐는지도 영어와 작은 글씨로 나옵니다.');
  await sleep(4000); mark('standard');
  // 4. 내 QR 만들기 (휴대폰)
  await S('show', false, true);
  await setSrc('phone', BASE + '/profile');
  await S('cap', '① 내 방식 만들기', '불편한 점을<br><em>말하면</em> 됩니다', '고르거나, 말하거나, 써도 됩니다.<br>AI가 맞는 화면 설정을 골라 줍니다.');
  await sleep(1500);
  await tap(P.locator('.pf-presets button:has-text("글씨가 작고")'), 700);
  const ta = P.locator('#free');
  await ta.scrollIntoViewIfNeeded();
  await ta.click();
  await ta.pressSequentially('눈이 침침하고 영어로 된 메뉴는 무슨 뜻인지 모르겠어요', { delay: 55 });
  await sleep(600);
  await tap(P.locator('.pf-next'), 200);
  await P.locator('.pf-ai').waitFor({ timeout: 30000 });
  const sum = await P.locator('.pf-ai').innerText();
  await S('ai', '<b>AI 설정 에이전트</b><br>' + sum.replace(/^AI:\s*/, ''));
  await sleep(4500);
  await P.locator('.pf-set').evaluate((e) => e.scrollIntoView({ behavior: 'smooth', block: 'center' }));
  await sleep(2200);
  await tap(P.locator('.pf-foot .pf-next'), 1500);
  const href = await P.locator('a.pf-next').getAttribute('href');
  const code = decodeURIComponent(href.split('d=')[1]);
  await S('cap', '① 내 방식 만들기', 'QR에는<br><em>화면 설정만</em> 담깁니다', '이름, 연락처, 장애 정보는 담지 않습니다.<br>휴대폰이 없으면 지갑 카드로 인쇄합니다.');
  await sleep(4500); mark('profile ' + code);
  // 5. 키오스크에 QR 보여 주기
  await S('show', true, true);
  await setSrc('kiosk', BASE + '/kiosk?timeout=0');
  await S('cap', '② 키오스크에 QR 보여 주기', '같은 키오스크가<br><em>내 방식</em>으로 바뀝니다', '기기를 바꾸지 않고, 소프트웨어만 더합니다.');
  await tap(K.locator('.sk-myway'), 1500);
  await S('move', -120); await sleep(1300); await S('flash');
  await setSrc('kiosk', BASE + '/kiosk?timeout=0&d=' + encodeURIComponent(code));
  await S('move', 0); await sleep(600);
  await S('show', true, false);
  await S('cap', '② 내 방식 화면', '한 화면에 <em>한 가지만</em><br>묻습니다', '큰 글씨, 쉬운 말, 질문마다 소리 안내.<br>시간 제한도 없습니다.');
  await S('ai', '🔊 "안녕하세요. 천천히 하셔도 괜찮아요. 무엇을 드시겠어요?"');
  await sleep(3500);
  await tap(K.locator('.mw-card:has-text("커피")').first(), 1800);
  await S('cap', '② AI 쉬운 말', '"에스프레소 샷에 물을 더한<br>클린한 블랙 커피"<br>→ <em>"쓴 커피에 물을 섞었어요"</em>', '생성형 AI가 메뉴 설명을 쉬운 말로 다시 씁니다.<br>(쉬운 말 2단계, 5개 언어)');
  await sleep(5500);
  await tap(K.locator('.mw-row').first(), 1400);
  await tap(K.locator('.mw-temp-ICE'), 1400);
  await tap(K.locator('.mw-card').first(), 1300);
  await tap(K.locator('.mw-primary'), 1600);
  await tap(K.locator('.mw-card-go'), 1400);
  await tap(K.locator('.mw-card').nth(1), 1600);
  await S('ai', '🔊 "주문한 것이 맞는지 봐 주세요. 아메리카노 차갑게 1잔. 모두 2,000원."');
  await sleep(2600);
  await tap(K.locator('.mw-primary'), 1600);
  await tap(K.locator('.mw-primary'), 2600);
  mark('myway order');
  // 6. 말로 주문하기
  await S('cap', '③ 말로 주문하기', '"아아 하나, 뜨아 하나,<br>치즈케이크도 주세요"', 'AI 주문 에이전트가 말을 장바구니로 바꿉니다.<br>줄임말, 사투리, 5개 언어. 평가 정확도 98%');
  await setSrc('kiosk', BASE + '/kiosk?timeout=0&d=' + encodeURIComponent(code));
  await tap(K.locator('.mw-voice'), 1200);
  const inp = K.locator('.mw-type input');
  await inp.click();
  await inp.pressSequentially('아아 하나 뜨아 하나 치즈케이크도 주세요', { delay: 60 });
  await tap(K.locator('.mw-type button'), 200);
  await K.locator('.mw-reply').waitFor({ timeout: 30000 });
  await sleep(500);
  const rep = await K.locator('.mw-reply').innerText();
  await S('ai', '<b>AI 주문 에이전트</b><br>🔊 "' + rep + '"<br><span style="font-size:18px;color:#8f9bc4">시연에서는 같은 문장을 글로 입력했습니다</span>');
  await sleep(5000); mark('voice');
  // 7. 여러 사람의 내 방식
  const views = [
    ['저시력', 'v1.3111101.9.ko.-', '검은 바탕 노란 글씨,<br><em>말로 주문</em>을 먼저'],
    ['휠체어', 'v1.2011011.9.ko.-', '버튼을 <em>화면 아래쪽</em>으로'],
    ['외국인 (베트남어)', 'v1.2011001.9.vi.-', '메뉴를 <em>모국어</em>로,<br>쉽게 다시 써서'],
  ];
  for (const [who, c, t] of views) {
    await S('cap', '④ 사람마다 다른 내 방식', t, who);
    await setSrc('kiosk', BASE + '/kiosk?timeout=0&d=' + c);
    if (who.startsWith('외국인')) { await tap(K.locator('.mw-card').first(), 2500); }
    else await sleep(2600);
  }
  await S('cap', '④ 사람마다 다른 내 방식', '피해야 할 재료는<br><em>먼저 알려 줍니다</em>', '우유를 못 드시는 분');
  await setSrc('kiosk', BASE + '/kiosk?timeout=0&d=v1.2011001.9.ko.m');
  await tap(K.locator('.mw-card').first(), 1200);
  await K.locator('.mw-row-warn').first().evaluate((e) => e.scrollIntoView({ behavior: 'smooth', block: 'center' }));
  await sleep(3500); mark('profiles');
  // 8. 화면 도우미
  await S('show', false, true);
  await setSrc('phone', BASE + '/lens');
  await S('cap', '⑤ QR이 없는 키오스크라면', '화면을 <em>찍기만</em> 하세요', '비전 AI가 지금 누를 버튼을 찾아<br>사진 위에 표시하고 소리로 알려 줍니다.');
  await tap(P.locator('.lens-samples button:has-text("결제 화면")'), 1500);
  await P.locator('.lens-goal-row input').fill('카드로 결제하고 싶어요');
  await tap(P.locator('.lens-ask'), 300);
  await P.locator('.lens-out').waitFor({ timeout: 60000 });
  await sleep(800);
  await P.locator('.lens-img').evaluate((e) => e.scrollIntoView({ behavior: 'smooth', block: 'start' }));
  await sleep(3000);
  const inst = await P.locator('.lens-inst').innerText().catch(() => '');
  await S('ai', '<b>화면 도우미</b><br>🔊 "' + inst + '"');
  await P.locator('.lens-out').evaluate((e) => e.scrollIntoView({ behavior: 'smooth', block: 'center' }));
  await sleep(5000); mark('lens');
  // 9. 결과
  await S('card', `<h1 style="font-size:66px">사전검증 결과</h1><div class="stats"><div class="stat"><div class="n">98%</div><div class="t">말로 주문 정확도</div><div class="s">50문장, 규칙 기반 56%</div></div><div class="stat"><div class="n">100%</div><div class="t">누를 버튼 적중률</div><div class="s">휴대폰 사진 조건 24건 (깨끗한 화면 87.5%)</div></div><div class="stat"><div class="n">58 → 0</div><div class="t">메뉴 속 어려운 말</div><div class="s">아주 쉬운 말 단계, 메뉴 18개</div></div></div>`);
  await sleep(7000);
  // 10. 마무리
  await S('card', `<h1 style="font-size:80px">기기는 그대로,<br><em>화면은 사람에 맞게.</em></h1><p>고령층, 장애인, 느린 학습자, 외국인이 혼자 주문하는 키오스크</p><p style="color:#ffd43b;font-weight:800;font-size:40px">myway-qr.vercel.app</p>`);
  await sleep(6500); mark('end');
  await ctx.close(); await b.close();
})();
