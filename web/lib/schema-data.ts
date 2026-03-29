export const SCENE_TYPES = ["image", "text_only", "split_screen", "comparison"] as const;

export const ANIMATION_TYPES = [
  "none", "zoom_in", "zoom_out", "pan_left", "pan_right", "pan_up", "pan_down",
  "ken_burns", "rotate_cw", "rotate_ccw", "float", "pulse", "shake",
] as const;

export const ANIMATION_LABELS: Record<string, string> = {
  none: "없음", zoom_in: "줌 인", zoom_out: "줌 아웃",
  pan_left: "팬 왼쪽", pan_right: "팬 오른쪽", pan_up: "팬 위", pan_down: "팬 아래",
  ken_burns: "켄 번즈", rotate_cw: "시계방향 회전", rotate_ccw: "반시계방향 회전",
  float: "플로팅", pulse: "펄스", shake: "흔들림",
};

export const TRANSITION_TYPES = [
  "none", "cut", "fade", "crossfade", "morph", "slide_left", "slide_right",
  "slide_up", "slide_down", "zoom_transition", "wipe_left", "wipe_right",
  "wipe_circle", "dissolve", "blur_transition", "flip", "cube_rotate",
] as const;

export const TRANSITION_LABELS: Record<string, string> = {
  none: "없음", cut: "컷", fade: "페이드", crossfade: "크로스페이드",
  morph: "모프", slide_left: "슬라이드 왼쪽", slide_right: "슬라이드 오른쪽",
  slide_up: "슬라이드 위", slide_down: "슬라이드 아래",
  zoom_transition: "줌 전환", wipe_left: "와이프 왼쪽", wipe_right: "와이프 오른쪽",
  wipe_circle: "원형 와이프", dissolve: "디졸브", blur_transition: "블러 전환",
  flip: "플립", cube_rotate: "큐브 회전",
};

export const EFFECT_TYPES = [
  "drop_shadow", "glow", "blur", "color_correction", "vignette",
  "grain", "chromatic_aberration", "light_sweep", "particles", "lens_flare",
] as const;

export const EFFECT_LABELS: Record<string, string> = {
  drop_shadow: "드롭 섀도우", glow: "글로우", blur: "블러",
  color_correction: "색 보정", vignette: "비네팅", grain: "그레인",
  chromatic_aberration: "색수차", light_sweep: "라이트 스윕",
  particles: "파티클", lens_flare: "렌즈 플레어",
};

export const TEXT_ANIMATION_TYPES = [
  "none", "fade_in", "type_writer", "slide_up", "slide_down", "bounce", "blur_in",
] as const;

export const TEXT_ANIMATION_LABELS: Record<string, string> = {
  none: "없음", fade_in: "페이드 인", type_writer: "타이프라이터",
  slide_up: "슬라이드 업", slide_down: "슬라이드 다운",
  bounce: "바운스", blur_in: "블러 인",
};

export const INTENSITY_OPTIONS = ["subtle", "normal", "strong"] as const;
export const EASING_OPTIONS = ["linear", "ease_in", "ease_out", "ease_in_out", "overshoot"] as const;
export const FIT_MODES = ["cover", "contain", "stretch", "original"] as const;
export const TEXT_POSITIONS = ["top", "center", "bottom", "top_left", "top_right", "bottom_left", "bottom_right"] as const;
export const FORMAT_OPTIONS = ["vertical", "horizontal", "square"] as const;

export const FORMAT_PRESETS: Record<string, { width: number; height: number }> = {
  vertical: { width: 1080, height: 1920 },
  horizontal: { width: 1920, height: 1080 },
  square: { width: 1080, height: 1080 },
};

export const COLOR_THEMES = ["neutral", "warm", "cool", "dark", "bright"] as const;
