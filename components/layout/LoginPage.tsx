"use client";
import { useState } from "react";
import { AlertCircle, Eye, EyeOff, LogIn, Moon, Sun, UtensilsCrossed } from "lucide-react";
import { loginApi } from "@/lib/api";
import type { UserInfo, ThemeMode } from "@/types";
import { GLOBAL_CSS } from "@/lib/constants/styles";

type Props = {
  onLogin: (u: UserInfo) => void;
  theme: ThemeMode;
  setTheme: (t: ThemeMode) => void;
};

export function LoginPage({ onLogin, theme, setTheme }: Props) {
  const [userId, setUserId] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    setLoading(true);
    setError("");
    const d = await loginApi(userId.trim(), password);
    if (d.success) onLogin((d as any).user);
    else setError((d as any).message);
    setLoading(false);
  };

  return (
    <div
      className={`${theme} theme-shell`}
      style={{
        minHeight: "100vh", display: "flex", alignItems: "center",
        justifyContent: "center", padding: "20px",
        background: "var(--app-bg)", fontFamily: "var(--font-ui)",
      }}
    >
      <style>{GLOBAL_CSS}</style>
      <div style={{ width: "100%", maxWidth: 400 }}>
        {/* Logo */}
        <div style={{ textAlign: "center", marginBottom: 36 }}>
          <div
            style={{
              width: 72, height: 72, borderRadius: 22,
              background: "linear-gradient(135deg,#7367f0,#655bd3)",
              display: "flex", alignItems: "center", justifyContent: "center",
              margin: "0 auto 16px",
              boxShadow: "0 12px 32px rgba(115,103,240,.4)", fontSize: 32,
            }}
          >
            <UtensilsCrossed size={32} />
          </div>
          <div style={{ fontSize: 28, fontWeight: 900, color: "var(--app-text)", letterSpacing: -0.5 }}>
            CRM-JUTSU
          </div>
          <div style={{ fontSize: 13, color: "var(--app-muted)", marginTop: 6 }}>
            Restoran boshqaruv tizimi
          </div>
        </div>

        {/* Card */}
        <div
          style={{
            background: "var(--app-panel)", border: "1px solid var(--app-border)",
            borderRadius: 24, padding: "28px 24px",
            boxShadow: "0 24px 64px rgba(0,0,0,.35)",
          }}
        >
          <div className="form-group">
            <label className="form-label">Foydalanuvchi</label>
            <input
              className="crm-input"
              value={userId}
              onChange={(e) => setUserId(e.target.value)}
              placeholder="user id"
            />
          </div>
          <div className="form-group">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 7 }}>
              <label className="form-label" style={{ margin: 0 }}>Parol</label>
              <button
                style={{ display: "grid", placeItems: "center", color: "#7367f0", background: "none", border: "none", cursor: "pointer", padding: 2 }}
                onClick={() => setShowPass(!showPass)}
              >
                {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            <input
              className="crm-input"
              type={showPass ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleLogin()}
              placeholder="Parolni kiriting"
            />
          </div>

          {error && (
            <div
              style={{
                background: "rgba(248,81,73,.1)", border: "1px solid rgba(248,81,73,.3)",
                borderRadius: 10, padding: "10px 14px", color: "#f85149",
                fontSize: 12, fontWeight: 700, marginBottom: 14, display: "flex", alignItems: "center", gap: 8,
              }}
            >
              <AlertCircle size={16} /> {error}
            </div>
          )}

          <button
            className="btn-primary"
            onClick={handleLogin}
            disabled={loading || !userId.trim() || !password}
            style={{ width: "100%", padding: "13px" }}
          >
            {loading ? "Kirilmoqda..." : <><LogIn size={17} /> Kirish</>}
          </button>
        </div>

        <div style={{ textAlign: "center", marginTop: 16 }}>
          <button
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            style={{ display: "inline-flex", alignItems: "center", gap: 7, background: "none", border: "none", color: "var(--app-muted)", cursor: "pointer", fontSize: 12, fontWeight: 700, fontFamily: "inherit" }}
          >
            {theme === "dark" ? <><Sun size={16} /> Kunduzgi rejim</> : <><Moon size={16} /> Tungi rejim</>}
          </button>
        </div>
      </div>
    </div>
  );
}
