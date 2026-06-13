'use client'
import { PageWrap } from '@/src/components/ui/PageWrap'
import type { Product } from '@/src/types/crm'

interface ProductsTabProps {
	products: Product[]
	stock: Record<string, number>
	companies: any[]
	fetchAll: () => void
	showToast: (msg: string, type?: 'success' | 'error') => void
	t: Record<string, string>
}

export function ProductsTab({ products, stock, t }: ProductsTabProps) {
	return (
		<PageWrap title='🏷️ Mahsulotlar' sub={`${products.length} ta mahsulot`}>
			<div
				style={{
					textAlign: 'center',
					padding: '60px 20px',
					color: 'var(--app-muted)',
				}}
			>
				<div style={{ fontSize: 36, marginBottom: 12 }}>🏷️</div>
				<div style={{ fontWeight: 700, fontSize: 16 }}>Mahsulotlar bo'limi</div>
				<div style={{ fontSize: 13, marginTop: 6 }}>
					Yaqin orada mavjud bo'ladi
				</div>
			</div>
		</PageWrap>
	)
}
