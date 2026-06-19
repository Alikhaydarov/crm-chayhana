/*
One-time seed script for CRM Excel upload test.
Run this ONLY while logged in as superadmin/bosh admin in the CRM browser console.

What it does:
1) Reads existing companies and picks the first company.
2) Reads existing products.
3) Creates only missing products by barcode.
4) Creates one company order so the products enter main stock.
*/
(async () => {
  const API_BASE = "/api/backend";
  const ACCESS_TOKEN_KEY = "crm-access-token";
  const token = localStorage.getItem(ACCESS_TOKEN_KEY);

  if (!token) {
    throw new Error("CRM access token topilmadi. Avval CRMga bosh admin sifatida kiring.");
  }

  const EXCEL_PRODUCTS = [
  {
    "barcode": "6917790984547",
    "name": "6917790984547",
    "supplier": "우즈백킴긴급등록",
    "quantity": 1.0,
    "pricePerUnit": 1000.0,
    "salePrice": 3000.0,
    "costTotal": 1000.0,
    "salesTotal": 3000.0
  },
  {
    "barcode": "9415007301561",
    "name": "ANCHOR Butter 454g",
    "supplier": "COUPANG 쿠팡",
    "quantity": 1.0,
    "pricePerUnit": 7150.0,
    "salePrice": 8900.0,
    "costTotal": 7150.0,
    "salesTotal": 8900.0
  },
  {
    "barcode": "8809694500078",
    "name": "Chicken Sosiska",
    "supplier": "HALOL BARAKA",
    "quantity": 4.0,
    "pricePerUnit": 6500.0,
    "salePrice": 7800.0,
    "costTotal": 26000.0,
    "salesTotal": 31200.0
  },
  {
    "barcode": "4870200194085",
    "name": "DIZZI ENERGY [330ml]",
    "supplier": "우즈백킴",
    "quantity": 1.0,
    "pricePerUnit": 3800.0,
    "salePrice": 3000.0,
    "costTotal": 3800.0,
    "salesTotal": 3000.0
  },
  {
    "barcode": "4630007401362",
    "name": "Djin Velikan Sol 200gr",
    "supplier": "GLOBAL SERVICE",
    "quantity": 1.0,
    "pricePerUnit": 3800.0,
    "salePrice": 5000.0,
    "costTotal": 3800.0,
    "salesTotal": 5000.0
  },
  {
    "barcode": "200043",
    "name": "DUMBA YOG`I",
    "supplier": "우즈백킴",
    "quantity": 1.0,
    "pricePerUnit": 15470.0,
    "salePrice": 15470.0,
    "costTotal": 15470.0,
    "salesTotal": 15470.0
  },
  {
    "barcode": "8809961840609",
    "name": "FF Dushes",
    "supplier": "FAMILY FOOD",
    "quantity": 1.0,
    "pricePerUnit": 2700.0,
    "salePrice": 3500.0,
    "costTotal": 2700.0,
    "salesTotal": 3500.0
  },
  {
    "barcode": "4780044573291",
    "name": "Flavis Juice",
    "supplier": "우즈백킴",
    "quantity": 1.0,
    "pricePerUnit": 1800.0,
    "salePrice": 2500.0,
    "costTotal": 1800.0,
    "salesTotal": 2500.0
  },
  {
    "barcode": "5902854107438",
    "name": "GARILLA 500ml",
    "supplier": "MASTERS CO",
    "quantity": 1.0,
    "pricePerUnit": 2200.0,
    "salePrice": 2900.0,
    "costTotal": 2200.0,
    "salesTotal": 2900.0
  },
  {
    "barcode": "8801065001009",
    "name": "Ketchup Heinz 460g",
    "supplier": "COSTCO",
    "quantity": 1.0,
    "pricePerUnit": 2200.0,
    "salePrice": 3500.0,
    "costTotal": 2200.0,
    "salesTotal": 3500.0
  },
  {
    "barcode": "8809694500054",
    "name": "Krakov",
    "supplier": "HALOL BARAKA",
    "quantity": 1.0,
    "pricePerUnit": 8500.0,
    "salePrice": 9900.0,
    "costTotal": 8500.0,
    "salesTotal": 9900.0
  },
  {
    "barcode": "8809655760145",
    "name": "LF Salyami",
    "supplier": "LAZZAT FOOD",
    "quantity": 1.0,
    "pricePerUnit": 7500.0,
    "salePrice": 9900.0,
    "costTotal": 7500.0,
    "salesTotal": 9900.0
  },
  {
    "barcode": "4604248036331",
    "name": "MAXEEV Maynez[380g]",
    "supplier": "우즈백킴",
    "quantity": 1.0,
    "pricePerUnit": 4500.0,
    "salePrice": 5500.0,
    "costTotal": 4500.0,
    "salesTotal": 5500.0
  },
  {
    "barcode": "200006",
    "name": "MOL BIQIN",
    "supplier": "우즈백킴",
    "quantity": 2.0,
    "pricePerUnit": 24955.0,
    "salePrice": 24955.0,
    "costTotal": 49910.0,
    "salesTotal": 49910.0
  },
  {
    "barcode": "200005",
    "name": "MOL OLDI SON",
    "supplier": "우즈백킴",
    "quantity": 2.0,
    "pricePerUnit": 27815.0,
    "salePrice": 27815.0,
    "costTotal": 55630.0,
    "salesTotal": 55630.0
  },
  {
    "barcode": "200003",
    "name": "MOL ORQA SON 1",
    "supplier": "우즈백킴",
    "quantity": 3.0,
    "pricePerUnit": 38316.67,
    "salePrice": 38317.0,
    "costTotal": 114950.0,
    "salesTotal": 114950.0
  },
  {
    "barcode": "200004",
    "name": "MOL ORQA SON 2",
    "supplier": "우즈백킴",
    "quantity": 2.0,
    "pricePerUnit": 24110.0,
    "salePrice": 24110.0,
    "costTotal": 48220.0,
    "salesTotal": 48220.0
  },
  {
    "barcode": "200014",
    "name": "MOL QIYMA",
    "supplier": "우즈백킴",
    "quantity": 1.0,
    "pricePerUnit": 19860.0,
    "salePrice": 19860.0,
    "costTotal": 19860.0,
    "salesTotal": 19860.0
  },
  {
    "barcode": "200007",
    "name": "MOL QOVURG`A 1",
    "supplier": "우즈백킴",
    "quantity": 3.0,
    "pricePerUnit": 24503.33,
    "salePrice": 24503.0,
    "costTotal": 73510.0,
    "salesTotal": 73510.0
  },
  {
    "barcode": "8809694500207",
    "name": "mol sasiskaa",
    "supplier": "우즈백킴",
    "quantity": 1.0,
    "pricePerUnit": 7500.0,
    "salePrice": 8000.0,
    "costTotal": 7500.0,
    "salesTotal": 8000.0
  },
  {
    "barcode": "4602358005667",
    "name": "morojni",
    "supplier": "KORETA DISTRIBUTION",
    "quantity": 2.0,
    "pricePerUnit": 1800.0,
    "salePrice": 2700.0,
    "costTotal": 3600.0,
    "salesTotal": 5400.0
  },
  {
    "barcode": "4600068058010",
    "name": "MOXITO LAMY",
    "supplier": "우즈백킴",
    "quantity": 4.0,
    "pricePerUnit": 1700.0,
    "salePrice": 2300.0,
    "costTotal": 6800.0,
    "salesTotal": 9200.0
  },
  {
    "barcode": "200044",
    "name": "OKORACHKA",
    "supplier": "우즈백킴",
    "quantity": 1.0,
    "pricePerUnit": 6630.0,
    "salePrice": 6630.0,
    "costTotal": 6630.0,
    "salesTotal": 6630.0
  },
  {
    "barcode": "4780021591997",
    "name": "Pereprava",
    "supplier": "GLOBAL SERVICE",
    "quantity": 1.0,
    "pricePerUnit": 2000.0,
    "salePrice": 2800.0,
    "costTotal": 2000.0,
    "salesTotal": 2800.0
  },
  {
    "barcode": "200022",
    "name": "QOY BO`YIN",
    "supplier": "우즈백킴",
    "quantity": 2.0,
    "pricePerUnit": 9660.0,
    "salePrice": 9660.0,
    "costTotal": 19320.0,
    "salesTotal": 19320.0
  },
  {
    "barcode": "200020",
    "name": "QOY KATTA QOVURGA",
    "supplier": "우즈백킴",
    "quantity": 4.0,
    "pricePerUnit": 28120.0,
    "salePrice": 28120.0,
    "costTotal": 112480.0,
    "salesTotal": 112480.0
  },
  {
    "barcode": "200029",
    "name": "QOY MUSHAK",
    "supplier": "우즈백킴",
    "quantity": 1.0,
    "pricePerUnit": 21110.0,
    "salePrice": 21110.0,
    "costTotal": 21110.0,
    "salesTotal": 21110.0
  },
  {
    "barcode": "8809840940369",
    "name": "R.F Qaymoq[250g]",
    "supplier": "우즈백킴",
    "quantity": 1.0,
    "pricePerUnit": 3500.0,
    "salePrice": 5000.0,
    "costTotal": 3500.0,
    "salesTotal": 5000.0
  },
  {
    "barcode": "8809840940062",
    "name": "R.F Tvorog [400g]",
    "supplier": "ROYAL FOOD (KOREA FOOD)",
    "quantity": 1.0,
    "pricePerUnit": 7000.0,
    "salePrice": 9900.0,
    "costTotal": 7000.0,
    "salesTotal": 9900.0
  },
  {
    "barcode": "4780072660185",
    "name": "Saber Anor 0.45ml",
    "supplier": "우즈백킴",
    "quantity": 1.0,
    "pricePerUnit": 1800.0,
    "salePrice": 2500.0,
    "costTotal": 1800.0,
    "salesTotal": 2500.0
  },
  {
    "barcode": "8809202561409",
    "name": "SABER RAMEN",
    "supplier": "우즈백킴긴급등록",
    "quantity": 5.0,
    "pricePerUnit": 1000.0,
    "salePrice": 1200.0,
    "costTotal": 5000.0,
    "salesTotal": 6000.0
  },
  {
    "barcode": "8680419595001",
    "name": "SAFO PASTA 650g",
    "supplier": "GLOBAL SERVICE",
    "quantity": 1.0,
    "pricePerUnit": 3200.0,
    "salePrice": 5500.0,
    "costTotal": 3200.0,
    "salesTotal": 5500.0
  },
  {
    "barcode": "8801122002413",
    "name": "SMETANA 1L",
    "supplier": "우즈백킴",
    "quantity": 2.0,
    "pricePerUnit": 11000.0,
    "salePrice": 11500.0,
    "costTotal": 22000.0,
    "salesTotal": 23000.0
  },
  {
    "barcode": "4640001890031",
    "name": "Soda",
    "supplier": "IMPERIA",
    "quantity": 1.0,
    "pricePerUnit": 2500.0,
    "salePrice": 5900.0,
    "costTotal": 2500.0,
    "salesTotal": 5900.0
  },
  {
    "barcode": "8681771363963",
    "name": "sunela 5L",
    "supplier": "우즈백킴긴급등록",
    "quantity": 1.0,
    "pricePerUnit": 14500.0,
    "salePrice": 16300.0,
    "costTotal": 14500.0,
    "salesTotal": 16300.0
  },
  {
    "barcode": "4605246012518",
    "name": "Tess tea",
    "supplier": "우즈백킴",
    "quantity": 1.0,
    "pricePerUnit": 5000.0,
    "salePrice": 7100.0,
    "costTotal": 5000.0,
    "salesTotal": 7100.0
  },
  {
    "barcode": "4607016240398",
    "name": "Uvelka Mannaya 700g",
    "supplier": "GLOBAL SERVICE",
    "quantity": 1.0,
    "pricePerUnit": 3300.0,
    "salePrice": 4500.0,
    "costTotal": 3300.0,
    "salesTotal": 4500.0
  },
  {
    "barcode": "200051",
    "name": "UZB MAHSULOT",
    "supplier": "우즈백킴",
    "quantity": 1.0,
    "pricePerUnit": 30000.0,
    "salePrice": 30000.0,
    "costTotal": 30000.0,
    "salesTotal": 30000.0
  },
  {
    "barcode": "200052",
    "name": "UZB MAHSULOT",
    "supplier": "우즈백킴",
    "quantity": 2.0,
    "pricePerUnit": 1500.0,
    "salePrice": 1500.0,
    "costTotal": 3000.0,
    "salesTotal": 3000.0
  },
  {
    "barcode": "200053",
    "name": "UZB MAHSULOT",
    "supplier": "우즈백킴",
    "quantity": 4.0,
    "pricePerUnit": 7140.0,
    "salePrice": 7140.0,
    "costTotal": 28560.0,
    "salesTotal": 28560.0
  },
  {
    "barcode": "200058",
    "name": "UZB MAHSULOT",
    "supplier": "우즈백킴",
    "quantity": 3.0,
    "pricePerUnit": 4500.0,
    "salePrice": 4500.0,
    "costTotal": 13500.0,
    "salesTotal": 13500.0
  },
  {
    "barcode": "200089",
    "name": "UZB MAHSULOT",
    "supplier": "우즈백킴",
    "quantity": 1.0,
    "pricePerUnit": 20000.0,
    "salePrice": 20000.0,
    "costTotal": 20000.0,
    "salesTotal": 20000.0
  },
  {
    "barcode": "8809506350044",
    "name": "XANYANG FOOD",
    "supplier": "우즈백킴",
    "quantity": 2.0,
    "pricePerUnit": 10000.0,
    "salePrice": 15900.0,
    "costTotal": 20000.0,
    "salesTotal": 31800.0
  }
];

  function unwrap(data) {
    return data?.data?.results ??
      data?.data?.items ??
      data?.data?.products ??
      data?.data?.companies ??
      data?.results ??
      data?.items ??
      data?.products ??
      data?.companies ??
      data?.data ??
      data;
  }

  async function api(path, options = {}) {
    const headers = new Headers(options.headers || {});
    headers.set("authorization", `Bearer ${token}`);
    if (options.body && !(options.body instanceof FormData) && !headers.has("content-type")) {
      headers.set("content-type", "application/json");
    }

    const res = await fetch(`${API_BASE}${path}`, {
      ...options,
      headers,
      cache: "no-store",
    });

    const contentType = res.headers.get("content-type") || "";
    const data = contentType.includes("application/json") ? await res.json() : { message: await res.text() };

    if (!res.ok || data?.success === false) {
      throw new Error(data?.message || data?.detail || data?.errors?.detail || `API xatosi: ${res.status} ${path}`);
    }
    return data;
  }

  const companies = unwrap(await api("/companies/?page_size=1000"));
  if (!Array.isArray(companies) || companies.length === 0) {
    throw new Error("CRMda mavjud firma topilmadi. Avval bosh admin panelda kamida 1 ta firma qo'shing.");
  }

  const company = companies[0];
  const companyId = String(company.id ?? company.external_id ?? company.externalId ?? "");
  if (!companyId) throw new Error("Tanlangan firmada ID yo'q.");

  const products = unwrap(await api("/products/?page_size=1000"));
  const productByBarcode = new Map();
  if (Array.isArray(products)) {
    for (const p of products) {
      const code = String(p.qrCode ?? p.qr_code ?? "").trim();
      if (code) productByBarcode.set(code, p);
    }
  }

  const created = [];
  const alreadyExists = [];
  const orderItems = [];

  for (let i = 0; i < EXCEL_PRODUCTS.length; i++) {
    const row = EXCEL_PRODUCTS[i];
    const barcode = String(row.barcode || "").trim();
    let product = productByBarcode.get(barcode);

    if (!product) {
      const payload = {
        id: `excel_${Date.now()}_${i}`,
        name: row.name,
        category: "excel-import",
        categoryName: "excel-import",
        unit: "dona",
        minStock: 0,
        pricePerUnit: Number(row.salePrice || row.pricePerUnit || 0),
        perBox: 0,
        boxUnit: "",
        qrCode: barcode,
        supplierId: companyId,
      };

      const productRes = await api("/products/", {
        method: "POST",
        body: JSON.stringify(payload),
      });

      product = unwrap(productRes);
      created.push({
        barcode,
        name: row.name,
        productId: product?.external_id ?? product?.externalId ?? product?.id,
      });
      productByBarcode.set(barcode, product);
    } else {
      alreadyExists.push({ barcode, name: row.name, productId: product.id ?? product.external_id ?? product.externalId });
    }

    const productId = String(product?.external_id ?? product?.externalId ?? product?.id ?? "");
    if (!productId) throw new Error(`${row.name} uchun productId topilmadi.`);

    orderItems.push({
      productId,
      quantity: Number(row.quantity || 1),
      pricePerUnit: Number(row.pricePerUnit || row.salePrice || 0),
    });
  }

  const orderPayload = {
    companyId,
    items: orderItems,
    note: "Excel test kirim: 매출이익현황구_분류_거래처_상품매출_2026_05_30_14_01.xlsx",
    payStatus: "unpaid",
    paidAmount: 0,
    orderDate: "2026-05-30",
  };

  const order = await api("/orders/", {
    method: "POST",
    body: JSON.stringify(orderPayload),
  });

  console.log("✅ Excel mahsulotlari skladga kirim qilindi.");
  console.log("Firma:", company.name || companyId);
  console.log("Yaratilgan yangi mahsulotlar:", created.length);
  console.table(created);
  console.log("Oldindan bor mahsulotlar:", alreadyExists.length);
  console.table(alreadyExists);
  console.log("Order:", unwrap(order));
  alert(`✅ Tayyor. ${created.length} ta yangi product yaratildi, ${orderItems.length} ta product skladga kirim qilindi. Endi Excel uploadni tekshirishingiz mumkin.`);
})().catch((error) => {
  console.error("❌ Seed script xatosi:", error);
  alert(`❌ Xato: ${error.message}`);
});
