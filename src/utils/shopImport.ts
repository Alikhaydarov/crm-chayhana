import type { ParsedShopSale, Product } from '../types/crm'

export function sourceHash(text: string) {
	let hash = 2166136261
	for (let index = 0; index < text.length; index++) {
		hash ^= text.charCodeAt(index)
		hash = Math.imul(hash, 16777619)
	}
	return (hash >>> 0).toString(36)
}

export async function parseShopWorkbook(
	file: File,
	products: Product[],
): Promise<ParsedShopSale[]> {
	const ExcelJS = (await import('exceljs')).default
	const workbook = new ExcelJS.Workbook()
	await workbook.xlsx.load(await file.arrayBuffer())
	const worksheet = workbook.worksheets[0]
	const rows: any[][] = []
	worksheet.eachRow({ includeEmpty: true }, row => {
		rows.push(
			Array.from({ length: worksheet.columnCount }, (_, index) => {
				const cell = row.getCell(index + 1)
				return index === 0 ? cell.text.trim() : cell.value
			}),
		)
	})
	const headerIndex = rows.findIndex((row, index) => {
		const next = rows[index + 1]
		return (
			index < 10 &&
			Boolean(row?.[0]) &&
			Boolean(next?.[0]) &&
			Number(next?.[6]) > 0 &&
			!Number(row?.[6])
		)
	})
	if (headerIndex < 0) throw new Error('Excel savdo ustunlari tanilmadi')

	return rows.slice(headerIndex + 1).flatMap(row => {
		const barcode = String(row?.[0] ?? '').trim()
		const sourceName = String(row?.[1] ?? '').trim()
		const quantity = Number(row?.[6] || 0)
		if (!barcode || !sourceName || quantity <= 0) return []
		const product = products.find(item => item.qrCode?.trim() === barcode)
		return [
			{
				barcode,
				sourceName,
				supplier: String(row?.[2] ?? '').trim(),
				quantity,
				salesAmount: Number(row?.[16] ?? row?.[3] ?? 0),
				averagePrice: Number(row?.[7] || 0),
				costAmount: Number(row?.[24] || 0),
				profitAmount: Number(row?.[25] || 0),
				productId: product?.id || '',
			},
		]
	})
}
