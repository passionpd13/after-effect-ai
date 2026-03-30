"use client";
import { useState, useCallback, useEffect } from "react";
import Navbar from "@/components/Navbar";
import {
  RIG_ACTION_PRESETS,
  RIG_ACTION_LABELS,
  RIG_MODE_LABELS,
  RIG_BODY_PART_LABELS,
  RIG_JOINT_MOTION_LABELS,
} from "@/lib/schema-data";

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
  const [rigMode, setRigMode] = useState<string>("advanced");
  const [actionPreset, setActionPreset] = useState<string>("");

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

  // 파일 바이트에서 실제 이미지 포맷 감지 (magic number 기반)
  const detectRealFormat = useCallback((arrayBuffer: ArrayBuffer): string => {
    const bytes = new Uint8Array(arrayBuffer.slice(0, 4));
    if (bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4E && bytes[3] === 0x47) return ".png";
    if (bytes[0] === 0xFF && bytes[1] === 0xD8 && bytes[2] === 0xFF) return ".jpg";
    if (bytes[0] === 0x47 && bytes[1] === 0x49 && bytes[2] === 0x46) return ".gif";
    if (bytes[0] === 0x42 && bytes[1] === 0x4D) return ".bmp";
    if (bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46) return ".webp";
    return ".png"; // 감지 실패 시 기본값
  }, []);

  // 파일명 정리 (실제 파일 바이트 기반 확장자 사용)
  const sanitizeFileName = useCallback((name: string, index: number, realExt: string): string => {
    const lastDot = name.lastIndexOf(".");
    const base = lastDot >= 0 ? name.slice(0, lastDot) : name;
    const cleaned = base
      .replace(/[가-힣ㄱ-ㅎㅏ-ㅣ]/g, "")
      .replace(/\s+/g, "_")
      .replace(/[^a-zA-Z0-9_\-]/g, "")
      .replace(/_+/g, "_")
      .replace(/^_|_$/g, "");
    return (cleaned || `character_${index + 1}`) + realExt;
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
          // ★ 파일 바이트를 직접 읽어서 실제 포맷 감지 (browser MIME 무시)
          const bufReader = new FileReader();
          bufReader.onload = (bufEvent) => {
            const realExt = detectRealFormat(bufEvent.target?.result as ArrayBuffer);
            const safeName = sanitizeFileName(file.name, safeIndex, realExt);
            const urlReader = new FileReader();
            urlReader.onload = (urlEvent) => {
              resolve({
                file,
                dataUrl: urlEvent.target?.result as string,
                name: safeName,
              });
            };
            urlReader.readAsDataURL(file);
          };
          bufReader.readAsArrayBuffer(file.slice(0, 8)); // 처음 8바이트만 읽기
        })
      );
    }
    Promise.all(newImages).then((imgs) => setImages((prev) => [...prev, ...imgs]));
  }, [images.length, sanitizeFileName, detectRealFormat]);

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
      const rigDesc = description || "";
      const actionHint = actionPreset ? `\n캐릭터 액션: ${RIG_ACTION_LABELS[actionPreset] || actionPreset}` : "";
      const modeHint = rigMode === "action" && actionPreset ? `\nrig_mode: "action", action: "${actionPreset}" 사용` : `\nrig_mode: "${rigMode}" 사용`;

      const res = await fetch("/api/generate-gemini", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          api_key: geminiKey,
          model: geminiModel,
          images: allImages,
          mode: "animate",
          style: "cinematic",
          description: rigDesc + actionHint + modeHint,
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
      folder.file(img.name, img.file);
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
            <span className="text-gradient">AI 캐릭터 리깅 애니메이션</span>
          </h1>
          <p className="text-white/50 text-sm">
            일러스트/만화 캐릭터의 관절을 AI가 자동 분석하여 자연스럽게 움직이는 애니메이션을 생성합니다
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

            {/* Rig Settings */}
            <div className="card-glass p-5">
              <h2 className="text-base font-bold mb-3">리깅 설정</h2>
              <div className="space-y-4">
                {/* Rig Mode */}
                <div className="space-y-2">
                  <label className="text-xs text-white/50">리깅 모드</label>
                  <div className="grid grid-cols-3 gap-2">
                    {(["simple", "advanced", "action"] as const).map((mode) => (
                      <button
                        key={mode}
                        onClick={() => {
                          setRigMode(mode);
                          if (mode !== "action") setActionPreset("");
                        }}
                        className={`py-2 px-2 rounded-lg text-[11px] font-medium transition-all ${
                          rigMode === mode
                            ? "bg-green-500/20 border border-green-500/50 text-green-400"
                            : "bg-white/5 border border-white/10 text-white/50 hover:border-white/30"
                        }`}
                      >
                        {RIG_MODE_LABELS[mode]}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Action Preset (when action mode) */}
                {rigMode === "action" && (
                  <div className="space-y-2">
                    <label className="text-xs text-white/50">액션 프리셋</label>
                    <div className="grid grid-cols-3 gap-1.5">
                      {RIG_ACTION_PRESETS.map((act) => (
                        <button
                          key={act}
                          onClick={() => setActionPreset(act)}
                          className={`py-1.5 px-2 rounded-md text-[10px] transition-all ${
                            actionPreset === act
                              ? "bg-green-500/20 border border-green-500/50 text-green-400"
                              : "bg-white/5 border border-white/10 text-white/40 hover:border-white/20"
                          }`}
                        >
                          {RIG_ACTION_LABELS[act]}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Duration */}
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

                {/* Description */}
                <div className="space-y-2">
                  <label className="text-xs text-white/50">연출 설명 (선택)</label>
                  <textarea
                    className="input-field w-full h-16 resize-none text-sm"
                    placeholder="예: 캐릭터가 무서워서 떨고 있는 느낌, 팔을 흔들며 인사하는 모습"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                  />
                </div>
              </div>
            </div>

            {/* Body Parts & Joint Motions Reference */}
            <div className="card-glass p-5">
              <h2 className="text-base font-bold mb-3">관절 리깅 시스템</h2>

              {/* Body Parts */}
              <div className="mb-3">
                <h3 className="text-[11px] text-white/60 font-medium mb-2">지원 신체 부위</h3>
                <div className="flex flex-wrap gap-1.5">
                  {Object.entries(RIG_BODY_PART_LABELS).map(([key, label]) => (
                    <span key={key} className="bg-white/5 rounded px-2 py-0.5 text-[10px] text-white/50">
                      {label}
                    </span>
                  ))}
                </div>
              </div>

              {/* Joint Motions */}
              <div className="mb-3">
                <h3 className="text-[11px] text-white/60 font-medium mb-2">관절 모션 타입</h3>
                <div className="grid grid-cols-2 gap-1.5 text-[10px]">
                  {Object.entries(RIG_JOINT_MOTION_LABELS).map(([key, label]) => (
                    <div key={key} className="flex items-center gap-1.5 bg-white/5 rounded-md px-2 py-1">
                      <span className="text-green-400 font-mono font-medium">{key}</span>
                      <span className="text-white/40">{label}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Phase Explanation */}
              <div className="bg-green-500/5 border border-green-500/15 rounded-lg p-2.5 text-[10px] text-white/50">
                <span className="text-green-400 font-medium">Phase(위상)</span>으로 관절이 연동됩니다.
                좌우 대칭 부위는 180° 차이, 연결 부위는 30~90° 차이로 자연스러운 동작을 만듭니다.
              </div>
            </div>
          </div>

          {/* Right: Generate + Result */}
          <div className="space-y-5">
            {/* Generate Button */}
            <div className="card-glass p-5">
              <h2 className="text-base font-bold mb-3">2. AI 관절 리깅 생성</h2>
              <button
                onClick={handleGenerate}
                disabled={isGenerating || !geminiKey || images.length === 0}
                className="w-full py-4 rounded-xl text-sm font-bold transition-all disabled:opacity-40 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 text-white"
              >
                {isGenerating ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="animate-spin">⚙️</span> AI가 캐릭터 관절을 분석하고 있습니다...
                  </span>
                ) : (
                  <span>🦴 캐릭터 리깅 애니메이션 생성</span>
                )}
              </button>
              {images.length > 0 && (
                <div className="mt-2 text-[10px] text-white/40 text-center">
                  {images.length}개 이미지 × {animationDuration}초 = 총 {images.length * animationDuration}초 영상
                  {rigMode === "action" && actionPreset && (
                    <span className="text-green-400/60 ml-1">({RIG_ACTION_LABELS[actionPreset]})</span>
                  )}
                </div>
              )}
            </div>

            {/* Result JSON */}
            <div className="card-glass p-5">
              <h2 className="text-base font-bold mb-3">3. 생성 결과</h2>
              <textarea
                className="input-field w-full h-64 resize-none text-xs font-mono"
                placeholder="AI가 생성한 캐릭터 리깅 애니메이션 JSON이 여기에 표시됩니다..."
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
                  <span>리깅 모드 선택 (간단/고급/액션)</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-green-400 font-bold">3.</span>
                  <span>&quot;캐릭터 리깅 애니메이션 생성&quot; 클릭</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-green-400 font-bold">4.</span>
                  <span>ZIP 다운로드 → 압축 해제</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-green-400 font-bold">5.</span>
                  <span>After Effects → 파일 → 스크립트 실행 → JSX 선택</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-green-400 font-bold">6.</span>
                  <span>JSON 선택 → 관절이 리깅된 캐릭터가 자동으로 움직입니다!</span>
                </div>
              </div>
              <div className="mt-3 bg-green-500/10 border border-green-500/20 rounded-lg p-2.5 text-[10px] text-green-400/80">
                배경 투명 PNG 권장 | 관절별 독립 모션 | phase(위상)으로 자연스러운 연동 | 최대 8개 CC Bend It 스태킹
              </div>
            </div>
          </div>
        </div>
      </main>
    </>
  );
}
