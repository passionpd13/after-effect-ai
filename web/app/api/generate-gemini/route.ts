import { NextRequest, NextResponse } from "next/server";

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

type (레이어): "image" | "text" | "shape"
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
        const tagStr = tags.length > 0 ? ` (${tags.join(", ")})` : "";
        return `- ${img.name}${tagStr}`;
      })
      .join("\n");

    const bgImages = images.filter((img) => img.image_type === "background");
    const storyboardImages = images.filter((img) => img.image_type === "storyboard");
    const bgNote = bgImages.length > 0
      ? `\n배경 이미지: ${bgImages.map((img) => img.name).join(", ")} → 반드시 layers 배열 마지막에 배치, z_position: -2000, effects 금지, opacity: 100`
      : "";
    const storyboardNote = storyboardImages.length > 0
      ? `\n스토리보드 이미지: ${storyboardImages.map((img) => img.name).join(", ")} → 연출 참고용 (화살표, 텍스트, 레이아웃 지시를 분석하여 반영). 영상에 직접 사용 금지!`
      : "";

    parts.push({
      text: `이 이미지들로 ancrid 수준의 고퀄리티 모션그래픽 JSON을 생성해주세요.

스타일: ${style}
포맷: ${fmt.label} (${fmt.w}x${fmt.h}), FPS: ${fpsVal}
전체 영상 길이: ${dur}초 (settings.total_duration = ${dur})
${description ? `설명: ${description}` : "이미지를 분석하여 자동으로 판단해주세요."}

사용 가능한 파일:
${imageList}${bgNote}${storyboardNote}

핵심 요구사항:
1. 이미지 1장 = 씬 1개 금지! 한 씬에 여러 이미지를 동시 배치. 씬 수는 자유롭게 (3~8개)
2. 매 씬마다 화살표, 강조박스, 밑줄, 원 등 도형 shape 레이어 필수
3. 다양한 레이아웃 (전체화면, 좌우분할, PIP, 격자, 대각선 등)
4. 레이어마다 서로 다른 entrance 사용 (fade_in만 반복 금지)
5. 이미지를 다양한 위치/크기로 배치 (중앙만 X)
6. 씬당 최소 5개 이상 레이어
7. 위 파일명만 정확히 사용 (존재하지 않는 파일명 금지)
8. settings: width=${fmt.w}, height=${fmt.h}, fps=${fpsVal}, total_duration=${dur}
9. 모든 씬의 duration 합계 = ${dur}초 (씬 수와 개별 길이는 자유롭게)
10. 텍스트는 한국어, 세부 타이밍은 자유롭게

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
