/**
 * Product Service
 * Handles product management
 */

import type { Product } from '@/src/types/crm'
import { apiGet, apiPost } from './apiClient'

export interface CreateProductRequest {
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

export const productService = {
	async getProducts() {
		return apiGet<Product[]>('/products')
	},

	async createProduct(data: CreateProductRequest) {
		return apiPost<Product>('/products', data)
	},

	async getProductById(productId: string) {
		return apiGet<Product>(`/products/${productId}`)
	},

	async getProductsBySupplier(supplierId: string) {
		return apiGet<Product[]>(`/products?supplier=${supplierId}`)
	},
}
