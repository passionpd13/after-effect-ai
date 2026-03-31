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

// === Character Rigging Constants ===

export const RIG_BODY_PARTS = [
  "head", "neck", "torso", "waist", "left_arm", "right_arm",
  "left_hand", "right_hand", "left_leg", "right_leg",
  "tail", "hair", "accessory", "weapon", "cape",
] as const;

export const RIG_BODY_PART_LABELS: Record<string, string> = {
  head: "머리", neck: "목", torso: "몸통", waist: "허리",
  left_arm: "왼팔", right_arm: "오른팔",
  left_hand: "왼손", right_hand: "오른손",
  left_leg: "왼다리", right_leg: "오른다리",
  tail: "꼬리", hair: "머리카락", accessory: "소품", weapon: "무기", cape: "망토",
};

export const RIG_JOINT_MOTIONS = [
  "nod", "swing", "wave", "breathe", "shake", "bob", "bend", "rotate",
] as const;

export const RIG_JOINT_MOTION_LABELS: Record<string, string> = {
  nod: "끄덕임 (상하 회전)", swing: "흔들림 (좌우 진자)", wave: "물결 (연속 파동)",
  breathe: "호흡 (미세 확대축소)", shake: "떨림 (빠른 진동)", bob: "위아래 반복",
  bend: "구부림 (CC Bend)", rotate: "회전 (앵커 기준)",
};

export const RIG_ACTION_PRESETS = [
  "idle", "talking", "waving", "walking", "scared", "angry",
  "happy", "sad", "thinking", "pointing", "running", "sleeping",
] as const;

export const RIG_ACTION_LABELS: Record<string, string> = {
  idle: "대기 (자연스러운 호흡)", talking: "대화 (고개+입)", waving: "손 흔들기",
  walking: "걷기 (팔다리 교차)", scared: "놀람/공포 (떨림)", angry: "화남 (강한 흔들림)",
  happy: "기쁨 (위아래 바운스)", sad: "슬픔 (고개 숙임)", thinking: "생각 (고개 기울임)",
  pointing: "가리키기 (한팔 뻗기)", running: "달리기 (빠른 팔다리)", sleeping: "수면 (느린 호흡)",
};

export const RIG_MODES = ["simple", "advanced", "action"] as const;

export const RIG_MODE_LABELS: Record<string, string> = {
  simple: "간단 (기본 호흡+끄덕임)", advanced: "고급 (관절별 상세 설정)", action: "액션 (프리셋 동작)",
};

// === Bone Hierarchy (DUIK-style) ===
// 부모-자식 관계 정의: 몸통 움직이면 머리/팔이 따라감
export const BONE_HIERARCHY: Record<string, string | null> = {
  hips: null,
  torso: "hips",
  chest: "torso",
  neck: "chest",
  head: "neck",
  left_arm: "chest",
  right_arm: "chest",
  left_hand: "left_arm",
  right_hand: "right_arm",
  left_leg: "hips",
  right_leg: "hips",
  tail: "hips",
  hair: "head",
  accessory: "torso",
  weapon: "right_hand",
  cape: "chest",
  waist: "hips",
};

// 퍼센트 좌표 기본값 (정면 서있는 캐릭터)
export const DEFAULT_BONE_POSITIONS: Record<string, { x: number; y: number }> = {
  head: { x: 50, y: 12 },
  neck: { x: 50, y: 20 },
  chest: { x: 50, y: 30 },
  torso: { x: 50, y: 40 },
  hips: { x: 50, y: 52 },
  waist: { x: 50, y: 48 },
  left_arm: { x: 33, y: 33 },
  right_arm: { x: 67, y: 33 },
  left_hand: { x: 28, y: 52 },
  right_hand: { x: 72, y: 52 },
  left_leg: { x: 43, y: 72 },
  right_leg: { x: 57, y: 72 },
  tail: { x: 30, y: 58 },
  hair: { x: 50, y: 8 },
  accessory: { x: 60, y: 45 },
  weapon: { x: 75, y: 48 },
  cape: { x: 50, y: 28 },
};
