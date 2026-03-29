import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AE Animation Studio - After Effects 자동화 도구",
  description:
    "스토리보드를 분석하여 After Effects 애니메이션을 자동 생성하는 웹 도구",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ko">
      <body className="text-white antialiased">{children}</body>
    </html>
  );
}
