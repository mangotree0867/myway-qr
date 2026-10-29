import Link from "next/link";

export default function Home() {
  return (
    <main className="home">
      <header className="home-top">
        <span className="home-logo">내 방식 QR</span>
        <nav>
          <Link href="/kiosk">체험</Link>
          <Link href="/lens">화면 도우미</Link>
        </nav>
      </header>

      <section className="hero">
        <p className="hero-kicker">범용 접근성 프로필 패스</p>
        <h1>
          QR 하나로,
          <br />
          어떤 키오스크든 <em>내 방식</em>으로.
        </h1>
        <p className="hero-sub">큰 글씨, 쉬운 말, 소리 안내, 말로 주문하기. 한 번 설정해 두면 어느 매장에서든 QR만 보여 주면 됩니다. 화면을 다시 쓰는 일은 생성형 AI가 합니다.</p>
        <div className="hero-cta">
          <Link href="/profile" className="btn-pri">
            내 QR 만들기
          </Link>
          <Link href="/kiosk" className="btn-sec">
            키오스크 체험하기
          </Link>
        </div>
      </section>

      <section className="how">
        <h2>이렇게 써요</h2>
        <ol className="how-steps">
          <li>
            <span className="how-n">1</span>
            <b>불편한 점을 말하기</b>
            <p>&ldquo;글씨가 안 보이고 영어가 어려워요&rdquo;라고 말하면 AI가 맞는 설정을 골라 QR로 만들어 줘요. 이름이나 장애 정보는 담지 않아요.</p>
          </li>
          <li>
            <span className="how-n">2</span>
            <b>키오스크에 QR 보여 주기</b>
            <p>휴대폰이나 인쇄한 지갑 카드를 QR 리더에 대면, 같은 키오스크가 한 화면에 한 가지씩 묻는 내 방식 화면으로 바뀌어요.</p>
          </li>
          <li>
            <span className="how-n">3</span>
            <b>쉬운 말로, 말로 주문</b>
            <p>AI가 메뉴 설명을 쉬운 말이나 모국어로 다시 쓰고, &ldquo;따뜻한 커피 두 잔&rdquo;처럼 말하면 알아서 담아 줘요.</p>
          </li>
        </ol>
      </section>

      <section className="modes">
        <Link href="/kiosk" className="mode">
          <b>키오스크 체험</b>
          <p>일반 키오스크와 내 방식 화면을 바로 비교해 보세요.</p>
          <span>열기 →</span>
        </Link>
        <Link href="/lens" className="mode">
          <b>화면 도우미</b>
          <p>QR을 지원하지 않는 키오스크도 괜찮아요. 화면을 찍으면 AI가 누를 곳을 표시해 줘요.</p>
          <span>열기 →</span>
        </Link>
        <Link href="/profile" className="mode">
          <b>내 QR 만들기</b>
          <p>1분이면 돼요. 휴대폰에 저장하거나 카드로 인쇄할 수 있어요.</p>
          <span>열기 →</span>
        </Link>
      </section>

      <section className="ai">
        <h2>AI가 하는 일</h2>
        <div className="ai-grid">
          <div>
            <b>쉬운 말 다시 쓰기</b>
            <p>&ldquo;에스프레소 샷에 물을 더한 클린한 블랙 커피&rdquo; → &ldquo;우유 없는 쓴 커피예요&rdquo;. 쉬운 정보 작성 원칙에 맞춰 단계별로, 5개 언어로.</p>
          </div>
          <div>
            <b>말로 주문하는 에이전트</b>
            <p>자연스러운 말을 메뉴, 온도, 크기, 수량으로 바꿔 장바구니에 담고, 피해야 할 재료가 있으면 먼저 알려 줘요.</p>
          </div>
          <div>
            <b>화면 읽고 안내하기</b>
            <p>처음 보는 키오스크 사진에서 목표까지 &lsquo;지금 누를 버튼&rsquo;을 찾아 위치를 표시하고 소리로 알려 줘요.</p>
          </div>
          <div>
            <b>말로 설정 만들기</b>
            <p>불편한 점을 자유롭게 말하면 글씨 크기, 대비, 말 수준, 버튼 위치 같은 설정으로 바꿔 줘요.</p>
          </div>
        </div>
      </section>

      <footer className="home-foot">
        <p>2026 AI 라이프 솔루션 챌린지 출품작</p>
        <p>AI 라이프 아이디어 챌린지 수상 후보작 &lsquo;내 방식 QR: 범용 접근성 프로필 패스&rsquo;를 구현했습니다.</p>
        <p>
          <Link href="/test">사용자 테스트 기록</Link>
        </p>
      </footer>
    </main>
  );
}
