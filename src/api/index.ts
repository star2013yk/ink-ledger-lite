import * as local from '@/db/repository'

/**
 * 纯本地版：所有「接口」都由 IndexedDB 实现，方法签名与原后端 api 保持一致，
 * 视图层无需区分数据来自服务端还是浏览器。
 */
export const api = local

export function toLocalDateTime(value?: string | Date | null) {
  if (!value) return undefined
  const d = typeof value === 'string' ? new Date(value) : value
  if (Number.isNaN(d.getTime())) return typeof value === 'string' ? value : undefined
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
}
