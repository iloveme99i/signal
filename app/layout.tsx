import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });
export const metadata: Metadata = { title: "Signal｜信息识别与分类", description: "从截图、收藏、视频字幕和备忘录中逐条摘取有用信息，自动分类并保留原文。" };
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) { return <html lang="zh-CN"><body className={`${geistSans.variable} ${geistMono.variable}`}>{children}</body></html>; }
