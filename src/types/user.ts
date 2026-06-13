export type Role =
	| 'superadmin'
	| 'restaurant1'
	| 'restaurant2'
	| 'shop'
	| 'warehouse'
export type ThemeMode = 'dark' | 'light'
export type Lang = 'uz' | 'ko'

export type UserInfo = {
	id: string
	name: string
	role: Role
	branchName: string
	branchIcon: string
}
