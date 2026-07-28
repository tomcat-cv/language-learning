"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

const links = [
  { href: "/", label: "今日", icon: "◉" },
  { href: "/grammar", label: "文法", icon: "文" },
  { href: "/vocabulary", label: "单词", icon: "語" },
  { href: "/review", label: "复习", icon: "↺" },
  { href: "/settings", label: "我的", icon: "人" },
];

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  return <div className="app-shell">
    <aside className="sidebar">
      <Link href="/" className="brand" aria-label="日々首页">
        <span className="brand-mark">日</span>
        <span><strong>日々</strong><small>HIBI · DAILY JAPANESE</small></span>
      </Link>
      <nav className="nav" aria-label="主导航">
        {links.map((link) => {
          const active = link.href === "/" ? pathname === "/" : pathname.startsWith(link.href);
          return <Link key={link.href} href={link.href} className={`nav-link ${active ? "active" : ""}`}>
            <span className="nav-icon" aria-hidden>{link.icon}</span><span>{link.label}</span>
          </Link>;
        })}
      </nav>
      <div className="sidebar-note"><b>今日一句</b><p>千里の道も一歩から。<br />千里之行，始于足下。</p></div>
    </aside>
    <main className="main-area">{children}</main>
  </div>;
}
