'use client'
import { productService } from '@/src/services'
import type { Product } from '@/src/types/crm'
import { useCallback, useState } from 'react'

export function useProducts() {
	const [products, setProducts] = useState<Product[]>([])
	const [loading, setLoading] = useState(false)
	const [error, setError] = useState<string | null>(null)

	const fetchProducts = useCallback(async () => {
		setLoading(true)
		setError(null)
		const response = await productService.getProducts()
		if (response.success) {
			setProducts(response.data || [])
		} else {
			setError(response.message || 'Failed to fetch products')
		}
		setLoading(false)
	}, [])

	return { products, loading, error, fetchProducts }
}
