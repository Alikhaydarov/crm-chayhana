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

// ─── QTY COLOR ───────────────────────────────────────────────
function qtyColor(qty:number, min:number) {
  if (qty <= min) return "#f85149";
  if (qty <= min * 2) return "#f0a500";
  return "#3fb950";
}
function qtyBadge(qty:number, min:number) {
  if (qty <= min)      return <span style={{background:"rgba(248,81,73,0.1)",color:"#f85149",padding:"2px 10px",borderRadius:20,fontSize:11,fontWeight:700}}>🔴 Low</span>;
  if (qty <= min * 2)  return <span style={{background:"rgba(240,165,0,0.1)",color:"#f0a500",padding:"2px 10px",borderRadius:20,fontSize:11,fontWeight:700}}>🟡 Medium</span>;
  return <span style={{background:"rgba(63,185,80,0.1)",color:"#3fb950",padding:"2px 10px",borderRadius:20,fontSize:11,fontWeight:700}}>🟢 Good</span>;
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
export default function CRMApp() {
  const [user, setUser] = useState<UserInfo|null>(null);
  const [tab, setTab] = useState("dashboard");
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [products, setProducts] = useState<Product[]>([]);
  const [stock, setStock] = useState<StockMap>({});
  const [transfers, setTransfers] = useState<Transfer[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [staffList, setStaffList] = useState<Staff[]>([]);
  const [reports, setReports] = useState<any>(null);
  const [lowStockOpen, setLowStockOpen] = useState(false);
  const { toast, show: showToast } = useToast();

  const fetchAll = useCallback(async () => {
    if (!user) return;
    const data = getLocalSnapshot(user);
    setProducts(data.products || []); setStock(data.stock || {});
    setTransfers(data.transfers || []); setSuppliers(data.suppliers || []);
    setStaffList(data.staff || []); setReports(data.reports);
  }, [user]);

  useEffect(()=>{ if(user) fetchAll(); },[user,fetchAll]);

  if (!user) return <LoginPage onLogin={setUser} />;

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

  return (
    <div style={{display:"flex",minHeight:"100vh",background:"#0d1117",fontFamily:"Inter,sans-serif",color:"#e6edf3"}}>
      <style>{`
        *{box-sizing:border-box}
        ::-webkit-scrollbar{width:4px}::-webkit-scrollbar-thumb{background:#30363d;border-radius:2px}
        @keyframes fadeIn{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}
        @keyframes slideIn{from{transform:translateX(80px);opacity:0}to{transform:translateX(0);opacity:1}}
        .tab-item{transition:all .15s;cursor:pointer} .tab-item:hover{background:rgba(255,255,255,0.06)!important}
        .action-btn{transition:all .15s;cursor:pointer} .action-btn:hover{filter:brightness(1.15);transform:translateY(-1px)}
        .card{animation:fadeIn .35s ease forwards}
        input,select,textarea{background:rgba(255,255,255,0.05)!important;color:#e6edf3!important;border:1px solid rgba(255,255,255,0.1)!important;border-radius:8px!important;padding:10px 13px!important;font-size:13px!important;outline:none!important;font-family:Inter,sans-serif!important;width:100%}
        input:focus,select:focus,textarea:focus{border-color:rgba(48,120,255,0.5)!important}
        select option{background:#161b22}
        table{width:100%;border-collapse:collapse}
        th{padding:10px 14px;text-align:left;font-size:10px;font-weight:700;color:rgba(255,255,255,0.4);letter-spacing:1px;text-transform:uppercase;border-bottom:1px solid rgba(255,255,255,0.06);white-space:nowrap}
        td{padding:11px 14px;font-size:13px;border-bottom:1px solid rgba(255,255,255,0.04);vertical-align:middle}
        tr:hover td{background:rgba(255,255,255,0.02)}
        .stat-card{background:#161b22;border:1px solid rgba(255,255,255,0.06);border-radius:14px;padding:18px 16px;transition:all .2s}
        .stat-card:hover{border-color:rgba(255,255,255,0.12)}
        .modal-backdrop{position:fixed;inset:0;background:rgba(0,0,0,0.75);z-index:200;display:flex;align-items:center;justify-content:center;padding:16px}
        .modal{background:#161b22;border:1px solid rgba(255,255,255,0.1);border-radius:18px;padding:28px;width:100%;max-width:560px;max-height:90vh;overflow-y:auto}
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
              <div style={{fontSize:17,fontWeight:800}}>⚠️ Low Stock Products</div>
              <button onClick={()=>setLowStockOpen(false)} style={{background:"rgba(255,255,255,0.06)",border:"1px solid rgba(255,255,255,0.1)",color:"rgba(255,255,255,0.5)",borderRadius:8,padding:"5px 12px",cursor:"pointer",fontSize:13}}>✕</button>
            </div>
            <LowStockList products={products} stock={stock} />
          </div>
        </div>
      )}

      {/* SIDEBAR */}
      <div style={{width:sidebarOpen?220:58,background:"#161b22",borderRight:"1px solid rgba(255,255,255,0.06)",display:"flex",flexDirection:"column",flexShrink:0,transition:"width .3s",overflow:"hidden"}}>
        <div style={{padding:"16px 14px",borderBottom:"1px solid rgba(255,255,255,0.06)",display:"flex",alignItems:"center",gap:8,cursor:"pointer"}} onClick={()=>setSidebarOpen(!sidebarOpen)}>
          <span style={{fontSize:22,flexShrink:0}}>🏭</span>
          {sidebarOpen && <div><div style={{fontWeight:800,fontSize:14,whiteSpace:"nowrap"}}>Oshxona CRM</div><div style={{fontSize:10,color:"rgba(255,255,255,0.35)"}}>v2.0</div></div>}
        </div>
        {sidebarOpen && (
          <div style={{margin:"10px",padding:12,background:"rgba(255,255,255,0.04)",border:"1px solid rgba(255,255,255,0.06)",borderRadius:11}}>
            <div style={{fontSize:20,marginBottom:3}}>{user.branchIcon}</div>
            <div style={{fontWeight:700,fontSize:13}}>{user.name}</div>
            <div style={{fontSize:11,color:"rgba(255,255,255,0.4)"}}>{user.branchName}</div>
          </div>
        )}
        <nav style={{flex:1,padding:6}}>
          {TABS.map(t=>(
            <div key={t.id} className="tab-item" onClick={()=>setTab(t.id)}
              style={{display:"flex",alignItems:"center",gap:9,padding:"9px 11px",borderRadius:9,marginBottom:2,background:tab===t.id?"rgba(48,120,255,0.12)":"transparent",color:tab===t.id?"#3078ff":"rgba(255,255,255,0.6)",fontWeight:tab===t.id?700:400,fontSize:13,border:`1px solid ${tab===t.id?"rgba(48,120,255,0.25)":"transparent"}`,whiteSpace:"nowrap",overflow:"hidden"}}>
              <span style={{fontSize:17,flexShrink:0}}>{t.icon}</span>
              <span className="sidebar-text">{t.label}</span>
            </div>
          ))}
        </nav>
        <div style={{padding:"8px",borderTop:"1px solid rgba(255,255,255,0.06)"}}>
          <div className="tab-item" onClick={()=>setSidebarOpen(!sidebarOpen)} style={{display:"flex",alignItems:"center",gap:9,padding:"9px 11px",borderRadius:9,color:"rgba(255,255,255,0.4)",fontSize:13}}>
            <span style={{fontSize:17}}>{sidebarOpen?"◀":"▶"}</span>
            <span className="sidebar-text">Collapse</span>
          </div>
          <div className="tab-item" onClick={()=>setUser(null)} style={{display:"flex",alignItems:"center",gap:9,padding:"9px 11px",borderRadius:9,color:"#f85149",fontSize:13}}>
            <span style={{fontSize:17}}>🚪</span>
            <span className="sidebar-text">Logout</span>
          </div>
        </div>
      </div>

      {/* MAIN CONTENT */}
      <div style={{flex:1,overflow:"auto"}}>
        {tab==="dashboard"  && <DashboardTab  reports={reports} user={user} setTab={setTab} transfers={transfers} suppliers={suppliers} openLowStock={()=>setLowStockOpen(true)} />}
        {tab==="warehouse"  && <WarehouseTab  products={products} stock={stock} user={user} onRefresh={fetchAll} showToast={showToast} openLowStock={()=>setLowStockOpen(true)} />}
        {tab==="transfers"  && <TransfersTab  transfers={transfers} products={products} user={user} onRefresh={fetchAll} showToast={showToast} />}
        {tab==="staff"      && <StaffTab      staffList={staffList} user={user} onRefresh={fetchAll} showToast={showToast} />}
        {tab==="reports"    && <ReportsTab    reports={reports} transfers={transfers} />}
        {tab==="suppliers"  && <SuppliersTab  suppliers={suppliers} products={products} user={user} onRefresh={fetchAll} showToast={showToast} />}
        {tab==="products" && isSA && <ProductsTab products={products} stock={stock} onRefresh={fetchAll} showToast={showToast} />}
      </div>
    </div>
  );
}

// ─── LOW STOCK LIST (shared) ─────────────────────────────────
function LowStockList({ products, stock }:{ products:Product[]; stock:StockMap }) {
  const items = products
    .map(p=>({ p, qty:stock[p.id]||0 }))
    .filter(({p,qty})=>qty<=p.minStock*2)
    .sort((a,b)=>a.qty/a.p.minStock - b.qty/b.p.minStock);
  if (!items.length) return <div style={{textAlign:"center",padding:40,color:"rgba(255,255,255,0.4)"}}>✅ All products above minimum levels!</div>;
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
function DashboardTab({ reports, user, setTab, transfers, suppliers, openLowStock }:any) {
  const isSA = user.role==="superadmin";
  if (!reports) return <PageWrap><div style={{color:"rgba(255,255,255,0.4)"}}>Loading...</div></PageWrap>;
  const totalDebt = suppliers.reduce((s:number,x:Supplier)=>s+(x.totalPrice-x.paidAmount),0);
  const myBranch = reports.branchStats?.find((b:any)=>b.branch===user.role);
  const stats = isSA ? [
    { l:"Main Stock Value",  v:fmtM(reports.mainStockValue), c:"#3fb950", i:"💰" },
    { l:"Product Types",     v:reports.totalProducts,         c:"#3078ff", i:"📦" },
    { l:"Total Staff",       v:reports.totalStaff,            c:"#f0a500", i:"👥" },
    { l:"Supplier Debt",     v:fmtM(totalDebt), c:totalDebt>0?"#f85149":"#3fb950", i:"🚚" },
  ] : [
    { l:"My Stock Value",    v:fmtM(myBranch?.stockValue||0), c:"#3fb950", i:"💰" },
    { l:"My Requests",       v:myBranch?.totalTransfers||0,   c:"#3078ff", i:"🔄" },
    { l:"Pending",           v:myBranch?.pendingTransfers||0, c:"#f0a500", i:"⏳" },
    { l:"Low Stock ›",       v:myBranch?.lowStockCount||0, c:(myBranch?.lowStockCount||0)>0?"#f85149":"#3fb950", i:"⚠️", click:true },
  ];
  return (
    <PageWrap title={`${BICON[user.role]} ${user.branchName} — Dashboard`} sub={new Date().toLocaleDateString("en-US",{weekday:"long",year:"numeric",month:"long",day:"numeric"})}>
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
          <div style={{fontSize:14,fontWeight:700,marginBottom:14}}>🏢 Branch Status</div>
          <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(240px,1fr))",gap:14}}>
            {reports.branchStats.map((b:any)=>(
              <div key={b.branch} className="card" style={{background:"#161b22",border:"1px solid rgba(255,255,255,0.06)",borderRadius:14,padding:18}}>
                <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:14}}>
                  <span style={{fontSize:28}}>{b.branchIcon}</span>
                  <div><div style={{fontWeight:700,fontSize:15}}>{b.branchName}</div><div style={{fontSize:11,color:"rgba(255,255,255,0.4)"}}>{b.staffCount} staff</div></div>
                </div>
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
                  {[["Stock value",fmtM(b.stockValue),"#3fb950"],["Total received",fmtM(b.totalReceived),"#3078ff"],["Approved",b.approvedTransfers,"#3fb950"],["Low stock",b.lowStockCount,b.lowStockCount>0?"#f85149":"#3fb950"]].map(([l,v,c],j)=>(
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
        <div style={{fontSize:14,fontWeight:700}}>🔄 Recent Transfers</div>
        <button onClick={()=>setTab("transfers")} style={{background:"rgba(48,120,255,0.1)",border:"1px solid rgba(48,120,255,0.2)",color:"#3078ff",borderRadius:8,padding:"5px 13px",cursor:"pointer",fontSize:12,fontWeight:600}}>All →</button>
      </div>
      <div style={{background:"#161b22",border:"1px solid rgba(255,255,255,0.06)",borderRadius:14,overflow:"hidden"}}>
        <table>
          <thead><tr><th>ID</th><th>Branch</th><th>Value</th><th>Status</th><th>Date</th></tr></thead>
          <tbody>
            {transfers.slice(0,8).map((t:Transfer)=>{
              const st=ST_CFG[t.status];
              return (
                <tr key={t.id}>
                  <td style={{fontFamily:"monospace",fontSize:11,color:"#3078ff"}}>{t.id.slice(-8)}</td>
                  <td>{BICON[t.toBranch]} {BNAME[t.toBranch]}</td>
                  <td style={{color:"#3fb950",fontWeight:700}}>{fmtM(t.totalValue)}</td>
                  <td><span style={{background:st.bg,color:st.c,padding:"2px 10px",borderRadius:20,fontSize:11,fontWeight:700}}>{st.i} {st.l}</span></td>
                  <td style={{fontSize:11,color:"rgba(255,255,255,0.4)"}}>{fmtD(t.createdAt)}</td>
                </tr>
              );
            })}
            {transfers.length===0 && <tr><td colSpan={5} style={{textAlign:"center",color:"rgba(255,255,255,0.4)",padding:30}}>No transfers yet</td></tr>}
          </tbody>
        </table>
      </div>
    </PageWrap>
  );
}

// ════════════════════════════════════════════════════════════
// WAREHOUSE
// ════════════════════════════════════════════════════════════
function WarehouseTab({ products, stock, user, onRefresh, showToast, openLowStock }:any) {
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
    if (isNaN(qty)||qty<0) { showToast("Invalid quantity","error"); return; }
    const data = updateStockLocal(editProduct.id, qty);
    if (data.success) { showToast("Stock updated!"); setEditProduct(null); onRefresh(); }
    else showToast("Error updating stock","error");
  };

  return (
    <PageWrap title="📦 Warehouse" sub={<>Total value: <strong style={{color:"#3fb950"}}>{fmtM(totalVal)}</strong></>}>
      {editProduct && (
        <div className="modal-backdrop">
          <div className="modal" style={{maxWidth:360}}>
            <div style={{fontSize:17,fontWeight:800,marginBottom:16}}>📝 Edit Stock Quantity</div>
            <div style={{background:"rgba(255,255,255,0.04)",borderRadius:10,padding:13,marginBottom:14}}>
              <div style={{fontWeight:700,marginBottom:4}}>{editProduct.name}</div>
              <div style={{color:"rgba(255,255,255,0.4)",fontSize:12}}>Current: <strong style={{color:"#f0a500"}}>{fmt(stock[editProduct.id]||0)} {editProduct.unit}</strong></div>
            </div>
            <label style={{fontSize:11,color:"rgba(255,255,255,0.5)",fontWeight:600,letterSpacing:1,display:"block",marginBottom:7}}>NEW QUANTITY ({editProduct.unit})</label>
            <input type="number" value={newQty} onChange={e=>setNewQty(e.target.value)} style={{marginBottom:16}} />
            <div style={{display:"flex",gap:10}}>
              <button onClick={()=>setEditProduct(null)} style={{flex:1,padding:11,borderRadius:10,border:"1px solid rgba(255,255,255,0.1)",background:"transparent",color:"rgba(255,255,255,0.5)",cursor:"pointer"}}>Cancel</button>
              <button onClick={saveStock} style={{flex:2,padding:11,borderRadius:10,border:"none",background:"linear-gradient(135deg,#3078ff,#1a56db)",color:"#fff",fontWeight:700,cursor:"pointer"}}>💾 Save</button>
            </div>
          </div>
        </div>
      )}

      {/* LOW STOCK WARNING */}
      {lowCount>0 && (
        <div onClick={openLowStock} style={{background:"rgba(248,81,73,0.08)",border:"1px solid rgba(248,81,73,0.25)",borderRadius:11,padding:"12px 16px",display:"flex",alignItems:"center",gap:10,marginBottom:20,cursor:"pointer"}}>
          <span style={{fontSize:20}}>⚠️</span>
          <div style={{flex:1}}>
            <div style={{color:"#f85149",fontWeight:700,fontSize:13}}>{lowCount} products low in stock! {medCount>0&&`· ${medCount} medium`}</div>
            <div style={{fontSize:11,color:"rgba(255,255,255,0.4)"}}>Click to see details →</div>
          </div>
          <span style={{color:"#f85149",fontSize:18}}>›</span>
        </div>
      )}

      {/* LEGEND */}
      <div style={{display:"flex",gap:16,marginBottom:16,flexWrap:"wrap"}}>
        <span style={{fontSize:12,color:"rgba(255,255,255,0.5)"}}>🟢 Good (&gt;2× min) &nbsp; 🟡 Medium (1–2× min) &nbsp; 🔴 Low (≤ min)</span>
      </div>

      {/* FILTERS */}
      <div style={{display:"flex",gap:10,marginBottom:18,flexWrap:"wrap"}}>
        <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="🔍 Search product..." style={{flex:1,minWidth:180,maxWidth:300}} />
        <select value={cat} onChange={e=>setCat(e.target.value)} style={{minWidth:150}}>
          <option value="all">All categories</option>
          {cats.filter(c=>c!=="all").map(c=><option key={c} value={c}>{CATICON[c]||"📦"} {c}</option>)}
        </select>
      </div>

      <div style={{background:"#161b22",border:"1px solid rgba(255,255,255,0.06)",borderRadius:14,overflow:"auto"}}>
        <table>
          <thead>
            <tr><th>#</th><th>Product</th><th>Category</th><th>Quantity</th><th>Unit</th><th>Total units</th><th>Price</th><th>Value</th><th>Status</th>{isSA&&<th>Action</th>}</tr>
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
                  <td>{qtyBadge(qty,p.minStock)}</td>
                  {isSA&&<td><button className="action-btn" onClick={()=>{setEditProduct(p);setNewQty(String(qty));}} style={{background:"rgba(48,120,255,0.1)",border:"1px solid rgba(48,120,255,0.2)",color:"#3078ff",borderRadius:8,padding:"5px 11px",fontSize:11,fontWeight:600}}>✏️ Edit</button></td>}
                </tr>
              );
            })}
            {filtered.length===0&&<tr><td colSpan={10} style={{textAlign:"center",color:"rgba(255,255,255,0.4)",padding:30}}>No products found</td></tr>}
          </tbody>
        </table>
      </div>
    </PageWrap>
  );
}

// ════════════════════════════════════════════════════════════
// TRANSFERS
// ════════════════════════════════════════════════════════════
function TransfersTab({ transfers, products, user, onRefresh, showToast }:any) {
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
    if (!valid.length) { showToast("Add at least 1 product","error"); return; }
    setLoading(true);
    const data = createTransferLocal(user.role, valid.map(i=>({productId:i.pid,quantity:i.qty})), user.name, note);
    if (data.success) { showToast("Request sent! Waiting for approval."); setShowReq(false); setReqItems([{pid:"",qty:1}]); setNote(""); onRefresh(); }
    else showToast(data.message,"error");
    setLoading(false);
  };

  const approve = async (id:string) => {
    const data = approveTransferLocal(id, user.name);
    if(data.success){showToast("Approved! Stock updated.");onRefresh();}else showToast(data.message,"error");
  };
  const reject = async (id:string) => {
    const data = rejectTransferLocal(id, user.name);
    if(data.success){showToast("Rejected.","error");onRefresh();}
  };

  return (
    <PageWrap title="🔄 Transfers" sub={`${myTr.length} total transfers`}
      action={!isSA&&<Btn color="blue" onClick={()=>setShowReq(true)}>📤 New Request</Btn>}>

      {/* REQUEST MODAL */}
      {showReq && (
        <div className="modal-backdrop">
          <div className="modal" style={{maxWidth:560}}>
            <div style={{fontSize:17,fontWeight:800,marginBottom:16}}>📤 Stock Transfer Request</div>
            <div style={{background:"rgba(48,120,255,0.08)",border:"1px solid rgba(48,120,255,0.2)",borderRadius:9,padding:"10px 14px",fontSize:12,color:"rgba(255,255,255,0.6)",marginBottom:14}}>
              Request from <strong style={{color:"#fff"}}>Main Warehouse</strong> to <strong style={{color:"#fff"}}>{user.branchName}</strong>
            </div>
            {reqItems.map((item,i)=>(
              <div key={i} style={{display:"grid",gridTemplateColumns:"1fr 90px 30px",gap:8,marginBottom:8,alignItems:"center"}}>
                <select value={item.pid} onChange={e=>{const n=[...reqItems];n[i].pid=e.target.value;setReqItems(n);}}>
                  <option value="">Select product</option>
                  {products.map((p:Product)=><option key={p.id} value={p.id}>{p.name} ({p.unit})</option>)}
                </select>
                <input type="number" value={item.qty} min={0.1} step={0.1} onChange={e=>{const n=[...reqItems];n[i].qty=parseFloat(e.target.value)||1;setReqItems(n);}} placeholder="Qty" />
                <button onClick={()=>setReqItems(reqItems.filter((_,idx)=>idx!==i))} style={{background:"rgba(248,81,73,0.1)",border:"1px solid rgba(248,81,73,0.2)",color:"#f85149",borderRadius:7,padding:6,cursor:"pointer",fontSize:14}}>×</button>
              </div>
            ))}
            <button onClick={()=>setReqItems([...reqItems,{pid:"",qty:1}])} style={{width:"100%",padding:9,borderRadius:8,border:"1px dashed rgba(63,185,80,0.4)",background:"rgba(63,185,80,0.06)",color:"#3fb950",cursor:"pointer",fontSize:12,fontWeight:600,marginBottom:12}}>+ Add product</button>
            <textarea value={note} onChange={e=>setNote(e.target.value)} placeholder="Note (optional)..." rows={2} style={{resize:"vertical",marginBottom:14}} />
            <div style={{display:"flex",gap:10}}>
              <button onClick={()=>setShowReq(false)} style={{flex:1,padding:11,borderRadius:10,border:"1px solid rgba(255,255,255,0.1)",background:"transparent",color:"rgba(255,255,255,0.5)",cursor:"pointer"}}>Cancel</button>
              <button onClick={submitReq} disabled={loading} style={{flex:2,padding:11,borderRadius:10,border:"none",background:"linear-gradient(135deg,#3078ff,#1a56db)",color:"#fff",fontWeight:700,cursor:"pointer"}}>
                {loading?"Sending...":"📤 Send Request"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DETAIL MODAL */}
      {detail && (
        <div className="modal-backdrop">
          <div className="modal" style={{maxWidth:520}}>
            <div style={{fontSize:17,fontWeight:800,marginBottom:16}}>📋 Transfer Details</div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:14}}>
              {[["ID",detail.id,true],["Status",`${ST_CFG[detail.status].i} ${ST_CFG[detail.status].l}`],["Branch",`${BICON[detail.toBranch]} ${BNAME[detail.toBranch]}`],["Requested by",detail.requestedBy],["Approved by",detail.approvedBy||"—"],["Total value",fmtM(detail.totalValue)]].map(([l,v,mono],i)=>(
                <div key={i} style={{background:"rgba(255,255,255,0.04)",borderRadius:9,padding:"10px 12px"}}>
                  <div style={{fontSize:10,color:"rgba(255,255,255,0.4)",marginBottom:3}}>{l}</div>
                  <div style={{fontWeight:600,fontSize:12,fontFamily:mono?"monospace":"inherit",color:mono?"#3078ff":"#fff",wordBreak:"break-all"}}>{v}</div>
                </div>
              ))}
            </div>
            {detail.note&&<div style={{background:"rgba(255,255,255,0.04)",borderRadius:9,padding:"10px 12px",fontSize:12,color:"rgba(255,255,255,0.5)",marginBottom:14}}>📝 {detail.note}</div>}
            <div style={{fontSize:13,fontWeight:700,marginBottom:10}}>Products:</div>
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
            <button onClick={()=>setDetail(null)} style={{width:"100%",padding:11,borderRadius:10,border:"1px solid rgba(255,255,255,0.1)",background:"transparent",color:"rgba(255,255,255,0.5)",cursor:"pointer"}}>Close</button>
          </div>
        </div>
      )}

      {/* FILTERS */}
      <div style={{display:"flex",gap:8,marginBottom:18,flexWrap:"wrap"}}>
        {["all","pending","approved","rejected"].map(s=>{
          const cnt=s==="all"?myTr.length:myTr.filter((t:Transfer)=>t.status===s).length;
          return <button key={s} onClick={()=>setStatusF(s)} style={{padding:"7px 14px",borderRadius:8,border:`1px solid ${statusF===s?"rgba(48,120,255,0.4)":"rgba(255,255,255,0.1)"}`,background:statusF===s?"rgba(48,120,255,0.12)":"rgba(255,255,255,0.04)",color:statusF===s?"#3078ff":"rgba(255,255,255,0.6)",cursor:"pointer",fontSize:12,fontWeight:statusF===s?700:400}}>
            {s==="all"?"All":ST_CFG[s as keyof typeof ST_CFG]?.l||s} <span style={{background:"rgba(255,255,255,0.1)",borderRadius:10,padding:"1px 7px",marginLeft:4,fontSize:10}}>{cnt}</span>
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
                    <span style={{background:st.bg,color:st.c,padding:"2px 10px",borderRadius:20,fontSize:11,fontWeight:700}}>{st.i} {st.l}</span>
                  </div>
                  <div style={{display:"flex",gap:14,fontSize:12,color:"rgba(255,255,255,0.5)",flexWrap:"wrap"}}>
                    <span>📍 {BICON[t.toBranch]} {BNAME[t.toBranch]}</span>
                    <span>👤 {t.requestedBy}</span>
                    <span>📦 {t.items.length} products</span>
                    <span style={{color:"#3fb950",fontWeight:700}}>💰 {fmtM(t.totalValue)}</span>
                    <span>🕐 {fmtD(t.createdAt)}</span>
                  </div>
                  {t.note&&<div style={{marginTop:6,fontSize:11,color:"rgba(255,255,255,0.4)",fontStyle:"italic"}}>📝 {t.note}</div>}
                </div>
                <div style={{display:"flex",gap:7,flexWrap:"wrap"}}>
                  <button className="action-btn" onClick={()=>setDetail(t)} style={{background:"rgba(255,255,255,0.06)",border:"1px solid rgba(255,255,255,0.1)",color:"rgba(255,255,255,0.7)",borderRadius:8,padding:"7px 12px",fontSize:12}}>🔍 View</button>
                  {isSA&&t.status==="pending"&&<>
                    <button className="action-btn" onClick={()=>approve(t.id)} style={{background:"rgba(63,185,80,0.1)",border:"1px solid rgba(63,185,80,0.3)",color:"#3fb950",borderRadius:8,padding:"7px 12px",fontSize:12,fontWeight:700}}>✅ Approve</button>
                    <button className="action-btn" onClick={()=>reject(t.id)} style={{background:"rgba(248,81,73,0.1)",border:"1px solid rgba(248,81,73,0.3)",color:"#f85149",borderRadius:8,padding:"7px 12px",fontSize:12,fontWeight:700}}>❌ Reject</button>
                  </>}
                </div>
              </div>
            </div>
          );
        })}
        {filtered.length===0&&<div style={{textAlign:"center",padding:"60px 20px",color:"rgba(255,255,255,0.3)"}}>📭<br/><span style={{fontSize:16,marginTop:12,display:"block"}}>No transfers</span></div>}
      </div>
    </PageWrap>
  );
}

// ════════════════════════════════════════════════════════════
// SUPPLIERS
// ════════════════════════════════════════════════════════════
function SuppliersTab({ suppliers, products, user, onRefresh, showToast }:any) {
  const [filter, setFilter] = useState("all");
  const [selectedFirm, setSelectedFirm] = useState<string|null>(null);
  const [firmView, setFirmView] = useState<"history"|"add"|"payments"|"products">("history");
  const [showModal, setShowModal] = useState(false);
  const [supItems, setSupItems] = useState([{pid:"",qty:1,price:0,qr:""}]);
  const [payMethod, setPayMethod] = useState<"paid"|"unpaid"|"partial">("unpaid");
  const [form, setForm] = useState({firm:"",doc:"",date:new Date().toISOString().slice(0,10),note:"",totalPrice:"",paidAmount:""});
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

  const openFirmWindow = (firmName:string, view:"history"|"add"|"payments"|"products" = "history") => {
    setSelectedFirm(firmName);
    setFirmView(view);
  };

  const openDeliveryModal = (firmName = "") => {
    setSupItems([{pid:"",qty:1,price:0,qr:""}]);
    setForm({firm:firmName,doc:"",date:new Date().toISOString().slice(0,10),note:"",totalPrice:"",paidAmount:""});
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

  const submit = async () => {
    if (!form.firm.trim()) { showToast("Enter company name","error"); return; }
    const valid = supItems.filter(i=>i.pid&&i.qty>0);
    if (!valid.length) { showToast("Add at least 1 product","error"); return; }
    const total = calcTotal() || parseFloat(form.totalPrice)||0;
    if (!total) { showToast("Enter price","error"); return; }
    const paid = payMethod==="paid"?total:payMethod==="unpaid"?0:parseFloat(form.paidAmount)||0;
    const items = valid.map(i=>{
      const p = products.find((x:Product)=>x.id===i.pid)!;
      return {productId:i.pid,productName:p.name,quantity:i.qty,unit:p.unit,perBox:p.perBox,boxUnit:p.boxUnit,pricePerUnit:i.price||p.pricePerUnit,qrCode:p.qrCode||i.qr||""};
    });
    setLoading(true);
    const data = createSupplierLocal({firm:form.firm,docNumber:form.doc,deliveryDate:form.date,note:form.note,items,totalPrice:total,payStatus:payMethod,paidAmount:paid});
    if(data.success){showToast(`Delivery recorded! ${fmtM(total)}`);setShowModal(false);setSupItems([{pid:"",qty:1,price:0,qr:""}]);setForm({firm:"",doc:"",date:new Date().toISOString().slice(0,10),note:"",totalPrice:"",paidAmount:""});setPayMethod("unpaid");setSelectedFirm(form.firm);onRefresh();}
    else showToast("Error","error");
    setLoading(false);
  };

  return (
    <PageWrap title="🚚 Suppliers" sub={<>Total debt: <strong style={{color:totalDebt>0?"#f85149":"#3fb950"}}>{fmtM(totalDebt)}</strong></>}
      action={<Btn color="blue" onClick={()=>openDeliveryModal(selectedFirm||"")}>+ Record Delivery</Btn>}>

      {showModal && (
        <div className="modal-backdrop">
          <div className="modal" style={{maxWidth:600}}>
            <div style={{fontSize:17,fontWeight:800,marginBottom:16}}>🚚 Record New Delivery</div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:14}}>
              <div><label style={{fontSize:11,color:"rgba(255,255,255,0.5)",fontWeight:600,letterSpacing:1,display:"block",marginBottom:6}}>COMPANY NAME</label><input value={form.firm} onChange={e=>setForm({...form,firm:e.target.value})} placeholder="Mars LLC, Nestle..." /></div>
              <div><label style={{fontSize:11,color:"rgba(255,255,255,0.5)",fontWeight:600,letterSpacing:1,display:"block",marginBottom:6}}>DELIVERY DATE</label><input type="date" value={form.date} onChange={e=>setForm({...form,date:e.target.value})} /></div>
              <div><label style={{fontSize:11,color:"rgba(255,255,255,0.5)",fontWeight:600,letterSpacing:1,display:"block",marginBottom:6}}>DOCUMENT NO.</label><input value={form.doc} onChange={e=>setForm({...form,doc:e.target.value})} placeholder="INV-2024-001" /></div>
              <div><label style={{fontSize:11,color:"rgba(255,255,255,0.5)",fontWeight:600,letterSpacing:1,display:"block",marginBottom:6}}>TOTAL PRICE (₩)</label><input type="number" value={form.totalPrice} onChange={e=>setForm({...form,totalPrice:e.target.value})} placeholder="1500000" /></div>
            </div>
            <div style={{fontSize:13,fontWeight:700,marginBottom:10}}>📦 Products:</div>
            {supItems.map((item,i)=>{
              const p = products.find((x:Product)=>x.id===item.pid);
              const dona = p&&p.perBox>0&&item.qty ? <div style={{background:"rgba(48,120,255,0.06)",border:"1px solid rgba(48,120,255,0.15)",borderRadius:7,padding:"6px 10px",fontSize:11,color:"rgba(255,255,255,0.5)",marginTop:5}}>📦 {fmt(item.qty)} {p.unit} = <strong style={{color:"#79c0ff"}}>{fmt(item.qty*p.perBox)} {p.boxUnit}</strong></div>:null;
              return (
                <div key={i} style={{background:"rgba(255,255,255,0.03)",borderRadius:10,padding:12,marginBottom:8}}>
                  <div style={{display:"grid",gridTemplateColumns:"1fr 90px",gap:8,alignItems:"center",marginBottom:8}}>
                    <input value={item.qr} onChange={e=>{const n=[...supItems];n[i].qr=e.target.value;setSupItems(n);}} onKeyDown={e=>{if(e.key==="Enter") applyQrCode(i,item.qr);}} placeholder="QR code" />
                    <button onClick={()=>applyQrCode(i,item.qr)} style={{background:"rgba(48,120,255,0.1)",border:"1px solid rgba(48,120,255,0.25)",color:"#3078ff",borderRadius:8,padding:"9px 10px",cursor:"pointer",fontSize:12,fontWeight:700}}>Scan</button>
                  </div>
                  <div style={{display:"grid",gridTemplateColumns:"1fr 80px 100px 30px",gap:8,alignItems:"center"}}>
                    <select value={item.pid} onChange={e=>{const n=[...supItems];const picked=products.find((p:Product)=>p.id===e.target.value);n[i].pid=e.target.value;n[i].qr=picked?.qrCode||n[i].qr;n[i].price=n[i].price||picked?.pricePerUnit||0;setSupItems(n);}}>
                      <option value="">Select product</option>
                      {products.map((p:Product)=><option key={p.id} value={p.id}>{p.name} ({p.unit})</option>)}
                    </select>
                    <input type="number" value={item.qty} min={0.1} step={0.1} onChange={e=>{const n=[...supItems];n[i].qty=parseFloat(e.target.value)||1;setSupItems(n);}} placeholder="Qty" />
                    <input type="number" value={item.price||""} onChange={e=>{const n=[...supItems];n[i].price=parseFloat(e.target.value)||0;setSupItems(n);}} placeholder="Price" />
                    <button onClick={()=>setSupItems(supItems.filter((_,idx)=>idx!==i))} style={{background:"rgba(248,81,73,0.1)",border:"1px solid rgba(248,81,73,0.2)",color:"#f85149",borderRadius:7,padding:6,cursor:"pointer",fontSize:14}}>×</button>
                  </div>
                  {dona}
                </div>
              );
            })}
            <button onClick={()=>setSupItems([...supItems,{pid:"",qty:1,price:0,qr:""}])} style={{width:"100%",padding:9,borderRadius:8,border:"1px dashed rgba(48,120,255,0.4)",background:"rgba(48,120,255,0.05)",color:"#3078ff",cursor:"pointer",fontSize:12,fontWeight:600,marginBottom:12}}>+ Add product</button>
            {calcTotal()>0&&<div style={{background:"rgba(255,255,255,0.04)",borderRadius:10,padding:"11px 14px",marginBottom:12,display:"flex",justifyContent:"space-between"}}>
              <span style={{color:"rgba(255,255,255,0.5)",fontSize:13}}>Calculated total:</span>
              <span style={{fontWeight:800,fontSize:18,color:"#3fb950"}}>{fmtM(calcTotal())}</span>
            </div>}
            <div style={{marginBottom:14}}>
              <label style={{fontSize:11,color:"rgba(255,255,255,0.5)",fontWeight:600,letterSpacing:1,display:"block",marginBottom:8}}>PAYMENT STATUS</label>
              <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
                {(["paid","unpaid","partial"] as const).map(m=>(
                  <button key={m} onClick={()=>setPayMethod(m)} style={{padding:"7px 14px",borderRadius:9,border:`2px solid ${payMethod===m?PAY_CFG[m].c:"rgba(255,255,255,0.1)"}`,background:payMethod===m?PAY_CFG[m].bg:"transparent",color:payMethod===m?PAY_CFG[m].c:"rgba(255,255,255,0.5)",cursor:"pointer",fontSize:12,fontWeight:700}}>
                    {PAY_CFG[m].l}
                  </button>
                ))}
              </div>
            </div>
            {payMethod==="partial"&&<div style={{marginBottom:12}}><label style={{fontSize:11,color:"rgba(255,255,255,0.5)",fontWeight:600,letterSpacing:1,display:"block",marginBottom:6}}>PAID AMOUNT (₩)</label><input type="number" value={form.paidAmount} onChange={e=>setForm({...form,paidAmount:e.target.value})} placeholder="750000" /></div>}
            <textarea value={form.note} onChange={e=>setForm({...form,note:e.target.value})} placeholder="Note (optional)..." rows={2} style={{resize:"vertical",marginBottom:14}} />
            <div style={{display:"flex",gap:10}}>
              <button onClick={()=>setShowModal(false)} style={{flex:1,padding:11,borderRadius:10,border:"1px solid rgba(255,255,255,0.1)",background:"transparent",color:"rgba(255,255,255,0.5)",cursor:"pointer"}}>Cancel</button>
              <button onClick={submit} disabled={loading} style={{flex:2,padding:11,borderRadius:10,border:"none",background:"linear-gradient(135deg,#3078ff,#1a56db)",color:"#fff",fontWeight:700,cursor:"pointer"}}>
                {loading?"Saving...":"💾 Save Delivery"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* STATS */}
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(160px,1fr))",gap:14,marginBottom:20}}>
        {[["Total Value",fmtM(totalVal),"#3078ff","💰"],["Paid",fmtM(totalPaid),"#3fb950","✅"],["Debt",fmtM(totalDebt),totalDebt>0?"#f85149":"#3fb950","⚠️"],["Total",suppliers.length+" deliveries","#a371f7","🚚"]].map(([l,v,c,i])=>(
          <div key={String(l)} className="stat-card"><div style={{fontSize:22,marginBottom:6}}>{i}</div><div style={{fontSize:10,color:"rgba(255,255,255,0.4)",marginBottom:4}}>{l}</div><div style={{fontWeight:800,color:String(c),fontSize:16}}>{v}</div></div>
        ))}
      </div>

      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:12,marginBottom:14}}>
        <div>
          <div style={{fontSize:16,fontWeight:800}}>Firmalar ro'yxati</div>
          <div style={{fontSize:12,color:"rgba(255,255,255,0.4)",marginTop:3}}>Firma ustiga bosing, ichida history va yangi mahsulot qo'shish bo'limlari ochiladi</div>
        </div>
        <button onClick={()=>openDeliveryModal()} style={{background:"rgba(48,120,255,0.1)",border:"1px solid rgba(48,120,255,0.25)",color:"#79c0ff",borderRadius:8,padding:"9px 13px",cursor:"pointer",fontSize:12,fontWeight:800}}>+ Yangi firma</button>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(260px,1fr))",gap:14,marginBottom:22}}>
        {firmRows.map((firm:any)=>(
          <button key={firm.name} onClick={()=>openFirmWindow(firm.name)} className="action-btn" style={{textAlign:"left",background:"linear-gradient(180deg,#161b22,#111820)",border:"1px solid rgba(255,255,255,0.08)",borderRadius:10,padding:0,color:"#e6edf3",cursor:"pointer",overflow:"hidden",boxShadow:"0 12px 30px rgba(0,0,0,0.18)"}}>
            <div style={{height:4,background:firm.debt>0?"linear-gradient(90deg,#f85149,#d29922)":"linear-gradient(90deg,#3fb950,#79c0ff)"}} />
            <div style={{padding:16}}>
              <div style={{display:"flex",justifyContent:"space-between",gap:10,marginBottom:12,alignItems:"flex-start"}}>
                <div>
                  <div style={{fontSize:16,fontWeight:900,marginBottom:4}}>{firm.name}</div>
                  <div style={{fontSize:11,color:"rgba(255,255,255,0.38)"}}>Oxirgi: {fmtD(firm.lastDate)}</div>
                </div>
                <span style={{fontSize:10,color:firm.debt>0?"#f85149":"#3fb950",fontWeight:900,border:`1px solid ${firm.debt>0?"rgba(248,81,73,0.28)":"rgba(63,185,80,0.28)"}`,borderRadius:999,padding:"4px 8px",background:firm.debt>0?"rgba(248,81,73,0.08)":"rgba(63,185,80,0.08)"}}>{firm.debt>0?"QARZ":"TO'LANGAN"}</span>
              </div>
              <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:8,marginBottom:14}}>
                <div style={{background:"rgba(255,255,255,0.035)",borderRadius:8,padding:"9px 8px"}}><div style={{fontSize:10,color:"rgba(255,255,255,0.35)"}}>Kirim</div><div style={{fontSize:13,fontWeight:800}}>{firm.count}</div></div>
                <div style={{background:"rgba(255,255,255,0.035)",borderRadius:8,padding:"9px 8px"}}><div style={{fontSize:10,color:"rgba(255,255,255,0.35)"}}>Mahsulot</div><div style={{fontSize:13,fontWeight:800}}>{firm.products}</div></div>
                <div style={{background:"rgba(255,255,255,0.035)",borderRadius:8,padding:"9px 8px"}}><div style={{fontSize:10,color:"rgba(255,255,255,0.35)"}}>Qarz</div><div style={{fontSize:13,fontWeight:800,color:firm.debt>0?"#f85149":"#3fb950"}}>{fmtM(firm.debt)}</div></div>
              </div>
              <div style={{display:"flex",justifyContent:"space-between",fontSize:12}}>
                <span style={{color:"rgba(255,255,255,0.45)"}}>Jami summa</span>
                <span style={{color:"#3fb950",fontWeight:900}}>{fmtM(firm.total)}</span>
              </div>
            </div>
          </button>
        ))}
        {firmRows.length===0&&<div style={{background:"#161b22",border:"1px solid rgba(255,255,255,0.06)",borderRadius:14,padding:24,color:"rgba(255,255,255,0.35)",textAlign:"center"}}>No firms yet</div>}
      </div>

      {selectedFirm&&(
        <div className="modal-backdrop">
          <div className="modal" style={{maxWidth:980,padding:0,overflow:"hidden"}}>
            <div style={{display:"grid",gridTemplateColumns:"230px 1fr",minHeight:560}}>
              <aside style={{background:"#0d1117",borderRight:"1px solid rgba(255,255,255,0.08)",padding:18}}>
                <div style={{fontSize:18,fontWeight:900,marginBottom:4}}>{selectedFirm}</div>
                <div style={{fontSize:12,color:"rgba(255,255,255,0.42)",marginBottom:18}}>Firma kabineti</div>
                {[
                  ["history","History","Oldingi kirimlar"],
                  ["add","Add now","Yangi mahsulot kiritish"],
                  ["payments","Payments","To'lov va qarzlar"],
                  ["products","Products","Olingan mahsulotlar"],
                ].map(([id,label,sub])=>(
                  <button key={id} onClick={()=>setFirmView(id as any)} style={{width:"100%",textAlign:"left",background:firmView===id?"rgba(48,120,255,0.14)":"transparent",border:`1px solid ${firmView===id?"rgba(48,120,255,0.32)":"transparent"}`,color:firmView===id?"#79c0ff":"rgba(255,255,255,0.68)",borderRadius:9,padding:"11px 12px",cursor:"pointer",marginBottom:7}}>
                    <div style={{fontSize:13,fontWeight:900}}>{label}</div>
                    <div style={{fontSize:10,color:"rgba(255,255,255,0.36)",marginTop:2}}>{sub}</div>
                  </button>
                ))}
                <button onClick={()=>setSelectedFirm(null)} style={{width:"100%",marginTop:18,background:"rgba(255,255,255,0.05)",border:"1px solid rgba(255,255,255,0.1)",color:"rgba(255,255,255,0.62)",borderRadius:9,padding:"10px 12px",cursor:"pointer",fontSize:12,fontWeight:800}}>Close</button>
              </aside>
              <section style={{background:"#161b22",padding:20,maxHeight:"78vh",overflow:"auto"}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:12,flexWrap:"wrap",marginBottom:18}}>
                  <div>
                    <div style={{fontSize:20,fontWeight:900}}>{firmView==="history"?"History":firmView==="add"?"Add now":firmView==="payments"?"Payments":"Products"}</div>
                    <div style={{fontSize:12,color:"rgba(255,255,255,0.42)",marginTop:3}}>{selectedHistory.length} ta kirim, jami {fmtM(selectedFirmRow?.total||0)}</div>
                  </div>
                  <button onClick={()=>openDeliveryModal(selectedFirm)} style={{background:"linear-gradient(135deg,#3078ff,#1a56db)",border:"none",color:"#fff",borderRadius:9,padding:"10px 14px",cursor:"pointer",fontSize:12,fontWeight:900}}>+ Add delivery</button>
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
                              <div style={{fontSize:13,fontWeight:900}}>{s.docNumber||"No document"}</div>
                              <div style={{fontSize:11,color:"rgba(255,255,255,0.42)",marginTop:2}}>{new Date(s.deliveryDate||s.createdAt).toLocaleDateString("en-US",{day:"2-digit",month:"short",year:"numeric"})}</div>
                            </div>
                            <button onClick={()=>togglePay(s)} style={{background:pay.bg,border:`1px solid ${pay.c}44`,color:pay.c,borderRadius:20,padding:"6px 13px",fontSize:11,fontWeight:800,cursor:"pointer"}}>{pay.l}</button>
                          </div>
                          <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(120px,1fr))",gap:8,marginBottom:10}}>
                            <div style={{background:"rgba(0,0,0,0.12)",borderRadius:8,padding:10}}><div style={{fontSize:10,color:"rgba(255,255,255,0.35)"}}>Total</div><div style={{fontSize:14,fontWeight:900,color:"#3fb950"}}>{fmtM(s.totalPrice)}</div></div>
                            <div style={{background:"rgba(0,0,0,0.12)",borderRadius:8,padding:10}}><div style={{fontSize:10,color:"rgba(255,255,255,0.35)"}}>Paid</div><div style={{fontSize:14,fontWeight:900,color:"#3078ff"}}>{fmtM(s.paidAmount)}</div></div>
                            <div style={{background:"rgba(0,0,0,0.12)",borderRadius:8,padding:10}}><div style={{fontSize:10,color:"rgba(255,255,255,0.35)"}}>Debt</div><div style={{fontSize:14,fontWeight:900,color:debt>0?"#f85149":"#3fb950"}}>{fmtM(debt)}</div></div>
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
                    <div style={{fontSize:16,fontWeight:900,marginBottom:8}}>Yangi kirim qo'shish</div>
                    <div style={{fontSize:12,color:"rgba(255,255,255,0.5)",marginBottom:16}}>Bu firma nomi avtomatik to'ldiriladi. QR code orqali mahsulotni tez tanlash mumkin.</div>
                    <button onClick={()=>openDeliveryModal(selectedFirm)} style={{background:"linear-gradient(135deg,#3078ff,#1a56db)",border:"none",color:"#fff",borderRadius:9,padding:"11px 16px",cursor:"pointer",fontSize:13,fontWeight:900}}>Add now</button>
                  </div>
                )}

                {firmView==="payments"&&(
                  <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(160px,1fr))",gap:12}}>
                    <div className="stat-card"><div style={{fontSize:10,color:"rgba(255,255,255,0.4)",marginBottom:6}}>Jami</div><div style={{fontSize:18,fontWeight:900,color:"#3fb950"}}>{fmtM(selectedFirmRow?.total||0)}</div></div>
                    <div className="stat-card"><div style={{fontSize:10,color:"rgba(255,255,255,0.4)",marginBottom:6}}>To'langan</div><div style={{fontSize:18,fontWeight:900,color:"#3078ff"}}>{fmtM(selectedFirmRow?.paid||0)}</div></div>
                    <div className="stat-card"><div style={{fontSize:10,color:"rgba(255,255,255,0.4)",marginBottom:6}}>Qarz</div><div style={{fontSize:18,fontWeight:900,color:(selectedFirmRow?.debt||0)>0?"#f85149":"#3fb950"}}>{fmtM(selectedFirmRow?.debt||0)}</div></div>
                    <div style={{gridColumn:"1/-1",display:"flex",flexDirection:"column",gap:8}}>
                      {selectedHistory.map((s:Supplier)=><button key={s.id} onClick={()=>togglePay(s)} style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:10,background:"rgba(255,255,255,0.035)",border:"1px solid rgba(255,255,255,0.07)",borderRadius:9,padding:"11px 12px",color:"#e6edf3",cursor:"pointer",fontSize:12}}><span>{s.docNumber||fmtD(s.createdAt)}</span><span style={{color:PAY_CFG[s.payStatus].c,fontWeight:900}}>{PAY_CFG[s.payStatus].l}</span></button>)}
                    </div>
                  </div>
                )}

                {firmView==="products"&&(
                  <div style={{display:"flex",flexDirection:"column",gap:8}}>
                    {Object.values(selectedHistory.flatMap((s:Supplier)=>s.items).reduce((acc:Record<string,any>, it:any)=>{
                      const key = it.productName;
                      if(!acc[key]) acc[key]={name:key, qty:0, unit:it.unit, total:0, qr:it.qrCode||""};
                      acc[key].qty += it.quantity;
                      acc[key].total += it.quantity*it.pricePerUnit;
                      if(it.qrCode) acc[key].qr = it.qrCode;
                      return acc;
                    },{})).map((it:any)=>(
                      <div key={it.name} style={{display:"grid",gridTemplateColumns:"1fr auto auto",gap:10,background:"rgba(255,255,255,0.035)",border:"1px solid rgba(255,255,255,0.07)",borderRadius:9,padding:"11px 12px",fontSize:12}}>
                        <span style={{fontWeight:900}}>{it.name}<span style={{color:"rgba(255,255,255,0.35)",fontWeight:400,marginLeft:7}}>{it.qr}</span></span>
                        <span style={{color:"rgba(255,255,255,0.55)"}}>{fmt(it.qty)} {it.unit}</span>
                        <span style={{color:"#3fb950",fontWeight:900}}>{fmtM(it.total)}</span>
                      </div>
                    ))}
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
            {f==="all"?"All":PAY_CFG[f].l} <span style={{background:"rgba(255,255,255,0.1)",borderRadius:10,padding:"1px 7px",marginLeft:3,fontSize:10}}>{f==="all"?suppliers.length:suppliers.filter((s:Supplier)=>s.payStatus===f).length}</span>
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
                <button onClick={()=>togglePay(s)} style={{background:pay.bg,border:`1px solid ${pay.c}44`,color:pay.c,borderRadius:20,padding:"5px 14px",fontSize:11,fontWeight:700,cursor:"pointer"}}>{pay.l}</button>
              </div>
              <div style={{padding:"0 18px 14px",display:"flex",gap:16,fontSize:12,color:"rgba(255,255,255,0.5)",flexWrap:"wrap"}}>
                <span>📦 {s.items.length} products</span>
                <span style={{color:"#3fb950",fontWeight:700}}>💰 Total: {fmtM(s.totalPrice)}</span>
                <span style={{color:"#3078ff"}}>✅ Paid: {fmtM(s.paidAmount)}</span>
                {debt>0&&<span style={{color:"#f85149",fontWeight:700}}>⚠️ Debt: {fmtM(debt)}</span>}
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
function StaffTab({ staffList, user, onRefresh, showToast }:any) {
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({name:"",role:"",branch:user.role==="superadmin"?"main":user.role,phone:"",salary:"",joinDate:new Date().toISOString().slice(0,10)});
  const isSA = user.role==="superadmin";
  const totalSalary = staffList.filter((s:Staff)=>s.active).reduce((t:number,s:Staff)=>t+s.salary,0);
  const branches = isSA?["main","restaurant1","restaurant2","shop"]:[user.role];

  const submit = async () => {
    if (!form.name||!form.role||!form.phone) { showToast("Fill in all fields","error"); return; }
    const data = addStaffLocal({...form,salary:parseFloat(form.salary)||0,active:true});
    if(data.success){showToast("Staff member added!");setShowModal(false);setForm({name:"",role:"",branch:user.role==="superadmin"?"main":user.role,phone:"",salary:"",joinDate:new Date().toISOString().slice(0,10)});onRefresh();}
  };
  const toggle = async (id:string) => {
    const data = toggleStaffLocal(id);
    if(data.success){showToast("Staff status updated");onRefresh();}
  };

  return (
    <PageWrap title="👥 Staff" sub={<>Total salary: <strong style={{color:"#f0a500"}}>{fmtM(totalSalary)}/month</strong></>}
      action={<Btn color="blue" onClick={()=>setShowModal(true)}>+ Add Staff</Btn>}>
      {showModal&&(
        <div className="modal-backdrop">
          <div className="modal">
            <div style={{fontSize:17,fontWeight:800,marginBottom:16}}>👤 Add New Staff</div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
              <div><label style={{fontSize:11,color:"rgba(255,255,255,0.5)",fontWeight:600,letterSpacing:1,display:"block",marginBottom:6}}>FULL NAME</label><input value={form.name} onChange={e=>setForm({...form,name:e.target.value})} placeholder="Full Name" /></div>
              <div><label style={{fontSize:11,color:"rgba(255,255,255,0.5)",fontWeight:600,letterSpacing:1,display:"block",marginBottom:6}}>POSITION</label><input value={form.role} onChange={e=>setForm({...form,role:e.target.value})} placeholder="Chef, Cashier..." /></div>
              <div><label style={{fontSize:11,color:"rgba(255,255,255,0.5)",fontWeight:600,letterSpacing:1,display:"block",marginBottom:6}}>BRANCH</label>
                <select value={form.branch} onChange={e=>setForm({...form,branch:e.target.value})}>
                  {branches.map(b=><option key={b} value={b}>{BICON[b]} {BNAME[b]}</option>)}
                </select>
              </div>
              <div><label style={{fontSize:11,color:"rgba(255,255,255,0.5)",fontWeight:600,letterSpacing:1,display:"block",marginBottom:6}}>PHONE</label><input value={form.phone} onChange={e=>setForm({...form,phone:e.target.value})} placeholder="+998 90 000 00 00" /></div>
              <div><label style={{fontSize:11,color:"rgba(255,255,255,0.5)",fontWeight:600,letterSpacing:1,display:"block",marginBottom:6}}>SALARY (₩)</label><input type="number" value={form.salary} onChange={e=>setForm({...form,salary:e.target.value})} placeholder="3500000" /></div>
              <div><label style={{fontSize:11,color:"rgba(255,255,255,0.5)",fontWeight:600,letterSpacing:1,display:"block",marginBottom:6}}>JOIN DATE</label><input type="date" value={form.joinDate} onChange={e=>setForm({...form,joinDate:e.target.value})} /></div>
            </div>
            <div style={{display:"flex",gap:10,marginTop:14}}>
              <button onClick={()=>setShowModal(false)} style={{flex:1,padding:11,borderRadius:10,border:"1px solid rgba(255,255,255,0.1)",background:"transparent",color:"rgba(255,255,255,0.5)",cursor:"pointer"}}>Cancel</button>
              <button onClick={submit} style={{flex:2,padding:11,borderRadius:10,border:"none",background:"linear-gradient(135deg,#3078ff,#1a56db)",color:"#fff",fontWeight:700,cursor:"pointer"}}>💾 Add</button>
            </div>
          </div>
        </div>
      )}
      <div style={{background:"#161b22",border:"1px solid rgba(255,255,255,0.06)",borderRadius:14,overflow:"auto"}}>
        <table>
          <thead><tr><th>Name</th><th>Position</th><th>Branch</th><th>Phone</th><th>Salary</th><th>Status</th><th>Action</th></tr></thead>
          <tbody>
            {staffList.map((s:Staff)=>(
              <tr key={s.id}>
                <td style={{fontWeight:600}}>{s.name}</td>
                <td style={{color:"rgba(255,255,255,0.6)"}}>{s.role}</td>
                <td>{BICON[s.branch]||"👤"} <span style={{fontSize:11,color:"rgba(255,255,255,0.4)"}}>{BNAME[s.branch]||s.branch}</span></td>
                <td style={{fontFamily:"monospace",fontSize:11,color:"rgba(255,255,255,0.5)"}}>{s.phone}</td>
                <td style={{fontWeight:700,color:"#f0a500"}}>{fmtM(s.salary)}</td>
                <td><span style={{background:s.active?"rgba(63,185,80,0.1)":"rgba(248,81,73,0.1)",color:s.active?"#3fb950":"#f85149",padding:"2px 10px",borderRadius:20,fontSize:11,fontWeight:700}}>{s.active?"✅ Active":"⛔ Inactive"}</span></td>
                <td><button className="action-btn" onClick={()=>toggle(s.id)} style={{background:s.active?"rgba(248,81,73,0.08)":"rgba(63,185,80,0.08)",border:`1px solid ${s.active?"rgba(248,81,73,0.2)":"rgba(63,185,80,0.2)"}`,color:s.active?"#f85149":"#3fb950",borderRadius:8,padding:"5px 10px",fontSize:11,fontWeight:600}}>{s.active?"Deactivate":"Activate"}</button></td>
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
function ReportsTab({ reports, transfers }:any) {
  if (!reports) return <PageWrap><div style={{color:"rgba(255,255,255,0.4)"}}>Loading...</div></PageWrap>;
  const approved = transfers.filter((t:Transfer)=>t.status==="approved");
  const totalT = approved.reduce((s:number,t:Transfer)=>s+t.totalValue,0);
  const maxMonth = Math.max(...(reports.monthlyStats||[]).map((m:any)=>m.value),1);
  return (
    <PageWrap title="📈 Reports">
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(160px,1fr))",gap:14,marginBottom:24}}>
        {[["Main Stock Value",fmtM(reports.mainStockValue),"#3fb950","💰"],["Total Transferred",fmtM(totalT),"#3078ff","🔄"],["Total Transfers",transfers.length,"#f0a500","📋"],["Pending",reports.pendingTransfers,"#f85149","⏳"],["Products",reports.totalProducts,"#a371f7","📦"],["Staff",reports.totalStaff,"#79c0ff","👥"]].map(([l,v,c,i])=>(
          <div key={String(l)} className="stat-card card"><div style={{fontSize:22,marginBottom:6}}>{i}</div><div style={{fontSize:10,color:"rgba(255,255,255,0.4)",marginBottom:4}}>{l}</div><div style={{fontWeight:800,color:String(c),fontSize:18}}>{v}</div></div>
        ))}
      </div>
      <div style={{background:"#161b22",border:"1px solid rgba(255,255,255,0.06)",borderRadius:14,padding:20,marginBottom:20}}>
        <div style={{fontSize:14,fontWeight:700,marginBottom:16}}>📅 Monthly Transfers (₩)</div>
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
      <div style={{fontSize:14,fontWeight:700,marginBottom:14}}>🏢 Branch Comparison</div>
      <div style={{background:"#161b22",border:"1px solid rgba(255,255,255,0.06)",borderRadius:14,overflow:"auto"}}>
        <table>
          <thead><tr><th>Branch</th><th>Approved</th><th>Total received</th><th>Stock value</th><th>Staff</th><th>Low stock</th></tr></thead>
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
function ProductsTab({ products, stock, onRefresh, showToast }:any) {
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({name:"",category:"gosht",unit:"kg",minStock:"10",pricePerUnit:"",perBox:"",boxUnit:"",qrCode:""});
  const preview = parseInt(form.perBox)>0 ? `📦 10 ${form.unit} = ${10*parseInt(form.perBox)} ${form.boxUnit||"units"}` : null;

  const submit = async () => {
    if (!form.name||!form.pricePerUnit) { showToast("Enter name and price","error"); return; }
    const data = addProductLocal({...form,minStock:parseFloat(form.minStock)||10,pricePerUnit:parseFloat(form.pricePerUnit),perBox:parseInt(form.perBox)||0});
    if(data.success){showToast("Product added!");setShowModal(false);setForm({name:"",category:"gosht",unit:"kg",minStock:"10",pricePerUnit:"",perBox:"",boxUnit:"",qrCode:""});onRefresh();}
    else showToast(data.message||"Error adding product","error");
  };

  return (
    <PageWrap title={`🏷️ Products (${products.length})`} action={<Btn color="blue" onClick={()=>setShowModal(true)}>+ Add Product</Btn>}>
      {showModal&&(
        <div className="modal-backdrop">
          <div className="modal">
            <div style={{fontSize:17,fontWeight:800,marginBottom:16}}>🏷️ Add New Product</div>
            <div style={{marginBottom:12}}><label style={{fontSize:11,color:"rgba(255,255,255,0.5)",fontWeight:600,letterSpacing:1,display:"block",marginBottom:6}}>NAME</label><input value={form.name} onChange={e=>setForm({...form,name:e.target.value})} placeholder="Snickers, Beef..." /></div>
            <div style={{marginBottom:12}}><label style={{fontSize:11,color:"rgba(255,255,255,0.5)",fontWeight:600,letterSpacing:1,display:"block",marginBottom:6}}>QR CODE</label><input value={form.qrCode} onChange={e=>setForm({...form,qrCode:e.target.value})} placeholder="QR-P029" /></div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:12}}>
              <div><label style={{fontSize:11,color:"rgba(255,255,255,0.5)",fontWeight:600,letterSpacing:1,display:"block",marginBottom:6}}>CATEGORY</label>
                <select value={form.category} onChange={e=>setForm({...form,category:e.target.value})}>
                  {["gosht","sabzavot","don","sut","meva","ziravorlar","boshqa"].map(c=><option key={c} value={c}>{CATICON[c]} {c}</option>)}
                </select>
              </div>
              <div><label style={{fontSize:11,color:"rgba(255,255,255,0.5)",fontWeight:600,letterSpacing:1,display:"block",marginBottom:6}}>UNIT</label>
                <select value={form.unit} onChange={e=>setForm({...form,unit:e.target.value})}>
                  {["kg","g","l","ml","dona","qop","quti"].map(u=><option key={u} value={u}>{u}</option>)}
                </select>
              </div>
              <div><label style={{fontSize:11,color:"rgba(255,255,255,0.5)",fontWeight:600,letterSpacing:1,display:"block",marginBottom:6}}>MIN STOCK</label><input type="number" value={form.minStock} onChange={e=>setForm({...form,minStock:e.target.value})} /></div>
              <div><label style={{fontSize:11,color:"rgba(255,255,255,0.5)",fontWeight:600,letterSpacing:1,display:"block",marginBottom:6}}>PRICE (₩)</label><input type="number" value={form.pricePerUnit} onChange={e=>setForm({...form,pricePerUnit:e.target.value})} placeholder="85000" /></div>
            </div>
            <div style={{background:"rgba(48,120,255,0.06)",border:"1px solid rgba(48,120,255,0.2)",borderRadius:10,padding:13,marginBottom:14}}>
              <div style={{fontSize:12,fontWeight:700,color:"#79c0ff",marginBottom:9}}>📦 Box/Package Settings (optional)</div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
                <div><label style={{fontSize:11,color:"rgba(255,255,255,0.5)",fontWeight:600,letterSpacing:1,display:"block",marginBottom:6}}>UNITS PER BOX</label><input type="number" value={form.perBox} onChange={e=>setForm({...form,perBox:e.target.value})} placeholder="24" /></div>
                <div><label style={{fontSize:11,color:"rgba(255,255,255,0.5)",fontWeight:600,letterSpacing:1,display:"block",marginBottom:6}}>UNIT NAME</label><input value={form.boxUnit} onChange={e=>setForm({...form,boxUnit:e.target.value})} placeholder="pcs, bottles..." /></div>
              </div>
              {preview&&<div style={{background:"rgba(48,120,255,0.08)",borderRadius:7,padding:"7px 10px",fontSize:12,color:"rgba(255,255,255,0.6)",marginTop:8}}>{preview}</div>}
            </div>
            <div style={{display:"flex",gap:10}}>
              <button onClick={()=>setShowModal(false)} style={{flex:1,padding:11,borderRadius:10,border:"1px solid rgba(255,255,255,0.1)",background:"transparent",color:"rgba(255,255,255,0.5)",cursor:"pointer"}}>Cancel</button>
              <button onClick={submit} style={{flex:2,padding:11,borderRadius:10,border:"none",background:"linear-gradient(135deg,#3078ff,#1a56db)",color:"#fff",fontWeight:700,cursor:"pointer"}}>💾 Add Product</button>
            </div>
          </div>
        </div>
      )}
      <div style={{background:"#161b22",border:"1px solid rgba(255,255,255,0.06)",borderRadius:14,overflow:"auto"}}>
        <table>
          <thead><tr><th>#</th><th>Name</th><th>QR</th><th>Category</th><th>Unit</th><th>Box/Unit</th><th>Min stock</th><th>Price</th><th>Main stock</th><th>Total units</th></tr></thead>
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
    <div style={{padding:"28px 24px"}}>
      {(title||action) && (
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",flexWrap:"wrap",gap:12,marginBottom:24}}>
          <div>
            {title&&<div style={{fontSize:22,fontWeight:800,color:"#fff",marginBottom:4}}>{title}</div>}
            {sub&&<div style={{color:"rgba(255,255,255,0.4)",fontSize:13}}>{sub}</div>}
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
  return <button onClick={onClick} style={{background:colors[color],color:"#fff",border:"none",borderRadius:11,padding:"11px 20px",cursor:"pointer",fontWeight:700,fontSize:14,fontFamily:"Inter,sans-serif",boxShadow:`0 4px 14px rgba(0,0,0,0.3)`}}>{children}</button>;
}
