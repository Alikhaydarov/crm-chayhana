export type Role = "superadmin" | "restaurant1" | "restaurant2" | "shop";
export type PayStatus = "paid" | "unpaid" | "partial";
export type TransferStatus = "pending" | "approved" | "rejected";

export type Company = {
  id: string;
  name: string;
  address: string;
  phone: string;
  createdAt: string;
};

export type CompanyPayment = {
  id: string;
  companyId: string;
  orderId: string;
  amount: number;
  note: string;
  createdAt: string;
};

export type OrderItem = {
  productId: string;
  productName: string;
  quantity: number;
  unit: string;
  pricePerUnit: number;
};

export type Order = {
  id: string;
  companyId: string;
  companyName: string;
  items: OrderItem[];
  totalPrice: number;
  paidAmount: number;
  payStatus: PayStatus;
  note: string;
  createdAt: string;
};

export type UserInfo = {
  id: string;
  name: string;
  role: Role;
  branchName: string;
  branchIcon: string;
};

type User = UserInfo & { password: string };

export type Product = {
  id: string;
  name: string;
  category: string;
  unit: string;
  minStock: number;
  pricePerUnit: number;
  perBox: number;
  boxUnit: string;
  qrCode?: string;
};

export type StockMap = Record<string, number>;

export type Transfer = {
  id: string;
  toBranch: string;
  items: any[];
  totalValue: number;
  requestedBy: string;
  approvedBy?: string;
  status: TransferStatus;
  note?: string;
  createdAt: string;
  updatedAt: string;
};

export type Supplier = {
  id: string;
  firm: string;
  docNumber: string;
  deliveryDate: string;
  note: string;
  items: any[];
  totalPrice: number;
  payStatus: PayStatus;
  paidAmount: number;
  createdAt: string;
};

export type Staff = {
  id: string;
  name: string;
  role: string;
  branch: string;
  phone: string;
  salary: number;
  joinDate: string;
  active: boolean;
};

type CRMState = {
  products: Product[];
  mainStock: StockMap;
  branchStock: Record<string, StockMap>;
  transfers: Transfer[];
  suppliers: Supplier[];
  staff: Staff[];
  companies: Company[];
  orders: Order[];
  companyPayments: CompanyPayment[];
};

const STORAGE_KEY = "oshxona-crm-local-storage-v1";

export const USERS: User[] = [
  { id: "super", name: "Bosh Admin", role: "superadmin", password: "super123", branchName: "Bosh Sklad", branchIcon: "M" },
  { id: "rest1", name: "Oshxona-1 Admin", role: "restaurant1", password: "rest1", branchName: "Oshxona-1", branchIcon: "R1" },
  { id: "rest2", name: "Oshxona-2 Admin", role: "restaurant2", password: "rest2", branchName: "Oshxona-2", branchIcon: "R2" },
  { id: "shop1", name: "Do'kon Admin", role: "shop", password: "shop1", branchName: "Do'kon", branchIcon: "S" },
];

