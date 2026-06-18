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
    <div className={`${theme} theme-shell login-screen`}>
      <style>{GLOBAL_CSS}</style>
      <div className="login-shell login-shell-compact">
        <section className="login-form-panel">
          <div className="login-form-inner">
            <div className="login-brand-compact">
              <span><UtensilsCrossed size={21} /></span>
              <strong>CRM-JUTSU</strong>
            </div>
            <div className="login-heading">
              <h1>Kirish</h1>
              <p>Hisobingizga kirib boshqaruvni davom ettiring.</p>
            </div>
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

            <button className="login-theme" onClick={() => setTheme(theme === "dark" ? "light" : "dark")}>
              {theme === "dark" ? <><Sun size={16} /> Kunduzgi rejim</> : <><Moon size={16} /> Tungi rejim</>}
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}
