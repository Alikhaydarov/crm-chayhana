/**
 * Authentication Service
 * Handles login, logout, session restoration
 */

import type { UserInfo } from '@/src/types/crm'
import { apiGet, apiPost } from './apiClient'

export const authService = {
	async login(userId: string, password: string) {
		return apiPost<{
			user: UserInfo
			accessToken: string
			refreshToken?: string
		}>('/auth/login', { userId, password })
	},

	async logout() {
		return apiPost('/auth/logout')
	},

	async restoreSession() {
		return apiGet<{ user: UserInfo }>('/auth/me')
	},

	saveTokens(accessToken: string, refreshToken?: string) {
		if (typeof window === 'undefined') return
		localStorage.setItem('crm-access-token', accessToken)
		if (refreshToken) {
			localStorage.setItem('crm-refresh-token', refreshToken)
		}
	},

	clearTokens() {
		if (typeof window === 'undefined') return
		localStorage.removeItem('crm-access-token')
		localStorage.removeItem('crm-refresh-token')
	},
}
