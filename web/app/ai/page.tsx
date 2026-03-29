"use client";
import { useState, useCallback } from "react";
import Navbar from "@/components/Navbar";

interface UploadedImage {
  file: File;
  dataUrl: string;
  name: string;
}

export default function AiModePage() {
  const [images, setImages] = useState<UploadedImage[]>([]);
  const [description, setDescription] = useState("");
  const [style, setStyle] = useState("cinematic");
  const [generatedJson, setGeneratedJson] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [copyPromptDone, setCopyPromptDone] = useState(false);

  const handleImageUpload = useCallback((files: FileList | null) => {
    if (!files) return;
    const newImages: Promise<UploadedImage>[] = [];
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (!file.type.startsWith("image/")) continue;
      newImages.push(
        new Promise((resolve) => {
          const reader = new FileReader();
          reader.onload = (e) => {
            resolve({
              file,
              dataUrl: e.target?.result as string,
              name: file.name,
            });
          };
          reader.readAsDataURL(file);
        })
      );
    }
    Promise.all(newImages).then((imgs) => {
      setImages((prev) => [...prev, ...imgs]);
    });
  }, []);

  const removeImage = (index: number) => {
    setImages((prev) => prev.filter((_, i) => i !== index));
  };

  const generatePrompt = () => {
    const imageList = images.map((img, i) => `${i + 1}. ${img.name}`).join("\n");
    return `다음 이미지들로 고퀄리티 모션그래픽 영상용 JSON을 생성해주세요.

## 프로젝트 정보
- 스타일: ${style}
- 포맷: 세로형 (1080x1920)
- 설명: ${description || "(스토리보드 이미지를 분석해서 자동으로 판단해주세요)"}

## 업로드된 이미지 파일들
${imageList}

## 요구사항
1. storyboard-schema-v2.json 형식에 맞춰 JSON을 생성해주세요
2. 각 이미지 내 **객체들을 분석**하여 독립 레이어로 분리해주세요
3. 인물, 배경, 텍스트, 도형(화살표 등)을 **각각 따로 애니메이션** 해주세요
4. **3D 카메라**를 활용하여 깊이감을 주세요
5. 요소들은 **순차적으로** 등장하게 해주세요 (0.2~0.5초 간격)
6. 전체 영상은 **15~30초** 정도로 구성해주세요
7. 각 씬마다 description에 **연출 의도**를 설명해주세요

## 중요
- 파일명은 위에 적힌 것을 **정확히** 사용해주세요
- 모든 요소가 동시에 등장하면 안 됩니다 (delay 사용)
- ancrid 수준의 고퀄리티 모션그래픽을 목표로 해주세요
- 텍스트는 한국어로 작성해주세요

JSON만 출력해주세요.`;
  };

  const handleCopyPrompt = async () => {
    const prompt = generatePrompt();
    await navigator.clipboard.writeText(prompt);
    setCopyPromptDone(true);
    setTimeout(() => setCopyPromptDone(false), 3000);
  };

  const handleJsonPaste = (text: string) => {
    setGeneratedJson(text);
  };

  const handleDownloadZip = async () => {
    if (!generatedJson) return;
    const JSZip = (await import("jszip")).default;
    const zip = new JSZip();

    let parsed: Record<string, unknown>;
    try {
      parsed = JSON.parse(generatedJson);
    } catch {
      alert("JSON 형식이 올바르지 않습니다.");
      return;
    }

    const projectName = (parsed.project as Record<string, string>)?.name || "ae_project";
    const folder = zip.folder(projectName)!;

    // JSON
    folder.file(`${projectName}.json`, generatedJson);

    // JSX script
    try {
      const jsxRes = await fetch("/ae_auto_pipeline.jsx");
      if (jsxRes.ok) folder.file("ae_auto_pipeline.jsx", await jsxRes.text());
    } catch {}

    // Images
    for (const img of images) {
      const res = await fetch(img.dataUrl);
      const blob = await res.blob();
      folder.file(img.name, blob);
    }

    // Instructions
    folder.file("사용법.txt",
      "=== AE Animation Studio v2 ===\n\n" +
      "1. After Effects 실행\n" +
      "2. 파일(F) > 스크립트(T) > 스크립트 파일 실행...\n" +
      "3. ae_auto_pipeline.jsx 선택\n" +
      "4. JSON 파일 선택\n" +
      "5. 자동 생성 완료!\n\n" +
      "MP4 출력: 컴포지션 > Adobe Media Encoder에 추가 (Ctrl+Alt+M)\n"
    );

    const blob = await zip.generateAsync({ type: "blob" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${projectName}.zip`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const styles = [
    { value: "cinematic", label: "시네마틱", desc: "3D 깊이감, 영화적 연출", icon: "🎬" },
    { value: "news", label: "뉴스/시사", desc: "빠른 컷, 강렬한 텍스트", icon: "📰" },
    { value: "documentary", label: "다큐멘터리", desc: "차분한 카메라, 자연스러운 전환", icon: "🎥" },
    { value: "bold", label: "임팩트", desc: "강렬한 등장, 빠른 전환", icon: "💥" },
    { value: "minimal", label: "미니멀", desc: "깔끔한 배치, 여백 활용", icon: "✨" },
    { value: "epic", label: "에픽", desc: "웅장한 스케일, 극적 연출", icon: "🏔️" },
    { value: "tech", label: "테크", desc: "미래적, 디지털 느낌", icon: "🤖" },
  ];

  return (
    <>
      <Navbar />
      <main className="pt-20 pb-8 px-4 max-w-5xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold mb-2">
            <span className="text-gradient">AI 자동 모션그래픽</span>
          </h1>
          <p className="text-white/50">
            이미지만 올리면 AI가 분석하여 고퀄리티 모션그래픽 JSON을 생성합니다
          </p>
        </div>

        {/* Steps */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <div className={`card-glass p-4 text-center ${images.length > 0 ? "border-green-500/30" : "border-ae-highlight/30"}`}>
            <div className="text-2xl mb-2">1</div>
            <div className="font-semibold text-sm">이미지 업로드</div>
            <div className="text-xs text-white/40">스토리보드 + 소스 이미지</div>
          </div>
          <div className={`card-glass p-4 text-center ${generatedJson ? "border-green-500/30" : ""}`}>
            <div className="text-2xl mb-2">2</div>
            <div className="font-semibold text-sm">AI가 JSON 생성</div>
            <div className="text-xs text-white/40">Claude에게 프롬프트 전달</div>
          </div>
          <div className="card-glass p-4 text-center">
            <div className="text-2xl mb-2">3</div>
            <div className="font-semibold text-sm">ZIP 다운로드</div>
            <div className="text-xs text-white/40">AE에서 바로 실행</div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left: Upload & Settings */}
          <div className="space-y-6">
            {/* Image Upload */}
            <div className="card-glass p-6">
              <h2 className="text-lg font-bold mb-4">1. 이미지 업로드</h2>
              <label className="flex flex-col items-center justify-center w-full h-40 border-2 border-dashed border-white/20 rounded-xl cursor-pointer hover:border-ae-highlight/50 hover:bg-white/[0.02] transition-all">
                <div className="text-4xl mb-2 opacity-40">📁</div>
                <span className="text-sm text-white/40">클릭하여 이미지 선택 (여러 개 가능)</span>
                <span className="text-xs text-white/25 mt-1">스토리보드 이미지 + 소스 이미지 모두 업로드</span>
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  className="hidden"
                  onChange={(e) => handleImageUpload(e.target.files)}
                />
              </label>

              {/* Uploaded Images Grid */}
              {images.length > 0 && (
                <div className="mt-4 grid grid-cols-3 gap-2">
                  {images.map((img, i) => (
                    <div key={i} className="relative group rounded-lg overflow-hidden border border-white/10">
                      <img src={img.dataUrl} alt={img.name} className="w-full h-24 object-cover" />
                      <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-all flex items-center justify-center">
                        <button
                          onClick={() => removeImage(i)}
                          className="text-red-400 text-xs bg-black/50 px-2 py-1 rounded"
                        >
                          삭제
                        </button>
                      </div>
                      <div className="absolute bottom-0 left-0 right-0 bg-black/70 px-1.5 py-0.5 text-[9px] text-white/60 truncate">
                        {img.name}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Style Selection */}
            <div className="card-glass p-6">
              <h2 className="text-lg font-bold mb-4">스타일 선택</h2>
              <div className="grid grid-cols-2 gap-2">
                {styles.map((s) => (
                  <button
                    key={s.value}
                    onClick={() => setStyle(s.value)}
                    className={`p-3 rounded-lg text-left transition-all ${
                      style === s.value
                        ? "bg-ae-highlight/20 border-2 border-ae-highlight"
                        : "bg-white/5 border-2 border-transparent hover:border-white/20"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span>{s.icon}</span>
                      <span className="text-sm font-semibold">{s.label}</span>
                    </div>
                    <div className="text-[10px] text-white/40 mt-1">{s.desc}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Description */}
            <div className="card-glass p-6">
              <h2 className="text-lg font-bold mb-4">영상 설명 (선택)</h2>
              <textarea
                className="input-field w-full h-24 resize-none"
                placeholder="어떤 느낌의 영상을 원하시나요? (비워두면 AI가 이미지를 보고 자동 판단합니다)"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>
          </div>

          {/* Right: Generate & Result */}
          <div className="space-y-6">
            {/* Generate Button */}
            <div className="card-glass p-6">
              <h2 className="text-lg font-bold mb-4">2. AI에게 전달</h2>
              <p className="text-sm text-white/50 mb-4">
                아래 버튼을 누르면 프롬프트가 복사됩니다.
                Claude 대화창에 <strong>이미지들과 함께</strong> 붙여넣기 하세요.
              </p>
              <button
                onClick={handleCopyPrompt}
                disabled={images.length === 0}
                className={`w-full py-4 rounded-xl font-bold text-lg transition-all ${
                  images.length === 0
                    ? "bg-white/10 text-white/30 cursor-not-allowed"
                    : copyPromptDone
                    ? "bg-green-500 text-white"
                    : "bg-gradient-to-r from-ae-highlight to-ae-purple text-white hover:opacity-90 hover:scale-[1.02] active:scale-[0.98]"
                }`}
              >
                {copyPromptDone ? "✓ 프롬프트 복사됨!" : "프롬프트 복사하기"}
              </button>

              {images.length === 0 && (
                <p className="text-xs text-yellow-400/60 mt-2 text-center">
                  먼저 이미지를 업로드해주세요
                </p>
              )}

              {/* How to use */}
              <div className="mt-4 bg-white/5 rounded-lg p-4 space-y-2 text-xs text-white/50">
                <div className="font-semibold text-white/70">사용 방법:</div>
                <div>1. 위 버튼으로 프롬프트 복사</div>
                <div>2. <strong>Claude 대화창</strong>을 열어주세요</div>
                <div>3. 업로드한 이미지들을 <strong>대화창에 드래그</strong></div>
                <div>4. 복사한 프롬프트를 <strong>붙여넣기</strong> 후 전송</div>
                <div>5. Claude가 생성한 JSON을 아래에 붙여넣기</div>
              </div>
            </div>

            {/* JSON Input */}
            <div className="card-glass p-6">
              <h2 className="text-lg font-bold mb-4">3. 생성된 JSON 붙여넣기</h2>
              <textarea
                className="input-field w-full h-48 resize-none font-mono text-xs"
                placeholder='Claude가 생성한 JSON을 여기에 붙여넣으세요...&#10;&#10;{&#10;  "project": {&#10;    "name": "...",&#10;    ...&#10;  }&#10;}'
                value={generatedJson}
                onChange={(e) => handleJsonPaste(e.target.value)}
              />
              {generatedJson && (
                <div className="mt-2">
                  {(() => {
                    try {
                      const p = JSON.parse(generatedJson);
                      const scenes = p.scenes?.length || 0;
                      const layers = p.scenes?.reduce((sum: number, s: { layers?: unknown[] }) => sum + (s.layers?.length || 0), 0) || 0;
                      return (
                        <div className="flex gap-3 text-xs">
                          <span className="text-green-400">✓ 유효한 JSON</span>
                          <span className="text-white/40">{scenes}개 씬</span>
                          <span className="text-white/40">{layers}개 레이어</span>
                        </div>
                      );
                    } catch {
                      return <span className="text-red-400 text-xs">✗ JSON 형식 오류</span>;
                    }
                  })()}
                </div>
              )}
            </div>

            {/* Download ZIP */}
            <div className="card-glass p-6">
              <button
                onClick={handleDownloadZip}
                disabled={!generatedJson}
                className={`w-full py-4 rounded-xl font-bold text-lg transition-all ${
                  !generatedJson
                    ? "bg-white/10 text-white/30 cursor-not-allowed"
                    : "bg-gradient-to-r from-green-500 to-emerald-600 text-white hover:opacity-90 hover:scale-[1.02] active:scale-[0.98] shadow-lg shadow-green-500/20"
                }`}
              >
                📦 프로젝트 ZIP 다운로드
              </button>
              <div className="mt-3 text-xs text-white/40 text-center">
                JSON + JSX 스크립트 + 이미지 전부 포함
              </div>
            </div>
          </div>
        </div>
      </main>
    </>
  );
}
