"use client";
import { useState, useCallback } from "react";
import Navbar from "@/components/Navbar";
import SceneEditor from "@/components/SceneEditor";
import ScenePreview from "@/components/ScenePreview";
import ProjectSettings from "@/components/ProjectSettings";
import JsonPreview from "@/components/JsonPreview";
import Timeline from "@/components/Timeline";
import { Storyboard } from "@/lib/types";
import { createDefaultStoryboard, createDefaultScene } from "@/lib/default-data";

type Tab = "scenes" | "settings" | "json";

export default function EditorPage() {
  const [data, setData] = useState<Storyboard>(createDefaultStoryboard());
  const [activeScene, setActiveScene] = useState(0);
  const [tab, setTab] = useState<Tab>("scenes");
  // sceneId -> data URL mapping
  const [sceneImages, setSceneImages] = useState<Record<number, string>>({});

  const addScene = () => {
    const newId =
      data.scenes.length > 0
        ? Math.max(...data.scenes.map((s) => s.id)) + 1
        : 1;
    setData({
      ...data,
      scenes: [...data.scenes, createDefaultScene(newId)],
    });
    setActiveScene(data.scenes.length);
  };

  const updateScene = (index: number, scene: typeof data.scenes[0]) => {
    const scenes = [...data.scenes];
    scenes[index] = scene;
    setData({ ...data, scenes });
  };

  const deleteScene = (index: number) => {
    if (data.scenes.length <= 1) return;
    const sceneId = data.scenes[index].id;
    const scenes = data.scenes.filter((_, i) => i !== index);
    setData({ ...data, scenes });
    setActiveScene(Math.min(activeScene, scenes.length - 1));
    // Clean up image
    setSceneImages((prev) => {
      const next = { ...prev };
      delete next[sceneId];
      return next;
    });
  };

  const handleImageUpload = useCallback(
    (sceneId: number, file: File) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const dataUrl = e.target?.result as string;
        setSceneImages((prev) => ({ ...prev, [sceneId]: dataUrl }));
        // Auto-fill filename if empty
        const scene = data.scenes.find((s) => s.id === sceneId);
        if (scene && !scene.image.file) {
          const idx = data.scenes.findIndex((s) => s.id === sceneId);
          updateScene(idx, {
            ...scene,
            image: { ...scene.image, file: file.name },
          });
        }
      };
      reader.readAsDataURL(file);
    },
    [data.scenes]
  );

  const handleImageRemove = useCallback((sceneId: number) => {
    setSceneImages((prev) => {
      const next = { ...prev };
      delete next[sceneId];
      return next;
    });
  }, []);

  const handleImportJson = () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".json";
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      try {
        const text = await file.text();
        const parsed = JSON.parse(text) as Storyboard;
        setData(parsed);
        setActiveScene(0);
      } catch {
        alert("JSON 파일을 파싱할 수 없습니다.");
      }
    };
    input.click();
  };

  const tabs: { key: Tab; label: string }[] = [
    { key: "scenes", label: "씬 편집" },
    { key: "settings", label: "프로젝트 설정" },
    { key: "json", label: "JSON 미리보기" },
  ];

  const currentScene = data.scenes[activeScene];
  const currentImageUrl = currentScene
    ? sceneImages[currentScene.id]
    : undefined;

  return (
    <>
      <Navbar />
      <main className="pt-20 pb-8 px-4 max-w-[1400px] mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold">스토리보드 에디터</h1>
            <p className="text-sm text-white/50">
              이미지를 업로드하고, 효과를 설정하고, JSON을 다운로드하세요
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleImportJson}
              className="btn-secondary text-sm py-2"
            >
              JSON 불러오기
            </button>
            <button onClick={addScene} className="btn-primary text-sm py-2">
              + 씬 추가
            </button>
          </div>
        </div>

        {/* Timeline */}
        <div className="mb-6">
          <Timeline
            scenes={data.scenes}
            activeScene={activeScene}
            onSelectScene={setActiveScene}
          />
        </div>

        {/* Thumbnail strip */}
        <div className="mb-6 flex gap-2 overflow-x-auto pb-2">
          {data.scenes.map((scene, i) => (
            <button
              key={scene.id}
              onClick={() => setActiveScene(i)}
              className={`flex-shrink-0 rounded-lg overflow-hidden border-2 transition-all ${
                i === activeScene
                  ? "border-ae-highlight scale-105"
                  : "border-white/10 opacity-60 hover:opacity-100"
              }`}
              style={{ width: "80px", height: "140px" }}
            >
              {sceneImages[scene.id] ? (
                <img
                  src={sceneImages[scene.id]}
                  alt={`씬 ${scene.id}`}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full bg-white/5 flex flex-col items-center justify-center">
                  <span className="text-xl opacity-30">🖼️</span>
                  <span className="text-[9px] text-white/30 mt-1">씬 {scene.id}</span>
                </div>
              )}
              {/* Duration overlay */}
              <div className="relative">
                <span className="absolute -top-5 right-0.5 text-[8px] bg-black/70 px-1 rounded">
                  {scene.duration}s
                </span>
              </div>
            </button>
          ))}
        </div>

        {/* Tab Bar */}
        <div className="flex gap-1 mb-6 bg-white/5 p-1 rounded-lg w-fit">
          {tabs.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
                tab === t.key
                  ? "bg-ae-highlight text-white"
                  : "text-white/60 hover:text-white"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Content */}
        {tab === "scenes" && currentScene && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Preview Panel */}
            <div className="lg:col-span-4">
              <div className="sticky top-20">
                <h3 className="text-sm font-semibold text-white/60 mb-3">
                  씬 {currentScene.id} 미리보기
                </h3>
                <ScenePreview
                  scene={currentScene}
                  imageUrl={currentImageUrl}
                  isLast={activeScene === data.scenes.length - 1}
                />
              </div>
            </div>

            {/* Editor Panel */}
            <div className="lg:col-span-5">
              <div className="card-glass p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold">
                    씬 {currentScene.id} 편집
                  </h3>
                  <div className="flex gap-1">
                    <button
                      onClick={() =>
                        setActiveScene(Math.max(0, activeScene - 1))
                      }
                      disabled={activeScene === 0}
                      className="px-3 py-1 rounded bg-white/10 text-sm disabled:opacity-30"
                    >
                      이전
                    </button>
                    <button
                      onClick={() =>
                        setActiveScene(
                          Math.min(data.scenes.length - 1, activeScene + 1)
                        )
                      }
                      disabled={activeScene === data.scenes.length - 1}
                      className="px-3 py-1 rounded bg-white/10 text-sm disabled:opacity-30"
                    >
                      다음
                    </button>
                  </div>
                </div>
                <SceneEditor
                  scene={currentScene}
                  isLast={activeScene === data.scenes.length - 1}
                  imageUrl={currentImageUrl}
                  onChange={(scene) => updateScene(activeScene, scene)}
                  onDelete={() => deleteScene(activeScene)}
                  onImageUpload={(file) =>
                    handleImageUpload(currentScene.id, file)
                  }
                  onImageRemove={() => handleImageRemove(currentScene.id)}
                />
              </div>
            </div>

            {/* JSON Sidebar */}
            <div className="lg:col-span-3 hidden lg:block">
              <div className="card-glass p-4 sticky top-20">
                <h3 className="text-sm font-semibold text-white/70 mb-3">
                  JSON 미리보기
                </h3>
                <div className="max-h-[65vh] overflow-auto">
                  <pre className="text-[10px] leading-relaxed text-white/60 font-mono">
                    {JSON.stringify(
                      {
                        ...data,
                        settings: {
                          ...data.settings,
                          total_duration: data.scenes.reduce(
                            (sum, s) => sum + s.duration,
                            0
                          ),
                        },
                      },
                      null,
                      2
                    )}
                  </pre>
                </div>
                <div className="mt-3 flex gap-2">
                  <button
                    onClick={() => {
                      const jsonString = JSON.stringify(data, null, 2);
                      navigator.clipboard.writeText(jsonString);
                    }}
                    className="flex-1 text-xs py-2 bg-white/10 rounded hover:bg-white/20 transition-all"
                  >
                    복사
                  </button>
                  <button
                    onClick={() => {
                      const blob = new Blob(
                        [JSON.stringify(data, null, 2)],
                        { type: "application/json" }
                      );
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement("a");
                      a.href = url;
                      a.download = `${data.project.name || "storyboard"}.json`;
                      a.click();
                      URL.revokeObjectURL(url);
                    }}
                    className="flex-1 text-xs py-2 bg-ae-highlight rounded hover:bg-ae-highlight/80 transition-all"
                  >
                    다운로드
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {tab === "settings" && (
          <div className="max-w-3xl">
            <div className="card-glass p-6">
              <ProjectSettings data={data} onChange={setData} />
            </div>
          </div>
        )}

        {tab === "json" && (
          <div className="max-w-4xl">
            <div className="card-glass p-6">
              <JsonPreview data={data} />
            </div>
          </div>
        )}
      </main>
    </>
  );
}
