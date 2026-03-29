import { NextRequest, NextResponse } from "next/server";

const SYSTEM_PROMPT = `당신은 전문 모션그래픽 디자이너입니다. 사용자가 이미지들을 제공하면, After Effects에서 자동 실행되는 고퀄리티 모션그래픽 JSON을 생성합니다.

## 핵심 원칙
1. 각 이미지 내 객체를 분석하여 독립 레이어로 분리
2. 의미 기반 애니메이션 - 내용에 맞는 자연스러운 모션
3. 시각적 계층 - 중요한 것은 크게/앞에, 보조 요소는 뒤에
4. 시간 차이 - 요소들이 순차적으로 등장 (0.2~0.5초 간격)
5. 3D 깊이감 - 카메라와 Z축을 활용한 입체감

## 요소별 추천 모션
- 메인 인물/객체: entrance=scale_up, animation=float/breathe
- 배경: entrance=fade_in(먼저), animation=zoom_in/pan (subtle)
- 제목 텍스트: entrance=pop/typewriter
- 부제목: entrance=fade_in/slide_from_bottom (delay +0.5s)
- 화살표/지시선: entrance=wipe_in
- 강조 박스: entrance=scale_up, animation=pulse

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
- 한 씬에 이펙트는 2~3개까지
- 모든 요소를 동시에 등장시키지 말 것 (순차적!)
- position.x는 0~width, position.y는 0~height 범위
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
      text: `다음 이미지들로 고퀄리티 모션그래픽 JSON을 생성해주세요.

스타일: ${style}
포맷: ${fmt.label} (${fmt.w}x${fmt.h})
FPS: ${fpsVal}
씬 1개당 길이: ${sDur}초 (각 씬의 duration = ${sDur})
이미지 ${images.length}장 → 씬 ${images.length}개 → 총 약 ${dur}초
${description ? `설명: ${description}` : "이미지를 분석하여 자동으로 판단해주세요."}

사용 가능한 파일 (이 파일명만 사용하세요!):
${imageList}

중요:
- 위 파일명만 정확히 사용. 존재하지 않는 파일명 사용 금지.
- 스키마 정의 없이 데이터 JSON만 출력.
- settings: width=${fmt.w}, height=${fmt.h}, fps=${fpsVal}, total_duration=${dur}
- 각 씬의 duration = ${sDur}
- 각 레이어의 entrance delay, animation 등 세부 타이밍은 자유롭게 결정

JSON만 출력해주세요.`,
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
