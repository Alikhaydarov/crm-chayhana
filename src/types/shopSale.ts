export type ShopSaleItem = {
	barcode: string
	sourceName: string
	supplier: string
	productId: string
	productName: string
	quantity: number
	salesAmount: number
	costAmount: number
	profitAmount: number
	averagePrice: number
	stockBefore: number
	stockAfter: number
	shortage: number
}

export type ShopSaleImport = {
	id: string
	sourceKey: string
	fileName: string
	saleDate: string
	items: ShopSaleItem[]
	totalQuantity: number
	totalSales: number
	totalCost: number
	totalProfit: number
	shortageCount: number
	skippedRows?: { barcode: string; sourceName: string; quantity: number }[]
	createdAt: string
}

export type ParsedShopSale = {
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
