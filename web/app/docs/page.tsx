"use client";
import Navbar from "@/components/Navbar";
import AeTutorial from "@/components/AeTutorial";

export default function DocsPage() {
  return (
    <>
      <Navbar />
      <main className="pt-20 pb-8 px-4 max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-2">사용 가이드</h1>
        <p className="text-white/50 mb-8">
          After Effects에서 스크립트를 실행하는 전체 과정을 단계별로 따라해보세요.
        </p>

        {/* ── AE Tutorial (Main) ── */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
            <span className="w-8 h-8 bg-ae-highlight rounded-lg flex items-center justify-center text-sm">AE</span>
            After Effects 실행 가이드
          </h2>
          <AeTutorial />
        </section>

        {/* ── Quick Overview ── */}
        <section className="mb-12 card-glass p-6">
          <h2 className="text-xl font-bold text-ae-highlight mb-4">전체 흐름 요약</h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {[
              { icon: "🖼️", title: "1. 이미지 준비", desc: "소스 이미지들을 폴더에 모으기" },
              { icon: "📋", title: "2. JSON 생성", desc: "에디터에서 만들거나 Claude에게 요청" },
              { icon: "▶️", title: "3. AE에서 실행", desc: "File > Scripts > Run Script File" },
              { icon: "🎬", title: "4. 영상 완성!", desc: "자동 생성 후 렌더링" },
            ].map((item) => (
              <div key={item.title} className="bg-white/5 rounded-lg p-4 text-center">
                <div className="text-2xl mb-2">{item.icon}</div>
                <div className="font-semibold text-sm">{item.title}</div>
                <div className="text-xs text-white/50 mt-1">{item.desc}</div>
              </div>
            ))}
          </div>
        </section>

        {/* ── FAQ ── */}
        <section className="mb-12 space-y-4">
          <h2 className="text-xl font-bold">자주 묻는 질문</h2>
          {[
            {
              q: "이미지 파일은 어디에 넣어야 하나요?",
              a: "JSON 파일, JSX 스크립트 파일과 같은 폴더에 넣으면 됩니다. 스크립트가 JSON이 있는 폴더에서 이미지를 자동으로 찾습니다.",
            },
            {
              q: "이미지 파일명은 어떻게 맞추나요?",
              a: 'JSON에서 "file": "my_image.png" 이라고 적었으면, 실제 파일명도 정확히 my_image.png 이어야 합니다. 대소문자도 구분합니다.',
            },
            {
              q: "JSON은 어떻게 만드나요?",
              a: "이 사이트의 에디터 페이지에서 시각적으로 만들 수 있습니다. 또는 Claude에게 스토리보드 이미지를 보여주고 JSON 생성을 요청할 수도 있습니다.",
            },
            {
              q: "ae_auto_pipeline.jsx는 어디서 받나요?",
              a: "GitHub 저장소에서 다운로드할 수 있습니다. 이 파일을 프로젝트 폴더에 복사해두세요.",
            },
            {
              q: "스크립트 실행 후 아무것도 안 생기면?",
              a: "1) JSON 파일 경로를 확인하세요. 2) 이미지 파일명이 JSON과 일치하는지 확인하세요. 3) AE 버전이 CS6 이상인지 확인하세요.",
            },
            {
              q: "영상을 어떻게 내보내나요?",
              a: "스크립트가 자동으로 렌더 큐에 추가합니다. Composition > Add to Render Queue (Ctrl+M) 후 Render 버튼을 클릭하세요.",
            },
          ].map((item) => (
            <div key={item.q} className="card-glass p-4">
              <div className="font-semibold text-sm text-ae-highlight mb-2">Q. {item.q}</div>
              <div className="text-sm text-white/60">{item.a}</div>
            </div>
          ))}
        </section>

        <div className="space-y-8">
          {/* Scene Types */}
          <section className="card-glass p-6 space-y-4">
            <h2 className="text-xl font-bold text-ae-purple">씬 타입</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {[
                { type: "image", desc: "이미지 한 장을 전체 화면으로 표시" },
                { type: "text_only", desc: "이미지 없이 텍스트만 표시" },
                { type: "split_screen", desc: "화면을 분할하여 여러 이미지 표시" },
                { type: "comparison", desc: "두 이미지를 비교 형태로 표시" },
              ].map((item) => (
                <div key={item.type} className="bg-white/5 rounded-lg p-4">
                  <code className="text-ae-highlight text-sm">{item.type}</code>
                  <p className="text-sm text-white/60 mt-1">{item.desc}</p>
                </div>
              ))}
            </div>
          </section>

          {/* Animations */}
          <section className="card-glass p-6 space-y-4">
            <h2 className="text-xl font-bold text-ae-blue">애니메이션 (13종)</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
              {[
                { name: "zoom_in", label: "줌 인", icon: "🔍" },
                { name: "zoom_out", label: "줌 아웃", icon: "🔍" },
                { name: "pan_left", label: "팬 왼쪽", icon: "⬅️" },
                { name: "pan_right", label: "팬 오른쪽", icon: "➡️" },
                { name: "pan_up", label: "팬 위", icon: "⬆️" },
                { name: "pan_down", label: "팬 아래", icon: "⬇️" },
                { name: "ken_burns", label: "켄 번즈", icon: "🎬" },
                { name: "rotate_cw", label: "시계방향 회전", icon: "🔄" },
                { name: "rotate_ccw", label: "반시계방향 회전", icon: "🔃" },
                { name: "float", label: "플로팅", icon: "🫧" },
                { name: "pulse", label: "펄스", icon: "💓" },
                { name: "shake", label: "흔들림", icon: "📳" },
                { name: "none", label: "없음", icon: "⏸️" },
              ].map((item) => (
                <div key={item.name} className="bg-white/5 rounded-lg p-3 text-sm flex items-center gap-2">
                  <span>{item.icon}</span>
                  <div>
                    <code className="text-ae-blue">{item.name}</code>
                    <span className="text-white/50 ml-1 text-xs">{item.label}</span>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Transitions */}
          <section className="card-glass p-6 space-y-4">
            <h2 className="text-xl font-bold text-green-400">전환 효과 (16종)</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {[
                "none", "cut", "fade", "crossfade", "morph",
                "slide_left", "slide_right", "slide_up", "slide_down",
                "zoom_transition", "wipe_left", "wipe_right", "wipe_circle",
                "dissolve", "blur_transition", "flip", "cube_rotate",
              ].map((t) => (
                <div key={t} className="bg-white/5 rounded-lg p-2 text-sm">
                  <code className="text-green-400">{t}</code>
                </div>
              ))}
            </div>
          </section>

          {/* Effects */}
          <section className="card-glass p-6 space-y-4">
            <h2 className="text-xl font-bold text-ae-gold">이펙트 (10종)</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {[
                { name: "drop_shadow", desc: "드롭 섀도우 - 그림자 효과", icon: "🌑" },
                { name: "glow", desc: "글로우 - 빛나는 효과", icon: "✨" },
                { name: "blur", desc: "블러 - 흐림 효과", icon: "🌫️" },
                { name: "color_correction", desc: "색 보정 - 밝기/대비/채도 조절", icon: "🎨" },
                { name: "vignette", desc: "비네팅 - 가장자리 어둡게", icon: "🔲" },
                { name: "grain", desc: "그레인 - 필름 노이즈 효과", icon: "📺" },
                { name: "chromatic_aberration", desc: "색수차 - 색 분리 효과", icon: "🌈" },
                { name: "light_sweep", desc: "라이트 스윕 - 빛 훑기 효과", icon: "💡" },
                { name: "particles", desc: "파티클 - 입자 효과", icon: "🌟" },
                { name: "lens_flare", desc: "렌즈 플레어 - 빛번짐 효과", icon: "☀️" },
              ].map((item) => (
                <div key={item.name} className="bg-white/5 rounded-lg p-3 flex items-center gap-3">
                  <span className="text-xl">{item.icon}</span>
                  <div>
                    <code className="text-ae-gold text-sm">{item.name}</code>
                    <p className="text-xs text-white/50 mt-0.5">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>
      </main>
    </>
  );
}
