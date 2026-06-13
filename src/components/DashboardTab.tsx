'use client'
import { PageWrap } from '@/src/components/ui/PageWrap'
import { BICON, BNAME, ST_CFG, fmtD, fmtM } from '@/src/constants'
import type { Order } from '@/src/types/crm'
import { ChevronRight, TrendingUp } from 'lucide-react'

interface DashboardTabProps {
	reports: any
	user: any
	setTab: (tab: string) => void
	transfers: any[]
	orders: Order[]
	companies: any[]
	t: Record<string, string>
}

export function DashboardTab({
	reports,
	user,
	setTab,
	transfers,
	orders,
	companies,
	t,
}: DashboardTabProps) {
	if (!reports)
		return (
			<PageWrap>
				<div
					style={{
						color: 'var(--app-muted)',
						padding: 40,
						textAlign: 'center',
					}}
				>
					{t.loading}
				</div>
			</PageWrap>
		)
	const isSA = user.role === 'superadmin'
	const totalDebt = orders.reduce(
		(s: number, o: Order) => s + (o.totalPrice - o.paidAmount),
		0,
	)
	const today = new Date().toLocaleDateString('uz-UZ', {
		weekday: 'long',
		year: 'numeric',
		month: 'long',
		day: 'numeric',
	})

	const stats = isSA
		? [
				{
					l: 'Sklad qiymati',
					v: fmtM(reports.mainStockValue),
					c: '#3fb950',
					bg: 'rgba(63,185,80,.08)',
					i: '💰',
				},
				{
					l: 'Mahsulot turlari',
					v: String(reports.totalProducts),
					c: '#7367f0',
					bg: 'rgba(115,103,240,.08)',
					i: '📦',
				},
				{
					l: 'Jami xodimlar',
					v: String(reports.totalStaff),
					c: '#3b82f6',
					bg: 'rgba(59,130,246,.08)',
					i: '👥',
				},
				{
					l: 'Order qarzi',
					v: fmtM(totalDebt),
					c: totalDebt > 0 ? '#f85149' : '#3fb950',
					bg: totalDebt > 0 ? 'rgba(248,81,73,.08)' : 'rgba(63,185,80,.08)',
					i: '🏢',
				},
			]
		: [
				{
					l: 'Skladim',
					v: fmtM(
						reports.branchStats?.find((b: any) => b.branch === user.role)
							?.stockValue || 0,
					),
					c: '#3fb950',
					bg: 'rgba(63,185,80,.08)',
					i: '💰',
				},
				{
					l: "So'rovlarim",
					v: String(transfers.length),
					c: '#7367f0',
					bg: 'rgba(115,103,240,.08)',
					i: '🔄',
				},
				{
					l: 'Kutilayotgan',
					v: String(
						transfers.filter((t: any) => t.status === 'pending').length,
					),
					c: '#f0a500',
					bg: 'rgba(240,165,0,.08)',
					i: '⏳',
				},
				{
					l: 'Firmalar',
					v: String(companies.length),
					c: '#a855f7',
					bg: 'rgba(168,85,247,.08)',
					i: '🏢',
				},
			]

	return (
		<PageWrap
			title={`${user.branchIcon} ${user.branchName}`}
			sub={today}
			action={
				user.role === 'shop' ? (
					<button className='btn-primary' onClick={() => setTab('shop-sales')}>
						<TrendingUp size={16} /> Savdo tahlili
					</button>
				) : undefined
			}
		>
			{/* Stats */}
			<div
				className='stat-row'
				style={{
					display: 'grid',
					gridTemplateColumns: 'repeat(4,1fr)',
					gap: 14,
					marginBottom: 28,
				}}
			>
				{stats.map((s, i) => (
					<div
						key={i}
						className='stat-card fade-up'
						style={{
							animationDelay: `${i * 60}ms`,
							borderTop: `3px solid ${s.c}`,
							background: `linear-gradient(160deg,${s.bg},var(--app-panel))`,
						}}
					>
						<div style={{ fontSize: 28, marginBottom: 10 }}>{s.i}</div>
						<div
							style={{
								color: 'var(--app-muted)',
								fontSize: 11,
								fontWeight: 700,
								marginBottom: 6,
								letterSpacing: 0.3,
							}}
						>
							{s.l}
						</div>
						<div
							style={{
								fontWeight: 900,
								fontSize: s.v.length > 10 ? 16 : 20,
								color: s.c,
								letterSpacing: -0.3,
							}}
						>
							{s.v}
						</div>
					</div>
				))}
			</div>

			{/* Branch stats */}
			{isSA && reports.branchStats && (
				<div style={{ marginBottom: 28 }}>
					<div
						style={{
							fontSize: 15,
							fontWeight: 800,
							marginBottom: 14,
							display: 'flex',
							alignItems: 'center',
							gap: 8,
						}}
					>
						🏢 Filiallar{' '}
						<span
							style={{
								color: 'var(--app-muted)',
								fontWeight: 500,
								fontSize: 13,
							}}
						>
							holati
						</span>
					</div>
					<div
						className='branch-grid'
						style={{
							display: 'grid',
							gridTemplateColumns: 'repeat(3,1fr)',
							gap: 14,
						}}
					>
						{reports.branchStats.map((b: any, i: number) => (
							<button
								key={b.branch}
								className='fade-up branch-summary-card'
								onClick={() => b.branch === 'shop' && setTab('shop-sales')}
								disabled={b.branch !== 'shop'}
								style={{
									animationDelay: `${i * 80}ms`,
									background: 'var(--app-panel)',
									border: '1px solid var(--app-border)',
									borderRadius: 8,
									padding: 18,
									transition: 'all .2s',
									color: 'var(--app-text)',
									fontFamily: 'inherit',
									textAlign: 'left',
									cursor: b.branch === 'shop' ? 'pointer' : 'default',
									width: '100%',
								}}
							>
								<div
									style={{
										display: 'flex',
										alignItems: 'center',
										gap: 10,
										marginBottom: 14,
									}}
								>
									<div
										style={{
											width: 40,
											height: 40,
											borderRadius: 8,
											background: 'rgba(115,103,240,.1)',
											display: 'flex',
											alignItems: 'center',
											justifyContent: 'center',
											fontSize: 22,
										}}
									>
										{BICON[b.branch]}
									</div>
									<div style={{ flex: 1 }}>
										<div style={{ fontWeight: 800, fontSize: 14 }}>
											{b.branchName}
										</div>
										<div style={{ fontSize: 11, color: 'var(--app-muted)' }}>
											{b.staffCount} xodim
										</div>
									</div>
									{b.branch === 'shop' && (
										<ChevronRight size={18} color='var(--app-primary)' />
									)}
								</div>
								<div
									style={{
										display: 'grid',
										gridTemplateColumns: '1fr 1fr',
										gap: 8,
									}}
								>
									{[
										['Sklad', fmtM(b.stockValue), '#3fb950'],
										[
											'Kam qoldi',
											b.lowStockCount,
											b.lowStockCount > 0 ? '#f85149' : '#3fb950',
										],
									].map(([l, v, c]) => (
										<div
											key={String(l)}
											style={{
												background: 'var(--app-panel-soft)',
												borderRadius: 10,
												padding: '9px 11px',
											}}
										>
											<div
												style={{
													fontSize: 10,
													color: 'var(--app-muted)',
													marginBottom: 4,
													fontWeight: 700,
												}}
											>
												{l}
											</div>
											<div
												style={{
													fontWeight: 900,
													color: String(c),
													fontSize: 13,
												}}
											>
												{v}
											</div>
										</div>
									))}
								</div>
							</button>
						))}
					</div>
				</div>
			)}

			{/* Recent transfers */}
			<div
				style={{
					display: 'flex',
					justifyContent: 'space-between',
					alignItems: 'center',
					marginBottom: 14,
				}}
			>
				<div style={{ fontSize: 15, fontWeight: 800 }}>
					🔄 Oxirgi transferlar
				</div>
				<button
					className='btn-icon'
					onClick={() => setTab('transfers')}
					style={{
						color: '#7367f0',
						background: 'rgba(115,103,240,.1)',
						borderColor: 'rgba(115,103,240,.2)',
					}}
				>
					Barchasi →
				</button>
			</div>
			<div className='table-wrap'>
				<table className='crm-table'>
					<thead>
						<tr>
							<th>ID</th>
							<th>Filial</th>
							<th>Qiymat</th>
							<th>Status</th>
							<th className='hide-mobile'>Sana</th>
						</tr>
					</thead>
					<tbody>
						{transfers.slice(0, 6).map((t: any) => {
							const st = ST_CFG[t.status as keyof typeof ST_CFG]
							return (
								<tr key={t.id}>
									<td>
										<span
											style={{
												fontFamily: 'monospace',
												fontSize: 11,
												color: '#7367f0',
												background: 'rgba(115,103,240,.08)',
												padding: '2px 8px',
												borderRadius: 6,
											}}
										>
											{t.id.slice(-8)}
										</span>
									</td>
									<td>
										{BICON[t.toBranch]} {BNAME[t.toBranch]}
									</td>
									<td style={{ color: '#3fb950', fontWeight: 800 }}>
										{fmtM(t.totalValue)}
									</td>
									<td>
										<span
											className='badge'
											style={{ background: st.bg, color: st.c }}
										>
											{st.i} {st.l}
										</span>
									</td>
									<td
										className='hide-mobile'
										style={{ fontSize: 11, color: 'var(--app-muted)' }}
									>
										{fmtD(t.createdAt)}
									</td>
								</tr>
							)
						})}
						{transfers.length === 0 && (
							<tr>
								<td
									colSpan={5}
									style={{
										textAlign: 'center',
										color: 'var(--app-muted)',
										padding: 32,
									}}
								>
									Transfer yo'q
								</td>
							</tr>
						)}
					</tbody>
				</table>
			</div>
		</PageWrap>
	)
}
