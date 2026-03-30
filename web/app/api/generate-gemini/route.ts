import { NextRequest, NextResponse } from "next/server";

const ANIMATE_SYSTEM_PROMPT = `당신은 캐릭터 리깅/애니메이션 전문가입니다. After Effects에서 캐릭터 이미지의 관절을 분석하여 **매우 미세하고 자연스러운** 움직임을 부여하는 JSON을 생성합니다.

=== 핵심 원칙 ===
★★★ 가장 중요: 움직임은 **극도로 미세**해야 합니다! ★★★
- 이것은 "살아있는 일러스트"입니다. 화려한 애니메이션이 아닙니다!
- 원본 그림이 거의 그대로 보이면서 숨쉬는 듯, 살짝 움직이는 느낌
- 과한 움직임 = 이미지 왜곡 = 실패
- 텍스트/도형 레이어 금지. 오직 캐릭터 이미지 + 미세한 관절 리깅만

=== 리깅 시스템 구조 ===
캐릭터의 각 신체 부위를 **관절(joint)**로 정의하고, 관절별로 독립적인 모션을 부여합니다.

JSX가 joints를 분석하여 자동 적용합니다:
- breathe → Scale 사인파 (미세한 호흡)
- nod → Rotation 사인파 (부드러운 끄덕임)
- swing/sway → Position 사인파 + CC Bend It (미세한 흔들림)
- wave/bend → CC Bend It (부위별 미세 구부림)
- bob → Position Y 사인파 (미세한 위아래)
- shake → Wiggle (떨림 - scared/angry 전용)

=== 이미지 분석 방법 ===
캐릭터 이미지를 분석하여 다음 부위를 식별하세요:

| 신체 부위 | part 값 | 추천 motion | amount | speed | 설명 |
|-----------|---------|------------|--------|-------|------|
| 머리 | head | nod | 2~4 | 0.3~0.5 | 미세한 끄덕임. 대화 시 약간 더 |
| 몸통 | torso | breathe | 1~3 | 0.25~0.4 | 호흡. 매우 느리고 미세하게 |
| 팔 | left_arm/right_arm | swing | 3~6 | 0.3~0.5 | CC Bend It 미세 흔들림 |
| 손 | left_hand/right_hand | wave | 2~5 | 0.4~0.6 | 손목 미세 움직임 |
| 꼬리 | tail | wave | 3~8 | 0.4~0.7 | 물결. 가장 활발한 부위 |
| 소품/나무/표지판 | accessory | wave | 1~3 | 0.2~0.4 | 바람에 미세하게 |

=== amount 가이드 (매우 중요!) ===
★ amount는 작을수록 자연스럽습니다! 항상 최소값에 가깝게 설정하세요!
- 호흡(breathe): 1~3 (거의 안 보일 정도)
- 끄덕임(nod): 2~4 (고개가 살짝 움직이는 정도)
- 팔 흔들림(swing): 3~6 (팔이 미세하게 흔들리는 정도)
- 꼬리/머리카락(wave): 3~8 (가장 눈에 띄어도 되는 부위)
- 떨림(shake): 2~4 (전체 이미지가 왜곡되면 안 됨)
- 과한 amount = 이미지 왜곡 = 부자연스러움!

=== speed 가이드 ===
★ 느릴수록 자연스럽습니다!
- 호흡: 0.25~0.4 (4~3초에 1번 호흡)
- 끄덕임: 0.3~0.6
- 꼬리: 0.4~0.8
- 절대 1.0 이상 사용하지 마세요 (scared/shake 제외)

=== 위상(phase) 동기화 ===
- 왼팔: 0° → 오른팔: 180° (교차)
- 머리와 몸통: 60~90° 차이
- 꼬리: 30~60° 씩 증가 (파동)

=== 값 범위 (매우 중요!) ===
joint.amount: 1 ~ 8 (★ 대부분 2~5가 적절! 8 초과 절대 금지!)
joint.speed: 0.2 ~ 0.8 (★ 대부분 0.3~0.5가 적절!)
joint.phase: 0 ~ 360 (위상 오프셋)
★ wiggle_elements, expression_links, bend_zones는 사용하지 마세요! joints만 사용!

=== JSON 구조 ===
{
  "project": {
    "name": "영문소문자_밑줄만",
    "description": "한국어 설명",
    "style_preset": "cinematic",
    "version": "2.0"
  },
  "settings": {
    "width": 1920,
    "height": 1080,
    "fps": 30,
    "format": "horizontal",
    "total_duration": 30,
    "background": {
      "type": "solid",
      "color": [1.0, 1.0, 1.0]
    }
  },
  "global_style": { "font_family": "NotoSansKR" },
  "scenes": [
    {
      "id": 1,
      "duration": 10,
      "description": "씬 설명 - 캐릭터의 감정/행동 묘사",
      "layers": [
        {
          "id": "char_1",
          "type": "puppet",
          "name": "캐릭터 이름",
          "image_source": { "file": "실제파일명.확장자", "fit_mode": "cover" },
          "transform": { "position": {"x": 960, "y": 540}, "scale": [100, 100], "opacity": 100 },
          "joints": [
            { "name": "head", "part": "head", "x": 540, "y": 120, "motion": "nod", "amount": 3, "speed": 0.35, "phase": 90 },
            { "name": "body", "part": "torso", "x": 540, "y": 350, "motion": "breathe", "amount": 2, "speed": 0.3, "phase": 0 },
            { "name": "right_arm", "part": "right_arm", "x": 700, "y": 300, "motion": "swing", "amount": 4, "speed": 0.4, "phase": 0 },
            { "name": "left_arm", "part": "left_arm", "x": 380, "y": 300, "motion": "swing", "amount": 4, "speed": 0.4, "phase": 180 },
            { "name": "tail", "part": "tail", "x": 350, "y": 500, "motion": "wave", "amount": 5, "speed": 0.5, "phase": 0 }
          ],
          "fixed_pins": [
            { "name": "feet_left", "x": 480, "y": 700 },
            { "name": "feet_right", "x": 600, "y": 700 }
          ]
        }
      ],
      "transition_to_next": { "type": "crossfade", "duration": 0.5 }
    }
  ],
  "audio_global": { "bgm": "", "bgm_volume": 0.3 },
  "render": { "output_format": "mp4", "codec": "h264", "quality": "high", "output_filename": "output.mp4" }
}

=== 이미지 표시 규칙 (필수!) ===
- **fit_mode: "cover" 필수!** 원본 이미지가 화면을 꽉 채워야 합니다
- 원본 이미지(배경+캐릭터 모두)가 그대로 보여야 합니다. 이미지가 안 보이면 실패입니다!
- transform.position: 반드시 컴포지션 중앙 {"x": 너비/2, "y": 높이/2}
- transform.scale: [100, 100] (cover 스케일링은 JSX가 자동 처리)
- opacity: 100 (완전 불투명)

=== 관절 좌표 규칙 ===
- x, y는 컴포지션 크기 기준의 픽셀 좌표 (이미지가 cover로 화면을 채운 상태에서의 위치)
- 가로형(1920x1080): x는 0~1920, y는 0~1080
- 세로형(1080x1920): x는 0~1080, y는 0~1920
- 고정 핀(fixed_pins)은 반드시 지정! (발, 바닥 접점) → 없으면 전체가 흔들림
- 관절(joints)은 이미지당 6~15개 정도가 이상적
- 각 관절마다 part, motion, amount, speed, phase를 다르게 설정 (자연스러운 동작)
- **phase가 핵심!** 좌우 대칭 부위는 180° 차이, 연결 부위는 30~90° 차이

=== 씬 규칙 ===
- 이미지 1장 = 씬 1개 (각 씬에 puppet 레이어 1개만)
- 씬에 텍스트나 도형 추가하지 마세요!
- 각 씬의 layers 배열에는 해당 이미지의 puppet 레이어만 넣으세요
- transition_to_next: crossfade (duration 0.5) 사용
- 모든 scenes의 duration 합 = settings.total_duration
- entrance 사용 금지! (이미지를 즉시 표시해야 합니다)

=== 이미지 분석 시 주의사항 ===
1. 캐릭터의 포즈/자세를 정확히 파악하세요 (정면, 측면, 앉은 자세 등)
2. 보이지 않는 부위는 관절을 만들지 마세요 (뒤돌아 있으면 얼굴 관절 불필요)
3. 캐릭터의 감정/상황을 파악하여 적절한 action 또는 모션 강도를 설정하세요
4. 여러 캐릭터가 한 이미지에 있으면 가장 주요한 캐릭터 기준으로 리깅하세요
5. 소품(총, 칼, 가방 등)도 별도 관절로 설정하면 생동감이 올라갑니다

=== 중요 ===
- image_source.file은 반드시 제공된 파일 목록의 실제 파일명 그대로 사용 (확장자 포함)
- 존재하지 않는 파일명 생성 금지, .png 임의 변환 금지
- JSON만 출력 (설명 텍스트 절대 포함 금지)
- $schema, definitions, properties 등 스키마 키워드 포함 금지`;

