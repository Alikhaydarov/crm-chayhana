/**
 * Shop Sales Service
 * Handles shop sales data and Excel imports
 */

import type { ShopSaleImport } from '@/src/types/crm'
import { apiGet, apiPost } from './apiClient'

export interface ImportShopSalesRequest {
	sourceKey: string
	fileName: string
	saleDate: string
	rows: Array<{
		barcode: string
		sourceName: string
		supplier: string
		quantity: number
		salesAmount: number
		costAmount: number
		profitAmount: number
		averagePrice: number
		productId: string
	}>
	skippedRows?: Array<{
		barcode: string
		sourceName: string
		quantity: number
	}>
}

export const shopSalesService = {
	async getShopSales() {
		return apiGet<ShopSaleImport[]>('/shop-sales')
	},

	async importShopSales(data: ImportShopSalesRequest) {
		return apiPost<ShopSaleImport>('/shop-sales/import', data)
	},

	async getShopSalesByDate(date: string) {
		return apiGet<ShopSaleImport[]>(`/shop-sales?date=${date}`)
	},

	async getShopSalesDetail(importId: string) {
		return apiGet<ShopSaleImport>(`/shop-sales/${importId}`)
	},
}
