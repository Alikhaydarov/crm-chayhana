/**
 * Warehouse Service
 * Handles warehouse stock management
 */

import type { Product, StockMap } from '@/src/types/crm'
import { apiGet, apiPatch } from './apiClient'

export interface WarehouseData {
	products: Product[]
	stock: StockMap
	shopStock?: StockMap
}

export const warehouseService = {
	async getWarehouse() {
		return apiGet<WarehouseData>('/warehouse')
	},

	async getStock() {
		return apiGet<StockMap>('/warehouse/stock')
	},

	async updateStock(productId: string, quantity: number) {
		return apiPatch(`/warehouse/stock/${productId}`, { quantity })
	},

	async getShopStock() {
		return apiGet<StockMap>('/warehouse/shop-stock')
	},
}
