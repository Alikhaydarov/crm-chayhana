'use client'
import { warehouseService } from '@/src/services'
import type { Product, StockMap } from '@/src/types/crm'
import { useCallback, useState } from 'react'

export function useWarehouse() {
	const [products, setProducts] = useState<Product[]>([])
	const [stock, setStock] = useState<StockMap>({})
	const [loading, setLoading] = useState(false)
	const [error, setError] = useState<string | null>(null)

	const fetchWarehouse = useCallback(async () => {
		setLoading(true)
		setError(null)
		const response = await warehouseService.getWarehouse()
		if (response.success) {
			setProducts(response.data?.products || [])
			setStock(response.data?.stock || {})
		} else {
			setError(response.message || 'Failed to fetch warehouse data')
		}
		setLoading(false)
	}, [])

	return { products, stock, loading, error, fetchWarehouse }
}
