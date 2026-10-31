export function formatMoney(value: number | string | null | undefined, currency = 'CNY') {
  const n = Number(value ?? 0)
  const formatted = n.toLocaleString('zh-CN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
  if (currency === 'CNY') return `¥${formatted}`
  return `${currency} ${formatted}`
}

export function signedMoney(type: string, amount: number) {
  const abs = formatMoney(Math.abs(amount))
  if (type === 'INCOME') return `+${abs}`
  if (type === 'EXPENSE') return `-${abs}`
  return abs
}
