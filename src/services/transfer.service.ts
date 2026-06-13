/**
 * Transfer Service
 * Handles warehouse transfers between branches
 */

import type { Transfer } from '@/src/types/crm'
import { apiGet, apiPatch, apiPost } from './apiClient'

export interface TransferRequest {
	toBranch: string
	items: Array<{ productId: string; quantity: number }>
	note?: string
}

export const transferService = {
	async getTransfers() {
		return apiGet<Transfer[]>('/transfers')
	},

	async createTransfer(data: TransferRequest, requestedBy: string) {
		return apiPost<Transfer>('/transfers', { ...data, requestedBy })
	},

	async approveTransfer(transferId: string, approvedBy: string) {
		return apiPatch(`/transfers/${transferId}/approve`, { approvedBy })
	},

	async rejectTransfer(transferId: string, rejectedBy: string) {
		return apiPatch(`/transfers/${transferId}/reject`, { rejectedBy })
	},
}
