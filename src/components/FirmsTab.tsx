'use client'
import { PageWrap } from '@/src/components/ui/PageWrap'

export function FirmsTab({ companies, t }: any) {
	return (
		<PageWrap title='🏢 Firmalar' sub={`${companies.length} ta firma`}>
			<div
				style={{
					textAlign: 'center',
					padding: '60px 20px',
					color: 'var(--app-muted)',
				}}
			>
				<div style={{ fontSize: 36, marginBottom: 12 }}>🏢</div>
				<div style={{ fontWeight: 700, fontSize: 16 }}>Firmalar bo'limi</div>
				<div style={{ fontSize: 13, marginTop: 6 }}>
					Yaqin orada mavjud bo'ladi
				</div>
			</div>
		</PageWrap>
	)
}
