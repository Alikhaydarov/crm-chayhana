/**
 * Order Service
 * Handles orders and order management
 */

import type { Order } from '@/src/types/crm'
import { apiGet, apiPatch, apiPost } from './apiClient'

export interface CreateOrderRequest {
	companyId: string
	items: Array<{ productId: string; quantity: number; pricePerUnit: number }>
	payStatus: 'paid' | 'unpaid'
	paidAmount: number
	orderDate: string
	note?: string
	receipt?: any
}

export interface PayOrderRequest {
	amount: number
	note?: string
}

export const orderService = {
	async getOrders() {
		return apiGet<Order[]>('/orders')
	},

	async createOrder(data: CreateOrderRequest) {
		return apiPost<Order>('/orders', data)
	},

	async payOrder(orderId: string, data: PayOrderRequest) {
		return apiPatch(`/orders/${orderId}/pay`, data)
	},

	async getOrdersByCompany(companyId: string) {
		return apiGet<Order[]>(`/orders?company=${companyId}`)
	},
}
