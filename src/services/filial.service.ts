/**
 * Filial/Admin Service
 * Handles filial admins management
 */

import type { FilialAdmin } from '@/src/types/crm'
import { apiGet, apiPatch, apiPost } from './apiClient'

export interface CreateFilialAdminRequest {
	name: string
	login: string
	role: 'superadmin' | 'restaurant1' | 'restaurant2' | 'shop'
	active: boolean
}

export const filialService = {
	async getFilialAdmins() {
		return apiGet<FilialAdmin[]>('/filials/admins')
	},

	async createFilialAdmin(data: CreateFilialAdminRequest) {
		return apiPost<FilialAdmin>('/filials/admins', data)
	},

	async toggleFilialAdminStatus(adminId: string, active: boolean) {
		return apiPatch(`/filials/admins/${adminId}`, { active })
	},

	async deleteFilialAdmin(adminId: string) {
		return apiPatch(`/filials/admins/${adminId}`, { deleted: true })
	},

	async getFilialAdminById(adminId: string) {
		return apiGet<FilialAdmin>(`/filials/admins/${adminId}`)
	},
}
