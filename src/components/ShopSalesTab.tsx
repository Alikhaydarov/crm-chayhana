'use client'
import { PageWrap } from '@/src/components/ui/PageWrap'

export function ShopSalesTab(props: any) {
	return (
		<PageWrap
			title="Do'kon savdo tahlili"
			sub='Excel savdolar, foyda va sklad harakati'
		>
			<div
				style={{
					textAlign: 'center',
					padding: '60px 20px',
					color: 'var(--app-muted)',
				}}
			>
				<div style={{ fontSize: 36, marginBottom: 12 }}>📊</div>
				<div style={{ fontWeight: 700, fontSize: 16 }}>
					Do'kon savdo tahlili
				</div>
				<div style={{ fontSize: 13, marginTop: 6 }}>
					Yaqin orada mavjud bo'ladi
				</div>
			</div>
		</PageWrap>
	)
}
