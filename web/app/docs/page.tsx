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

        {/* ── Bone Rigging Guide ── */}
        <section className="mb-12 card-glass p-6 space-y-5">
          <h2 className="text-xl font-bold flex items-center gap-2">
            <span className="w-8 h-8 bg-green-500/20 rounded-lg flex items-center justify-center text-sm">Rig</span>
            캐릭터 본(Bone) 리깅 가이드
          </h2>

          <p className="text-sm text-white/60">
            DUIK Bassel 스타일의 본 계층 구조를 자동 생성합니다.
            각 관절은 <strong className="text-white/80">Null 레이어(뼈대)</strong>로 생성되어 부모-자식 관계로 연결됩니다.
          </p>

          {/* Architecture diagram */}
          <div>
            <h3 className="text-sm font-bold text-green-400 mb-2">시스템 아키텍처</h3>
            <div className="bg-black/30 rounded-lg p-4 font-mono text-xs leading-loose">
              <div className="text-white/40 mb-1">{`// AE 타임라인에 이렇게 생성됩니다:`}</div>
              <div className="text-yellow-400">BONE_hips <span className="text-white/20">(Null, 루트, 가이드 레이어)</span></div>
              <div className="ml-3 text-green-400">BONE_torso <span className="text-white/20">(breathe → Y축 사인파)</span></div>
              <div className="ml-6 text-green-300">BONE_chest</div>
              <div className="ml-9 text-blue-400">BONE_neck</div>
              <div className="ml-12 text-red-400">BONE_head <span className="text-white/20">(nod → 부모 회전 30% 상속)</span></div>
              <div className="ml-12 text-orange-400">BONE_hair <span className="text-white/20">(wave → 복합 사인파)</span></div>
              <div className="ml-9 text-yellow-300">BONE_left_arm <span className="text-white/20">(swing → phase 180°)</span></div>
              <div className="ml-9 text-yellow-300">BONE_right_arm <span className="text-white/20">(swing → phase 0°)</span></div>
              <div className="ml-3 text-purple-400">BONE_left_leg</div>
              <div className="ml-3 text-purple-400">BONE_right_leg</div>
              <div className="ml-3 text-pink-400">BONE_tail <span className="text-white/20">(wave → 복합 파동)</span></div>
              <div className="mt-2 text-ae-highlight">character_image.png <span className="text-white/20">(CC Bend It × N개 → 본의 rotation을 읽음)</span></div>
            </div>
          </div>

          {/* Step by step */}
          <div>
            <h3 className="text-sm font-bold text-green-400 mb-2">작동 원리</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="bg-white/5 rounded-lg p-4">
                <div className="text-green-400 font-bold text-sm mb-1">1. 본 생성</div>
                <div className="text-xs text-white/50">AI가 분석한 관절 위치(퍼센트 좌표)에 Null 레이어를 생성하고, 부모-자식 관계를 설정합니다.</div>
              </div>
              <div className="bg-white/5 rounded-lg p-4">
                <div className="text-blue-400 font-bold text-sm mb-1">2. Expression 적용</div>
                <div className="text-xs text-white/50">각 본의 Rotation/Position에 모션별 Expression을 적용합니다. 부모 본의 움직임을 30% 상속받아 자연스러운 연쇄 반응을 만듭니다.</div>
              </div>
              <div className="bg-white/5 rounded-lg p-4">
                <div className="text-purple-400 font-bold text-sm mb-1">3. CC Bend It 연동</div>
                <div className="text-xs text-white/50">이미지 레이어에 CC Bend It 이펙트를 추가하고, 본의 rotation 값을 Expression으로 읽어 이미지를 자연스럽게 변형합니다.</div>
              </div>
            </div>
          </div>

          {/* AE Manual Adjustment */}
          <div>
            <h3 className="text-sm font-bold text-blue-400 mb-2">AE에서 수동 조정하기</h3>
            <div className="space-y-2 text-xs text-white/60">
              <div className="bg-white/5 rounded-lg p-3">
                <strong className="text-white/80">본 위치 이동:</strong> BONE_xxx Null 레이어 선택 → V(Selection Tool)로 드래그 → CC Bend It도 자동으로 따라감
              </div>
              <div className="bg-white/5 rounded-lg p-3">
                <strong className="text-white/80">키프레임 직접 제작:</strong> BONE_xxx 선택 → Expression 삭제(Alt+클릭) → R(Rotation) 또는 P(Position)으로 수동 키프레임 애니메이션
              </div>
              <div className="bg-white/5 rounded-lg p-3">
                <strong className="text-white/80">CC Bend It 영역 조정:</strong> 이미지 레이어 선택 → Effects 패널에서 Rig_xxx의 Start/End 포인트를 이동하면 변형되는 영역이 바뀜
              </div>
              <div className="bg-white/5 rounded-lg p-3">
                <strong className="text-white/80">모션 강도 조절:</strong> Expression 내 amt(진폭)과 spd(속도) 숫자를 직접 수정 → 더 크게/작게, 빠르게/느리게
              </div>
            </div>
          </div>

          {/* DUIK Integration */}
          <div>
            <h3 className="text-sm font-bold text-purple-400 mb-2">DUIK Bassel/Angela 연동 (선택)</h3>
            <p className="text-xs text-white/50 mb-3">
              DUIK가 없어도 본 리깅은 정상 작동합니다. DUIK를 설치하면 IK/FK, Walk Cycle 등 고급 기능을 추가할 수 있습니다.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
              <div className="bg-green-500/5 border border-green-500/15 rounded-lg p-3">
                <div className="text-green-400 font-bold mb-1">기본 모드 (DUIK 없이)</div>
                <ul className="text-white/50 space-y-1">
                  <li>- Null 레이어 본 계층</li>
                  <li>- Expression 사인파/위글 모션</li>
                  <li>- CC Bend It 이미지 변형</li>
                  <li>- 부모-자식 모션 상속</li>
                  <li>- 플러그인 설치 불필요</li>
                </ul>
              </div>
              <div className="bg-purple-500/5 border border-purple-500/15 rounded-lg p-3">
                <div className="text-purple-400 font-bold mb-1">DUIK 모드 (설치 시)</div>
                <ul className="text-white/50 space-y-1">
                  <li>- + IK/FK 전환 (팔/다리)</li>
                  <li>- + 2-Bone IK Solver</li>
                  <li>- + Bezier IK (긴 체인)</li>
                  <li>- + Walk Cycle 자동 생성</li>
                  <li>- + 컨트롤러 조작 인터페이스</li>
                </ul>
              </div>
            </div>
            <div className="mt-3 bg-purple-500/10 border border-purple-500/20 rounded-lg p-3 text-xs text-white/50">
              <strong className="text-purple-400">DUIK 설치:</strong>{" "}
              <a href="https://rxlaboratory.org/tools/duik-angela/" target="_blank" rel="noopener noreferrer"
                 className="text-purple-400 underline hover:text-purple-300">rxlaboratory.org/tools/duik-angela</a>
              {" "}(무료) → 설치 후 JSX 실행 시 자동 감지.
              BONE_xxx Null 레이어를 선택하고 DUIK 패널에서 IK를 적용하면 손/발 컨트롤러로 관절을 조작할 수 있습니다.
            </div>
          </div>
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
