# 시뮬레이터 화면을 '휴대폰으로 찍은 사진'처럼 바꾼다 (기울기, 원근, 반사광, 흐림, 노이즈)
# 정답 박스도 같은 원근 변환으로 옮긴다.
import json, random, sys, os
import numpy as np
from PIL import Image, ImageFilter, ImageDraw, ImageEnhance
random.seed(7); np.random.seed(7)
base = sys.argv[1]
cases = json.load(open(f"{base}/cases_clean.json"))
os.makedirs(f"{base}/photo", exist_ok=True)

def homography(src, dst):
    A=[]; b=[]
    for (x,y),(u,v) in zip(src,dst):
        A.append([x,y,1,0,0,0,-u*x,-u*y]); b.append(u)
        A.append([0,0,0,x,y,1,-v*x,-v*y]); b.append(v)
    h=np.linalg.solve(np.array(A,float),np.array(b,float))
    return np.append(h,1).reshape(3,3)

def apply(H,pt):
    v=H@np.array([pt[0],pt[1],1.0]); return v[0]/v[2], v[1]/v[2]

params={}
out_cases=[]
for c in cases:
    img=c["img"]
    if img not in params:
        im=Image.open(f"{base}/clean/{img}").convert("RGB")
        w,h=im.size
        W,Hh=int(w*1.25),int(h*1.18)
        # 키오스크 베젤 + 배경
        canvas=Image.new("RGB",(W,Hh),(random.randint(40,90),)*3)
        ox,oy=(W-w)//2,(Hh-h)//2
        d=ImageDraw.Draw(canvas); d.rectangle([ox-18,oy-18,ox+w+18,oy+h+18],fill=(20,20,22))
        canvas.paste(im,(ox,oy))
        # 원근 (휴대폰을 비스듬히 든 것처럼)
        j=lambda s: random.uniform(-s,s)
        src=[(0,0),(W,0),(W,Hh),(0,Hh)]
        k=0.07
        dst=[(j(k*W)+k*W*random.random(), j(k*Hh)),(W-j(k*W)-k*W*random.random(), j(k*Hh)),(W-j(k*W), Hh-j(k*Hh)),(j(k*W), Hh-j(k*Hh))]
        Hm=homography(src,dst); Hinv=np.linalg.inv(Hm)
        coeffs=(Hinv/Hinv[2,2]).flatten()[:8]
        ph=canvas.transform((W,Hh),Image.PERSPECTIVE,tuple(coeffs),Image.BICUBIC,fillcolor=(30,30,30))
        # 반사광 + 밝기 + 흐림 + 노이즈
        glare=Image.new("L",(W,Hh),0); gd=ImageDraw.Draw(glare)
        gx,gy=random.randint(0,W),random.randint(0,Hh//2)
        gd.ellipse([gx-W//3,gy-Hh//6,gx+W//3,gy+Hh//6],fill=random.randint(50,95))
        glare=glare.filter(ImageFilter.GaussianBlur(W//10))
        ph=Image.composite(Image.new("RGB",(W,Hh),(255,255,255)),ph,glare)
        ph=ImageEnhance.Brightness(ph).enhance(random.uniform(0.8,1.05))
        ph=ph.filter(ImageFilter.GaussianBlur(random.uniform(0.6,1.4)))
        arr=np.array(ph).astype(float)+np.random.normal(0,6,(Hh,W,3))
        ph=Image.fromarray(np.clip(arr,0,255).astype("uint8"))
        # 휴대폰 사진 크기로 축소
        scale=1280/max(W,Hh)
        ph=ph.resize((int(W*scale),int(Hh*scale)))
        name=img.replace(".png",".jpg")
        ph.save(f"{base}/photo/{name}",quality=82)
        params[img]=(Hm,ox,oy,w,h,W,Hh,name)
    Hm,ox,oy,w,h,W,Hh,name=params[img]
    x0,y0,x1,y1=c["box"]
    pts=[apply(Hm,(ox+x*w,oy+y*h)) for x,y in [(x0,y0),(x1,y0),(x1,y1),(x0,y1)]]
    xs=[p[0]/W for p in pts]; ys=[p[1]/Hh for p in pts]
    out_cases.append({**c,"img":name,"box":[min(xs),min(ys),max(xs),max(ys)]})
json.dump(out_cases,open(f"{base}/cases_photo.json","w"),ensure_ascii=False,indent=1)
print(len(out_cases))
