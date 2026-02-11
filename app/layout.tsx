import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Quest Board",
  description: "冒険者ギルドのクエストボード"
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja">
      <body>{children}</body>
    </html>
  );
}