function initialProducts(): Product[] {
  return [
    { id: "p1", name: "Mol go'shti", category: "gosht", unit: "kg", minStock: 20, pricePerUnit: 85000, perBox: 0, boxUnit: "", qrCode: "QR-P001" },
    { id: "p2", name: "Tovuq go'shti", category: "gosht", unit: "kg", minStock: 30, pricePerUnit: 32000, perBox: 0, boxUnit: "", qrCode: "QR-P002" },
    { id: "p3", name: "Qo'y go'shti", category: "gosht", unit: "kg", minStock: 15, pricePerUnit: 95000, perBox: 0, boxUnit: "", qrCode: "QR-P003" },
    { id: "p4", name: "Baliq", category: "gosht", unit: "kg", minStock: 10, pricePerUnit: 45000, perBox: 0, boxUnit: "", qrCode: "QR-P004" },
    { id: "p5", name: "Piyoz", category: "sabzavot", unit: "kg", minStock: 50, pricePerUnit: 3000, perBox: 0, boxUnit: "", qrCode: "QR-P005" },
    { id: "p6", name: "Sabzi", category: "sabzavot", unit: "kg", minStock: 40, pricePerUnit: 4000, perBox: 0, boxUnit: "", qrCode: "QR-P006" },
    { id: "p7", name: "Kartoshka", category: "sabzavot", unit: "kg", minStock: 60, pricePerUnit: 3500, perBox: 0, boxUnit: "", qrCode: "QR-P007" },
    { id: "p8", name: "Pomidor", category: "sabzavot", unit: "kg", minStock: 30, pricePerUnit: 8000, perBox: 0, boxUnit: "", qrCode: "QR-P008" },
    { id: "p9", name: "Bodring", category: "sabzavot", unit: "kg", minStock: 20, pricePerUnit: 6000, perBox: 0, boxUnit: "", qrCode: "QR-P009" },
    { id: "p10", name: "Karam", category: "sabzavot", unit: "kg", minStock: 25, pricePerUnit: 2500, perBox: 0, boxUnit: "", qrCode: "QR-P010" },
    { id: "p11", name: "Guruch", category: "don", unit: "kg", minStock: 100, pricePerUnit: 12000, perBox: 0, boxUnit: "", qrCode: "QR-P011" },
    { id: "p12", name: "Un (bug'doy)", category: "don", unit: "qop", minStock: 20, pricePerUnit: 95000, perBox: 0, boxUnit: "", qrCode: "QR-P012" },
    { id: "p13", name: "Makaron", category: "don", unit: "kg", minStock: 30, pricePerUnit: 8000, perBox: 0, boxUnit: "", qrCode: "QR-P013" },
    { id: "p14", name: "Yog' (o'simlik)", category: "don", unit: "l", minStock: 20, pricePerUnit: 18000, perBox: 0, boxUnit: "", qrCode: "QR-P014" },
    { id: "p15", name: "Sut", category: "sut", unit: "l", minStock: 30, pricePerUnit: 8000, perBox: 0, boxUnit: "", qrCode: "QR-P015" },
    { id: "p16", name: "Qatiq", category: "sut", unit: "kg", minStock: 20, pricePerUnit: 10000, perBox: 0, boxUnit: "", qrCode: "QR-P016" },
    { id: "p17", name: "Tuxum", category: "sut", unit: "dona", minStock: 100, pricePerUnit: 1500, perBox: 30, boxUnit: "dona", qrCode: "QR-P017" },
    { id: "p18", name: "Sariyog'", category: "sut", unit: "kg", minStock: 10, pricePerUnit: 55000, perBox: 0, boxUnit: "", qrCode: "QR-P018" },
    { id: "p19", name: "Olma", category: "meva", unit: "kg", minStock: 20, pricePerUnit: 9000, perBox: 0, boxUnit: "", qrCode: "QR-P019" },
    { id: "p20", name: "Banan", category: "meva", unit: "kg", minStock: 15, pricePerUnit: 12000, perBox: 0, boxUnit: "", qrCode: "QR-P020" },
    { id: "p21", name: "Tuz", category: "ziravorlar", unit: "kg", minStock: 10, pricePerUnit: 2000, perBox: 0, boxUnit: "", qrCode: "QR-P021" },
    { id: "p22", name: "Qalampir", category: "ziravorlar", unit: "kg", minStock: 5, pricePerUnit: 25000, perBox: 0, boxUnit: "", qrCode: "QR-P022" },
    { id: "p23", name: "Zira", category: "ziravorlar", unit: "kg", minStock: 5, pricePerUnit: 35000, perBox: 0, boxUnit: "", qrCode: "QR-P023" },
    { id: "p24", name: "Shakar", category: "don", unit: "kg", minStock: 30, pricePerUnit: 9000, perBox: 0, boxUnit: "", qrCode: "QR-P024" },
    { id: "p25", name: "Choy (qora)", category: "boshqa", unit: "quti", minStock: 10, pricePerUnit: 28000, perBox: 24, boxUnit: "paket", qrCode: "QR-P025" },
    { id: "p26", name: "Snickers", category: "boshqa", unit: "quti", minStock: 5, pricePerUnit: 180000, perBox: 24, boxUnit: "dona", qrCode: "QR-P026" },
    { id: "p27", name: "KitKat", category: "boshqa", unit: "quti", minStock: 5, pricePerUnit: 150000, perBox: 24, boxUnit: "dona", qrCode: "QR-P027" },
    { id: "p28", name: "Coca-Cola 0.5L", category: "boshqa", unit: "quti", minStock: 10, pricePerUnit: 120000, perBox: 24, boxUnit: "shisha", qrCode: "QR-P028" },
  ];
}

