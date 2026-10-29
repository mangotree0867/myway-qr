# 성과보고서 HTML 채우기 → PDF, 쪽 이미지, PPT(양식 파일에 쪽 이미지를 넣은 판) 생성
import json, os, re, subprocess, sys
from pptx import Presentation
from pptx.util import Emu
HERE = os.path.dirname(os.path.abspath(__file__))
OUT = sys.argv[1]; TPL = sys.argv[2]
R = json.load(open(os.path.join(HERE, "results.json"))) if os.path.exists(os.path.join(HERE, "results.json")) else {}
D = {"idea_no": "", "url": "[배포 후 기재]", "video": "[업로드 후 기재]", "github": "[업로드 후 기재]",
     "ut_desc": "[사용자 테스트 후 기재]", "extra_trouble": "", "s3_images": ""}
html = open(os.path.join(HERE, "report.html"), encoding="utf-8").read()
def sub(m):
    k = m.group(1)
    return str(R.get(k, D.get(k, "[측정 중]")))
html = re.sub(r"\{\{(\w+)\}\}", sub, html)
filled = os.path.join(HERE, "_filled.html")
open(filled, "w", encoding="utf-8").write(html)
assert "·" not in html, "가운뎃점 사용 금지"
subprocess.run(["node", os.path.join(HERE, "render.js"), filled, OUT], check=True, env={**os.environ, "NODE_PATH": subprocess.check_output(["npm", "root", "-g"]).decode().strip()})
# PPT 판: 양식 파일 각 장의 내용을 지우고 같은 쪽 이미지를 꽉 차게 넣는다
prs = Presentation(TPL)
for i, s in enumerate(prs.slides):
    for sh in list(s.shapes):
        sh._element.getparent().remove(sh._element)
    s.shapes.add_picture(os.path.join(OUT, f"page-{i+1}.png"), 0, 0, prs.slide_width, prs.slide_height)
prs.save(os.path.join(OUT, "성과보고서_내방식QR.pptx"))
print("done")
