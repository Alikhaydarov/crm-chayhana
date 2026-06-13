// Refactored CRM App - Components extracted to src/
'use client'
import {
	addCompanyApi,
	addProductApi,
	approveTransferApi,
	createOrderApi,
	createTransferApi,
	getSnapshotApi,
	importShopSalesApi,
	loginApi,
	logoutApi,
	payOrderApi,
	rejectTransferApi,
	restoreSessionApi,
	updateStockApi,
} from '@/lib/api'
import type {
	Company,
	CompanyPayment,
	Order,
	OrderReceipt,
	ShopSaleImport,
} from '@/lib/localStore'
import {
	ArrowLeft,
	ArrowLeftRight,
	Boxes,
	ChevronLeft,
	ChevronRight,
	FileSpreadsheet,
	Languages,
	LayoutDashboard,
	LogOut,
	Moon,
	Package,
	ShoppingCart,
	Store,
	Sun,
	TrendingUp,
	Upload,
	Warehouse,
} from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'

type Role = 'superadmin' | 'restaurant1' | 'restaurant2' | 'shop'
type UserInfo = {
	id: string
	name: string
	role: Role
	branchName: string
	branchIcon: string
}
type Product = {
	id: string
	name: string
	category: string
	unit: string
	minStock: number
	pricePerUnit: number
	perBox: number
	boxUnit: string
	qrCode?: string
	supplierId?: string
}
type StockMap = Record<string, number>
type Transfer = {
	id: string
	toBranch: string
	items: any[]
	totalValue: number
	requestedBy: string
	approvedBy?: string
	status: 'pending' | 'approved' | 'rejected'
	note?: string
	createdAt: string
	updatedAt: string
}
type ThemeMode = 'dark' | 'light'
type Lang = 'uz' | 'ko'
type ParsedShopSale = {
	barcode: string
	sourceName: string
	supplier: string
	quantity: number
	salesAmount: number
	costAmount: number
	profitAmount: number
	averagePrice: number
	productId: string
}

const I18N: Record<Lang, Record<string, string>> = {
	uz: {
		dashboard: 'Dashboard',
		warehouse: 'Sklad',
		transfers: 'Transferlar',
		orders: 'Order',
		products: 'Mahsulotlar',
		suppliers: 'Firmalar',
		logout: 'Chiqish',
		language: 'Til',
		uzbek: "O'zbek",
		korean: 'Koreys',
		dark: 'Tungi',
		light: 'Kunduzgi',
		mode: 'Rejim',
		loading: 'Yuklanmoqda...',
		save: 'Saqlash',
		cancel: 'Bekor qilish',
		close: 'Yopish',
		edit: "O'zgartirish",
		view: "Ko'rish",
		approve: 'Tasdiqlash',
		reject: 'Rad etish',
		sending: 'Yuborilmoqda...',
		pending: 'Kutilmoqda',
		approved: 'Tasdiqlandi',
		rejected: 'Rad etildi',
		partial: 'Qisman',
		paid: "To'langan",
		unpaid: "To'lanmagan",
		lowStock: 'Kam qoldi',
		medium: "O'rtacha",
		good: 'Yaxshi',
		searchProduct: 'Mahsulot qidirish...',
		noProductsFound: 'Mahsulot topilmadi',
		addNewProduct: "Yangi mahsulot qo'shish",
		productName: 'Mahsulot nomi',
		category: 'Kategoriya',
		unit: 'Birlik',
		minStock: 'Min sklad',
		price: 'Narx',
		qrCode: 'QR / Shtrix kod',
		scan: 'Skan',
		unitsPerBox: 'Qutidagi soni',
		unitName: 'Birlik nomi',
		firm: 'Firma',
		selectFirm: 'Firma tanlang',
		noFirmsYet: "Firma qo'shilmagan",
		addFirm: '+ Yangi firma',
		firmName: 'Firma nomi',
		address: 'Manzil',
		phone: 'Telefon',
		addedDate: "Qo'shilgan sana",
		totalOrders: 'Jami orderlar',
		debt: 'Qarz',
		noDebt: "Yo'q",
		info: 'Info',
		pay: 'Pay',
		history: 'Tarix',
		totalDebt: 'Umumiy qarz',
		totalPaid: "To'langan",
		totalAmount: 'Jami summa',
		payAmount: "To'lov summasi",
		payAll: 'Hammasi',
		note: 'Izoh',
		payNote: 'Naqd, bank...',
		noOrders: "Order yo'q",
		noHistory: "To'lov tarixi yo'q",
		newOrder: '+ Yangi order',
		selectProduct: 'Mahsulot tanlang',
		quantity: 'Soni',
		payStatus: "To'lov holati",
		totalPrice: 'Jami summa',
		savedToStock: "Skladga qo'shildi",
		newRequest: "+ Yangi so'rov",
		transferRequest: "Transfer so'rovi",
		selectBranch: 'Filial',
		addProduct: "+ Mahsulot qo'shish",
		transferNote: 'Eslatma',
		send: 'Yuborish',
		transferDetails: 'Transfer tafsilotlari',
		requestedBy: "So'ragan",
		approvedBy: 'Tasdiqlagan',
		noTransfers: "Transfer yo'q",
		recentTransfers: 'Oxirgi transferlar',
		viewAll: 'Barchasi',
		stockValue: 'Sklad qiymati',
		productTypes: 'Mahsulot turlari',
		totalStaff: 'Jami xodim',
		orderDebt: 'Order qarzi',
		myStock: 'Skladim',
		myRequests: "So'rovlarim",
		waiting: 'Kutilmoqda',
		firms: 'Firmalar',
		branchStatus: 'Filiallar',
		editStock: "Miqdorni o'zgartirish",
		currentQty: 'Hozirgi',
		newQty: 'Yangi miqdor',
		stockUpdated: 'Sklad yangilandi',
		invalidQty: "Noto'g'ri miqdor",
		total: 'Jami',
		branch: 'Filial',
		date: 'Sana',
	},
	ko: {
		dashboard: '대시보드',
		warehouse: '창고',
		transfers: '이동',
		orders: '주문',
		products: '상품',
		suppliers: '업체',
		logout: '로그아웃',
		language: '언어',
		uzbek: '우즈벡어',
		korean: '한국어',
		dark: '다크',
		light: '라이트',
		mode: '모드',
		loading: '로딩 중...',
		save: '저장',
		cancel: '취소',
		close: '닫기',
		edit: '수정',
		view: '보기',
		approve: '승인',
		reject: '거절',
		sending: '전송 중...',
		pending: '대기',
		approved: '승인됨',
		rejected: '거절됨',
		partial: '부분',
		paid: '완료',
		unpaid: '미결제',
		lowStock: '부족',
		medium: '주의',
		good: '양호',
		searchProduct: '상품 검색...',
		noProductsFound: '상품 없음',
		addNewProduct: '새 상품 추가',
		productName: '상품명',
		category: '카테고리',
		unit: '단위',
		minStock: '최소 재고',
		price: '가격',
		qrCode: 'QR 코드',
		scan: '스캔',
		unitsPerBox: '박스당 수량',
		unitName: '단위명',
		firm: '업체',
		selectFirm: '업체 선택',
		noFirmsYet: '업체 없음',
		addFirm: '+ 새 업체',
		firmName: '업체명',
		address: '주소',
		phone: '전화',
		addedDate: '등록일',
		totalOrders: '총 주문',
		debt: '미수금',
		noDebt: '없음',
		info: '정보',
		pay: '결제',
		history: '내역',
		totalDebt: '총 미수금',
		totalPaid: '결제됨',
		totalAmount: '총 금액',
		payAmount: '결제 금액',
		payAll: '전액',
		note: '메모',
		payNote: '현금, 은행...',
		noOrders: '주문 없음',
		noHistory: '결제 내역 없음',
		newOrder: '+ 새 주문',
		selectProduct: '상품 선택',
		quantity: '수량',
		payStatus: '결제 상태',
		totalPrice: '총 금액',
		savedToStock: '창고에 추가됨',
		newRequest: '+ 새 요청',
		transferRequest: '이동 요청',
		selectBranch: '지점',
		addProduct: '+ 상품 추가',
		transferNote: '메모',
		send: '전송',
		transferDetails: '이동 상세',
		requestedBy: '요청자',
		approvedBy: '승인자',
		noTransfers: '이동 없음',
		recentTransfers: '최근 이동',
		viewAll: '전체',
		stockValue: '재고 금액',
		productTypes: '상품 종류',
		totalStaff: '전체 직원',
		orderDebt: '주문 미수금',
		myStock: '내 재고',
		myRequests: '내 요청',
		waiting: '대기',
		firms: '업체',
		branchStatus: '지점 현황',
		editStock: '재고 수량 수정',
		currentQty: '현재',
		newQty: '새 수량',
		stockUpdated: '재고 수정됨',
		invalidQty: '수량 오류',
		total: '합계',
		branch: '지점',
		date: '날짜',
	},
}

const BNAME: Record<string, string> = {
	restaurant1: 'Oshxona-1',
	restaurant2: 'Oshxona-2',
	shop: "Do'kon",
	main: 'Bosh Sklad',
}
const BICON: Record<string, string> = {
	restaurant1: '🍽️',
	restaurant2: '🍜',
	shop: '🏪',
	main: '🏭',
	superadmin: '🏭',
}
const ST_CFG = {
	pending: {
		c: '#f0a500',
		bg: 'rgba(240,165,0,0.12)',
		l: 'Kutilmoqda',
		i: '⏳',
	},
	approved: {
		c: '#3fb950',
		bg: 'rgba(63,185,80,0.12)',
		l: 'Tasdiqlandi',
		i: '✅',
	},
	rejected: {
		c: '#f85149',
		bg: 'rgba(248,81,73,0.12)',
		l: 'Rad etildi',
		i: '❌',
	},
}
const PAY_CFG = {
	paid: { c: '#3fb950', bg: 'rgba(63,185,80,0.12)', l: "✅ To'langan" },
	unpaid: { c: '#f85149', bg: 'rgba(248,81,73,0.12)', l: "❌ To'lanmagan" },
	partial: { c: '#f0a500', bg: 'rgba(240,165,0,0.12)', l: '⏳ Qisman' },
}
const fmt = (n: number) => n.toLocaleString('uz-UZ')
const fmtM = (n: number) => `${fmt(n)} so'm`
const fmtKRW = (n: number) => `₩${fmt(n)}`
const fmtD = (s: string) =>
	new Date(s).toLocaleString('uz-UZ', {
		day: '2-digit',
		month: 'short',
		year: 'numeric',
		hour: '2-digit',
		minute: '2-digit',
	})
const fmtDate = (s: string) =>
	new Date(s).toLocaleDateString('uz-UZ', {
		day: '2-digit',
		month: 'short',
		year: 'numeric',
	})

function useToast() {
	const [toast, setToast] = useState<{
		msg: string
		type: 'success' | 'error'
	} | null>(null)
	const show = useCallback(
		(msg: string, type: 'success' | 'error' = 'success') => {
			setToast({ msg, type })
			setTimeout(() => setToast(null), 3200)
		},
		[],
	)
	return { toast, show }
}

const GLOBAL_CSS = `
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  html, body { height: 100%; }
  ::-webkit-scrollbar { width: 4px; height: 4px; }
  ::-webkit-scrollbar-track { background: transparent; }
  ::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 4px; }

  @keyframes fadeUp   { from { opacity:0; transform:translateY(12px); } to { opacity:1; transform:translateY(0); } }
  @keyframes fadeIn   { from { opacity:0; } to { opacity:1; } }
  @keyframes slideUp  { from { opacity:0; transform:translateY(40px); } to { opacity:1; transform:translateY(0); } }
  @keyframes toastIn  { from { opacity:0; transform:translateX(60px) scale(.9); } to { opacity:1; transform:translateX(0) scale(1); } }

  .fade-up  { animation: fadeUp  .3s cubic-bezier(.22,.68,0,1.2) forwards; }
  .fade-in  { animation: fadeIn  .25s ease forwards; }

  /* Inputs */
  .crm-input {
    display: block; width: 100%;
    background: var(--app-input) !important;
    color: var(--app-text) !important;
    border: 1.5px solid var(--app-border) !important;
    border-radius: 10px !important;
    padding: 11px 14px !important;
    font-size: 13px !important;
    font-weight: 600 !important;
    outline: none !important;
    font-family: inherit !important;
    transition: border-color .15s, box-shadow .15s !important;
  }
  .crm-input:focus {
    border-color: var(--app-primary) !important;
    box-shadow: 0 0 0 3px var(--app-primary-soft) !important;
  }
  select.crm-input option { background: var(--app-panel); color: var(--app-text); }

  /* Buttons */
  .btn-primary {
    display: inline-flex; align-items: center; justify-content: center; gap: 6px;
    background: var(--app-primary);
    border: none; color: #fff; border-radius: 8px;
    padding: 9px 14px; min-height: 36px; font-weight: 700; cursor: pointer; font-size: 12px;
    transition: all .18s; box-shadow: 0 4px 12px rgba(115,103,240,.24);
    white-space: nowrap; font-family: inherit;
  }
  .btn-primary:hover:not(:disabled) { background: var(--app-primary-strong); box-shadow: 0 6px 18px rgba(115,103,240,.3); }
  .btn-primary:active { transform: translateY(0); }
  .btn-primary:disabled { opacity: .45; cursor: not-allowed; }

  .btn-ghost {
    display: inline-flex; align-items: center; justify-content: center; gap: 6px;
    background: var(--app-panel-soft); border: 1.5px solid var(--app-border);
    color: var(--app-muted); border-radius: 8px;
    padding: 9px 14px; min-height: 36px; font-weight: 700; cursor: pointer; font-size: 12px;
    transition: all .15s; white-space: nowrap; font-family: inherit;
  }
  .btn-ghost:hover { border-color: rgba(115,103,240,.4); color: var(--app-primary); }

  .btn-icon {
    display: inline-flex; align-items: center; justify-content: center;
    border-radius: 7px; padding: 7px 10px; cursor: pointer; font-size: 12px;
    font-weight: 700; border: 1.5px solid transparent; transition: all .15s;
    font-family: inherit; white-space: nowrap;
  }

  /* Table */
  .crm-table { width: 100%; border-collapse: collapse; min-width: 520px; }
  .crm-table th {
    padding: 11px 16px; text-align: left; font-size: 10.5px; font-weight: 800;
    color: var(--app-muted); letter-spacing: .6px; text-transform: uppercase;
    border-bottom: 1px solid var(--app-border); white-space: nowrap; background: var(--app-panel);
  }
  .crm-table td {
    padding: 12px 16px; font-size: 13px; border-bottom: 1px solid var(--app-border); vertical-align: middle;
  }
  .crm-table tr:last-child td { border-bottom: none; }
  .crm-table tbody tr { transition: background .12s; }
  .crm-table tbody tr:hover td { background: var(--app-primary-soft); }
  .table-wrap { overflow-x: auto; -webkit-overflow-scrolling: touch; border-radius: 8px; border: 1px solid var(--app-border); background: var(--app-panel); }

  /* Cards */
  .stat-card {
    background: var(--app-panel); border: 1px solid var(--app-border);
    border-radius: 8px; padding: 18px;
    transition: all .2s; cursor: default;
  }
  .stat-card:hover { border-color: rgba(115,103,240,.35); box-shadow: 0 8px 24px var(--app-shadow); }

  /* Modal */
  .modal-backdrop {
    position: fixed; inset: 0; background: rgba(0,0,0,.75);
    z-index: 300; display: flex; align-items: flex-end; justify-content: center;
    animation: fadeIn .2s ease;
    padding: 0;
  }
  .modal-box {
    background: var(--app-panel); border: 1px solid var(--app-border);
    border-radius: 12px 12px 0 0;
    width: 100%; max-width: 620px; max-height: 92vh;
    overflow-y: auto; color: var(--app-text);
    padding: 28px 24px 32px;
    animation: slideUp .28s cubic-bezier(.22,.68,0,1.1);
    box-shadow: 0 -16px 60px rgba(0,0,0,.4);
  }
  .modal-drag { width: 44px; height: 4px; background: var(--app-border); border-radius: 2px; margin: 0 auto 22px; }
  .modal-title { font-size: 18px; font-weight: 900; margin-bottom: 20px; }

  /* Badges */
  .badge {
    display: inline-flex; align-items: center; gap: 4px;
    padding: 3px 10px; border-radius: 20px;
    font-size: 11px; font-weight: 800; white-space: nowrap;
  }

  /* Nav item */
  .nav-item {
    display: flex; align-items: center; gap: 10px;
    padding: 10px 12px; border-radius: 11px; margin-bottom: 2px;
    cursor: pointer; transition: all .15s; border: 1.5px solid transparent;
    font-size: 13px; font-weight: 500; color: var(--app-muted);
    white-space: nowrap; overflow: hidden;
  }
  .nav-item:hover { background: var(--app-primary-soft); color: var(--app-primary); }
  .nav-item.active {
    background: linear-gradient(90deg, var(--app-primary), #8f85f3); color: #fff; font-weight: 700;
    border-color: transparent; box-shadow: 0 5px 14px rgba(115,103,240,.25);
  }
  .nav-icon { font-size: 18px; flex-shrink: 0; }

  /* Bottom nav (mobile) */
  .bottom-nav {
    display: none; position: fixed; bottom: 0; left: 0; right: 0;
    background: var(--app-panel); border-top: 1px solid var(--app-border);
    z-index: 100; padding: 6px 8px 16px;
  }
  .bnav-grid { display: grid; grid-template-columns: repeat(6,1fr); gap: 2px; }
  .bnav-btn {
    display: flex; flex-direction: column; align-items: center; gap: 3px;
    padding: 7px 4px; border-radius: 12px; cursor: pointer;
    border: none; background: transparent; color: var(--app-muted);
    font-family: inherit; transition: all .15s;
  }
  .bnav-btn.active { color: var(--app-primary); background: var(--app-primary-soft); }
  .bnav-icon { font-size: 22px; line-height: 1; }
  .bnav-label { font-size: 9px; font-weight: 800; letter-spacing: .2px; }

  /* Label */
  .form-label {
    display: block; font-size: 10.5px; font-weight: 800;
    color: var(--app-muted); letter-spacing: .6px; text-transform: uppercase; margin-bottom: 7px;
  }
  .form-group { margin-bottom: 14px; }

  /* Sidebar */
  .sidebar { display: flex; flex-direction: column; flex-shrink: 0; width: 240px; background: var(--app-panel); border-right: 1px solid var(--app-border); }

  /* Responsive */
  @media (max-width: 768px) {
    .sidebar { display: none !important; }
    .bottom-nav { display: block !important; }
    .page-pad { padding: 16px 14px 100px !important; }
    .modal-backdrop { align-items: flex-end; }
    .modal-box { border-radius: 12px 12px 0 0; max-height: 88vh; }
    .hide-mobile { display: none !important; }
    .stat-row { grid-template-columns: 1fr 1fr !important; }
    .firm-grid { grid-template-columns: 1fr !important; }
    .branch-grid { grid-template-columns: 1fr !important; }
    .action-row { flex-direction: column; }
    .action-row .btn-primary { width: 100%; justify-content: center; }
  }
  @media (min-width: 769px) {
    .modal-backdrop { align-items: center; padding: 20px; }
    .modal-box { border-radius: 12px; max-height: 90vh; }
  }
`

