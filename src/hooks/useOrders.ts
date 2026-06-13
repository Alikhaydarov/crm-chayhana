'use client'
import { orderService } from '@/src/services'
import type { Order } from '@/src/types/crm'
import { useCallback, useState } from 'react'

export function useOrders() {
	const [orders, setOrders] = useState<Order[]>([])
	const [loading, setLoading] = useState(false)
	const [error, setError] = useState<string | null>(null)

	const fetchOrders = useCallback(async () => {
		setLoading(true)
		setError(null)
		const response = await orderService.getOrders()
		if (response.success) {
			setOrders(response.data || [])
		} else {
			setError(response.message || 'Failed to fetch orders')
		}
		setLoading(false)
	}, [])

	return { orders, loading, error, fetchOrders }
}
