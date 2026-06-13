export type OrderReceipt = {
	name: string
	type: string
	dataUrl: string
}

export type Order = {
	id: string
	companyId: string
	companyName: string
	items: OrderItem[]
	totalPrice: number
	paidAmount: number
	payStatus: 'paid' | 'unpaid' | 'partial'
	note: string
	receipt?: OrderReceipt
	createdAt: string
}

export type OrderItem = {
	productId: string
	productName: string
	quantity: number
	unit: string
	pricePerUnit: number
}