function createStock(products: Product[], start: number): StockMap {
  const stock: StockMap = {};
  products.forEach((product, index) => {
    stock[product.id] = start + index * 3;
  });
  return stock;
}

function itemFromProduct(product: Product, quantity: number, pricePerUnit = product.pricePerUnit) {
  return {
    productId: product.id,
    productName: product.name,
    quantity,
    unit: product.unit,
    perBox: product.perBox,
    boxUnit: product.boxUnit,
    pricePerUnit,
    qrCode: product.qrCode || "",
  };
}

function createInitialState(): CRMState {
  const products = initialProducts();
  const snickers = products.find(p => p.id === "p26")!;
  const kitkat = products.find(p => p.id === "p27")!;
  const cola = products.find(p => p.id === "p28")!;
  const piyoz = products.find(p => p.id === "p5")!;
  const sabzi = products.find(p => p.id === "p6")!;
  const kartoshka = products.find(p => p.id === "p7")!;

  return {
    products,
    mainStock: createStock(products, 120),
    branchStock: {
      restaurant1: createStock(products, 12),
      restaurant2: createStock(products, 10),
      shop: createStock(products, 8),
    },
    transfers: [],
    suppliers: [
      {
        id: "SUP-001",
        firm: "Mars LLC",
        docNumber: "INV-2024-001",
        deliveryDate: "2024-11-15",
        note: "Birinchi partiya",
        items: [itemFromProduct(snickers, 10), itemFromProduct(kitkat, 5)],
        totalPrice: 2550000,
        payStatus: "paid",
        paidAmount: 2550000,
        createdAt: "2024-11-15T09:00:00.000Z",
      },
      {
        id: "SUP-002",
        firm: "Coca-Cola Uzbekistan",
        docNumber: "INV-2024-088",
        deliveryDate: "2024-11-20",
        note: "Haftalik yetkazish",
        items: [itemFromProduct(cola, 20)],
        totalPrice: 2400000,
        payStatus: "partial",
        paidAmount: 1200000,
        createdAt: "2024-11-20T14:30:00.000Z",
      },
      {
        id: "SUP-003",
        firm: "Mahalliy fermer",
        docNumber: "",
        deliveryDate: "2024-11-22",
        note: "Yangi sabzavot partiyasi",
        items: [itemFromProduct(piyoz, 200), itemFromProduct(sabzi, 150), itemFromProduct(kartoshka, 300)],
        totalPrice: 2250000,
        payStatus: "unpaid",
        paidAmount: 0,
        createdAt: "2024-11-22T08:00:00.000Z",
      },
    ],
    staff: [
      { id: "st1", name: "Akbar Toshmatov", role: "Oshpaz", branch: "restaurant1", phone: "+998901234567", salary: 3500000, joinDate: "2023-01-15", active: true },
      { id: "st2", name: "Malika Yusupova", role: "Ofitsiant", branch: "restaurant1", phone: "+998901234568", salary: 2500000, joinDate: "2023-03-20", active: true },
      { id: "st3", name: "Jasur Rahimov", role: "Oshpaz", branch: "restaurant2", phone: "+998901234569", salary: 3500000, joinDate: "2022-11-10", active: true },
      { id: "st4", name: "Nilufar Karimova", role: "Kassir", branch: "restaurant2", phone: "+998901234570", salary: 2800000, joinDate: "2023-05-01", active: true },
      { id: "st5", name: "Bobur Mirzayev", role: "Sotuvchi", branch: "shop", phone: "+998901234571", salary: 2500000, joinDate: "2023-02-14", active: true },
      { id: "st6", name: "Sarvinoz Aliyeva", role: "Sklad mudiri", branch: "main", phone: "+998901234572", salary: 4000000, joinDate: "2022-08-01", active: true },
      { id: "st7", name: "Doniyor Xasanov", role: "Haydovchi", branch: "main", phone: "+998901234573", salary: 3000000, joinDate: "2023-07-20", active: true },
    ],
    companies: [
      { id: "c1", name: "Mars LLC", address: "Toshkent, Chilonzor", phone: "+998712345678", createdAt: "2024-01-01T00:00:00.000Z" },
      { id: "c2", name: "Coca-Cola Uzbekistan", address: "Toshkent, Yunusobod", phone: "+998712345679", createdAt: "2024-01-01T00:00:00.000Z" },
      { id: "c3", name: "Mahalliy fermer", address: "Toshkent viloyati", phone: "+998901234500", createdAt: "2024-01-01T00:00:00.000Z" },
    ],
    orders: [],
    companyPayments: [],
  };
}

