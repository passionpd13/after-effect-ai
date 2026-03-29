import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

// AI 프롬프트 템플릿을 읽어서 시스템 프롬프트로 사용
const SYSTEM_PROMPT = `당신은 전문 모션그래픽 디자이너입니다. 사용자가 이미지들을 제공하면, After Effects에서 자동 실행되는 고퀄리티 모션그래픽 JSON을 생성합니다.

## 핵심 원칙
1. 각 이미지 내 객체를 분석하여 독립 레이어로 분리
2. 의미 기반 애니메이션 - 내용에 맞는 자연스러운 모션
3. 시각적 계층 - 중요한 것은 크게/앞에, 보조 요소는 뒤에
4. 시간 차이 - 요소들이 순차적으로 등장 (0.2~0.5초 간격)
5. 3D 깊이감 - 카메라와 Z축을 활용한 입체감

## 요소별 추천 모션
- 메인 인물: entrance=scale_up, animation=float/breathe
- 보조 인물: entrance=slide_from_left/right
- 지도/배경: entrance=fade_in(먼저), animation=zoom_in/pan
- 제목 텍스트: entrance=pop/typewriter
- 부제목: entrance=fade_in/slide_from_bottom (delay 0.5s)
- 화살표/지시선: entrance=wipe_in
- 아이콘/기호: entrance=bounce_in/pop, animation=pulse/bob
- 강조 박스: entrance=scale_up, animation=pulse

## 카메라 설계
- 인물 중심: parallax_scroll
- 지도/풍경: zoom_through
- 비교/나열: dolly
- 극적 순간: crane

## JSON 형식 (schema v2)
반드시 이 구조를 따르세요:
{
  "project": { "name": "영문명", "description": "설명", "style_preset": "프리셋", "version": "2.0" },
  "settings": { "width": 1080, "height": 1920, "fps": 30, "format": "vertical",
    "background": { "type": "gradient", "gradient": { "colors": [[r,g,b],[r,g,b]], "angle": 180 } },
    "total_duration": 숫자
  },
  "scenes": [{
    "id": 1, "duration": 숫자, "description": "연출 의도",
    "camera": { "enabled": true/false, "type": "타입", "start_position": {x,y,z}, "end_position": {x,y,z}, "focal_length": 50, "easing": "ease_in_out" },
    "layers": [{
      "id": "고유id", "type": "image|text|shape", "name": "이름",
      "three_d": true/false,
      "transform": { "position": {x,y}, "scale": [w,h], "opacity": 0-100, "rotation": 0, "z_position": 0 },
      "image_source": { "file": "파일명.png", "fit_mode": "cover|contain" },
      "text_content": { "text": "텍스트", "style": "title|subtitle|body", "font_size": 60, "font_weight": "bold", "color": [r,g,b], "alignment": "center", "stroke": { "enabled": true, "color": [0,0,0], "width": 3 } },
      "shape_content": { "shape_type": "arrow|line|circle|rectangle|underline|highlight_box", "color": [r,g,b], "stroke_width": 4, "start_point": {x,y}, "end_point": {x,y} },
      "entrance": { "type": "타입", "delay": 초, "duration": 초, "easing": "ease_out" },
      "animation": { "type": "타입", "intensity": "subtle|normal|strong", "speed": 1, "loop": false },
      "exit": { "type": "타입", "time_before_end": 초, "duration": 초 },
      "effects": [{ "type": "타입", "params": {} }]
    }],
    "transition_to_next": { "type": "타입", "duration": 초, "easing": "ease_in_out" },
    "audio": { "narration": "나레이션" }
  }],
  "audio_global": { "bgm": "", "bgm_volume": 0.3, "bgm_fade_in": 2, "bgm_fade_out": 2 },
  "render": { "output_format": "mp4", "codec": "h264", "quality": "high", "output_filename": "output.mp4" }
}

## 규칙
- 파일명은 사용자가 제공한 것을 정확히 사용
- _cutout.png 파일이 있으면 배경 제거된 객체로 사용
- 원본 이미지는 배경/전체샷으로 사용
- 한 씬에 이펙트는 2~3개까지
- 모든 요소를 동시에 등장시키지 말 것 (순차적!)
- position의 x는 0~1080, y는 0~1920 범위
- JSON만 출력하세요 (설명 없이)`;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      api_key,
      images,
      style,
      description,
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
        { error: "Anthropic API 키가 필요합니다" },
        { status: 400 }
      );
    }

    if (!images || images.length === 0) {
      return NextResponse.json(
        { error: "이미지가 없습니다" },
        { status: 400 }
      );
    }

    const client = new Anthropic({ apiKey: api_key });

    // 이미지들을 Claude 메시지로 변환
    const imageContents: Anthropic.ImageBlockParam[] = images
      .filter((img) => img.data_url)
      .map((img) => {
        // data:image/png;base64,xxxx -> extract media type and base64
        const match = img.data_url.match(
          /^data:(image\/[a-zA-Z+]+);base64,(.+)$/
        );
        if (!match) throw new Error(`Invalid data URL for ${img.name}`);
        return {
          type: "image" as const,
          source: {
            type: "base64" as const,
            media_type: match[1] as "image/png" | "image/jpeg" | "image/gif" | "image/webp",
            data: match[2],
          },
        };
      });

    const imageList = images.map((img) => {
      const tag = img.is_cutout ? " (배경 제거됨)" : " (원본)";
      return `- ${img.name}${tag}`;
    }).join("\n");

    const formatMap: Record<string, string> = {
      vertical: "세로형 (1080x1920)",
      horizontal: "가로형 (1920x1080)",
      square: "정사각형 (1080x1080)",
    };
    const fmt = body.format || "vertical";
    const dur = body.total_duration || 20;
    const sDur = body.scene_duration || 5;
    const fpsVal = body.fps || 30;

    const userMessage = `다음 이미지들로 고퀄리티 모션그래픽 JSON을 생성해주세요.

스타일: ${style}
포맷: ${formatMap[fmt] || formatMap.vertical}
FPS: ${fpsVal}
전체 영상 길이: 약 ${dur}초 (settings.total_duration = ${dur})
씬당 평균 길이: ${sDur}초
예상 씬 수: 약 ${Math.round(dur / sDur)}개
${description ? `설명: ${description}` : "이미지를 분석하여 자동으로 판단해주세요."}

업로드된 파일:
${imageList}

_cutout.png 파일은 배경이 제거된 객체입니다. 이것을 독립 레이어로 사용하고, 원본 이미지는 배경으로 사용하세요.
3D 카메라와 객체별 독립 애니메이션을 적극 활용하여 ancrid 수준의 고퀄리티를 목표로 해주세요.

JSON만 출력해주세요.`;

    const message = await client.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 8192,
      system: SYSTEM_PROMPT,
      messages: [
        {
          role: "user",
          content: [
            ...imageContents,
            { type: "text", text: userMessage },
          ],
        },
      ],
    });

    // 응답에서 JSON 추출
    let responseText = "";
    for (const block of message.content) {
      if (block.type === "text") {
        responseText += block.text;
      }
    }

    // JSON 블록 추출 (```json ... ``` 또는 그냥 JSON)
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
        { error: "AI가 유효한 JSON을 생성하지 못했습니다", raw: responseText },
        { status: 422 }
      );
    }

    return NextResponse.json({
      success: true,
      json: jsonStr,
      usage: {
        input_tokens: message.usage.input_tokens,
        output_tokens: message.usage.output_tokens,
      },
    });
  } catch (error) {
    const errMsg = (error as Error).message || "Unknown error";
    return NextResponse.json(
      { error: `AI 생성 오류: ${errMsg}` },
      { status: 500 }
    );
  }
}
