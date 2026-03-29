"use client";
import { useState } from "react";
import { Storyboard } from "@/lib/types";

interface JsonPreviewProps {
  data: Storyboard;
}

export default function JsonPreview({ data }: JsonPreviewProps) {
  const [copied, setCopied] = useState(false);

  const cleanData = {
    ...data,
    settings: {
      ...data.settings,
      total_duration: data.scenes.reduce((sum, s) => sum + s.duration, 0),
    },
  };

  const jsonString = JSON.stringify(cleanData, null, 2);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(jsonString);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const blob = new Blob([jsonString], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${data.project.name || "storyboard"}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const highlightJson = (json: string) => {
    return json.replace(
      /("(?:[^"\\]|\\.)*")\s*:/g,
      '<span class="json-key">$1</span>:'
    ).replace(
      /:\s*("(?:[^"\\]|\\.)*")/g,
      ': <span class="json-string">$1</span>'
    ).replace(
      /:\s*(\d+\.?\d*)/g,
      ': <span class="json-number">$1</span>'
    ).replace(
      /:\s*(true|false)/g,
      ': <span class="json-boolean">$1</span>'
    ).replace(
      /:\s*(null)/g,
      ': <span class="json-null">$1</span>'
    );
  };

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <button onClick={handleCopy} className="btn-secondary text-sm py-2">
          {copied ? "복사됨!" : "JSON 복사"}
        </button>
        <button onClick={handleDownload} className="btn-primary text-sm py-2">
          JSON 다운로드
        </button>
      </div>
      <div className="card-glass p-4 max-h-[600px] overflow-auto">
        <pre
          className="text-xs leading-relaxed font-mono"
          dangerouslySetInnerHTML={{ __html: highlightJson(jsonString) }}
        />
      </div>
    </div>
  );
}