function storageAvailable() {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

function normalizeState(value: Partial<CRMState> | null): CRMState {
  const base = createInitialState();
  if (!value) return base;

  const products = (value.products?.length ? value.products : base.products).map((product, index) => ({
    ...product,
    qrCode: product.qrCode || `QR-P${String(index + 1).padStart(3, "0")}`,
  }));

  const mainStock = { ...base.mainStock, ...(value.mainStock || {}) };
  const branchStock = {
    restaurant1: { ...base.branchStock.restaurant1, ...(value.branchStock?.restaurant1 || {}) },
    restaurant2: { ...base.branchStock.restaurant2, ...(value.branchStock?.restaurant2 || {}) },
    shop: { ...base.branchStock.shop, ...(value.branchStock?.shop || {}) },
  };

  products.forEach(product => {
    if (typeof mainStock[product.id] !== "number") mainStock[product.id] = 0;
    Object.values(branchStock).forEach(stock => {
      if (typeof stock[product.id] !== "number") stock[product.id] = 0;
    });
  });

  return {
    products,
    mainStock,
    branchStock,
    transfers: value.transfers || base.transfers,
    suppliers: value.suppliers || base.suppliers,
    staff: value.staff || base.staff,
    companies: value.companies || base.companies,
    orders: value.orders || base.orders,
    companyPayments: value.companyPayments || base.companyPayments,
  };
}

export function readCRMState(): CRMState {
  if (!storageAvailable()) return createInitialState();

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    const state = normalizeState(raw ? JSON.parse(raw) : null);
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    return state;
  } catch {
    const state = createInitialState();
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    return state;
  }
}

function writeCRMState(state: CRMState) {
  if (storageAvailable()) {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }
}

function makeId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

function publicUser(user: User): UserInfo {
  return {
    id: user.id,
    name: user.name,
    role: user.role,
    branchName: user.branchName,
    branchIcon: user.branchIcon,
  };
}

export function loginLocal(userId: string, password: string): { success: true; user: UserInfo } | { success: false; message: string } {
  const user = USERS.find(item => item.id === userId && item.password === password);
  if (!user) return { success: false, message: "Login yoki parol xato!" };
  return { success: true, user: publicUser(user) };
}

function getBranchStock(state: CRMState, branch: string): StockMap {
  if (branch === "main") return state.mainStock;
  return state.branchStock[branch] || {};
}

function stockValue(state: CRMState, stock: StockMap): number {
  return state.products.reduce((sum, product) => sum + (stock[product.id] || 0) * product.pricePerUnit, 0);
}

function lowStockItems(state: CRMState, stock: StockMap) {
  return state.products.filter(product => (stock[product.id] || 0) <= product.minStock);
}

function buildReports(state: CRMState) {
  const approved = state.transfers.filter(transfer => transfer.status === "approved");
  const branchStats = (["restaurant1", "restaurant2", "shop"] as const).map(branch => {
    const user = USERS.find(item => item.role === branch)!;
    const stock = getBranchStock(state, branch);
    const branchTransfers = approved.filter(transfer => transfer.toBranch === branch);

    return {
      branch,
      branchName: user.branchName,
      branchIcon: user.branchIcon,
      stockValue: stockValue(state, stock),
      totalReceived: branchTransfers.reduce((sum, transfer) => sum + transfer.totalValue, 0),
      approvedTransfers: branchTransfers.length,
      totalTransfers: state.transfers.filter(transfer => transfer.toBranch === branch).length,
      pendingTransfers: state.transfers.filter(transfer => transfer.toBranch === branch && transfer.status === "pending").length,
      lowStockCount: lowStockItems(state, stock).length,
      staffCount: state.staff.filter(staff => staff.branch === branch && staff.active).length,
    };
  });

  const monthlyStats = Array.from({ length: 6 }, (_, index) => {
    const date = new Date();
    date.setMonth(date.getMonth() - index);
    const key = date.toISOString().slice(0, 7);
    const monthTransfers = approved.filter(transfer => transfer.createdAt.startsWith(key));

    return {
      month: date.toLocaleDateString("uz-UZ", { month: "short", year: "numeric" }),
      value: monthTransfers.reduce((sum, transfer) => sum + transfer.totalValue, 0),
      count: monthTransfers.length,
    };
  }).reverse();

  return {
    mainStockValue: stockValue(state, state.mainStock),
    totalProducts: state.products.length,
    totalStaff: state.staff.filter(staff => staff.active).length,
    totalTransfers: state.transfers.length,
    pendingTransfers: state.transfers.filter(transfer => transfer.status === "pending").length,
    mainLowStock: lowStockItems(state, state.mainStock).length,
    totalDebt: state.suppliers.reduce((sum, supplier) => sum + (supplier.totalPrice - supplier.paidAmount), 0),
    branchStats,
    monthlyStats,
    recentTransfers: state.transfers.slice(0, 10),
  };
}

