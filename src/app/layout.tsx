import type { Metadata } from "next";

import "./globals.css";

export const metadata: Metadata = {
  title: "ExamRoomAllocator",
  description:
    "Công cụ nội bộ hỗ trợ import, chuẩn hóa, và chuẩn bị dữ liệu phân phòng thi.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="vi">
      <body className="app-shell antialiased">{children}</body>
    </html>
  );
}
