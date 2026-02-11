import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "黒樽亭クエストボード",
  description: "中世酒場の世界観で使う冒険者ギルド掲示板"
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja">
      <body>{children}</body>
    </html>
  );
}
