"use client";
import { useState } from "react";

interface StepProps {
  number: number;
  total: number;
  title: string;
  description: string;
  children: React.ReactNode;
  tip?: string;
}

function Step({ number, total, title, description, children, tip }: StepProps) {
  return (
    <div className="card-glass p-6 space-y-4">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-ae-highlight flex items-center justify-center font-bold text-lg flex-shrink-0">
          {number}
        </div>
        <div>
          <div className="text-[11px] text-white/40">STEP {number} / {total}</div>
          <h3 className="text-lg font-bold">{title}</h3>
        </div>
      </div>
      <p className="text-sm text-white/60 leading-relaxed">{description}</p>
      {children}
      {tip && (
        <div className="bg-ae-gold/10 border border-ae-gold/30 rounded-lg p-3 text-sm text-ae-gold">
          <span className="font-bold">TIP:</span> {tip}
        </div>
      )}
    </div>
  );
}

/* ── After Effects 메뉴 바 모킹 ── */
function AeMenuBar({ highlight }: { highlight?: string }) {
  const menus = ["파일(F)", "편집(E)", "컴포지션(C)", "레이어(L)", "효과(T)", "애니메이션(A)", "보기(V)", "창(W)", "도움말(H)"];
  return (
    <div className="bg-[#2b2b2b] border-b border-[#1a1a1a] px-2 py-1 flex items-center gap-0.5 text-[12px] font-medium select-none">
      <div className="text-[#9999ff] font-bold mr-3 text-sm">Ae</div>
      {menus.map((m) => (
        <div
          key={m}
          className={`px-2.5 py-1 rounded-sm ${
            highlight === m
              ? "bg-[#4a90d9] text-white"
              : "text-[#cccccc] hover:bg-[#3a3a3a]"
          }`}
        >
          {m}
        </div>
      ))}
    </div>
  );
}

/* ── File 드롭다운 모킹 ── */
function AeFileMenu({ highlight }: { highlight?: string }) {
  const items = [
    { label: "새로 만들기(N)", shortcut: ">" },
    { label: "프로젝트 열기(O)...", shortcut: "Ctrl+O" },
    { label: "팀 프로젝트 열기...", shortcut: "" },
    { label: "최근 사용한 파일 열기", shortcut: ">" },
    { label: "Bridge에서 찾아보기...", shortcut: "Ctrl+Alt+Shift+O" },
    { label: "---", shortcut: "" },
    { label: "닫기(C)", shortcut: "Ctrl+W" },
    { label: "프로젝트 닫기", shortcut: "" },
    { label: "저장(S)", shortcut: "Ctrl+S" },
    { label: "다른 이름으로 저장(S)", shortcut: ">" },
    { label: "증분 및 저장", shortcut: "Ctrl+Alt+Shift+S" },
    { label: "되돌리기(R)", shortcut: "" },
    { label: "---", shortcut: "" },
    { label: "가져오기(I)", shortcut: ">" },
    { label: "최근 푸티지 가져오기", shortcut: ">" },
    { label: "내보내기(X)", shortcut: ">" },
    { label: "Adobe에서 글꼴 추가", shortcut: "" },
    { label: "---", shortcut: "" },
    { label: "스크립트(T)", shortcut: ">", children: true },
    { label: "---", shortcut: "" },
    { label: "프로젝트 설정...", shortcut: "" },
  ];
  return (
    <div className="bg-[#383838] border border-[#555] rounded shadow-2xl py-1 w-64 text-[12px]">
      {items.map((item, i) =>
        item.label === "---" ? (
          <div key={i} className="border-b border-[#555] my-1" />
        ) : (
          <div
            key={item.label}
            className={`px-4 py-1.5 flex justify-between items-center ${
              highlight === item.label
                ? "bg-[#4a90d9] text-white"
                : "text-[#cccccc] hover:bg-[#4a4a4a]"
            }`}
          >
            <span>{item.label}</span>
            <span className="text-[10px] text-[#888]">{item.shortcut}</span>
          </div>
        )
      )}
    </div>
  );
}

