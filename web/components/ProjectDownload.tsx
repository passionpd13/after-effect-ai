"use client";
import { Storyboard } from "@/lib/types";

interface ProjectDownloadProps {
  data: Storyboard;
  sceneImages: Record<number, string>; // sceneId -> dataURL
}

async function dataUrlToBlob(dataUrl: string): Promise<Blob> {
  const res = await fetch(dataUrl);
  return res.blob();
}

function getExtFromDataUrl(dataUrl: string): string {
  const match = dataUrl.match(/^data:image\/(\w+);/);
  if (match) {
    const ext = match[1];
    if (ext === "jpeg") return "jpg";
    return ext;
  }
  return "png";
}

export default function ProjectDownload({ data, sceneImages }: ProjectDownloadProps) {
  const handleDownloadZip = async () => {
    const JSZip = (await import("jszip")).default;
    const zip = new JSZip();

    const folderName = data.project.name || "ae_project";
    const folder = zip.folder(folderName)!;

    // 1. JSON 파일
    const cleanData = {
      ...data,
      settings: {
        ...data.settings,
        total_duration: data.scenes.reduce((sum, s) => sum + s.duration, 0),
      },
    };
    folder.file(
      `${data.project.name || "storyboard"}.json`,
      JSON.stringify(cleanData, null, 2)
    );

    // 2. JSX 스크립트
    try {
      const jsxRes = await fetch("/ae_auto_pipeline.jsx");
      if (jsxRes.ok) {
        const jsxText = await jsxRes.text();
        folder.file("ae_auto_pipeline.jsx", jsxText);
      }
    } catch {
      // JSX fetch 실패시 스킵
    }

    // 3. 업로드된 이미지 파일들
    const imagePromises: Promise<void>[] = [];
    for (const scene of data.scenes) {
      const imageDataUrl = sceneImages[scene.id];
      if (imageDataUrl && scene.image.file) {
        const fileName = scene.image.file;
        imagePromises.push(
          dataUrlToBlob(imageDataUrl).then((blob) => {
            folder.file(fileName, blob);
          })
        );
      }
    }
    await Promise.all(imagePromises);

    // 4. 사용법 안내 텍스트
    folder.file(
      "사용법.txt",
      [
        "=== AE Animation Studio - 사용법 ===",
        "",
        "1. 이 폴더의 모든 파일을 그대로 유지하세요",
        "",
        "2. After Effects를 실행하세요",
        "",
        "3. 파일(F) > 스크립트(T) > 스크립트 파일 실행...",
        "   → 이 폴더의 'ae_auto_pipeline.jsx'를 선택",
        "",
        "4. JSON 파일 선택 다이얼로그가 나타나면",
        `   → '${data.project.name || "storyboard"}.json'을 선택`,
        "",
        "5. 자동으로 컴포지션, 레이어, 애니메이션이 생성됩니다!",
        "",
        "6. MP4로 출력하려면:",
        "   → 컴포지션 > Adobe Media Encoder에 추가 (Ctrl+Alt+M)",
        "   → Media Encoder에서 H.264 프리셋 선택",
        "   → 렌더링 시작",
        "",
        "=== 파일 목록 ===",
        `• ae_auto_pipeline.jsx (자동화 스크립트)`,
        `• ${data.project.name || "storyboard"}.json (스토리보드 설정)`,
        ...data.scenes
          .filter((s) => s.image.file)
          .map((s) => `• ${s.image.file} (씬 ${s.id} 이미지)`),
        "",
        "주의: 파일명을 변경하면 스크립트가 이미지를 찾지 못합니다!",
      ].join("\n")
    );

    // ZIP 생성 및 다운로드
    const blob = await zip.generateAsync({ type: "blob" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${folderName}.zip`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // 이미지 업로드 현황 계산
  const totalScenes = data.scenes.filter((s) => s.image.file).length;
  const uploadedImages = data.scenes.filter((s) => sceneImages[s.id]).length;
  const missingImages = data.scenes.filter(
    (s) => s.image.file && !sceneImages[s.id]
  );

  return (
    <div className="space-y-3">
      <button
        onClick={handleDownloadZip}
        className="w-full py-4 bg-gradient-to-r from-ae-highlight to-ae-purple text-white font-bold rounded-xl text-lg hover:opacity-90 transition-all hover:scale-[1.02] active:scale-[0.98] shadow-lg shadow-ae-highlight/20"
      >
        📦 프로젝트 ZIP 다운로드
      </button>

      {/* 포함 항목 */}
      <div className="bg-white/5 rounded-lg p-3 text-xs space-y-1.5">
        <div className="text-white/40 font-semibold mb-2">ZIP에 포함되는 파일:</div>
        <div className="flex items-center gap-2 text-white/70">
          <span className="text-green-400">✓</span>
          <span>{data.project.name || "storyboard"}.json</span>
          <span className="text-white/30">(스토리보드 설정)</span>
        </div>
        <div className="flex items-center gap-2 text-white/70">
          <span className="text-green-400">✓</span>
          <span>ae_auto_pipeline.jsx</span>
          <span className="text-white/30">(자동화 스크립트)</span>
        </div>
        <div className="flex items-center gap-2 text-white/70">
          <span className="text-green-400">✓</span>
          <span>사용법.txt</span>
          <span className="text-white/30">(간단 안내)</span>
        </div>

        {/* 이미지 상태 */}
        {data.scenes.map((scene) => {
          const hasImage = !!sceneImages[scene.id];
          const hasFile = !!scene.image.file;
          if (!hasFile) return null;
          return (
            <div key={scene.id} className="flex items-center gap-2 text-white/70">
              <span className={hasImage ? "text-green-400" : "text-yellow-400"}>
                {hasImage ? "✓" : "⚠"}
              </span>
              <span className={hasImage ? "" : "text-yellow-400"}>
                {scene.image.file}
              </span>
              <span className="text-white/30">
                (씬 {scene.id})
              </span>
              {!hasImage && (
                <span className="text-yellow-400/60 text-[10px]">
                  이미지 미업로드
                </span>
              )}
            </div>
          );
        })}
      </div>

      {/* 경고: 미업로드 이미지 */}
      {missingImages.length > 0 && (
        <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-3 text-xs text-yellow-400">
          <div className="font-bold mb-1">
            ⚠ {missingImages.length}개 이미지가 아직 업로드되지 않았습니다
          </div>
          <div className="text-yellow-400/70">
            업로드하지 않은 이미지는 ZIP에 포함되지 않습니다.
            AE에서 해당 이미지를 같은 폴더에 직접 넣어주세요.
          </div>
        </div>
      )}

      {/* 업로드 현황 */}
      {totalScenes > 0 && (
        <div className="flex items-center gap-2">
          <div className="flex-1 h-2 bg-white/10 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-green-500 to-green-400 rounded-full transition-all"
              style={{
                width: `${totalScenes > 0 ? (uploadedImages / totalScenes) * 100 : 0}%`,
              }}
            />
          </div>
          <span className="text-[10px] text-white/40">
            이미지 {uploadedImages}/{totalScenes}
          </span>
        </div>
      )}
    </div>
  );
}
