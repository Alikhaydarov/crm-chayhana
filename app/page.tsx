"use client";
import { useState, useEffect, useCallback } from "react";
import {
  addProductLocal,
  addStaffLocal,
  approveTransferLocal,
  createSupplierLocal,
  createTransferLocal,
  getLocalSnapshot,
  loginLocal,
  rejectTransferLocal,
  toggleStaffLocal,
  updateStockLocal,
  updateSupplierPayLocal,
} from "@/lib/localStore";

// ─── TYPES ───────────────────────────────────────────────────
type Role = "superadmin"|"restaurant1"|"restaurant2"|"shop";
type UserInfo = { id:string; name:string; role:Role; branchName:string; branchIcon:string };
type Product = { id:string; name:string; category:string; unit:string; minStock:number; pricePerUnit:number; perBox:number; boxUnit:string; qrCode?:string };
type StockMap = Record<string,number>;
type Transfer = { id:string; toBranch:string; items:any[]; totalValue:number; requestedBy:string; approvedBy?:string; status:"pending"|"approved"|"rejected"; note?:string; createdAt:string; updatedAt:string };
type Supplier = { id:string; firm:string; docNumber:string; deliveryDate:string; note:string; items:any[]; totalPrice:number; payStatus:"paid"|"unpaid"|"partial"; paidAmount:number; createdAt:string };
type Staff = { id:string; name:string; role:string; branch:string; phone:string; salary:number; joinDate:string; active:boolean };
type Lang = "uz"|"ko";
type ThemeMode = "dark"|"light";

const BNAME:Record<string,string> = { restaurant1:"Restaurant-1", restaurant2:"Restaurant-2", shop:"Shop", main:"Main Warehouse" };
const BICON:Record<string,string> = { restaurant1:"🍜", restaurant2:"🍲", shop:"🏪", main:"🏭", superadmin:"🏭" };
const CATICON:Record<string,string> = { gosht:"🥩", sabzavot:"🥬", don:"🌾", sut:"🥛", meva:"🍎", ziravorlar:"🌶️", boshqa:"📦" };
const ST_CFG = {
  pending:  { c:"#f0a500", bg:"rgba(240,165,0,0.12)",  l:"Pending",  i:"⏳" },
  approved: { c:"#3fb950", bg:"rgba(63,185,80,0.12)",  l:"Approved", i:"✅" },
  rejected: { c:"#f85149", bg:"rgba(248,81,73,0.12)",  l:"Rejected", i:"❌" },
};
const PAY_CFG = {
  paid:    { c:"#3fb950", bg:"rgba(63,185,80,0.12)",   l:"✅ Fully paid" },
  unpaid:  { c:"#f85149", bg:"rgba(248,81,73,0.12)",   l:"❌ Unpaid" },
  partial: { c:"#f0a500", bg:"rgba(240,165,0,0.12)",   l:"⏳ Partial" },
};
const fmt  = (n:number) => n.toLocaleString("uz-UZ");
const fmtM = (n:number) => `₩${fmt(n)}`;
const fmtD = (s:string) => new Date(s).toLocaleString("en-US",{day:"2-digit",month:"short",year:"numeric",hour:"2-digit",minute:"2-digit"});
const stText = (t:Record<string,string>, status:string) => t[status] || status;
const payText = (t:Record<string,string>, status:string) => status==="paid"?t.paid:status==="partial"?t.partial:status==="unpaid"?t.unpaid:status;

const I18N:Record<Lang,Record<string,string>> = {
  uz: {
    dashboard:"Dashboard", warehouse:"Sklad", transfers:"Transferlar", staff:"Xodimlar", reports:"Hisobotlar", suppliers:"Firmalar", products:"Mahsulotlar",
    logout:"Chiqish", firmList:"Firmalar ro'yxati", firmHint:"Firma ustiga bosing, ichida history va yangi mahsulot qo'shish bo'limlari ochiladi",
    newFirm:"+ Yangi firma", firmOffice:"Firma kabineti", history:"History", addNow:"Add now", payments:"Payments",
    historySub:"Oldingi kirimlar", addSub:"Yangi mahsulot kiritish", paymentsSub:"To'lov va qarzlar", close:"Yopish",
    addDelivery:"+ Kirim qo'shish", total:"Jami", paid:"To'langan", debt:"Qarz", deliveries:"kirim", totalSum:"Jami summa",
    last:"Oxirgi", items:"Mahsulot", paymentTitle:"To'lovlarni boshqarish", paymentHint:"Berilgan summani kiriting. 0 bo'lsa unpaid, to'liq summa bo'lsa paid, o'rtada bo'lsa partial bo'ladi.",
    paidAmount:"Berilgan summa", save:"Saqlash", status:"Status", noDoc:"Hujjat yo'q", language:"Til", uzbek:"O'zbek", korean:"Koreys", unpaid:"To'lanmagan",
    supplierDebt:"Firma qarzi", recordDelivery:"+ Kirim", deliveryTitle:"Yangi kirim", companyName:"Firma nomi", deliveryDate:"Sana", documentNo:"Hujjat raqami", autoTotal:"Avto jami", productList:"Mahsulotlar", addProduct:"+ Mahsulot", calculatedTotal:"Hisoblangan jami", paymentStatus:"To'lov holati", note:"Eslatma", cancel:"Bekor qilish", saveDelivery:"Kirimni saqlash", scan:"Skan", selectProduct:"Mahsulot tanlang", quantity:"Soni", price:"Narx",
    mode:"Rejim", dark:"Tungi", light:"Kunduzgi", loading:"Yuklanmoqda...", lowStockProducts:"Kam qolgan mahsulotlar", allProductsOk:"Hamma mahsulotlar minimumdan yuqori", mainStockValue:"Asosiy sklad qiymati", productTypes:"Mahsulot turlari", totalStaff:"Jami xodim", myStockValue:"Mening sklad qiymatim", myRequests:"Mening so'rovlarim", pending:"Kutilmoqda", approved:"Tasdiqlangan", rejected:"Rad etilgan", partial:"Qisman", lowStock:"Kam qoldi", branchStatus:"Filial holati", staffLabel:"xodim", stockValue:"Sklad qiymati", totalReceived:"Jami olingan", recentTransfers:"Oxirgi transferlar", all:"Hammasi", branch:"Filial", value:"Qiymat", date:"Sana", noTransfersYet:"Transferlar yo'q", totalValue:"Jami qiymat", editStockQuantity:"Sklad sonini o'zgartirish", current:"Hozirgi", newQuantity:"Yangi soni", invalidQuantity:"Soni noto'g'ri", stockUpdated:"Sklad yangilandi", errorUpdatingStock:"Skladni yangilashda xato", lowStockWarning:"mahsulot kam qolgan", medium:"o'rtacha", clickDetails:"Batafsil ko'rish", good:"Yaxshi", searchProduct:"Mahsulot qidirish...", allCategories:"Barcha kategoriyalar", product:"Mahsulot", category:"Kategoriya", unit:"Birlik", totalUnits:"Jami birlik", action:"Amal", edit:"O'zgartirish", noProductsFound:"Mahsulot topilmadi", totalTransfers:"Jami transferlar", newRequest:"+ Yangi so'rov", transferRequest:"Sklad transfer so'rovi", requestFrom:"So'rov", mainWarehouse:"Asosiy sklad", sendRequest:"So'rov yuborish", sending:"Yuborilmoqda...", transferDetails:"Transfer tafsilotlari", requestedBy:"So'ragan", approvedBy:"Tasdiqlagan", view:"Ko'rish", approve:"Tasdiqlash", reject:"Rad etish", noTransfers:"Transfer yo'q", totalSalary:"Jami oylik", addStaff:"+ Xodim qo'shish", addNewStaff:"Yangi xodim qo'shish", fullName:"To'liq ism", position:"Lavozim", phone:"Telefon", salary:"Oylik", joinDate:"Ishga kirgan sana", fillFields:"Maydonlarni to'ldiring", staffAdded:"Xodim qo'shildi", staffStatusUpdated:"Xodim statusi yangilandi", active:"Faol", inactive:"Nofaol", deactivate:"O'chirish", activate:"Faollashtirish", monthlyTransfers:"Oylik transferlar", branchComparison:"Filiallar solishtiruvi", totalTransferred:"Jami o'tkazilgan", productsTitle:"Mahsulotlar", addNewProduct:"Yangi mahsulot qo'shish", name:"Nomi", qrCode:"QR kod", minStock:"Minimum sklad", mainStock:"Asosiy sklad", boxPackage:"Quti/Paket sozlamalari", unitsPerBox:"Qutidagi birlik", unitName:"Birlik nomi",
  },
  ko: {
    dashboard:"대시보드", warehouse:"창고", transfers:"이동", staff:"직원", reports:"보고서", suppliers:"업체", products:"상품",
    logout:"로그아웃", firmList:"업체 목록", firmHint:"업체를 누르면 내역, 입고 추가, 결제 관리 창이 열립니다",
    newFirm:"+ 새 업체", firmOffice:"업체 관리", history:"내역", addNow:"입고 추가", payments:"결제",
    historySub:"이전 입고 내역", addSub:"새 상품 입고", paymentsSub:"결제 및 미수금", close:"닫기",
    addDelivery:"+ 입고 추가", total:"총액", paid:"결제됨", debt:"미수금", deliveries:"건 입고", totalSum:"총 금액",
    last:"최근", items:"상품", paymentTitle:"결제 관리", paymentHint:"결제 금액을 입력하세요. 0이면 미결제, 전액이면 완료, 중간이면 부분 결제입니다.",
    paidAmount:"결제 금액", save:"저장", status:"상태", noDoc:"문서 없음", language:"언어", uzbek:"우즈벡어", korean:"한국어", unpaid:"미결제",
    supplierDebt:"업체 미수금", recordDelivery:"+ 입고", deliveryTitle:"새 입고", companyName:"업체명", deliveryDate:"날짜", documentNo:"문서 번호", autoTotal:"자동 합계", productList:"상품", addProduct:"+ 상품", calculatedTotal:"계산 합계", paymentStatus:"결제 상태", note:"메모", cancel:"취소", saveDelivery:"입고 저장", scan:"스캔", selectProduct:"상품 선택", quantity:"수량", price:"가격",
    mode:"모드", dark:"다크", light:"라이트", loading:"로딩 중...", lowStockProducts:"재고 부족 상품", allProductsOk:"모든 상품이 최소 재고 이상입니다", mainStockValue:"본사 재고 금액", productTypes:"상품 종류", totalStaff:"전체 직원", myStockValue:"내 재고 금액", myRequests:"내 요청", pending:"대기", approved:"승인됨", rejected:"거절됨", partial:"부분 결제", lowStock:"재고 부족", branchStatus:"지점 현황", staffLabel:"직원", stockValue:"재고 금액", totalReceived:"총 입고", recentTransfers:"최근 이동", all:"전체", branch:"지점", value:"금액", date:"날짜", noTransfersYet:"이동 내역 없음", totalValue:"총 금액", editStockQuantity:"재고 수량 수정", current:"현재", newQuantity:"새 수량", invalidQuantity:"수량이 올바르지 않습니다", stockUpdated:"재고가 수정되었습니다", errorUpdatingStock:"재고 수정 오류", lowStockWarning:"상품 재고 부족", medium:"주의", clickDetails:"자세히 보기", good:"양호", searchProduct:"상품 검색...", allCategories:"전체 카테고리", product:"상품", category:"카테고리", unit:"단위", totalUnits:"전체 단위", action:"작업", edit:"수정", noProductsFound:"상품 없음", totalTransfers:"전체 이동", newRequest:"+ 새 요청", transferRequest:"재고 이동 요청", requestFrom:"요청", mainWarehouse:"본사 창고", sendRequest:"요청 보내기", sending:"전송 중...", transferDetails:"이동 상세", requestedBy:"요청자", approvedBy:"승인자", view:"보기", approve:"승인", reject:"거절", noTransfers:"이동 없음", totalSalary:"총 급여", addStaff:"+ 직원 추가", addNewStaff:"새 직원 추가", fullName:"전체 이름", position:"직책", phone:"전화", salary:"급여", joinDate:"입사일", fillFields:"필드를 입력하세요", staffAdded:"직원이 추가되었습니다", staffStatusUpdated:"직원 상태가 변경되었습니다", active:"활성", inactive:"비활성", deactivate:"비활성화", activate:"활성화", monthlyTransfers:"월별 이동", branchComparison:"지점 비교", totalTransferred:"총 이동 금액", productsTitle:"상품", addNewProduct:"새 상품 추가", name:"이름", qrCode:"QR 코드", minStock:"최소 재고", mainStock:"본사 재고", boxPackage:"박스/패키지 설정", unitsPerBox:"박스당 수량", unitName:"단위명",
  },
};

// ─── QTY COLOR ───────────────────────────────────────────────
function qtyColor(qty:number, min:number) {
  if (qty <= min) return "#f85149";
  if (qty <= min * 2) return "#f0a500";
  return "#3fb950";
}
function qtyBadge(qty:number, min:number, t?:Record<string,string>) {
  if (qty <= min)      return <span style={{background:"rgba(248,81,73,0.1)",color:"#f85149",padding:"2px 10px",borderRadius:20,fontSize:11,fontWeight:700}}>🔴 {t?.lowStock || "Low"}</span>;
  if (qty <= min * 2)  return <span style={{background:"rgba(240,165,0,0.1)",color:"#f0a500",padding:"2px 10px",borderRadius:20,fontSize:11,fontWeight:700}}>🟡 {t?.medium || "Medium"}</span>;
  return <span style={{background:"rgba(63,185,80,0.1)",color:"#3fb950",padding:"2px 10px",borderRadius:20,fontSize:11,fontWeight:700}}>🟢 {t?.good || "Good"}</span>;
}

// ─── TOAST ───────────────────────────────────────────────────
function useToast() {
  const [toast, setToast] = useState<{msg:string;type:"success"|"error"}|null>(null);
  const show = (msg:string, type:"success"|"error"="success") => { setToast({msg,type}); setTimeout(()=>setToast(null),3500); };
  return { toast, show };
}

