/**
 * Shared API client for Django backend
 * Handles authentication, error handling, and common request/response logic
 */

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api'

interface ApiResponse<T = any> {
	success: boolean
	data?: T
	message?: string
	errors?: Record<string, any>
}

interface RequestOptions extends RequestInit {
	params?: Record<string, any>
}

function getAuthToken() {
	if (typeof window === 'undefined') return null
	return localStorage.getItem('crm-access-token')
}

function buildUrl(endpoint: string, params?: Record<string, any>) {
	const url = new URL(`${API_BASE}${endpoint}`)
	if (params) {
		Object.entries(params).forEach(([key, value]) => {
			if (value !== null && value !== undefined) {
				url.searchParams.append(key, String(value))
			}
		})
	}
	return url.toString()
}

export async function apiRequest<T = any>(
	endpoint: string,
	options: RequestOptions = {},
): Promise<ApiResponse<T>> {
	const { params, ...fetchOptions } = options
	const url = buildUrl(endpoint, params)
	const token = getAuthToken()

	const headers: HeadersInit = {
		'Content-Type': 'application/json',
		...fetchOptions.headers,
	}

	if (token) {
		headers.Authorization = `Bearer ${token}`
	}

	try {
		const response = await fetch(url, {
			...fetchOptions,
			headers,
			credentials: 'include', // Send cookies if using session auth
		})

		const data = await response.json().catch(() => ({}))

		if (!response.ok) {
			return {
				success: false,
				message: data.message || `API Error: ${response.status}`,
				errors: data.errors,
			}
		}

		return {
			success: true,
			data: data.data || data,
		}
	} catch (error) {
		const message = error instanceof Error ? error.message : 'Network error'
		return {
			success: false,
			message,
		}
	}
}

export async function apiGet<T = any>(
	endpoint: string,
	options?: Omit<RequestOptions, 'method'>,
) {
	return apiRequest<T>(endpoint, { ...options, method: 'GET' })
}

export async function apiPost<T = any>(
	endpoint: string,
	body?: any,
	options?: Omit<RequestOptions, 'method' | 'body'>,
) {
	return apiRequest<T>(endpoint, {
		...options,
		method: 'POST',
		body: body ? JSON.stringify(body) : undefined,
	})
}

export async function apiPut<T = any>(
	endpoint: string,
	body?: any,
	options?: Omit<RequestOptions, 'method' | 'body'>,
) {
	return apiRequest<T>(endpoint, {
		...options,
		method: 'PUT',
		body: body ? JSON.stringify(body) : undefined,
	})
}

export async function apiPatch<T = any>(
	endpoint: string,
	body?: any,
	options?: Omit<RequestOptions, 'method' | 'body'>,
) {
	return apiRequest<T>(endpoint, {
		...options,
		method: 'PATCH',
		body: body ? JSON.stringify(body) : undefined,
	})
}

export async function apiDelete<T = any>(
	endpoint: string,
	options?: Omit<RequestOptions, 'method'>,
) {
	return apiRequest<T>(endpoint, { ...options, method: 'DELETE' })
}
