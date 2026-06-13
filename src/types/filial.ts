export type FilialRole =
	| 'superadmin'
	| 'restaurant1'
	| 'restaurant2'
	| 'shop'
	| 'warehouse'

export type FilialAdmin = {
	id: string
	name: string
	userId: string
	role: FilialRole
	branchName: string
	branchIcon: string
	active: boolean
	createdAt: string
}
