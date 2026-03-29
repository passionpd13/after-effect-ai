"use client";
import { useState, useCallback, useEffect } from "react";
import Navbar from "@/components/Navbar";

interface UploadedImage {
  file: File;
  dataUrl: string;
  name: string;
  imageType: "source" | "storyboard"; // 소스 이미지 or 스토리보드
  cutoutDataUrl?: string;
  cutoutName?: string;
  isProcessing?: boolean;
}

type Mode = "manual" | "auto";

export default function AiModePage() {
  const [images, setImages] = useState<UploadedImage[]>([]);
  const [description, setDescription] = useState("");
  const [style, setStyle] = useState("cinematic");

  // 시간 설정 (전체 영상 길이만 조절)
  const [videoDuration, setVideoDuration] = useState(15);
  const [format, setFormat] = useState("vertical");
  const [fps, setFps] = useState(30);
  const [generatedJson, setGeneratedJson] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [copyPromptDone, setCopyPromptDone] = useState(false);
  const [error, setError] = useState("");
  const [jsonValidation, setJsonValidation] = useState<{
    valid: boolean;
    errors: string[];
    warnings: string[];
    scenes: number;
    layers: number;
    referencedFiles: string[];
    missingFiles: string[];
    availableFiles: string[];
  } | null>(null);

  // JSON 검증 함수
  const validateJson = useCallback((jsonStr: string) => {
    if (!jsonStr.trim()) {
      setJsonValidation(null);
      return;
    }

    const errors: string[] = [];
    const warnings: string[] = [];
    let parsed: Record<string, unknown>;

    try {
      parsed = JSON.parse(jsonStr);
    } catch {
      setJsonValidation({ valid: false, errors: ["JSON 파싱 실패 - 형식이 올바르지 않습니다"], warnings: [], scenes: 0, layers: 0, referencedFiles: [], missingFiles: [], availableFiles: [] });
      return;
    }

    // 스키마+데이터 혼합 감지
    if (parsed.$schema || parsed.definitions || parsed.properties) {
      errors.push("스키마 정의가 포함되어 있습니다. 데이터만 있어야 합니다. ($schema, definitions, properties 제거 필요)");
    }

    // 필수 필드
    if (!parsed.project) errors.push("'project' 필드가 없습니다");
    if (!parsed.settings) errors.push("'settings' 필드가 없습니다");
    if (!parsed.scenes || !Array.isArray(parsed.scenes)) {
      errors.push("'scenes' 배열이 없습니다");
      setJsonValidation({ valid: false, errors, warnings, scenes: 0, layers: 0, referencedFiles: [], missingFiles: [], availableFiles: [] });
      return;
    }

    const scenes = parsed.scenes as Record<string, unknown>[];
    if (scenes.length === 0) errors.push("씬이 하나도 없습니다");

    // settings 검증
    const settings = parsed.settings as Record<string, unknown> | undefined;
    if (settings) {
      if (!settings.total_duration || (settings.total_duration as number) <= 0) {
        warnings.push("total_duration이 없거나 0입니다 (씬 합계로 자동 계산됨)");
      }
    }

    // 이미지 파일 참조 수집
    const referencedFiles: string[] = [];
    let totalLayers = 0;

    for (let si = 0; si < scenes.length; si++) {
      const scene = scenes[si] as Record<string, unknown>;
      const sceneLabel = `씬 ${(scene.id as number) || si + 1}`;

      if (!scene.duration || (scene.duration as number) <= 0) {
        errors.push(`${sceneLabel}: duration이 없거나 0입니다`);
      }

      // v1 형식
      if (scene.image) {
        const img = scene.image as Record<string, string>;
        if (img.file) referencedFiles.push(img.file);
      }

      // v2 형식
      if (scene.layers && Array.isArray(scene.layers)) {
        const layers = scene.layers as Record<string, unknown>[];
        totalLayers += layers.length;
        for (const layer of layers) {
          if (layer.image_source) {
            const src = layer.image_source as Record<string, string>;
            if (src.file && !referencedFiles.includes(src.file)) {
              referencedFiles.push(src.file);
            }
          }
        }
      }
    }

    // 업로드된 파일과 매칭
    const uploadedNames = images.map((img) => img.name);
    const cutoutNames = images.filter((img) => img.cutoutName).map((img) => img.cutoutName!);
    const allAvailable = [...uploadedNames, ...cutoutNames];
    const missingFiles = referencedFiles.filter((f) => !allAvailable.includes(f));

    if (missingFiles.length > 0) {
      errors.push(`${missingFiles.length}개 이미지 파일이 업로드되지 않았습니다:`);
      for (const f of missingFiles) {
        errors.push(`  → "${f}"`);
      }
    }

    setJsonValidation({
      valid: errors.length === 0,
      errors,
      warnings,
      scenes: scenes.length,
      layers: totalLayers,
      referencedFiles,
      missingFiles,
      availableFiles: allAvailable,
    });
  }, [images]);

  // JSON 변경 시 자동 검증
  const handleJsonChange = useCallback((text: string) => {
    setGeneratedJson(text);
    validateJson(text);
  }, [validateJson]);

  // API Keys (localStorage에서 복원)
  const [anthropicKey, setAnthropicKey] = useState("");
  const [geminiKey, setGeminiKey] = useState("");
  const [removeBgKey, setRemoveBgKey] = useState("");
  const [showApiSettings, setShowApiSettings] = useState(false);
  const [mode, setMode] = useState<Mode>("manual");
  const [aiProvider, setAiProvider] = useState<"gemini" | "anthropic">("gemini");
  const [geminiModel, setGeminiModel] = useState("gemini-2.5-flash");

  // localStorage에서 키 복원
  useEffect(() => {
    try {
      const saved = localStorage.getItem("ae_studio_keys");
      if (saved) {
        const keys = JSON.parse(saved);
        if (keys.gemini) setGeminiKey(keys.gemini);
        if (keys.anthropic) setAnthropicKey(keys.anthropic);
        if (keys.removebg) setRemoveBgKey(keys.removebg);
        if (keys.provider) setAiProvider(keys.provider);
        if (keys.geminiModel) setGeminiModel(keys.geminiModel);
      }
    } catch {}
  }, []);

  // 키 저장
  const saveKeys = useCallback(() => {
    try {
      localStorage.setItem("ae_studio_keys", JSON.stringify({
        gemini: geminiKey,
        anthropic: anthropicKey,
        removebg: removeBgKey,
        provider: aiProvider,
        geminiModel: geminiModel,
      }));
    } catch {}
  }, [geminiKey, anthropicKey, removeBgKey, aiProvider, geminiModel]);

  useEffect(() => {
    saveKeys();
  }, [saveKeys]);

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
              name: safeName,
              imageType: "source" as const, // 기본값: 소스 이미지
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

  const toggleImageType = (index: number) => {
    setImages((prev) =>
      prev.map((img, i) =>
        i === index
          ? { ...img, imageType: img.imageType === "source" ? "storyboard" : "source" }
          : img
      )
    );
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

  // ── AI 자동 생성 (Gemini / Anthropic API) ──
  const handleAutoGenerate = async () => {
    const currentKey = aiProvider === "gemini" ? geminiKey : anthropicKey;
    if (!currentKey) {
      setError(`${aiProvider === "gemini" ? "Gemini" : "Anthropic"} API 키를 입력해주세요`);
      return;
    }
    setIsGenerating(true);
    setError("");

    // 모든 이미지 (원본 + 컷아웃) 수집
    const allImages: { name: string; data_url: string; is_cutout?: boolean; image_type?: string }[] = [];
    for (const img of images) {
      allImages.push({ name: img.name, data_url: img.dataUrl, image_type: img.imageType });
      if (img.cutoutDataUrl && img.cutoutName) {
        allImages.push({ name: img.cutoutName, data_url: img.cutoutDataUrl, is_cutout: true });
      }
    }

    const endpoint = aiProvider === "gemini" ? "/api/generate-gemini" : "/api/generate";

    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          api_key: currentKey,
          model: aiProvider === "gemini" ? geminiModel : undefined,
          images: allImages,
          style,
          description,
          total_duration: videoDuration,
          scene_duration: videoDuration,
          format,
          fps,
        }),
      });
      const data = await res.json();
      if (data.success) {
        handleJsonChange(data.json);
      } else {
        setError(data.error || "생성 실패");
        if (data.raw) handleJsonChange(data.raw);
      }
    } catch (e) {
      setError(`요청 실패: ${(e as Error).message}`);
    }

    setIsGenerating(false);
  };

  // ── 수동 모드: 프롬프트 복사 ──
  const generatePrompt = () => {
    const hasCutoutsAvailable = images.some((img) => img.cutoutName);
    const storyboards = images.filter((img) => img.imageType === "storyboard");
    const sourceImages = images.filter((img) => img.imageType === "source");

    const storyboardList = storyboards.map((img, i) => `  📋 ${img.name} (스토리보드)`).join("\n");
    const sourceList = sourceImages.map((img, i) => {
      let line = `  🖼️ ${img.name} (소스 이미지)`;
      if (img.cutoutName && img.cutoutDataUrl) line += `\n     ${img.cutoutName} (배경 제거됨)`;
      return line;
    }).join("\n");
    const imageList = [storyboardList, sourceList].filter(Boolean).join("\n");

    const formatMap: Record<string, { label: string; w: number; h: number }> = {
      vertical: { label: "9:16 세로", w: 1080, h: 1920 },
      horizontal: { label: "16:9 가로", w: 1920, h: 1080 },
      square: { label: "1:1 정사각형", w: 1080, h: 1080 },
      vertical_4_5: { label: "4:5 세로", w: 1080, h: 1350 },
      horizontal_21_9: { label: "21:9 울트라와이드", w: 2560, h: 1080 },
      vertical_2_3: { label: "2:3 세로", w: 1080, h: 1620 },
    };
    const fmt = formatMap[format] || formatMap.vertical;

    const lines = [
      "이미지들을 분석하여 ancrid 수준의 고퀄리티 모션그래픽 JSON을 생성해주세요.",
      "",
      "## 프로젝트 설정",
      "- 스타일: " + style,
      "- 포맷: " + fmt.label + " (" + fmt.w + "x" + fmt.h + ")",
      "- FPS: " + fps,
      "- 전체 영상 길이: " + videoDuration + "초 (settings.total_duration = " + videoDuration + ")",
      description ? "- 설명: " + description : "- 이미지를 분석해서 내용에 맞게 자동 판단해주세요",
      "",
      "## 업로드된 이미지 (이 파일명만 사용!)",
      imageList,
      hasCutoutsAvailable ? "※ _cutout.png 파일은 배경 제거된 객체입니다" : "",
    ];

    if (storyboards.length > 0) {
      lines.push(
        "",
        "## 중요: 스토리보드 분석 지시",
        "표시된 이미지는 스토리보드입니다. 자세히 분석하여:",
        "1. 스토리보드에 그려진 레이아웃/배치를 그대로 따라하세요",
        "2. 화살표가 있으면 해당 방향으로 애니메이션 적용",
        "3. 텍스트가 적혀있으면 그 텍스트를 그 위치에 배치",
        "4. 위치/크기 표시가 있으면 position/scale에 반영",
        "5. 동작 지시(줌, 회전, 이동)가 있으면 animation/entrance에 반영",
        "6. 번호나 순서가 있으면 씬 순서와 등장 delay에 반영",
        "7. 스토리보드 이미지 자체는 영상에 사용하지 말 것!",
        "8. 소스 이미지만 영상의 레이어로 사용하세요"
      );
    }

    lines.push(
      "",
      "## 핵심: 모든 이미지를 하나의 영상에서 다양하게 연출!",
      "",
      "### 씬 구성 규칙",
      "- 이미지 1장 = 씬 1개가 아닙니다!",
      "- 한 씬에서 모든 이미지가 다양하게 등장/퇴장/재등장",
      "- 씬 수는 AI가 자유롭게 결정 (3~8개)",
      "- 각 씬에서 여러 이미지를 동시 배치",
      "- 같은 이미지를 여러 씬에서 재사용 가능",
      "",
      "### 필수 연출 요소",
      "- 화살표(arrow), 강조 박스(rectangle), 밑줄(line), 원(circle)",
      "- 텍스트: 제목, 부제, 설명, 라벨 등 여러 텍스트 레이어",
      "",
      "### 다양한 레이아웃",
      "- 전체화면 + 오버레이, 좌우분할, PIP, 격자, 배경블러+전경선명",
      "",
      "### 모션 다양성",
      "- 레이어마다 다른 entrance (fade_in만 반복 금지)",
      "- delay를 0.1~2초 범위로 어긋나게",
      "",
      "## JSON 형식 규칙",
      "1. 스키마 정의 없이 데이터 JSON만",
      "2. project, settings, scenes 필수",
      "3. settings.width=" + fmt.w + ", height=" + fmt.h + ", fps=" + fps + ", total_duration=" + videoDuration,
      "4. 각 씬 duration 합계 = " + videoDuration + "초",
      "5. 텍스트는 한국어",
      "6. 위 파일명만 사용 (존재하지 않는 파일명 금지)",
      "7. 이미지가 화면 밖으로 잘리면 안됨! fit_mode는 contain, position은 화면 안에서만",
      "8. scale 100 이상이면 position을 중앙(" + Math.round(fmt.w / 2) + "," + Math.round(fmt.h / 2) + ")에 가깝게",
      "",
      "JSON만 출력해주세요."
    );

    return lines.join("\n");
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
              <span className="text-[10px] text-green-400/70">키는 브라우저에 로컬 저장됩니다 (서버에 저장 안됨)</span>
            </div>

            {/* AI 엔진 선택 */}
            <div className="mb-4">
              <label className="text-xs text-white/50 mb-1.5 block">AI 엔진 선택</label>
              <div className="flex gap-2">
                <button
                  onClick={() => setAiProvider("gemini")}
                  className={`flex-1 py-2.5 px-4 rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-2 ${
                    aiProvider === "gemini"
                      ? "bg-blue-500/20 border-2 border-blue-500 text-blue-400"
                      : "bg-white/5 border-2 border-transparent text-white/50 hover:border-white/20"
                  }`}
                >
                  <span>🔷</span> Gemini
                  {geminiKey && <span className="text-[9px] text-green-400">● 키 저장됨</span>}
                </button>
                <button
                  onClick={() => setAiProvider("anthropic")}
                  className={`flex-1 py-2.5 px-4 rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-2 ${
                    aiProvider === "anthropic"
                      ? "bg-orange-500/20 border-2 border-orange-500 text-orange-400"
                      : "bg-white/5 border-2 border-transparent text-white/50 hover:border-white/20"
                  }`}
                >
                  <span>🟠</span> Claude (Anthropic)
                  {anthropicKey && <span className="text-[9px] text-green-400">● 키 저장됨</span>}
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* 선택된 AI 키 입력 */}
              <div className="space-y-1">
                {aiProvider === "gemini" ? (
                  <>
                    <label className="text-xs text-white/50">
                      Gemini API 키 <span className="text-blue-400">*필수</span>
                    </label>
                    <input
                      type="password"
                      className="input-field w-full text-sm"
                      placeholder="AIza..."
                      value={geminiKey}
                      onChange={(e) => setGeminiKey(e.target.value)}
                    />
                    <div className="text-[10px] text-white/30 mb-2">
                      Google AI Studio에서 발급 (무료 사용 가능)
                    </div>
                    <label className="text-xs text-white/50">모델</label>
                    <select
                      className="select-field w-full text-sm mt-1"
                      value={geminiModel}
                      onChange={(e) => setGeminiModel(e.target.value)}
                    >
                      <option value="gemini-2.5-flash" className="bg-ae-dark">Gemini 2.5 Flash (빠름, 무료)</option>
                      <option value="gemini-2.5-pro" className="bg-ae-dark">Gemini 2.5 Pro (고품질)</option>
                      <option value="gemini-2.0-flash" className="bg-ae-dark">Gemini 2.0 Flash</option>
                    </select>
                  </>
                ) : (
                  <>
                    <label className="text-xs text-white/50">
                      Anthropic API 키 <span className="text-orange-400">*필수</span>
                    </label>
                    <input
                      type="password"
                      className="input-field w-full text-sm"
                      placeholder="sk-ant-..."
                      value={anthropicKey}
                      onChange={(e) => setAnthropicKey(e.target.value)}
                    />
                    <div className="text-[10px] text-white/30">Anthropic Console에서 발급</div>
                  </>
                )}
              </div>

              {/* remove.bg 키 (항상 표시) */}
              <div className="space-y-1">
                <label className="text-xs text-white/50">
                  remove.bg API 키 <span className="text-white/30">(선택 - 배경 제거용)</span>
                </label>
                <input
                  type="password"
                  className="input-field w-full text-sm"
                  placeholder="API 키..."
                  value={removeBgKey}
                  onChange={(e) => setRemoveBgKey(e.target.value)}
                />
                <div className="text-[10px] text-white/30">없으면 원본 이미지만 사용</div>
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
                    <div key={i} className={`flex items-center gap-3 rounded-lg p-2 ${
                      img.imageType === "storyboard"
                        ? "bg-ae-purple/10 border border-ae-purple/30"
                        : "bg-white/5"
                    }`}>
                      <img src={img.dataUrl} alt="" className="w-12 h-12 rounded object-cover flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="text-xs truncate">{img.name}</div>
                        {/* 이미지 타입 토글 */}
                        <button
                          onClick={() => toggleImageType(i)}
                          className={`mt-1 text-[10px] px-2 py-0.5 rounded-full transition-all ${
                            img.imageType === "storyboard"
                              ? "bg-ae-purple/30 text-ae-purple border border-ae-purple/40"
                              : "bg-white/10 text-white/50 border border-white/10 hover:border-white/30"
                          }`}
                        >
                          {img.imageType === "storyboard" ? "📋 스토리보드" : "🖼️ 소스 이미지"}
                        </button>
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
                  <div className="text-[10px] text-white/30 text-center">
                    클릭하여 이미지 타입 변경: <span className="text-ae-purple">📋 스토리보드</span> = 연출 지시서 / <span className="text-white/50">🖼️ 소스</span> = 영상에 사용할 이미지
                  </div>
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

            {/* Settings */}
            <div className="card-glass p-5">
              <h2 className="text-base font-bold mb-3">설정</h2>
              <div className="space-y-4">
                {/* 영상 길이 */}
                <div className="space-y-2">
                  <label className="text-xs text-white/50">영상 길이</label>
                  <div className="flex items-center gap-3">
                    <input
                      type="range"
                      min={5}
                      max={60}
                      step={5}
                      value={videoDuration}
                      onChange={(e) => setVideoDuration(parseInt(e.target.value))}
                      className="flex-1 accent-ae-highlight h-2"
                    />
                    <span className="text-lg font-bold text-ae-highlight w-14 text-right">{videoDuration}초</span>
                  </div>
                  <div className="flex justify-between text-[10px] text-white/30">
                    <span>5초</span>
                    <span>60초</span>
                  </div>
                </div>

                {/* 영상 비율 */}
                <div className="space-y-2">
                  <label className="text-xs text-white/50">영상 비율</label>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { value: "vertical", label: "9:16 세로", desc: "쇼츠/릴스", w: 1080, h: 1920, icon: "📱" },
                      { value: "horizontal", label: "16:9 가로", desc: "유튜브", w: 1920, h: 1080, icon: "🖥️" },
                      { value: "square", label: "1:1 정사각형", desc: "인스타", w: 1080, h: 1080, icon: "📷" },
                      { value: "vertical_4_5", label: "4:5 세로", desc: "인스타 피드", w: 1080, h: 1350, icon: "📸" },
                      { value: "horizontal_21_9", label: "21:9 울트라와이드", desc: "시네마", w: 2560, h: 1080, icon: "🎬" },
                      { value: "vertical_2_3", label: "2:3 세로", desc: "핀터레스트", w: 1080, h: 1620, icon: "📌" },
                    ].map((f) => (
                      <button
                        key={f.value}
                        onClick={() => setFormat(f.value)}
                        className={`p-2 rounded-lg text-center transition-all ${
                          format === f.value
                            ? "bg-ae-highlight/20 border-2 border-ae-highlight"
                            : "bg-white/5 border-2 border-transparent hover:border-white/20"
                        }`}
                      >
                        <div className="text-sm">{f.icon}</div>
                        <div className="text-[10px] font-bold">{f.label}</div>
                        <div className="text-[9px] text-white/40">{f.desc}</div>
                        <div className="text-[8px] text-white/25">{f.w}x{f.h}</div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* FPS */}
                <div className="space-y-1">
                  <label className="text-xs text-white/50">FPS</label>
                  <div className="flex gap-2">
                    {[24, 30, 60].map((f) => (
                      <button
                        key={f}
                        onClick={() => setFps(f)}
                        className={`flex-1 py-1.5 rounded text-xs font-medium transition-all ${
                          fps === f
                            ? "bg-ae-highlight/20 border border-ae-highlight text-ae-highlight"
                            : "bg-white/5 border border-transparent text-white/50"
                        }`}
                      >
                        {f} fps
                      </button>
                    ))}
                  </div>
                </div>

                {/* 요약 */}
                {images.length > 0 && (
                  <div className="bg-white/5 rounded-lg p-3 text-xs text-white/50">
                    이미지 {images.length}장으로 <span className="text-ae-highlight font-bold">{videoDuration}초</span> 영상 생성
                    <span className="text-white/30 ml-1">(씬 구성, 연출, 타이밍 모두 AI가 결정)</span>
                  </div>
                )}
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
                  {(() => {
                    const currentKey = aiProvider === "gemini" ? geminiKey : anthropicKey;
                    const providerLabel = aiProvider === "gemini" ? "Gemini" : "Claude";
                    const providerIcon = aiProvider === "gemini" ? "🔷" : "🟠";
                    return (
                      <>
                        <button
                          onClick={handleAutoGenerate}
                          disabled={images.length === 0 || !currentKey || isGenerating}
                          className={`w-full py-4 rounded-xl font-bold text-lg transition-all ${
                            images.length === 0 || !currentKey
                              ? "bg-white/10 text-white/30 cursor-not-allowed"
                              : isGenerating
                              ? "bg-ae-highlight/50 text-white animate-pulse cursor-wait"
                              : "bg-gradient-to-r from-ae-highlight to-ae-purple text-white hover:opacity-90 hover:scale-[1.02] active:scale-[0.98] shadow-lg shadow-ae-highlight/20"
                          }`}
                        >
                          {isGenerating
                            ? `🔄 ${providerLabel}가 분석 중... (30초~1분)`
                            : `${providerIcon} ${providerLabel}로 자동 생성`}
                        </button>
                        {!currentKey && (
                          <p className="text-[10px] text-yellow-400/60 mt-2 text-center">
                            {providerLabel} API 키를 먼저 입력해주세요
                          </p>
                        )}
                      </>
                    );
                  })()}
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
              <h2 className="text-base font-bold mb-3">3. 생성된 JSON 붙여넣기</h2>

              <textarea
                className="input-field w-full h-48 resize-none font-mono text-[11px]"
                placeholder={"Claude가 생성한 JSON을 여기에 붙여넣으세요...\n\n{\n  \"project\": { ... },\n  \"settings\": { ... },\n  \"scenes\": [ ... ]\n}"}
                value={generatedJson}
                onChange={(e) => handleJsonChange(e.target.value)}
              />

              {/* 검증 결과 */}
              {jsonValidation && (
                <div className="mt-3 space-y-2">
                  {/* 상태 요약 */}
                  <div className={`rounded-lg p-3 text-sm ${
                    jsonValidation.valid
                      ? "bg-green-500/10 border border-green-500/30"
                      : "bg-red-500/10 border border-red-500/30"
                  }`}>
                    <div className="flex items-center justify-between mb-2">
                      <span className={`font-bold ${jsonValidation.valid ? "text-green-400" : "text-red-400"}`}>
                        {jsonValidation.valid ? "✅ JSON 검증 통과" : "❌ JSON 검증 실패"}
                      </span>
                      <div className="flex gap-2 text-[10px] text-white/50">
                        <span>{jsonValidation.scenes}씬</span>
                        <span>{jsonValidation.layers}레이어</span>
                        <span>이미지 {jsonValidation.referencedFiles.length}개 참조</span>
                      </div>
                    </div>

                    {/* 에러 */}
                    {jsonValidation.errors.length > 0 && (
                      <div className="space-y-1">
                        {jsonValidation.errors.map((err, i) => (
                          <div key={i} className="text-xs text-red-400">
                            {err.startsWith("  →") ? (
                              <span className="pl-4 text-red-300">{err}</span>
                            ) : (
                              <span>• {err}</span>
                            )}
                          </div>
                        ))}
                      </div>
                    )}

                    {/* 경고 */}
                    {jsonValidation.warnings.length > 0 && (
                      <div className="mt-1 space-y-1">
                        {jsonValidation.warnings.map((w, i) => (
                          <div key={i} className="text-xs text-yellow-400">⚠ {w}</div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* 파일 매칭 상세 */}
                  {jsonValidation.referencedFiles.length > 0 && (
                    <div className="bg-white/5 rounded-lg p-3">
                      <div className="text-[10px] text-white/40 font-semibold mb-1.5">JSON에서 참조하는 이미지 파일:</div>
                      <div className="space-y-0.5">
                        {jsonValidation.referencedFiles.map((f, i) => {
                          const exists = jsonValidation.availableFiles.includes(f);
                          return (
                            <div key={i} className={`text-[11px] flex items-center gap-1.5 ${exists ? "text-green-400" : "text-red-400"}`}>
                              <span>{exists ? "✓" : "✗"}</span>
                              <span className="font-mono">{f}</span>
                              {!exists && <span className="text-[9px] text-red-400/60">(업로드 필요)</span>}
                            </div>
                          );
                        })}
                      </div>
                      {jsonValidation.missingFiles.length > 0 && (
                        <div className="mt-2 text-[10px] text-red-400/70">
                          💡 누락된 파일을 위 이미지 업로드에서 추가하거나, JSON의 파일명을 업로드된 파일명에 맞게 수정하세요.
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Download ZIP */}
            <div className="card-glass p-5">
              <button
                onClick={handleDownloadZip}
                disabled={!generatedJson || (jsonValidation !== null && !jsonValidation.valid)}
                className={`w-full py-4 rounded-xl font-bold text-lg transition-all ${
                  !generatedJson || (jsonValidation !== null && !jsonValidation.valid)
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
