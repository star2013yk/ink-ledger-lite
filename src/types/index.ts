export type TransactionType = 'EXPENSE' | 'INCOME' | 'TRANSFER'
export type CategoryKind = 'EXPENSE' | 'INCOME'
export type AccountType = 'CASH' | 'BANK' | 'CREDIT_CARD' | 'ALIPAY' | 'WECHAT' | 'OTHER'

export interface Account {
  id: number
  name: string
  type: string
  currency: string
  initialBalance: number
  balance: number
  icon?: string | null
  archived: boolean
  note?: string | null
  createdAt?: string
  updatedAt?: string
}

export interface Category {
  id: number
  parentId: number | null
  kind: CategoryKind
  name: string
  icon?: string | null
  archived: boolean
}

export interface Tag {
  id: number
  name: string
  icon?: string | null
}

export interface Transaction {
  id: number
  type: TransactionType
  amount: number
  occurredAt: string
  accountId: number
  accountName?: string | null
  toAccountId?: number | null
  categoryId?: number | null
  categoryName?: string | null
  payee?: string | null
  note?: string | null
  tagId?: number | null
  tagName?: string | null
  icon?: string | null
  archived?: boolean
  createdAt?: string
  updatedAt?: string
}

export interface PageResult<T> {
  records: T[]
  total: number
  current?: number
  size?: number
  pages?: number
}

export interface OverviewReport {
  totalIncome: number
  totalExpense: number
  monthIncome: number
  monthExpense: number
}

export interface MonthTrendPoint {
  date: string
  day: number
  /** 当日收入发生额 */
  income: number
  /** 当日支出发生额 */
  expense: number
}

export interface ReportSummary {
  monthIncome: number
  monthExpense: number
  monthBalance: number
}

export interface CategorySlice {
  categoryId: number
  categoryName: string
  amount: number
}

export interface TrendPoint {
  period: string
  income: number
  expense: number
}

export interface CalendarDay {
  date: string
  income: number
  expense: number
  balance: number
}

export interface SysSettingItem {
  id: number
  name: string
  value: string
}

export interface TransactionPageQuery {
  page?: number
  size?: number
  type?: string
  accountId?: number
  categoryId?: number
  payee?: string
  tagId?: number
  occurredAtBegin?: string
  occurredAtEnd?: string
}
