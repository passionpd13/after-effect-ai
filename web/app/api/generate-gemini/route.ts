import { NextRequest, NextResponse } from "next/server";

const SYSTEM_PROMPT = `당신은 ancrid 수준의 전문 모션그래픽 디자이너입니다. 사용자가 이미지들을 제공하면, After Effects에서 자동 실행되는 고퀄리티 모션그래픽 JSON을 생성합니다.

## 핵심 원칙
1. 한 씬에 여러 이미지를 동시에 배치하여 다이나믹한 구성
2. 이미지 순서는 자유롭게 (순서대로일 필요 없음)
3. 같은 이미지를 여러 씬/레이어에서 다른 크기/위치로 재사용
4. 매 씬마다 화살표, 강조박스, 밑줄, 원 등 도형 필수 사용
5. 다양한 레이아웃 (전체화면, 좌우분할, PIP, 격자, 대각선 배치)
6. 3D 깊이감 - 카메라와 Z축 활용

## 다양한 연출 패턴 (이 중에서 골라 사용)
- 전체화면 배경 + 작은 이미지 PIP + 텍스트 오버레이
- 좌우 분할: 이미지A 왼쪽 + 이미지B 오른쪽 + 가운데 화살표
- 메인 이미지 크게 + 화살표가 특정 부분 가리킴 + 설명 텍스트
- 여러 이미지 격자/타일 배치 + 하나씩 순차 등장
- 배경 블러 처리 + 전경 이미지 선명하게
- 이미지 위에 강조 원/박스 + 라벨 텍스트
- 대각선 배치: 좌상단~우하단으로 이미지 나열

## 도형(shape) 적극 활용
- arrow: 방향 지시, 이미지 간 연결, 흐름 표시 (다양한 각도!)
- highlight_box/rectangle: 중요 영역 강조
- underline/line: 텍스트 밑줄, 구분선
- circle: 특정 영역 강조, 포인트 마커

## 모션 다양성 (절대 단조롭지 않게!)
- 레이어마다 다른 entrance (fade_in만 반복 금지!)
- 다양한 방향: slide_from_left, slide_from_right, slide_from_top, slide_from_bottom, pop, bounce_in, scale_up, wipe_in, fly_in_3d
- delay를 0.1~2초 범위로 다양하게 어긋나게
- 지속 애니메이션: float, pulse, bob, sway, shake, zoom_in, ken_burns
- 화살표는 wipe_in으로 그려지듯이 등장
- 텍스트마다 다른 애니메이션 (typewriter, pop, slide, bounce)

## 필수 출력 형식
스키마 정의 없이 데이터 JSON만 출력하세요. $schema, definitions, properties 등 포함 금지.

{
  "project": { "name": "영문_소문자_밑줄", "description": "설명", "style_preset": "프리셋", "version": "2.0" },
  "settings": { "width": 너비, "height": 높이, "fps": FPS, "format": "포맷", "total_duration": 총길이,
    "background": { "type": "gradient", "gradient": { "colors": [[r,g,b],[r,g,b]], "angle": 180 } }
  },
  "scenes": [{
    "id": 1, "duration": 숫자, "description": "연출 의도",
    "camera": { "enabled": true/false, "type": "타입", "start_position": {"x":0,"y":0,"z":0}, "end_position": {"x":0,"y":0,"z":0}, "easing": "ease_in_out" },
    "layers": [{
      "id": "고유id", "type": "image|text|shape", "name": "이름",
      "three_d": true/false,
      "transform": { "position": {"x":540,"y":960}, "scale": [100,100], "opacity": 100, "z_position": 0 },
      "image_source": { "file": "정확한파일명.확장자", "fit_mode": "cover|contain" },
      "text_content": { "text": "텍스트", "font_size": 60, "font_weight": "bold", "color": [1,1,1], "alignment": "center",
        "stroke": { "enabled": true, "color": [0,0,0], "width": 3 } },
      "shape_content": { "shape_type": "arrow|line|circle|rectangle", "color": [1,0,0], "stroke_width": 4 },
      "entrance": { "type": "fade_in|scale_up|pop|slide_from_left|slide_from_right|slide_from_bottom|bounce_in|typewriter|wipe_in", "delay": 초, "duration": 초, "easing": "ease_out" },
      "animation": { "type": "none|float|pulse|shake|zoom_in|zoom_out|ken_burns|bob|sway", "intensity": "subtle|normal|strong", "loop": false },
      "effects": [{ "type": "drop_shadow|glow|blur|vignette|grain|light_sweep|lens_flare", "params": {} }]
    }],
    "transition_to_next": { "type": "crossfade|fade|morph|whip_pan|slide_left", "duration": 초 },
    "audio": { "narration": "나레이션" }
  }],
  "audio_global": { "bgm": "", "bgm_volume": 0.3 },
  "render": { "output_format": "mp4", "codec": "h264", "quality": "high", "output_filename": "output.mp4" }
}

## 규칙
- 제공된 파일명만 정확히 사용. 존재하지 않는 파일명 사용 금지
- 한 씬에 레이어 최소 5개 이상 (이미지 + 텍스트 + 도형 조합)
- 모든 요소를 동시에 등장시키지 말 것 (delay로 순차!)
- position.x는 0~width, position.y는 0~height 범위
- 한 씬에 한 이미지만 쓰지 말 것 - 여러 이미지를 조합!
- JSON만 출력 (설명 텍스트 없이)`;

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
      images: { name: string; data_url: string; is_cutout?: boolean }[];
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
        const tag = img.is_cutout ? " (배경 제거됨)" : "";
        return `- ${img.name}${tag}`;
      })
      .join("\n");

    parts.push({
      text: `이 이미지들로 ancrid 수준의 고퀄리티 모션그래픽 JSON을 생성해주세요.

스타일: ${style}
포맷: ${fmt.label} (${fmt.w}x${fmt.h}), FPS: ${fpsVal}
씬당 길이: 약 ${sDur}초, 총 약 ${dur}초
${description ? `설명: ${description}` : "이미지를 분석하여 자동으로 판단해주세요."}

사용 가능한 파일:
${imageList}

핵심 요구사항:
1. 한 씬에 여러 이미지를 동시 배치 (이미지 1장 = 씬 1개 금지!)
2. 매 씬마다 화살표, 강조박스, 밑줄, 원 등 도형 shape 레이어 필수
3. 다양한 레이아웃 (전체화면, 좌우분할, PIP, 격자, 대각선 등)
4. 레이어마다 서로 다른 entrance 사용 (fade_in만 반복 금지)
5. 이미지를 다양한 위치/크기로 배치 (중앙만 X)
6. 씬당 최소 5개 이상 레이어
7. 위 파일명만 정확히 사용 (존재하지 않는 파일명 금지)
8. settings: width=${fmt.w}, height=${fmt.h}, fps=${fpsVal}, total_duration=${dur}
9. 텍스트는 한국어, 세부 타이밍은 자유롭게

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