// ════════════════════════════════════════════════════════════
// LOGIN
// ════════════════════════════════════════════════════════════
function LoginPage({
	onLogin,
	theme,
	setTheme,
}: {
	onLogin: (u: UserInfo) => void
	theme: ThemeMode
	setTheme: (t: ThemeMode) => void
}) {
	const [userId, setUserId] = useState('super')
	const [password, setPassword] = useState('')
	const [showPass, setShowPass] = useState(false)
	const [error, setError] = useState('')
	const [loading, setLoading] = useState(false)
	const demos = [
		{
			id: 'super',
			password: 'super123',
			label: 'Bosh Admin',
			icon: '🏭',
			color: '#7367f0',
		},
		{
			id: 'rest1',
			password: 'rest1',
			label: 'Oshxona-1',
			icon: '🍽️',
			color: '#3fb950',
		},
		{
			id: 'rest2',
			password: 'rest2',
			label: 'Oshxona-2',
			icon: '🍜',
			color: '#3b82f6',
		},
		{
			id: 'shop1',
			password: 'shop1',
			label: "Do'kon",
			icon: '🏪',
			color: '#a855f7',
		},
	]
	const handleLogin = async () => {
		setLoading(true)
		setError('')
		const d = await loginApi(userId.trim(), password)
		if (d.success) onLogin(d.user)
		else setError(d.message)
		setLoading(false)
	}
	return (
		<div
			className={`${theme} theme-shell`}
			style={{
				minHeight: '100vh',
				display: 'flex',
				alignItems: 'center',
				justifyContent: 'center',
				padding: '20px',
				background: 'var(--app-bg)',
				fontFamily: 'var(--font-ui)',
			}}
		>
			<style>{GLOBAL_CSS}</style>
			<div style={{ width: '100%', maxWidth: 400 }}>
				{/* Logo */}
				<div style={{ textAlign: 'center', marginBottom: 36 }}>
					<div
						style={{
							width: 72,
							height: 72,
							borderRadius: 22,
							background: 'linear-gradient(135deg,#7367f0,#655bd3)',
							display: 'flex',
							alignItems: 'center',
							justifyContent: 'center',
							margin: '0 auto 16px',
							boxShadow: '0 12px 32px rgba(115,103,240,.4)',
							fontSize: 32,
						}}
					>
						🍽️
					</div>
					<div
						style={{
							fontSize: 28,
							fontWeight: 900,
							color: 'var(--app-text)',
							letterSpacing: -0.5,
						}}
					>
						CRM-JUTSU
					</div>
					<div
						style={{ fontSize: 13, color: 'var(--app-muted)', marginTop: 6 }}
					>
						Restoran boshqaruv tizimi
					</div>
				</div>

				{/* Card */}
				<div
					style={{
						background: 'var(--app-panel)',
						border: '1px solid var(--app-border)',
						borderRadius: 24,
						padding: '28px 24px',
						boxShadow: '0 24px 64px rgba(0,0,0,.35)',
					}}
				>
					<div className='form-group'>
						<label className='form-label'>Foydalanuvchi</label>
						<input
							className='crm-input'
							value={userId}
							onChange={e => setUserId(e.target.value)}
							placeholder='user id'
						/>
					</div>
					<div className='form-group'>
						<div
							style={{
								display: 'flex',
								justifyContent: 'space-between',
								alignItems: 'center',
								marginBottom: 7,
							}}
						>
							<label className='form-label' style={{ margin: 0 }}>
								Parol
							</label>
							<button
								style={{
									fontSize: 11,
									color: '#7367f0',
									fontWeight: 800,
									background: 'none',
									border: 'none',
									cursor: 'pointer',
									padding: 0,
								}}
								onClick={() => setShowPass(!showPass)}
							>
								{showPass ? 'Yashirish' : "Ko'rish"}
							</button>
						</div>
						<input
							className='crm-input'
							type={showPass ? 'text' : 'password'}
							value={password}
							onChange={e => setPassword(e.target.value)}
							onKeyDown={e => e.key === 'Enter' && handleLogin()}
							placeholder='Parolni kiriting'
						/>
					</div>

					{error && (
						<div
							style={{
								background: 'rgba(248,81,73,.1)',
								border: '1px solid rgba(248,81,73,.3)',
								borderRadius: 10,
								padding: '10px 14px',
								color: '#f85149',
								fontSize: 12,
								fontWeight: 700,
								marginBottom: 14,
							}}
						>
							❌ {error}
						</div>
					)}

					<button
						className='btn-primary'
						onClick={handleLogin}
						disabled={loading}
						style={{ width: '100%', marginBottom: 20, padding: '13px' }}
					>
						{loading ? 'Kirilmoqda...' : 'Kirish →'}
					</button>

					<div
						style={{
							display: 'flex',
							alignItems: 'center',
							gap: 10,
							marginBottom: 14,
						}}
					>
						<div
							style={{ flex: 1, height: 1, background: 'var(--app-border)' }}
						/>
						<span
							style={{
								fontSize: 10,
								fontWeight: 800,
								color: 'var(--app-muted)',
								letterSpacing: 1,
							}}
						>
							DEMO
						</span>
						<div
							style={{ flex: 1, height: 1, background: 'var(--app-border)' }}
						/>
					</div>

					<div
						style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}
					>
						{demos.map(d => (
							<button
								key={d.id}
								onClick={() => {
									setUserId(d.id)
									setPassword(d.password)
									setError('')
								}}
								style={{
									display: 'flex',
									alignItems: 'center',
									gap: 8,
									padding: '10px 12px',
									borderRadius: 12,
									border: `1.5px solid ${userId === d.id ? d.color : 'var(--app-border)'}`,
									background:
										userId === d.id ? `${d.color}18` : 'var(--app-panel-soft)',
									cursor: 'pointer',
									color: 'var(--app-text)',
									fontSize: 12,
									fontWeight: 700,
									fontFamily: 'inherit',
									transition: 'all .15s',
								}}
							>
								<span style={{ fontSize: 20 }}>{d.icon}</span>
								<div style={{ textAlign: 'left' }}>
									<div style={{ fontSize: 12, fontWeight: 800 }}>{d.label}</div>
									<div
										style={{
											fontSize: 10,
											color: 'var(--app-muted)',
											fontWeight: 500,
										}}
									>
										{d.id}
									</div>
								</div>
							</button>
						))}
					</div>
				</div>

				{/* Theme toggle */}
				<div style={{ textAlign: 'center', marginTop: 16 }}>
					<button
						onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
						style={{
							background: 'none',
							border: 'none',
							color: 'var(--app-muted)',
							cursor: 'pointer',
							fontSize: 12,
							fontWeight: 700,
							fontFamily: 'inherit',
						}}
					>
						{theme === 'dark' ? '☀️ Kunduzgi rejim' : '🌙 Tungi rejim'}
					</button>
				</div>
			</div>
		</div>
	)
}

