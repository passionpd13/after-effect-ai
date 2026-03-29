export interface Project {
  name: string;
  description: string;
  created_by: string;
  version: string;
}

export interface Settings {
  width: number;
  height: number;
  fps: number;
  format: string;
  background_color: [number, number, number];
  total_duration: number;
}

export interface GlobalStyle {
  font_family: string;
  title_font_size: number;
  subtitle_font_size: number;
  text_color: [number, number, number];
  text_stroke: {
    enabled: boolean;
    color: [number, number, number];
    width: number;
  };
  color_theme: string;
}

export interface SceneImage {
  file: string;
  fit_mode: string;
  position: { x: string; y: string };
  shadow: {
    enabled: boolean;
    color: [number, number, number];
    opacity: number;
    distance: number;
    softness: number;
  };
}

export interface SceneText {
  content: string;
  position: string;
  size_override?: number;
  animation: string;
  delay: number;
}

export interface SceneAnimation {
  type: string;
  intensity: string;
  easing: string;
}

export interface SceneEffect {
  type: string;
  params: Record<string, number | string | boolean>;
  start_time: number;
  end_time?: number;
}

export interface SceneTransition {
  type: string;
  duration: number;
  easing: string;
}

export interface SceneAudio {
  sfx: string;
  sfx_volume: number;
  narration: string;
}

export interface Scene {
  id: number;
  type: string;
  duration: number;
  image: SceneImage;
  text: SceneText;
  animation: SceneAnimation;
  effects: SceneEffect[];
  transition_to_next: SceneTransition;
  audio: SceneAudio;
}

export interface AudioGlobal {
  bgm: string;
  bgm_volume: number;
  bgm_fade_in: number;
  bgm_fade_out: number;
}

export interface RenderSettings {
  output_format: string;
  codec: string;
  quality: string;
  output_filename: string;
}

export interface Storyboard {
  project: Project;
  settings: Settings;
  global_style: GlobalStyle;
  scenes: Scene[];
  audio_global: AudioGlobal;
  render: RenderSettings;
}
