/**
 * Supplier Service
 * Handles supplier/firm management and payments
 */

import type { Company, CompanyPayment } from '@/src/types/crm'
import { apiGet, apiPatch, apiPost } from './apiClient'

export interface CreateSupplierRequest {
	name: string
	address?: string
	phone?: string
}

export interface PaySupplierRequest {
	orderId: string
	amount: number
	note?: string
}

export const supplierService = {
	async getSuppliers() {
		return apiGet<Company[]>('/suppliers')
	},

	async createSupplier(data: CreateSupplierRequest) {
		return apiPost<Company>('/suppliers', data)
	},

	async getSupplierById(supplierId: string) {
		return apiGet<Company>(`/suppliers/${supplierId}`)
	},

	async getSupplierPayments(supplierId: string) {
		return apiGet<CompanyPayment[]>(`/suppliers/${supplierId}/payments`)
	},

	async paySupplier(supplierId: string, data: PaySupplierRequest) {
		return apiPatch(`/suppliers/${supplierId}/pay`, data)
	},

	async updateSupplierPayment(paymentId: string, data: any) {
		return apiPatch(`/suppliers/payments/${paymentId}`, data)
	},
}
