import type { Metadata } from "next";
export const metadata: Metadata = { title: "Oshxona CRM v2 - Sklad Boshqaruvi", description: "Oshxona va do'kon uchun CRM tizimi" };
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="uz">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap" rel="stylesheet" />
      </head>
      <body style={{ margin: 0, background: "#0d1117", fontFamily: "'Inter', sans-serif", color: "#e6edf3" }}>
        {children}
      </body>
    </html>
  );
}
