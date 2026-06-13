'use client'
import { createOrderApi } from '@/lib/api'
import { Modal } from '@/src/components/ui/Modal'
import { PageWrap } from '@/src/components/ui/PageWrap'
import { fmtDate, fmtM } from '@/src/constants'
import { PAY_CFG } from '@/src/constants/status'
import type { Company, Order, Product } from '@/src/types/crm'
import { useState } from 'react'

interface OrdersTabProps {
	orders: Order[]
	products: Product[]
	companies: Company[]
	fetchAll: () => void
	showToast: (msg: string, type?: 'success' | 'error') => void
	t: Record<string, string>
}

export function OrdersTab({
	orders,
	products,
	companies,
	fetchAll,
	showToast,
	t,
}: OrdersTabProps) {
	const [showModal, setShowModal] = useState(false)
	const todayValue = () => {
		const now = new Date()
		const offset = now.getTimezoneOffset() * 60000
		return new Date(now.getTime() - offset).toISOString().slice(0, 10)
	}
	const emptyForm = () => ({
		companyId: '',
		note: '',
		payStatus: 'unpaid' as 'paid' | 'unpaid',
		orderDate: todayValue(),
		receipt: null as any,
	})
	const [form, setForm] = useState(emptyForm)
	const [items, setItems] = useState([{ pid: '', qty: 1, price: 0 }])
	const [loading, setLoading] = useState(false)

	const total = items.reduce((s, i) => s + i.qty * (i.price || 0), 0)

	const submit = async () => {
		if (!form.companyId) {
			showToast('Firma tanlang', 'error')
			return
		}
		if (!form.orderDate) {
			showToast('Order sanasini kiriting', 'error')
			return
		}
		const valid = items.filter(i => i.pid && i.qty > 0 && i.price > 0)
		if (!valid.length) {
			showToast('Mahsulot va narx kiriting', 'error')
			return
		}
		setLoading(true)
		const d = await createOrderApi({
			companyId: form.companyId,
			items: valid.map(i => ({
				productId: i.pid,
				quantity: i.qty,
				pricePerUnit: i.price,
			})),
			note: form.note,
			payStatus: form.payStatus,
			paidAmount: 0,
			orderDate: form.orderDate,
			receipt: form.receipt || undefined,
		})
		if (d.success) {
			showToast('Order saqlandi ✅')
			setShowModal(false)
			setForm(emptyForm())
			setItems([{ pid: '', qty: 1, price: 0 }])
			fetchAll()
		} else showToast(d.message || 'Xatolik', 'error')
		setLoading(false)
	}

	return (
		<PageWrap
			title='🛒 Orderlar'
			sub={`${orders.length} ta order`}
			action={
				<button className='btn-primary' onClick={() => setShowModal(true)}>
					+ Yangi order
				</button>
			}
		>
			{showModal && (
				<Modal onClose={() => setShowModal(false)}>
					<div className='modal-title'>🛒 Yangi order</div>

					<div className='form-group'>
						<label className='form-label'>FIRMA</label>
						<select
							className='crm-input'
							value={form.companyId}
							onChange={e => setForm({ ...form, companyId: e.target.value })}
						>
							<option value=''>— Firma tanlang —</option>
							{companies.map((c: Company) => (
								<option key={c.id} value={c.id}>
									{c.name}
								</option>
							))}
						</select>
						{companies.length === 0 && (
							<div style={{ fontSize: 12, color: '#f0a500', marginTop: 6 }}>
								⚠️ Avval Firmalar bo'limida firma qo'shing
							</div>
						)}
					</div>

					{form.companyId && (
						<>
							<div className='form-group'>
								<label className='form-label'>ORDER SANASI</label>
								<input
									className='crm-input'
									type='date'
									value={form.orderDate}
									onChange={e =>
										setForm({ ...form, orderDate: e.target.value })
									}
								/>
							</div>

							<div className='form-group'>
								<label className='form-label'>MAHSULOTLAR</label>
								{items.map((item, i) => {
									const prod = products.find((p: Product) => p.id === item.pid)
									return (
										<div
											key={i}
											style={{
												background: 'var(--app-panel-soft)',
												borderRadius: 12,
												padding: 12,
												marginBottom: 10,
											}}
										>
											<div
												style={{
													display: 'grid',
													gridTemplateColumns: '1fr 80px 110px 36px',
													gap: 8,
													marginBottom: prod ? 8 : 0,
												}}
											>
												<select
													className='crm-input'
													value={item.pid}
													onChange={e => {
														const n = [...items]
														const p = products.find(
															(x: Product) => x.id === e.target.value,
														)
														n[i].pid = e.target.value
														n[i].price = p?.pricePerUnit || 0
														setItems(n)
													}}
												>
													<option value=''>Mahsulot</option>
													{products.map((p: Product) => (
														<option key={p.id} value={p.id}>
															{p.name}
														</option>
													))}
												</select>
												<input
													className='crm-input'
													type='number'
													value={item.qty}
													min={1}
													placeholder='Son'
													onChange={e => {
														const n = [...items]
														n[i].qty = parseFloat(e.target.value) || 1
														setItems(n)
													}}
												/>
												<input
													className='crm-input'
													type='number'
													value={item.price || ''}
													placeholder='Narx'
													onChange={e => {
														const n = [...items]
														n[i].price = parseFloat(e.target.value) || 0
														setItems(n)
													}}
												/>
												<button
													onClick={() =>
														setItems(items.filter((_, idx) => idx !== i))
													}
													style={{
														background: 'rgba(248,81,73,.1)',
														border: '1.5px solid rgba(248,81,73,.25)',
														color: '#f85149',
														borderRadius: 9,
														cursor: 'pointer',
														fontWeight: 900,
														fontSize: 16,
													}}
												>
													×
												</button>
											</div>
											{prod && item.price > 0 && (
												<div
													style={{ fontSize: 12, color: 'var(--app-muted)' }}
												>
													{prod.name} × {item.qty} ={' '}
													<strong style={{ color: '#3fb950' }}>
														{fmtM(item.qty * item.price)}
													</strong>
												</div>
											)}
										</div>
									)
								})}
								<button
									onClick={() =>
										setItems([...items, { pid: '', qty: 1, price: 0 }])
									}
									style={{
										width: '100%',
										padding: '9px',
										borderRadius: 10,
										border: '1.5px dashed rgba(115,103,240,.4)',
										background: 'rgba(115,103,240,.05)',
										color: '#7367f0',
										cursor: 'pointer',
										fontWeight: 700,
										fontSize: 13,
										fontFamily: 'inherit',
									}}
								>
									+ Mahsulot
								</button>
							</div>

							{total > 0 && (
								<div
									style={{
										background:
											'linear-gradient(135deg,rgba(63,185,80,.08),rgba(63,185,80,.04))',
										border: '1px solid rgba(63,185,80,.25)',
										borderRadius: 12,
										padding: '14px 16px',
										marginBottom: 14,
										display: 'flex',
										justifyContent: 'space-between',
										alignItems: 'center',
									}}
								>
									<span style={{ color: 'var(--app-muted)', fontWeight: 700 }}>
										Jami summa
									</span>
									<span
										style={{ fontWeight: 900, fontSize: 22, color: '#3fb950' }}
									>
										{fmtM(total)}
									</span>
								</div>
							)}

							<div className='form-group'>
								<label className='form-label'>TO'LOV HOLATI</label>
								<div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
									{(['paid', 'unpaid'] as const).map(m => (
										<button
											key={m}
											onClick={() =>
												setForm({
													...form,
													payStatus: m,
													receipt: m === 'paid' ? form.receipt : null,
												})
											}
											style={{
												padding: '8px 16px',
												borderRadius: 10,
												border: `2px solid ${form.payStatus === m ? PAY_CFG[m].c : 'var(--app-border)'}`,
												background:
													form.payStatus === m ? PAY_CFG[m].bg : 'transparent',
												color:
													form.payStatus === m
														? PAY_CFG[m].c
														: 'var(--app-muted)',
												cursor: 'pointer',
												fontSize: 12,
												fontWeight: 800,
												fontFamily: 'inherit',
												transition: 'all .15s',
											}}
										>
											{PAY_CFG[m].l}
										</button>
									))}
								</div>
							</div>

							<div className='form-group'>
								<label className='form-label'>ESLATMA</label>
								<textarea
									className='crm-input'
									value={form.note}
									onChange={e => setForm({ ...form, note: e.target.value })}
									rows={2}
									style={{ resize: 'vertical' }}
								/>
							</div>
						</>
					)}

					<div style={{ display: 'flex', gap: 10 }}>
						<button
							className='btn-ghost'
							onClick={() => setShowModal(false)}
							style={{ flex: 1 }}
						>
							Bekor
						</button>
						<button
							className='btn-primary'
							onClick={submit}
							disabled={loading || !form.companyId}
							style={{ flex: 2 }}
						>
							{loading
								? `${'Yuborilmoqda...'}`
								: `💾 ${'Saqlash'} + ${"Skladga qo'shildi"}`}
						</button>
					</div>
				</Modal>
			)}

			<div className='table-wrap'>
				<table className='crm-table'>
					<thead>
						<tr>
							<th>Order ID</th>
							<th>Firma</th>
							<th className='hide-mobile'>Mahsulotlar</th>
							<th>Jami</th>
							<th>To'lov</th>
							<th className='hide-mobile'>Sana</th>
						</tr>
					</thead>
					<tbody>
						{orders.map((o: Order) => {
							const pay = PAY_CFG[o.payStatus]
							const debt = o.totalPrice - o.paidAmount
							return (
								<tr key={o.id}>
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
											{o.id.slice(-8)}
										</span>
									</td>
									<td style={{ fontWeight: 700 }}>🏢 {o.companyName}</td>
									<td
										className='hide-mobile'
										style={{ color: 'var(--app-muted)', fontSize: 12 }}
									>
										{o.items.length} ta
									</td>
									<td>
										<div style={{ fontWeight: 900, color: '#3fb950' }}>
											{fmtM(o.totalPrice)}
										</div>
										{debt > 0 && (
											<div style={{ fontSize: 11, color: '#f85149' }}>
												Qarz: {fmtM(debt)}
											</div>
										)}
									</td>
									<td>
										<span
											className='badge'
											style={{ background: pay.bg, color: pay.c }}
										>
											{pay.l}
										</span>
									</td>
									<td
										className='hide-mobile'
										style={{ fontSize: 11, color: 'var(--app-muted)' }}
									>
										{fmtDate(o.createdAt)}
									</td>
								</tr>
							)
						})}
						{orders.length === 0 && (
							<tr>
								<td
									colSpan={6}
									style={{
										textAlign: 'center',
										color: 'var(--app-muted)',
										padding: 48,
									}}
								>
									<div style={{ fontSize: 36, marginBottom: 8 }}>🛒</div>
									<div style={{ fontWeight: 700 }}>Order yo'q</div>
									<div style={{ fontSize: 12, marginTop: 4 }}>
										"+ Yangi order" tugmasini bosing
									</div>
								</td>
							</tr>
						)}
					</tbody>
				</table>
			</div>
		</PageWrap>
	)
}
