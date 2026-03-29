"use client";
import { Storyboard } from "@/lib/types";
import { FORMAT_OPTIONS, FORMAT_PRESETS, COLOR_THEMES } from "@/lib/schema-data";

interface ProjectSettingsProps {
  data: Storyboard;
  onChange: (data: Storyboard) => void;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <label className="text-xs text-white/50">{label}</label>
      {children}
    </div>
  );
}

export default function ProjectSettings({ data, onChange }: ProjectSettingsProps) {
  return (
    <div className="space-y-6">
      {/* Project */}
      <div className="space-y-3">
        <h4 className="text-sm font-semibold text-ae-highlight uppercase tracking-wider">
          프로젝트
        </h4>
        <Field label="프로젝트명 (영문, 숫자, 밑줄)">
          <input
            className="input-field w-full"
            value={data.project.name}
            onChange={(e) =>
              onChange({
                ...data,
                project: { ...data.project, name: e.target.value.replace(/[^a-z0-9_]/g, "") },
              })
            }
          />
        </Field>
        <Field label="설명">
          <textarea
            className="input-field w-full h-16 resize-none"
            value={data.project.description}
            onChange={(e) =>
              onChange({
                ...data,
                project: { ...data.project, description: e.target.value },
              })
            }
          />
        </Field>
      </div>

      {/* Video Settings */}
      <div className="space-y-3">
        <h4 className="text-sm font-semibold text-ae-highlight uppercase tracking-wider">
          영상 설정
        </h4>
        <div className="grid grid-cols-2 gap-3">
          <Field label="포맷">
            <select
              className="select-field w-full"
              value={data.settings.format}
              onChange={(e) => {
                const format = e.target.value;
                const preset = FORMAT_PRESETS[format] || FORMAT_PRESETS.vertical;
                onChange({
                  ...data,
                  settings: {
                    ...data.settings,
                    format,
                    width: preset.width,
                    height: preset.height,
                  },
                });
              }}
            >
              {FORMAT_OPTIONS.map((f) => (
                <option key={f} value={f} className="bg-ae-dark">{f}</option>
              ))}
            </select>
          </Field>
          <Field label="FPS">
            <select
              className="select-field w-full"
              value={data.settings.fps}
              onChange={(e) =>
                onChange({
                  ...data,
                  settings: { ...data.settings, fps: parseInt(e.target.value) },
                })
              }
            >
              {[24, 30, 60].map((f) => (
                <option key={f} value={f} className="bg-ae-dark">{f}</option>
              ))}
            </select>
          </Field>
        </div>
        <div className="text-xs text-white/40">
          {data.settings.width} x {data.settings.height}
        </div>
      </div>

      {/* Global Style */}
      <div className="space-y-3">
        <h4 className="text-sm font-semibold text-ae-highlight uppercase tracking-wider">
          글로벌 스타일
        </h4>
        <Field label="폰트">
          <input
            className="input-field w-full"
            value={data.global_style.font_family}
            onChange={(e) =>
              onChange({
                ...data,
                global_style: { ...data.global_style, font_family: e.target.value },
              })
            }
          />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="제목 크기">
            <input
              type="number"
              className="input-field w-full"
              value={data.global_style.title_font_size}
              onChange={(e) =>
                onChange({
                  ...data,
                  global_style: {
                    ...data.global_style,
                    title_font_size: parseInt(e.target.value) || 60,
                  },
                })
              }
            />
          </Field>
          <Field label="부제목 크기">
            <input
              type="number"
              className="input-field w-full"
              value={data.global_style.subtitle_font_size}
              onChange={(e) =>
                onChange({
                  ...data,
                  global_style: {
                    ...data.global_style,
                    subtitle_font_size: parseInt(e.target.value) || 40,
                  },
                })
              }
            />
          </Field>
        </div>
        <Field label="색상 테마">
          <select
            className="select-field w-full"
            value={data.global_style.color_theme}
            onChange={(e) =>
              onChange({
                ...data,
                global_style: { ...data.global_style, color_theme: e.target.value },
              })
            }
          >
            {COLOR_THEMES.map((t) => (
              <option key={t} value={t} className="bg-ae-dark">{t}</option>
            ))}
          </select>
        </Field>
      </div>

      {/* Audio Global */}
      <div className="space-y-3">
        <h4 className="text-sm font-semibold text-ae-highlight uppercase tracking-wider">
          배경 음악
        </h4>
        <Field label="BGM 파일명">
          <input
            className="input-field w-full"
            placeholder="bgm.mp3"
            value={data.audio_global.bgm}
            onChange={(e) =>
              onChange({
                ...data,
                audio_global: { ...data.audio_global, bgm: e.target.value },
              })
            }
          />
        </Field>
        <div className="grid grid-cols-3 gap-3">
          <Field label="볼륨">
            <input
              type="number"
              className="input-field w-full"
              value={data.audio_global.bgm_volume}
              min={0}
              max={1}
              step={0.05}
              onChange={(e) =>
                onChange({
                  ...data,
                  audio_global: {
                    ...data.audio_global,
                    bgm_volume: parseFloat(e.target.value) || 0.3,
                  },
                })
              }
            />
          </Field>
          <Field label="페이드 인 (초)">
            <input
              type="number"
              className="input-field w-full"
              value={data.audio_global.bgm_fade_in}
              min={0}
              step={0.5}
              onChange={(e) =>
                onChange({
                  ...data,
                  audio_global: {
                    ...data.audio_global,
                    bgm_fade_in: parseFloat(e.target.value) || 0,
                  },
                })
              }
            />
          </Field>
          <Field label="페이드 아웃 (초)">
            <input
              type="number"
              className="input-field w-full"
              value={data.audio_global.bgm_fade_out}
              min={0}
              step={0.5}
              onChange={(e) =>
                onChange({
                  ...data,
                  audio_global: {
                    ...data.audio_global,
                    bgm_fade_out: parseFloat(e.target.value) || 0,
                  },
                })
              }
            />
          </Field>
        </div>
      </div>

      {/* Render */}
      <div className="space-y-3">
        <h4 className="text-sm font-semibold text-ae-highlight uppercase tracking-wider">
          렌더링
        </h4>
        <div className="grid grid-cols-3 gap-3">
          <Field label="포맷">
            <select
              className="select-field w-full"
              value={data.render.output_format}
              onChange={(e) =>
                onChange({
                  ...data,
                  render: { ...data.render, output_format: e.target.value },
                })
              }
            >
              {["mp4", "mov", "avi"].map((f) => (
                <option key={f} value={f} className="bg-ae-dark">{f}</option>
              ))}
            </select>
          </Field>
          <Field label="코덱">
            <select
              className="select-field w-full"
              value={data.render.codec}
              onChange={(e) =>
                onChange({
                  ...data,
                  render: { ...data.render, codec: e.target.value },
                })
              }
            >
              {["h264", "h265", "prores"].map((c) => (
                <option key={c} value={c} className="bg-ae-dark">{c}</option>
              ))}
            </select>
          </Field>
          <Field label="품질">
            <select
              className="select-field w-full"
              value={data.render.quality}
              onChange={(e) =>
                onChange({
                  ...data,
                  render: { ...data.render, quality: e.target.value },
                })
              }
            >
              {["draft", "normal", "high", "best"].map((q) => (
                <option key={q} value={q} className="bg-ae-dark">{q}</option>
              ))}
            </select>
          </Field>
        </div>
        <Field label="출력 파일명">
          <input
            className="input-field w-full"
            value={data.render.output_filename}
            onChange={(e) =>
              onChange({
                ...data,
                render: { ...data.render, output_filename: e.target.value },
              })
            }
          />
        </Field>
      </div>
    </div>
  );
}