// ════════════════════════════════════════════════════════════
// LOGIN PAGE
// ════════════════════════════════════════════════════════════
function LoginPage({ onLogin }:{ onLogin:(u:UserInfo)=>void }) {
  const [userId, setUserId] = useState("super");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    setLoading(true); setError("");
    const data = loginLocal(userId, password);
    if (data.success) onLogin(data.user);
    else setError(data.message);
    setLoading(false);
  };

  const s = { input:{ width:"100%", padding:"11px 14px", borderRadius:9, border:"1px solid rgba(255,255,255,0.1)", background:"rgba(255,255,255,0.05)", color:"#e6edf3", fontSize:13, fontFamily:"Inter,sans-serif", outline:"none", boxSizing:"border-box" as const } };

  return (
    <div style={{minHeight:"100vh",background:"radial-gradient(ellipse at 50% 0%,rgba(48,120,255,0.08),transparent 60%),#0d1117",display:"flex",alignItems:"center",justifyContent:"center",padding:20}}>
      <div style={{background:"rgba(255,255,255,0.04)",border:"1px solid rgba(255,255,255,0.08)",borderRadius:20,padding:"40px 32px",width:"100%",maxWidth:380,boxShadow:"0 24px 48px rgba(0,0,0,0.5)"}}>
        <div style={{textAlign:"center",marginBottom:28}}>
          <div style={{fontSize:44,marginBottom:8}}>🏭</div>
          <div style={{fontSize:20,fontWeight:800,color:"#fff"}}>Oshxona CRM</div>
          <div style={{fontSize:12,color:"rgba(255,255,255,0.4)",marginTop:4}}>Warehouse Management System</div>
        </div>
        <div style={{marginBottom:14}}>
          <label style={{fontSize:11,color:"rgba(255,255,255,0.5)",fontWeight:600,letterSpacing:1,display:"block",marginBottom:7}}>USER</label>
          <select value={userId} onChange={e=>setUserId(e.target.value)} style={{...s.input}}>
            <option value="super">🏭 Main Admin</option>
            <option value="rest1">🍜 Restaurant-1 Admin</option>
            <option value="rest2">🍲 Restaurant-2 Admin</option>
            <option value="shop1">🏪 Shop Admin</option>
          </select>
        </div>
        <div style={{marginBottom:20}}>
          <label style={{fontSize:11,color:"rgba(255,255,255,0.5)",fontWeight:600,letterSpacing:1,display:"block",marginBottom:7}}>PASSWORD</label>
          <input type="password" value={password} onChange={e=>setPassword(e.target.value)} onKeyDown={e=>e.key==="Enter"&&handleLogin()} placeholder="Enter password" style={s.input} />
        </div>
        {error && <div style={{background:"rgba(248,81,73,0.1)",border:"1px solid rgba(248,81,73,0.3)",borderRadius:9,padding:"9px 13px",color:"#f85149",fontSize:12,marginBottom:14}}>{error}</div>}
        <button onClick={handleLogin} disabled={loading} style={{width:"100%",padding:13,borderRadius:10,border:"none",background:"linear-gradient(135deg,#3078ff,#1a56db)",color:"#fff",fontSize:14,fontWeight:700,cursor:"pointer",boxShadow:"0 4px 14px rgba(48,120,255,0.3)"}}>
          {loading ? "Logging in..." : "Login →"}
        </button>
        <div style={{marginTop:14,padding:"10px 13px",background:"rgba(255,255,255,0.03)",borderRadius:9,fontSize:11,color:"rgba(255,255,255,0.35)"}}>
          <strong style={{color:"rgba(255,255,255,0.5)"}}>Test passwords:</strong> super123 · rest1 · rest2 · shop1
        </div>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════
// MAIN APP
// ════════════════════════════════════════════════════════════
function IdLoginPage({ onLogin, theme, setTheme }:{ onLogin:(u:UserInfo)=>void; theme:ThemeMode; setTheme:(theme:ThemeMode)=>void }) {
  const [userId, setUserId] = useState("super");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    setLoading(true);
    setError("");
    const data = loginLocal(userId.trim(), password);
    if (data.success) onLogin(data.user);
    else setError(data.message);
    setLoading(false);
  };

  return (
    <div className={`${theme} theme-shell min-h-screen px-4 py-8 flex items-center justify-center bg-slate-100 text-slate-950 dark:bg-[#0d1117] dark:text-slate-100`}>
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl shadow-slate-200/70 dark:border-white/10 dark:bg-[#161b22] dark:shadow-black/40 sm:p-8">
        <div className="mb-7 flex items-start justify-between gap-4">
          <div>
            <div className="mb-2 text-4xl">🏭</div>
            <h1 className="text-2xl font-black tracking-tight">Oshxona CRM</h1>
            <p className="mt-1 text-sm text-slate-500 dark:text-white/45">Warehouse Management System</p>
          </div>
          <button onClick={() => setTheme(theme==="dark" ? "light" : "dark")} className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50 dark:border-white/10 dark:text-white/70 dark:hover:bg-white/5">
            {theme==="dark" ? "Light" : "Dark"}
          </button>
        </div>
        <div className="space-y-4">
          <div>
            <label className="mb-2 block text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-white/45">ID</label>
            <input className="crm-input w-full rounded-lg border px-3 py-3 text-sm outline-none focus:border-blue-500" value={userId} onChange={e=>setUserId(e.target.value)} onKeyDown={e=>e.key==="Enter"&&handleLogin()} placeholder="super, rest1, rest2, shop1" />
          </div>
          <div>
            <label className="mb-2 block text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-white/45">Parol</label>
            <input className="crm-input w-full rounded-lg border px-3 py-3 text-sm outline-none focus:border-blue-500" type="password" value={password} onChange={e=>setPassword(e.target.value)} onKeyDown={e=>e.key==="Enter"&&handleLogin()} placeholder="Parolni kiriting" />
          </div>
        </div>
        {error && <div className="mt-4 rounded-lg border border-red-400/30 bg-red-500/10 px-3 py-2 text-sm font-semibold text-red-500">{error}</div>}
        <button onClick={handleLogin} disabled={loading} className="mt-5 w-full rounded-xl bg-gradient-to-r from-blue-600 to-blue-700 px-4 py-3 text-sm font-black text-white shadow-lg shadow-blue-600/25 disabled:opacity-60">
          {loading ? "Kirilmoqda..." : "Kirish"}
        </button>
        <div className="mt-4 rounded-xl bg-slate-100 p-3 text-xs text-slate-500 dark:bg-white/5 dark:text-white/40">
          <strong className="text-slate-700 dark:text-white/60">Demo:</strong> super / super123 · rest1 / rest1 · rest2 / rest2 · shop1 / shop1
        </div>
      </div>
    </div>
  );
}

export default function CRMApp() {
  const [user, setUser] = useState<UserInfo|null>(null);
  const [tab, setTab] = useState("dashboard");
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [lang, setLang] = useState<Lang>("uz");
  const [theme, setTheme] = useState<ThemeMode>("dark");
  const [products, setProducts] = useState<Product[]>([]);
  const [stock, setStock] = useState<StockMap>({});
  const [transfers, setTransfers] = useState<Transfer[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [staffList, setStaffList] = useState<Staff[]>([]);
  const [reports, setReports] = useState<any>(null);
  const [lowStockOpen, setLowStockOpen] = useState(false);
  const { toast, show: showToast } = useToast();
  const t = I18N[lang];

  const fetchAll = useCallback(async () => {
    if (!user) return;
    const data = getLocalSnapshot(user);
    setProducts(data.products || []); setStock(data.stock || {});
    setTransfers(data.transfers || []); setSuppliers(data.suppliers || []);
    setStaffList(data.staff || []); setReports(data.reports);
  }, [user]);

  useEffect(()=>{ if(user) fetchAll(); },[user,fetchAll]);
  useEffect(()=>{ const saved = localStorage.getItem("crm-lang") as Lang|null; if(saved==="uz"||saved==="ko") setLang(saved); },[]);
  useEffect(()=>{ localStorage.setItem("crm-lang", lang); },[lang]);
  useEffect(()=>{ const saved = localStorage.getItem("crm-theme") as ThemeMode|null; if(saved==="dark"||saved==="light") setTheme(saved); },[]);
  useEffect(()=>{ localStorage.setItem("crm-theme", theme); },[theme]);

  if (!user) return <IdLoginPage onLogin={setUser} theme={theme} setTheme={setTheme} />;

  const isSA = user.role === "superadmin";
  const pending = transfers.filter(t=>t.status==="pending").length;

  const TABS = [
    { id:"dashboard", icon:"📊", label:"Dashboard" },
    { id:"warehouse",  icon:"📦", label:"Warehouse" },
    { id:"transfers",  icon:"🔄", label:`Transfers${pending>0?` (${pending})`:""}`  },
    { id:"staff",      icon:"👥", label:"Staff" },
    { id:"reports",    icon:"📈", label:"Reports" },
    { id:"suppliers",  icon:"🚚", label:"Suppliers" },
    ...(isSA?[{ id:"products", icon:"🏷️", label:"Products" }]:[]),
  ];

  const translatedTabs = TABS.map(item => ({
    ...item,
    label: item.id==="transfers" ? `${t.transfers}${pending>0?` (${pending})`:""}` : (t[item.id] || item.label),
  }));

  return (
    <div className={`${theme} theme-shell app-shell`} style={{display:"flex",minHeight:"100vh",background:"var(--app-bg)",fontFamily:"Inter,sans-serif",color:"var(--app-text)"}}>
      <style>{`
        *{box-sizing:border-box}
        ::-webkit-scrollbar{width:4px}::-webkit-scrollbar-thumb{background:#30363d;border-radius:2px}
        @keyframes fadeIn{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}
        @keyframes slideIn{from{transform:translateX(80px);opacity:0}to{transform:translateX(0);opacity:1}}
        .tab-item{transition:all .15s;cursor:pointer} .tab-item:hover{background:rgba(48,120,255,0.08)!important}
        .action-btn{transition:all .15s;cursor:pointer} .action-btn:hover{filter:brightness(1.15);transform:translateY(-1px)}
        .card{animation:fadeIn .35s ease forwards}
        input,select,textarea{background:var(--app-input)!important;color:var(--app-text)!important;border:1px solid var(--app-border)!important;border-radius:8px!important;padding:10px 13px!important;font-size:13px!important;outline:none!important;font-family:Inter,sans-serif!important;width:100%}
        input:focus,select:focus,textarea:focus{border-color:rgba(48,120,255,0.5)!important}
        select option{background:var(--app-panel);color:var(--app-text)}
        table{width:100%;border-collapse:collapse}
        th{padding:10px 14px;text-align:left;font-size:10px;font-weight:700;color:var(--app-muted);letter-spacing:1px;text-transform:uppercase;border-bottom:1px solid var(--app-border);white-space:nowrap}
        td{padding:11px 14px;font-size:13px;border-bottom:1px solid var(--app-border);vertical-align:middle}
        tr:hover td{background:rgba(48,120,255,0.04)}
        .stat-card{background:var(--app-panel);border:1px solid var(--app-border);border-radius:14px;padding:18px 16px;transition:all .2s;color:var(--app-text)}
        .stat-card:hover{border-color:rgba(48,120,255,0.28)}
        .modal-backdrop{position:fixed;inset:0;background:rgba(0,0,0,0.75);z-index:200;display:flex;align-items:center;justify-content:center;padding:16px}
        .modal{background:var(--app-panel);border:1px solid var(--app-border);border-radius:18px;padding:28px;width:100%;max-width:560px;max-height:90vh;overflow-y:auto;color:var(--app-text)}
        @media(max-width:700px){.sidebar-text{display:none}}
      `}</style>

      {/* TOAST */}
      {toast && (
        <div style={{position:"fixed",top:18,right:18,zIndex:9999,background:toast.type==="success"?"#3fb950":"#f85149",color:"#fff",padding:"11px 18px",borderRadius:11,fontWeight:700,fontSize:13,boxShadow:"0 8px 24px rgba(0,0,0,0.4)",animation:"slideIn .3s ease",maxWidth:300}}>
          {toast.type==="success"?"✅ ":"❌ "}{toast.msg}
        </div>
      )}

      {/* LOW STOCK MODAL */}
      {lowStockOpen && (
        <div className="modal-backdrop" onClick={()=>setLowStockOpen(false)}>
          <div className="modal" style={{maxWidth:560}} onClick={e=>e.stopPropagation()}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20}}>
              <div style={{fontSize:17,fontWeight:800}}>⚠️ {t.lowStockProducts}</div>
              <button onClick={()=>setLowStockOpen(false)} style={{background:"rgba(255,255,255,0.06)",border:"1px solid rgba(255,255,255,0.1)",color:"rgba(255,255,255,0.5)",borderRadius:8,padding:"5px 12px",cursor:"pointer",fontSize:13}}>✕</button>
            </div>
              <LowStockList products={products} stock={stock} t={t} />
          </div>
        </div>
      )}

      {/* SIDEBAR */}
      <div className="app-sidebar theme-panel" style={{background:"var(--app-panel)",borderRight:"1px solid var(--app-border)",display:"flex",flexDirection:"column",flexShrink:0,transition:"width .2s",overflow:"hidden"}}>
        <div className="brand-row" style={{padding:"14px 12px",borderBottom:"1px solid var(--app-border)",display:"flex",alignItems:"center",gap:8,cursor:"default"}}>
          <span style={{fontSize:22,flexShrink:0}}>🏭</span>
          <div className="sidebar-meta"><div style={{fontWeight:800,fontSize:14,whiteSpace:"nowrap"}}>Oshxona CRM</div><div style={{fontSize:10,color:"var(--app-muted)"}}>v2.0</div></div>
        </div>
        <div className="sidebar-card theme-soft" style={{margin:"10px",padding:10,background:"var(--app-panel-soft)",border:"1px solid var(--app-border)",borderRadius:11}}>
            <div style={{fontSize:20,marginBottom:3}}>{user.branchIcon}</div>
            <div style={{fontWeight:700,fontSize:13}}>{user.name}</div>
            <div style={{fontSize:11,color:"var(--app-muted)"}}>{user.branchName}</div>
          </div>
        <div className="sidebar-controls theme-soft" style={{margin:"0 10px 10px",padding:8,background:"var(--app-panel-soft)",border:"1px solid var(--app-border)",borderRadius:10}}>
            <div style={{fontSize:10,color:"var(--app-muted)",marginBottom:7,fontWeight:700}}>{t.language}</div>
            <div className="sidebar-control-grid" style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:6}}>
              {(["uz","ko"] as const).map(code=>(
                <button key={code} onClick={()=>setLang(code)} style={{border:`1px solid ${lang===code?"rgba(48,120,255,0.45)":"rgba(255,255,255,0.08)"}`,background:lang===code?"rgba(48,120,255,0.14)":"rgba(255,255,255,0.03)",color:lang===code?"#79c0ff":"rgba(255,255,255,0.55)",borderRadius:8,padding:"7px 8px",fontSize:11,fontWeight:800,cursor:"pointer"}}>
                  {code==="uz"?"UZ":"KO"}
                </button>
              ))}
            </div>
          </div>
        <div className="sidebar-controls theme-soft" style={{margin:"0 10px 10px",padding:8,background:"var(--app-panel-soft)",border:"1px solid var(--app-border)",borderRadius:10}}>
            <div style={{fontSize:10,color:"var(--app-muted)",marginBottom:7,fontWeight:700}}>{t.mode}</div>
            <button onClick={()=>setTheme(theme==="dark"?"light":"dark")} style={{width:"100%",border:"1px solid var(--app-border)",background:theme==="dark"?"rgba(48,120,255,0.14)":"rgba(15,23,42,0.04)",color:"var(--app-text)",borderRadius:8,padding:"8px 10px",fontSize:11,fontWeight:800,cursor:"pointer"}}>
              {theme==="dark"?t.dark:t.light}
            </button>
          </div>
        <nav style={{flex:1,padding:6}}>
          {translatedTabs.map(nav=>(
            <div key={nav.id} className="tab-item" onClick={()=>setTab(nav.id)}
              style={{display:"flex",alignItems:"center",gap:9,padding:"9px 11px",borderRadius:9,marginBottom:2,background:tab===nav.id?"rgba(48,120,255,0.12)":"transparent",color:tab===nav.id?"#3078ff":"rgba(255,255,255,0.6)",fontWeight:tab===nav.id?700:400,fontSize:13,border:`1px solid ${tab===nav.id?"rgba(48,120,255,0.25)":"transparent"}`,whiteSpace:"nowrap",overflow:"hidden"}}>
              <span style={{fontSize:17,flexShrink:0}}>{nav.icon}</span>
              <span className="sidebar-text">{nav.label}</span>
            </div>
          ))}
        </nav>
        <div className="sidebar-footer" style={{padding:"8px",borderTop:"1px solid var(--app-border)"}}>
          <div className="tab-item" onClick={()=>setUser(null)} style={{display:"flex",alignItems:"center",gap:9,padding:"9px 11px",borderRadius:9,color:"#f85149",fontSize:13}}>
            <span style={{fontSize:17}}>🚪</span>
            <span className="sidebar-text">{t.logout}</span>
          </div>
        </div>
      </div>

      {/* MAIN CONTENT */}
      <div className="flex-1 overflow-auto pb-24 md:pb-0">
        <div className="sticky top-0 z-[130] mx-3 mb-2 mt-3 flex items-center justify-between gap-3 rounded-xl border border-[var(--app-border)] bg-[var(--app-panel)] px-3 py-2 text-[var(--app-text)] shadow-sm md:hidden">
          <div className="flex min-w-0 items-center gap-2">
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-[var(--app-panel-soft)] text-lg">{user.branchIcon}</span>
            <div>
              <div className="truncate text-sm font-black leading-4">{user.name}</div>
              <div className="truncate text-[11px] font-semibold text-[var(--app-muted)]">{user.branchName}</div>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-1.5">
            <button className="rounded-lg border border-[var(--app-border)] bg-[var(--app-panel-soft)] px-2.5 py-2 text-[11px] font-black text-[var(--app-text)]" onClick={()=>setLang(lang==="uz"?"ko":"uz")}>{lang==="uz"?"UZ":"KO"}</button>
            <button className="rounded-lg border border-[var(--app-border)] bg-[var(--app-panel-soft)] px-2.5 py-2 text-[11px] font-black text-[var(--app-text)]" onClick={()=>setTheme(theme==="dark"?"light":"dark")}>{theme==="dark"?t.dark:t.light}</button>
            <button className="rounded-lg border border-red-500/25 bg-red-500/10 px-2.5 py-2 text-[11px] font-black text-red-500" onClick={()=>setUser(null)}>{t.logout}</button>
          </div>
        </div>
        {tab==="dashboard"  && <DashboardTab  reports={reports} user={user} setTab={setTab} transfers={transfers} suppliers={suppliers} openLowStock={()=>setLowStockOpen(true)} t={t} />}
        {tab==="warehouse"  && <WarehouseTab  products={products} stock={stock} user={user} onRefresh={fetchAll} showToast={showToast} openLowStock={()=>setLowStockOpen(true)} t={t} />}
        {tab==="transfers"  && <TransfersTab  transfers={transfers} products={products} user={user} onRefresh={fetchAll} showToast={showToast} t={t} />}
        {tab==="staff"      && <StaffTab      staffList={staffList} user={user} onRefresh={fetchAll} showToast={showToast} t={t} />}
        {tab==="reports"    && <ReportsTab    reports={reports} transfers={transfers} t={t} />}
        {tab==="suppliers"  && <SuppliersTab  suppliers={suppliers} products={products} user={user} onRefresh={fetchAll} showToast={showToast} lang={lang} t={t} />}
        {tab==="products" && isSA && <ProductsTab products={products} stock={stock} onRefresh={fetchAll} showToast={showToast} t={t} />}
      </div>
    </div>
  );
}

