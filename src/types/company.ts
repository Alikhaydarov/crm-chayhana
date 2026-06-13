export type Company = {
	id: string
	name: string
	address: string
	phone: string
	createdAt: string
}

export type CompanyPayment = {
	id: string
	companyId: string
	orderId: string
	amount: number
	note: string
	createdAt: string
}
