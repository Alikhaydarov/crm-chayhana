export type Product = {
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

export type StockMap = Record<string, number>
