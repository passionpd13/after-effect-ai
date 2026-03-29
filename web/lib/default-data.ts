import { Storyboard, Scene } from "./types";

export function createDefaultScene(id: number): Scene {
  return {
    id,
    type: "image",
    duration: 4,
    image: {
      file: "",
      fit_mode: "contain",
      position: { x: "center", y: "center" },
      shadow: {
        enabled: false,
        color: [0, 0, 0],
        opacity: 0.5,
        distance: 10,
        softness: 15,
      },
    },
    text: {
      content: "",
      position: "top",
      animation: "fade_in",
      delay: 0,
    },
    animation: {
      type: "none",
      intensity: "normal",
      easing: "ease_in_out",
    },
    effects: [],
    transition_to_next: {
      type: "crossfade",
      duration: 1,
      easing: "ease_in_out",
    },
    audio: {
      sfx: "",
      sfx_volume: 1.0,
      narration: "",
    },
  };
}

export function createDefaultStoryboard(): Storyboard {
  return {
    project: {
      name: "my_project",
      description: "",
      created_by: "ae_animation_studio",
      version: "1.0",
    },
    settings: {
      width: 1080,
      height: 1920,
      fps: 30,
      format: "vertical",
      background_color: [0.85, 0.85, 0.85],
      total_duration: 0,
    },
    global_style: {
      font_family: "Noto Sans KR",
      title_font_size: 60,
      subtitle_font_size: 40,
      text_color: [1, 1, 1],
      text_stroke: {
        enabled: true,
        color: [0, 0, 0],
        width: 3,
      },
      color_theme: "neutral",
    },
    scenes: [createDefaultScene(1)],
    audio_global: {
      bgm: "",
      bgm_volume: 0.3,
      bgm_fade_in: 2,
      bgm_fade_out: 2,
    },
    render: {
      output_format: "mp4",
      codec: "h264",
      quality: "high",
      output_filename: "output.mp4",
    },
  };
}

export const RICKSHAW_EXAMPLE: Storyboard = {
  project: {
    name: "rickshaw_evolution",
    description: "인력거에서 자전거 릭샤로의 진화 과정을 보여주는 다큐멘터리 스타일 영상",
    created_by: "claude_analysis",
    version: "1.0",
  },
  settings: {
    width: 1080,
    height: 1920,
    fps: 30,
    format: "vertical",
    background_color: [0.12, 0.12, 0.15],
    total_duration: 12.5,
  },
  global_style: {
    font_family: "Noto Sans KR",
    title_font_size: 55,
    subtitle_font_size: 38,
    text_color: [1, 1, 1],
    text_stroke: {
      enabled: true,
      color: [0, 0, 0],
      width: 3,
    },
    color_theme: "warm",
  },
  scenes: [
    {
      id: 1,
      type: "image",
      duration: 4,
      image: {
        file: "hand_rickshaw.png",
        fit_mode: "contain",
        position: { x: "center", y: "center" },
        shadow: {
          enabled: true,
          color: [0, 0, 0],
          opacity: 0.6,
          distance: 12,
          softness: 20,
        },
      },
      text: {
        content: "인력거 (人力車)",
        position: "top",
        animation: "fade_in",
        delay: 0.5,
      },
      animation: {
        type: "zoom_in",
        intensity: "subtle",
        easing: "ease_in_out",
      },
      effects: [
        { type: "vignette", params: { amount: 30 }, start_time: 0 },
        { type: "light_sweep", params: { angle: 45, width: 100, speed: 1.5 }, start_time: 1, end_time: 2.5 },
      ],
      transition_to_next: {
        type: "morph",
        duration: 1.5,
        easing: "ease_in_out",
      },
      audio: {
        sfx: "",
        sfx_volume: 1.0,
        narration: "19세기 일본에서 시작된 인력거는 사람이 직접 끌며 승객을 운송했습니다.",
      },
    },
    {
      id: 2,
      type: "image",
      duration: 4,
      image: {
        file: "cycle_rickshaw.png",
        fit_mode: "contain",
        position: { x: "center", y: "center" },
        shadow: {
          enabled: true,
          color: [0, 0, 0],
          opacity: 0.5,
          distance: 10,
          softness: 15,
        },
      },
      text: {
        content: "자전거 릭샤",
        position: "bottom",
        animation: "slide_up",
        delay: 0.3,
      },
      animation: {
        type: "ken_burns",
        intensity: "normal",
        easing: "ease_in_out",
      },
      effects: [
        { type: "drop_shadow", params: { opacity: 0.5, direction: 135, distance: 15, softness: 10 }, start_time: 0 },
      ],
      transition_to_next: {
        type: "fade",
        duration: 1,
        easing: "ease_in_out",
      },
      audio: {
        sfx: "",
        sfx_volume: 1.0,
        narration: "자전거의 발명과 함께 릭샤는 인력에서 자전거 동력으로 진화했습니다.",
      },
    },
    {
      id: 3,
      type: "comparison",
      duration: 3,
      image: {
        file: "hand_rickshaw.png",
        fit_mode: "contain",
        position: { x: "left", y: "center" },
        shadow: { enabled: false, color: [0, 0, 0], opacity: 0.5, distance: 10, softness: 15 },
      },
      text: {
        content: "교통수단의 진화",
        position: "top",
        animation: "type_writer",
        delay: 0.2,
      },
      animation: {
        type: "none",
        intensity: "normal",
        easing: "ease_in_out",
      },
      effects: [],
      transition_to_next: {
        type: "fade",
        duration: 1.5,
        easing: "ease_out",
      },
      audio: { sfx: "", sfx_volume: 1.0, narration: "" },
    },
  ],
  audio_global: {
    bgm: "ambient_documentary.mp3",
    bgm_volume: 0.2,
    bgm_fade_in: 2,
    bgm_fade_out: 3,
  },
  render: {
    output_format: "mp4",
    codec: "h264",
    quality: "high",
    output_filename: "rickshaw_evolution_final.mp4",
  },
};
