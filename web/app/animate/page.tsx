"use client";
import { useState, useCallback, useEffect } from "react";
import Navbar from "@/components/Navbar";
import {
  RIG_ACTION_PRESETS,
  RIG_ACTION_LABELS,
  RIG_MODE_LABELS,
  RIG_BODY_PART_LABELS,
  RIG_JOINT_MOTION_LABELS,
  BONE_HIERARCHY,
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

  // MIME 타입으로 실제 확장자 결정
  const mimeToExt = useCallback((mimeType: string): string => {
    const map: Record<string, string> = {
      "image/png": ".png",
      "image/jpeg": ".jpg",
      "image/jpg": ".jpg",
      "image/webp": ".webp",
      "image/gif": ".gif",
      "image/bmp": ".bmp",
      "image/tiff": ".tiff",
    };
    return map[mimeType] || ".png";
  }, []);

  // 파일명 정리 (실제 MIME 타입 기반 확장자 사용)
  const sanitizeFileName = useCallback((name: string, index: number, actualMime: string): string => {
    const lastDot = name.lastIndexOf(".");
    const ext = mimeToExt(actualMime);
    const base = lastDot >= 0 ? name.slice(0, lastDot) : name;
    const cleaned = base
      .replace(/[가-힣ㄱ-ㅎㅏ-ㅣ]/g, "")
      .replace(/\s+/g, "_")
      .replace(/[^a-zA-Z0-9_\-]/g, "")
      .replace(/_+/g, "_")
      .replace(/^_|_$/g, "");
    return (cleaned || `character_${index + 1}`) + ext;
  }, [mimeToExt]);

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
              name: sanitizeFileName(file.name, safeIndex, file.type),
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
      "=== AE 캐릭터 본 리깅 애니메이션 ===\n\n" +
      "[ 기본 사용법 ]\n" +
      "1. After Effects 실행 (CC 2020 이상 권장)\n" +
      "2. 파일(F) > 스크립트(T) > 스크립트 파일 실행...\n" +
      "3. ae_auto_pipeline.jsx 선택\n" +
      "4. 이 폴더의 JSON 파일 선택\n" +
      "5. 본(Bone) 리깅된 캐릭터가 자동으로 움직입니다!\n\n" +
      "[ 생성되는 구조 ]\n" +
      "- BONE_head, BONE_torso, BONE_right_arm... (Null 레이어 = 뼈대)\n" +
      "- 캐릭터 이미지 레이어 (CC Bend It 이펙트가 본의 회전을 따라감)\n" +
      "- 본끼리 부모-자식 관계: 몸통 움직이면 머리/팔이 자동으로 따라감\n\n" +
      "[ AE에서 수동 조정 ]\n" +
      "- BONE_xxx Null 레이어를 선택 → Rotation/Position 키프레임 수정\n" +
      "- CC Bend It의 Start/End 점을 이동하면 벤드 영역 변경\n" +
      "- 본의 Expression을 삭제하고 직접 키프레임 애니메이션 가능\n\n" +
      "[ DUIK Bassel 연동 (선택사항, 더 고급) ]\n" +
      "- DUIK 설치: rxlaboratory.org/tools/duik-angela\n" +
      "- 설치 후 JSX 실행 시 자동 감지됨\n" +
      "- DUIK의 IK/FK, Walk Cycle 등 고급 기능 활용 가능\n\n" +
      "[ 출력 ]\n" +
      "- MP4: 컴포지션 > Adobe Media Encoder에 추가 (Ctrl+Alt+M)\n" +
      "- GIF: Media Encoder에서 애니메이션 GIF 선택\n" +
      "- 프레임: 컴포지션 > 프레임을 파일로 저장\n"
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
            DUIK-Style 본(Bone) 리깅으로 캐릭터의 관절을 AI가 자동 분석 → 부모-자식 계층 구조의 자연스러운 애니메이션
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
                        <div className="text-[10px] text-green-400/70 mt-0.5">씬 {i + 1} · {animationDuration}초 · Bone Rig</div>
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

              {/* Body Parts with hierarchy info */}
              <div className="mb-3">
                <h3 className="text-[11px] text-white/60 font-medium mb-2">지원 신체 부위 (본 계층)</h3>
                <div className="flex flex-wrap gap-1.5">
                  {Object.entries(RIG_BODY_PART_LABELS).map(([key, label]) => {
                    const parent = BONE_HIERARCHY[key];
                    return (
                      <span key={key} className="bg-white/5 rounded px-2 py-0.5 text-[10px] text-white/50"
                            title={parent ? `부모: ${RIG_BODY_PART_LABELS[parent] || parent}` : "루트 본"}>
                        {label}
                        {parent && <span className="text-white/20 ml-0.5">← {RIG_BODY_PART_LABELS[parent] || parent}</span>}
                      </span>
                    );
                  })}
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

              {/* Key concepts */}
              <div className="space-y-1.5">
                <div className="bg-green-500/5 border border-green-500/15 rounded-lg p-2.5 text-[10px] text-white/50">
                  <span className="text-green-400 font-medium">Phase(위상)</span>: 좌우 대칭 부위 180° 차이, 연결 부위 30~90° 차이 → 자연스러운 연동
                </div>
                <div className="bg-blue-500/5 border border-blue-500/15 rounded-lg p-2.5 text-[10px] text-white/50">
                  <span className="text-blue-400 font-medium">좌표 시스템</span>: 퍼센트(0~100%) 기반 → 머리 x:50 y:12 = &quot;상단 가운데&quot;. 해상도에 무관하게 정확
                </div>
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
                  <span className="text-green-400 font-bold shrink-0">1.</span>
                  <span>캐릭터 일러스트/만화 이미지 업로드</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-green-400 font-bold shrink-0">2.</span>
                  <span>리깅 모드 선택 + 연출 설명 입력 (선택)</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-green-400 font-bold shrink-0">3.</span>
                  <span>&quot;캐릭터 리깅 애니메이션 생성&quot; 클릭 → AI가 관절 위치를 자동 분석</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-green-400 font-bold shrink-0">4.</span>
                  <span>ZIP 다운로드 → 한 폴더에 압축 해제</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-green-400 font-bold shrink-0">5.</span>
                  <span>After Effects → 파일 → 스크립트 실행 → <strong className="text-white/80">ae_auto_pipeline.jsx</strong> 선택</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-green-400 font-bold shrink-0">6.</span>
                  <span>JSON 선택 → 본(Bone) 리깅된 캐릭터가 자동으로 움직입니다!</span>
                </div>
              </div>
            </div>

            {/* Bone Rigging System Explanation */}
            <div className="card-glass p-5">
              <h2 className="text-base font-bold mb-3">본(Bone) 리깅 시스템</h2>
              <p className="text-[11px] text-white/50 mb-3">
                DUIK Bassel 방식의 본 계층 구조를 자동 생성합니다. 각 관절은 Null 레이어(뼈대)로 생성되며,
                부모-자식 관계로 연결되어 몸통이 움직이면 머리/팔이 자연스럽게 따라갑니다.
              </p>

              {/* Bone Hierarchy Visual */}
              <div className="bg-black/30 rounded-lg p-3 mb-3 font-mono text-[10px] leading-relaxed">
                <div className="text-yellow-400">BONE_hips <span className="text-white/30">(루트)</span></div>
                <div className="text-green-400 ml-3">├── BONE_torso <span className="text-white/30">(호흡)</span></div>
                <div className="text-green-400 ml-6">├── BONE_chest</div>
                <div className="text-blue-400 ml-9">├── BONE_neck → BONE_head <span className="text-white/30">(끄덕임)</span></div>
                <div className="text-yellow-300 ml-9">├── BONE_left_arm <span className="text-white/30">(흔들림 0°)</span></div>
                <div className="text-yellow-300 ml-9">└── BONE_right_arm <span className="text-white/30">(흔들림 180°)</span></div>
                <div className="text-purple-400 ml-3">├── BONE_left_leg</div>
                <div className="text-purple-400 ml-3">├── BONE_right_leg</div>
                <div className="text-pink-400 ml-3">└── BONE_tail <span className="text-white/30">(물결)</span></div>
              </div>

              {/* How it works */}
              <div className="space-y-2 text-[10px]">
                <div className="flex items-start gap-2">
                  <span className="text-green-400 font-bold shrink-0">A</span>
                  <span className="text-white/50"><strong className="text-white/80">Null 레이어</strong>가 뼈대 역할 → 각각 Rotation/Position에 Expression 자동 적용</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-green-400 font-bold shrink-0">B</span>
                  <span className="text-white/50"><strong className="text-white/80">부모-자식 연결</strong> → chest 본이 회전하면 head, arm 본이 함께 움직임</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-green-400 font-bold shrink-0">C</span>
                  <span className="text-white/50"><strong className="text-white/80">CC Bend It</strong>가 본의 회전값을 읽어서 이미지를 자연스럽게 변형</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-green-400 font-bold shrink-0">D</span>
                  <span className="text-white/50"><strong className="text-white/80">좌표는 퍼센트(%)</strong> → AI가 &quot;머리=상단50%&quot; 식으로 인식 → 정확도 UP</span>
                </div>
              </div>

              {/* AE Manual Editing Tips */}
              <div className="mt-3 bg-blue-500/10 border border-blue-500/20 rounded-lg p-2.5 text-[10px] text-blue-300/80">
                <strong>AE에서 수동 조정:</strong> BONE_xxx Null 레이어 선택 →
                R(Rotation), P(Position) 키프레임 직접 수정 가능.
                Expression 삭제 후 수동 키프레임 애니메이션도 OK!
              </div>
            </div>

            {/* DUIK Integration */}
            <div className="card-glass p-5">
              <h2 className="text-base font-bold mb-3">DUIK Bassel 연동 (선택)</h2>
              <p className="text-[11px] text-white/50 mb-3">
                DUIK가 설치되어 있으면 IK/FK, Walk Cycle 등 고급 기능을 활용할 수 있습니다.
                설치 없이도 본 리깅은 정상 작동합니다.
              </p>
              <div className="space-y-2 text-[10px]">
                <div className="flex items-start gap-2">
                  <span className="text-purple-400 font-bold shrink-0">1.</span>
                  <span className="text-white/50">
                    <a href="https://rxlaboratory.org/tools/duik-angela/" target="_blank" rel="noopener noreferrer"
                       className="text-purple-400 underline hover:text-purple-300">
                      DUIK Angela (무료) 다운로드
                    </a> → After Effects에 설치
                  </span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-purple-400 font-bold shrink-0">2.</span>
                  <span className="text-white/50">JSX 실행 시 자동으로 DUIK 설치 감지</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-purple-400 font-bold shrink-0">3.</span>
                  <span className="text-white/50">BONE_xxx Null 레이어를 선택 → DUIK 패널에서 IK 적용</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-purple-400 font-bold shrink-0">4.</span>
                  <span className="text-white/50">팔/다리에 IK → 손/발 컨트롤러만 움직이면 관절이 자동 구부러짐</span>
                </div>
              </div>

              <div className="mt-3 grid grid-cols-2 gap-2 text-[10px]">
                <div className="bg-white/5 rounded-lg p-2">
                  <div className="text-green-400 font-medium mb-1">기본 (DUIK 없이)</div>
                  <div className="text-white/40">본 계층 + CC Bend It + Expression 사인파. 자동 생성, 즉시 사용 가능</div>
                </div>
                <div className="bg-white/5 rounded-lg p-2">
                  <div className="text-purple-400 font-medium mb-1">고급 (DUIK 설치)</div>
                  <div className="text-white/40">+ IK/FK 전환 + Walk Cycle + Bezier IK + 컨트롤러 조작</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </>
  );
}