const SYSTEM_PROMPT = `당신은 모션그래픽 전문가입니다. After Effects용 JSON을 생성합니다.

=== 값 범위 규칙 (반드시 지켜야 함!) ===

모든 색상(color): [R, G, B] 형태, 각 값은 0.0~1.0 범위의 소수
  올바른 예: [1.0, 0.0, 0.0] (빨강), [0.0, 0.0, 0.0] (검정), [1.0, 1.0, 1.0] (흰색)
  잘못된 예: [255, 0, 0], [10, 10, 20] ← 절대 금지!

position.x: 0 ~ settings.width (세로: 0~1080, 가로: 0~1920)
position.y: 0 ~ settings.height (세로: 0~1920, 가로: 0~1080)
z_position: -2000 ~ 2000 (음수=뒤, 양수=앞)

scale: [너비%, 높이%] 예: [100, 100]=원본, [50, 50]=절반, [150, 150]=1.5배
opacity: 0 ~ 100 (0=투명, 100=불투명)
rotation: 0 ~ 360 (도)

entrance.delay: 0.0 ~ 5.0 (초)
entrance.duration: 0.3 ~ 2.0 (초)
scene.duration: 3.0 ~ 20.0 (초)
transition.duration: 0.5 ~ 2.0 (초)

font_size: 24 ~ 120 (픽셀)
font_weight: "bold" | "black" 중 하나만 (regular 사용 금지!)
stroke.width: 1 ~ 10

effects.params 값 범위:
  blur.amount: 1 ~ 30
  glow.radius: 5 ~ 50, glow.intensity: 0.1 ~ 1.0
  drop_shadow.distance: 5 ~ 30, drop_shadow.softness: 5 ~ 30
  vignette.amount: 10 ~ 60
  light_sweep.angle: 0 ~ 360, light_sweep.speed: 0.5 ~ 3.0

=== 허용되는 enum 값 (이것만 사용!) ===

type (레이어): "image" | "text" | "shape" | "puppet"
fit_mode: "cover" | "contain"
shape_type: "arrow" | "line" | "circle" | "rectangle"
alignment: "left" | "center" | "right"

entrance.type: "none" | "fade_in" | "scale_up" | "pop" | "bounce_in" | "slide_from_left" | "slide_from_right" | "slide_from_top" | "slide_from_bottom" | "wipe_in" | "typewriter"
entrance.easing: "ease_out" | "ease_in" | "ease_in_out"

animation.type: "none" | "float" | "pulse" | "shake" | "bob" | "sway" | "zoom_in" | "zoom_out" | "ken_burns" | "pan_left" | "pan_right"
animation.intensity: "subtle" | "normal" | "strong"

transition.type: "none" | "cut" | "fade" | "crossfade" | "morph" | "slide_left" | "slide_right" | "slide_up" | "slide_down" | "whip_pan" | "dissolve"

effects.type: "drop_shadow" | "glow" | "blur" | "vignette" | "grain" | "light_sweep" | "lens_flare"

camera.type: "static" | "zoom_through" | "orbit" | "dolly" | "crane" | "parallax_scroll"

puppet pin.motion: "nod" | "swing" | "wave" | "breathe" | "shake" | "bob" | "bend"
puppet pin.amount: 2 ~ 20 (px, 움직임 크기)
puppet pin.speed: 0.3 ~ 2.0 (반복 속도)
puppet wiggle.frequency: 1 ~ 5 (초당 진동 횟수)
puppet wiggle.amount: 1 ~ 10 (px)

style_preset: "cinematic" | "news" | "documentary" | "bold" | "minimal" | "epic" | "tech"
format: "vertical" | "horizontal" | "square"

=== JSON 구조 (정확히 이 형태로!) ===
{
  "project": {
    "name": "영문소문자_밑줄만",
    "description": "한국어 설명",
    "style_preset": "cinematic",
    "version": "2.0"
  },
  "settings": {
    "width": 1080,
    "height": 1920,
    "fps": 30,
    "format": "vertical",
    "total_duration": 15,
    "background": {
      "type": "gradient",
      "gradient": {
        "colors": [[0.04, 0.04, 0.08], [0.12, 0.12, 0.16]],
        "angle": 180
      }
    }
  },
  "global_style": {
    "font_family": "NotoSansKR"
  },
  "scenes": [
    {
      "id": 1,
      "duration": 8,
      "description": "연출 의도 설명",
      "camera": {
        "enabled": true,
        "type": "parallax_scroll",
        "start_position": {"x": 540, "y": 960, "z": -1500},
        "end_position": {"x": 540, "y": 960, "z": -1200},
        "easing": "ease_in_out"
      },
      "layers": [
        {
          "id": "title_1",
          "type": "text",
          "name": "메인 제목",
          "transform": {
            "position": {"x": 540, "y": 300},
            "scale": [100, 100],
            "opacity": 100
          },
          "text_content": {
            "text": "제목 텍스트",
            "font_size": 72,
            "font_weight": "black",
            "color": [1.0, 1.0, 1.0],
            "alignment": "center",
            "stroke": {
              "enabled": true,
              "color": [0.0, 0.0, 0.0],
              "width": 6
            }
          },
          "effects": [
            {"type": "drop_shadow", "params": {"distance": 8, "softness": 10}}
          ],
          "entrance": {
            "type": "pop",
            "delay": 0.8,
            "duration": 0.6,
            "easing": "ease_out"
          },
          "animation": {
            "type": "none",
            "intensity": "normal",
            "loop": false
          }
        },
        {
          "id": "arrow_1",
          "type": "shape",
          "name": "화살표",
          "transform": {
            "position": {"x": 700, "y": 600},
            "scale": [100, 100],
            "opacity": 90,
            "rotation": 45
          },
          "shape_content": {
            "shape_type": "arrow",
            "color": [0.9, 0.2, 0.2],
            "stroke_width": 6,
            "start_point": {"x": 0, "y": 0},
            "end_point": {"x": 100, "y": 80}
          },
          "entrance": {
            "type": "wipe_in",
            "delay": 1.5,
            "duration": 0.5,
            "easing": "ease_out"
          },
          "animation": {
            "type": "pulse",
            "intensity": "subtle",
            "loop": true
          }
        },
        {
          "id": "bg_1",
          "type": "image",
          "name": "배경",
          "three_d": true,
          "transform": {
            "position": {"x": 540, "y": 960},
            "scale": [100, 100],
            "opacity": 100,
            "z_position": -2000
          },
          "image_source": {
            "file": "위 파일 목록 중 실제 파일명 (확장자 포함, 예: image.jpg)",
            "fit_mode": "cover"
          },
          "entrance": {
            "type": "fade_in",
            "delay": 0,
            "duration": 1.0,
            "easing": "ease_out"
          },
          "animation": {
            "type": "none",
            "intensity": "normal",
            "loop": false
          }
        }
      ],
      "transition_to_next": {
        "type": "crossfade",
        "duration": 1.0
      },
      "audio": {
        "narration": "나레이션 텍스트"
      }
    }
  ],
  "audio_global": {
    "bgm": "",
    "bgm_volume": 0.3
  },
  "render": {
    "output_format": "mp4",
    "codec": "h264",
    "quality": "high",
    "output_filename": "output.mp4"
  }
}

=== 배경 이미지 규칙 (필수!) ===
- 배경으로 쓰는 이미지(id가 bg_로 시작)는 반드시 layers 배열의 **마지막** 항목으로 배치
- 배경 이미지는 z_position: -2000 (가장 뒤)
- 배경 이미지에 effects(blur, vignette 등) 절대 금지
- 배경 이미지 opacity: 100
- 배경 이미지 animation.type: "none" (확대/축소/이동 등 애니메이션 금지)
- 배경 이미지 scale: [100, 100] (원본 크기 유지, 확대/축소 금지)

=== 캐릭터 Puppet Pin 레이어 (type: "puppet") ===
캐릭터 애니메이션용 이미지는 type: "puppet"으로 생성합니다.
이미지를 분석하여 움직일 부위의 핀 좌표를 지정하고, 모션 프리셋을 선택합니다.

puppet 레이어 JSON 예시:
{
  "id": "char_1",
  "type": "puppet",
  "name": "캐릭터",
  "image_source": { "file": "위 파일 목록 중 실제 파일명 (확장자 포함)", "fit_mode": "cover" },
  "transform": { "position": {"x": 540, "y": 600}, "scale": [100, 100], "opacity": 100 },
  "entrance": { "type": "fade_in", "delay": 0, "duration": 0.8, "easing": "ease_out" },
  "pins": [
    { "name": "head", "x": 540, "y": 200, "motion": "nod", "amount": 6, "speed": 0.8 },
    { "name": "right_arm", "x": 700, "y": 350, "motion": "swing", "amount": 12, "speed": 0.5 },
    { "name": "left_arm", "x": 400, "y": 380, "motion": "swing", "amount": 8, "speed": 0.6 },
    { "name": "body", "x": 540, "y": 450, "motion": "breathe", "amount": 3, "speed": 0.4 },
    { "name": "tail", "x": 350, "y": 500, "motion": "wave", "amount": 15, "speed": 1.0 }
  ],
  "fixed_pins": [
    { "name": "feet_left", "x": 480, "y": 700 },
    { "name": "feet_right", "x": 600, "y": 700 }
  ],
  "wiggle_elements": [
    { "property": "rotation", "frequency": 2, "amount": 1 }
  ]
}

puppet 모션 프리셋 설명:
- nod: 머리 끄덕임 (상하 사인파), 대화/반응용
- swing: 팔/물건 진자 흔들림, 팔 동작/물건 들기용
- wave: 물결/바람 효과 (연속 사인파), 망토/꼬리/종이/갈대용
- breathe: 미세 상하 (느린 호흡), 몸통에 적용
- shake: 빠른 떨림, 무서움/긴장/분노 표현
- bob: 위아래 반복, 걷는 느낌/떠 있는 물건
- bend: 구부리기 (CC Bend It 이펙트), 꼬리/나무/팔 구부림

핀 좌표 규칙:
- x, y는 이미지 내 실제 픽셀 좌표 (이미지 크기 기준)
- 고정 핀(fixed_pins)은 움직이면 안 되는 부위 (발, 바닥 접점 등)
- 고정 핀이 없으면 전체가 흔들려 부자연스러움 → 반드시 지정!
- amount는 2~20px 범위 (미세하게! 과하면 부자연스러움)
- 핀은 5~10개 정도가 적당

=== 텍스트 가독성 규칙 (필수!) ===
- font_weight는 반드시 "bold" 또는 "black" (regular 절대 금지)
- 모든 텍스트에 stroke 필수 (enabled: true, color: [0,0,0], width: 4~6)
- 모든 텍스트에 drop_shadow 효과 필수 (distance: 5~10, softness: 8~15)
- 배경 위 텍스트는 font_size 최소 48 이상
- 텍스트 color는 배경과 대비되는 밝은 색 사용 (흰색, 밝은 노랑 등)

=== 연출 규칙 ===
- 한 씬에 여러 이미지 동시 배치 (이미지 1장 = 씬 1개 금지!)
- 매 씬마다 image + text + shape 조합 (최소 5개 레이어)
- 레이어마다 다른 entrance type 사용 (fade_in만 반복 금지)
- delay를 0.1~2.0 범위로 다양하게 어긋나게 설정
- 같은 이미지를 여러 씬에서 다른 position/scale로 재사용
- 제공된 파일명만 사용 (존재하지 않는 파일명 생성 금지)
- $schema, definitions, properties 등 스키마 키워드 포함 금지
- JSON만 출력 (설명 텍스트 절대 포함 금지)`;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      api_key,
      images,
      style,
      description,
      total_duration,
      scene_duration,
      format: vidFormat,
      fps,
      mode,
    }: {
      api_key: string;
      images: { name: string; data_url: string; is_cutout?: boolean; image_type?: string }[];
      style: string;
      description: string;
      total_duration: number;
      scene_duration: number;
      format: string;
      fps: number;
      mode?: "motiongraphic" | "animate";
    } = body;

    if (!api_key) {
      return NextResponse.json(
        { error: "Gemini API 키가 필요합니다" },
        { status: 400 }
      );
    }

    if (!images || images.length === 0) {
      return NextResponse.json(
        { error: "이미지가 없습니다" },
        { status: 400 }
      );
    }

    const formatMap: Record<string, { label: string; w: number; h: number }> = {
      vertical: { label: "세로형", w: 1080, h: 1920 },
      horizontal: { label: "가로형", w: 1920, h: 1080 },
      square: { label: "정사각형", w: 1080, h: 1080 },
    };
    const fmt = formatMap[vidFormat || "vertical"] || formatMap.vertical;
    const dur = total_duration || 20;
    const sDur = scene_duration || 5;
    const fpsVal = fps || 30;

    // 이미지를 Gemini 형식으로 변환
    const parts: Array<Record<string, unknown>> = [];

    for (const img of images) {
      if (!img.data_url) continue;
      const match = img.data_url.match(/^data:(image\/[a-zA-Z+]+);base64,(.+)$/);
      if (match) {
        parts.push({
          inline_data: {
            mime_type: match[1],
            data: match[2],
          },
        });
      }
    }

    const imageList = images
      .map((img) => {
        const tags: string[] = [];
        if (img.is_cutout) tags.push("배경 제거됨");
        if (img.image_type === "background") tags.push("배경용");
        if (img.image_type === "storyboard") tags.push("스토리보드 - 연출 참고용");
        if (img.image_type === "character") tags.push("캐릭터 - Puppet Pin 애니메이션");
        const tagStr = tags.length > 0 ? ` (${tags.join(", ")})` : "";
        return `- ${img.name}${tagStr}`;
      })
      .join("\n");

    const bgImages = images.filter((img) => img.image_type === "background");
    const storyboardImages = images.filter((img) => img.image_type === "storyboard");
    const characterImages = images.filter((img) => img.image_type === "character");
    const bgNote = bgImages.length > 0
      ? `\n배경 이미지: ${bgImages.map((img) => img.name).join(", ")} → 반드시 layers 배열 마지막에 배치, z_position: -2000, effects 금지, opacity: 100`
      : "";
    const storyboardNote = storyboardImages.length > 0
      ? `\n스토리보드 이미지: ${storyboardImages.map((img) => img.name).join(", ")} → 연출 참고용 (화살표, 텍스트, 레이아웃 지시를 분석하여 반영). 영상에 직접 사용 금지!`
      : "";
    const characterNote = characterImages.length > 0
      ? `\n캐릭터 이미지: ${characterImages.map((img) => img.name).join(", ")} → type: "puppet" 레이어로 생성. 이미지를 분석하여 움직일 부위(머리, 팔, 소품 등)에 핀 좌표 지정. 고정 핀(발, 바닥) 필수. amount는 미세하게(2~15px).`
      : "";

    const isAnimateMode = mode === "animate";

    if (isAnimateMode) {
      // 캐릭터 애니메이션 전용 프롬프트 (Puppet Pin만)
      const fileList = images.map((img) => `- ${img.name}`).join("\n");
      parts.push({
        text: `이 캐릭터 이미지들을 분석하여 관절 리깅 애니메이션 JSON을 생성해주세요.

포맷: ${fmt.label} (${fmt.w}x${fmt.h}), FPS: ${fpsVal}
전체 영상 길이: ${dur}초 (settings.total_duration = ${dur})
이미지 ${images.length}장 → 씬 ${images.length}개 (각 씬 ${sDur}초)
${description ? `연출 설명: ${description}` : ""}

사용 가능한 파일 (반드시 이 파일명 그대로 사용, 확장자 포함):
${fileList}

요구사항:
★★★ 원본 이미지가 반드시 화면에 보여야 합니다! ★★★
1. fit_mode: "cover", transform.position: {"x": ${fmt.w / 2}, "y": ${fmt.h / 2}}, scale: [100, 100], opacity: 100
2. 이미지 1장 = 씬 1개, puppet 레이어 1개만 (텍스트/도형 금지!)
3. **entrance 사용 금지!** entrance를 넣지 마세요
4. joints 배열에 캐릭터 핵심 부위만 3~5개 (머리, 팔, 꼬리 등)
5. x, y는 컴포지션 좌표 (가로: 0~${fmt.w}, 0~${fmt.h})
6. amount 2~5, speed 0.3~0.5 (매우 미세하게!)
7. fixed_pins로 바닥 고정
8. settings: width=${fmt.w}, height=${fmt.h}, fps=${fpsVal}, total_duration=${dur}
9. transition_to_next: crossfade (duration 0.5)
10. background.color: [1.0, 1.0, 1.0] (흰색 배경)
11. wiggle_elements, bend_zones, expression_links, rig_mode, action 전부 사용 금지

JSON만 출력.`,
      });
    } else {
      // 모션그래픽 프롬프트 (기존)
      parts.push({
        text: `이 이미지들로 ancrid 수준의 고퀄리티 모션그래픽 JSON을 생성해주세요.

스타일: ${style}
포맷: ${fmt.label} (${fmt.w}x${fmt.h}), FPS: ${fpsVal}
전체 영상 길이: ${dur}초 (settings.total_duration = ${dur})
${description ? `설명: ${description}` : "이미지를 분석하여 자동으로 판단해주세요."}

사용 가능한 파일:
${imageList}${bgNote}${storyboardNote}${characterNote}

[중요] image_source.file 필드는 반드시 위 파일 목록의 파일명을 그대로 사용하세요 (확장자 포함, 대소문자 정확히). 절대로 임의로 .png로 바꾸거나 다른 파일명을 사용하지 마세요.

핵심 요구사항:
1. 이미지 1장 = 씬 1개 금지! 한 씬에 여러 이미지를 동시 배치. 씬 수는 자유롭게 (3~8개)
2. 매 씬마다 화살표, 강조박스, 밑줄, 원 등 도형 shape 레이어 필수
3. 다양한 레이아웃 (전체화면, 좌우분할, PIP, 격자, 대각선 등)
4. 레이어마다 서로 다른 entrance 사용 (fade_in만 반복 금지)
5. 이미지를 다양한 위치/크기로 배치 (중앙만 X)
6. 씬당 최소 5개 이상 레이어
7. 위 파일명만 정확히 사용 (존재하지 않는 파일명 금지, .png 임의 변환 금지)
8. settings: width=${fmt.w}, height=${fmt.h}, fps=${fpsVal}, total_duration=${dur}
9. 모든 씬의 duration 합계 = ${dur}초 (씬 수와 개별 길이는 자유롭게)
10. 텍스트는 한국어, 세부 타이밍은 자유롭게

JSON만 출력.`,
      });
    }

    // Gemini API 호출
    const model = (body.model as string) || "gemini-2.5-flash";
    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${api_key}`;

    const response = await fetch(geminiUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        system_instruction: {
          parts: [{ text: isAnimateMode ? ANIMATE_SYSTEM_PROMPT : SYSTEM_PROMPT }],
        },
        contents: [
          {
            parts: parts,
          },
        ],
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 65536,
          responseMimeType: "application/json",
        },
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      return NextResponse.json(
        { error: `Gemini API 오류 (${response.status}): ${errText.slice(0, 300)}` },
        { status: response.status }
      );
    }

    const result = await response.json();

    // 응답 끊김 확인
    const finishReason = result.candidates?.[0]?.finishReason;
    if (finishReason === "MAX_TOKENS") {
      return NextResponse.json(
        {
          error: "JSON 생성이 도중에 끊겼습니다 (토큰 한도 초과). 영상 길이를 줄이거나 씬 수를 줄여보세요.",
          raw: result.candidates?.[0]?.content?.parts?.[0]?.text?.slice(0, 500) || "",
        },
        { status: 422 }
      );
    }

    // 안전 관련 차단 확인
    if (finishReason === "SAFETY") {
      return NextResponse.json(
        { error: "Gemini 안전 필터에 의해 차단되었습니다. 이미지나 설명을 변경해보세요." },
        { status: 422 }
      );
    }

    // 응답에서 JSON 텍스트 추출
    let responseText = "";
    try {
      responseText = result.candidates?.[0]?.content?.parts?.[0]?.text || "";
    } catch {
      return NextResponse.json(
        { error: "Gemini 응답 파싱 실패", raw: JSON.stringify(result).slice(0, 500) },
        { status: 422 }
      );
    }

    if (!responseText) {
      return NextResponse.json(
        { error: "Gemini가 빈 응답을 반환했습니다", raw: JSON.stringify(result).slice(0, 500) },
        { status: 422 }
      );
    }

    // JSON 블록 추출
    let jsonStr = responseText;
    const jsonMatch = responseText.match(/```(?:json)?\s*\n?([\s\S]*?)```/);
    if (jsonMatch) {
      jsonStr = jsonMatch[1].trim();
    }

    // JSON 유효성 검증
    try {
      JSON.parse(jsonStr);
    } catch {
      return NextResponse.json(
        {
          error: "Gemini가 유효한 JSON을 생성하지 못했습니다. 다시 시도해보세요.",
          raw: responseText.slice(0, 1000),
        },
        { status: 422 }
      );
    }

    return NextResponse.json({
      success: true,
      json: jsonStr,
      model: model,
    });
  } catch (error) {
    return NextResponse.json(
      { error: `서버 오류: ${(error as Error).message}` },
      { status: 500 }
    );
  }
}
