"use client";
import { Scene, SceneEffect } from "@/lib/types";
import {
  SCENE_TYPES,
  ANIMATION_TYPES,
  ANIMATION_LABELS,
  TRANSITION_TYPES,
  TRANSITION_LABELS,
  EFFECT_TYPES,
  EFFECT_LABELS,
  TEXT_ANIMATION_TYPES,
  TEXT_ANIMATION_LABELS,
  INTENSITY_OPTIONS,
  EASING_OPTIONS,
  FIT_MODES,
  TEXT_POSITIONS,
} from "@/lib/schema-data";

interface SceneEditorProps {
  scene: Scene;
  isLast: boolean;
  onChange: (scene: Scene) => void;
  onDelete: () => void;
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-3">
      <h4 className="text-sm font-semibold text-ae-highlight uppercase tracking-wider">
        {title}
      </h4>
      {children}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <label className="text-xs text-white/50">{label}</label>
      {children}
    </div>
  );
}

export default function SceneEditor({ scene, isLast, onChange, onDelete }: SceneEditorProps) {
  const update = (partial: Partial<Scene>) => {
    onChange({ ...scene, ...partial });
  };

  const addEffect = () => {
    const newEffect: SceneEffect = {
      type: "vignette",
      params: { amount: 30 },
      start_time: 0,
    };
    update({ effects: [...scene.effects, newEffect] });
  };

  const updateEffect = (index: number, effect: SceneEffect) => {
    const effects = [...scene.effects];
    effects[index] = effect;
    update({ effects });
  };

  const removeEffect = (index: number) => {
    update({ effects: scene.effects.filter((_, i) => i !== index) });
  };

  return (
    <div className="space-y-6">
      {/* Basic Info */}
      <Section title="기본 정보">
        <div className="grid grid-cols-2 gap-3">
          <Field label="씬 타입">
            <select
              className="select-field w-full"
              value={scene.type}
              onChange={(e) => update({ type: e.target.value })}
            >
              {SCENE_TYPES.map((t) => (
                <option key={t} value={t} className="bg-ae-dark">
                  {t}
                </option>
              ))}
            </select>
          </Field>
          <Field label="길이 (초)">
            <input
              type="number"
              className="input-field w-full"
              value={scene.duration}
              min={0.5}
              max={30}
              step={0.5}
              onChange={(e) => update({ duration: parseFloat(e.target.value) || 1 })}
            />
          </Field>
        </div>
      </Section>

      {/* Image */}
      <Section title="이미지">
        <div className="grid grid-cols-2 gap-3">
          <Field label="파일명">
            <input
              className="input-field w-full"
              placeholder="image.png"
              value={scene.image.file}
              onChange={(e) =>
                update({ image: { ...scene.image, file: e.target.value } })
              }
            />
          </Field>
          <Field label="맞춤 모드">
            <select
              className="select-field w-full"
              value={scene.image.fit_mode}
              onChange={(e) =>
                update({ image: { ...scene.image, fit_mode: e.target.value } })
              }
            >
              {FIT_MODES.map((m) => (
                <option key={m} value={m} className="bg-ae-dark">{m}</option>
              ))}
            </select>
          </Field>
        </div>
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 text-sm text-white/70 cursor-pointer">
            <input
              type="checkbox"
              checked={scene.image.shadow.enabled}
              onChange={(e) =>
                update({
                  image: {
                    ...scene.image,
                    shadow: { ...scene.image.shadow, enabled: e.target.checked },
                  },
                })
              }
              className="rounded"
            />
            그림자 사용
          </label>
        </div>
      </Section>

      {/* Text */}
      <Section title="텍스트">
        <Field label="내용">
          <input
            className="input-field w-full"
            placeholder="텍스트를 입력하세요..."
            value={scene.text.content}
            onChange={(e) =>
              update({ text: { ...scene.text, content: e.target.value } })
            }
          />
        </Field>
        <div className="grid grid-cols-3 gap-3">
          <Field label="위치">
            <select
              className="select-field w-full"
              value={scene.text.position}
              onChange={(e) =>
                update({ text: { ...scene.text, position: e.target.value } })
              }
            >
              {TEXT_POSITIONS.map((p) => (
                <option key={p} value={p} className="bg-ae-dark">{p}</option>
              ))}
            </select>
          </Field>
          <Field label="애니메이션">
            <select
              className="select-field w-full"
              value={scene.text.animation}
              onChange={(e) =>
                update({ text: { ...scene.text, animation: e.target.value } })
              }
            >
              {TEXT_ANIMATION_TYPES.map((a) => (
                <option key={a} value={a} className="bg-ae-dark">
                  {TEXT_ANIMATION_LABELS[a]}
                </option>
              ))}
            </select>
          </Field>
          <Field label="딜레이 (초)">
            <input
              type="number"
              className="input-field w-full"
              value={scene.text.delay}
              min={0}
              max={10}
              step={0.1}
              onChange={(e) =>
                update({ text: { ...scene.text, delay: parseFloat(e.target.value) || 0 } })
              }
            />
          </Field>
        </div>
      </Section>

      {/* Animation */}
      <Section title="애니메이션">
        <div className="grid grid-cols-3 gap-3">
          <Field label="타입">
            <select
              className="select-field w-full"
              value={scene.animation.type}
              onChange={(e) =>
                update({ animation: { ...scene.animation, type: e.target.value } })
              }
            >
              {ANIMATION_TYPES.map((a) => (
                <option key={a} value={a} className="bg-ae-dark">
                  {ANIMATION_LABELS[a]}
                </option>
              ))}
            </select>
          </Field>
          <Field label="강도">
            <select
              className="select-field w-full"
              value={scene.animation.intensity}
              onChange={(e) =>
                update({
                  animation: { ...scene.animation, intensity: e.target.value },
                })
              }
            >
              {INTENSITY_OPTIONS.map((i) => (
                <option key={i} value={i} className="bg-ae-dark">{i}</option>
              ))}
            </select>
          </Field>
          <Field label="이징">
            <select
              className="select-field w-full"
              value={scene.animation.easing}
              onChange={(e) =>
                update({
                  animation: { ...scene.animation, easing: e.target.value },
                })
              }
            >
              {EASING_OPTIONS.map((e) => (
                <option key={e} value={e} className="bg-ae-dark">{e}</option>
              ))}
            </select>
          </Field>
        </div>
      </Section>

      {/* Effects */}
      <Section title="이펙트">
        {scene.effects.map((effect, i) => (
          <div key={i} className="bg-white/5 rounded-lg p-3 space-y-2">
            <div className="flex items-center justify-between">
              <select
                className="select-field text-sm"
                value={effect.type}
                onChange={(e) =>
                  updateEffect(i, { ...effect, type: e.target.value })
                }
              >
                {EFFECT_TYPES.map((t) => (
                  <option key={t} value={t} className="bg-ae-dark">
                    {EFFECT_LABELS[t]}
                  </option>
                ))}
              </select>
              <button
                onClick={() => removeEffect(i)}
                className="text-red-400 hover:text-red-300 text-sm px-2"
              >
                삭제
              </button>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Field label="시작 (초)">
                <input
                  type="number"
                  className="input-field w-full text-sm"
                  value={effect.start_time}
                  min={0}
                  step={0.1}
                  onChange={(e) =>
                    updateEffect(i, {
                      ...effect,
                      start_time: parseFloat(e.target.value) || 0,
                    })
                  }
                />
              </Field>
              <Field label="끝 (초, 비워두면 씬 끝)">
                <input
                  type="number"
                  className="input-field w-full text-sm"
                  value={effect.end_time ?? ""}
                  min={0}
                  step={0.1}
                  onChange={(e) => {
                    const val = e.target.value;
                    updateEffect(i, {
                      ...effect,
                      end_time: val ? parseFloat(val) : undefined,
                    });
                  }}
                />
              </Field>
            </div>
          </div>
        ))}
        <button
          onClick={addEffect}
          className="w-full py-2 border border-dashed border-white/20 rounded-lg text-sm text-white/50 hover:text-white hover:border-white/40 transition-all"
        >
          + 이펙트 추가
        </button>
      </Section>

      {/* Transition */}
      {!isLast && (
        <Section title="전환 효과">
          <div className="grid grid-cols-3 gap-3">
            <Field label="타입">
              <select
                className="select-field w-full"
                value={scene.transition_to_next.type}
                onChange={(e) =>
                  update({
                    transition_to_next: {
                      ...scene.transition_to_next,
                      type: e.target.value,
                    },
                  })
                }
              >
                {TRANSITION_TYPES.map((t) => (
                  <option key={t} value={t} className="bg-ae-dark">
                    {TRANSITION_LABELS[t]}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="길이 (초)">
              <input
                type="number"
                className="input-field w-full"
                value={scene.transition_to_next.duration}
                min={0.1}
                max={5}
                step={0.1}
                onChange={(e) =>
                  update({
                    transition_to_next: {
                      ...scene.transition_to_next,
                      duration: parseFloat(e.target.value) || 0.5,
                    },
                  })
                }
              />
            </Field>
            <Field label="이징">
              <select
                className="select-field w-full"
                value={scene.transition_to_next.easing}
                onChange={(e) =>
                  update({
                    transition_to_next: {
                      ...scene.transition_to_next,
                      easing: e.target.value,
                    },
                  })
                }
              >
                {EASING_OPTIONS.slice(0, 4).map((e) => (
                  <option key={e} value={e} className="bg-ae-dark">{e}</option>
                ))}
              </select>
            </Field>
          </div>
        </Section>
      )}

      {/* Audio */}
      <Section title="오디오">
        <Field label="나레이션 텍스트">
          <textarea
            className="input-field w-full h-20 resize-none"
            placeholder="나레이션 텍스트를 입력하세요..."
            value={scene.audio.narration}
            onChange={(e) =>
              update({ audio: { ...scene.audio, narration: e.target.value } })
            }
          />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="효과음 파일">
            <input
              className="input-field w-full"
              placeholder="sfx.mp3"
              value={scene.audio.sfx}
              onChange={(e) =>
                update({ audio: { ...scene.audio, sfx: e.target.value } })
              }
            />
          </Field>
          <Field label="효과음 볼륨">
            <input
              type="number"
              className="input-field w-full"
              value={scene.audio.sfx_volume}
              min={0}
              max={1}
              step={0.1}
              onChange={(e) =>
                update({
                  audio: {
                    ...scene.audio,
                    sfx_volume: parseFloat(e.target.value) || 1,
                  },
                })
              }
            />
          </Field>
        </div>
      </Section>

      {/* Delete */}
      <button
        onClick={onDelete}
        className="w-full py-2 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm hover:bg-red-500/20 transition-all"
      >
        이 씬 삭제
      </button>
    </div>
  );
}
