"use client";
import {useEffect,useMemo,useState} from "react";
const API="/api/backend";
const P=[["6917790984547","6917790984547",1.0,1000.0,3000.0],["9415007301561","ANCHOR Butter 454g",1.0,7150.0,8900.0],["8809694500078","Chicken Sosiska",4.0,6500.0,7800.0],["4870200194085","DIZZI ENERGY [330ml]",1.0,3800.0,3000.0],["4630007401362","Djin Velikan Sol 200gr",1.0,3800.0,5000.0],["200043","DUMBA YOG`I",1.0,15470.0,15470.0],["8809961840609","FF Dushes",1.0,2700.0,3500.0],["4780044573291","Flavis Juice",1.0,1800.0,2500.0],["5902854107438","GARILLA 500ml",1.0,2200.0,2900.0],["8801065001009","Ketchup Heinz 460g",1.0,2200.0,3500.0],["8809694500054","Krakov",1.0,8500.0,9900.0],["8809655760145","LF Salyami",1.0,7500.0,9900.0],["4604248036331","MAXEEV Maynez[380g]",1.0,4500.0,5500.0],["200006","MOL BIQIN",2.0,24955.0,24955.0],["200005","MOL OLDI SON",2.0,27815.0,27815.0],["200003","MOL ORQA SON 1",3.0,38316.67,38316.67],["200004","MOL ORQA SON 2",2.0,24110.0,24110.0],["200014","MOL QIYMA",1.0,19860.0,19860.0],["200007","MOL QOVURG`A 1",3.0,24503.33,24503.33],["8809694500207","mol sasiskaa",1.0,7500.0,8000.0],["4602358005667","morojni",2.0,1800.0,2700.0],["4600068058010","MOXITO LAMY",4.0,1700.0,2300.0],["200044","OKORACHKA",1.0,6630.0,6630.0],["4780021591997","Pereprava",1.0,2000.0,2800.0],["200022","QOY BO`YIN",2.0,9660.0,9660.0],["200020","QOY KATTA QOVURGA",4.0,28120.0,28120.0],["200029","QOY MUSHAK",1.0,21110.0,21110.0],["8809840940369","R.F Qaymoq[250g]",1.0,3500.0,5000.0],["8809840940062","R.F Tvorog [400g]",1.0,7000.0,9900.0],["4780072660185","Saber Anor 0.45ml",1.0,1800.0,2500.0],["8809202561409","SABER RAMEN",5.0,1000.0,1200.0],["8680419595001","SAFO PASTA 650g",1.0,3200.0,5500.0],["8801122002413","SMETANA 1L",2.0,11000.0,11500.0],["4640001890031","Soda",1.0,2500.0,5900.0],["8681771363963","sunela 5L",1.0,14500.0,16300.0],["4605246012518","Tess tea",1.0,5000.0,7100.0],["4607016240398","Uvelka Mannaya 700g",1.0,3300.0,4500.0],["200051","UZB MAHSULOT",1.0,30000.0,30000.0],["200052","UZB MAHSULOT",2.0,1500.0,1500.0],["200053","UZB MAHSULOT",4.0,7140.0,7140.0],["200058","UZB MAHSULOT",3.0,4500.0,4500.0],["200089","UZB MAHSULOT",1.0,20000.0,20000.0],["8809506350044","XANYANG FOOD",2.0,10000.0,15900.0]];
const unwrap=(d:any)=>d?.data?.results??d?.data?.items??d?.data?.products??d?.data?.companies??d?.results??d?.items??d?.products??d?.companies??d?.data??d;
const msg=(d:any)=>d?.message||d?.detail||d?.errors?.detail||Object.values(d?.errors||{}).flat().join("; ")||"API xatosi";
const codeOf=(p:any)=>String(p?.qrCode??p?.qr_code??p?.barcode??p?.bar_code??"").trim();
const idOf=(p:any)=>String(p?.external_id??p?.externalId??p?.id??p?.product_id??p?.productId??"").trim();
export default function AdminSeedPage(){
 const [s,setS]=useState("Tekshirilmoqda...");
 const [ok,setOk]=useState(false); const [load,setLoad]=useState(false); const [done,setDone]=useState(false);
 const qty=useMemo(()=>P.reduce((a:any,x:any)=>a+Number(x[2]||0),0),[]);
 async function api(path:string,opt:RequestInit={}){
  const t=localStorage.getItem("crm-access-token"); if(!t) throw new Error("Avval CRMga bosh admin sifatida kiring");
  const h=new Headers(opt.headers); h.set("authorization",`Bearer ${t}`); if(opt.body&&!h.has("content-type"))h.set("content-type","application/json");
  const r=await fetch(`${API}${path}`,{...opt,headers:h,cache:"no-store"}); const ct=r.headers.get("content-type")||""; const d=ct.includes("json")?await r.json():{message:await r.text()};
  if(!r.ok||d?.success===false) throw new Error(msg(d)||`API xatosi (${r.status})`); return d;
 }
 async function loadProducts(){const arr=unwrap(await api("/products/?page_size=1000")); return Array.isArray(arr)?arr:[]}
 useEffect(()=>{api("/auth/me/").then(d=>{const u=unwrap(d)?.user??unwrap(d); const role=String(u?.role??u?.accountRole??"").toLowerCase(); if(!["superadmin","super_admin","ceo"].includes(role)){setS("Bu sahifa faqat bosh admin uchun");return} setOk(true); setS("Tayyor. Tugmani bosing.")}).catch(e=>setS(e.message))},[]);
 async function run(){
  if(!ok||load||done)return; setLoad(true);
  try{
   setS("Firma olinmoqda..."); const comps=unwrap(await api("/companies/?page_size=1000")); if(!Array.isArray(comps)||!comps.length) throw new Error("CRMda firma yo'q. Avval kamida 1 ta firma qo'shing.");
   const c=comps[0]; const companyId=String(c.id??c.external_id??c.externalId??""); if(!companyId) throw new Error("Firma ID topilmadi");
   setS("Productlar tekshirilmoqda..."); let products=await loadProducts(); const by=new Map<string,any>();
   if(!products.length) throw new Error("Avval bosh admin panelda kamida 1 ta oddiy product yarating, shunda mavjud kategoriya olinadi.");
   for(const p of products){const b=codeOf(p); if(b)by.set(b,p)}
   const sample=products.find((p:any)=>p?.category||p?.categoryName||p?.category_name)??products[0];
   const category=String(sample?.category??sample?.categoryName??sample?.category_name??"").trim();
   if(!category) throw new Error("Mavjud productdan kategoriya topilmadi. Avval kategoriya bor product yarating.");
   let created=0, exists=0; const items:any[]=[];
   for(let i=0;i<P.length;i++){
    const [barcode,name,quantity,price,sale]=P[i] as any[]; const b=String(barcode); setS(`${i+1}/${P.length}: ${name}`); let product=by.get(b);
    if(!product){
     const ext=`excel_${b}`;
     const payload={id:ext,external_id:ext,name,category,category_name:category,categoryName:category,unit:"dona",minStock:0,min_stock:0,pricePerUnit:Number(sale||price||0),price_per_unit:Number(sale||price||0),perBox:1,per_box:1,boxUnit:"dona",box_unit:"dona",qrCode:b,qr_code:b,barcode:b,supplierId:companyId,supplier_id:companyId};
     const createdResp=unwrap(await api("/products/",{method:"POST",body:JSON.stringify(payload)}));
     product=createdResp;
     let productId=idOf(product);
     if(!productId){
      products=await loadProducts();
      const found=products.find((p:any)=>codeOf(p)===b||String(p?.name??"")===String(name));
      if(found) product=found;
     }
     by.set(b,product); created++;
    }else exists++;
    const productId=idOf(product); if(!productId) throw new Error(`${name} (${b}) ID topilmadi. Product yaratildi bo'lishi mumkin, sahifani refresh qilib qayta bosing.`);
    items.push({productId,product_id:productId,quantity:Number(quantity||1),pricePerUnit:Number(price||sale||0),price_per_unit:Number(price||sale||0)});
   }
   setS("Skladga kirim qilinmoqda..."); await api("/orders/",{method:"POST",body:JSON.stringify({companyId,company_id:companyId,items,note:"Excel test kirim 2026-05-30",payStatus:"unpaid",pay_status:"unpaid",paidAmount:0,paid_amount:0,orderDate:"2026-05-30",order_date:"2026-05-30"})});
   setDone(true); setS(`Tayyor ✅ Firma: ${c.name||companyId}. Kategoriya: ${category}. Yangi: ${created}, oldindan bor: ${exists}, kirim: ${items.length} qator.`);
  }catch(e:any){setS(e?.message||"Xato")}finally{setLoad(false)}
 }
 return <main style={{minHeight:"100vh",background:"#05070b",color:"#fff",padding:20,fontFamily:"system-ui"}}><section style={{maxWidth:720,margin:"0 auto",border:"1px solid #334155",borderRadius:24,padding:20,background:"#0f172a"}}><h1>Excel mahsulotlarini skladga kiritish</h1><p>Fayldagi <b>{P.length}</b> ta shtrix-kodli product, jami <b>{qty}</b> miqdor. Faqat bosh admin ishlata oladi.</p><div style={{padding:14,borderRadius:14,background:"#020617",margin:"16px 0",whiteSpace:"pre-wrap",color:done?"#86efac":"#e2e8f0"}}>{s}</div><button onClick={run} disabled={!ok||load||done} style={{width:"100%",padding:16,border:0,borderRadius:16,fontWeight:900,background:!ok||load||done?"#64748b":"#22c55e",color:"#020617"}}>{load?"Kiritilmoqda...":done?"Kiritildi ✅":"Mahsulotlarni skladga kiritish"}</button><p style={{color:"#94a3b8",fontSize:13}}>Bir marta bosing. Keyin Analysis bo'limida Excel uploadni test qiling.</p></section></main>;
}
