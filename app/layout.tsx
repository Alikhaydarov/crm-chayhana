import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Oshxona CRM v2 - Sklad Boshqaruvi",
  description: "Oshxona va do'kon uchun CRM tizimi",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="uz">
      <body>{children}</body>
    </html>
  );
}
