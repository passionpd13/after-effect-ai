"use client";
import { useState, useCallback } from "react";
import Navbar from "@/components/Navbar";

interface UploadedImage {
  file: File;
  dataUrl: string;
  name: string;
  cutoutDataUrl?: string;
  cutoutName?: string;
  isProcessing?: boolean;
}

type Mode = "manual" | "auto";

export default function AiModePage() {
  const [images, setImages] = useState<UploadedImage[]>([]);
  const [description, setDescription] = useState("");
  const [style, setStyle] = useState("cinematic");

  // 시간 설정
  const [totalDuration, setTotalDuration] = useState(20);
  const [sceneDuration, setSceneDuration] = useState(5);
  const [format, setFormat] = useState("vertical");
  const [fps, setFps] = useState(30);
  const [generatedJson, setGeneratedJson] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [copyPromptDone, setCopyPromptDone] = useState(false);
  const [error, setError] = useState("");

  // API Keys (선택적)
  const [anthropicKey, setAnthropicKey] = useState("");
  const [removeBgKey, setRemoveBgKey] = useState("");
  const [showApiSettings, setShowApiSettings] = useState(false);
  const [mode, setMode] = useState<Mode>("manual");

  // 배경 제거 진행률
  const [bgRemoveProgress, setBgRemoveProgress] = useState({ done: 0, total: 0 });

  // 파일명을 AE 호환 영문으로 자동 변환
  const sanitizeFileName = useCallback((name: string, index: number): string => {
    // 확장자 분리
    const lastDot = name.lastIndexOf(".");
    const ext = lastDot >= 0 ? name.slice(lastDot).toLowerCase() : ".png";
    const base = lastDot >= 0 ? name.slice(0, lastDot) : name;

    // 영문/숫자/밑줄만 남기기
    const cleaned = base
      .replace(/[가-힣ㄱ-ㅎㅏ-ㅣ]/g, "") // 한글 제거
      .replace(/\s+/g, "_")              // 공백 → 밑줄
      .replace(/[^a-zA-Z0-9_\-]/g, "")   // 특수문자 제거
      .replace(/_+/g, "_")               // 연속 밑줄 정리
      .replace(/^_|_$/g, "");             // 앞뒤 밑줄 제거

    // 영문이 아무것도 안 남으면 image_N으로 대체
    const safeName = cleaned || `image_${index + 1}`;
    return safeName + ext;
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
            const safeName = sanitizeFileName(file.name, safeIndex);
            resolve({
              file,
              dataUrl: e.target?.result as string,
              name: safeName,  // AE 호환 영문 파일명
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

  // ── 배경 제거 (remove.bg API) ──
  const handleRemoveBg = async () => {
    if (!removeBgKey) {
      setError("remove.bg API 키를 입력해주세요");
      return;
    }
    setBgRemoveProgress({ done: 0, total: images.length });
    setError("");

    const updated = [...images];
    for (let i = 0; i < updated.length; i++) {
      updated[i] = { ...updated[i], isProcessing: true };
      setImages([...updated]);

      try {
        const formData = new FormData();
        formData.append("image", updated[i].file);
        formData.append("api_key", removeBgKey);

        const res = await fetch("/api/remove-bg", { method: "POST", body: formData });
        const data = await res.json();

        if (data.success) {
          updated[i] = {
            ...updated[i],
            cutoutDataUrl: data.image_base64,
            cutoutName: updated[i].name.replace(/\.[^.]+$/, "_cutout.png"),
            isProcessing: false,
          };
        } else {
          updated[i] = { ...updated[i], isProcessing: false };
          setError(`${updated[i].name}: ${data.error}`);
        }
      } catch (e) {
        updated[i] = { ...updated[i], isProcessing: false };
        setError(`${updated[i].name}: 처리 실패`);
      }

      setBgRemoveProgress({ done: i + 1, total: images.length });
      setImages([...updated]);
    }
  };

  // ── AI 자동 생성 (Anthropic API) ──
  const handleAutoGenerate = async () => {
    if (!anthropicKey) {
      setError("Anthropic API 키를 입력해주세요");
      return;
    }
    setIsGenerating(true);
    setError("");

    // 모든 이미지 (원본 + 컷아웃) 수집
    const allImages: { name: string; data_url: string; is_cutout?: boolean }[] = [];
    for (const img of images) {
      allImages.push({ name: img.name, data_url: img.dataUrl });
      if (img.cutoutDataUrl && img.cutoutName) {
        allImages.push({ name: img.cutoutName, data_url: img.cutoutDataUrl, is_cutout: true });
      }
    }

    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          api_key: anthropicKey,
          images: allImages,
          style,
          description,
          total_duration: totalDuration,
          scene_duration: sceneDuration,
          format,
          fps,
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

  // ── 수동 모드: 프롬프트 복사 ──
  const generatePrompt = () => {
    const imageList = images.map((img, i) => {
      let line = `${i + 1}. ${img.name} (원본)`;
      if (img.cutoutName) line += `\n   ${img.cutoutName} (배경 제거됨)`;
      return line;
    }).join("\n");

    const formatMap: Record<string, string> = {
      vertical: "세로형 (1080x1920)",
      horizontal: "가로형 (1920x1080)",
      square: "정사각형 (1080x1080)",
    };

    return `다음 이미지들로 고퀄리티 모션그래픽 영상용 JSON을 생성해주세요.

## 프로젝트 정보
- 스타일: ${style}
- 포맷: ${formatMap[format] || formatMap.vertical}
- FPS: ${fps}
- 전체 영상 길이: 약 ${totalDuration}초
- 씬당 평균 길이: ${sceneDuration}초
- 설명: ${description || "(이미지를 분석해서 자동으로 판단해주세요)"}

## 업로드된 이미지 파일들
${imageList}

## 요구사항
1. storyboard-schema-v2.json 형식에 맞춰 JSON 생성
2. 각 이미지 내 객체들을 분석하여 독립 레이어로 분리
3. _cutout.png 파일은 배경 제거된 객체 → 독립 레이어로 사용
4. 원본 이미지는 배경/전체샷으로 사용
5. 3D 카메라를 활용하여 깊이감
6. 요소들은 순차적으로 등장 (0.2~0.5초 간격)
7. ancrid 수준의 고퀄리티 모션그래픽
8. 텍스트는 한국어로 작성
9. settings.total_duration은 반드시 ${totalDuration}으로 설정
10. settings.fps는 ${fps}, settings.format은 "${format}"으로 설정

JSON만 출력해주세요.`;
  };

  const handleCopyPrompt = async () => {
    await navigator.clipboard.writeText(generatePrompt());
    setCopyPromptDone(true);
    setTimeout(() => setCopyPromptDone(false), 3000);
  };

  // ── ZIP 다운로드 ──
  const handleDownloadZip = async () => {
    if (!generatedJson) return;
    const JSZip = (await import("jszip")).default;
    const zip = new JSZip();

    let parsed: Record<string, unknown>;
    try { parsed = JSON.parse(generatedJson); } catch { alert("JSON 형식 오류"); return; }

    const projectName = (parsed.project as Record<string, string>)?.name || "ae_project";
    const folder = zip.folder(projectName)!;

    folder.file(`${projectName}.json`, generatedJson);

    try {
      const jsxRes = await fetch("/ae_auto_pipeline.jsx");
      if (jsxRes.ok) folder.file("ae_auto_pipeline.jsx", await jsxRes.text());
    } catch {}

    // 원본 이미지 + 컷아웃 이미지
    for (const img of images) {
      const res = await fetch(img.dataUrl);
      folder.file(img.name, await res.blob());
      if (img.cutoutDataUrl && img.cutoutName) {
        const cutRes = await fetch(img.cutoutDataUrl);
        folder.file(img.cutoutName, await cutRes.blob());
      }
    }

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
    { value: "documentary", label: "다큐멘터리", desc: "차분한 카메라워크", icon: "🎥" },
    { value: "bold", label: "임팩트", desc: "강렬한 등장, 빠른 전환", icon: "💥" },
    { value: "minimal", label: "미니멀", desc: "깔끔한 여백 활용", icon: "✨" },
    { value: "epic", label: "에픽", desc: "웅장한 스케일", icon: "🏔️" },
    { value: "tech", label: "테크", desc: "미래적 디지털 느낌", icon: "🤖" },
  ];

  const hasApiKeys = !!anthropicKey;
  const hasCutouts = images.some((img) => img.cutoutDataUrl);

  return (
    <>
      <Navbar />
      <main className="pt-20 pb-8 px-4 max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-6">
          <h1 className="text-3xl font-bold mb-2">
            <span className="text-gradient">AI 자동 모션그래픽</span>
          </h1>
          <p className="text-white/50 text-sm">
            이미지만 올리면 AI가 분석하여 고퀄리티 모션그래픽 JSON을 생성합니다
          </p>
        </div>

        {/* Mode Toggle */}
        <div className="flex justify-center mb-6">
          <div className="bg-white/5 p-1 rounded-lg flex gap-1">
            <button
              onClick={() => setMode("manual")}
              className={`px-5 py-2 rounded-md text-sm font-medium transition-all ${
                mode === "manual" ? "bg-ae-highlight text-white" : "text-white/60"
              }`}
            >
              수동 모드 (API 키 없이)
            </button>
            <button
              onClick={() => { setMode("auto"); setShowApiSettings(true); }}
              className={`px-5 py-2 rounded-md text-sm font-medium transition-all ${
                mode === "auto" ? "bg-ae-highlight text-white" : "text-white/60"
              }`}
            >
              자동 모드 (API 키 사용)
            </button>
          </div>
        </div>

        {/* API Settings (자동 모드) */}
        {mode === "auto" && (
          <div className="card-glass p-5 mb-6">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-bold">API 키 설정</h3>
              <span className="text-[10px] text-white/30">키는 서버로만 전송되며 저장되지 않습니다</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs text-white/50">
                  Anthropic API 키 <span className="text-ae-highlight">*필수</span>
                </label>
                <input
                  type="password"
                  className="input-field w-full text-sm"
                  placeholder="sk-ant-..."
                  value={anthropicKey}
                  onChange={(e) => setAnthropicKey(e.target.value)}
                />
                <div className="text-[10px] text-white/30">JSON 자동 생성에 사용</div>
              </div>
              <div className="space-y-1">
                <label className="text-xs text-white/50">
                  remove.bg API 키 <span className="text-white/30">(선택)</span>
                </label>
                <input
                  type="password"
                  className="input-field w-full text-sm"
                  placeholder="API 키..."
                  value={removeBgKey}
                  onChange={(e) => setRemoveBgKey(e.target.value)}
                />
                <div className="text-[10px] text-white/30">배경 제거에 사용 (없으면 원본 이미지만 사용)</div>
              </div>
            </div>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 mb-6 text-sm text-red-400">
            {error}
            <button onClick={() => setError("")} className="ml-2 text-red-300 hover:text-white">✕</button>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          {/* Left Column: Upload + Style */}
          <div className="lg:col-span-2 space-y-5">
            {/* Image Upload */}
            <div className="card-glass p-5">
              <h2 className="text-base font-bold mb-3">1. 이미지 업로드</h2>
              <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-white/20 rounded-xl cursor-pointer hover:border-ae-highlight/50 hover:bg-white/[0.02] transition-all">
                <div className="text-3xl mb-1 opacity-40">📁</div>
                <span className="text-xs text-white/40">여러 이미지를 한 번에 선택 가능</span>
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
                      <img src={img.dataUrl} alt="" className="w-12 h-12 rounded object-cover flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="text-xs truncate">{img.name}</div>
                        {img.cutoutDataUrl ? (
                          <div className="flex items-center gap-2 mt-1">
                            <img src={img.cutoutDataUrl} alt="" className="w-8 h-8 rounded object-contain bg-[#333] flex-shrink-0" />
                            <span className="text-[10px] text-green-400">✓ 배경 제거됨</span>
                          </div>
                        ) : img.isProcessing ? (
                          <span className="text-[10px] text-yellow-400 animate-pulse">처리 중...</span>
                        ) : null}
                      </div>
                      <button onClick={() => removeImage(i)} className="text-red-400/60 hover:text-red-400 text-xs px-2">✕</button>
                    </div>
                  ))}
                </div>
              )}

              {/* 배경 제거 버튼 */}
              {images.length > 0 && mode === "auto" && removeBgKey && (
                <button
                  onClick={handleRemoveBg}
                  disabled={bgRemoveProgress.total > 0 && bgRemoveProgress.done < bgRemoveProgress.total}
                  className="mt-3 w-full py-2.5 bg-ae-purple/20 border border-ae-purple/40 text-ae-purple rounded-lg text-sm font-medium hover:bg-ae-purple/30 transition-all disabled:opacity-50"
                >
                  {bgRemoveProgress.total > 0 && bgRemoveProgress.done < bgRemoveProgress.total
                    ? `배경 제거 중... (${bgRemoveProgress.done}/${bgRemoveProgress.total})`
                    : hasCutouts
                    ? "✓ 배경 제거 완료 (다시 실행)"
                    : "🔪 배경 제거하기 (객체 분리)"
                  }
                </button>
              )}

              {images.length > 0 && mode === "auto" && !removeBgKey && (
                <div className="mt-3 text-[10px] text-white/30 text-center">
                  remove.bg API 키를 입력하면 배경 제거 기능을 사용할 수 있습니다
                </div>
              )}
            </div>

            {/* Style */}
            <div className="card-glass p-5">
              <h2 className="text-base font-bold mb-3">스타일</h2>
              <div className="grid grid-cols-2 gap-1.5">
                {styles.map((s) => (
                  <button
                    key={s.value}
                    onClick={() => setStyle(s.value)}
                    className={`p-2.5 rounded-lg text-left transition-all ${
                      style === s.value
                        ? "bg-ae-highlight/20 border-2 border-ae-highlight"
                        : "bg-white/5 border-2 border-transparent hover:border-white/20"
                    }`}
                  >
                    <div className="flex items-center gap-1.5">
                      <span className="text-sm">{s.icon}</span>
                      <span className="text-xs font-semibold">{s.label}</span>
                    </div>
                    <div className="text-[9px] text-white/40 mt-0.5">{s.desc}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Time & Format Settings */}
            <div className="card-glass p-5">
              <h2 className="text-base font-bold mb-3">시간 / 포맷 설정</h2>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs text-white/50">전체 영상 길이</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="range"
                      min={5}
                      max={120}
                      step={5}
                      value={totalDuration}
                      onChange={(e) => setTotalDuration(parseInt(e.target.value))}
                      className="flex-1 accent-ae-highlight"
                    />
                    <span className="text-sm font-bold text-ae-highlight w-12 text-right">{totalDuration}초</span>
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-white/50">씬당 평균 길이</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="range"
                      min={2}
                      max={15}
                      step={0.5}
                      value={sceneDuration}
                      onChange={(e) => setSceneDuration(parseFloat(e.target.value))}
                      className="flex-1 accent-ae-highlight"
                    />
                    <span className="text-sm font-bold text-ae-highlight w-12 text-right">{sceneDuration}초</span>
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-white/50">포맷</label>
                  <select
                    className="select-field w-full text-sm"
                    value={format}
                    onChange={(e) => setFormat(e.target.value)}
                  >
                    <option value="vertical" className="bg-ae-dark">세로 (1080x1920)</option>
                    <option value="horizontal" className="bg-ae-dark">가로 (1920x1080)</option>
                    <option value="square" className="bg-ae-dark">정사각형 (1080x1080)</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-white/50">FPS</label>
                  <select
                    className="select-field w-full text-sm"
                    value={fps}
                    onChange={(e) => setFps(parseInt(e.target.value))}
                  >
                    <option value={24} className="bg-ae-dark">24 fps (시네마틱)</option>
                    <option value={30} className="bg-ae-dark">30 fps (기본)</option>
                    <option value={60} className="bg-ae-dark">60 fps (부드러움)</option>
                  </select>
                </div>
              </div>
              <div className="mt-3 text-[10px] text-white/30">
                예상 씬 수: 약 {Math.round(totalDuration / sceneDuration)}개
              </div>
            </div>

            {/* Description */}
            <div className="card-glass p-5">
              <h2 className="text-base font-bold mb-3">설명 (선택)</h2>
              <textarea
                className="input-field w-full h-20 resize-none text-sm"
                placeholder="어떤 느낌의 영상을 원하시나요?"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>
          </div>

          {/* Right Column: Generate + Result */}
          <div className="lg:col-span-3 space-y-5">
            {/* Generate */}
            <div className="card-glass p-5">
              <h2 className="text-base font-bold mb-3">
                2. {mode === "auto" ? "AI 자동 생성" : "프롬프트 복사 → Claude에 전달"}
              </h2>

              {mode === "auto" ? (
                <>
                  <button
                    onClick={handleAutoGenerate}
                    disabled={images.length === 0 || !anthropicKey || isGenerating}
                    className={`w-full py-4 rounded-xl font-bold text-lg transition-all ${
                      images.length === 0 || !anthropicKey
                        ? "bg-white/10 text-white/30 cursor-not-allowed"
                        : isGenerating
                        ? "bg-ae-highlight/50 text-white animate-pulse cursor-wait"
                        : "bg-gradient-to-r from-ae-highlight to-ae-purple text-white hover:opacity-90 hover:scale-[1.02] active:scale-[0.98] shadow-lg shadow-ae-highlight/20"
                    }`}
                  >
                    {isGenerating ? "🔄 AI가 분석 중... (30초~1분)" : "⚡ AI 자동 생성"}
                  </button>
                  {!anthropicKey && (
                    <p className="text-[10px] text-yellow-400/60 mt-2 text-center">Anthropic API 키를 먼저 입력해주세요</p>
                  )}
                </>
              ) : (
                <>
                  <button
                    onClick={handleCopyPrompt}
                    disabled={images.length === 0}
                    className={`w-full py-4 rounded-xl font-bold text-lg transition-all ${
                      images.length === 0
                        ? "bg-white/10 text-white/30 cursor-not-allowed"
                        : copyPromptDone
                        ? "bg-green-500 text-white"
                        : "bg-gradient-to-r from-ae-highlight to-ae-purple text-white hover:opacity-90 hover:scale-[1.02]"
                    }`}
                  >
                    {copyPromptDone ? "✓ 프롬프트 복사됨!" : "📋 프롬프트 복사하기"}
                  </button>
                  <div className="mt-3 bg-white/5 rounded-lg p-3 space-y-1.5 text-[11px] text-white/50">
                    <div className="font-semibold text-white/70">사용 방법:</div>
                    <div>1. 위 버튼으로 프롬프트 복사</div>
                    <div>2. Claude 대화창에 <strong>이미지들을 드래그</strong></div>
                    <div>3. 복사한 프롬프트를 <strong>붙여넣기</strong> 후 전송</div>
                    <div>4. 생성된 JSON을 아래에 붙여넣기</div>
                  </div>
                </>
              )}
            </div>

            {/* JSON Result */}
            <div className="card-glass p-5">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-base font-bold">3. 생성된 JSON</h2>
                {generatedJson && (() => {
                  try {
                    const p = JSON.parse(generatedJson);
                    const scenes = p.scenes?.length || 0;
                    const layers = p.scenes?.reduce((sum: number, s: { layers?: unknown[] }) => sum + (s.layers?.length || 0), 0) || 0;
                    return (
                      <div className="flex gap-2 text-[10px]">
                        <span className="text-green-400 bg-green-500/10 px-2 py-0.5 rounded-full">✓ 유효</span>
                        <span className="text-white/40">{scenes}씬</span>
                        <span className="text-white/40">{layers}레이어</span>
                      </div>
                    );
                  } catch { return <span className="text-red-400 text-[10px]">✗ 형식 오류</span>; }
                })()}
              </div>

              {mode === "manual" || !generatedJson ? (
                <textarea
                  className="input-field w-full h-48 resize-none font-mono text-[11px]"
                  placeholder={mode === "auto" ? "AI가 생성한 JSON이 여기에 표시됩니다..." : "Claude가 생성한 JSON을 여기에 붙여넣으세요..."}
                  value={generatedJson}
                  onChange={(e) => setGeneratedJson(e.target.value)}
                />
              ) : (
                <div className="bg-white/5 rounded-lg p-3 max-h-80 overflow-auto">
                  <pre className="text-[10px] text-white/60 font-mono whitespace-pre-wrap">{generatedJson}</pre>
                </div>
              )}

              {generatedJson && mode === "auto" && (
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(generatedJson);
                  }}
                  className="mt-2 text-xs text-white/50 hover:text-white"
                >
                  JSON 복사
                </button>
              )}
            </div>

            {/* Download ZIP */}
            <div className="card-glass p-5">
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
              <div className="mt-2 text-[10px] text-white/30 text-center">
                JSON + JSX 스크립트 + 원본 이미지 {hasCutouts && "+ 배경 제거 이미지"} 전부 포함
              </div>

              {/* What's included */}
              {generatedJson && (
                <div className="mt-3 bg-white/5 rounded-lg p-3 text-[10px] space-y-1 text-white/50">
                  <div className="text-white/70 font-semibold">ZIP 포함 파일:</div>
                  {images.map((img, i) => (
                    <div key={i}>
                      <span className="text-green-400">✓</span> {img.name}
                      {img.cutoutName && <><br /><span className="text-green-400 ml-2">✓</span> {img.cutoutName} (배경 제거)</>}
                    </div>
                  ))}
                  <div><span className="text-green-400">✓</span> ae_auto_pipeline.jsx</div>
                  <div><span className="text-green-400">✓</span> 프로젝트.json</div>
                  <div><span className="text-green-400">✓</span> 사용법.txt</div>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </>
  );
}
