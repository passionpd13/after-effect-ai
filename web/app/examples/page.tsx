"use client";
import { useState } from "react";
import Navbar from "@/components/Navbar";
import JsonPreview from "@/components/JsonPreview";
import Timeline from "@/components/Timeline";
import { RICKSHAW_EXAMPLE } from "@/lib/default-data";
import {
  ANIMATION_LABELS,
  TRANSITION_LABELS,
  EFFECT_LABELS,
  TEXT_ANIMATION_LABELS,
} from "@/lib/schema-data";

export default function ExamplesPage() {
  const [activeScene, setActiveScene] = useState(0);
  const example = RICKSHAW_EXAMPLE;
  const scene = example.scenes[activeScene];

  return (
    <>
      <Navbar />
      <main className="pt-20 pb-8 px-4 max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold mb-2">예제: 릭샤의 진화</h1>
        <p className="text-white/50 mb-8">
          인력거에서 자전거 릭샤로의 진화를 보여주는 다큐멘터리 스타일 영상 JSON 예제입니다.
        </p>

        {/* Timeline */}
        <div className="mb-8">
          <Timeline
            scenes={example.scenes}
            activeScene={activeScene}
            onSelectScene={setActiveScene}
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Scene Detail */}
          <div className="card-glass p-6 space-y-4">
            <h2 className="text-xl font-bold">
              씬 {scene.id}: {scene.text.content || "(텍스트 없음)"}
            </h2>

            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="bg-white/5 rounded-lg p-3">
                <span className="text-white/40 text-xs block mb-1">타입</span>
                <span className="font-medium">{scene.type}</span>
              </div>
              <div className="bg-white/5 rounded-lg p-3">
                <span className="text-white/40 text-xs block mb-1">길이</span>
                <span className="font-medium">{scene.duration}초</span>
              </div>
              <div className="bg-white/5 rounded-lg p-3">
                <span className="text-white/40 text-xs block mb-1">애니메이션</span>
                <span className="font-medium">
                  {ANIMATION_LABELS[scene.animation.type]} ({scene.animation.intensity})
                </span>
              </div>
              <div className="bg-white/5 rounded-lg p-3">
                <span className="text-white/40 text-xs block mb-1">텍스트 애니메이션</span>
                <span className="font-medium">
                  {TEXT_ANIMATION_LABELS[scene.text.animation]}
                </span>
              </div>
            </div>

            {scene.effects.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold text-ae-highlight mb-2">이펙트</h3>
                <div className="flex flex-wrap gap-2">
                  {scene.effects.map((effect, i) => (
                    <span
                      key={i}
                      className="text-xs px-3 py-1.5 rounded-full bg-ae-purple/20 border border-ae-purple/30 text-ae-purple"
                    >
                      {EFFECT_LABELS[effect.type]}
                      {effect.start_time > 0 && ` (${effect.start_time}s~)`}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {scene.transition_to_next.type !== "none" && (
              <div>
                <h3 className="text-sm font-semibold text-ae-blue mb-2">다음 씬으로 전환</h3>
                <span className="text-xs px-3 py-1.5 rounded-full bg-ae-blue/20 border border-ae-blue/30 text-ae-blue">
                  {TRANSITION_LABELS[scene.transition_to_next.type]} ({scene.transition_to_next.duration}s)
                </span>
              </div>
            )}

            {scene.audio.narration && (
              <div>
                <h3 className="text-sm font-semibold text-ae-gold mb-2">나레이션</h3>
                <p className="text-sm text-white/70 bg-white/5 rounded-lg p-3">
                  {scene.audio.narration}
                </p>
              </div>
            )}

            {/* Image Info */}
            <div>
              <h3 className="text-sm font-semibold text-green-400 mb-2">이미지</h3>
              <div className="text-sm text-white/70 bg-white/5 rounded-lg p-3 space-y-1">
                <div>
                  파일: <span className="text-white">{scene.image.file}</span>
                </div>
                <div>
                  맞춤: <span className="text-white">{scene.image.fit_mode}</span>
                </div>
                <div>
                  그림자: <span className="text-white">{scene.image.shadow.enabled ? "사용" : "미사용"}</span>
                </div>
              </div>
            </div>
          </div>

          {/* JSON */}
          <div className="space-y-4">
            <h2 className="text-xl font-bold">전체 JSON</h2>
            <JsonPreview data={example} />
          </div>
        </div>

        {/* Project Info */}
        <div className="mt-8 card-glass p-6">
          <h2 className="text-xl font-bold mb-4">프로젝트 정보</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div className="bg-white/5 rounded-lg p-3">
              <span className="text-white/40 text-xs block mb-1">해상도</span>
              <span className="font-medium">{example.settings.width}x{example.settings.height}</span>
            </div>
            <div className="bg-white/5 rounded-lg p-3">
              <span className="text-white/40 text-xs block mb-1">FPS</span>
              <span className="font-medium">{example.settings.fps}</span>
            </div>
            <div className="bg-white/5 rounded-lg p-3">
              <span className="text-white/40 text-xs block mb-1">총 길이</span>
              <span className="font-medium">{example.settings.total_duration}초</span>
            </div>
            <div className="bg-white/5 rounded-lg p-3">
              <span className="text-white/40 text-xs block mb-1">출력</span>
              <span className="font-medium">{example.render.output_filename}</span>
            </div>
          </div>
        </div>
      </main>
    </>
  );
}
