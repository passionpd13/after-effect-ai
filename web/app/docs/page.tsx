import Navbar from "@/components/Navbar";

export default function DocsPage() {
  return (
    <>
      <Navbar />
      <main className="pt-20 pb-8 px-4 max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">사용 가이드</h1>

        <div className="space-y-8">
          {/* Quick Start */}
          <section className="card-glass p-6 space-y-4">
            <h2 className="text-2xl font-bold text-ae-highlight">빠른 시작</h2>
            <div className="space-y-3">
              {[
                {
                  step: "1",
                  title: "스토리보드 이미지 + 소스 이미지를 폴더에 준비",
                  desc: "After Effects 프로젝트에 사용할 이미지들을 하나의 폴더에 모아둡니다.",
                },
                {
                  step: "2",
                  title: "에디터에서 JSON 생성 또는 Claude에게 요청",
                  desc: '웹 에디터에서 시각적으로 구성하거나, Claude에게 "스토리보드 분석해서 JSON 만들어줘"라고 요청합니다.',
                },
                {
                  step: "3",
                  title: "JSON 파일을 프로젝트 폴더에 저장",
                  desc: "생성된 JSON을 이미지와 같은 폴더에 저장합니다.",
                },
                {
                  step: "4",
                  title: "After Effects에서 스크립트 실행",
                  desc: "File > Scripts > Run Script File > ae_auto_pipeline.jsx 선택 > JSON 파일 선택",
                },
              ].map((item) => (
                <div key={item.step} className="flex gap-4">
                  <div className="w-8 h-8 rounded-full bg-ae-highlight/20 text-ae-highlight flex items-center justify-center flex-shrink-0 font-bold text-sm">
                    {item.step}
                  </div>
                  <div>
                    <h3 className="font-semibold">{item.title}</h3>
                    <p className="text-sm text-white/50">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Scene Types */}
          <section className="card-glass p-6 space-y-4">
            <h2 className="text-2xl font-bold text-ae-purple">씬 타입</h2>
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
            <h2 className="text-2xl font-bold text-ae-blue">애니메이션 (13종)</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
              {[
                { name: "zoom_in", label: "줌 인" },
                { name: "zoom_out", label: "줌 아웃" },
                { name: "pan_left", label: "팬 왼쪽" },
                { name: "pan_right", label: "팬 오른쪽" },
                { name: "pan_up", label: "팬 위" },
                { name: "pan_down", label: "팬 아래" },
                { name: "ken_burns", label: "켄 번즈" },
                { name: "rotate_cw", label: "시계방향 회전" },
                { name: "rotate_ccw", label: "반시계방향 회전" },
                { name: "float", label: "플로팅" },
                { name: "pulse", label: "펄스" },
                { name: "shake", label: "흔들림" },
                { name: "none", label: "없음" },
              ].map((item) => (
                <div key={item.name} className="bg-white/5 rounded-lg p-3 text-sm">
                  <code className="text-ae-blue">{item.name}</code>
                  <span className="text-white/50 ml-2">{item.label}</span>
                </div>
              ))}
            </div>
            <div className="bg-white/5 rounded-lg p-4">
              <h3 className="text-sm font-semibold mb-2">강도 설정</h3>
              <div className="flex gap-4 text-sm text-white/60">
                <span><code className="text-ae-gold">subtle</code> - 10% 변화</span>
                <span><code className="text-ae-gold">normal</code> - 20% 변화</span>
                <span><code className="text-ae-gold">strong</code> - 40% 변화</span>
              </div>
            </div>
          </section>

          {/* Transitions */}
          <section className="card-glass p-6 space-y-4">
            <h2 className="text-2xl font-bold text-green-400">전환 효과 (16종)</h2>
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
            <h2 className="text-2xl font-bold text-ae-gold">이펙트 (10종)</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {[
                { name: "drop_shadow", desc: "드롭 섀도우 - 그림자 효과" },
                { name: "glow", desc: "글로우 - 빛나는 효과" },
                { name: "blur", desc: "블러 - 흐림 효과" },
                { name: "color_correction", desc: "색 보정 - 밝기/대비/채도 조절" },
                { name: "vignette", desc: "비네팅 - 가장자리 어둡게" },
                { name: "grain", desc: "그레인 - 필름 노이즈 효과" },
                { name: "chromatic_aberration", desc: "색수차 - 색 분리 효과" },
                { name: "light_sweep", desc: "라이트 스윕 - 빛 훑기 효과" },
                { name: "particles", desc: "파티클 - 입자 효과" },
                { name: "lens_flare", desc: "렌즈 플레어 - 빛번짐 효과" },
              ].map((item) => (
                <div key={item.name} className="bg-white/5 rounded-lg p-3">
                  <code className="text-ae-gold text-sm">{item.name}</code>
                  <p className="text-xs text-white/50 mt-1">{item.desc}</p>
                </div>
              ))}
            </div>
          </section>

          {/* JSON Structure */}
          <section className="card-glass p-6 space-y-4">
            <h2 className="text-2xl font-bold text-white">JSON 구조</h2>
            <pre className="bg-white/5 rounded-lg p-4 text-xs text-white/70 overflow-x-auto">
{`{
  "project": { "name", "description", "version" },
  "settings": { "width", "height", "fps", "format" },
  "global_style": { "font_family", "title_font_size", "color_theme" },
  "scenes": [
    {
      "id": 1,
      "type": "image",
      "duration": 4,
      "image": { "file", "fit_mode", "position", "shadow" },
      "text": { "content", "position", "animation", "delay" },
      "animation": { "type", "intensity", "easing" },
      "effects": [{ "type", "params", "start_time" }],
      "transition_to_next": { "type", "duration", "easing" },
      "audio": { "sfx", "narration" }
    }
  ],
  "audio_global": { "bgm", "bgm_volume", "bgm_fade_in" },
  "render": { "output_format", "codec", "quality" }
}`}
            </pre>
          </section>

          {/* Advanced */}
          <section className="card-glass p-6 space-y-4">
            <h2 className="text-2xl font-bold text-white">고급 사용법</h2>
            <div className="space-y-3">
              <div className="bg-white/5 rounded-lg p-4">
                <h3 className="font-semibold text-ae-highlight mb-2">커맨드라인 실행</h3>
                <code className="text-xs text-white/70 block">
                  afterfx.exe -r ae_auto_pipeline.jsx
                </code>
              </div>
              <div className="bg-white/5 rounded-lg p-4">
                <h3 className="font-semibold text-ae-highlight mb-2">새 이펙트 추가 방법</h3>
                <ol className="text-sm text-white/60 space-y-1 list-decimal list-inside">
                  <li>storyboard-schema.json의 effects &gt; type enum에 추가</li>
                  <li>ae_auto_pipeline.jsx의 applyEffects() 함수에 case 추가</li>
                </ol>
              </div>
              <div className="bg-white/5 rounded-lg p-4">
                <h3 className="font-semibold text-ae-highlight mb-2">새 전환 효과 추가 방법</h3>
                <ol className="text-sm text-white/60 space-y-1 list-decimal list-inside">
                  <li>storyboard-schema.json의 transition &gt; type enum에 추가</li>
                  <li>ae_auto_pipeline.jsx의 applyTransition() 함수에 case 추가</li>
                </ol>
              </div>
            </div>
          </section>

          {/* Roadmap */}
          <section className="card-glass p-6 space-y-4">
            <h2 className="text-2xl font-bold text-white">로드맵</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-white/5 rounded-lg p-4">
                <h3 className="text-sm font-semibold text-ae-gold mb-2">v1.1</h3>
                <ul className="text-sm text-white/60 space-y-1">
                  <li>- 3D 카메라 무브먼트</li>
                  <li>- 파티클 시스템</li>
                  <li>- 프리셋 템플릿</li>
                </ul>
              </div>
              <div className="bg-white/5 rounded-lg p-4">
                <h3 className="text-sm font-semibold text-ae-gold mb-2">v2.0</h3>
                <ul className="text-sm text-white/60 space-y-1">
                  <li>- TTS 통합 (Supertone Sona 2)</li>
                  <li>- BGM 자동 선택</li>
                  <li>- 자막 자동 생성</li>
                  <li>- A/B 테스트 변형</li>
                </ul>
              </div>
            </div>
          </section>
        </div>
      </main>
    </>
  );
}
