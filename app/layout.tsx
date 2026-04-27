import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Capsule",
  description: "A personal time capsule app to record moments and memories",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
