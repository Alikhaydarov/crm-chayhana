/**
 * Dashboard Service
 * Handles dashboard reports and snapshots
 */

import { apiGet } from './apiClient'

export interface DashboardSnapshot {
	mainStockValue: number
	totalProducts: number
	totalStaff: number
	branchStats: Array<{
		branch: string
		branchName: string
		staffCount: number
		stockValue: number
		lowStockCount: number
	}>
}

export const dashboardService = {
	async getSnapshot() {
		return apiGet<DashboardSnapshot>('/dashboard/snapshot')
	},

	async getReports() {
		return apiGet('/dashboard/reports')
	},
}
