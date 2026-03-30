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

// === Character Rigging Types ===

export interface RigJoint {
  name: string;
  part: string; // body part: head, neck, torso, left_arm, right_arm, left_hand, right_hand, left_leg, right_leg, tail, accessory
  x: number; // position in image pixels
  y: number;
  motion: string; // nod, swing, wave, breathe, shake, bob, bend, rotate
  amount: number; // 2-25 motion magnitude
  speed: number; // 0.2-3.0 cycle speed
  phase: number; // 0-360 phase offset for coordinated motion
  anchor?: { x: number; y: number }; // rotation pivot point
}

export interface RigFixedPin {
  name: string;
  x: number;
  y: number;
}

export interface RigWiggle {
  property: string; // position, rotation, scale, opacity
  frequency: number; // 0.5-5
  amount: number; // 1-15
}

export interface RigActionPose {
  name: string; // idle, talking, waving, walking, scared, angry, happy
  joints: Record<string, { amount?: number; speed?: number; phase?: number }>;
  duration?: number;
}

export interface CharacterRig {
  id: string;
  type: "puppet";
  name: string;
  image_source: { file: string; fit_mode: string };
  transform: {
    position: { x: number; y: number };
    scale: [number, number];
    opacity: number;
  };
  entrance: {
    type: string;
    delay: number;
    duration: number;
    easing: string;
  };
  // Rigging data
  rig_mode: string; // "simple" | "advanced" | "action"
  joints: RigJoint[];
  fixed_pins: RigFixedPin[];
  wiggle_elements: RigWiggle[];
  action?: string; // predefined action: idle, talking, waving, scared, etc.
  action_poses?: RigActionPose[];
  // Multi-bend zones for advanced deformation
  bend_zones?: {
    name: string;
    start: { x: number; y: number };
    end: { x: number; y: number };
    motion: string;
    amount: number;
    speed: number;
    phase: number;
  }[];
  // Expression-based coordinated motion
  expression_links?: {
    source_joint: string;
    target_joint: string;
    ratio: number; // how much target follows source
    delay: number; // time offset
  }[];
}

export interface Storyboard {
  project: Project;
  settings: Settings;
  global_style: GlobalStyle;
  scenes: Scene[];
  audio_global: AudioGlobal;
  render: RenderSettings;
}
