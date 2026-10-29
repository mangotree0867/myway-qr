const { chromium } = require('playwright');
const path = require('path');
(async () => {
  const [filled, out] = process.argv.slice(2);
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1.5 });
  await p.goto('file://' + filled, { waitUntil: 'networkidle' });
  await p.evaluate(() => document.fonts.ready);
  await p.pdf({ path: path.join(out, '성과보고서_내방식QR.pdf'), width: '1920px', height: '1080px', printBackground: true });
  const pages = await p.locator('section.page').all();
  for (let i = 0; i < pages.length; i++) await pages[i].screenshot({ path: path.join(out, `page-${i + 1}.png`) });
  // 넘침 검사: 각 쪽 .body 내용이 영역을 넘는지
  const over = await p.evaluate(() => [...document.querySelectorAll('section.page .body')].map((b, i) => ({ page: i + 1, over: b.scrollHeight - b.clientHeight })));
  console.log(JSON.stringify(over));
  await b.close();
})();
