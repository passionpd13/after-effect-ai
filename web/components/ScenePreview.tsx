"use client";
import { Scene } from "@/lib/types";
import {
  ANIMATION_LABELS,
  TRANSITION_LABELS,
  EFFECT_LABELS,
  TEXT_ANIMATION_LABELS,
} from "@/lib/schema-data";

interface ScenePreviewProps {
  scene: Scene;
  imageUrl?: string;
  isLast: boolean;
}

const ANIM_ICONS: Record<string, string> = {
  none: "", zoom_in: "🔍+", zoom_out: "🔍-",
  pan_left: "⬅️", pan_right: "➡️", pan_up: "⬆️", pan_down: "⬇️",
  ken_burns: "🎬", rotate_cw: "🔄", rotate_ccw: "🔃",
  float: "🫧", pulse: "💓", shake: "📳",
};

const EFFECT_ICONS: Record<string, string> = {
  drop_shadow: "🌑", glow: "✨", blur: "🌫️",
  color_correction: "🎨", vignette: "🔲", grain: "📺",
  chromatic_aberration: "🌈", light_sweep: "💡",
  particles: "🌟", lens_flare: "☀️",
};

const TRANS_ICONS: Record<string, string> = {
  none: "", cut: "✂️", fade: "🌑", crossfade: "🔀",
  morph: "🫠", slide_left: "⬅️", slide_right: "➡️",
  slide_up: "⬆️", slide_down: "⬇️", zoom_transition: "🔍",
  wipe_left: "◀️", wipe_right: "▶️", wipe_circle: "⭕",
  dissolve: "💨", blur_transition: "🌫️", flip: "🔁", cube_rotate: "🎲",
};

function getTextPositionStyle(position: string): React.CSSProperties {
  const base: React.CSSProperties = {
    position: "absolute",
    padding: "8px 16px",
    textShadow: "0 2px 8px rgba(0,0,0,0.9), 0 0 20px rgba(0,0,0,0.5)",
    maxWidth: "90%",
    textAlign: "center",
  };
  switch (position) {
    case "top": return { ...base, top: "12%", left: "50%", transform: "translateX(-50%)" };
    case "center": return { ...base, top: "50%", left: "50%", transform: "translate(-50%, -50%)" };
    case "bottom": return { ...base, bottom: "12%", left: "50%", transform: "translateX(-50%)" };
    case "top_left": return { ...base, top: "12%", left: "8%" };
    case "top_right": return { ...base, top: "12%", right: "8%" };
    case "bottom_left": return { ...base, bottom: "12%", left: "8%" };
    case "bottom_right": return { ...base, bottom: "12%", right: "8%" };
    default: return { ...base, top: "12%", left: "50%", transform: "translateX(-50%)" };
  }
}

