"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { restoreSessionApi } from "@/lib/api";
import { LoginPage } from "@/components/layout/LoginPage";
import { GLOBAL_CSS } from "@/lib/constants/styles";
import type { UserInfo, ThemeMode } from "@/types";

export default function RootPage() {
  const router = useRouter();
  const [theme, setTheme] = useState<ThemeMode>("dark");
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    const s = localStorage.getItem("crm-theme") as ThemeMode | null;
    if (s) setTheme(s);
    restoreSessionApi().then((result) => {
      if (result.success) router.replace("/dashboard");
    }).finally(() => setChecking(false));
  }, [router]);

  const handleLogin = (user: UserInfo) => {
    router.replace("/dashboard");
  };

  if (checking)
    return (
      <div className={`${theme} theme-shell`} style={{ minHeight: "100vh", display: "grid", placeItems: "center", background: "var(--app-bg)", color: "var(--app-text)" }}>
        <style>{GLOBAL_CSS}</style>
        Yuklanmoqda...
      </div>
    );

  return <LoginPage onLogin={handleLogin} theme={theme} setTheme={setTheme} />;
}