export function getLocalSnapshot(user: UserInfo) {
  const state = readCRMState();
  const branch = user.role === "superadmin" ? "main" : user.role;
  const staff = user.role === "superadmin"
    ? state.staff
    : state.staff.filter(item => item.branch === user.role || item.branch === "main");
  const transfers = user.role === "superadmin"
    ? state.transfers
    : state.transfers.filter(item => item.toBranch === user.role);

  return {
    products: state.products,
    stock: getBranchStock(state, branch),
    transfers,
    suppliers: state.suppliers,
    staff,
    reports: buildReports(state),
    companies: state.companies,
    orders: state.orders,
    companyPayments: state.companyPayments,
  };
}

export function updateStockLocal(productId: string, quantity: number) {
  const state = readCRMState();
  if (!(productId in state.mainStock)) return { success: false };
  state.mainStock[productId] = quantity;
  writeCRMState(state);
  return { success: true };
}

export function createTransferLocal(toBranch: string, items: { productId: string; quantity: number }[], requestedBy: string, note?: string) {
  const state = readCRMState();
  if (!state.branchStock[toBranch]) return { success: false, message: "Filial topilmadi" };

  for (const item of items) {
    const product = state.products.find(entry => entry.id === item.productId);
    const available = state.mainStock[item.productId] || 0;
    if (!product || available < item.quantity) {
      return { success: false, message: `"${product?.name || item.productId}" bosh skladda yetarli emas! Mavjud: ${available}` };
    }
  }

  const transferItems = items.map(item => {
    const product = state.products.find(entry => entry.id === item.productId)!;
    return itemFromProduct(product, item.quantity);
  });

  state.transfers.unshift({
    id: makeId("TR"),
    toBranch,
    items: transferItems,
    totalValue: transferItems.reduce((sum, item) => sum + item.quantity * item.pricePerUnit, 0),
    requestedBy,
    status: "pending",
    note,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });

  writeCRMState(state);
  return { success: true, message: "So'rov yuborildi!" };
}

export function approveTransferLocal(id: string, approvedBy: string) {
  const state = readCRMState();
  const transfer = state.transfers.find(item => item.id === id);
  if (!transfer) return { success: false, message: "Transfer topilmadi" };
  if (transfer.status !== "pending") return { success: false, message: "Allaqachon ko'rib chiqilgan" };

  for (const item of transfer.items) {
    const available = state.mainStock[item.productId] || 0;
    if (available < item.quantity) {
      return { success: false, message: `"${item.productName}" bosh skladda yetarli emas!` };
    }
  }

  for (const item of transfer.items) {
    state.mainStock[item.productId] = (state.mainStock[item.productId] || 0) - item.quantity;
    state.branchStock[transfer.toBranch][item.productId] = (state.branchStock[transfer.toBranch][item.productId] || 0) + item.quantity;
  }

  transfer.status = "approved";
  transfer.approvedBy = approvedBy;
  transfer.updatedAt = new Date().toISOString();
  writeCRMState(state);
  return { success: true, message: "Transfer tasdiqlandi!" };
}

export function rejectTransferLocal(id: string, approvedBy: string) {
  const state = readCRMState();
  const transfer = state.transfers.find(item => item.id === id);
  if (!transfer) return { success: false, message: "Transfer topilmadi" };
  transfer.status = "rejected";
  transfer.approvedBy = approvedBy;
  transfer.updatedAt = new Date().toISOString();
  writeCRMState(state);
  return { success: true, message: "Transfer rad etildi." };
}

