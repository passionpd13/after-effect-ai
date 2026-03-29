import { NextRequest, NextResponse } from "next/server";

const SYSTEM_PROMPT = `당신은 모션그래픽 전문가입니다. After Effects용 JSON을 생성합니다.

=== 값 범위 규칙 (반드시 지켜야 함!) ===

모든 색상(color): [R, G, B] 형태, 각 값은 0.0~1.0 범위의 소수
  올바른 예: [1.0, 0.0, 0.0] (빨강), [0.0, 0.0, 0.0] (검정), [1.0, 1.0, 1.0] (흰색)
  잘못된 예: [255, 0, 0], [10, 10, 20] ← 절대 금지!

position.x: 이미지가 화면 안에 완전히 보이도록 설정
position.y: 이미지가 화면 안에 완전히 보이도록 설정
z_position: -2000 ~ 2000 (음수=뒤, 양수=앞)

⚠️ 이미지 짤림 방지 (매우 중요!):
- fit_mode는 "contain" 사용 (이미지가 잘리지 않게)
- scale이 100 이상인 이미지는 position을 화면 중앙에 가깝게 배치
- 작은 이미지(scale 50 이하)도 화면 밖으로 나가면 안 됨
- position.x 범위: (이미지표시너비/2) ~ (화면너비 - 이미지표시너비/2)
- position.y 범위: (이미지표시높이/2) ~ (화면높이 - 이미지표시높이/2)
- 의심되면 position을 화면 중앙(width/2, height/2)에 가깝게 배치

scale: [너비%, 높이%] 예: [100, 100]=원본, [50, 50]=절반, [150, 150]=1.5배
opacity: 0 ~ 100 (0=투명, 100=불투명)
rotation: 0 ~ 360 (도)

entrance.delay: 0.0 ~ 5.0 (초)
entrance.duration: 0.3 ~ 2.0 (초)
scene.duration: 3.0 ~ 20.0 (초)
transition.duration: 0.5 ~ 2.0 (초)

font_size: 24 ~ 120 (픽셀)
font_weight: "regular" | "bold" | "black" 중 하나만
stroke.width: 1 ~ 10

effects.params 값 범위:
  blur.amount: 1 ~ 30
  glow.radius: 5 ~ 50, glow.intensity: 0.1 ~ 1.0
  drop_shadow.distance: 5 ~ 30, drop_shadow.softness: 5 ~ 30
  vignette.amount: 10 ~ 60
  light_sweep.angle: 0 ~ 360, light_sweep.speed: 0.5 ~ 3.0

CC 고급 이펙트 params:
  cc_particle_world: birth_rate(0.5~5), longevity(0.5~3), velocity(0~2), gravity(-0.5~0.5), particle_type(0~9)
  cc_light_rays: intensity(50~200), radius(50~200), center([x,y])
  cc_light_burst: intensity(20~100), ray_length(30~150), center([x,y])
  cc_radial_blur: amount(10~80), blur_type(0=Spin,1=Zoom), center([x,y])
  camera_lens_blur: blur_radius(5~30), blade_count(5~8)
  lumetri_color: temperature(-50~50), exposure(-2~2), contrast(-100~100), saturation(0~200), vibrance(-100~100)
  turbulent_displace: amount(10~100), size(5~50), complexity(1~5), animate_evolution(true/false), evolution_speed(50~200)
  cc_glass: bump_height(5~50), displacement(20~100), softness(1~10)
  cc_sphere: rotation_x(0~360), rotation_y(0~360), radius(100~500), auto_rotate(true/false), rotate_speed(10~60)
  tint: map_black([r,g,b]), map_white([r,g,b]), amount(0~100)
  gradient_ramp: start_color([r,g,b]), end_color([r,g,b]), blend(0=Linear,1=Radial)

=== 허용되는 enum 값 (이것만 사용!) ===

type (레이어): "image" | "text" | "shape"
fit_mode: "cover" | "contain"
shape_type: "arrow" | "line" | "circle" | "rectangle"
alignment: "left" | "center" | "right"

entrance.type: "none" | "fade_in" | "scale_up" | "pop" | "bounce_in" | "slide_from_left" | "slide_from_right" | "slide_from_top" | "slide_from_bottom" | "wipe_in" | "typewriter"
entrance.easing: "ease_out" | "ease_in" | "ease_in_out"

animation.type: "none" | "float" | "pulse" | "shake" | "bob" | "sway" | "zoom_in" | "zoom_out" | "ken_burns" | "pan_left" | "pan_right"
animation.intensity: "subtle" | "normal" | "strong"

transition.type: "none" | "cut" | "fade" | "crossfade" | "morph" | "slide_left" | "slide_right" | "slide_up" | "slide_down" | "whip_pan" | "dissolve"

effects.type (기본): "drop_shadow" | "glow" | "blur" | "vignette" | "grain" | "light_sweep" | "lens_flare"
effects.type (CC 고급): "cc_particle_world" | "cc_light_rays" | "cc_light_burst" | "cc_radial_blur" | "cc_glass" | "camera_lens_blur" | "lumetri_color" | "turbulent_displace" | "cc_sphere" | "tint" | "gradient_ramp" | "radial_wipe"

camera.type: "static" | "zoom_through" | "orbit" | "dolly" | "crane" | "parallax_scroll"

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
          "id": "bg_1",
          "type": "image",
          "name": "배경",
          "three_d": true,
          "transform": {
            "position": {"x": 540, "y": 960},
            "scale": [120, 120],
            "opacity": 50,
            "z_position": -500
          },
          "image_source": {
            "file": "파일명.png",
            "fit_mode": "cover"
          },
          "entrance": {
            "type": "fade_in",
            "delay": 0,
            "duration": 1.0,
            "easing": "ease_out"
          },
          "animation": {
            "type": "ken_burns",
            "intensity": "subtle",
            "loop": false
          },
          "effects": [
            {"type": "blur", "params": {"amount": 10}},
            {"type": "vignette", "params": {"amount": 40}}
          ]
        },
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
            "font_weight": "bold",
            "color": [1.0, 1.0, 1.0],
            "alignment": "center",
            "stroke": {
              "enabled": true,
              "color": [0.0, 0.0, 0.0],
              "width": 4
            }
          },
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

=== 연출 규칙 ===
- 한 씬에 여러 이미지 동시 배치 (이미지 1장 = 씬 1개 금지!)
- 매 씬마다 image + text + shape 조합 (최소 5개 레이어)
- 레이어마다 다른 entrance type 사용 (fade_in만 반복 금지)
- delay를 0.1~2.0 범위로 다양하게 어긋나게 설정
- 같은 이미지를 여러 씬에서 다른 position/scale로 재사용
- 제공된 파일명만 사용 (존재하지 않는 파일명 생성 금지)
- $schema, definitions, properties 등 스키마 키워드 포함 금지
- JSON만 출력 (설명 텍스트 절대 포함 금지)

=== 고급 CC 이펙트 적극 활용 (고퀄리티!) ===
- 임팩트 장면: cc_light_rays 또는 cc_light_burst로 빛줄기 효과
- 배경 이미지: camera_lens_blur로 시네마틱 아웃포커스 + lumetri_color로 색보정
- 전환 장면: cc_radial_blur(type=1=Zoom)로 속도감
- 파티클: cc_particle_world로 불꽃/별/입자 효과 (별도 레이어에 적용)
- 분위기: turbulent_displace(animate_evolution=true)로 물결/연기 효과
- 색감: lumetri_color로 각 씬의 분위기에 맞는 색보정
- tint로 흑백/세피아/듀오톤 효과
- 매 씬에 최소 1개 이상의 CC 고급 이펙트 사용 권장!`;

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
    }: {
      api_key: string;
      images: { name: string; data_url: string; is_cutout?: boolean; image_type?: string }[];
      style: string;
      description: string;
      total_duration: number;
      scene_duration: number;
      format: string;
      fps: number;
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
      vertical: { label: "9:16 세로", w: 1080, h: 1920 },
      horizontal: { label: "16:9 가로", w: 1920, h: 1080 },
      square: { label: "1:1 정사각형", w: 1080, h: 1080 },
      vertical_4_5: { label: "4:5 세로", w: 1080, h: 1350 },
      horizontal_21_9: { label: "21:9 울트라와이드", w: 2560, h: 1080 },
      vertical_2_3: { label: "2:3 세로", w: 1080, h: 1620 },
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

    const storyboards = images.filter((img) => img.image_type === "storyboard");
    const backgrounds = images.filter((img) => img.image_type === "background");
    const sourceImages = images.filter((img) => img.image_type !== "storyboard" && img.image_type !== "background");

    const imageList = images
      .map((img) => {
        if (img.image_type === "storyboard") return "📋 " + img.name + " (스토리보드 - 연출 참고용, 영상에 사용 금지)";
        if (img.image_type === "background") return "🌄 " + img.name + " (배경 이미지 - 전체화면 배경으로 사용)";
        const tag = img.is_cutout ? " (배경 제거됨)" : "";
        return "🖼️ " + img.name + tag + " (소스 이미지 - 영상에 사용)";
      })
      .join("\n");

    const storyboardInstruction = storyboards.length > 0 ? `
## 스토리보드 분석 (매우 중요!)
📋 표시된 이미지는 스토리보드(연출 기획서)입니다. 반드시 자세히 분석하세요:
- 스토리보드에 그려진 레이아웃/배치를 최대한 따라하세요
- 화살표가 그려져 있으면 → 해당 방향으로 움직이는 애니메이션 적용
- 텍스트가 적혀있으면 → 그 텍스트를 그 위치에 배치 (한국어로)
- 위치/크기 표시가 있으면 → position/scale 값에 반영
- 동작 지시(줌, 회전, 이동)가 있으면 → animation/entrance에 반영
- 번호나 순서가 있으면 → 씬 순서와 등장 delay에 반영
- 스토리보드 이미지 자체는 영상 레이어로 사용하지 마세요!
- 소스/배경 이미지만 image_source.file에 사용하세요
` : "";

    const backgroundInstruction = backgrounds.length > 0 ? `
## 배경 이미지 규칙
🌄 표시된 이미지는 배경입니다:
- 배경 이미지는 씬의 맨 뒤 레이어로 전체화면 cover 배치
- 배경 위 모든 텍스트는 반드시 가독성 확보:
  * stroke 필수: enabled=true, color=[0.0,0.0,0.0], width=4~6
  * drop_shadow 이펙트: distance=10, softness=20
  * 텍스트 색상은 밝은 색 [1.0,1.0,1.0] 사용
  * 필요하면 텍스트 뒤에 반투명 rectangle (opacity 40~60)
- 배경에 blur(amount=5~10) + vignette(amount=40) 권장
` : "";

    parts.push({
      text: `이미지들을 분석하여 모션그래픽 JSON을 생성해주세요.

스타일: ${style}
포맷: ${fmt.label} (${fmt.w}x${fmt.h}), FPS: ${fpsVal}
전체 영상 길이: ${dur}초 (settings.total_duration = ${dur})
${description ? `설명: ${description}` : "이미지를 분석하여 자동으로 판단해주세요."}

업로드된 이미지:
${imageList}
${storyboardInstruction}${backgroundInstruction}
핵심 요구사항:
1. 각 이미지의 내용을 분석하세요 (인물, 사물, 텍스트, 배경 등 무엇이 있는지)
2. 이미지 내용에 맞는 연출을 해주세요 (인물→float, 무기→slide_in, 지도→zoom 등)
3. 한 씬에 여러 이미지 동시 배치. 이미지 1장 = 씬 1개 금지!
4. 매 씬마다 화살표, 강조박스 등 도형 shape 레이어 필수
5. 다양한 레이아웃 (전체화면, 좌우분할, PIP, 격자 등)
6. 레이어마다 서로 다른 entrance (fade_in만 반복 금지)
7. 씬당 최소 5개 이상 레이어
8. 🖼️ 소스 이미지 파일명만 image_source.file에 사용 (📋 스토리보드 파일명 사용 금지!)
9. settings: width=${fmt.w}, height=${fmt.h}, fps=${fpsVal}, total_duration=${dur}
10. 텍스트는 한국어

JSON만 출력.`,
    });

    // Gemini API 호출
    const model = (body.model as string) || "gemini-2.5-flash";
    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${api_key}`;

    const response = await fetch(geminiUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        system_instruction: {
          parts: [{ text: SYSTEM_PROMPT }],
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