/* ── Scripts 서브메뉴 모킹 ── */
function AeScriptsMenu({ highlight }: { highlight?: string }) {
  const items = [
    "스크립트 편집기 열기...",
    "스크립트 파일 실행...",
    "---",
    "ScriptUI 패널 설치...",
  ];
  return (
    <div className="bg-[#383838] border border-[#555] rounded shadow-2xl py-1 w-56 text-[12px]">
      {items.map((item, i) =>
        item === "---" ? (
          <div key={i} className="border-b border-[#555] my-1" />
        ) : (
          <div
            key={item}
            className={`px-4 py-1.5 ${
              highlight === item
                ? "bg-[#4a90d9] text-white"
                : "text-[#cccccc] hover:bg-[#4a4a4a]"
            }`}
          >
            {item}
          </div>
        )
      )}
    </div>
  );
}

/* ── 파일 탐색기 다이얼로그 모킹 ── */
function FileDialog({ fileType, fileName, folder }: { fileType: string; fileName: string; folder: string }) {
  return (
    <div className="bg-[#f0f0f0] border border-[#999] rounded-lg shadow-2xl overflow-hidden text-black max-w-lg">
      {/* Title bar */}
      <div className="bg-[#e0e0e0] border-b border-[#ccc] px-4 py-2 flex items-center justify-between">
        <span className="text-sm font-medium">{fileType === "jsx" ? "스크립트 파일 선택" : "JSON 파일 선택"}</span>
        <div className="flex gap-1.5">
          <div className="w-3 h-3 rounded-full bg-[#ff5f57]" />
          <div className="w-3 h-3 rounded-full bg-[#febc2e]" />
          <div className="w-3 h-3 rounded-full bg-[#28c840]" />
        </div>
      </div>
      {/* Path bar */}
      <div className="bg-white border-b border-[#ddd] px-4 py-2 text-xs text-[#666] flex items-center gap-1">
        <span className="text-[#999]">경로:</span>
        <span className="bg-[#e8e8e8] px-2 py-0.5 rounded">{folder}</span>
      </div>
      {/* File list */}
      <div className="bg-white p-2 space-y-0.5 min-h-[120px]">
        {fileType === "jsx" ? (
          <>
            <div className="flex items-center gap-2 px-3 py-1.5 rounded bg-[#0058d0] text-white text-sm">
              <span>📄</span>
              <span className="font-medium">ae_auto_pipeline.jsx</span>
            </div>
            <div className="flex items-center gap-2 px-3 py-1.5 rounded text-[#333] text-sm opacity-40">
              <span>📄</span>
              <span>other_script.jsx</span>
            </div>
          </>
        ) : (
          <>
            <div className="flex items-center gap-2 px-3 py-1.5 rounded text-[#333] text-sm opacity-40">
              <span>🖼️</span>
              <span>image_01.png</span>
            </div>
            <div className="flex items-center gap-2 px-3 py-1.5 rounded text-[#333] text-sm opacity-40">
              <span>🖼️</span>
              <span>image_02.png</span>
            </div>
            <div className="flex items-center gap-2 px-3 py-1.5 rounded bg-[#0058d0] text-white text-sm">
              <span>📋</span>
              <span className="font-medium">{fileName}</span>
            </div>
          </>
        )}
      </div>
      {/* Bottom */}
      <div className="bg-[#f0f0f0] border-t border-[#ddd] px-4 py-3 flex items-center justify-between">
        <div className="text-xs text-[#666]">
          파일 이름: <span className="text-black font-medium">{fileType === "jsx" ? "ae_auto_pipeline.jsx" : fileName}</span>
        </div>
        <div className="flex gap-2">
          <button className="px-4 py-1 bg-[#e0e0e0] border border-[#bbb] rounded text-sm">취소</button>
          <button className="px-4 py-1 bg-[#0058d0] text-white border border-[#004bb5] rounded text-sm font-medium">
            열기
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── AE 메인 화면 모킹 (간략) ── */
function AeMainScreen({ status }: { status: "idle" | "running" | "done" }) {
  return (
    <div className="bg-[#1e1e1e] rounded-lg overflow-hidden border border-[#444]">
      <AeMenuBar />
      {/* Toolbar */}
      <div className="bg-[#2b2b2b] border-b border-[#1a1a1a] px-4 py-1.5 flex items-center gap-2">
        <div className="flex gap-1">
          {["⏮", "◀", "▶", "⏭"].map((b, i) => (
            <div key={i} className="w-6 h-5 bg-[#3a3a3a] rounded flex items-center justify-center text-[10px] text-[#999]">{b}</div>
          ))}
        </div>
        <div className="text-[11px] text-[#888] ml-4">0;00;00;00</div>
      </div>
      {/* Main area */}
      <div className="grid grid-cols-12 min-h-[250px]">
        {/* Project panel */}
        <div className="col-span-3 bg-[#232323] border-r border-[#333] p-2">
          <div className="text-[10px] text-[#888] font-bold mb-2">Project</div>
          {status === "done" && (
            <div className="space-y-1 text-[10px]">
              <div className="text-[#ccc] flex items-center gap-1">📁 <span className="text-[#9999ff]">my_storyboard</span></div>
              <div className="text-[#999] pl-3">🎬 main_comp</div>
              <div className="text-[#999] pl-3">🖼️ image_01.png</div>
              <div className="text-[#999] pl-3">🖼️ image_02.png</div>
              <div className="text-[#999] pl-3">🖼️ image_03.png</div>
            </div>
          )}
          {status === "idle" && (
            <div className="text-[10px] text-[#555] italic">빈 프로젝트</div>
          )}
          {status === "running" && (
            <div className="text-[10px] text-[#f39c12] animate-pulse">스크립트 실행 중...</div>
          )}
        </div>
        {/* Composition panel */}
        <div className="col-span-6 bg-[#1a1a1a] flex items-center justify-center relative">
          {status === "done" ? (
            <div className="text-center">
              <div className="w-24 h-40 bg-gradient-to-b from-[#333] to-[#222] rounded border border-[#555] mx-auto mb-2 flex items-center justify-center">
                <div className="text-[10px] text-[#888]">1080x1920</div>
              </div>
              <div className="text-[10px] text-[#888]">main_comp</div>
            </div>
          ) : status === "running" ? (
            <div className="text-center animate-pulse">
              <div className="text-2xl mb-2">⚙️</div>
              <div className="text-xs text-[#f39c12]">자동 생성 중...</div>
            </div>
          ) : (
            <div className="text-[11px] text-[#444]">컴포지션 없음</div>
          )}
        </div>
        {/* Info panel */}
        <div className="col-span-3 bg-[#232323] border-l border-[#333] p-2">
          <div className="text-[10px] text-[#888] font-bold mb-2">Info</div>
          {status === "done" && (
            <div className="space-y-1 text-[10px] text-[#999]">
              <div>컴포지션: 1개</div>
              <div>레이어: 9개</div>
              <div>키프레임: 자동 생성</div>
              <div className="text-green-400 mt-2 font-bold">✓ 완료!</div>
            </div>
          )}
        </div>
      </div>
      {/* Timeline */}
      <div className="bg-[#232323] border-t border-[#444] p-2 min-h-[80px]">
        <div className="text-[10px] text-[#888] font-bold mb-2">Timeline</div>
        {status === "done" ? (
          <div className="space-y-0.5">
            {["씬1_이미지", "씬1_텍스트", "씬2_이미지", "씬2_텍스트", "씬3_이미지"].map((name, i) => (
              <div key={i} className="flex items-center gap-2 text-[9px]">
                <div className="w-2 h-2 rounded-full" style={{ background: ["#e94560", "#3498db", "#9b59b6", "#f39c12", "#2ecc71"][i] }} />
                <span className="text-[#aaa] w-16 truncate">{name}</span>
                <div className="flex-1 h-3 rounded-sm" style={{
                  background: ["#e94560", "#3498db", "#9b59b6", "#f39c12", "#2ecc71"][i],
                  opacity: 0.3,
                  marginLeft: `${i * 15}%`,
                  width: `${30 - i * 2}%`,
                }} />
              </div>
            ))}
          </div>
        ) : (
          <div className="text-[10px] text-[#444]">레이어 없음</div>
        )}
      </div>
    </div>
  );
}

/* ── 전체 튜토리얼 ── */
export default function AeTutorial() {
  const [currentStep, setCurrentStep] = useState(0);

  const steps = [
    { title: "폴더 준비", short: "폴더" },
    { title: "AE 실행 & 파일 메뉴", short: "파일" },
    { title: "스크립트 메뉴", short: "스크립트" },
    { title: "스크립트 파일 실행 선택", short: "실행" },
    { title: "JSX 스크립트 선택", short: "JSX" },
    { title: "JSON 파일 선택", short: "JSON" },
    { title: "자동 생성 완료!", short: "완료" },
  ];

  return (
    <div className="space-y-6">
      {/* Step indicator */}
      <div className="flex items-center gap-1 overflow-x-auto pb-2">
        {steps.map((s, i) => (
          <button
            key={i}
            onClick={() => setCurrentStep(i)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all flex-shrink-0 ${
              i === currentStep
                ? "bg-ae-highlight text-white"
                : i < currentStep
                ? "bg-green-500/20 text-green-400 border border-green-500/30"
                : "bg-white/5 text-white/40 border border-white/10"
            }`}
          >
            {i < currentStep ? "✓" : i + 1}
            <span className="hidden sm:inline">{s.short}</span>
          </button>
        ))}
      </div>

      {/* Step 1: 폴더 준비 */}
      {currentStep === 0 && (
        <Step
          number={1} total={7}
          title="프로젝트 폴더 준비"
          description="먼저, 이미지 파일과 JSON 파일, 스크립트 파일을 하나의 폴더에 모아둡니다. JSON에 적은 파일명과 실제 파일명이 정확히 같아야 합니다."
          tip="파일명에 한글이나 공백이 있으면 오류가 날 수 있습니다. 영문+숫자+밑줄만 사용하세요."
        >
          <div className="bg-[#1e1e2e] rounded-lg p-4 font-mono text-sm border border-white/10">
            <div className="text-white/40 text-xs mb-3">📁 C:\Users\열정피디\Desktop\my_project\</div>
            <div className="space-y-1.5">
              <div className="flex items-center gap-3">
                <span className="text-2xl">📄</span>
                <div>
                  <div className="text-ae-highlight font-bold">ae_auto_pipeline.jsx</div>
                  <div className="text-[10px] text-white/30">← 자동화 스크립트 (GitHub에서 다운로드)</div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-2xl">📋</span>
                <div>
                  <div className="text-ae-blue font-bold">my_storyboard.json</div>
                  <div className="text-[10px] text-white/30">← 웹 에디터에서 다운로드한 JSON</div>
                </div>
              </div>
              <div className="border-t border-white/10 my-2" />
              <div className="flex items-center gap-3">
                <span className="text-2xl">🖼️</span>
                <div>
                  <div className="text-green-400">image_scene01.png</div>
                  <div className="text-[10px] text-white/30">← JSON에서 &quot;file&quot;: &quot;image_scene01.png&quot; 으로 지정한 이미지</div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-2xl">🖼️</span>
                <div>
                  <div className="text-green-400">image_scene02.png</div>
                  <div className="text-[10px] text-white/30">← JSON에서 &quot;file&quot;: &quot;image_scene02.png&quot; 으로 지정한 이미지</div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-2xl">🖼️</span>
                <div>
                  <div className="text-green-400">image_scene03.png</div>
                  <div className="text-[10px] text-white/30">← JSON에서 &quot;file&quot;: &quot;image_scene03.png&quot; 으로 지정한 이미지</div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-2xl">🎵</span>
                <div>
                  <div className="text-ae-gold">bgm.mp3</div>
                  <div className="text-[10px] text-white/30">← (선택) 배경음악 파일</div>
                </div>
              </div>
            </div>
          </div>
          <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3">
            <div className="text-sm text-red-400 font-bold mb-1">중요!</div>
            <div className="text-xs text-red-300/70 space-y-1">
              <div>• JSON의 <code className="bg-white/10 px-1 rounded">&quot;file&quot;: &quot;image_scene01.png&quot;</code> 와 실제 파일명이 <strong>100% 동일</strong>해야 합니다</div>
              <div>• 모든 파일이 <strong>같은 폴더</strong>에 있어야 합니다</div>
              <div>• 대소문자도 구분합니다 (Image.PNG ≠ image.png)</div>
            </div>
          </div>
        </Step>
      )}

      {/* Step 2: AE File Menu */}
      {currentStep === 1 && (
        <Step
          number={2} total={7}
          title="After Effects 실행 → 파일 메뉴 클릭"
          description="After Effects를 실행하고, 상단 메뉴 바에서 '파일(F)'을 클릭합니다."
        >
          <div className="rounded-lg overflow-hidden border border-[#444]">
            <AeMenuBar highlight="파일(F)" />
            <div className="bg-[#1e1e1e] h-32 flex items-center justify-center">
              <div className="text-center">
                <div className="text-white/20 text-sm">After Effects 메인 화면</div>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3 bg-ae-highlight/10 border border-ae-highlight/30 rounded-lg p-4">
            <div className="text-3xl">👆</div>
            <div className="text-sm">
              <div className="font-bold text-ae-highlight">여기를 클릭!</div>
              <div className="text-white/60">상단 맨 왼쪽의 <strong>&quot;파일(F)&quot;</strong> 메뉴를 클릭하세요</div>
            </div>
          </div>
        </Step>
      )}

      {/* Step 3: Scripts */}
      {currentStep === 2 && (
        <Step
          number={3} total={7}
          title="드롭다운 맨 아래쪽에서 '스크립트(T)' 찾기"
          description="파일 메뉴를 클릭하면 드롭다운이 나타납니다. 메뉴가 길어서 아래로 스크롤해야 합니다! '내보내기(X)' → 'Adobe에서 글꼴 추가' 아래에 '스크립트(T)'가 있습니다."
        >
          <div className="rounded-lg overflow-hidden border border-[#444]">
            <AeMenuBar highlight="파일(F)" />
            <div className="bg-[#1e1e1e] p-4 min-h-[200px] relative">
              <div className="absolute top-0 left-2">
                <AeFileMenu highlight="스크립트(T)" />
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3 bg-ae-highlight/10 border border-ae-highlight/30 rounded-lg p-4">
            <div className="text-3xl">👆</div>
            <div className="text-sm">
              <div className="font-bold text-ae-highlight">&quot;스크립트(T)&quot;에 마우스를 올리세요!</div>
              <div className="text-white/60">메뉴 <strong>맨 아래쪽</strong>에 있습니다. 스크롤해서 찾으세요! 마우스를 올리면 서브메뉴가 나타납니다</div>
            </div>
          </div>
        </Step>
      )}

      {/* Step 4: Run Script File */}
      {currentStep === 3 && (
        <Step
          number={4} total={7}
          title="'스크립트 파일 실행...' 클릭"
          description="스크립트(T) 위에 마우스를 올리면 서브메뉴가 나타납니다. '스크립트 파일 실행...'을 클릭하세요."
        >
          <div className="rounded-lg overflow-hidden border border-[#444]">
            <AeMenuBar highlight="파일(F)" />
            <div className="bg-[#1e1e1e] p-4 min-h-[200px] relative">
              <div className="absolute top-0 left-2 flex">
                <AeFileMenu highlight="스크립트(T)" />
                <div className="ml-0 -mt-0">
                  <AeScriptsMenu highlight="스크립트 파일 실행..." />
                </div>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3 bg-ae-highlight/10 border border-ae-highlight/30 rounded-lg p-4">
            <div className="text-3xl">👆</div>
            <div className="text-sm">
              <div className="font-bold text-ae-highlight">&quot;스크립트 파일 실행...&quot; 클릭!</div>
              <div className="text-white/60">클릭하면 파일 선택 다이얼로그가 열립니다</div>
            </div>
          </div>
        </Step>
      )}

      {/* Step 5: Select JSX */}
      {currentStep === 4 && (
        <Step
          number={5} total={7}
          title="ae_auto_pipeline.jsx 파일 선택"
          description="파일 탐색기가 열리면, 아까 준비한 프로젝트 폴더로 이동하여 'ae_auto_pipeline.jsx' 파일을 선택하고 '열기'를 클릭합니다."
          tip="jsx 파일이 보이지 않으면 파일 형식 필터를 'All Files (*.*)' 로 변경해보세요."
        >
          <div className="flex justify-center">
            <FileDialog
              fileType="jsx"
              fileName="ae_auto_pipeline.jsx"
              folder="C:\Users\열정피디\Desktop\my_project"
            />
          </div>
          <div className="flex items-center gap-3 bg-ae-highlight/10 border border-ae-highlight/30 rounded-lg p-4">
            <div className="text-3xl">1️⃣</div>
            <div className="text-sm">
              <div className="font-bold text-ae-highlight">ae_auto_pipeline.jsx 를 선택하고 &quot;열기&quot; 클릭!</div>
              <div className="text-white/60">스크립트가 실행되면서 바로 다음 다이얼로그가 나타납니다</div>
            </div>
          </div>
        </Step>
      )}

      {/* Step 6: Select JSON */}
      {currentStep === 5 && (
        <Step
          number={6} total={7}
          title="JSON 파일 선택"
          description="스크립트가 실행되면 자동으로 두 번째 파일 선택 다이얼로그가 나타납니다. 여기서 웹 에디터에서 만든 JSON 파일을 선택합니다."
        >
          <div className="flex justify-center">
            <FileDialog
              fileType="json"
              fileName="my_storyboard.json"
              folder="C:\Users\열정피디\Desktop\my_project"
            />
          </div>
          <div className="flex items-center gap-3 bg-ae-highlight/10 border border-ae-highlight/30 rounded-lg p-4">
            <div className="text-3xl">2️⃣</div>
            <div className="text-sm">
              <div className="font-bold text-ae-highlight">JSON 파일을 선택하고 &quot;열기&quot; 클릭!</div>
              <div className="text-white/60">이제 자동으로 영상이 생성됩니다. 잠시 기다려주세요!</div>
            </div>
          </div>
        </Step>
      )}

      {/* Step 7: Done */}
      {currentStep === 6 && (
        <Step
          number={7} total={7}
          title="자동 생성 완료!"
          description="스크립트가 JSON을 읽고 자동으로 모든 것을 만들어줍니다. 완료되면 아래와 같이 컴포지션, 레이어, 키프레임이 모두 생성됩니다."
        >
          <AeMainScreen status="done" />
          <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-4">
            <div className="text-sm text-green-400 font-bold mb-2">✓ 자동으로 생성된 것들:</div>
            <div className="grid grid-cols-2 gap-2 text-xs text-green-300/70">
              <div>✅ 메인 컴포지션 (설정한 해상도/FPS)</div>
              <div>✅ 각 씬의 이미지 레이어 배치</div>
              <div>✅ 텍스트 레이어 + 위치 설정</div>
              <div>✅ 애니메이션 키프레임 (줌, 팬 등)</div>
              <div>✅ 텍스트 애니메이션 (페이드, 타이프 등)</div>
              <div>✅ 이펙트 적용 (비네팅, 글로우 등)</div>
              <div>✅ 씬 간 전환 효과</div>
              <div>✅ 렌더 큐에 자동 추가</div>
            </div>
          </div>
          <div className="bg-ae-blue/10 border border-ae-blue/30 rounded-lg p-4">
            <div className="text-sm text-ae-blue font-bold mb-1">다음은요?</div>
            <div className="text-xs text-white/60 space-y-1">
              <div>• 타임라인에서 결과를 확인하고 필요하면 수동으로 미세 조정</div>
              <div>• <strong>Ctrl+M</strong> (또는 Composition &gt; Add to Render Queue)으로 렌더링</div>
              <div>• 렌더 큐에서 &quot;Render&quot; 버튼 클릭하면 영상 파일이 출력됩니다!</div>
            </div>
          </div>
        </Step>
      )}

      {/* Navigation */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => setCurrentStep(Math.max(0, currentStep - 1))}
          disabled={currentStep === 0}
          className="btn-secondary text-sm py-2 disabled:opacity-30"
        >
          ← 이전
        </button>
        <span className="text-xs text-white/40">
          {currentStep + 1} / {steps.length}
        </span>
        <button
          onClick={() => setCurrentStep(Math.min(steps.length - 1, currentStep + 1))}
          disabled={currentStep === steps.length - 1}
          className="btn-primary text-sm py-2 disabled:opacity-30"
        >
          다음 →
        </button>
      </div>
    </div>
  );
}
