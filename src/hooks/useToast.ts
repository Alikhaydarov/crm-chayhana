'use client'
import { useCallback, useState } from 'react'

export default function useToast() {
	const [toast, setToast] = useState<{
		msg: string
		type: 'success' | 'error'
	} | null>(null)
	const show = useCallback(
		(msg: string, type: 'success' | 'error' = 'success') => {
			setToast({ msg, type })
			setTimeout(() => setToast(null), 3200)
		},
		[],
	)
	return { toast, show }
}
