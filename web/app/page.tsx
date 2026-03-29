import Link from "next/link";
import Navbar from "@/components/Navbar";
import FeatureCard from "@/components/FeatureCard";

export default function Home() {
  return (
    <>
      <Navbar />
      <main className="pt-16">
        {/* Hero */}
        <section className="relative min-h-[80vh] flex items-center justify-center overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_rgba(233,69,96,0.15)_0%,_transparent_70%)]" />
          <div className="relative z-10 max-w-4xl mx-auto px-6 text-center">
            <div className="inline-block mb-6 px-4 py-1.5 rounded-full bg-ae-highlight/10 border border-ae-highlight/30 text-ae-highlight text-sm">
              After Effects Automation v1.0
            </div>
            <h1 className="text-5xl md:text-7xl font-bold mb-6 leading-tight">
              <span className="text-gradient">스토리보드</span>에서
              <br />
              <span className="text-gradient">영상</span>까지 자동으로
            </h1>
            <p className="text-xl text-white/60 mb-10 max-w-2xl mx-auto">
              스토리보드를 분석하여 JSON을 생성하고, After Effects에서 자동으로
              애니메이션, 이펙트, 전환 효과가 적용된 영상을 만들어냅니다.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/editor" className="btn-primary text-lg px-8 py-4 inline-block text-center">
                에디터 시작하기
              </Link>
              <Link href="/docs" className="btn-secondary text-lg px-8 py-4 inline-block text-center">
                사용 방법 보기
              </Link>
            </div>
          </div>
        </section>

        {/* Workflow */}
        <section className="py-20 px-6">
          <div className="max-w-5xl mx-auto">
            <h2 className="text-3xl font-bold text-center mb-12">작업 흐름</h2>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {[
                { step: "01", title: "스토리보드 준비", desc: "이미지와 소스 파일을 준비합니다" },
                { step: "02", title: "JSON 생성", desc: "에디터에서 시각적으로 구성하거나 Claude가 자동 생성" },
                { step: "03", title: "AE 실행", desc: "ae_auto_pipeline.jsx 스크립트를 실행합니다" },
                { step: "04", title: "영상 완성", desc: "자동으로 컴포지션, 레이어, 애니메이션 생성" },
              ].map((item) => (
                <div key={item.step} className="card-glass p-6 text-center relative group">
                  <div className="text-4xl font-bold text-ae-highlight/20 mb-3">
                    {item.step}
                  </div>
                  <h3 className="font-semibold mb-2">{item.title}</h3>
                  <p className="text-sm text-white/50">{item.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Features */}
        <section className="py-20 px-6">
          <div className="max-w-6xl mx-auto">
            <h2 className="text-3xl font-bold text-center mb-4">지원 기능</h2>
            <p className="text-center text-white/50 mb-12">
              다양한 애니메이션, 전환 효과, 이펙트를 조합하여 전문적인 영상을 제작하세요
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <FeatureCard
                icon="A"
                title="애니메이션 13종"
                description="씬에 생동감을 더하는 다양한 애니메이션"
                items={[
                  "줌 인/아웃", "팬 (4방향)", "켄 번즈",
                  "회전", "플로팅", "펄스", "흔들림",
                ]}
                color="bg-ae-highlight/20"
              />
              <FeatureCard
                icon="T"
                title="전환 효과 16종"
                description="씬과 씬 사이를 자연스럽게 연결"
                items={[
                  "페이드", "크로스페이드", "모프", "슬라이드",
                  "줌", "와이프", "디졸브", "블러", "플립", "큐브",
                ]}
                color="bg-ae-purple/20"
              />
              <FeatureCard
                icon="E"
                title="이펙트 10종"
                description="시각적 품질을 한 단계 높이는 효과"
                items={[
                  "드롭 섀도우", "글로우", "블러", "비네팅",
                  "그레인", "색수차", "라이트 스윕", "렌즈 플레어",
                ]}
                color="bg-ae-blue/20"
              />
              <FeatureCard
                icon="Tx"
                title="텍스트 애니메이션 6종"
                description="텍스트를 돋보이게 하는 애니메이션"
                items={[
                  "페이드 인", "타이프라이터", "슬라이드 업/다운",
                  "바운스", "블러 인",
                ]}
                color="bg-ae-gold/20"
              />
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="py-20 px-6">
          <div className="max-w-3xl mx-auto text-center card-glass p-12">
            <h2 className="text-3xl font-bold mb-4">지금 시작하세요</h2>
            <p className="text-white/60 mb-8">
              에디터에서 직접 스토리보드를 구성하거나, 예제를 참고하여 시작해보세요.
            </p>
            <div className="flex gap-4 justify-center">
              <Link href="/editor" className="btn-primary">
                에디터 열기
              </Link>
              <Link href="/examples" className="btn-secondary">
                예제 보기
              </Link>
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer className="border-t border-white/10 py-8 px-6">
          <div className="max-w-5xl mx-auto flex justify-between items-center text-sm text-white/40">
            <span>AE Animation Studio v1.0</span>
            <span>Powered by After Effects ExtendScript</span>
          </div>
        </footer>
      </main>
    </>
  );
}
