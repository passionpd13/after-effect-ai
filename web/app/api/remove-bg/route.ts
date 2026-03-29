import { NextRequest, NextResponse } from "next/server";

/**
 * 이미지에서 배경을 제거하여 투명 PNG로 변환
 * remove.bg API 사용 (무료 플랜: 월 50장)
 * 대안: 직접 Segment Anything 모델 호스팅
 */
export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const imageFile = formData.get("image") as File | null;
    const apiKey = formData.get("api_key") as string | null;

    if (!imageFile) {
      return NextResponse.json({ error: "이미지가 없습니다" }, { status: 400 });
    }

    if (!apiKey) {
      return NextResponse.json(
        { error: "remove.bg API 키가 필요합니다" },
        { status: 400 }
      );
    }

    // remove.bg API 호출
    const rbFormData = new FormData();
    rbFormData.append("image_file", imageFile);
    rbFormData.append("size", "auto");
    rbFormData.append("format", "png");

    const response = await fetch("https://api.remove.bg/v1.0/removebg", {
      method: "POST",
      headers: {
        "X-Api-Key": apiKey,
      },
      body: rbFormData,
    });

    if (!response.ok) {
      const errorText = await response.text();
      return NextResponse.json(
        { error: `remove.bg 오류: ${response.status} - ${errorText}` },
        { status: response.status }
      );
    }

    // 투명 PNG 바이너리 반환
    const pngBuffer = await response.arrayBuffer();
    const base64 = Buffer.from(pngBuffer).toString("base64");

    return NextResponse.json({
      success: true,
      image_base64: `data:image/png;base64,${base64}`,
      original_name: imageFile.name,
      cutout_name: imageFile.name.replace(/\.[^.]+$/, "_cutout.png"),
    });
  } catch (error) {
    return NextResponse.json(
      { error: `서버 오류: ${(error as Error).message}` },
      { status: 500 }
    );
  }
}