// ─── LOW STOCK LIST (shared) ─────────────────────────────────
function LowStockList({ products, stock, t }:{ products:Product[]; stock:StockMap; t:Record<string,string> }) {
  const items = products
    .map(p=>({ p, qty:stock[p.id]||0 }))
    .filter(({p,qty})=>qty<=p.minStock*2)
    .sort((a,b)=>a.qty/a.p.minStock - b.qty/b.p.minStock);
  if (!items.length) return <div style={{textAlign:"center",padding:40,color:"rgba(255,255,255,0.4)"}}>✓ {t.allProductsOk}</div>;
  return (
    <div style={{display:"flex",flexDirection:"column",gap:8}}>
      {items.map(({p,qty})=>{
        const pct = Math.min(100,Math.round(qty/p.minStock*100));
        const col = qtyColor(qty,p.minStock);
        const dona = p.perBox>0 ? ` (${fmt(qty*p.perBox)} ${p.boxUnit})` : "";
        return (
          <div key={p.id} style={{background:"rgba(255,255,255,0.03)",border:`1px solid ${qty<=p.minStock?"rgba(248,81,73,0.2)":"rgba(240,165,0,0.2)"}`,borderRadius:11,padding:"12px 14px"}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
              <div style={{fontWeight:700,fontSize:14}}>{p.name}{p.perBox>0&&<span style={{fontSize:10,background:"rgba(48,120,255,0.1)",color:"#79c0ff",padding:"1px 7px",borderRadius:8,marginLeft:6}}>1={p.perBox}{p.boxUnit}</span>}</div>
              <span style={{fontWeight:800,color:col,fontSize:15}}>{fmt(qty)} {p.unit}<span style={{color:"#a371f7",fontSize:12}}>{dona}</span></span>
            </div>
            <div style={{display:"flex",alignItems:"center",gap:10}}>
              <div style={{flex:1,height:7,background:"rgba(255,255,255,0.08)",borderRadius:4,overflow:"hidden"}}>
                <div style={{height:"100%",width:`${pct}%`,background:col,borderRadius:4,transition:"width .5s"}} />
              </div>
              <span style={{fontSize:11,color:"rgba(255,255,255,0.4)",whiteSpace:"nowrap"}}>{qty} / min {p.minStock} ({pct}%)</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ════════════════════════════════════════════════════════════
// DASHBOARD
// ════════════════════════════════════════════════════════════
function DashboardTab({ reports, user, setTab, transfers, suppliers, openLowStock, t }:any) {
  const isSA = user.role==="superadmin";
  const tt = t;
  if (!reports) return <PageWrap><div style={{color:"rgba(255,255,255,0.4)"}}>{t.loading}</div></PageWrap>;
  const totalDebt = suppliers.reduce((s:number,x:Supplier)=>s+(x.totalPrice-x.paidAmount),0);
  const myBranch = reports.branchStats?.find((b:any)=>b.branch===user.role);
  const stats = isSA ? [
    { l:t.mainStockValue,  v:fmtM(reports.mainStockValue), c:"#3fb950", i:"💰" },
    { l:t.productTypes,     v:reports.totalProducts,         c:"#3078ff", i:"📦" },
    { l:t.totalStaff,       v:reports.totalStaff,            c:"#f0a500", i:"👥" },
    { l:t.supplierDebt,     v:fmtM(totalDebt), c:totalDebt>0?"#f85149":"#3fb950", i:"🚚" },
  ] : [
    { l:t.myStockValue,    v:fmtM(myBranch?.stockValue||0), c:"#3fb950", i:"💰" },
    { l:t.myRequests,       v:myBranch?.totalTransfers||0,   c:"#3078ff", i:"🔄" },
    { l:t.pending,           v:myBranch?.pendingTransfers||0, c:"#f0a500", i:"⏳" },
    { l:t.lowStock,       v:myBranch?.lowStockCount||0, c:(myBranch?.lowStockCount||0)>0?"#f85149":"#3fb950", i:"⚠️", click:true },
  ];
  return (
    <PageWrap title={`${BICON[user.role]} ${user.branchName} - ${t.dashboard}`} sub={new Date().toLocaleDateString("ko-KR",{weekday:"long",year:"numeric",month:"long",day:"numeric"})}>
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(180px,1fr))",gap:14,marginBottom:28}}>
        {stats.map((s,i)=>(
          <div key={i} className="stat-card card" onClick={s.click?openLowStock:undefined} style={{cursor:s.click?"pointer":"default"}}>
            <div style={{fontSize:26,marginBottom:8}}>{s.i}</div>
            <div style={{color:"rgba(255,255,255,0.4)",fontSize:11,marginBottom:6}}>{s.l}</div>
            <div style={{fontWeight:800,fontSize:22,color:s.c}}>{s.v}</div>
          </div>
        ))}
      </div>
      {isSA && reports.branchStats && (
        <div style={{marginBottom:28}}>
          <div style={{fontSize:14,fontWeight:700,marginBottom:14}}>🏢 {t.branchStatus}</div>
          <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(240px,1fr))",gap:14}}>
            {reports.branchStats.map((b:any)=>(
              <div key={b.branch} className="card" style={{background:"#161b22",border:"1px solid rgba(255,255,255,0.06)",borderRadius:14,padding:18}}>
                <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:14}}>
                  <span style={{fontSize:28}}>{b.branchIcon}</span>
                  <div><div style={{fontWeight:700,fontSize:15}}>{b.branchName}</div><div style={{fontSize:11,color:"rgba(255,255,255,0.4)"}}>{b.staffCount} {t.staffLabel}</div></div>
                </div>
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
                  {[[t.stockValue,fmtM(b.stockValue),"#3fb950"],[t.totalReceived,fmtM(b.totalReceived),"#3078ff"],[t.approved,b.approvedTransfers,"#3fb950"],[t.lowStock,b.lowStockCount,b.lowStockCount>0?"#f85149":"#3fb950"]].map(([l,v,c],j)=>(
                    <div key={j} style={{background:"rgba(255,255,255,0.03)",borderRadius:9,padding:"9px 11px"}}>
                      <div style={{fontSize:10,color:"rgba(255,255,255,0.4)",marginBottom:3}}>{l}</div>
                      <div style={{fontWeight:700,color:String(c),fontSize:13}}>{v}</div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}>
        <div style={{fontSize:14,fontWeight:700}}>🔄 {t.recentTransfers}</div>
        <button onClick={()=>setTab("transfers")} style={{background:"rgba(48,120,255,0.1)",border:"1px solid rgba(48,120,255,0.2)",color:"#3078ff",borderRadius:8,padding:"5px 13px",cursor:"pointer",fontSize:12,fontWeight:600}}>{t.all} →</button>
      </div>
      <div style={{background:"#161b22",border:"1px solid rgba(255,255,255,0.06)",borderRadius:14,overflow:"hidden"}}>
        <table>
          <thead><tr><th>ID</th><th>{t.branch}</th><th>{t.value}</th><th>{t.status}</th><th>{t.date}</th></tr></thead>
          <tbody>
            {transfers.slice(0,8).map((t:Transfer)=>{
              const st=ST_CFG[t.status];
              return (
                <tr key={t.id}>
                  <td style={{fontFamily:"monospace",fontSize:11,color:"#3078ff"}}>{t.id.slice(-8)}</td>
                  <td>{BICON[t.toBranch]} {BNAME[t.toBranch]}</td>
                  <td style={{color:"#3fb950",fontWeight:700}}>{fmtM(t.totalValue)}</td>
                  <td><span style={{background:st.bg,color:st.c,padding:"2px 10px",borderRadius:20,fontSize:11,fontWeight:700}}>{st.i} {stText(tt,t.status)}</span></td>
                  <td style={{fontSize:11,color:"rgba(255,255,255,0.4)"}}>{fmtD(t.createdAt)}</td>
                </tr>
              );
            })}
            {transfers.length===0 && <tr><td colSpan={5} style={{textAlign:"center",color:"rgba(255,255,255,0.4)",padding:30}}>{t.noTransfersYet}</td></tr>}
          </tbody>
        </table>
      </div>
    </PageWrap>
  );
}

// ════════════════════════════════════════════════════════════
// WAREHOUSE
// ════════════════════════════════════════════════════════════
function WarehouseTab({ products, stock, user, onRefresh, showToast, openLowStock, t }:any) {
  const [search, setSearch] = useState("");
  const [cat, setCat] = useState("all");
  const [editProduct, setEditProduct] = useState<Product|null>(null);
  const [newQty, setNewQty] = useState("");
  const isSA = user.role==="superadmin";
  const cats = ["all",...Array.from(new Set(products.map((p:Product)=>p.category))) as string[]];
  const totalVal = products.reduce((s:number,p:Product)=>s+(stock[p.id]||0)*p.pricePerUnit,0);
  const lowCount = products.filter((p:Product)=>(stock[p.id]||0)<=p.minStock).length;
  const medCount = products.filter((p:Product)=>{const q=stock[p.id]||0;return q>p.minStock&&q<=p.minStock*2;}).length;
  const filtered = products.filter((p:Product)=>{
    return p.name.toLowerCase().includes(search.toLowerCase()) && (cat==="all"||p.category===cat);
  });

  const saveStock = async () => {
    if (!editProduct) return;
    const qty = parseFloat(newQty);
    if (isNaN(qty)||qty<0) { showToast(t.invalidQuantity,"error"); return; }
    const data = updateStockLocal(editProduct.id, qty);
    if (data.success) { showToast(t.stockUpdated); setEditProduct(null); onRefresh(); }
    else showToast(t.errorUpdatingStock,"error");
  };

  return (
    <PageWrap title={`📦 ${t.warehouse}`} sub={<>{t.totalValue}: <strong style={{color:"#3fb950"}}>{fmtM(totalVal)}</strong></>}>
      {editProduct && (
        <div className="modal-backdrop">
          <div className="modal" style={{maxWidth:360}}>
            <div style={{fontSize:17,fontWeight:800,marginBottom:16}}>📝 {t.editStockQuantity}</div>
            <div style={{background:"rgba(255,255,255,0.04)",borderRadius:10,padding:13,marginBottom:14}}>
              <div style={{fontWeight:700,marginBottom:4}}>{editProduct.name}</div>
              <div style={{color:"rgba(255,255,255,0.4)",fontSize:12}}>{t.current}: <strong style={{color:"#f0a500"}}>{fmt(stock[editProduct.id]||0)} {editProduct.unit}</strong></div>
            </div>
            <label style={{fontSize:11,color:"rgba(255,255,255,0.5)",fontWeight:600,letterSpacing:1,display:"block",marginBottom:7}}>{t.newQuantity} ({editProduct.unit})</label>
            <input type="number" value={newQty} onChange={e=>setNewQty(e.target.value)} style={{marginBottom:16}} />
            <div style={{display:"flex",gap:10}}>
              <button onClick={()=>setEditProduct(null)} style={{flex:1,padding:11,borderRadius:10,border:"1px solid rgba(255,255,255,0.1)",background:"transparent",color:"rgba(255,255,255,0.5)",cursor:"pointer"}}>{t.cancel}</button>
              <button onClick={saveStock} style={{flex:2,padding:11,borderRadius:10,border:"none",background:"linear-gradient(135deg,#3078ff,#1a56db)",color:"#fff",fontWeight:700,cursor:"pointer"}}>💾 {t.save}</button>
            </div>
          </div>
        </div>
      )}

      {/* LOW STOCK WARNING */}
      {lowCount>0 && (
        <div onClick={openLowStock} style={{background:"rgba(248,81,73,0.08)",border:"1px solid rgba(248,81,73,0.25)",borderRadius:11,padding:"12px 16px",display:"flex",alignItems:"center",gap:10,marginBottom:20,cursor:"pointer"}}>
          <span style={{fontSize:20}}>⚠️</span>
          <div style={{flex:1}}>
            <div style={{color:"#f85149",fontWeight:700,fontSize:13}}>{lowCount} {t.lowStockWarning}! {medCount>0&&`· ${medCount} ${t.medium}`}</div>
            <div style={{fontSize:11,color:"rgba(255,255,255,0.4)"}}>{t.clickDetails} →</div>
          </div>
          <span style={{color:"#f85149",fontSize:18}}>›</span>
        </div>
      )}

      {/* LEGEND */}
      <div style={{display:"flex",gap:16,marginBottom:16,flexWrap:"wrap"}}>
        <span style={{fontSize:12,color:"rgba(255,255,255,0.5)"}}>🟢 {t.good} (&gt;2× min) &nbsp; 🟡 {t.medium} (1–2× min) &nbsp; 🔴 {t.lowStock} (≤ min)</span>
      </div>

      {/* FILTERS */}
      <div style={{display:"flex",gap:10,marginBottom:18,flexWrap:"wrap"}}>
        <input value={search} onChange={e=>setSearch(e.target.value)} placeholder={`🔍 ${t.searchProduct}`} style={{flex:1,minWidth:180,maxWidth:300}} />
        <select value={cat} onChange={e=>setCat(e.target.value)} style={{minWidth:150}}>
          <option value="all">{t.allCategories}</option>
          {cats.filter(c=>c!=="all").map(c=><option key={c} value={c}>{CATICON[c]||"📦"} {c}</option>)}
        </select>
      </div>

      <div style={{background:"#161b22",border:"1px solid rgba(255,255,255,0.06)",borderRadius:14,overflow:"auto"}}>
        <table>
          <thead>
            <tr><th>#</th><th>{t.product}</th><th>{t.category}</th><th>{t.quantity}</th><th>{t.unit}</th><th>{t.totalUnits}</th><th>{t.price}</th><th>{t.value}</th><th>{t.status}</th>{isSA&&<th>{t.action}</th>}</tr>
          </thead>
          <tbody>
            {filtered.map((p:Product,i:number)=>{
              const qty=stock[p.id]||0; const val=qty*p.pricePerUnit;
              const hasBox=p.perBox>0; const dona=hasBox?qty*p.perBox:null;
              return (
                <tr key={p.id}>
                  <td style={{color:"rgba(255,255,255,0.3)",fontSize:11}}>{i+1}</td>
                  <td style={{fontWeight:600}}>{p.name}{hasBox&&<span style={{fontSize:10,background:"rgba(48,120,255,0.1)",color:"#79c0ff",padding:"1px 7px",borderRadius:8,marginLeft:5}}>1={p.perBox}{p.boxUnit}</span>}</td>
                  <td>{CATICON[p.category]||"📦"} <span style={{fontSize:11,color:"rgba(255,255,255,0.4)"}}>{p.category}</span></td>
                  <td><span style={{fontWeight:800,color:qtyColor(qty,p.minStock),fontSize:15}}>{fmt(qty)}</span></td>
                  <td style={{color:"rgba(255,255,255,0.5)"}}>{p.unit}</td>
                  <td>{dona!==null?<><span style={{color:"#a371f7",fontWeight:700}}>{fmt(dona)}</span> <span style={{fontSize:10,color:"rgba(255,255,255,0.4)"}}>{p.boxUnit}</span></>:<span style={{color:"rgba(255,255,255,0.3)"}}>—</span>}</td>
                  <td style={{fontSize:12,color:"rgba(255,255,255,0.5)"}}>{fmtM(p.pricePerUnit)}</td>
                  <td style={{fontWeight:700,color:"#3078ff"}}>{fmtM(val)}</td>
                  <td>{qtyBadge(qty,p.minStock,t)}</td>
                  {isSA&&<td><button className="action-btn" onClick={()=>{setEditProduct(p);setNewQty(String(qty));}} style={{background:"rgba(48,120,255,0.1)",border:"1px solid rgba(48,120,255,0.2)",color:"#3078ff",borderRadius:8,padding:"5px 11px",fontSize:11,fontWeight:600}}>✏️ {t.edit}</button></td>}
                </tr>
              );
            })}
            {filtered.length===0&&<tr><td colSpan={10} style={{textAlign:"center",color:"rgba(255,255,255,0.4)",padding:30}}>{t.noProductsFound}</td></tr>}
          </tbody>
        </table>
      </div>
    </PageWrap>
  );
}

// ════════════════════════════════════════════════════════════
// TRANSFERS
// ════════════════════════════════════════════════════════════
function TransfersTab({ transfers, products, user, onRefresh, showToast, t }:any) {
  const tt = t;
  const [statusF, setStatusF] = useState("all");
  const [showReq, setShowReq] = useState(false);
  const [detail, setDetail] = useState<Transfer|null>(null);
  const [reqItems, setReqItems] = useState([{pid:"",qty:1}]);
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(false);
  const isSA = user.role==="superadmin";
  const myTr = isSA?transfers:transfers.filter((t:Transfer)=>t.toBranch===user.role);
  const filtered = myTr.filter((t:Transfer)=>statusF==="all"||t.status===statusF);

  const submitReq = async () => {
    const valid = reqItems.filter(i=>i.pid&&i.qty>0);
    if (!valid.length) { showToast(t.addProduct,"error"); return; }
    setLoading(true);
    const data = createTransferLocal(user.role, valid.map(i=>({productId:i.pid,quantity:i.qty})), user.name, note);
    if (data.success) { showToast(t.sendRequest); setShowReq(false); setReqItems([{pid:"",qty:1}]); setNote(""); onRefresh(); }
    else showToast(data.message,"error");
    setLoading(false);
  };

  const approve = async (id:string) => {
    const data = approveTransferLocal(id, user.name);
    if(data.success){showToast(t.approved);onRefresh();}else showToast(data.message,"error");
  };
  const reject = async (id:string) => {
    const data = rejectTransferLocal(id, user.name);
    if(data.success){showToast(t.rejected,"error");onRefresh();}
  };

  return (
    <PageWrap title={`🔄 ${t.transfers}`} sub={`${myTr.length} ${t.totalTransfers}`}
      action={!isSA&&<Btn color="blue" onClick={()=>setShowReq(true)}>📤 {t.newRequest}</Btn>}>

      {/* REQUEST MODAL */}
      {showReq && (
        <div className="modal-backdrop">
          <div className="modal" style={{maxWidth:560}}>
            <div style={{fontSize:17,fontWeight:800,marginBottom:16}}>📤 {t.transferRequest}</div>
            <div style={{background:"rgba(48,120,255,0.08)",border:"1px solid rgba(48,120,255,0.2)",borderRadius:9,padding:"10px 14px",fontSize:12,color:"rgba(255,255,255,0.6)",marginBottom:14}}>
              {t.requestFrom}: <strong style={{color:"#fff"}}>{t.mainWarehouse}</strong> → <strong style={{color:"#fff"}}>{user.branchName}</strong>
            </div>
            {reqItems.map((item,i)=>(
              <div key={i} style={{display:"grid",gridTemplateColumns:"1fr 90px 30px",gap:8,marginBottom:8,alignItems:"center"}}>
                <select value={item.pid} onChange={e=>{const n=[...reqItems];n[i].pid=e.target.value;setReqItems(n);}}>
                  <option value="">{t.selectProduct}</option>
                  {products.map((p:Product)=><option key={p.id} value={p.id}>{p.name} ({p.unit})</option>)}
                </select>
                <input type="number" value={item.qty} min={0.1} step={0.1} onChange={e=>{const n=[...reqItems];n[i].qty=parseFloat(e.target.value)||1;setReqItems(n);}} placeholder={t.quantity} />
                <button onClick={()=>setReqItems(reqItems.filter((_,idx)=>idx!==i))} style={{background:"rgba(248,81,73,0.1)",border:"1px solid rgba(248,81,73,0.2)",color:"#f85149",borderRadius:7,padding:6,cursor:"pointer",fontSize:14}}>×</button>
              </div>
            ))}
            <button onClick={()=>setReqItems([...reqItems,{pid:"",qty:1}])} style={{width:"100%",padding:9,borderRadius:8,border:"1px dashed rgba(63,185,80,0.4)",background:"rgba(63,185,80,0.06)",color:"#3fb950",cursor:"pointer",fontSize:12,fontWeight:600,marginBottom:12}}>{t.addProduct}</button>
            <textarea value={note} onChange={e=>setNote(e.target.value)} placeholder={t.note} rows={2} style={{resize:"vertical",marginBottom:14}} />
            <div style={{display:"flex",gap:10}}>
              <button onClick={()=>setShowReq(false)} style={{flex:1,padding:11,borderRadius:10,border:"1px solid rgba(255,255,255,0.1)",background:"transparent",color:"rgba(255,255,255,0.5)",cursor:"pointer"}}>{t.cancel}</button>
              <button onClick={submitReq} disabled={loading} style={{flex:2,padding:11,borderRadius:10,border:"none",background:"linear-gradient(135deg,#3078ff,#1a56db)",color:"#fff",fontWeight:700,cursor:"pointer"}}>
                {loading?t.sending:`📤 ${t.sendRequest}`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DETAIL MODAL */}
      {detail && (
        <div className="modal-backdrop">
          <div className="modal" style={{maxWidth:520}}>
            <div style={{fontSize:17,fontWeight:800,marginBottom:16}}>📋 {t.transferDetails}</div>
            <div className="mobile-stack" style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:14}}>
              {[["ID",detail.id,true],[t.status,`${ST_CFG[detail.status].i} ${stText(t,detail.status)}`],[t.branch,`${BICON[detail.toBranch]} ${BNAME[detail.toBranch]}`],[t.requestedBy,detail.requestedBy],[t.approvedBy,detail.approvedBy||"—"],[t.totalValue,fmtM(detail.totalValue)]].map(([l,v,mono],i)=>(
                <div key={i} style={{background:"rgba(255,255,255,0.04)",borderRadius:9,padding:"10px 12px"}}>
                  <div style={{fontSize:10,color:"rgba(255,255,255,0.4)",marginBottom:3}}>{l}</div>
                  <div style={{fontWeight:600,fontSize:12,fontFamily:mono?"monospace":"inherit",color:mono?"#3078ff":"#fff",wordBreak:"break-all"}}>{v}</div>
                </div>
              ))}
            </div>
            {detail.note&&<div style={{background:"rgba(255,255,255,0.04)",borderRadius:9,padding:"10px 12px",fontSize:12,color:"rgba(255,255,255,0.5)",marginBottom:14}}>📝 {detail.note}</div>}
            <div style={{fontSize:13,fontWeight:700,marginBottom:10}}>{t.products}:</div>
            <div style={{display:"flex",flexDirection:"column",gap:7,marginBottom:16}}>
              {detail.items.map((it:any,i:number)=>{
                const dona=it.perBox>0?<span style={{color:"#a371f7",fontSize:11}}> ({fmt(it.quantity*it.perBox)} {it.boxUnit})</span>:null;
                return (
                  <div key={i} style={{display:"flex",justifyContent:"space-between",background:"rgba(255,255,255,0.04)",borderRadius:9,padding:"9px 12px"}}>
                    <span style={{fontWeight:600}}>{it.productName}</span>
                    <span style={{color:"rgba(255,255,255,0.5)"}}>{fmt(it.quantity)} {it.unit}{dona}</span>
                    <span style={{color:"#3078ff",fontWeight:700}}>{fmtM(it.quantity*it.pricePerUnit)}</span>
                  </div>
                );
              })}
            </div>
            <button onClick={()=>setDetail(null)} style={{width:"100%",padding:11,borderRadius:10,border:"1px solid rgba(255,255,255,0.1)",background:"transparent",color:"rgba(255,255,255,0.5)",cursor:"pointer"}}>{t.close}</button>
          </div>
        </div>
      )}

      {/* FILTERS */}
      <div style={{display:"flex",gap:8,marginBottom:18,flexWrap:"wrap"}}>
        {["all","pending","approved","rejected"].map(s=>{
          const cnt=s==="all"?myTr.length:myTr.filter((t:Transfer)=>t.status===s).length;
          return <button key={s} onClick={()=>setStatusF(s)} style={{padding:"7px 14px",borderRadius:8,border:`1px solid ${statusF===s?"rgba(48,120,255,0.4)":"rgba(255,255,255,0.1)"}`,background:statusF===s?"rgba(48,120,255,0.12)":"rgba(255,255,255,0.04)",color:statusF===s?"#3078ff":"rgba(255,255,255,0.6)",cursor:"pointer",fontSize:12,fontWeight:statusF===s?700:400}}>
            {s==="all"?t.all:stText(t,s)} <span style={{background:"rgba(255,255,255,0.1)",borderRadius:10,padding:"1px 7px",marginLeft:4,fontSize:10}}>{cnt}</span>
          </button>;
        })}
      </div>

      <div style={{display:"flex",flexDirection:"column",gap:10}}>
        {filtered.map((t:Transfer)=>{
          const st=ST_CFG[t.status];
          return (
            <div key={t.id} style={{background:"#161b22",border:"1px solid rgba(255,255,255,0.06)",borderRadius:14,padding:"16px 18px"}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",flexWrap:"wrap",gap:10}}>
                <div style={{flex:1}}>
                  <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:8,flexWrap:"wrap"}}>
                    <code style={{fontSize:12,color:"#3078ff",background:"rgba(48,120,255,0.1)",padding:"2px 8px",borderRadius:5}}>{t.id}</code>
                    <span style={{background:st.bg,color:st.c,padding:"2px 10px",borderRadius:20,fontSize:11,fontWeight:700}}>{st.i} {stText(tt,t.status)}</span>
                  </div>
                  <div style={{display:"flex",gap:14,fontSize:12,color:"rgba(255,255,255,0.5)",flexWrap:"wrap"}}>
                    <span>📍 {BICON[t.toBranch]} {BNAME[t.toBranch]}</span>
                    <span>👤 {t.requestedBy}</span>
                    <span>📦 {t.items.length} {tt.products}</span>
                    <span style={{color:"#3fb950",fontWeight:700}}>💰 {fmtM(t.totalValue)}</span>
                    <span>🕐 {fmtD(t.createdAt)}</span>
                  </div>
                  {t.note&&<div style={{marginTop:6,fontSize:11,color:"rgba(255,255,255,0.4)",fontStyle:"italic"}}>📝 {t.note}</div>}
                </div>
                <div style={{display:"flex",gap:7,flexWrap:"wrap"}}>
                  <button className="action-btn" onClick={()=>setDetail(t)} style={{background:"rgba(255,255,255,0.06)",border:"1px solid rgba(255,255,255,0.1)",color:"rgba(255,255,255,0.7)",borderRadius:8,padding:"7px 12px",fontSize:12}}>🔍 {tt.view}</button>
                  {isSA&&t.status==="pending"&&<>
                    <button className="action-btn" onClick={()=>approve(t.id)} style={{background:"rgba(63,185,80,0.1)",border:"1px solid rgba(63,185,80,0.3)",color:"#3fb950",borderRadius:8,padding:"7px 12px",fontSize:12,fontWeight:700}}>✅ {tt.approve}</button>
                    <button className="action-btn" onClick={()=>reject(t.id)} style={{background:"rgba(248,81,73,0.1)",border:"1px solid rgba(248,81,73,0.3)",color:"#f85149",borderRadius:8,padding:"7px 12px",fontSize:12,fontWeight:700}}>❌ {tt.reject}</button>
                  </>}
                </div>
              </div>
            </div>
          );
        })}
        {filtered.length===0&&<div style={{textAlign:"center",padding:"60px 20px",color:"rgba(255,255,255,0.3)"}}>📭<br/><span style={{fontSize:16,marginTop:12,display:"block"}}>{t.noTransfers}</span></div>}
      </div>
    </PageWrap>
  );
}

// ════════════════════════════════════════════════════════════
// SUPPLIERS
// ════════════════════════════════════════════════════════════
function SuppliersTab({ suppliers, products, user, onRefresh, showToast, t }:any) {
  const [filter, setFilter] = useState("all");
  const [selectedFirm, setSelectedFirm] = useState<string|null>(null);
  const [firmView, setFirmView] = useState<"history"|"add"|"payments">("history");
  const [paymentDrafts, setPaymentDrafts] = useState<Record<string,string>>({});
  const [showModal, setShowModal] = useState(false);
  const [supItems, setSupItems] = useState([{pid:"",qty:1,price:0,qr:""}]);
  const [payMethod, setPayMethod] = useState<"paid"|"unpaid"|"partial">("unpaid");
  const [form, setForm] = useState({firm:"",doc:"",date:new Date().toISOString().slice(0,10),note:"",totalPrice:"",paidAmount:""});
  const [lockedFirm, setLockedFirm] = useState("");
  const [loading, setLoading] = useState(false);

  const totalVal = suppliers.reduce((s:number,x:Supplier)=>s+x.totalPrice,0);
  const totalPaid = suppliers.reduce((s:number,x:Supplier)=>s+x.paidAmount,0);
  const totalDebt = totalVal - totalPaid;
  const filtered = suppliers.filter((s:Supplier)=>filter==="all"||s.payStatus===filter);
  const firmRows = Object.values(suppliers.reduce((acc:Record<string,any>, s:Supplier)=>{
    const key = s.firm.trim() || "Noma'lum firma";
    if (!acc[key]) acc[key] = { name:key, count:0, total:0, paid:0, debt:0, lastDate:s.createdAt, products:0 };
    acc[key].count += 1;
    acc[key].total += s.totalPrice;
    acc[key].paid += s.paidAmount;
    acc[key].debt += s.totalPrice - s.paidAmount;
    acc[key].products += s.items.length;
    if (new Date(s.createdAt) > new Date(acc[key].lastDate)) acc[key].lastDate = s.createdAt;
    return acc;
  },{})).sort((a:any,b:any)=>new Date(b.lastDate).getTime()-new Date(a.lastDate).getTime());
  const selectedHistory = selectedFirm ? suppliers.filter((s:Supplier)=>(s.firm.trim() || "Noma'lum firma")===selectedFirm) : [];
  const selectedFirmRow:any = firmRows.find((f:any)=>f.name===selectedFirm);

  const openFirmWindow = (firmName:string, view:"history"|"add"|"payments" = "history") => {
    setSelectedFirm(firmName);
    setFirmView(view);
  };

  const openDeliveryModal = (firmName = "") => {
    if (firmName) setSelectedFirm(null);
    setSupItems([{pid:"",qty:1,price:0,qr:""}]);
    setForm({firm:firmName,doc:"",date:new Date().toISOString().slice(0,10),note:"",totalPrice:"",paidAmount:""});
    setLockedFirm(firmName);
    setPayMethod("unpaid");
    setShowModal(true);
  };

  const applyQrCode = (index:number, code:string) => {
    const value = code.trim().toLowerCase();
    if (!value) return;
    const product = products.find((p:Product)=>[p.qrCode,p.id,p.name].some(x=>String(x||"").toLowerCase()===value));
    if (!product) { showToast("QR code product not found","error"); return; }
    const next = [...supItems];
    next[index] = {...next[index], pid:product.id, qr:code, price:next[index].price || product.pricePerUnit};
    setSupItems(next);
    showToast(`${product.name} selected`);
  };

  const togglePay = async (s:Supplier) => {
    const order:("unpaid"|"partial"|"paid")[] = ["unpaid","partial","paid"];
    const next = order[(order.indexOf(s.payStatus)+1)%3];
    const paidAmount = next==="paid"?s.totalPrice:next==="unpaid"?0:s.paidAmount;
    const data = updateSupplierPayLocal(s.id,next,paidAmount);
    if(data.success){showToast(next==="paid"?"Fully paid ✅":next==="partial"?"Partially paid ⏳":"Marked as unpaid");onRefresh();}
  };

  const calcTotal = () => supItems.reduce((s,i)=>s+(i.qty||0)*(i.price||0),0);

  const saveManualPayment = (s:Supplier) => {
    const raw = paymentDrafts[s.id] ?? String(s.paidAmount || 0);
    const paidAmount = Math.min(Math.max(parseFloat(raw) || 0, 0), s.totalPrice);
    const payStatus = paidAmount <= 0 ? "unpaid" : paidAmount >= s.totalPrice ? "paid" : "partial";
    const data = updateSupplierPayLocal(s.id,payStatus,paidAmount);
    if(data.success){
      setPaymentDrafts(prev=>({...prev,[s.id]:String(paidAmount)}));
      showToast(payStatus==="paid"?"To'liq to'landi":payStatus==="partial"?"Qisman to'landi":"To'lanmagan");
      onRefresh();
    }
  };

  const submit = async () => {
    if (!form.firm.trim()) { showToast("Enter company name","error"); return; }
    const valid = supItems.filter(i=>i.pid&&i.qty>0);
    if (!valid.length) { showToast("Add at least 1 product","error"); return; }
    const total = calcTotal();
    if (!total) { showToast("Enter price","error"); return; }
    const paid = payMethod==="paid"?total:payMethod==="unpaid"?0:parseFloat(form.paidAmount)||0;
    const items = valid.map(i=>{
      const p = products.find((x:Product)=>x.id===i.pid)!;
      return {productId:i.pid,productName:p.name,quantity:i.qty,unit:p.unit,perBox:p.perBox,boxUnit:p.boxUnit,pricePerUnit:i.price||p.pricePerUnit,qrCode:p.qrCode||i.qr||""};
    });
    setLoading(true);
    const data = createSupplierLocal({firm:form.firm,docNumber:form.doc,deliveryDate:form.date,note:form.note,items,totalPrice:total,payStatus:payMethod,paidAmount:paid});
    if(data.success){showToast(`Delivery recorded! ${fmtM(total)}`);setShowModal(false);setLockedFirm("");setSupItems([{pid:"",qty:1,price:0,qr:""}]);setForm({firm:"",doc:"",date:new Date().toISOString().slice(0,10),note:"",totalPrice:"",paidAmount:""});setPayMethod("unpaid");setSelectedFirm(form.firm);onRefresh();}
    else showToast("Error","error");
    setLoading(false);
  };

  return (
    <PageWrap title={`🚚 ${t.suppliers}`} sub={<>{t.supplierDebt}: <strong style={{color:totalDebt>0?"#f85149":"#3fb950"}}>{fmtM(totalDebt)}</strong></>}
      action={<Btn color="blue" onClick={()=>openDeliveryModal(selectedFirm||"")}>{t.recordDelivery}</Btn>}>

      {showModal && (
        <div className="modal-backdrop">
          <div className="modal" style={{maxWidth:600}}>
            <div style={{fontSize:17,fontWeight:800,marginBottom:16}}>🚚 {t.deliveryTitle}</div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:14}}>
              <div><label style={{fontSize:11,color:"var(--app-muted)",fontWeight:600,letterSpacing:1,display:"block",marginBottom:6}}>{t.companyName}</label><input value={form.firm} readOnly={!!lockedFirm} onChange={e=>!lockedFirm&&setForm({...form,firm:e.target.value})} placeholder="Mars LLC, Nestle..." style={lockedFirm?{fontWeight:800,cursor:"not-allowed"}:{}} /></div>
              <div><label style={{fontSize:11,color:"var(--app-muted)",fontWeight:600,letterSpacing:1,display:"block",marginBottom:6}}>{t.deliveryDate}</label><input type="date" value={form.date} onChange={e=>setForm({...form,date:e.target.value})} /></div>
              <div><label style={{fontSize:11,color:"var(--app-muted)",fontWeight:600,letterSpacing:1,display:"block",marginBottom:6}}>{t.documentNo}</label><input value={form.doc} onChange={e=>setForm({...form,doc:e.target.value})} placeholder="INV-2024-001" /></div>
              <div><label style={{fontSize:11,color:"var(--app-muted)",fontWeight:600,letterSpacing:1,display:"block",marginBottom:6}}>{t.autoTotal}</label><input readOnly value={fmtM(calcTotal())} style={{fontWeight:900,color:"#3fb950"}} /></div>
            </div>
            <div style={{fontSize:13,fontWeight:700,marginBottom:10}}>📦 {t.productList}</div>
            {supItems.map((item,i)=>{
              const p = products.find((x:Product)=>x.id===item.pid);
              const dona = p&&p.perBox>0&&item.qty ? <div style={{background:"rgba(48,120,255,0.06)",border:"1px solid rgba(48,120,255,0.15)",borderRadius:7,padding:"6px 10px",fontSize:11,color:"rgba(255,255,255,0.5)",marginTop:5}}>📦 {fmt(item.qty)} {p.unit} = <strong style={{color:"#79c0ff"}}>{fmt(item.qty*p.perBox)} {p.boxUnit}</strong></div>:null;
              return (
                <div key={i} style={{background:"rgba(255,255,255,0.03)",borderRadius:10,padding:12,marginBottom:8}}>
                  <div className="mobile-stack" style={{display:"grid",gridTemplateColumns:"1fr 90px",gap:8,alignItems:"center",marginBottom:8}}>
                    <input value={item.qr} onChange={e=>{const n=[...supItems];n[i].qr=e.target.value;setSupItems(n);}} onKeyDown={e=>{if(e.key==="Enter") applyQrCode(i,item.qr);}} placeholder="QR code" />
                    <button className="compact-btn" onClick={()=>applyQrCode(i,item.qr)} style={{background:"rgba(48,120,255,0.1)",border:"1px solid rgba(48,120,255,0.25)",color:"#3078ff",cursor:"pointer",fontWeight:700}}>{t.scan}</button>
                  </div>
                  <div className="delivery-product-grid">
                    <select value={item.pid} onChange={e=>{const n=[...supItems];const picked=products.find((p:Product)=>p.id===e.target.value);n[i].pid=e.target.value;n[i].qr=picked?.qrCode||n[i].qr;n[i].price=n[i].price||picked?.pricePerUnit||0;setSupItems(n);}}>
                      <option value="">{t.selectProduct}</option>
                      {products.map((p:Product)=><option key={p.id} value={p.id}>{p.name} ({p.unit})</option>)}
                    </select>
                    <input type="number" value={item.qty} min={0.1} step={0.1} onChange={e=>{const n=[...supItems];n[i].qty=parseFloat(e.target.value)||1;setSupItems(n);}} placeholder={t.quantity} />
                    <input type="number" value={item.price||""} onChange={e=>{const n=[...supItems];n[i].price=parseFloat(e.target.value)||0;setSupItems(n);}} placeholder={t.price} />
                    <button onClick={()=>setSupItems(supItems.filter((_,idx)=>idx!==i))} style={{background:"rgba(248,81,73,0.1)",border:"1px solid rgba(248,81,73,0.2)",color:"#f85149",borderRadius:7,padding:6,cursor:"pointer",fontSize:14}}>×</button>
                  </div>
                  {dona}
                </div>
              );
            })}
            <button className="compact-btn" onClick={()=>setSupItems([...supItems,{pid:"",qty:1,price:0,qr:""}])} style={{width:"100%",border:"1px dashed rgba(48,120,255,0.4)",background:"rgba(48,120,255,0.05)",color:"#3078ff",cursor:"pointer",fontWeight:600,marginBottom:12}}>{t.addProduct}</button>
            {calcTotal()>0&&<div style={{background:"rgba(255,255,255,0.04)",borderRadius:10,padding:"11px 14px",marginBottom:12,display:"flex",justifyContent:"space-between"}}>
              <span style={{color:"var(--app-muted)",fontSize:13}}>{t.calculatedTotal}:</span>
              <span style={{fontWeight:800,fontSize:18,color:"#3fb950"}}>{fmtM(calcTotal())}</span>
            </div>}
            <div style={{marginBottom:14}}>
              <label style={{fontSize:11,color:"var(--app-muted)",fontWeight:600,letterSpacing:1,display:"block",marginBottom:8}}>{t.paymentStatus}</label>
              <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
                {(["paid","unpaid","partial"] as const).map(m=>(
                  <button key={m} onClick={()=>setPayMethod(m)} style={{padding:"7px 14px",borderRadius:9,border:`2px solid ${payMethod===m?PAY_CFG[m].c:"rgba(255,255,255,0.1)"}`,background:payMethod===m?PAY_CFG[m].bg:"transparent",color:payMethod===m?PAY_CFG[m].c:"rgba(255,255,255,0.5)",cursor:"pointer",fontSize:12,fontWeight:700}}>
                    {payText(t,m)}
                  </button>
                ))}
              </div>
            </div>
            {payMethod==="partial"&&<div style={{marginBottom:12}}><label style={{fontSize:11,color:"rgba(255,255,255,0.5)",fontWeight:600,letterSpacing:1,display:"block",marginBottom:6}}>PAID AMOUNT (₩)</label><input type="number" value={form.paidAmount} onChange={e=>setForm({...form,paidAmount:e.target.value})} placeholder="750000" /></div>}
            <textarea value={form.note} onChange={e=>setForm({...form,note:e.target.value})} placeholder={t.note} rows={2} style={{resize:"vertical",marginBottom:14}} />
            <div style={{display:"flex",gap:10,flexWrap:"wrap"}}>
              <button className="compact-btn" onClick={()=>{setShowModal(false);setLockedFirm("");}} style={{flex:1,border:"1px solid var(--app-border)",background:"transparent",color:"var(--app-muted)",cursor:"pointer"}}>{t.cancel}</button>
              <button className="compact-btn" onClick={submit} disabled={loading} style={{flex:2,border:"none",background:"linear-gradient(135deg,#3078ff,#1a56db)",color:"#fff",fontWeight:700,cursor:"pointer"}}>
                {loading?t.loading:`💾 ${t.saveDelivery}`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* STATS */}
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(160px,1fr))",gap:14,marginBottom:20}}>
        {[[t.totalValue,fmtM(totalVal),"#3078ff","💰"],[t.paid,fmtM(totalPaid),"#3fb950","✅"],[t.debt,fmtM(totalDebt),totalDebt>0?"#f85149":"#3fb950","⚠️"],[t.total,`${suppliers.length} ${t.deliveries}`,"#a371f7","🚚"]].map(([l,v,c,i])=>(
          <div key={String(l)} className="stat-card"><div style={{fontSize:22,marginBottom:6}}>{i}</div><div style={{fontSize:10,color:"rgba(255,255,255,0.4)",marginBottom:4}}>{l}</div><div style={{fontWeight:800,color:String(c),fontSize:16}}>{v}</div></div>
        ))}
      </div>

      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:12,marginBottom:14}}>
        <div>
          <div style={{fontSize:16,fontWeight:800}}>{t.firmList}</div>
          <div style={{fontSize:12,color:"rgba(255,255,255,0.4)",marginTop:3}}>{t.firmHint}</div>
        </div>
        <button onClick={()=>openDeliveryModal()} style={{background:"rgba(48,120,255,0.1)",border:"1px solid rgba(48,120,255,0.25)",color:"#79c0ff",borderRadius:8,padding:"9px 13px",cursor:"pointer",fontSize:12,fontWeight:800}}>{t.newFirm}</button>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(260px,1fr))",gap:14,marginBottom:22}}>
        {firmRows.map((firm:any)=>(
          <button key={firm.name} onClick={()=>openFirmWindow(firm.name)} className="action-btn firm-card" style={{textAlign:"left",border:"1px solid var(--app-border)",borderRadius:10,padding:0,cursor:"pointer",overflow:"hidden"}}>
            <div style={{height:4,background:firm.debt>0?"linear-gradient(90deg,#f85149,#d29922)":"linear-gradient(90deg,#3fb950,#79c0ff)"}} />
            <div style={{padding:16}}>
              <div style={{display:"flex",justifyContent:"space-between",gap:10,marginBottom:12,alignItems:"flex-start"}}>
                <div>
                  <div style={{fontSize:16,fontWeight:900,marginBottom:4}}>{firm.name}</div>
                  <div style={{fontSize:11,color:"rgba(255,255,255,0.38)"}}>{t.last}: {fmtD(firm.lastDate)}</div>
                </div>
                <span style={{fontSize:10,color:firm.debt>0?"#f85149":"#3fb950",fontWeight:900,border:`1px solid ${firm.debt>0?"rgba(248,81,73,0.28)":"rgba(63,185,80,0.28)"}`,borderRadius:999,padding:"4px 8px",background:firm.debt>0?"rgba(248,81,73,0.08)":"rgba(63,185,80,0.08)"}}>{firm.debt>0?"QARZ":"TO'LANGAN"}</span>
              </div>
              <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:8,marginBottom:14}}>
                <div style={{background:"rgba(255,255,255,0.035)",borderRadius:8,padding:"9px 8px"}}><div style={{fontSize:10,color:"rgba(255,255,255,0.35)"}}>Kirim</div><div style={{fontSize:13,fontWeight:800}}>{firm.count}</div></div>
                <div style={{background:"rgba(255,255,255,0.035)",borderRadius:8,padding:"9px 8px"}}><div style={{fontSize:10,color:"rgba(255,255,255,0.35)"}}>{t.items}</div><div style={{fontSize:13,fontWeight:800}}>{firm.products}</div></div>
                <div style={{background:"rgba(255,255,255,0.035)",borderRadius:8,padding:"9px 8px"}}><div style={{fontSize:10,color:"rgba(255,255,255,0.35)"}}>{t.debt}</div><div style={{fontSize:13,fontWeight:800,color:firm.debt>0?"#f85149":"#3fb950"}}>{fmtM(firm.debt)}</div></div>
              </div>
              <div style={{display:"flex",justifyContent:"space-between",fontSize:12}}>
                <span style={{color:"rgba(255,255,255,0.45)"}}>{t.totalSum}</span>
                <span style={{color:"#3fb950",fontWeight:900}}>{fmtM(firm.total)}</span>
              </div>
            </div>
          </button>
        ))}
        {firmRows.length===0&&<div style={{background:"#161b22",border:"1px solid rgba(255,255,255,0.06)",borderRadius:14,padding:24,color:"rgba(255,255,255,0.35)",textAlign:"center"}}>{t.firmList}</div>}
      </div>

      {selectedFirm&&!showModal&&(
        <div className="modal-backdrop">
          <div className="modal" style={{maxWidth:980,padding:0,overflow:"hidden"}}>
            <div className="firm-window-grid" style={{minHeight:560}}>
              <aside className="firm-window-side" style={{background:"var(--app-bg)",borderRight:"1px solid var(--app-border)",padding:18}}>
                <div style={{fontSize:18,fontWeight:900,marginBottom:4}}>{selectedFirm}</div>
                <div style={{fontSize:12,color:"rgba(255,255,255,0.42)",marginBottom:18}}>{t.firmOffice}</div>
                <div className="firm-window-menu">
                {[
                  ["history",t.history,t.historySub],
                  ["add",t.addNow,t.addSub],
                  ["payments",t.payments,t.paymentsSub],
                ].map(([id,label,sub])=>(
                  <button key={id} onClick={()=>setFirmView(id as any)} style={{width:"100%",textAlign:"left",background:firmView===id?"rgba(48,120,255,0.14)":"transparent",border:`1px solid ${firmView===id?"rgba(48,120,255,0.32)":"transparent"}`,color:firmView===id?"#79c0ff":"rgba(255,255,255,0.68)",borderRadius:9,padding:"11px 12px",cursor:"pointer",marginBottom:7}}>
                    <div style={{fontSize:13,fontWeight:900}}>{label}</div>
                    <div style={{fontSize:10,color:"rgba(255,255,255,0.36)",marginTop:2}}>{sub}</div>
                  </button>
                ))}
                </div>
                <button onClick={()=>setSelectedFirm(null)} style={{width:"100%",marginTop:18,background:"rgba(255,255,255,0.05)",border:"1px solid rgba(255,255,255,0.1)",color:"rgba(255,255,255,0.62)",borderRadius:9,padding:"10px 12px",cursor:"pointer",fontSize:12,fontWeight:800}}>{t.close}</button>
              </aside>
              <section style={{background:"var(--app-panel)",padding:20,maxHeight:"78vh",overflow:"auto"}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:12,flexWrap:"wrap",marginBottom:18}}>
                  <div>
                    <div style={{fontSize:20,fontWeight:900}}>{firmView==="history"?t.history:firmView==="add"?t.addNow:t.payments}</div>
                    <div style={{fontSize:12,color:"rgba(255,255,255,0.42)",marginTop:3}}>{selectedHistory.length} {t.deliveries}, {t.total.toLowerCase()} {fmtM(selectedFirmRow?.total||0)}</div>
                  </div>
                  <button data-testid="firm-add-delivery" onClick={()=>openDeliveryModal(selectedFirm)} style={{background:"linear-gradient(135deg,#3078ff,#1a56db)",border:"none",color:"#fff",borderRadius:9,padding:"8px 12px",cursor:"pointer",fontSize:12,fontWeight:900}}>{t.addDelivery}</button>
                </div>

                {firmView==="history"&&(
                  <div style={{display:"flex",flexDirection:"column",gap:10}}>
                    {selectedHistory.map((s:Supplier)=>{
                      const debt = s.totalPrice - s.paidAmount;
                      const pay = PAY_CFG[s.payStatus];
                      return (
                        <div key={s.id} style={{background:"rgba(255,255,255,0.035)",border:"1px solid rgba(255,255,255,0.07)",borderRadius:11,padding:14}}>
                          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:10,flexWrap:"wrap",marginBottom:10}}>
                            <div>
                              <div style={{fontSize:13,fontWeight:900}}>{s.docNumber||t.noDoc}</div>
                              <div style={{fontSize:11,color:"rgba(255,255,255,0.42)",marginTop:2}}>{new Date(s.deliveryDate||s.createdAt).toLocaleDateString("en-US",{day:"2-digit",month:"short",year:"numeric"})}</div>
                            </div>
                            <span style={{background:pay.bg,border:`1px solid ${pay.c}44`,color:pay.c,borderRadius:20,padding:"6px 13px",fontSize:11,fontWeight:800}}>{payText(t,s.payStatus)}</span>
                          </div>
                          <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(120px,1fr))",gap:8,marginBottom:10}}>
                            <div style={{background:"rgba(0,0,0,0.12)",borderRadius:8,padding:10}}><div style={{fontSize:10,color:"rgba(255,255,255,0.35)"}}>{t.total}</div><div style={{fontSize:14,fontWeight:900,color:"#3fb950"}}>{fmtM(s.totalPrice)}</div></div>
                            <div style={{background:"rgba(0,0,0,0.12)",borderRadius:8,padding:10}}><div style={{fontSize:10,color:"rgba(255,255,255,0.35)"}}>{t.paid}</div><div style={{fontSize:14,fontWeight:900,color:"#3078ff"}}>{fmtM(s.paidAmount)}</div></div>
                            <div style={{background:"rgba(0,0,0,0.12)",borderRadius:8,padding:10}}><div style={{fontSize:10,color:"rgba(255,255,255,0.35)"}}>{t.debt}</div><div style={{fontSize:14,fontWeight:900,color:debt>0?"#f85149":"#3fb950"}}>{fmtM(debt)}</div></div>
                          </div>
                          <div style={{display:"flex",flexDirection:"column",gap:7}}>
                            {s.items.map((it:any,i:number)=>(
                              <div key={i} style={{display:"grid",gridTemplateColumns:"1fr auto auto",gap:10,background:"rgba(0,0,0,0.16)",borderRadius:8,padding:"8px 10px",fontSize:12}}>
                                <span style={{fontWeight:800}}>{it.productName}<span style={{color:"rgba(255,255,255,0.35)",fontWeight:400,marginLeft:6}}>{it.qrCode||""}</span></span>
                                <span style={{color:"rgba(255,255,255,0.55)"}}>{fmt(it.quantity)} {it.unit}</span>
                                <span style={{color:"#3fb950",fontWeight:800}}>{fmtM(it.quantity*it.pricePerUnit)}</span>
                              </div>
                            ))}
                          </div>
                          {s.note&&<div style={{marginTop:9,fontSize:11,color:"rgba(255,255,255,0.42)",fontStyle:"italic"}}>{s.note}</div>}
                        </div>
                      );
                    })}
                  </div>
                )}

                {firmView==="add"&&(
                  <div style={{background:"rgba(48,120,255,0.07)",border:"1px solid rgba(48,120,255,0.18)",borderRadius:12,padding:18}}>
                    <div style={{fontSize:16,fontWeight:900,marginBottom:8}}>{t.addNow}</div>
                    <div style={{fontSize:12,color:"rgba(255,255,255,0.5)",marginBottom:16}}>Bu firma nomi avtomatik to'ldiriladi. QR code orqali mahsulotni tez tanlash mumkin.</div>
                    <button data-testid="firm-add-now" onClick={()=>openDeliveryModal(selectedFirm)} style={{background:"linear-gradient(135deg,#3078ff,#1a56db)",border:"none",color:"#fff",borderRadius:9,padding:"8px 12px",cursor:"pointer",fontSize:12,fontWeight:900}}>{t.addNow}</button>
                  </div>
                )}

                {firmView==="payments"&&(
                  <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(160px,1fr))",gap:12}}>
                    <div className="stat-card"><div style={{fontSize:10,color:"rgba(255,255,255,0.4)",marginBottom:6}}>{t.total}</div><div style={{fontSize:18,fontWeight:900,color:"#3fb950"}}>{fmtM(selectedFirmRow?.total||0)}</div></div>
                    <div className="stat-card"><div style={{fontSize:10,color:"rgba(255,255,255,0.4)",marginBottom:6}}>{t.paid}</div><div style={{fontSize:18,fontWeight:900,color:"#3078ff"}}>{fmtM(selectedFirmRow?.paid||0)}</div></div>
                    <div className="stat-card"><div style={{fontSize:10,color:"rgba(255,255,255,0.4)",marginBottom:6}}>{t.debt}</div><div style={{fontSize:18,fontWeight:900,color:(selectedFirmRow?.debt||0)>0?"#f85149":"#3fb950"}}>{fmtM(selectedFirmRow?.debt||0)}</div></div>
                    <div style={{gridColumn:"1/-1",background:"rgba(255,255,255,0.035)",border:"1px solid rgba(255,255,255,0.07)",borderRadius:12,padding:14}}>
                      <div style={{fontSize:15,fontWeight:900,marginBottom:5}}>{t.paymentTitle}</div>
                      <div style={{fontSize:12,color:"rgba(255,255,255,0.45)",marginBottom:12}}>{t.paymentHint}</div>
                      <div style={{display:"flex",flexDirection:"column",gap:10}}>
                        {selectedHistory.map((s:Supplier)=>{
                          const debt = s.totalPrice - s.paidAmount;
                          const pay = PAY_CFG[s.payStatus];
                          return (
                            <div key={s.id} className="payment-row" style={{gap:10,alignItems:"center",background:"rgba(0,0,0,0.14)",borderRadius:10,padding:10}}>
                              <div>
                                <div style={{fontSize:13,fontWeight:900}}>{s.docNumber||fmtD(s.createdAt)}</div>
                                <div style={{fontSize:11,color:"rgba(255,255,255,0.4)",marginTop:2}}>{t.total}: {fmtM(s.totalPrice)} · {t.debt}: {fmtM(debt)}</div>
                              </div>
                              <span style={{background:pay.bg,border:`1px solid ${pay.c}44`,color:pay.c,borderRadius:20,padding:"6px 10px",fontSize:11,fontWeight:900,textAlign:"center"}}>{payText(t,s.payStatus)}</span>
                              <input type="number" min={0} max={s.totalPrice} value={paymentDrafts[s.id] ?? String(s.paidAmount || 0)} onChange={e=>setPaymentDrafts(prev=>({...prev,[s.id]:e.target.value}))} placeholder={t.paidAmount} />
                              <button onClick={()=>saveManualPayment(s)} style={{background:"rgba(48,120,255,0.12)",border:"1px solid rgba(48,120,255,0.3)",color:"#79c0ff",borderRadius:8,padding:"10px 12px",cursor:"pointer",fontSize:12,fontWeight:900}}>{t.save}</button>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                )}
              </section>
            </div>
          </div>
        </div>
      )}

      {/* FILTERS */}
      <div style={{display:"flex",gap:8,marginBottom:18,flexWrap:"wrap"}}>
        {(["all","paid","unpaid","partial"] as const).map(f=>(
          <button key={f} onClick={()=>setFilter(f)} style={{padding:"7px 14px",borderRadius:8,border:`1px solid ${filter===f?"rgba(48,120,255,0.4)":"rgba(255,255,255,0.1)"}`,background:filter===f?"rgba(48,120,255,0.12)":"rgba(255,255,255,0.04)",color:filter===f?"#3078ff":"rgba(255,255,255,0.6)",cursor:"pointer",fontSize:12,fontWeight:filter===f?700:400}}>
            {f==="all"?t.all:payText(t,f)} <span style={{background:"rgba(255,255,255,0.1)",borderRadius:10,padding:"1px 7px",marginLeft:3,fontSize:10}}>{f==="all"?suppliers.length:suppliers.filter((s:Supplier)=>s.payStatus===f).length}</span>
          </button>
        ))}
      </div>

      <div style={{display:"flex",flexDirection:"column",gap:12}}>
        {filtered.map((s:Supplier)=>{
          const debt = s.totalPrice - s.paidAmount;
          const pay = PAY_CFG[s.payStatus];
          return (
            <div key={s.id} style={{background:"#161b22",border:`1px solid ${debt>0?"rgba(248,81,73,0.15)":"rgba(255,255,255,0.06)"}`,borderRadius:14,overflow:"hidden"}}>
              <div style={{padding:"16px 18px",display:"flex",justifyContent:"space-between",alignItems:"flex-start",flexWrap:"wrap",gap:10}}>
                <div>
                  <div style={{fontWeight:800,fontSize:15,marginBottom:2}}>🚚 {s.firm}</div>
                  <div style={{fontSize:12,color:"rgba(255,255,255,0.4)"}}>{s.docNumber&&`📄 ${s.docNumber} · `}📅 {new Date(s.createdAt).toLocaleDateString("en-US",{day:"2-digit",month:"short",year:"numeric"})}</div>
                </div>
                <button onClick={()=>togglePay(s)} style={{background:pay.bg,border:`1px solid ${pay.c}44`,color:pay.c,borderRadius:20,padding:"5px 14px",fontSize:11,fontWeight:700,cursor:"pointer"}}>{payText(t,s.payStatus)}</button>
              </div>
              <div style={{padding:"0 18px 14px",display:"flex",gap:16,fontSize:12,color:"rgba(255,255,255,0.5)",flexWrap:"wrap"}}>
                <span>📦 {s.items.length} {t.products}</span>
                <span style={{color:"#3fb950",fontWeight:700}}>💰 {t.total}: {fmtM(s.totalPrice)}</span>
                <span style={{color:"#3078ff"}}>✅ {t.paid}: {fmtM(s.paidAmount)}</span>
                {debt>0&&<span style={{color:"#f85149",fontWeight:700}}>⚠️ {t.debt}: {fmtM(debt)}</span>}
              </div>
              <div style={{padding:"0 18px 14px",display:"flex",flexDirection:"column",gap:7}}>
                {s.items.map((it:any,i:number)=>{
                  const dona = it.perBox>0 ? <span style={{color:"#a371f7",fontSize:11}}> ({fmt(it.quantity*it.perBox)} {it.boxUnit})</span>:null;
                  return (
                    <div key={i} style={{display:"flex",justifyContent:"space-between",background:"rgba(255,255,255,0.03)",borderRadius:8,padding:"8px 12px",fontSize:12}}>
                      <span style={{fontWeight:600}}>{it.productName}</span>
                      <span style={{color:"rgba(255,255,255,0.5)"}}>{fmt(it.quantity)} {it.unit}{dona}</span>
                      <span style={{color:"#3fb950",fontWeight:700}}>{fmtM(it.quantity*it.pricePerUnit)}</span>
                    </div>
                  );
                })}
              </div>
              {s.note&&<div style={{margin:"0 18px 14px",padding:"8px 11px",background:"rgba(255,255,255,0.03)",borderRadius:8,fontSize:11,color:"rgba(255,255,255,0.4)",fontStyle:"italic"}}>📝 {s.note}</div>}
            </div>
          );
        })}
        {filtered.length===0&&<div style={{textAlign:"center",padding:"60px 20px",color:"rgba(255,255,255,0.3)"}}>🚚<br/><span style={{fontSize:16,marginTop:12,display:"block"}}>No deliveries</span></div>}
      </div>
    </PageWrap>
  );
}

// ════════════════════════════════════════════════════════════
// STAFF
// ════════════════════════════════════════════════════════════
function StaffTab({ staffList, user, onRefresh, showToast, t }:any) {
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({name:"",role:"",branch:user.role==="superadmin"?"main":user.role,phone:"",salary:"",joinDate:new Date().toISOString().slice(0,10)});
  const isSA = user.role==="superadmin";
  const totalSalary = staffList.filter((s:Staff)=>s.active).reduce((t:number,s:Staff)=>t+s.salary,0);
  const branches = isSA?["main","restaurant1","restaurant2","shop"]:[user.role];

  const submit = async () => {
    if (!form.name||!form.role||!form.phone) { showToast(t.fillFields,"error"); return; }
    const data = addStaffLocal({...form,salary:parseFloat(form.salary)||0,active:true});
    if(data.success){showToast(t.staffAdded);setShowModal(false);setForm({name:"",role:"",branch:user.role==="superadmin"?"main":user.role,phone:"",salary:"",joinDate:new Date().toISOString().slice(0,10)});onRefresh();}
  };
  const toggle = async (id:string) => {
    const data = toggleStaffLocal(id);
    if(data.success){showToast(t.staffStatusUpdated);onRefresh();}
  };

  return (
    <PageWrap title={`👥 ${t.staff}`} sub={<>{t.totalSalary}: <strong style={{color:"#f0a500"}}>{fmtM(totalSalary)}/month</strong></>}
      action={<Btn color="blue" onClick={()=>setShowModal(true)}>{t.addStaff}</Btn>}>
      {showModal&&(
        <div className="modal-backdrop">
          <div className="modal">
            <div style={{fontSize:17,fontWeight:800,marginBottom:16}}>👤 {t.addNewStaff}</div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
              <div><label style={{fontSize:11,color:"rgba(255,255,255,0.5)",fontWeight:600,letterSpacing:1,display:"block",marginBottom:6}}>{t.fullName}</label><input value={form.name} onChange={e=>setForm({...form,name:e.target.value})} placeholder={t.fullName} /></div>
              <div><label style={{fontSize:11,color:"rgba(255,255,255,0.5)",fontWeight:600,letterSpacing:1,display:"block",marginBottom:6}}>{t.position}</label><input value={form.role} onChange={e=>setForm({...form,role:e.target.value})} placeholder="Chef, Cashier..." /></div>
              <div><label style={{fontSize:11,color:"rgba(255,255,255,0.5)",fontWeight:600,letterSpacing:1,display:"block",marginBottom:6}}>{t.branch}</label>
                <select value={form.branch} onChange={e=>setForm({...form,branch:e.target.value})}>
                  {branches.map(b=><option key={b} value={b}>{BICON[b]} {BNAME[b]}</option>)}
                </select>
              </div>
              <div><label style={{fontSize:11,color:"rgba(255,255,255,0.5)",fontWeight:600,letterSpacing:1,display:"block",marginBottom:6}}>{t.phone}</label><input value={form.phone} onChange={e=>setForm({...form,phone:e.target.value})} placeholder="+998 90 000 00 00" /></div>
              <div><label style={{fontSize:11,color:"rgba(255,255,255,0.5)",fontWeight:600,letterSpacing:1,display:"block",marginBottom:6}}>{t.salary} (₩)</label><input type="number" value={form.salary} onChange={e=>setForm({...form,salary:e.target.value})} placeholder="3500000" /></div>
              <div><label style={{fontSize:11,color:"rgba(255,255,255,0.5)",fontWeight:600,letterSpacing:1,display:"block",marginBottom:6}}>{t.joinDate}</label><input type="date" value={form.joinDate} onChange={e=>setForm({...form,joinDate:e.target.value})} /></div>
            </div>
            <div style={{display:"flex",gap:10,marginTop:14}}>
              <button onClick={()=>setShowModal(false)} style={{flex:1,padding:11,borderRadius:10,border:"1px solid rgba(255,255,255,0.1)",background:"transparent",color:"rgba(255,255,255,0.5)",cursor:"pointer"}}>{t.cancel}</button>
              <button onClick={submit} style={{flex:2,padding:11,borderRadius:10,border:"none",background:"linear-gradient(135deg,#3078ff,#1a56db)",color:"#fff",fontWeight:700,cursor:"pointer"}}>💾 {t.addStaff}</button>
            </div>
          </div>
        </div>
      )}
      <div style={{background:"#161b22",border:"1px solid rgba(255,255,255,0.06)",borderRadius:14,overflow:"auto"}}>
        <table>
          <thead><tr><th>{t.name}</th><th>{t.position}</th><th>{t.branch}</th><th>{t.phone}</th><th>{t.salary}</th><th>{t.status}</th><th>{t.action}</th></tr></thead>
          <tbody>
            {staffList.map((s:Staff)=>(
              <tr key={s.id}>
                <td style={{fontWeight:600}}>{s.name}</td>
                <td style={{color:"rgba(255,255,255,0.6)"}}>{s.role}</td>
                <td>{BICON[s.branch]||"👤"} <span style={{fontSize:11,color:"rgba(255,255,255,0.4)"}}>{BNAME[s.branch]||s.branch}</span></td>
                <td style={{fontFamily:"monospace",fontSize:11,color:"rgba(255,255,255,0.5)"}}>{s.phone}</td>
                <td style={{fontWeight:700,color:"#f0a500"}}>{fmtM(s.salary)}</td>
                <td><span style={{background:s.active?"rgba(63,185,80,0.1)":"rgba(248,81,73,0.1)",color:s.active?"#3fb950":"#f85149",padding:"2px 10px",borderRadius:20,fontSize:11,fontWeight:700}}>{s.active?`✅ ${t.active}`:`⛔ ${t.inactive}`}</span></td>
                <td><button className="action-btn" onClick={()=>toggle(s.id)} style={{background:s.active?"rgba(248,81,73,0.08)":"rgba(63,185,80,0.08)",border:`1px solid ${s.active?"rgba(248,81,73,0.2)":"rgba(63,185,80,0.2)"}`,color:s.active?"#f85149":"#3fb950",borderRadius:8,padding:"5px 10px",fontSize:11,fontWeight:600}}>{s.active?t.deactivate:t.activate}</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </PageWrap>
  );
}

// ════════════════════════════════════════════════════════════
// REPORTS
// ════════════════════════════════════════════════════════════
function ReportsTab({ reports, transfers, t }:any) {
  if (!reports) return <PageWrap><div style={{color:"rgba(255,255,255,0.4)"}}>{t.loading}</div></PageWrap>;
  const approved = transfers.filter((t:Transfer)=>t.status==="approved");
  const totalT = approved.reduce((s:number,t:Transfer)=>s+t.totalValue,0);
  const maxMonth = Math.max(...(reports.monthlyStats||[]).map((m:any)=>m.value),1);
  return (
    <PageWrap title={`📈 ${t.reports}`}>
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(160px,1fr))",gap:14,marginBottom:24}}>
        {[[t.mainStockValue,fmtM(reports.mainStockValue),"#3fb950","💰"],[t.totalTransferred,fmtM(totalT),"#3078ff","🔄"],[t.totalTransfers,transfers.length,"#f0a500","📋"],[t.pending,reports.pendingTransfers,"#f85149","⏳"],[t.products,reports.totalProducts,"#a371f7","📦"],[t.staff,reports.totalStaff,"#79c0ff","👥"]].map(([l,v,c,i])=>(
          <div key={String(l)} className="stat-card card"><div style={{fontSize:22,marginBottom:6}}>{i}</div><div style={{fontSize:10,color:"rgba(255,255,255,0.4)",marginBottom:4}}>{l}</div><div style={{fontWeight:800,color:String(c),fontSize:18}}>{v}</div></div>
        ))}
      </div>
      <div style={{background:"#161b22",border:"1px solid rgba(255,255,255,0.06)",borderRadius:14,padding:20,marginBottom:20}}>
        <div style={{fontSize:14,fontWeight:700,marginBottom:16}}>📅 {t.monthlyTransfers} (₩)</div>
        <div style={{display:"flex",gap:10,alignItems:"flex-end",height:140}}>
          {(reports.monthlyStats||[]).map((m:any,i:number)=>{
            const h = Math.max((m.value/maxMonth)*120,4);
            return (
              <div key={i} style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",gap:4}}>
                <div style={{fontSize:10,color:"#3078ff",fontWeight:700,minHeight:14}}>{m.count>0?m.count:""}</div>
                <div style={{width:"100%",height:h,background:"linear-gradient(180deg,#3078ff,#1a56db)",borderRadius:"5px 5px 0 0",minHeight:4}} title={fmtM(m.value)} />
                <div style={{fontSize:9,color:"rgba(255,255,255,0.4)",textAlign:"center"}}>{m.month}</div>
              </div>
            );
          })}
        </div>
      </div>
      <div style={{fontSize:14,fontWeight:700,marginBottom:14}}>🏢 {t.branchComparison}</div>
      <div style={{background:"#161b22",border:"1px solid rgba(255,255,255,0.06)",borderRadius:14,overflow:"auto"}}>
        <table>
          <thead><tr><th>{t.branch}</th><th>{t.approved}</th><th>{t.totalReceived}</th><th>{t.stockValue}</th><th>{t.staff}</th><th>{t.lowStock}</th></tr></thead>
          <tbody>
            {(reports.branchStats||[]).map((b:any)=>(
              <tr key={b.branch}>
                <td><span style={{fontSize:18}}>{b.branchIcon}</span> <strong>{b.branchName}</strong></td>
                <td style={{color:"#3078ff",fontWeight:700}}>{b.approvedTransfers}</td>
                <td style={{color:"#3fb950",fontWeight:700}}>{fmtM(b.totalReceived)}</td>
                <td style={{color:"#f0a500",fontWeight:700}}>{fmtM(b.stockValue)}</td>
                <td style={{color:"rgba(255,255,255,0.6)"}}>{b.staffCount}</td>
                <td><span style={{background:b.lowStockCount>0?"rgba(248,81,73,0.1)":"rgba(63,185,80,0.1)",color:b.lowStockCount>0?"#f85149":"#3fb950",padding:"2px 10px",borderRadius:20,fontSize:11,fontWeight:700}}>{b.lowStockCount}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </PageWrap>
  );
}

// ════════════════════════════════════════════════════════════
// PRODUCTS (superadmin only)
// ════════════════════════════════════════════════════════════
function ProductsTab({ products, stock, onRefresh, showToast, t }:any) {
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({name:"",category:"gosht",unit:"kg",minStock:"10",pricePerUnit:"",perBox:"",boxUnit:"",qrCode:""});
  const preview = parseInt(form.perBox)>0 ? `📦 10 ${form.unit} = ${10*parseInt(form.perBox)} ${form.boxUnit||t.unit}` : null;

  const submit = async () => {
    if (!form.name||!form.pricePerUnit) { showToast(`${t.name}, ${t.price}`,"error"); return; }
    const data = addProductLocal({...form,minStock:parseFloat(form.minStock)||10,pricePerUnit:parseFloat(form.pricePerUnit),perBox:parseInt(form.perBox)||0});
    if(data.success){showToast(t.addNewProduct);setShowModal(false);setForm({name:"",category:"gosht",unit:"kg",minStock:"10",pricePerUnit:"",perBox:"",boxUnit:"",qrCode:""});onRefresh();}
    else showToast(data.message||"Error adding product","error");
  };

  return (
    <PageWrap title={`🏷️ ${t.productsTitle} (${products.length})`} action={<Btn color="blue" onClick={()=>setShowModal(true)}>{t.addProduct}</Btn>}>
      {showModal&&(
        <div className="modal-backdrop">
          <div className="modal">
            <div style={{fontSize:17,fontWeight:800,marginBottom:16}}>🏷️ {t.addNewProduct}</div>
            <div style={{marginBottom:12}}><label style={{fontSize:11,color:"rgba(255,255,255,0.5)",fontWeight:600,letterSpacing:1,display:"block",marginBottom:6}}>{t.name}</label><input value={form.name} onChange={e=>setForm({...form,name:e.target.value})} placeholder="Snickers, Beef..." /></div>
            <div style={{marginBottom:12}}><label style={{fontSize:11,color:"rgba(255,255,255,0.5)",fontWeight:600,letterSpacing:1,display:"block",marginBottom:6}}>{t.qrCode}</label><input value={form.qrCode} onChange={e=>setForm({...form,qrCode:e.target.value})} placeholder="QR-P029" /></div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:12}}>
              <div><label style={{fontSize:11,color:"rgba(255,255,255,0.5)",fontWeight:600,letterSpacing:1,display:"block",marginBottom:6}}>{t.category}</label>
                <select value={form.category} onChange={e=>setForm({...form,category:e.target.value})}>
                  {["gosht","sabzavot","don","sut","meva","ziravorlar","boshqa"].map(c=><option key={c} value={c}>{CATICON[c]} {c}</option>)}
                </select>
              </div>
              <div><label style={{fontSize:11,color:"rgba(255,255,255,0.5)",fontWeight:600,letterSpacing:1,display:"block",marginBottom:6}}>{t.unit}</label>
                <select value={form.unit} onChange={e=>setForm({...form,unit:e.target.value})}>
                  {["kg","g","l","ml","dona","qop","quti"].map(u=><option key={u} value={u}>{u}</option>)}
                </select>
              </div>
              <div><label style={{fontSize:11,color:"rgba(255,255,255,0.5)",fontWeight:600,letterSpacing:1,display:"block",marginBottom:6}}>{t.minStock}</label><input type="number" value={form.minStock} onChange={e=>setForm({...form,minStock:e.target.value})} /></div>
              <div><label style={{fontSize:11,color:"rgba(255,255,255,0.5)",fontWeight:600,letterSpacing:1,display:"block",marginBottom:6}}>{t.price} (₩)</label><input type="number" value={form.pricePerUnit} onChange={e=>setForm({...form,pricePerUnit:e.target.value})} placeholder="85000" /></div>
            </div>
            <div style={{background:"rgba(48,120,255,0.06)",border:"1px solid rgba(48,120,255,0.2)",borderRadius:10,padding:13,marginBottom:14}}>
              <div style={{fontSize:12,fontWeight:700,color:"#79c0ff",marginBottom:9}}>📦 {t.boxPackage}</div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
                <div><label style={{fontSize:11,color:"rgba(255,255,255,0.5)",fontWeight:600,letterSpacing:1,display:"block",marginBottom:6}}>{t.unitsPerBox}</label><input type="number" value={form.perBox} onChange={e=>setForm({...form,perBox:e.target.value})} placeholder="24" /></div>
                <div><label style={{fontSize:11,color:"rgba(255,255,255,0.5)",fontWeight:600,letterSpacing:1,display:"block",marginBottom:6}}>{t.unitName}</label><input value={form.boxUnit} onChange={e=>setForm({...form,boxUnit:e.target.value})} placeholder="pcs, bottles..." /></div>
              </div>
              {preview&&<div style={{background:"rgba(48,120,255,0.08)",borderRadius:7,padding:"7px 10px",fontSize:12,color:"rgba(255,255,255,0.6)",marginTop:8}}>{preview}</div>}
            </div>
            <div style={{display:"flex",gap:10}}>
              <button onClick={()=>setShowModal(false)} style={{flex:1,padding:11,borderRadius:10,border:"1px solid rgba(255,255,255,0.1)",background:"transparent",color:"rgba(255,255,255,0.5)",cursor:"pointer"}}>{t.cancel}</button>
              <button onClick={submit} style={{flex:2,padding:11,borderRadius:10,border:"none",background:"linear-gradient(135deg,#3078ff,#1a56db)",color:"#fff",fontWeight:700,cursor:"pointer"}}>💾 {t.addProduct}</button>
            </div>
          </div>
        </div>
      )}
      <div style={{background:"#161b22",border:"1px solid rgba(255,255,255,0.06)",borderRadius:14,overflow:"auto"}}>
        <table>
          <thead><tr><th>#</th><th>{t.name}</th><th>QR</th><th>{t.category}</th><th>{t.unit}</th><th>{t.boxPackage}</th><th>{t.minStock}</th><th>{t.price}</th><th>{t.mainStock}</th><th>{t.totalUnits}</th></tr></thead>
          <tbody>
            {products.map((p:Product,i:number)=>{
              const qty=stock[p.id]||0; const hasBox=p.perBox>0;
              return (
                <tr key={p.id}>
                  <td style={{color:"rgba(255,255,255,0.3)",fontSize:11}}>{i+1}</td>
                  <td style={{fontWeight:600}}>{p.name}</td>
                  <td style={{fontFamily:"monospace",fontSize:11,color:"rgba(255,255,255,0.45)"}}>{p.qrCode||"—"}</td>
                  <td>{CATICON[p.category]||"📦"} <span style={{fontSize:11,color:"rgba(255,255,255,0.4)"}}>{p.category}</span></td>
                  <td style={{color:"rgba(255,255,255,0.5)"}}>{p.unit}</td>
                  <td>{hasBox?<span style={{fontSize:11,background:"rgba(48,120,255,0.1)",color:"#79c0ff",padding:"2px 8px",borderRadius:8}}>1={p.perBox} {p.boxUnit}</span>:<span style={{color:"rgba(255,255,255,0.3)"}}>—</span>}</td>
                  <td style={{color:"#f0a500"}}>{p.minStock} {p.unit}</td>
                  <td style={{fontSize:12,color:"rgba(255,255,255,0.5)"}}>{fmtM(p.pricePerUnit)}</td>
                  <td style={{fontWeight:700,color:qtyColor(qty,p.minStock)}}>{fmt(qty)} {p.unit}</td>
                  <td style={{color:"#a371f7",fontWeight:700}}>{hasBox?`${fmt(qty*p.perBox)} ${p.boxUnit}`:"—"}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </PageWrap>
  );
}

// ─── HELPERS ─────────────────────────────────────────────────
function PageWrap({ title, sub, action, children }:{ title?:any; sub?:any; action?:any; children:any }) {
  return (
    <div style={{padding:"28px 24px",color:"var(--app-text)"}}>
      {(title||action) && (
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",flexWrap:"wrap",gap:12,marginBottom:24}}>
          <div>
            {title&&<div style={{fontSize:22,fontWeight:800,color:"var(--app-text)",marginBottom:4}}>{title}</div>}
            {sub&&<div style={{color:"var(--app-muted)",fontSize:13}}>{sub}</div>}
          </div>
          {action&&<div>{action}</div>}
        </div>
      )}
      {children}
    </div>
  );
}
function Btn({ color, onClick, children }:{ color:"blue"|"green"|"red"; onClick:()=>void; children:any }) {
  const colors = { blue:"linear-gradient(135deg,#3078ff,#1a56db)", green:"linear-gradient(135deg,#3fb950,#27a73c)", red:"linear-gradient(135deg,#f85149,#c0392b)" };
  return <button className="compact-btn" onClick={onClick} style={{background:colors[color],color:"#fff",border:"none",cursor:"pointer",fontWeight:800,fontFamily:"Inter,sans-serif",boxShadow:`0 4px 12px rgba(0,0,0,0.18)`}}>{children}</button>;
}
