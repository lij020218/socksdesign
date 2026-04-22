import type { Metadata } from "next";
import "./globals.css";
import { TransitionProvider } from "@/components/TransitionProvider";

export const metadata: Metadata = {
  title: "러블리삭스하우스 | Make Your Own Socks",
  description:
    "AI가 제안하는 맞춤 양말 — 당신의 빛나는 디자인을 AI와 함께 펼쳐보세요.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ko">
      <body>
        <TransitionProvider>{children}</TransitionProvider>
      </body>
    </html>
  );
}
