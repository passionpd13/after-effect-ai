"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

export default function Navbar() {
  const pathname = usePathname();

  const links = [
    { href: "/", label: "홈" },
    { href: "/ai", label: "AI 자동생성" },
    { href: "/editor", label: "수동 에디터" },
    { href: "/examples", label: "예제" },
    { href: "/docs", label: "문서" },
  ];

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-ae-dark/80 backdrop-blur-lg border-b border-white/10">
      <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-3 group">
          <div className="w-8 h-8 bg-gradient-to-br from-ae-highlight to-ae-purple rounded-lg flex items-center justify-center text-sm font-bold">
            AE
          </div>
          <span className="font-bold text-lg group-hover:text-ae-highlight transition-colors">
            Animation Studio
          </span>
        </Link>
        <div className="flex items-center gap-1">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                pathname === link.href
                  ? "bg-ae-highlight/20 text-ae-highlight"
                  : "text-white/70 hover:text-white hover:bg-white/5"
              }`}
            >
              {link.label}
            </Link>
          ))}
        </div>
      </div>
    </nav>
  );
}
