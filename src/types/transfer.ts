export type Transfer = {
	id: string
	toBranch: string
	items: any[]
	totalValue: number
	requestedBy: string
	approvedBy?: string
	status: 'pending' | 'approved' | 'rejected'
	note?: string
	createdAt: string
	updatedAt: string
}
