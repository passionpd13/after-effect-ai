"use client";
import { useState, useCallback, useEffect } from "react";
import Navbar from "@/components/Navbar";

interface UploadedImage {
  file: File;
  dataUrl: string;
  name: string;
}

export default function AnimatePage() {
  const [images, setImages] = useState<UploadedImage[]>([]);
  const [generatedJson, setGeneratedJson] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState("");
  const [isDragging, setIsDragging] = useState(false);

  // API Keys
  const [geminiKey, setGeminiKey] = useState("");
  const [geminiModel, setGeminiModel] = useState("gemini-2.5-flash");
  const [showApiSettings, setShowApiSettings] = useState(true);

  // 설정
  const [animationDuration, setAnimationDuration] = useState(5);
  const [description, setDescription] = useState("");

  // localStorage에서 키 복원
  useEffect(() => {
    try {
      const saved = localStorage.getItem("ae_studio_keys");
      if (saved) {
        const keys = JSON.parse(saved);
        if (keys.gemini) setGeminiKey(keys.gemini);
        if (keys.geminiModel) setGeminiModel(keys.geminiModel);
      }
    } catch {}
  }, []);

  // 키 저장
  useEffect(() => {
    try {
      const saved = localStorage.getItem("ae_studio_keys");
      const existing = saved ? JSON.parse(saved) : {};
      localStorage.setItem("ae_studio_keys", JSON.stringify({
        ...existing,
        gemini: geminiKey,
        geminiModel: geminiModel,
      }));
    } catch {}
  }, [geminiKey, geminiModel]);

  // 파일명 정리
  const sanitizeFileName = useCallback((name: string, index: number): string => {
    const lastDot = name.lastIndexOf(".");
    const ext = lastDot >= 0 ? name.slice(lastDot).toLowerCase() : ".png";
    const base = lastDot >= 0 ? name.slice(0, lastDot) : name;
    const cleaned = base
      .replace(/[가-힣ㄱ-ㅎㅏ-ㅣ]/g, "")
      .replace(/\s+/g, "_")
      .replace(/[^a-zA-Z0-9_\-]/g, "")
      .replace(/_+/g, "_")
      .replace(/^_|_$/g, "");
    return (cleaned || `character_${index + 1}`) + ext;
  }, []);

  const handleImageUpload = useCallback((files: FileList | null) => {
    if (!files) return;
    const newImages: Promise<UploadedImage>[] = [];
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (!file.type.startsWith("image/")) continue;
      const safeIndex = images.length + i;
      newImages.push(
        new Promise((resolve) => {
          const reader = new FileReader();
          reader.onload = (e) => {
            resolve({
              file,
              dataUrl: e.target?.result as string,
              name: sanitizeFileName(file.name, safeIndex),
            });
          };
          reader.readAsDataURL(file);
        })
      );
    }
    Promise.all(newImages).then((imgs) => setImages((prev) => [...prev, ...imgs]));
  }, [images.length, sanitizeFileName]);

  const removeImage = (index: number) => {
    setImages((prev) => prev.filter((_, i) => i !== index));
  };

  // AI 자동 생성
  const handleGenerate = async () => {
    if (!geminiKey) {
      setError("Gemini API 키를 입력해주세요");
      return;
    }
    if (images.length === 0) {
      setError("캐릭터 이미지를 업로드해주세요");
      return;
    }
    setIsGenerating(true);
    setError("");

    const allImages = images.map((img) => ({
      name: img.name,
      data_url: img.dataUrl,
      image_type: "character",
    }));

    try {
      const res = await fetch("/api/generate-gemini", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          api_key: geminiKey,
          model: geminiModel,
          images: allImages,
          style: "cinematic",
          description: (description ? description + "\n" : "") + "중요: 캐릭터 이미지 1장 = 씬 1개로 만들어주세요. 이미지 " + images.length + "장이면 씬 " + images.length + "개. 각 씬에서 해당 이미지의 캐릭터를 type: \"puppet\"으로 Puppet Pin 애니메이션 적용. 각 씬 duration = " + animationDuration + "초. 하나의 연결된 영상으로 씬 간 자연스러운 전환(crossfade) 적용. image_source.file은 반드시 업로드된 파일명 그대로 사용 (확장자 포함, .png로 임의 변경 금지): " + images.map((img) => img.name).join(", "),
          total_duration: animationDuration * images.length,
          scene_duration: animationDuration,
          format: "horizontal",
          fps: 30,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setGeneratedJson(data.json);
      } else {
        setError(data.error || "생성 실패");
        if (data.raw) setGeneratedJson(data.raw);
      }
    } catch (e) {
      setError(`요청 실패: ${(e as Error).message}`);
    }
    setIsGenerating(false);
  };

  // ZIP 다운로드
  const handleDownloadZip = async () => {
    if (!generatedJson) return;
    const JSZip = (await import("jszip")).default;
    const zip = new JSZip();

    let parsed: Record<string, unknown>;
    try { parsed = JSON.parse(generatedJson); } catch { alert("JSON 형식 오류"); return; }

    const projectName = (parsed.project as Record<string, string>)?.name || "ae_animate";
    const folder = zip.folder(projectName)!;
    folder.file(`${projectName}.json`, generatedJson);

    try {
      const jsxRes = await fetch("/ae_auto_pipeline.jsx");
      if (jsxRes.ok) folder.file("ae_auto_pipeline.jsx", await jsxRes.text());
    } catch {}

    for (const img of images) {
      const res = await fetch(img.dataUrl);
      folder.file(img.name, await res.blob());
    }

    folder.file("사용법.txt",
      "=== AE 캐릭터 애니메이션 ===\n\n" +
      "1. After Effects 실행\n" +
      "2. 파일(F) > 스크립트(T) > 스크립트 파일 실행...\n" +
      "3. ae_auto_pipeline.jsx 선택\n" +
      "4. JSON 파일 선택\n" +
      "5. Puppet Pin 애니메이션 자동 생성!\n\n" +
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

  return (
    <>
      <Navbar />
      <main className="pt-20 pb-8 px-4 max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-6">
          <h1 className="text-3xl font-bold mb-2">
            <span className="text-gradient">AI 캐릭터 애니메이션</span>
          </h1>
          <p className="text-white/50 text-sm">
            일러스트/만화 이미지를 올리면 AI가 Puppet Pin 애니메이션을 자동 생성합니다
          </p>
        </div>

        {/* Error */}
        {error && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 mb-6 text-sm text-red-400">
            {error}
            <button onClick={() => setError("")} className="ml-2 text-red-300 hover:text-white">✕</button>
          </div>
        )}

        {/* API Key */}
        <div className="card-glass p-5 mb-6">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-bold">Gemini API 키</h3>
            <button
              onClick={() => setShowApiSettings(!showApiSettings)}
              className="text-[10px] text-white/40 hover:text-white/70"
            >
              {showApiSettings ? "접기" : "펼치기"}
            </button>
          </div>
          {showApiSettings && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <input
                  type="password"
                  className="input-field w-full text-sm"
                  placeholder="AIza..."
                  value={geminiKey}
                  onChange={(e) => setGeminiKey(e.target.value)}
                />
                <div className="text-[10px] text-white/30">Google AI Studio에서 발급 (무료)</div>
              </div>
              <div className="space-y-1">
                <select
                  className="select-field w-full text-sm"
                  value={geminiModel}
                  onChange={(e) => setGeminiModel(e.target.value)}
                >
                  <option value="gemini-2.5-flash" className="bg-ae-dark">Gemini 2.5 Flash (빠름)</option>
                  <option value="gemini-2.5-pro" className="bg-ae-dark">Gemini 2.5 Pro (고품질)</option>
                  <option value="gemini-2.0-flash" className="bg-ae-dark">Gemini 2.0 Flash</option>
                </select>
              </div>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left: Upload */}
          <div className="space-y-5">
            {/* Image Upload */}
            <div className="card-glass p-5">
              <h2 className="text-base font-bold mb-3">1. 캐릭터 이미지 업로드</h2>
              <p className="text-[11px] text-white/40 mb-3">
                일러스트, 만화, 캐릭터 이미지를 올려주세요. AI가 분석하여 움직일 부위를 자동으로 찾습니다.
              </p>
              <label
                className={`flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-xl cursor-pointer transition-all ${
                  isDragging
                    ? "border-green-400 bg-green-500/10 scale-[1.01]"
                    : "border-green-500/30 hover:border-green-500/60 hover:bg-green-500/[0.02]"
                }`}
                onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                onDragEnter={(e) => { e.preventDefault(); setIsDragging(true); }}
                onDragLeave={(e) => { e.preventDefault(); setIsDragging(false); }}
                onDrop={(e) => {
                  e.preventDefault();
                  setIsDragging(false);
                  handleImageUpload(e.dataTransfer.files);
                }}
              >
                <div className="text-3xl mb-1 opacity-60">{isDragging ? "📂" : "🦴"}</div>
                <span className="text-xs text-white/40">
                  {isDragging ? "여기에 놓으세요!" : "클릭하거나 이미지를 드래그해서 놓으세요"}
                </span>
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  className="hidden"
                  onChange={(e) => handleImageUpload(e.target.files)}
                />
              </label>

              {images.length > 0 && (
                <div className="mt-3 space-y-2">
                  {images.map((img, i) => (
                    <div key={i} className="flex items-center gap-3 bg-white/5 rounded-lg p-2">
                      <img src={img.dataUrl} alt="" className="w-16 h-16 rounded object-contain bg-[#222] flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="text-xs truncate">{img.name}</div>
                        <div className="text-[10px] text-green-400/70 mt-0.5">씬 {i + 1} · {animationDuration}초 · Puppet Pin</div>
                      </div>
                      <button onClick={() => removeImage(i)} className="text-red-400/60 hover:text-red-400 text-xs px-2">✕</button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Settings */}
            <div className="card-glass p-5">
              <h2 className="text-base font-bold mb-3">설정</h2>
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-xs text-white/50">장당 애니메이션 길이</label>
                  <div className="flex items-center gap-3">
                    <input
                      type="range"
                      min={3}
                      max={30}
                      step={1}
                      value={animationDuration}
                      onChange={(e) => setAnimationDuration(parseInt(e.target.value))}
                      className="flex-1 accent-green-500 h-2"
                    />
                    <span className="text-lg font-bold text-green-400 w-14 text-right">{animationDuration}초</span>
                  </div>
                  <div className="flex justify-between text-[10px] text-white/30">
                    <span>3초</span>
                    <span>30초</span>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-xs text-white/50">연출 설명 (선택)</label>
                  <textarea
                    className="input-field w-full h-16 resize-none text-sm"
                    placeholder="예: 캐릭터가 고개를 끄덕이며 팔을 흔드는 느낌"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                  />
                </div>
              </div>
            </div>

            {/* Motion Presets Info */}
            <div className="card-glass p-5">
              <h2 className="text-base font-bold mb-3">지원 모션</h2>
              <div className="grid grid-cols-2 gap-2 text-[11px]">
                {[
                  { icon: "😊", name: "nod", desc: "머리 끄덕" },
                  { icon: "👋", name: "swing", desc: "팔/물건 흔들림" },
                  { icon: "🌊", name: "wave", desc: "망토/꼬리/바람" },
                  { icon: "💨", name: "breathe", desc: "호흡 (몸통)" },
                  { icon: "😰", name: "shake", desc: "떨림/긴장" },
                  { icon: "⬆️", name: "bob", desc: "위아래 반복" },
                  { icon: "🔄", name: "bend", desc: "구부리기" },
                ].map((m) => (
                  <div key={m.name} className="flex items-center gap-2 bg-white/5 rounded-md px-2 py-1.5">
                    <span>{m.icon}</span>
                    <div>
                      <span className="text-green-400 font-medium">{m.name}</span>
                      <span className="text-white/40 ml-1">{m.desc}</span>
                    </div>
                  </div>
                ))}
              </div>
              <p className="text-[10px] text-white/30 mt-2">
                AI가 이미지를 분석하여 적절한 모션을 자동 선택합니다
              </p>
            </div>
          </div>

          {/* Right: Generate + Result */}
          <div className="space-y-5">
            {/* Generate Button */}
            <div className="card-glass p-5">
              <h2 className="text-base font-bold mb-3">2. AI 애니메이션 생성</h2>
              <button
                onClick={handleGenerate}
                disabled={isGenerating || !geminiKey || images.length === 0}
                className="w-full py-4 rounded-xl text-sm font-bold transition-all disabled:opacity-40 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 text-white"
              >
                {isGenerating ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="animate-spin">⚙️</span> AI가 캐릭터를 분석하고 있습니다...
                  </span>
                ) : (
                  <span>🦴 Puppet Pin 애니메이션 생성</span>
                )}
              </button>
              {images.length > 0 && (
                <div className="mt-2 text-[10px] text-white/40 text-center">
                  {images.length}개 이미지 × {animationDuration}초 = 총 {images.length * animationDuration}초 영상 (씬 간 crossfade 전환)
                </div>
              )}
            </div>

            {/* Result JSON */}
            <div className="card-glass p-5">
              <h2 className="text-base font-bold mb-3">3. 생성 결과</h2>
              <textarea
                className="input-field w-full h-64 resize-none text-xs font-mono"
                placeholder="AI가 생성한 Puppet Pin 애니메이션 JSON이 여기에 표시됩니다..."
                value={generatedJson}
                onChange={(e) => setGeneratedJson(e.target.value)}
              />
            </div>

            {/* Download */}
            <button
              onClick={handleDownloadZip}
              disabled={!generatedJson}
              className="w-full py-4 rounded-xl text-sm font-bold transition-all disabled:opacity-30 bg-gradient-to-r from-ae-highlight to-ae-purple hover:from-ae-highlight/80 hover:to-ae-purple/80 text-white"
            >
              🎬 프로젝트 ZIP 다운로드
            </button>
            <p className="text-[10px] text-white/40 text-center">
              JSON + JSX 스크립트 + 원본 이미지 전부 포함
            </p>

            {/* How to use */}
            <div className="card-glass p-5">
              <h2 className="text-base font-bold mb-3">사용법</h2>
              <div className="space-y-2 text-[11px] text-white/60">
                <div className="flex items-start gap-2">
                  <span className="text-green-400 font-bold">1.</span>
                  <span>캐릭터 일러스트/만화 이미지 업로드</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-green-400 font-bold">2.</span>
                  <span>&quot;Puppet Pin 애니메이션 생성&quot; 클릭</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-green-400 font-bold">3.</span>
                  <span>ZIP 다운로드 → 압축 해제</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-green-400 font-bold">4.</span>
                  <span>After Effects → 파일 → 스크립트 실행 → JSX 선택</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-green-400 font-bold">5.</span>
                  <span>JSON 선택 → 캐릭터가 자동으로 움직입니다!</span>
                </div>
              </div>
              <div className="mt-3 bg-green-500/10 border border-green-500/20 rounded-lg p-2.5 text-[10px] text-green-400/80">
                배경 투명 PNG 권장 | 미세한 움직임 (2~15px) | 과한 동작은 이미지 왜곡 가능
              </div>
            </div>
          </div>
        </div>
      </main>
    </>
  );
}