export function createSupplierLocal(data: Omit<Supplier, "id" | "createdAt">) {
  const state = readCRMState();
  const supplier: Supplier = {
    ...data,
    id: makeId("SUP"),
    createdAt: new Date().toISOString(),
  };

  supplier.items.forEach(item => {
    state.mainStock[item.productId] = (state.mainStock[item.productId] || 0) + item.quantity;
  });

  state.suppliers.unshift(supplier);
  writeCRMState(state);
  return { success: true, supplier };
}

export function updateSupplierPayLocal(id: string, payStatus: PayStatus, paidAmount: number) {
  const state = readCRMState();
  const supplier = state.suppliers.find(item => item.id === id);
  if (!supplier) return { success: false };
  supplier.payStatus = payStatus;
  supplier.paidAmount = paidAmount;
  writeCRMState(state);
  return { success: true };
}

export function addStaffLocal(data: Omit<Staff, "id">) {
  const state = readCRMState();
  const staff = { ...data, id: makeId("st") };
  state.staff.push(staff);
  writeCRMState(state);
  return { success: true, staff };
}

export function toggleStaffLocal(id: string) {
  const state = readCRMState();
  const staff = state.staff.find(item => item.id === id);
  if (!staff) return { success: false };
  staff.active = !staff.active;
  writeCRMState(state);
  return { success: true };
}

export function addProductLocal(data: Omit<Product, "id">) {
  const state = readCRMState();
  const qrCode = (data.qrCode || "").trim();
  if (qrCode && state.products.some(product => (product.qrCode || "").toLowerCase() === qrCode.toLowerCase())) {
    return { success: false, message: "Bu QR kod boshqa mahsulotga ulangan" };
  }

  const product: Product = {
    ...data,
    qrCode,
    id: `p${Date.now()}`,
  };

  state.products.push(product);
  state.mainStock[product.id] = 0;
  Object.values(state.branchStock).forEach(stock => {
    stock[product.id] = 0;
  });
  writeCRMState(state);
  return { success: true, product };
}

// ─── COMPANIES ───────────────────────────────────────────────
export function addCompanyLocal(data: Omit<Company, "id" | "createdAt">) {
  const state = readCRMState();
  const company: Company = { ...data, id: makeId("CO"), createdAt: new Date().toISOString() };
  state.companies.push(company);
  writeCRMState(state);
  return { success: true, company };
}

// ─── ORDERS ──────────────────────────────────────────────────
export function createOrderLocal(data: { companyId: string; items: { productId: string; quantity: number; pricePerUnit: number }[]; note: string; payStatus: PayStatus; paidAmount: number }) {
  const state = readCRMState();
  const company = state.companies.find(c => c.id === data.companyId);
  if (!company) return { success: false, message: "Firma topilmadi" };

  const orderItems: OrderItem[] = data.items.map(item => {
    const product = state.products.find(p => p.id === item.productId)!;
    return { productId: item.productId, productName: product.name, quantity: item.quantity, unit: product.unit, pricePerUnit: item.pricePerUnit };
  });

  const totalPrice = orderItems.reduce((sum, i) => sum + i.quantity * i.pricePerUnit, 0);

  const order: Order = {
    id: makeId("ORD"),
    companyId: data.companyId,
    companyName: company.name,
    items: orderItems,
    totalPrice,
    paidAmount: data.payStatus === "paid" ? totalPrice : data.paidAmount,
    payStatus: data.payStatus,
    note: data.note,
    createdAt: new Date().toISOString(),
  };

  // Auto add to mainStock
  orderItems.forEach(item => {
    state.mainStock[item.productId] = (state.mainStock[item.productId] || 0) + item.quantity;
  });

  state.orders.unshift(order);
  writeCRMState(state);
  return { success: true, order };
}

// ─── COMPANY PAYMENTS ────────────────────────────────────────
export function payOrderLocal(orderId: string, amount: number, note: string) {
  const state = readCRMState();
  const order = state.orders.find(o => o.id === orderId);
  if (!order) return { success: false, message: "Order topilmadi" };

  const payment: CompanyPayment = { id: makeId("PAY"), companyId: order.companyId, orderId, amount, note, createdAt: new Date().toISOString() };
  state.companyPayments.push(payment);

  order.paidAmount = Math.min(order.totalPrice, order.paidAmount + amount);
  order.payStatus = order.paidAmount >= order.totalPrice ? "paid" : order.paidAmount > 0 ? "partial" : "unpaid";

  writeCRMState(state);
  return { success: true };
}