// ════════════════════════════════════════════════════════════
// MAIN APP
// ════════════════════════════════════════════════════════════
export default function CRMApp() {
	const [user, setUser] = useState<UserInfo | null>(null)
	const [sessionReady, setSessionReady] = useState(false)
	const [tab, setTab] = useState('dashboard')
	const [theme, setTheme] = useState<ThemeMode>('dark')
	const [lang, setLang] = useState<Lang>('uz')
	const [sidebarCollapsed, setSidebarCollapsed] = useState(true)
	const t = I18N[lang]
	const [products, setProducts] = useState<Product[]>([])
	const [stock, setStock] = useState<StockMap>({})
	const [shopStock, setShopStock] = useState<StockMap>({})
	const [transfers, setTransfers] = useState<any[]>([])
	const [reports, setReports] = useState<any>(null)
	const [companies, setCompanies] = useState<Company[]>([])
	const [orders, setOrders] = useState<Order[]>([])
	const [companyPayments, setCompanyPayments] = useState<CompanyPayment[]>([])
	const [shopSales, setShopSales] = useState<ShopSaleImport[]>([])
	const { toast, show: showToast } = useToast()

	const fetchAll = useCallback(async () => {
		if (!user) return
		try {
			const d: any = await getSnapshotApi()
			setProducts(d.products || [])
			setStock(d.stock || {})
			setShopStock(d.shopStock || {})
			setTransfers(d.transfers || [])
			setReports(d.reports)
			setCompanies(d.companies || [])
			setOrders(d.orders || [])
			setCompanyPayments(d.companyPayments || [])
			setShopSales(d.shopSales || [])
		} catch (error: any) {
			showToast(error?.message || "Ma'lumotlarni yuklab bo'lmadi", 'error')
			if (/credential|token|auth|sessiya/i.test(error?.message || ''))
				setUser(null)
		}
	}, [user, showToast])

	useEffect(() => {
		if (user) fetchAll()
	}, [user, fetchAll])
	useEffect(() => {
		let active = true
		restoreSessionApi()
			.then(result => {
				if (active && result.success) setUser(result.user)
			})
			.finally(() => {
				if (active) setSessionReady(true)
			})
		return () => {
			active = false
		}
	}, [])
	useEffect(() => {
		const s = localStorage.getItem('crm-theme') as ThemeMode | null
		if (s) setTheme(s)
	}, [])
	useEffect(() => {
		localStorage.setItem('crm-theme', theme)
	}, [theme])
	useEffect(() => {
		const s = localStorage.getItem('crm-lang') as Lang | null
		if (s === 'uz' || s === 'ko') setLang(s)
	}, [])
	useEffect(() => {
		localStorage.setItem('crm-lang', lang)
	}, [lang])
	useEffect(() => {
		setSidebarCollapsed(localStorage.getItem('crm-sidebar') !== 'open')
	}, [])
	useEffect(() => {
		localStorage.setItem('crm-sidebar', sidebarCollapsed ? 'collapsed' : 'open')
	}, [sidebarCollapsed])

	const signOut = async () => {
		await logoutApi()
		setUser(null)
	}

	if (!sessionReady)
		return (
			<div
				className={`${theme} theme-shell`}
				style={{
					minHeight: '100vh',
					display: 'grid',
					placeItems: 'center',
					background: 'var(--app-bg)',
					color: 'var(--app-text)',
				}}
			>
				<style>{GLOBAL_CSS}</style>
				{t.loading}
			</div>
		)
	if (!user)
		return <LoginPage onLogin={setUser} theme={theme} setTheme={setTheme} />

	const pending = transfers.filter((t: any) => t.status === 'pending').length
	const TABS = [
		{ id: 'dashboard', icon: LayoutDashboard, label: t.dashboard },
		{ id: 'warehouse', icon: Warehouse, label: t.warehouse },
		{
			id: 'transfers',
			icon: ArrowLeftRight,
			label: t.transfers,
			badge: pending || 0,
		},
		{ id: 'orders', icon: ShoppingCart, label: t.orders },
		{ id: 'products', icon: Package, label: t.products },
		{ id: 'suppliers', icon: Store, label: t.suppliers },
	]

	const tabProps = {
		products,
		stock,
		shopStock,
		transfers,
		reports,
		companies,
		orders,
		companyPayments,
		shopSales,
		user,
		fetchAll,
		showToast,
		setTab,
		t,
		lang,
	}

	return (
		<div
			className={`${theme} theme-shell`}
			style={{
				display: 'flex',
				height: '100vh',
				background: 'var(--app-bg)',
				fontFamily: 'var(--font-ui)',
				color: 'var(--app-text)',
				overflow: 'hidden',
			}}
		>
			<style>{GLOBAL_CSS}</style>

			{/* TOAST */}
			{toast && (
				<div
					style={{
						position: 'fixed',
						top: 20,
						right: 20,
						zIndex: 9999,
						padding: '13px 20px',
						borderRadius: 14,
						fontWeight: 800,
						fontSize: 13,
						boxShadow: '0 12px 32px rgba(0,0,0,.4)',
						animation: 'toastIn .3s cubic-bezier(.22,.68,0,1.2)',
						display: 'flex',
						alignItems: 'center',
						gap: 8,
						maxWidth: 340,
						background: toast.type === 'success' ? '#3fb950' : '#f85149',
						color: '#fff',
					}}
				>
					{toast.type === 'success' ? '✅' : '❌'} {toast.msg}
				</div>
			)}

			{/* DESKTOP SIDEBAR */}
			<aside
				className={`sidebar app-sidebar${sidebarCollapsed ? ' collapsed' : ''}`}
			>
				{/* Brand */}
				<div
					className='brand-row'
					style={{
						padding: '16px 14px',
						borderBottom: '1px solid var(--app-border)',
						display: 'flex',
						alignItems: 'center',
						gap: 10,
					}}
				>
					<button
						className='sidebar-toggle'
						title={sidebarCollapsed ? 'Menyuni ochish' : 'Menyuni yopish'}
						onClick={() => setSidebarCollapsed(value => !value)}
					>
						<Boxes size={20} />
					</button>
					<div className='sidebar-brand-copy'>
						<div style={{ fontWeight: 900, fontSize: 14, letterSpacing: -0.3 }}>
							CRM-JUTSU
						</div>
						<div style={{ fontSize: 10, color: 'var(--app-muted)' }}>v3.0</div>
					</div>
					<button
						className='sidebar-collapse-action'
						title='Menyuni yopish'
						onClick={() => setSidebarCollapsed(true)}
					>
						<ChevronLeft size={17} />
					</button>
				</div>

				{/* User card */}
				<div
					className='sidebar-card'
					style={{
						margin: '12px 10px',
						padding: '12px',
						background: 'var(--app-panel-soft)',
						border: '1px solid var(--app-border)',
						borderRadius: 8,
						display: 'flex',
						alignItems: 'center',
						gap: 10,
					}}
				>
					<div
						style={{
							width: 34,
							height: 34,
							borderRadius: 8,
							background: 'var(--app-primary-soft)',
							color: 'var(--app-primary)',
							display: 'grid',
							placeItems: 'center',
							fontWeight: 800,
						}}
					>
						{user.branchIcon}
					</div>
					<div style={{ minWidth: 0 }}>
						<div
							style={{
								fontWeight: 700,
								fontSize: 13,
								whiteSpace: 'nowrap',
								overflow: 'hidden',
								textOverflow: 'ellipsis',
							}}
						>
							{user.name}
						</div>
						<div
							style={{ fontSize: 11, color: 'var(--app-muted)', marginTop: 2 }}
						>
							{user.branchName}
						</div>
					</div>
				</div>

				{/* Nav */}
				<nav style={{ flex: 1, padding: '6px 8px', overflowY: 'auto' }}>
					{TABS.map(nav => (
						<button
							key={nav.id}
							title={nav.label}
							className={`nav-item tab-item${tab === nav.id ? ' active' : ''}`}
							onClick={() => setTab(nav.id)}
						>
							<span className='nav-icon'>
								<nav.icon size={20} strokeWidth={1.8} />
							</span>
							<span className='sidebar-text' style={{ flex: 1 }}>
								{nav.label}
							</span>
							{(nav.badge || 0) > 0 && (
								<span
									style={{
										background: tab === nav.id ? '#fff' : 'var(--app-primary)',
										color: tab === nav.id ? 'var(--app-primary)' : '#fff',
										borderRadius: 20,
										padding: '1px 7px',
										fontSize: 10,
										fontWeight: 900,
									}}
								>
									{nav.badge}
								</span>
							)}
						</button>
					))}
				</nav>

				{/* Footer */}
				<div
					className='sidebar-footer'
					style={{
						padding: '8px 8px 12px',
						borderTop: '1px solid var(--app-border)',
					}}
				>
					<button
						className='sidebar-footer-button'
						title={theme === 'dark' ? 'Kunduzgi rejim' : 'Tungi rejim'}
						onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
					>
						{theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
						<span className='sidebar-text'>
							{theme === 'dark' ? 'Kunduzgi' : 'Tungi'} rejim
						</span>
					</button>
					<button
						className='sidebar-footer-button'
						title={lang === 'uz' ? 'Koreys tili' : "O'zbek tili"}
						onClick={() => setLang(lang === 'uz' ? 'ko' : 'uz')}
					>
						<Languages size={18} />
						<span className='sidebar-text'>
							{lang === 'uz' ? "O'zbek" : '한국어'}
						</span>
					</button>
					<button
						className='sidebar-footer-button danger'
						title={t.logout}
						onClick={signOut}
					>
						<LogOut size={18} />
						<span className='sidebar-text'>{t.logout}</span>
					</button>
				</div>
			</aside>

			{/* MAIN CONTENT */}
			<main
				className='mobile-main'
				style={{ flex: 1, overflowY: 'auto', minWidth: 0 }}
			>
				<header
					className='app-topbar mobile-topbar'
					style={{
						display: 'flex',
						alignItems: 'center',
						justifyContent: 'space-between',
						gap: 12,
					}}
				>
					<div
						style={{
							display: 'flex',
							alignItems: 'center',
							gap: 10,
							minWidth: 0,
						}}
					>
						<button
							className='topbar-control desktop-only'
							title={sidebarCollapsed ? 'Menyuni ochish' : 'Menyuni yopish'}
							onClick={() => setSidebarCollapsed(value => !value)}
						>
							{sidebarCollapsed ? (
								<ChevronRight size={18} />
							) : (
								<ChevronLeft size={18} />
							)}
						</button>
						<div
							style={{
								width: 34,
								height: 34,
								borderRadius: 8,
								background: 'var(--app-primary)',
								color: '#fff',
								display: 'grid',
								placeItems: 'center',
								fontWeight: 900,
								flexShrink: 0,
							}}
						>
							C
						</div>
						<div style={{ minWidth: 0 }}>
							<div
								style={{
									fontSize: 13,
									fontWeight: 800,
									whiteSpace: 'nowrap',
									overflow: 'hidden',
									textOverflow: 'ellipsis',
								}}
							>
								{tab === 'shop-sales'
									? "Do'kon savdosi"
									: TABS.find(item => item.id === tab)?.label}
							</div>
							<div
								style={{
									fontSize: 11,
									color: 'var(--app-muted)',
									whiteSpace: 'nowrap',
									overflow: 'hidden',
									textOverflow: 'ellipsis',
								}}
							>
								{user.name} · {user.branchName}
							</div>
						</div>
					</div>
					<div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
						<button
							className='topbar-control'
							title={
								lang === 'uz' ? "Koreys tiliga o'tish" : "O'zbek tiliga o'tish"
							}
							onClick={() => setLang(lang === 'uz' ? 'ko' : 'uz')}
						>
							{lang === 'uz' ? 'UZ' : 'KO'}
						</button>
						<button
							className='topbar-control'
							title={theme === 'dark' ? 'Kunduzgi rejim' : 'Tungi rejim'}
							onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
						>
							{theme === 'dark' ? '☀' : '☾'}
						</button>
						<button
							className='topbar-control'
							title={t.logout}
							onClick={signOut}
							style={{ color: '#ea5455' }}
						>
							↪
						</button>
					</div>
				</header>
				{tab === 'dashboard' && <DashboardTab {...tabProps} />}
				{tab === 'warehouse' && <WarehouseTab {...tabProps} />}
				{tab === 'transfers' && <TransfersTab {...tabProps} />}
				{tab === 'orders' && <OrdersTab {...tabProps} />}
				{tab === 'products' && <ProductsTab {...tabProps} />}
				{tab === 'suppliers' && <FirmsTab {...tabProps} />}
				{tab === 'shop-sales' && <ShopSalesTab {...tabProps} />}
			</main>

			{/* MOBILE BOTTOM NAV */}
			<nav className='bottom-nav'>
				<div className='bnav-grid'>
					{TABS.map(nav => (
						<button
							key={nav.id}
							className={`bnav-btn${tab === nav.id ? ' active' : ''}`}
							onClick={() => setTab(nav.id)}
						>
							<span className='bnav-icon' style={{ position: 'relative' }}>
								<nav.icon size={21} strokeWidth={1.9} />
								{(nav.badge || 0) > 0 && (
									<span
										style={{
											position: 'absolute',
											top: -4,
											right: -6,
											background: '#f85149',
											color: '#fff',
											borderRadius: 20,
											padding: '0 4px',
											fontSize: 8,
											fontWeight: 900,
											lineHeight: '14px',
										}}
									>
										{nav.badge}
									</span>
								)}
							</span>
							<span className='bnav-label'>{nav.label.split(' ')[0]}</span>
						</button>
					))}
				</div>
			</nav>
		</div>
	)
}

// ─── PAGE WRAPPER ─────────────────────────────────────────────
function PageWrap({
	title,
	sub,
	action,
	children,
}: {
	title?: any
	sub?: any
	action?: any
	children: any
}) {
	return (
		<div className='page-pad' style={{ padding: '28px 24px' }}>
			{(title || action) && (
				<div
					className='action-row'
					style={{
						display: 'flex',
						justifyContent: 'space-between',
						alignItems: 'flex-start',
						flexWrap: 'wrap',
						gap: 12,
						marginBottom: 26,
					}}
				>
					<div>
						{title && (
							<div
								style={{
									fontSize: 22,
									fontWeight: 900,
									letterSpacing: -0.4,
									marginBottom: 4,
								}}
							>
								{title}
							</div>
						)}
						{sub && (
							<div style={{ color: 'var(--app-muted)', fontSize: 13 }}>
								{sub}
							</div>
						)}
					</div>
					{action && <div>{action}</div>}
				</div>
			)}
			{children}
		</div>
	)
}

// ─── MODAL ────────────────────────────────────────────────────
function Modal({ onClose, children }: { onClose: () => void; children: any }) {
	return (
		<div className='modal-backdrop' onClick={onClose}>
			<div className='modal-box' onClick={e => e.stopPropagation()}>
				<div className='modal-drag' />
				{children}
			</div>
		</div>
	)
}

// ════════════════════════════════════════════════════════════
// DASHBOARD
// ════════════════════════════════════════════════════════════
function DashboardTab({
	reports,
	user,
	setTab,
	transfers,
	orders,
	companies,
	t,
}: any) {
	if (!reports)
		return (
			<PageWrap>
				<div
					style={{
						color: 'var(--app-muted)',
						padding: 40,
						textAlign: 'center',
					}}
				>
					{t.loading}
				</div>
			</PageWrap>
		)
	const isSA = user.role === 'superadmin'
	const totalDebt = orders.reduce(
		(s: number, o: Order) => s + (o.totalPrice - o.paidAmount),
		0,
	)
	const today = new Date().toLocaleDateString('uz-UZ', {
		weekday: 'long',
		year: 'numeric',
		month: 'long',
		day: 'numeric',
	})

	const stats = isSA
		? [
				{
					l: 'Sklad qiymati',
					v: fmtM(reports.mainStockValue),
					c: '#3fb950',
					bg: 'rgba(63,185,80,.08)',
					i: '💰',
				},
				{
					l: 'Mahsulot turlari',
					v: String(reports.totalProducts),
					c: '#7367f0',
					bg: 'rgba(115,103,240,.08)',
					i: '📦',
				},
				{
					l: 'Jami xodimlar',
					v: String(reports.totalStaff),
					c: '#3b82f6',
					bg: 'rgba(59,130,246,.08)',
					i: '👥',
				},
				{
					l: 'Order qarzi',
					v: fmtM(totalDebt),
					c: totalDebt > 0 ? '#f85149' : '#3fb950',
					bg: totalDebt > 0 ? 'rgba(248,81,73,.08)' : 'rgba(63,185,80,.08)',
					i: '🏢',
				},
			]
		: [
				{
					l: 'Skladim',
					v: fmtM(
						reports.branchStats?.find((b: any) => b.branch === user.role)
							?.stockValue || 0,
					),
					c: '#3fb950',
					bg: 'rgba(63,185,80,.08)',
					i: '💰',
				},
				{
					l: "So'rovlarim",
					v: String(transfers.length),
					c: '#7367f0',
					bg: 'rgba(115,103,240,.08)',
					i: '🔄',
				},
				{
					l: 'Kutilayotgan',
					v: String(
						transfers.filter((t: any) => t.status === 'pending').length,
					),
					c: '#f0a500',
					bg: 'rgba(240,165,0,.08)',
					i: '⏳',
				},
				{
					l: 'Firmalar',
					v: String(companies.length),
					c: '#a855f7',
					bg: 'rgba(168,85,247,.08)',
					i: '🏢',
				},
			]

	return (
		<PageWrap
			title={`${user.branchIcon} ${user.branchName}`}
			sub={today}
			action={
				user.role === 'shop' ? (
					<button className='btn-primary' onClick={() => setTab('shop-sales')}>
						<TrendingUp size={16} /> Savdo tahlili
					</button>
				) : undefined
			}
		>
			{/* Stats */}
			<div
				className='stat-row'
				style={{
					display: 'grid',
					gridTemplateColumns: 'repeat(4,1fr)',
					gap: 14,
					marginBottom: 28,
				}}
			>
				{stats.map((s, i) => (
					<div
						key={i}
						className='stat-card fade-up'
						style={{
							animationDelay: `${i * 60}ms`,
							borderTop: `3px solid ${s.c}`,
							background: `linear-gradient(160deg,${s.bg},var(--app-panel))`,
						}}
					>
						<div style={{ fontSize: 28, marginBottom: 10 }}>{s.i}</div>
						<div
							style={{
								color: 'var(--app-muted)',
								fontSize: 11,
								fontWeight: 700,
								marginBottom: 6,
								letterSpacing: 0.3,
							}}
						>
							{s.l}
						</div>
						<div
							style={{
								fontWeight: 900,
								fontSize: s.v.length > 10 ? 16 : 20,
								color: s.c,
								letterSpacing: -0.3,
							}}
						>
							{s.v}
						</div>
					</div>
				))}
			</div>

			{/* Branch stats */}
			{isSA && reports.branchStats && (
				<div style={{ marginBottom: 28 }}>
					<div
						style={{
							fontSize: 15,
							fontWeight: 800,
							marginBottom: 14,
							display: 'flex',
							alignItems: 'center',
							gap: 8,
						}}
					>
						🏢 Filiallar{' '}
						<span
							style={{
								color: 'var(--app-muted)',
								fontWeight: 500,
								fontSize: 13,
							}}
						>
							holati
						</span>
					</div>
					<div
						className='branch-grid'
						style={{
							display: 'grid',
							gridTemplateColumns: 'repeat(3,1fr)',
							gap: 14,
						}}
					>
						{reports.branchStats.map((b: any, i: number) => (
							<button
								key={b.branch}
								className='fade-up branch-summary-card'
								onClick={() => b.branch === 'shop' && setTab('shop-sales')}
								disabled={b.branch !== 'shop'}
								style={{
									animationDelay: `${i * 80}ms`,
									background: 'var(--app-panel)',
									border: '1px solid var(--app-border)',
									borderRadius: 8,
									padding: 18,
									transition: 'all .2s',
									color: 'var(--app-text)',
									fontFamily: 'inherit',
									textAlign: 'left',
									cursor: b.branch === 'shop' ? 'pointer' : 'default',
									width: '100%',
								}}
							>
								<div
									style={{
										display: 'flex',
										alignItems: 'center',
										gap: 10,
										marginBottom: 14,
									}}
								>
									<div
										style={{
											width: 40,
											height: 40,
											borderRadius: 8,
											background: 'rgba(115,103,240,.1)',
											display: 'flex',
											alignItems: 'center',
											justifyContent: 'center',
											fontSize: 22,
										}}
									>
										{BICON[b.branch]}
									</div>
									<div style={{ flex: 1 }}>
										<div style={{ fontWeight: 800, fontSize: 14 }}>
											{b.branchName}
										</div>
										<div style={{ fontSize: 11, color: 'var(--app-muted)' }}>
											{b.staffCount} xodim
										</div>
									</div>
									{b.branch === 'shop' && (
										<ChevronRight size={18} color='var(--app-primary)' />
									)}
								</div>
								<div
									style={{
										display: 'grid',
										gridTemplateColumns: '1fr 1fr',
										gap: 8,
									}}
								>
									{[
										['Sklad', fmtM(b.stockValue), '#3fb950'],
										[
											'Kam qoldi',
											b.lowStockCount,
											b.lowStockCount > 0 ? '#f85149' : '#3fb950',
										],
									].map(([l, v, c]) => (
										<div
											key={String(l)}
											style={{
												background: 'var(--app-panel-soft)',
												borderRadius: 10,
												padding: '9px 11px',
											}}
										>
											<div
												style={{
													fontSize: 10,
													color: 'var(--app-muted)',
													marginBottom: 4,
													fontWeight: 700,
												}}
											>
												{l}
											</div>
											<div
												style={{
													fontWeight: 900,
													color: String(c),
													fontSize: 13,
												}}
											>
												{v}
											</div>
										</div>
									))}
								</div>
							</button>
						))}
					</div>
				</div>
			)}

			{/* Recent transfers */}
			<div
				style={{
					display: 'flex',
					justifyContent: 'space-between',
					alignItems: 'center',
					marginBottom: 14,
				}}
			>
				<div style={{ fontSize: 15, fontWeight: 800 }}>
					🔄 Oxirgi transferlar
				</div>
				<button
					className='btn-icon'
					onClick={() => setTab('transfers')}
					style={{
						color: '#7367f0',
						background: 'rgba(115,103,240,.1)',
						borderColor: 'rgba(115,103,240,.2)',
					}}
				>
					Barchasi →
				</button>
			</div>
			<div className='table-wrap'>
				<table className='crm-table'>
					<thead>
						<tr>
							<th>ID</th>
							<th>Filial</th>
							<th>Qiymat</th>
							<th>Status</th>
							<th className='hide-mobile'>Sana</th>
						</tr>
					</thead>
					<tbody>
						{transfers.slice(0, 6).map((t: any) => {
							const st = ST_CFG[t.status as keyof typeof ST_CFG]
							return (
								<tr key={t.id}>
									<td>
										<span
											style={{
												fontFamily: 'monospace',
												fontSize: 11,
												color: '#7367f0',
												background: 'rgba(115,103,240,.08)',
												padding: '2px 8px',
												borderRadius: 6,
											}}
										>
											{t.id.slice(-8)}
										</span>
									</td>
									<td>
										{BICON[t.toBranch]} {BNAME[t.toBranch]}
									</td>
									<td style={{ color: '#3fb950', fontWeight: 800 }}>
										{fmtM(t.totalValue)}
									</td>
									<td>
										<span
											className='badge'
											style={{ background: st.bg, color: st.c }}
										>
											{st.i} {st.l}
										</span>
									</td>
									<td
										className='hide-mobile'
										style={{ fontSize: 11, color: 'var(--app-muted)' }}
									>
										{fmtD(t.createdAt)}
									</td>
								</tr>
							)
						})}
						{transfers.length === 0 && (
							<tr>
								<td
									colSpan={5}
									style={{
										textAlign: 'center',
										color: 'var(--app-muted)',
										padding: 32,
									}}
								>
									Transfer yo'q
								</td>
							</tr>
						)}
					</tbody>
				</table>
			</div>
		</PageWrap>
	)
}

function sourceHash(text: string) {
	let hash = 2166136261
	for (let index = 0; index < text.length; index++) {
		hash ^= text.charCodeAt(index)
		hash = Math.imul(hash, 16777619)
	}
	return (hash >>> 0).toString(36)
}

async function parseShopWorkbook(
	file: File,
	products: Product[],
): Promise<ParsedShopSale[]> {
	const ExcelJS = (await import('exceljs')).default
	const workbook = new ExcelJS.Workbook()
	await workbook.xlsx.load(await file.arrayBuffer())
	const worksheet = workbook.worksheets[0]
	const rows: any[][] = []
	worksheet.eachRow({ includeEmpty: true }, row => {
		rows.push(
			Array.from({ length: worksheet.columnCount }, (_, index) => {
				const cell = row.getCell(index + 1)
				return index === 0 ? cell.text.trim() : cell.value
			}),
		)
	})
	const headerIndex = rows.findIndex((row, index) => {
		const next = rows[index + 1]
		return (
			index < 10 &&
			Boolean(row?.[0]) &&
			Boolean(next?.[0]) &&
			Number(next?.[6]) > 0 &&
			!Number(row?.[6])
		)
	})
	if (headerIndex < 0) throw new Error('Excel savdo ustunlari tanilmadi')

	return rows.slice(headerIndex + 1).flatMap(row => {
		const barcode = String(row?.[0] ?? '').trim()
		const sourceName = String(row?.[1] ?? '').trim()
		const quantity = Number(row?.[6] || 0)
		if (!barcode || !sourceName || quantity <= 0) return []
		const product = products.find(item => item.qrCode?.trim() === barcode)
		return [
			{
				barcode,
				sourceName,
				supplier: String(row?.[2] ?? '').trim(),
				quantity,
				salesAmount: Number(row?.[16] ?? row?.[3] ?? 0),
				averagePrice: Number(row?.[7] || 0),
				costAmount: Number(row?.[24] || 0),
				profitAmount: Number(row?.[25] || 0),
				productId: product?.id || '',
			},
		]
	})
}

function ShopSalesTab({
	products,
	shopStock,
	shopSales,
	fetchAll,
	showToast,
	setTab,
}: any) {
	const [showImport, setShowImport] = useState(false)
	const [rows, setRows] = useState<ParsedShopSale[]>([])
	const [fileName, setFileName] = useState('')
	const [sourceKey, setSourceKey] = useState('')
	const [importDate, setImportDate] = useState('')
	const [reading, setReading] = useState(false)
	const [saving, setSaving] = useState(false)
	const [dateFilter, setDateFilter] = useState('all')
	const [detail, setDetail] = useState<ShopSaleImport | null>(null)

	const imports = shopSales as ShopSaleImport[]
	const filteredImports =
		dateFilter === 'all'
			? imports
			: imports.filter(item => item.saleDate === dateFilter)
	const totalSales = filteredImports.reduce(
		(sum, item) => sum + item.totalSales,
		0,
	)
	const totalCost = filteredImports.reduce(
		(sum, item) => sum + item.totalCost,
		0,
	)
	const totalProfit = filteredImports.reduce(
		(sum, item) => sum + item.totalProfit,
		0,
	)
	const totalQuantity = filteredImports.reduce(
		(sum, item) => sum + item.totalQuantity,
		0,
	)
	const margin = totalSales > 0 ? (totalProfit / totalSales) * 100 : 0

	const daily = Object.values(
		imports.reduce(
			(
				map: Record<
					string,
					{ date: string; sales: number; profit: number; quantity: number }
				>,
				item,
			) => {
				const current = map[item.saleDate] || {
					date: item.saleDate,
					sales: 0,
					profit: 0,
					quantity: 0,
				}
				current.sales += item.totalSales
				current.profit += item.totalProfit
				current.quantity += item.totalQuantity
				map[item.saleDate] = current
				return map
			},
			{},
		),
	).sort((a, b) => b.date.localeCompare(a.date))
	const maxDaily = Math.max(1, ...daily.map(item => item.sales))

	const productStats = Object.values(
		filteredImports
			.flatMap(item => item.items)
			.reduce(
				(
					map: Record<
						string,
						{
							id: string
							name: string
							barcode: string
							quantity: number
							sales: number
							profit: number
						}
					>,
					item,
				) => {
					const current = map[item.productId] || {
						id: item.productId,
						name: item.productName,
						barcode: item.barcode,
						quantity: 0,
						sales: 0,
						profit: 0,
					}
					current.quantity += item.quantity
					current.sales += item.salesAmount
					current.profit += item.profitAmount
					map[item.productId] = current
					return map
				},
				{},
			),
	).sort((a, b) => b.sales - a.sales)
	const matchedRows = rows.filter(row => row.productId)
	const unmatchedRows = rows.filter(row => !row.productId)
	const matchedSales = matchedRows.reduce(
		(sum, row) => sum + row.salesAmount,
		0,
	)

	const resetImport = () => {
		setRows([])
		setFileName('')
		setSourceKey('')
		setShowImport(false)
	}

	const readFile = async (file?: File) => {
		if (!file) return
		if (!importDate) {
			showToast('Avval asosiy sahifada import sanasini tanlang', 'error')
			return
		}
		if (!/\.xlsx$/i.test(file.name)) {
			showToast('Faqat Excel .xlsx fayl tanlang', 'error')
			return
		}
		setReading(true)
		try {
			const parsed = await parseShopWorkbook(file, products)
			if (!parsed.length)
				throw new Error('Sotilgan mahsulot qatorlari topilmadi')
			const fingerprint = sourceHash(
				parsed
					.map(item => `${item.barcode}:${item.quantity}:${item.salesAmount}`)
					.join('|'),
			)
			setRows(parsed)
			setFileName(file.name)
			setSourceKey(fingerprint)
			setShowImport(true)
		} catch (error: any) {
			showToast(error?.message || "Excel faylni o'qib bo'lmadi", 'error')
		} finally {
			setReading(false)
		}
	}

	const submitImport = async () => {
		if (!importDate) {
			showToast('Import sanasini tanlang', 'error')
			return
		}
		if (!matchedRows.length) {
			showToast('Excelda sklad bazasiga mos shtrix-kod topilmadi', 'error')
			return
		}
		setSaving(true)
		const result = await importShopSalesApi({
			sourceKey,
			fileName,
			saleDate: importDate,
			rows: matchedRows,
			skippedRows: unmatchedRows.map(row => ({
				barcode: row.barcode,
				sourceName: row.sourceName,
				quantity: row.quantity,
			})),
		})
		if (result.success) {
			showToast(
				`${matchedRows.length} ta mahsulot skladdan ayrildi${unmatchedRows.length ? `, ${unmatchedRows.length} ta topilmadi` : ''}`,
			)
			resetImport()
			fetchAll()
		} else showToast(result.message || 'Import amalga oshmadi', 'error')
		setSaving(false)
	}

	return (
		<PageWrap
			title={
				<span style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
					<button
						className='topbar-control'
						onClick={() => setTab('dashboard')}
						title='Dashboardga qaytish'
					>
						<ArrowLeft size={18} />
					</button>{' '}
					Do'kon savdo tahlili
				</span>
			}
			sub='Excel savdolar, foyda va sklad harakati'
			action={
				<label
					className='btn-primary'
					style={{
						display: 'inline-flex',
						alignItems: 'center',
						gap: 8,
						cursor: 'pointer',
					}}
				>
					<Upload size={17} />
					{reading ? "O'qilmoqda..." : 'Excel import'}
					<input
						type='file'
						accept='.xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
						onChange={event => readFile(event.target.files?.[0])}
						disabled={reading}
						style={{ display: 'none' }}
					/>
				</label>
			}
		>
			<div className='sales-filter-row'>
				<div>
					<div className='form-label' style={{ marginBottom: 6 }}>
						IMPORT SANASI
					</div>
					<input
						className='crm-input'
						type='date'
						value={importDate}
						onChange={event => setImportDate(event.target.value)}
						style={{ minWidth: 190 }}
					/>
				</div>
				<div>
					<div className='form-label' style={{ marginBottom: 6 }}>
						DAVR BO'YICHA QIDIRISH
					</div>
					<select
						className='crm-input'
						value={dateFilter}
						onChange={event => setDateFilter(event.target.value)}
						style={{ minWidth: 190 }}
					>
						<option value='all'>Barcha sanalar</option>
						{daily.map(item => (
							<option key={item.date} value={item.date}>
								{fmtDate(`${item.date}T12:00:00`)}
							</option>
						))}
					</select>
				</div>
				<div
					style={{
						fontSize: 12,
						color: 'var(--app-muted)',
						alignSelf: 'end',
						paddingBottom: 10,
					}}
				>
					{filteredImports.length} ta import
				</div>
			</div>

			<div className='shop-kpi-grid'>
				{[
					{
						label: 'Jami savdo',
						value: fmtKRW(totalSales),
						color: '#3b82f6',
						icon: <TrendingUp size={20} />,
					},
					{
						label: 'Sof foyda',
						value: fmtKRW(totalProfit),
						color: totalProfit >= 0 ? '#28c76f' : '#ea5455',
						icon: <span>₩</span>,
					},
					{
						label: 'Foyda marjasi',
						value: `${margin.toFixed(1)}%`,
						color: '#7367f0',
						icon: <span>%</span>,
					},
					{
						label: 'Sotilgan',
						value: `${fmt(totalQuantity)} dona`,
						color: '#ff9f43',
						icon: <Package size={20} />,
					},
				].map(item => (
					<div key={item.label} className='sales-kpi'>
						<div
							className='sales-kpi-icon'
							style={{ color: item.color, background: `${item.color}16` }}
						>
							{item.icon}
						</div>
						<div>
							<div
								style={{
									fontSize: 11,
									color: 'var(--app-muted)',
									fontWeight: 700,
								}}
							>
								{item.label}
							</div>
							<div
								style={{
									fontSize: 18,
									fontWeight: 900,
									color: item.color,
									marginTop: 4,
								}}
							>
								{item.value}
							</div>
						</div>
					</div>
				))}
			</div>

			<div className='shop-sales-layout'>
				<section className='sales-panel'>
					<div className='sales-panel-head'>
						<div>
							<div className='sales-panel-title'>Kunlik natija</div>
							<div className='sales-panel-sub'>Savdo va foyda dinamikasi</div>
						</div>
					</div>
					<div className='daily-chart'>
						{daily
							.slice(0, 14)
							.reverse()
							.map(item => (
								<button
									key={item.date}
									className='daily-bar-item'
									onClick={() => setDateFilter(item.date)}
									title={`${item.date}: ${fmtKRW(item.sales)}`}
								>
									<div className='daily-bar-value'>{fmt(item.sales)}</div>
									<div className='daily-bar-track'>
										<div
											className='daily-bar-fill'
											style={{
												height: `${Math.max(8, (item.sales / maxDaily) * 100)}%`,
											}}
										/>
									</div>
									<div className='daily-bar-date'>
										{item.date.slice(5).replace('-', '/')}
									</div>
								</button>
							))}
						{!daily.length && (
							<div className='empty-sales'>
								<FileSpreadsheet size={34} />
								<strong>Hali savdo import qilinmagan</strong>
								<span>Excel faylni yuklang</span>
							</div>
						)}
					</div>
				</section>

				<section className='sales-panel'>
					<div className='sales-panel-head'>
						<div>
							<div className='sales-panel-title'>Importlar tarixi</div>
							<div className='sales-panel-sub'>Skladga qo'llangan fayllar</div>
						</div>
					</div>
					<div className='import-history'>
						{imports.slice(0, 8).map(item => (
							<button
								key={item.id}
								className='import-history-row'
								onClick={() => setDetail(item)}
							>
								<div className='file-square'>
									<FileSpreadsheet size={18} />
								</div>
								<div style={{ minWidth: 0, flex: 1 }}>
									<div className='history-file'>{item.fileName}</div>
									<div className='history-meta'>
										{fmtDate(`${item.saleDate}T12:00:00`)} · {item.items.length}{' '}
										mahsulot
									</div>
								</div>
								<div style={{ textAlign: 'right' }}>
									<div
										style={{ fontWeight: 900, color: '#28c76f', fontSize: 13 }}
									>
										{fmtKRW(item.totalProfit)}
									</div>
									<div style={{ fontSize: 10, color: 'var(--app-muted)' }}>
										{fmt(item.totalQuantity)} dona
									</div>
								</div>
							</button>
						))}
						{!imports.length && (
							<div
								style={{
									padding: 28,
									textAlign: 'center',
									color: 'var(--app-muted)',
									fontSize: 13,
								}}
							>
								Importlar yo'q
							</div>
						)}
					</div>
				</section>
			</div>

			<section className='sales-panel' style={{ marginTop: 16 }}>
				<div className='sales-panel-head'>
					<div>
						<div className='sales-panel-title'>Mahsulotlar bo'yicha savdo</div>
						<div className='sales-panel-sub'>Tanlangan davr natijalari</div>
					</div>
				</div>
				<div className='table-wrap'>
					<table className='crm-table'>
						<thead>
							<tr>
								<th>Mahsulot</th>
								<th>Shtrix-kod</th>
								<th>Sotildi</th>
								<th>Savdo</th>
								<th>Foyda</th>
								<th>Do'kon skladi</th>
							</tr>
						</thead>
						<tbody>
							{productStats.map(item => (
								<tr key={item.id}>
									<td style={{ fontWeight: 800 }}>{item.name}</td>
									<td
										style={{
											fontFamily: 'monospace',
											fontSize: 11,
											color: 'var(--app-muted)',
										}}
									>
										{item.barcode}
									</td>
									<td>{fmt(item.quantity)}</td>
									<td style={{ fontWeight: 800 }}>{fmtKRW(item.sales)}</td>
									<td
										style={{
											fontWeight: 900,
											color: item.profit >= 0 ? '#28c76f' : '#ea5455',
										}}
									>
										{fmtKRW(item.profit)}
									</td>
									<td
										style={{
											fontWeight: 800,
											color:
												(shopStock[item.id] || 0) < 0
													? '#ea5455'
													: 'var(--app-text)',
										}}
									>
										{fmt(shopStock[item.id] || 0)}
									</td>
								</tr>
							))}
							{!productStats.length && (
								<tr>
									<td
										colSpan={6}
										style={{
											padding: 36,
											textAlign: 'center',
											color: 'var(--app-muted)',
										}}
									>
										Tanlangan davrda savdo yo'q
									</td>
								</tr>
							)}
						</tbody>
					</table>
				</div>
			</section>

			{showImport && (
				<Modal onClose={resetImport}>
					<div
						className='modal-title'
						style={{ display: 'flex', alignItems: 'center', gap: 9 }}
					>
						<FileSpreadsheet size={20} /> Excel importni tekshirish
					</div>
					<div className='import-summary-grid'>
						<div>
							<span>Fayl</span>
							<strong title={fileName}>{fileName}</strong>
						</div>
						<div>
							<span>Savdo sanasi</span>
							<strong>{fmtDate(`${importDate}T12:00:00`)}</strong>
						</div>
						<div>
							<span>Topildi</span>
							<strong style={{ color: '#28c76f' }}>
								{matchedRows.length} ta
							</strong>
						</div>
						<div>
							<span>Topilmadi</span>
							<strong
								style={{ color: unmatchedRows.length ? '#ea5455' : '#28c76f' }}
							>
								{unmatchedRows.length} ta
							</strong>
						</div>
					</div>
					<div className='import-preview'>
						{rows.map((row, index) => {
							const product = products.find(
								(item: Product) => item.id === row.productId,
							)
							return (
								<div
									key={`${row.barcode}-${index}`}
									className={`mapping-row${row.productId ? ' matched' : ' unresolved'}`}
								>
									<div style={{ minWidth: 0 }}>
										<div
											style={{
												fontWeight: 800,
												overflow: 'hidden',
												textOverflow: 'ellipsis',
												whiteSpace: 'nowrap',
											}}
										>
											{row.sourceName}
										</div>
										<div
											style={{
												fontFamily: 'monospace',
												fontSize: 11,
												color: 'var(--app-muted)',
												marginTop: 3,
											}}
										>
											{row.barcode} · {fmt(row.quantity)} dona
										</div>
									</div>
									<div style={{ fontWeight: 800, textAlign: 'right' }}>
										{fmtKRW(row.salesAmount)}
									</div>
									<div
										className='barcode-match-status'
										style={{ color: product ? '#28c76f' : '#ea5455' }}
									>
										{product
											? `✓ ${product.name}`
											: "Topilmadi · skladga ta'sir qilmaydi"}
									</div>
								</div>
							)
						})}
					</div>
					<div className='import-warning'>
						Faqat shtrix-kodi bazadagi mahsulot bilan aynan mos kelgan qatorlar
						Do'kon skladidan ayiriladi. Topilmagan qatorlar o‘tkazib yuboriladi.
					</div>
					<div style={{ display: 'flex', gap: 10 }}>
						<button
							className='btn-ghost'
							onClick={resetImport}
							style={{ flex: 1 }}
						>
							Bekor
						</button>
						<button
							className='btn-primary'
							onClick={submitImport}
							disabled={saving || !importDate || !matchedRows.length}
							style={{ flex: 2 }}
						>
							{saving
								? 'Saqlanmoqda...'
								: `Import qilish · ${matchedRows.length} mahsulot · ${fmtKRW(matchedSales)}`}
						</button>
					</div>
				</Modal>
			)}

			{detail && (
				<Modal onClose={() => setDetail(null)}>
					<div className='modal-title'>
						{fmtDate(`${detail.saleDate}T12:00:00`)} savdosi
					</div>
					<div className='import-summary-grid'>
						<div>
							<span>Savdo</span>
							<strong>{fmtKRW(detail.totalSales)}</strong>
						</div>
						<div>
							<span>Tannarx</span>
							<strong>{fmtKRW(detail.totalCost)}</strong>
						</div>
						<div>
							<span>Foyda</span>
							<strong
								style={{
									color: detail.totalProfit >= 0 ? '#28c76f' : '#ea5455',
								}}
							>
								{fmtKRW(detail.totalProfit)}
							</strong>
						</div>
						<div>
							<span>Sotildi</span>
							<strong>{fmt(detail.totalQuantity)} dona</strong>
						</div>
					</div>
					{!!detail.skippedRows?.length && (
						<div className='import-warning'>
							{detail.skippedRows.length} ta shtrix-kod bazada topilmagani uchun
							skladga qo'llanmagan.
						</div>
					)}
					<div className='import-preview'>
						{detail.items.map(item => (
							<div
								key={`${detail.id}-${item.barcode}`}
								className='mapping-row matched'
							>
								<div>
									<div style={{ fontWeight: 800 }}>{item.productName}</div>
									<div
										style={{
											fontSize: 11,
											color: 'var(--app-muted)',
											marginTop: 3,
										}}
									>
										{item.barcode} · {fmt(item.quantity)} dona
									</div>
								</div>
								<div style={{ textAlign: 'right' }}>
									<div style={{ fontWeight: 800 }}>
										{fmtKRW(item.salesAmount)}
									</div>
									<div
										style={{
											fontSize: 11,
											color: item.profitAmount >= 0 ? '#28c76f' : '#ea5455',
										}}
									>
										{fmtKRW(item.profitAmount)} foyda
									</div>
								</div>
								<div
									style={{
										textAlign: 'right',
										fontSize: 12,
										color: item.shortage > 0 ? '#ea5455' : 'var(--app-muted)',
									}}
								>
									Sklad {fmt(item.stockBefore)} → {fmt(item.stockAfter)}
								</div>
							</div>
						))}
					</div>
					<button
						className='btn-primary'
						onClick={() => setDetail(null)}
						style={{ width: '100%' }}
					>
						Yopish
					</button>
				</Modal>
			)}
		</PageWrap>
	)
}

// ════════════════════════════════════════════════════════════
// SKLAD
// ════════════════════════════════════════════════════════════
function WarehouseTab({ products, stock, user, fetchAll, showToast, t }: any) {
	const [search, setSearch] = useState('')
	const [editP, setEditP] = useState<Product | null>(null)
	const [newQty, setNewQty] = useState('')
	const isSA = user.role === 'superadmin'
	const totalVal = products.reduce(
		(s: number, p: Product) => s + (stock[p.id] || 0) * p.pricePerUnit,
		0,
	)
	const filtered = products.filter((p: Product) =>
		p.name.toLowerCase().includes(search.toLowerCase()),
	)
	const lowStock = filtered.filter(
		(p: Product) => (stock[p.id] || 0) <= p.minStock,
	).length

	const saveStock = async () => {
		if (!editP) return
		const qty = parseFloat(newQty)
		if (isNaN(qty) || qty < 0) {
			showToast("Noto'g'ri miqdor", 'error')
			return
		}
		const d = await updateStockApi(editP.id, qty)
		if (d.success) {
			showToast('Sklad yangilandi')
			setEditP(null)
			fetchAll()
		} else showToast('Xatolik', 'error')
	}

	const qtyColor = (qty: number, min: number) =>
		qty <= min ? '#f85149' : qty <= min * 2 ? '#f0a500' : '#3fb950'

	return (
		<PageWrap
			title='📦 Sklad'
			sub={
				<>
					Jami: <strong style={{ color: '#3fb950' }}>{fmtM(totalVal)}</strong>{' '}
					{lowStock > 0 && (
						<span style={{ color: '#f85149', marginLeft: 8 }}>
							⚠️ {lowStock} ta kam
						</span>
					)}
				</>
			}
		>
			{editP && (
				<Modal onClose={() => setEditP(null)}>
					<div className='modal-title'>{t.editStock}</div>
					<div
						style={{
							background: 'var(--app-panel-soft)',
							borderRadius: 12,
							padding: 14,
							marginBottom: 18,
							display: 'flex',
							justifyContent: 'space-between',
							alignItems: 'center',
						}}
					>
						<div>
							<div style={{ fontWeight: 800, fontSize: 15 }}>{editP.name}</div>
							<div
								style={{
									fontSize: 12,
									color: 'var(--app-muted)',
									marginTop: 2,
								}}
							>
								Hozirgi:{' '}
								<strong style={{ color: '#f0a500' }}>
									{fmt(stock[editP.id] || 0)} {editP.unit}
								</strong>
							</div>
						</div>
						<div style={{ fontSize: 32 }}>
							{(stock[editP.id] || 0) <= editP.minStock ? '🔴' : '🟢'}
						</div>
					</div>
					<div className='form-group'>
						<label className='form-label'>YANGI MIQDOR ({editP.unit})</label>
						<input
							className='crm-input'
							type='number'
							value={newQty}
							onChange={e => setNewQty(e.target.value)}
							onKeyDown={e => e.key === 'Enter' && saveStock()}
							autoFocus
						/>
					</div>
					<div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
						<button
							className='btn-ghost'
							onClick={() => setEditP(null)}
							style={{ flex: 1 }}
						>
							{t.cancel}
						</button>
						<button
							className='btn-primary'
							onClick={saveStock}
							style={{ flex: 2 }}
						>{`💾 ${t.save}`}</button>
					</div>
				</Modal>
			)}

			<div style={{ marginBottom: 16, maxWidth: 320 }}>
				<input
					className='crm-input'
					placeholder={`🔍 ${t.searchProduct}`}
					value={search}
					onChange={e => setSearch(e.target.value)}
				/>
			</div>

			<div className='table-wrap'>
				<table className='crm-table'>
					<thead>
						<tr>
							<th>#</th>
							<th>Mahsulot</th>
							<th className='hide-mobile'>Kategoriya</th>
							<th>Birlik</th>
							<th>Sklad</th>
							<th>Holat</th>
							{isSA && <th>Amal</th>}
						</tr>
					</thead>
					<tbody>
						{filtered.map((p: Product, i: number) => {
							const qty = stock[p.id] || 0
							const c = qtyColor(qty, p.minStock)
							const badge =
								qty <= p.minStock
									? '🔴 Kam'
									: qty <= p.minStock * 2
										? "🟡 O'rta"
										: '🟢 Yaxshi'
							return (
								<tr key={p.id}>
									<td
										style={{
											color: 'var(--app-muted)',
											fontSize: 11,
											width: 36,
										}}
									>
										{i + 1}
									</td>
									<td style={{ fontWeight: 700 }}>{p.name}</td>
									<td
										className='hide-mobile'
										style={{ fontSize: 12, color: 'var(--app-muted)' }}
									>
										{p.category}
									</td>
									<td style={{ color: 'var(--app-muted)', fontSize: 12 }}>
										{p.unit}
									</td>
									<td>
										<span style={{ fontWeight: 900, color: c, fontSize: 15 }}>
											{fmt(qty)}
										</span>
									</td>
									<td>
										<span
											className='badge'
											style={{ background: `${c}18`, color: c }}
										>
											{badge}
										</span>
									</td>
									{isSA && (
										<td>
											<button
												className='btn-icon'
												onClick={() => {
													setEditP(p)
													setNewQty(String(stock[p.id] || 0))
												}}
												style={{
													color: '#7367f0',
													background: 'rgba(115,103,240,.1)',
													borderColor: 'rgba(115,103,240,.2)',
												}}
											>
												{t.edit}
											</button>
										</td>
									)}
								</tr>
							)
						})}
						{filtered.length === 0 && (
							<tr>
								<td
									colSpan={7}
									style={{
										textAlign: 'center',
										color: 'var(--app-muted)',
										padding: 40,
									}}
								>
									Mahsulot topilmadi
								</td>
							</tr>
						)}
					</tbody>
				</table>
			</div>
		</PageWrap>
	)
}

// ════════════════════════════════════════════════════════════
// TRANSFERLAR
// ════════════════════════════════════════════════════════════
function TransfersTab({
	transfers,
	products,
	user,
	fetchAll,
	showToast,
	t,
}: any) {
	const [showModal, setShowModal] = useState(false)
	const [detail, setDetail] = useState<any>(null)
	const [form, setForm] = useState({ toBranch: 'restaurant1', note: '' })
	const [items, setItems] = useState([{ pid: '', qty: 1 }])
	const [loading, setLoading] = useState(false)
	const isSA = user.role === 'superadmin'

	const submit = async () => {
		const valid = items.filter(i => i.pid && i.qty > 0)
		if (!valid.length) {
			showToast('Mahsulot tanlang', 'error')
			return
		}
		setLoading(true)
		const d = await createTransferApi(
			form.toBranch,
			valid.map(i => ({ productId: i.pid, quantity: i.qty })),
			user.name,
			form.note,
		)
		if (d.success) {
			showToast("So'rov yuborildi! ✅")
			setShowModal(false)
			setItems([{ pid: '', qty: 1 }])
			fetchAll()
		} else showToast(d.message || 'Xatolik', 'error')
		setLoading(false)
	}

	const approve = async (id: string) => {
		const d = await approveTransferApi(id, user.name)
		if (d.success) {
			showToast('Tasdiqlandi!')
			fetchAll()
		} else showToast(d.message || 'Xatolik', 'error')
	}
	const reject = async (id: string) => {
		const d = await rejectTransferApi(id, user.name)
		if (d.success) {
			showToast('Rad etildi')
			fetchAll()
		} else showToast(d.message || 'Xatolik', 'error')
	}

	const groups = {
		pending: transfers.filter((t: any) => t.status === 'pending'),
		other: transfers.filter((t: any) => t.status !== 'pending'),
	}

	return (
		<PageWrap
			title='🔄 Transferlar'
			action={
				!isSA && (
					<button className='btn-primary' onClick={() => setShowModal(true)}>
						+ Yangi so'rov
					</button>
				)
			}
		>
			{showModal && (
				<Modal onClose={() => setShowModal(false)}>
					<div className='modal-title'>📤 Transfer so'rovi</div>
					<div className='form-group'>
						<label className='form-label'>FILIAL</label>
						<select
							className='crm-input'
							value={form.toBranch}
							onChange={e => setForm({ ...form, toBranch: e.target.value })}
						>
							{Object.entries(BNAME)
								.filter(([k]) => k !== 'main')
								.map(([k, v]) => (
									<option key={k} value={k}>
										{BICON[k]} {v}
									</option>
								))}
						</select>
					</div>
					<div className='form-group'>
						<label className='form-label'>MAHSULOTLAR</label>
						{items.map((item, i) => (
							<div
								key={i}
								style={{
									display: 'grid',
									gridTemplateColumns: '1fr 90px 36px',
									gap: 8,
									marginBottom: 8,
								}}
							>
								<select
									className='crm-input'
									value={item.pid}
									onChange={e => {
										const n = [...items]
										n[i].pid = e.target.value
										setItems(n)
									}}
								>
									<option value=''>Mahsulot tanlang</option>
									{products.map((p: Product) => (
										<option key={p.id} value={p.id}>
											{p.name} ({p.unit})
										</option>
									))}
								</select>
								<input
									className='crm-input'
									type='number'
									value={item.qty}
									min={1}
									onChange={e => {
										const n = [...items]
										n[i].qty = parseFloat(e.target.value) || 1
										setItems(n)
									}}
								/>
								<button
									onClick={() => setItems(items.filter((_, idx) => idx !== i))}
									style={{
										background: 'rgba(248,81,73,.1)',
										border: '1.5px solid rgba(248,81,73,.25)',
										color: '#f85149',
										borderRadius: 9,
										cursor: 'pointer',
										fontWeight: 900,
										fontSize: 16,
									}}
								>
									×
								</button>
							</div>
						))}
						<button
							onClick={() => setItems([...items, { pid: '', qty: 1 }])}
							style={{
								width: '100%',
								padding: '9px',
								borderRadius: 10,
								border: '1.5px dashed rgba(115,103,240,.4)',
								background: 'rgba(115,103,240,.05)',
								color: '#7367f0',
								cursor: 'pointer',
								fontWeight: 700,
								fontSize: 13,
								fontFamily: 'inherit',
							}}
						>
							+ Mahsulot qo'shish
						</button>
					</div>
					<div className='form-group'>
						<label className='form-label'>ESLATMA</label>
						<textarea
							className='crm-input'
							value={form.note}
							onChange={e => setForm({ ...form, note: e.target.value })}
							rows={2}
							style={{ resize: 'vertical' }}
						/>
					</div>
					<div style={{ display: 'flex', gap: 10 }}>
						<button
							className='btn-ghost'
							onClick={() => setShowModal(false)}
							style={{ flex: 1 }}
						>
							{t.cancel}
						</button>
						<button
							className='btn-primary'
							onClick={submit}
							disabled={loading}
							style={{ flex: 2 }}
						>
							{loading ? 'Yuborilmoqda...' : `📤 ${t.send}`}
						</button>
					</div>
				</Modal>
			)}

			{detail && (
				<Modal onClose={() => setDetail(null)}>
					<div
						style={{
							display: 'flex',
							justifyContent: 'space-between',
							alignItems: 'flex-start',
							marginBottom: 18,
						}}
					>
						<div className='modal-title' style={{ margin: 0 }}>
							Transfer #{detail.id.slice(-8)}
						</div>
						<span
							className='badge'
							style={{
								background: ST_CFG[detail.status as keyof typeof ST_CFG].bg,
								color: ST_CFG[detail.status as keyof typeof ST_CFG].c,
							}}
						>
							{ST_CFG[detail.status as keyof typeof ST_CFG].i}{' '}
							{ST_CFG[detail.status as keyof typeof ST_CFG].l}
						</span>
					</div>
					<div
						style={{
							display: 'grid',
							gridTemplateColumns: '1fr 1fr',
							gap: 10,
							marginBottom: 18,
						}}
					>
						{[
							['Filial', `${BICON[detail.toBranch]} ${BNAME[detail.toBranch]}`],
							["So'ragan", detail.requestedBy],
							['Sana', fmtD(detail.createdAt)],
							['Tasdiqlagan', detail.approvedBy || '—'],
						].map(([l, v]) => (
							<div
								key={String(l)}
								style={{
									background: 'var(--app-panel-soft)',
									borderRadius: 11,
									padding: '11px 13px',
								}}
							>
								<div
									style={{
										fontSize: 10,
										color: 'var(--app-muted)',
										marginBottom: 4,
										fontWeight: 700,
									}}
								>
									{l}
								</div>
								<div style={{ fontWeight: 700 }}>{v}</div>
							</div>
						))}
					</div>
					<div
						style={{
							background: 'var(--app-panel-soft)',
							borderRadius: 12,
							padding: 14,
							marginBottom: 14,
						}}
					>
						{detail.items.map((it: any, i: number) => (
							<div
								key={i}
								style={{
									display: 'flex',
									justifyContent: 'space-between',
									padding: '8px 0',
									borderBottom:
										i < detail.items.length - 1
											? '1px solid var(--app-border)'
											: 'none',
								}}
							>
								<span style={{ fontWeight: 700 }}>{it.productName}</span>
								<span style={{ color: 'var(--app-muted)' }}>
									{fmt(it.quantity)} {it.unit}
								</span>
							</div>
						))}
					</div>
					<div
						style={{
							display: 'flex',
							justifyContent: 'space-between',
							padding: '10px 0',
							borderTop: '1px solid var(--app-border)',
							marginBottom: 16,
						}}
					>
						<span style={{ fontWeight: 700, color: 'var(--app-muted)' }}>
							Jami qiymat
						</span>
						<span style={{ fontWeight: 900, color: '#3fb950', fontSize: 16 }}>
							{fmtM(detail.totalValue)}
						</span>
					</div>
					{isSA && detail.status === 'pending' && (
						<div style={{ display: 'flex', gap: 10 }}>
							<button
								onClick={() => {
									reject(detail.id)
									setDetail(null)
								}}
								style={{
									flex: 1,
									padding: '12px',
									borderRadius: 11,
									border: '1.5px solid rgba(248,81,73,.3)',
									background: 'rgba(248,81,73,.1)',
									color: '#f85149',
									fontWeight: 800,
									cursor: 'pointer',
									fontFamily: 'inherit',
								}}
							>
								❌ Rad etish
							</button>
							<button
								onClick={() => {
									approve(detail.id)
									setDetail(null)
								}}
								style={{
									flex: 2,
									padding: '12px',
									borderRadius: 11,
									border: 'none',
									background: 'linear-gradient(135deg,#3fb950,#27a73c)',
									color: '#fff',
									fontWeight: 800,
									cursor: 'pointer',
									fontFamily: 'inherit',
								}}
							>
								✅ Tasdiqlash
							</button>
						</div>
					)}
				</Modal>
			)}

			{/* Pending section */}
			{groups.pending.length > 0 && (
				<div style={{ marginBottom: 24 }}>
					<div
						style={{
							fontSize: 13,
							fontWeight: 800,
							color: '#f0a500',
							marginBottom: 12,
							display: 'flex',
							alignItems: 'center',
							gap: 6,
						}}
					>
						⏳ Kutilayotgan{' '}
						<span
							style={{
								background: 'rgba(240,165,0,.15)',
								padding: '2px 8px',
								borderRadius: 12,
							}}
						>
							{groups.pending.length}
						</span>
					</div>
					<div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
						{groups.pending.map((t: any) => (
							<TransferCard
								key={t.id}
								t={t}
								isSA={isSA}
								onDetail={() => setDetail(t)}
								onApprove={() => approve(t.id)}
								onReject={() => reject(t.id)}
							/>
						))}
					</div>
				</div>
			)}

			<div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
				{groups.other.map((t: any) => (
					<TransferCard
						key={t.id}
						t={t}
						isSA={isSA}
						onDetail={() => setDetail(t)}
						onApprove={() => approve(t.id)}
						onReject={() => reject(t.id)}
					/>
				))}
				{transfers.length === 0 && (
					<div
						style={{
							textAlign: 'center',
							padding: 60,
							color: 'var(--app-muted)',
						}}
					>
						Transfer yo'q
					</div>
				)}
			</div>
		</PageWrap>
	)
}

function TransferCard({ t, isSA, onDetail, onApprove, onReject, lang }: any) {
	const st = ST_CFG[t.status as keyof typeof ST_CFG]
	return (
		<div
			style={{
				background: 'var(--app-panel)',
				border: '1px solid var(--app-border)',
				borderRadius: 14,
				padding: '14px 18px',
				display: 'flex',
				justifyContent: 'space-between',
				alignItems: 'center',
				flexWrap: 'wrap',
				gap: 12,
				transition: 'all .2s',
			}}
			onMouseEnter={e =>
				(e.currentTarget.style.borderColor = 'rgba(115,103,240,.3)')
			}
			onMouseLeave={e =>
				(e.currentTarget.style.borderColor = 'var(--app-border)')
			}
		>
			<div>
				<div
					style={{
						fontWeight: 800,
						marginBottom: 4,
						display: 'flex',
						alignItems: 'center',
						gap: 8,
					}}
				>
					{BICON[t.toBranch]} {BNAME[t.toBranch]}
					<span
						style={{
							fontFamily: 'monospace',
							fontSize: 10,
							color: 'var(--app-muted)',
							background: 'var(--app-panel-soft)',
							padding: '2px 7px',
							borderRadius: 6,
						}}
					>
						{t.id.slice(-8)}
					</span>
				</div>
				<div style={{ fontSize: 12, color: 'var(--app-muted)' }}>
					{fmtD(t.createdAt)} · {t.items.length} mahsulot ·{' '}
					<strong style={{ color: '#3fb950' }}>{fmtM(t.totalValue)}</strong>
				</div>
			</div>
			<div
				style={{
					display: 'flex',
					gap: 8,
					alignItems: 'center',
					flexWrap: 'wrap',
				}}
			>
				<span className='badge' style={{ background: st.bg, color: st.c }}>
					{st.i} {st.l}
				</span>
				<button
					className='btn-icon'
					onClick={onDetail}
					style={{
						color: '#7367f0',
						background: 'rgba(115,103,240,.1)',
						borderColor: 'rgba(115,103,240,.2)',
					}}
				>
					Ko'rish
				</button>
				{isSA && t.status === 'pending' && (
					<>
						<button
							className='btn-icon'
							onClick={onApprove}
							style={{
								color: '#3fb950',
								background: 'rgba(63,185,80,.1)',
								borderColor: 'rgba(63,185,80,.2)',
							}}
						>
							✅
						</button>
						<button
							className='btn-icon'
							onClick={onReject}
							style={{
								color: '#f85149',
								background: 'rgba(248,81,73,.1)',
								borderColor: 'rgba(248,81,73,.2)',
							}}
						>
							❌
						</button>
					</>
				)}
			</div>
		</div>
	)
}

// ════════════════════════════════════════════════════════════
// ORDERS
// ════════════════════════════════════════════════════════════
function OrdersTab({
	orders,
	products,
	companies,
	fetchAll,
	showToast,
	t,
}: any) {
	const [showModal, setShowModal] = useState(false)
	const todayValue = () => {
		const now = new Date()
		const offset = now.getTimezoneOffset() * 60000
		return new Date(now.getTime() - offset).toISOString().slice(0, 10)
	}
	const emptyForm = () => ({
		companyId: '',
		note: '',
		payStatus: 'unpaid' as 'paid' | 'unpaid',
		orderDate: todayValue(),
		receipt: null as OrderReceipt | null,
	})
	const [form, setForm] = useState(emptyForm)
	const [items, setItems] = useState([{ pid: '', qty: 1, price: 0 }])
	const [loading, setLoading] = useState(false)

	const total = items.reduce((s, i) => s + i.qty * (i.price || 0), 0)

	const submit = async () => {
		if (!form.companyId) {
			showToast('Firma tanlang', 'error')
			return
		}
		if (!form.orderDate) {
			showToast('Order sanasini kiriting', 'error')
			return
		}
		const valid = items.filter(i => i.pid && i.qty > 0 && i.price > 0)
		if (!valid.length) {
			showToast('Mahsulot va narx kiriting', 'error')
			return
		}
		setLoading(true)
		const d = await createOrderApi({
			companyId: form.companyId,
			items: valid.map(i => ({
				productId: i.pid,
				quantity: i.qty,
				pricePerUnit: i.price,
			})),
			note: form.note,
			payStatus: form.payStatus,
			paidAmount: 0,
			orderDate: form.orderDate,
			receipt: form.receipt || undefined,
		})
		if (d.success) {
			showToast('Order saqlandi ✅')
			setShowModal(false)
			setForm(emptyForm())
			setItems([{ pid: '', qty: 1, price: 0 }])
			fetchAll()
		} else showToast(d.message || 'Xatolik', 'error')
		setLoading(false)
	}

	const selectReceipt = (file?: File) => {
		if (!file) return
		if (!file.type.startsWith('image/') && file.type !== 'application/pdf') {
			showToast("Chek faqat rasm yoki PDF bo'lishi mumkin", 'error')
			return
		}
		if (file.size > 2 * 1024 * 1024) {
			showToast("Chek fayli 2 MB dan kichik bo'lishi kerak", 'error')
			return
		}
		const reader = new FileReader()
		reader.onload = () =>
			setForm(current => ({
				...current,
				receipt: {
					name: file.name,
					type: file.type,
					dataUrl: String(reader.result),
				},
			}))
		reader.onerror = () => showToast("Chek faylini o'qib bo'lmadi", 'error')
		reader.readAsDataURL(file)
	}

	return (
		<PageWrap
			title='🛒 Orderlar'
			sub={`${orders.length} ta order`}
			action={
				<button className='btn-primary' onClick={() => setShowModal(true)}>
					+ Yangi order
				</button>
			}
		>
			{showModal && (
				<Modal onClose={() => setShowModal(false)}>
					<div className='modal-title'>🛒 Yangi order</div>

					<div className='form-group'>
						<label className='form-label'>FIRMA</label>
						<select
							className='crm-input'
							value={form.companyId}
							onChange={e => setForm({ ...form, companyId: e.target.value })}
						>
							<option value=''>— Firma tanlang —</option>
							{companies.map((c: Company) => (
								<option key={c.id} value={c.id}>
									{c.name}
								</option>
							))}
						</select>
						{companies.length === 0 && (
							<div style={{ fontSize: 12, color: '#f0a500', marginTop: 6 }}>
								⚠️ Avval Firmalar bo'limida firma qo'shing
							</div>
						)}
					</div>

					{form.companyId && (
						<>
							<div className='form-group'>
								<label className='form-label'>ORDER SANASI</label>
								<input
									className='crm-input'
									type='date'
									value={form.orderDate}
									onChange={e =>
										setForm({ ...form, orderDate: e.target.value })
									}
								/>
							</div>

							<div className='form-group'>
								<label className='form-label'>MAHSULOTLAR</label>
								{items.map((item, i) => {
									const prod = products.find((p: Product) => p.id === item.pid)
									return (
										<div
											key={i}
											style={{
												background: 'var(--app-panel-soft)',
												borderRadius: 12,
												padding: 12,
												marginBottom: 10,
											}}
										>
											<div
												style={{
													display: 'grid',
													gridTemplateColumns: '1fr 80px 110px 36px',
													gap: 8,
													marginBottom: prod ? 8 : 0,
												}}
											>
												<select
													className='crm-input'
													value={item.pid}
													onChange={e => {
														const n = [...items]
														const p = products.find(
															(x: Product) => x.id === e.target.value,
														)
														n[i].pid = e.target.value
														n[i].price = p?.pricePerUnit || 0
														setItems(n)
													}}
												>
													<option value=''>Mahsulot</option>
													{products.map((p: Product) => (
														<option key={p.id} value={p.id}>
															{p.name}
														</option>
													))}
												</select>
												<input
													className='crm-input'
													type='number'
													value={item.qty}
													min={1}
													placeholder='Son'
													onChange={e => {
														const n = [...items]
														n[i].qty = parseFloat(e.target.value) || 1
														setItems(n)
													}}
												/>
												<input
													className='crm-input'
													type='number'
													value={item.price || ''}
													placeholder='Narx'
													onChange={e => {
														const n = [...items]
														n[i].price = parseFloat(e.target.value) || 0
														setItems(n)
													}}
												/>
												<button
													onClick={() =>
														setItems(items.filter((_, idx) => idx !== i))
													}
													style={{
														background: 'rgba(248,81,73,.1)',
														border: '1.5px solid rgba(248,81,73,.25)',
														color: '#f85149',
														borderRadius: 9,
														cursor: 'pointer',
														fontWeight: 900,
														fontSize: 16,
													}}
												>
													×
												</button>
											</div>
											{prod && item.price > 0 && (
												<div
													style={{ fontSize: 12, color: 'var(--app-muted)' }}
												>
													{prod.name} × {item.qty} ={' '}
													<strong style={{ color: '#3fb950' }}>
														{fmtM(item.qty * item.price)}
													</strong>
												</div>
											)}
										</div>
									)
								})}
								<button
									onClick={() =>
										setItems([...items, { pid: '', qty: 1, price: 0 }])
									}
									style={{
										width: '100%',
										padding: '9px',
										borderRadius: 10,
										border: '1.5px dashed rgba(115,103,240,.4)',
										background: 'rgba(115,103,240,.05)',
										color: '#7367f0',
										cursor: 'pointer',
										fontWeight: 700,
										fontSize: 13,
										fontFamily: 'inherit',
									}}
								>
									+ Mahsulot
								</button>
							</div>

							{total > 0 && (
								<div
									style={{
										background:
											'linear-gradient(135deg,rgba(63,185,80,.08),rgba(63,185,80,.04))',
										border: '1px solid rgba(63,185,80,.25)',
										borderRadius: 12,
										padding: '14px 16px',
										marginBottom: 14,
										display: 'flex',
										justifyContent: 'space-between',
										alignItems: 'center',
									}}
								>
									<span style={{ color: 'var(--app-muted)', fontWeight: 700 }}>
										Jami summa
									</span>
									<span
										style={{ fontWeight: 900, fontSize: 22, color: '#3fb950' }}
									>
										{fmtM(total)}
									</span>
								</div>
							)}

							<div className='form-group'>
								<label className='form-label'>TO'LOV HOLATI</label>
								<div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
									{(['paid', 'unpaid'] as const).map(m => (
										<button
											key={m}
											onClick={() =>
												setForm({
													...form,
													payStatus: m,
													receipt: m === 'paid' ? form.receipt : null,
												})
											}
											style={{
												padding: '8px 16px',
												borderRadius: 10,
												border: `2px solid ${form.payStatus === m ? PAY_CFG[m].c : 'var(--app-border)'}`,
												background:
													form.payStatus === m ? PAY_CFG[m].bg : 'transparent',
												color:
													form.payStatus === m
														? PAY_CFG[m].c
														: 'var(--app-muted)',
												cursor: 'pointer',
												fontSize: 12,
												fontWeight: 800,
												fontFamily: 'inherit',
												transition: 'all .15s',
											}}
										>
											{PAY_CFG[m].l}
										</button>
									))}
								</div>
							</div>
							{form.payStatus === 'paid' && (
								<div className='form-group'>
									<label className='form-label'>TO'LOV CHEKI</label>
									<input
										id='order-receipt'
										type='file'
										accept='image/*,application/pdf'
										onChange={e => selectReceipt(e.target.files?.[0])}
										style={{ display: 'none' }}
									/>
									<div
										style={{
											display: 'flex',
											gap: 8,
											alignItems: 'stretch',
											flexWrap: 'wrap',
										}}
									>
										<label
											htmlFor='order-receipt'
											className='btn-ghost'
											style={{
												cursor: 'pointer',
												display: 'inline-flex',
												alignItems: 'center',
												justifyContent: 'center',
												minHeight: 40,
											}}
										>
											📎{' '}
											{form.receipt ? 'Chekni almashtirish' : "Chek qo'shish"}
										</label>
										{form.receipt && (
											<>
												<a
													href={form.receipt.dataUrl}
													download={form.receipt.name}
													className='btn-ghost'
													style={{
														display: 'inline-flex',
														alignItems: 'center',
														textDecoration: 'none',
														minWidth: 0,
														maxWidth: 240,
														overflow: 'hidden',
														textOverflow: 'ellipsis',
														whiteSpace: 'nowrap',
													}}
													title={form.receipt.name}
												>
													{form.receipt.name}
												</a>
												<button
													className='btn-ghost'
													onClick={() => setForm({ ...form, receipt: null })}
													aria-label='Chekni olib tashlash'
													title='Chekni olib tashlash'
												>
													×
												</button>
											</>
										)}
									</div>
									<div
										style={{
											fontSize: 11,
											color: 'var(--app-muted)',
											marginTop: 6,
										}}
									>
										Rasm yoki PDF, maksimal 2 MB
									</div>
								</div>
							)}
							<div className='form-group'>
								<label className='form-label'>ESLATMA</label>
								<textarea
									className='crm-input'
									value={form.note}
									onChange={e => setForm({ ...form, note: e.target.value })}
									rows={2}
									style={{ resize: 'vertical' }}
								/>
							</div>
						</>
					)}

					<div style={{ display: 'flex', gap: 10 }}>
						<button
							className='btn-ghost'
							onClick={() => setShowModal(false)}
							style={{ flex: 1 }}
						>
							Bekor
						</button>
						<button
							className='btn-primary'
							onClick={submit}
							disabled={loading || !form.companyId}
							style={{ flex: 2 }}
						>
							{loading ? `${t.sending}` : `💾 ${t.save} + ${t.savedToStock}`}
						</button>
					</div>
				</Modal>
			)}

			<div className='table-wrap'>
				<table className='crm-table'>
					<thead>
						<tr>
							<th>Order ID</th>
							<th>Firma</th>
							<th className='hide-mobile'>Mahsulotlar</th>
							<th>Jami</th>
							<th>To'lov</th>
							<th className='hide-mobile'>Sana</th>
						</tr>
					</thead>
					<tbody>
						{orders.map((o: Order) => {
							const pay = PAY_CFG[o.payStatus]
							const debt = o.totalPrice - o.paidAmount
							return (
								<tr key={o.id}>
									<td>
										<span
											style={{
												fontFamily: 'monospace',
												fontSize: 11,
												color: '#7367f0',
												background: 'rgba(115,103,240,.08)',
												padding: '2px 8px',
												borderRadius: 6,
											}}
										>
											{o.id.slice(-8)}
										</span>
									</td>
									<td style={{ fontWeight: 700 }}>🏢 {o.companyName}</td>
									<td
										className='hide-mobile'
										style={{ color: 'var(--app-muted)', fontSize: 12 }}
									>
										{o.items.length} ta
									</td>
									<td>
										<div style={{ fontWeight: 900, color: '#3fb950' }}>
											{fmtM(o.totalPrice)}
										</div>
										{debt > 0 && (
											<div style={{ fontSize: 11, color: '#f85149' }}>
												Qarz: {fmtM(debt)}
											</div>
										)}
									</td>
									<td>
										<span
											className='badge'
											style={{ background: pay.bg, color: pay.c }}
										>
											{pay.l}
										</span>
										{o.receipt && (
											<a
												href={o.receipt.dataUrl}
												download={o.receipt.name}
												style={{
													display: 'block',
													fontSize: 11,
													color: '#7367f0',
													fontWeight: 700,
													marginTop: 5,
													textDecoration: 'none',
												}}
												title={o.receipt.name}
											>
												📎 Chek
											</a>
										)}
									</td>
									<td
										className='hide-mobile'
										style={{ fontSize: 11, color: 'var(--app-muted)' }}
									>
										{fmtDate(o.createdAt)}
									</td>
								</tr>
							)
						})}
						{orders.length === 0 && (
							<tr>
								<td
									colSpan={6}
									style={{
										textAlign: 'center',
										color: 'var(--app-muted)',
										padding: 48,
									}}
								>
									<div style={{ fontSize: 36, marginBottom: 8 }}>🛒</div>
									<div style={{ fontWeight: 700 }}>Order yo'q</div>
									<div style={{ fontSize: 12, marginTop: 4 }}>
										"+ Yangi order" tugmasini bosing
									</div>
								</td>
							</tr>
						)}
					</tbody>
				</table>
			</div>
		</PageWrap>
	)
}

// ════════════════════════════════════════════════════════════
// MAHSULOTLAR
// ════════════════════════════════════════════════════════════
function ProductsTab({
	products,
	stock,
	companies,
	fetchAll,
	showToast,
	t,
}: any) {
	const [showModal, setShowModal] = useState(false)
	const [search, setSearch] = useState('')
	const [form, setForm] = useState({
		name: '',
		category: 'gosht',
		unit: 'kg',
		minStock: '0',
		pricePerUnit: '0',
		perBox: '0',
		boxUnit: '',
		qrCode: '',
		supplierId: '',
	})

	const submit = async () => {
		if (!form.name.trim()) {
			showToast('Nom kiriting', 'error')
			return
		}
		const d = await addProductApi({
			name: form.name.trim(),
			category: form.category,
			unit: form.unit,
			minStock: parseFloat(form.minStock) || 0,
			pricePerUnit: parseFloat(form.pricePerUnit) || 0,
			perBox: parseFloat(form.perBox) || 0,
			boxUnit: form.boxUnit,
			qrCode: form.qrCode,
		})
		if (d.success) {
			showToast("Mahsulot qo'shildi!")
			setShowModal(false)
			setForm({
				name: '',
				category: 'gosht',
				unit: 'kg',
				minStock: '0',
				pricePerUnit: '0',
				perBox: '0',
				boxUnit: '',
				qrCode: '',
				supplierId: '',
			})
			fetchAll()
		} else showToast(d.message || 'Xatolik', 'error')
	}

	const filtered = products.filter((p: Product) =>
		p.name.toLowerCase().includes(search.toLowerCase()),
	)

	return (
		<PageWrap
			title='🏷️ Mahsulotlar'
			sub={`${products.length} ta mahsulot`}
			action={
				<button className='btn-primary' onClick={() => setShowModal(true)}>
					{t.addNewProduct}
				</button>
			}
		>
			{showModal && (
				<Modal onClose={() => setShowModal(false)}>
					<div className='modal-title'>{`🏷️ ${t.addNewProduct}`}</div>
					<div
						style={{
							display: 'grid',
							gridTemplateColumns: '1fr 1fr',
							gap: 12,
							marginBottom: 4,
						}}
					>
						<div style={{ gridColumn: '1/-1' }} className='form-group'>
							<label className='form-label'>MAHSULOT NOMI</label>
							<input
								className='crm-input'
								value={form.name}
								onChange={e => setForm({ ...form, name: e.target.value })}
								placeholder='Nomini kiriting'
								autoFocus
							/>
						</div>
						<div className='form-group'>
							<label className='form-label'>KATEGORIYA</label>
							<select
								className='crm-input'
								value={form.category}
								onChange={e => setForm({ ...form, category: e.target.value })}
							>
								{[
									'gosht',
									'sabzavot',
									'don',
									'sut',
									'meva',
									'ziravorlar',
									'ichimlik',
									'boshqa',
								].map(c => (
									<option key={c} value={c}>
										{c}
									</option>
								))}
							</select>
						</div>
						<div className='form-group'>
							<label className='form-label'>BIRLIK</label>
							<select
								className='crm-input'
								value={form.unit}
								onChange={e => setForm({ ...form, unit: e.target.value })}
							>
								{['kg', 'g', 'l', 'ml', 'dona', 'qop', 'quti', 'karobka'].map(
									u => (
										<option key={u} value={u}>
											{u}
										</option>
									),
								)}
							</select>
						</div>
						<div className='form-group'>
							<label className='form-label'>MIN SKLAD</label>
							<input
								className='crm-input'
								type='number'
								value={form.minStock}
								onChange={e => setForm({ ...form, minStock: e.target.value })}
							/>
						</div>
						<div className='form-group'>
							<label className='form-label'>NARXI (so'm)</label>
							<input
								className='crm-input'
								type='number'
								value={form.pricePerUnit}
								onChange={e =>
									setForm({ ...form, pricePerUnit: e.target.value })
								}
							/>
						</div>
						<div style={{ gridColumn: '1/-1' }} className='form-group'>
							<label className='form-label'>FIRMA</label>
							<select
								className='crm-input'
								value={form.supplierId}
								onChange={e => setForm({ ...form, supplierId: e.target.value })}
							>
								<option value=''>— Firma tanlang —</option>
								{companies.map((c: Company) => (
									<option key={c.id} value={c.id}>
										{c.name}
									</option>
								))}
							</select>
						</div>
						<div className='form-group'>
							<label className='form-label'>QUTIDAGI SONI</label>
							<input
								className='crm-input'
								type='number'
								value={form.perBox}
								onChange={e => setForm({ ...form, perBox: e.target.value })}
								placeholder='24'
							/>
						</div>
						<div className='form-group'>
							<label className='form-label'>QUTI BIRLIGI</label>
							<input
								className='crm-input'
								value={form.boxUnit}
								onChange={e => setForm({ ...form, boxUnit: e.target.value })}
								placeholder='shisha, dona...'
							/>
						</div>
						<div style={{ gridColumn: '1/-1' }} className='form-group'>
							<label className='form-label'>SHTRIX KOD / QR</label>
							<div
								style={{
									display: 'grid',
									gridTemplateColumns: '1fr auto',
									gap: 8,
								}}
							>
								<input
									className='crm-input'
									value={form.qrCode}
									onChange={e => setForm({ ...form, qrCode: e.target.value })}
									placeholder="Qo'lda kiriting yoki skaner ishlating"
								/>
								<button
									style={{
										padding: '0 14px',
										borderRadius: 10,
										border: '1.5px solid rgba(59,130,246,.3)',
										background: 'rgba(59,130,246,.1)',
										color: '#3b82f6',
										cursor: 'pointer',
										fontWeight: 700,
										fontSize: 13,
										fontFamily: 'inherit',
										whiteSpace: 'nowrap',
									}}
								>
									📷 Skan
								</button>
							</div>
						</div>
					</div>
					<div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
						<button
							className='btn-ghost'
							onClick={() => setShowModal(false)}
							style={{ flex: 1 }}
						>
							Bekor
						</button>
						<button
							className='btn-primary'
							onClick={submit}
							style={{ flex: 2 }}
						>
							💾 Saqlash
						</button>
					</div>
				</Modal>
			)}

			<div style={{ marginBottom: 16, maxWidth: 320 }}>
				<input
					className='crm-input'
					placeholder='🔍 Mahsulot qidirish...'
					value={search}
					onChange={e => setSearch(e.target.value)}
				/>
			</div>

			<div className='table-wrap'>
				<table className='crm-table'>
					<thead>
						<tr>
							<th>#</th>
							<th>Nomi</th>
							<th className='hide-mobile'>Kategoriya</th>
							<th>Birlik</th>
							<th className='hide-mobile'>QR / Shtrix</th>
							<th>Narxi</th>
							<th>Sklad</th>
						</tr>
					</thead>
					<tbody>
						{filtered.map((p: Product, i: number) => {
							const qty = stock[p.id] || 0
							const c =
								qty <= p.minStock
									? '#f85149'
									: qty <= p.minStock * 2
										? '#f0a500'
										: '#3fb950'
							return (
								<tr key={p.id}>
									<td
										style={{
											color: 'var(--app-muted)',
											fontSize: 11,
											width: 36,
										}}
									>
										{i + 1}
									</td>
									<td style={{ fontWeight: 700 }}>{p.name}</td>
									<td className='hide-mobile'>
										<span
											className='badge'
											style={{
												background: 'rgba(115,103,240,.08)',
												color: '#7367f0',
											}}
										>
											{p.category}
										</span>
									</td>
									<td style={{ color: 'var(--app-muted)' }}>
										{p.unit}
										{p.perBox > 0 && (
											<span
												style={{
													marginLeft: 6,
													fontSize: 10,
													background: 'rgba(59,130,246,.1)',
													color: '#3b82f6',
													padding: '2px 7px',
													borderRadius: 8,
												}}
											>
												1={p.perBox}
												{p.boxUnit}
											</span>
										)}
									</td>
									<td
										className='hide-mobile'
										style={{
											fontFamily: 'monospace',
											fontSize: 11,
											color: 'var(--app-muted)',
										}}
									>
										{p.qrCode || (
											<span style={{ color: 'var(--app-border)' }}>—</span>
										)}
									</td>
									<td style={{ color: '#7367f0', fontWeight: 800 }}>
										{fmtM(p.pricePerUnit)}
									</td>
									<td>
										<span style={{ fontWeight: 900, color: c, fontSize: 14 }}>
											{fmt(qty)}
										</span>{' '}
										<span style={{ fontSize: 10, color: 'var(--app-muted)' }}>
											{p.unit}
										</span>
									</td>
								</tr>
							)
						})}
						{filtered.length === 0 && (
							<tr>
								<td
									colSpan={7}
									style={{
										textAlign: 'center',
										color: 'var(--app-muted)',
										padding: 48,
									}}
								>
									<div style={{ fontSize: 36, marginBottom: 8 }}>🏷️</div>
									Mahsulot topilmadi
								</td>
							</tr>
						)}
					</tbody>
				</table>
			</div>
		</PageWrap>
	)
}

// ════════════════════════════════════════════════════════════
// FIRMALAR
// ════════════════════════════════════════════════════════════
function FirmsTab({
	companies,
	orders,
	companyPayments,
	fetchAll,
	showToast,
	t,
}: any) {
	const [showAdd, setShowAdd] = useState(false)
	const [selected, setSelected] = useState<Company | null>(null)
	const [view, setView] = useState<'info' | 'pay' | 'history'>('info')
	const [payModal, setPayModal] = useState<Order | null>(null)
	const [payAmt, setPayAmt] = useState('')
	const [payNote, setPayNote] = useState('')
	const [addForm, setAddForm] = useState({ name: '', address: '', phone: '' })

	const cOrders = (id: string) =>
		orders.filter((o: Order) => o.companyId === id)
	const cDebt = (id: string) =>
		cOrders(id).reduce(
			(s: number, o: Order) => s + (o.totalPrice - o.paidAmount),
			0,
		)
	const cTotal = (id: string) =>
		cOrders(id).reduce((s: number, o: Order) => s + o.totalPrice, 0)
	const cPaid = (id: string) =>
		cOrders(id).reduce((s: number, o: Order) => s + o.paidAmount, 0)
	const cHistory = (id: string) =>
		companyPayments.filter((p: CompanyPayment) => p.companyId === id)

	const addCompany = async () => {
		if (!addForm.name.trim()) {
			showToast('Firma nomini kiriting', 'error')
			return
		}
		const d = await addCompanyApi(addForm)
		if (!d.success) {
			showToast(d.message || 'Xatolik', 'error')
			return
		}
		showToast("Firma qo'shildi!")
		setShowAdd(false)
		setAddForm({ name: '', address: '', phone: '' })
		fetchAll()
	}

	const payOrder = async () => {
		if (!payModal) return
		const amt = parseFloat(payAmt)
		if (!amt || amt <= 0) {
			showToast('Summani kiriting', 'error')
			return
		}
		const d = await payOrderApi(payModal.id, amt, payNote)
		if (d.success) {
			showToast("To'lov saqlandi! ✅")
			setPayModal(null)
			setPayAmt('')
			setPayNote('')
			fetchAll()
		} else showToast(d.message || 'Xatolik', 'error')
	}

	return (
		<PageWrap
			title='🏢 Firmalar'
			sub={`${companies.length} ta firma`}
			action={
				<button className='btn-primary' onClick={() => setShowAdd(true)}>
					+ Yangi firma
				</button>
			}
		>
			{showAdd && (
				<Modal onClose={() => setShowAdd(false)}>
					<div className='modal-title'>🏢 Yangi firma</div>
					{[
						['FIRMA NOMI', 'name', 'Masalan: Mars LLC'],
						['MANZIL', 'address', 'Toshkent, Chilonzor'],
						['TELEFON', 'phone', '+998 90 123 45 67'],
					].map(([l, k, p]) => (
						<div key={k} className='form-group'>
							<label className='form-label'>{l}</label>
							<input
								className='crm-input'
								value={(addForm as any)[k]}
								onChange={e => setAddForm({ ...addForm, [k]: e.target.value })}
								placeholder={p}
							/>
						</div>
					))}
					<div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
						<button
							className='btn-ghost'
							onClick={() => setShowAdd(false)}
							style={{ flex: 1 }}
						>
							{t.cancel}
						</button>
						<button
							className='btn-primary'
							onClick={addCompany}
							style={{ flex: 2 }}
						>
							💾 Saqlash
						</button>
					</div>
				</Modal>
			)}

			{payModal && (
				<Modal onClose={() => setPayModal(null)}>
					<div className='modal-title'>💳 To'lov kiritish</div>
					<div
						style={{
							background:
								'linear-gradient(135deg,rgba(115,103,240,.1),rgba(101,91,211,.05))',
							border: '1px solid rgba(115,103,240,.25)',
							borderRadius: 14,
							padding: '18px 20px',
							marginBottom: 20,
							textAlign: 'center',
						}}
					>
						<div
							style={{
								fontSize: 12,
								color: 'var(--app-muted)',
								marginBottom: 6,
								fontWeight: 700,
							}}
						>
							Order #{payModal.id.slice(-8)} · Qolgan qarz
						</div>
						<div style={{ fontWeight: 900, fontSize: 32, color: '#7367f0' }}>
							{fmtM(payModal.totalPrice - payModal.paidAmount)}
						</div>
					</div>
					<div className='form-group'>
						<label className='form-label'>TO'LOV SUMMASI</label>
						<div style={{ display: 'flex', gap: 8 }}>
							<input
								className='crm-input'
								type='number'
								value={payAmt}
								onChange={e => setPayAmt(e.target.value)}
								placeholder='Summani kiriting'
								style={{ flex: 1 }}
							/>
							<button
								onClick={() =>
									setPayAmt(String(payModal.totalPrice - payModal.paidAmount))
								}
								style={{
									padding: '0 14px',
									borderRadius: 10,
									border: '1.5px solid rgba(63,185,80,.3)',
									background: 'rgba(63,185,80,.1)',
									color: '#3fb950',
									cursor: 'pointer',
									fontWeight: 800,
									fontSize: 12,
									fontFamily: 'inherit',
									whiteSpace: 'nowrap',
								}}
							>
								Hammasi
							</button>
						</div>
					</div>
					<div className='form-group'>
						<label className='form-label'>IZOH</label>
						<input
							className='crm-input'
							value={payNote}
							onChange={e => setPayNote(e.target.value)}
							placeholder="Naqd, bank o'tkazmasi..."
						/>
					</div>
					<div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
						<button
							className='btn-ghost'
							onClick={() => setPayModal(null)}
							style={{ flex: 1 }}
						>
							{t.cancel}
						</button>
						<button
							className='btn-primary'
							onClick={payOrder}
							style={{ flex: 2 }}
						>
							✅ To'lovni saqlash
						</button>
					</div>
				</Modal>
			)}

			{selected && (
				<Modal onClose={() => setSelected(null)}>
					<div
						style={{
							display: 'flex',
							justifyContent: 'space-between',
							alignItems: 'flex-start',
							marginBottom: 20,
						}}
					>
						<div>
							<div style={{ fontWeight: 900, fontSize: 18, marginBottom: 2 }}>
								🏢 {selected.name}
							</div>
							{selected.phone && (
								<div style={{ fontSize: 12, color: 'var(--app-muted)' }}>
									{selected.phone}
								</div>
							)}
						</div>
						<div
							style={{
								background:
									cDebt(selected.id) > 0
										? 'rgba(248,81,73,.1)'
										: 'rgba(63,185,80,.1)',
								border: `1px solid ${cDebt(selected.id) > 0 ? 'rgba(248,81,73,.3)' : 'rgba(63,185,80,.3)'}`,
								borderRadius: 12,
								padding: '6px 14px',
								textAlign: 'right',
							}}
						>
							<div
								style={{
									fontSize: 10,
									color: 'var(--app-muted)',
									fontWeight: 700,
								}}
							>
								QARZ
							</div>
							<div
								style={{
									fontWeight: 900,
									color: cDebt(selected.id) > 0 ? '#f85149' : '#3fb950',
									fontSize: 16,
								}}
							>
								{cDebt(selected.id) > 0 ? fmtM(cDebt(selected.id)) : "✓ Yo'q"}
							</div>
						</div>
					</div>

					{/* View tabs */}
					<div
						style={{
							display: 'flex',
							gap: 6,
							marginBottom: 20,
							background: 'var(--app-panel-soft)',
							borderRadius: 12,
							padding: 4,
						}}
					>
						{(['info', 'pay', 'history'] as const).map(v => (
							<button
								key={v}
								onClick={() => setView(v)}
								style={{
									flex: 1,
									padding: '9px 4px',
									borderRadius: 9,
									border: 'none',
									background: view === v ? 'var(--app-panel)' : 'transparent',
									color: view === v ? '#7367f0' : 'var(--app-muted)',
									fontWeight: 800,
									cursor: 'pointer',
									fontSize: 12,
									fontFamily: 'inherit',
									boxShadow: view === v ? '0 2px 8px rgba(0,0,0,.15)' : 'none',
									transition: 'all .15s',
								}}
							>
								{v === 'info' ? t.info : v === 'pay' ? t.pay : t.history}
							</button>
						))}
					</div>

					{view === 'info' && (
						<div style={{ display: 'grid', gap: 10 }}>
							{[
								['🏢 Nomi', selected.name],
								['📍 Manzil', selected.address || '—'],
								['📞 Telefon', selected.phone || '—'],
								["📅 Qo'shilgan", fmtDate(selected.createdAt)],
								[
									'📦 Orderlar',
									`${cOrders(selected.id).length} ta · ${fmtM(cTotal(selected.id))}`,
								],
							].map(([l, v]) => (
								<div
									key={String(l)}
									style={{
										background: 'var(--app-panel-soft)',
										borderRadius: 11,
										padding: '12px 14px',
										display: 'flex',
										justifyContent: 'space-between',
										alignItems: 'center',
										gap: 12,
									}}
								>
									<span
										style={{
											color: 'var(--app-muted)',
											fontSize: 13,
											flexShrink: 0,
										}}
									>
										{l}
									</span>
									<span style={{ fontWeight: 700, textAlign: 'right' }}>
										{v}
									</span>
								</div>
							))}
						</div>
					)}

					{view === 'pay' && (
						<div>
							{/* Debt summary */}
							<div
								style={{
									textAlign: 'center',
									borderRadius: 16,
									padding: '24px 20px',
									marginBottom: 20,
									background:
										cDebt(selected.id) > 0
											? 'linear-gradient(135deg,rgba(248,81,73,.08),transparent)'
											: 'linear-gradient(135deg,rgba(63,185,80,.08),transparent)',
									border: `1px solid ${cDebt(selected.id) > 0 ? 'rgba(248,81,73,.2)' : 'rgba(63,185,80,.2)'}`,
								}}
							>
								<div
									style={{
										fontSize: 12,
										color: 'var(--app-muted)',
										marginBottom: 8,
										fontWeight: 700,
										letterSpacing: 0.5,
									}}
								>
									UMUMIY QARZ
								</div>
								<div
									style={{
										fontWeight: 900,
										fontSize: 38,
										color: cDebt(selected.id) > 0 ? '#f85149' : '#3fb950',
										letterSpacing: -1,
									}}
								>
									{fmtM(cDebt(selected.id))}
								</div>
								<div
									style={{
										display: 'flex',
										justifyContent: 'center',
										gap: 24,
										marginTop: 12,
									}}
								>
									<div style={{ fontSize: 12, color: 'var(--app-muted)' }}>
										Jami{' '}
										<strong style={{ color: 'var(--app-text)' }}>
											{fmtM(cTotal(selected.id))}
										</strong>
									</div>
									<div style={{ fontSize: 12, color: 'var(--app-muted)' }}>
										To'langan{' '}
										<strong style={{ color: '#3fb950' }}>
											{fmtM(cPaid(selected.id))}
										</strong>
									</div>
								</div>
							</div>

							<div
								style={{ display: 'flex', flexDirection: 'column', gap: 10 }}
							>
								{cOrders(selected.id).map((o: Order) => {
									const debt = o.totalPrice - o.paidAmount
									const pay = PAY_CFG[o.payStatus]
									return (
										<div
											key={o.id}
											style={{
												background: 'var(--app-panel-soft)',
												borderRadius: 12,
												padding: '13px 16px',
												display: 'flex',
												justifyContent: 'space-between',
												alignItems: 'center',
												flexWrap: 'wrap',
												gap: 10,
											}}
										>
											<div>
												<div style={{ fontWeight: 800 }}>
													Order{' '}
													<span
														style={{
															fontFamily: 'monospace',
															color: '#7367f0',
															fontSize: 12,
														}}
													>
														#{o.id.slice(-8)}
													</span>
												</div>
												<div
													style={{
														fontSize: 11,
														color: 'var(--app-muted)',
														marginTop: 2,
													}}
												>
													{fmtDate(o.createdAt)} · {fmtM(o.totalPrice)}
												</div>
												{debt > 0 && (
													<div
														style={{
															fontSize: 12,
															color: '#f85149',
															fontWeight: 700,
															marginTop: 2,
														}}
													>
														Qarz: {fmtM(debt)}
													</div>
												)}
												{o.receipt && (
													<a
														href={o.receipt.dataUrl}
														download={o.receipt.name}
														onClick={e => e.stopPropagation()}
														style={{
															display: 'inline-block',
															fontSize: 11,
															color: '#7367f0',
															fontWeight: 700,
															marginTop: 5,
															textDecoration: 'none',
														}}
														title={o.receipt.name}
													>
														📎 Chekni yuklash
													</a>
												)}
											</div>
											<div
												style={{
													display: 'flex',
													gap: 8,
													alignItems: 'center',
												}}
											>
												<span
													className='badge'
													style={{ background: pay.bg, color: pay.c }}
												>
													{pay.l}
												</span>
												{debt > 0 && (
													<button
														className='btn-primary'
														onClick={() => setPayModal(o)}
														style={{ padding: '7px 14px', fontSize: 12 }}
													>
														💳 Pay
													</button>
												)}
											</div>
										</div>
									)
								})}
								{cOrders(selected.id).length === 0 && (
									<div
										style={{
											textAlign: 'center',
											padding: 32,
											color: 'var(--app-muted)',
										}}
									>
										Order yo'q
									</div>
								)}
							</div>
						</div>
					)}

					{view === 'history' && (
						<div>
							{cHistory(selected.id).length === 0 ? (
								<div
									style={{
										textAlign: 'center',
										padding: 40,
										color: 'var(--app-muted)',
									}}
								>
									<div style={{ fontSize: 36, marginBottom: 8 }}>📜</div>To'lov
									tarixi yo'q
								</div>
							) : (
								<div className='table-wrap'>
									<table className='crm-table'>
										<thead>
											<tr>
												<th>Order</th>
												<th>Summa</th>
												<th>Izoh</th>
												<th>Sana</th>
											</tr>
										</thead>
										<tbody>
											{cHistory(selected.id).map((p: CompanyPayment) => (
												<tr key={p.id}>
													<td
														style={{
															fontFamily: 'monospace',
															fontSize: 11,
															color: '#7367f0',
														}}
													>
														{p.orderId.slice(-8)}
													</td>
													<td style={{ color: '#3fb950', fontWeight: 800 }}>
														+{fmtM(p.amount)}
													</td>
													<td
														style={{ color: 'var(--app-muted)', fontSize: 12 }}
													>
														{p.note || '—'}
													</td>
													<td
														style={{ fontSize: 11, color: 'var(--app-muted)' }}
													>
														{fmtDate(p.createdAt)}
													</td>
												</tr>
											))}
										</tbody>
									</table>
								</div>
							)}
						</div>
					)}
				</Modal>
			)}

			{/* Companies grid */}
			<div
				className='firm-grid'
				style={{
					display: 'grid',
					gridTemplateColumns: 'repeat(auto-fill,minmax(280px,1fr))',
					gap: 14,
				}}
			>
				{companies.map((c: Company, i: number) => {
					const debt = cDebt(c.id)
					const orderCnt = cOrders(c.id).length
					return (
						<div
							key={c.id}
							className='fade-up'
							style={{
								animationDelay: `${i * 50}ms`,
								background: 'var(--app-panel)',
								border: `1px solid ${debt > 0 ? 'rgba(248,81,73,.25)' : 'var(--app-border)'}`,
								borderRadius: 18,
								padding: '20px 20px',
								cursor: 'pointer',
								transition: 'all .2s',
							}}
							onClick={() => {
								setSelected(c)
								setView('info')
							}}
							onMouseEnter={e => {
								e.currentTarget.style.transform = 'translateY(-3px)'
								e.currentTarget.style.boxShadow = '0 12px 32px rgba(0,0,0,.2)'
								e.currentTarget.style.borderColor =
									debt > 0 ? 'rgba(248,81,73,.4)' : 'rgba(115,103,240,.35)'
							}}
							onMouseLeave={e => {
								e.currentTarget.style.transform = ''
								e.currentTarget.style.boxShadow = ''
								e.currentTarget.style.borderColor =
									debt > 0 ? 'rgba(248,81,73,.25)' : 'var(--app-border)'
							}}
						>
							<div
								style={{
									display: 'flex',
									alignItems: 'flex-start',
									justifyContent: 'space-between',
									marginBottom: 16,
								}}
							>
								<div>
									<div
										style={{ fontWeight: 900, fontSize: 16, marginBottom: 4 }}
									>
										🏢 {c.name}
									</div>
									{c.address && (
										<div
											style={{
												fontSize: 11,
												color: 'var(--app-muted)',
												marginBottom: 2,
											}}
										>
											📍 {c.address}
										</div>
									)}
									{c.phone && (
										<div style={{ fontSize: 11, color: 'var(--app-muted)' }}>
											📞 {c.phone}
										</div>
									)}
								</div>
								<div style={{ fontSize: 22, opacity: 0.4 }}>→</div>
							</div>
							<div
								style={{
									display: 'grid',
									gridTemplateColumns: '1fr 1fr',
									gap: 10,
								}}
							>
								<div
									style={{
										background: 'var(--app-panel-soft)',
										borderRadius: 11,
										padding: '11px 12px',
									}}
								>
									<div
										style={{
											fontSize: 10,
											color: 'var(--app-muted)',
											marginBottom: 4,
											fontWeight: 700,
										}}
									>
										ORDERLAR
									</div>
									<div
										style={{ fontWeight: 800, color: '#3b82f6', fontSize: 14 }}
									>
										{orderCnt} ta
									</div>
									<div
										style={{
											fontSize: 11,
											color: 'var(--app-muted)',
											marginTop: 1,
										}}
									>
										{fmtM(cTotal(c.id))}
									</div>
								</div>
								<div
									style={{
										background:
											debt > 0 ? 'rgba(248,81,73,.08)' : 'rgba(63,185,80,.08)',
										border: `1px solid ${debt > 0 ? 'rgba(248,81,73,.2)' : 'rgba(63,185,80,.2)'}`,
										borderRadius: 11,
										padding: '11px 12px',
									}}
								>
									<div
										style={{
											fontSize: 10,
											color: 'var(--app-muted)',
											marginBottom: 4,
											fontWeight: 700,
										}}
									>
										QARZ
									</div>
									<div
										style={{
											fontWeight: 900,
											color: debt > 0 ? '#f85149' : '#3fb950',
											fontSize: 14,
										}}
									>
										{debt > 0 ? fmtM(debt) : "✓ Yo'q"}
									</div>
								</div>
							</div>
						</div>
					)
				})}
				{companies.length === 0 && (
					<div
						style={{
							gridColumn: '1/-1',
							textAlign: 'center',
							padding: '60px 20px',
							color: 'var(--app-muted)',
						}}
					>
						<div style={{ fontSize: 56, marginBottom: 12 }}>🏢</div>
						<div style={{ fontWeight: 700, fontSize: 16 }}>
							Hali firma qo'shilmagan
						</div>
						<div style={{ fontSize: 13, marginTop: 6 }}>
							Yuqoridagi "+ Yangi firma" tugmasini bosing
						</div>
					</div>
				)}
			</div>
		</PageWrap>
	)
}