export default function ScenePreview({ scene, imageUrl, isLast }: ScenePreviewProps) {
  const hasImage = !!imageUrl;
  const hasText = !!scene.text.content;
  const hasEffects = scene.effects.length > 0;
  const hasAnim = scene.animation.type !== "none";
  const hasTrans = scene.transition_to_next.type !== "none" && !isLast;

  return (
    <div className="space-y-3">
      {/* Visual Preview Frame */}
      <div
        className="relative rounded-xl overflow-hidden border border-white/10"
        style={{ aspectRatio: "9/16", maxHeight: "500px" }}
      >
        {/* Background */}
        {hasImage ? (
          <img
            src={imageUrl}
            alt={scene.image.file}
            className="absolute inset-0 w-full h-full"
            style={{
              objectFit: scene.image.fit_mode === "cover" ? "cover"
                : scene.image.fit_mode === "stretch" ? "fill"
                : "contain",
              objectPosition: `${scene.image.position.x} ${scene.image.position.y}`,
            }}
          />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-b from-white/5 to-white/[0.02] flex flex-col items-center justify-center">
            <div className="text-5xl mb-3 opacity-30">🖼️</div>
            <span className="text-sm text-white/30">{scene.image.file || "이미지 없음"}</span>
            <span className="text-xs text-white/20 mt-1">이미지를 업로드하세요</span>
          </div>
        )}

        {/* Vignette overlay if effect exists */}
        {scene.effects.some((e) => e.type === "vignette") && (
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              background: "radial-gradient(ellipse at center, transparent 50%, rgba(0,0,0,0.6) 100%)",
            }}
          />
        )}

        {/* Shadow overlay */}
        {scene.image.shadow.enabled && hasImage && (
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              boxShadow: "inset 0 -60px 60px -20px rgba(0,0,0,0.5)",
            }}
          />
        )}

        {/* Text overlay */}
        {hasText && (
          <div style={getTextPositionStyle(scene.text.position)}>
            <span className="text-white font-bold text-lg leading-tight">
              {scene.text.content}
            </span>
          </div>
        )}

        {/* Scene type badge */}
        <div className="absolute top-3 left-3 bg-black/60 backdrop-blur-sm px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider text-white/80">
          {scene.type}
        </div>

        {/* Duration badge */}
        <div className="absolute top-3 right-3 bg-ae-highlight/80 backdrop-blur-sm px-2.5 py-1 rounded-full text-[10px] font-bold text-white">
          {scene.duration}초
        </div>

        {/* Filename badge */}
        {scene.image.file && (
          <div className="absolute bottom-3 left-3 right-3 bg-black/50 backdrop-blur-sm px-3 py-1.5 rounded-lg text-[10px] text-white/60 truncate text-center">
            📁 {scene.image.file}
          </div>
        )}
      </div>

      {/* Info Cards below preview */}
      <div className="grid grid-cols-2 gap-2">
        {/* Animation */}
        <div className={`rounded-lg p-2.5 border ${hasAnim ? "bg-blue-500/10 border-blue-500/30" : "bg-white/5 border-white/10"}`}>
          <div className="text-[10px] text-white/40 mb-1">애니메이션</div>
          <div className="flex items-center gap-1.5">
            <span className="text-sm">{ANIM_ICONS[scene.animation.type] || "▶️"}</span>
            <div>
              <div className="text-xs font-medium text-white/90">
                {ANIMATION_LABELS[scene.animation.type]}
              </div>
              {hasAnim && (
                <div className="text-[10px] text-white/40">
                  {scene.animation.intensity} · {scene.animation.easing.replace(/_/g, " ")}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Text Animation */}
        <div className={`rounded-lg p-2.5 border ${scene.text.animation !== "none" ? "bg-yellow-500/10 border-yellow-500/30" : "bg-white/5 border-white/10"}`}>
          <div className="text-[10px] text-white/40 mb-1">텍스트 효과</div>
          <div className="text-xs font-medium text-white/90">
            {TEXT_ANIMATION_LABELS[scene.text.animation]}
          </div>
          {scene.text.delay > 0 && (
            <div className="text-[10px] text-white/40">
              {scene.text.delay}초 후 시작
            </div>
          )}
        </div>
      </div>

      {/* Effects */}
      {hasEffects && (
        <div className="rounded-lg p-2.5 bg-purple-500/10 border border-purple-500/30">
          <div className="text-[10px] text-white/40 mb-1.5">이펙트 ({scene.effects.length}개)</div>
          <div className="flex flex-wrap gap-1.5">
            {scene.effects.map((effect, i) => (
              <span
                key={i}
                className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/20"
              >
                <span>{EFFECT_ICONS[effect.type] || "⚡"}</span>
                {EFFECT_LABELS[effect.type]}
                {effect.start_time > 0 && (
                  <span className="text-purple-400/60 text-[9px]">
                    {effect.start_time}s~
                  </span>
                )}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Transition */}
      {hasTrans && (
        <div className="rounded-lg p-2.5 bg-green-500/10 border border-green-500/30">
          <div className="text-[10px] text-white/40 mb-1">다음 씬으로 전환</div>
          <div className="flex items-center gap-1.5">
            <span className="text-sm">{TRANS_ICONS[scene.transition_to_next.type] || "➡️"}</span>
            <span className="text-xs font-medium text-white/90">
              {TRANSITION_LABELS[scene.transition_to_next.type]}
            </span>
            <span className="text-[10px] text-white/40">
              ({scene.transition_to_next.duration}초)
            </span>
          </div>
        </div>
      )}

      {/* Narration */}
      {scene.audio.narration && (
        <div className="rounded-lg p-2.5 bg-orange-500/10 border border-orange-500/30">
          <div className="text-[10px] text-white/40 mb-1">🎙️ 나레이션</div>
          <p className="text-xs text-white/70 leading-relaxed">{scene.audio.narration}</p>
        </div>
      )}
    </div>
  );
}
