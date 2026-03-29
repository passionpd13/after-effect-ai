"use client";
import { Scene } from "@/lib/types";
import { TRANSITION_LABELS, ANIMATION_LABELS } from "@/lib/schema-data";

interface TimelineProps {
  scenes: Scene[];
  activeScene: number;
  onSelectScene: (index: number) => void;
}

const TYPE_COLORS: Record<string, string> = {
  image: "from-ae-blue to-blue-600",
  text_only: "from-ae-purple to-purple-600",
  split_screen: "from-ae-gold to-yellow-600",
  comparison: "from-green-500 to-emerald-600",
};

export default function Timeline({ scenes, activeScene, onSelectScene }: TimelineProps) {
  const totalDuration = scenes.reduce((sum, s) => sum + s.duration, 0);

  return (
    <div className="card-glass p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-white/80">타임라인</h3>
        <span className="text-xs text-white/50">
          총 {totalDuration.toFixed(1)}초
        </span>
      </div>
      <div className="flex gap-1 items-end h-20">
        {scenes.map((scene, i) => {
          const widthPercent = Math.max((scene.duration / Math.max(totalDuration, 1)) * 100, 8);
          return (
            <button
              key={scene.id}
              onClick={() => onSelectScene(i)}
              className={`relative rounded-lg transition-all flex flex-col items-center justify-end p-2 ${
                i === activeScene
                  ? "ring-2 ring-ae-highlight scale-105"
                  : "hover:scale-102 opacity-70 hover:opacity-100"
              }`}
              style={{ width: `${widthPercent}%`, minWidth: "60px" }}
            >
              <div
                className={`absolute inset-0 rounded-lg bg-gradient-to-b ${
                  TYPE_COLORS[scene.type] || TYPE_COLORS.image
                } opacity-30`}
              />
              <span className="relative text-[10px] text-white/60 mb-1">
                {scene.duration}s
              </span>
              <span className="relative text-xs font-medium truncate w-full text-center">
                씬 {scene.id}
              </span>
              <span className="relative text-[10px] text-white/50 truncate w-full text-center">
                {ANIMATION_LABELS[scene.animation.type] || scene.animation.type}
              </span>
              {i < scenes.length - 1 && scene.transition_to_next.type !== "none" && (
                <div className="absolute -right-3 top-1/2 -translate-y-1/2 z-10 bg-ae-dark border border-white/20 rounded px-1 py-0.5">
                  <span className="text-[8px] text-white/50">
                    {TRANSITION_LABELS[scene.transition_to_next.type]?.slice(0, 3) || "..."}
                  </span>
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
