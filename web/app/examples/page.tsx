"use client";
import { useState } from "react";
import Navbar from "@/components/Navbar";
import ScenePreview from "@/components/ScenePreview";
import JsonPreview from "@/components/JsonPreview";
import Timeline from "@/components/Timeline";
import { RICKSHAW_EXAMPLE } from "@/lib/default-data";

export default function ExamplesPage() {
  const [activeScene, setActiveScene] = useState(0);
  const example = RICKSHAW_EXAMPLE;
  const scene = example.scenes[activeScene];

  return (
    <>
      <Navbar />
      <main className="pt-20 pb-8 px-4 max-w-[1400px] mx-auto">
        <h1 className="text-3xl font-bold mb-2">예제: 릭샤의 진화</h1>
        <p className="text-white/50 mb-8">
          인력거에서 자전거 릭샤로의 진화를 보여주는 다큐멘터리 스타일 영상 JSON 예제입니다.
          <br />
          <span className="text-white/30 text-sm">
            이 예제를 에디터에서 불러와 수정하거나, 그대로 다운로드하여 AE에서 사용할 수 있습니다.
          </span>
        </p>

        {/* Project Info Bar */}
        <div className="flex flex-wrap gap-3 mb-6">
          {[
            { label: "해상도", value: `${example.settings.width}x${example.settings.height}` },
            { label: "포맷", value: example.settings.format },
            { label: "FPS", value: String(example.settings.fps) },
            { label: "총 길이", value: `${example.settings.total_duration}초` },
            { label: "씬 수", value: `${example.scenes.length}개` },
            { label: "테마", value: example.global_style.color_theme },
            { label: "출력", value: example.render.output_filename },
          ].map((item) => (
            <div
              key={item.label}
              className="bg-white/5 border border-white/10 rounded-lg px-4 py-2"
            >
              <div className="text-[10px] text-white/40">{item.label}</div>
              <div className="text-sm font-semibold text-ae-highlight">{item.value}</div>
            </div>
          ))}
        </div>

        {/* Timeline */}
        <div className="mb-8">
          <Timeline
            scenes={example.scenes}
            activeScene={activeScene}
            onSelectScene={setActiveScene}
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Scene Visual Preview */}
          <div className="lg:col-span-4">
            <h2 className="text-lg font-bold mb-3">씬 {scene.id} 미리보기</h2>
            <ScenePreview
              scene={scene}
              isLast={activeScene === example.scenes.length - 1}
            />
          </div>

          {/* Scene Details */}
          <div className="lg:col-span-4">
            <h2 className="text-lg font-bold mb-3">씬 {scene.id} 상세 정보</h2>
            <div className="card-glass p-5 space-y-4">
              {/* Image */}
              <div>
                <div className="text-xs text-ae-highlight font-semibold uppercase tracking-wider mb-2">이미지</div>
                <div className="bg-white/5 rounded-lg p-3 space-y-1.5 text-sm">
                  <div className="flex justify-between">
                    <span className="text-white/40">파일</span>
                    <span className="font-mono text-white/80">{scene.image.file}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-white/40">맞춤</span>
                    <span className="text-white/80">{scene.image.fit_mode}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-white/40">위치</span>
                    <span className="text-white/80">{scene.image.position.x}, {scene.image.position.y}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-white/40">그림자</span>
                    <span className={scene.image.shadow.enabled ? "text-green-400" : "text-white/30"}>
                      {scene.image.shadow.enabled ? "사용" : "미사용"}
                    </span>
                  </div>
                </div>
              </div>

              {/* Text */}
              {scene.text.content && (
                <div>
                  <div className="text-xs text-yellow-400 font-semibold uppercase tracking-wider mb-2">텍스트</div>
                  <div className="bg-white/5 rounded-lg p-3 space-y-1.5 text-sm">
                    <div className="text-white/90 font-medium">&ldquo;{scene.text.content}&rdquo;</div>
                    <div className="flex justify-between text-xs">
                      <span className="text-white/40">위치: {scene.text.position}</span>
                      <span className="text-white/40">딜레이: {scene.text.delay}초</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Animation */}
              <div>
                <div className="text-xs text-blue-400 font-semibold uppercase tracking-wider mb-2">애니메이션</div>
                <div className="bg-white/5 rounded-lg p-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-white/80 font-medium">{scene.animation.type}</span>
                    <span className="text-white/40">{scene.animation.intensity} · {scene.animation.easing}</span>
                  </div>
                </div>
              </div>

              {/* Effects */}
              {scene.effects.length > 0 && (
                <div>
                  <div className="text-xs text-purple-400 font-semibold uppercase tracking-wider mb-2">
                    이펙트 ({scene.effects.length}개)
                  </div>
                  <div className="space-y-1.5">
                    {scene.effects.map((effect, i) => (
                      <div key={i} className="bg-white/5 rounded-lg p-3 text-sm">
                        <div className="font-medium text-white/80">{effect.type}</div>
                        <div className="text-xs text-white/40 mt-1">
                          {effect.start_time}초~{effect.end_time ? `${effect.end_time}초` : "끝까지"}
                          {Object.keys(effect.params).length > 0 && (
                            <span className="ml-2 font-mono">
                              {JSON.stringify(effect.params)}
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Transition */}
              {activeScene < example.scenes.length - 1 && scene.transition_to_next.type !== "none" && (
                <div>
                  <div className="text-xs text-green-400 font-semibold uppercase tracking-wider mb-2">전환</div>
                  <div className="bg-white/5 rounded-lg p-3 text-sm">
                    <span className="text-white/80 font-medium">{scene.transition_to_next.type}</span>
                    <span className="text-white/40 ml-2">{scene.transition_to_next.duration}초</span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* JSON */}
          <div className="lg:col-span-4">
            <h2 className="text-lg font-bold mb-3">전체 JSON</h2>
            <JsonPreview data={example} />
          </div>
        </div>

        {/* How to use this example */}
        <div className="mt-12 card-glass p-6">
          <h2 className="text-xl font-bold mb-4">이 예제 사용하기</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-2">
              <div className="w-10 h-10 rounded-full bg-ae-highlight/20 text-ae-highlight flex items-center justify-center font-bold">1</div>
              <h3 className="font-semibold">이미지 준비</h3>
              <p className="text-sm text-white/50">
                JSON에 명시된 이미지 파일들을 하나의 폴더에 준비합니다:
              </p>
              <div className="bg-white/5 rounded-lg p-3 font-mono text-xs text-white/60 space-y-1">
                {example.scenes.map((s) => (
                  <div key={s.id}>📁 {s.image.file}</div>
                ))}
              </div>
            </div>
            <div className="space-y-2">
              <div className="w-10 h-10 rounded-full bg-ae-highlight/20 text-ae-highlight flex items-center justify-center font-bold">2</div>
              <h3 className="font-semibold">JSON 다운로드</h3>
              <p className="text-sm text-white/50">
                위의 &ldquo;JSON 다운로드&rdquo; 버튼을 클릭하여 JSON 파일을 이미지와 같은 폴더에 저장합니다.
              </p>
              <div className="bg-white/5 rounded-lg p-3 font-mono text-xs text-white/60">
                📁 project/<br />
                ├ {example.scenes.map((s) => s.image.file).join("\n├ ")}<br />
                └ {example.render.output_filename.replace(".mp4", ".json")}
              </div>
            </div>
            <div className="space-y-2">
              <div className="w-10 h-10 rounded-full bg-ae-highlight/20 text-ae-highlight flex items-center justify-center font-bold">3</div>
              <h3 className="font-semibold">AE에서 실행</h3>
              <p className="text-sm text-white/50">
                After Effects를 열고 스크립트를 실행합니다:
              </p>
              <div className="bg-white/5 rounded-lg p-3 text-xs text-white/60 space-y-1">
                <div>1. File &gt; Scripts &gt; Run Script File</div>
                <div>2. <span className="text-ae-highlight">ae_auto_pipeline.jsx</span> 선택</div>
                <div>3. 다이얼로그에서 JSON 파일 선택</div>
                <div>4. 자동으로 영상 생성!</div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </>
  );
}
