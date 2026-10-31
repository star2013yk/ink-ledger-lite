import dayjs from 'dayjs'
import { db } from './database'
import {
  SEED_VERSION,
  seedAccounts,
  seedCategories,
  seedSettings,
  seedTags,
  seedTransactions,
} from './seed'
import type {
  Account,
  CalendarDay,
  Category,
  CategoryKind,
  CategorySlice,
  MonthTrendPoint,
  OverviewReport,
  PageResult,
  ReportSummary,
  SysSettingItem,
  Tag,
  Transaction,
  TransactionPageQuery,
  TrendPoint,
} from '@/types'

interface NextIds {
  account: number
  category: number
  tag: number
  txn: number
  setting: number
}

const META_SEED = 'seedVersion'
const META_NEXT_IDS = 'nextIds'

const maxId = (list: { id: number }[]) => list.reduce((m, x) => Math.max(m, x.id), 0)

function defaultNextIds(): NextIds {
  return {
    account: maxId(seedAccounts) + 1,
    category: maxId(seedCategories) + 1,
    tag: maxId(seedTags) + 1,
    txn: maxId(seedTransactions) + 1,
    setting: maxId(seedSettings) + 1,
  }
}

/** 首次打开自动写入示例数据；只执行一次 */
let readyPromise: Promise<void> | null = null

function ensureReady() {
  if (!readyPromise) readyPromise = seedIfEmpty()
  return readyPromise
}

async function seedIfEmpty() {
  const mark = await db.meta.get(META_SEED)
  if (mark) return
  await db.transaction(
    'rw',
    db.accounts,
    db.categories,
    db.tags,
    db.transactions,
    db.settings,
    db.meta,
    async () => {
      if (await db.meta.get(META_SEED)) return
      await db.accounts.bulkPut(structuredClone(seedAccounts))
      await db.categories.bulkPut(structuredClone(seedCategories))
      await db.tags.bulkPut(structuredClone(seedTags))
      await db.transactions.bulkPut(structuredClone(seedTransactions))
      await db.settings.bulkPut(structuredClone(seedSettings))
      await db.meta.put({ key: META_SEED, value: SEED_VERSION })
      await db.meta.put({ key: META_NEXT_IDS, value: defaultNextIds() })
    },
  )
  await recalcBalances()
}

async function readNextIds(): Promise<NextIds> {
  const row = await db.meta.get(META_NEXT_IDS)
  if (row?.value) return row.value as NextIds
  const ids = defaultNextIds()
  await db.meta.put({ key: META_NEXT_IDS, value: ids })
  return ids
}

async function takeId(key: keyof NextIds): Promise<number> {
  const ids = await readNextIds()
  const id = ids[key]
  ids[key] = id + 1
  await db.meta.put({ key: META_NEXT_IDS, value: ids })
  return id
}

/* ------------------------------- 余额重算 ------------------------------- */

function applyDelta(accounts: Account[], id: number | null | undefined, delta: number) {
  const account = accounts.find((a) => a.id === id)
  if (!account) return
  account.balance = Number((account.balance + delta).toFixed(4))
}

function applyTxn(accounts: Account[], txn: Transaction, sign: 1 | -1) {
  if (txn.archived) return
  if (txn.type === 'EXPENSE') applyDelta(accounts, txn.accountId, -txn.amount * sign)
  else if (txn.type === 'INCOME') applyDelta(accounts, txn.accountId, txn.amount * sign)
  else if (txn.type === 'TRANSFER') {
    applyDelta(accounts, txn.accountId, -txn.amount * sign)
    applyDelta(accounts, txn.toAccountId, txn.amount * sign)
  }
}

/**
 * 余额是派生值：始终由 initialBalance + 全部有效流水重算，
 * 这样新增/编辑/删除/改期初都不需要写增量回滚逻辑，也不会出现账实不符。
 */
async function recalcBalances() {
  const accounts = await db.accounts.toArray()
  const transactions = await db.transactions.toArray()
  for (const a of accounts) a.balance = Number(a.initialBalance ?? 0)
  const sorted = transactions
    .filter((t) => !t.archived)
    .sort((a, b) => a.occurredAt.localeCompare(b.occurredAt) || a.id - b.id)
  for (const t of sorted) applyTxn(accounts, t, 1)
  await db.accounts.bulkPut(accounts)
}

async function enrich(list: Transaction[]): Promise<Transaction[]> {
  if (!list.length) return []
  const [accounts, categories, tags] = [
    await db.accounts.toArray(),
    await db.categories.toArray(),
    await db.tags.toArray(),
  ]
  const aMap = new Map(accounts.map((a) => [a.id, a]))
  const cMap = new Map(categories.map((c) => [c.id, c]))
  const tMap = new Map(tags.map((t) => [t.id, t]))
  return list.map((txn) => {
    const category = txn.categoryId ? cMap.get(txn.categoryId) : undefined
    const tag = txn.tagId ? tMap.get(txn.tagId) : undefined
    return {
      ...txn,
      accountName: aMap.get(txn.accountId)?.name ?? null,
      categoryName: category?.name ?? null,
      tagName: tag?.name ?? null,
      icon: tag?.icon ?? category?.icon ?? null,
    }
  })
}

function validateTransaction(txn: Pick<Transaction, 'type' | 'amount' | 'accountId' | 'toAccountId' | 'occurredAt'>) {
  if (!txn.occurredAt) throw new Error('发生时间不能为空')
  if (!(Number(txn.amount) > 0)) throw new Error('金额须大于 0')
  if (!txn.accountId) throw new Error('账户不能为空')
  if (txn.type === 'TRANSFER') {
    if (!txn.toAccountId) throw new Error('请选择转入账户')
    if (txn.toAccountId === txn.accountId) throw new Error('转出与转入账户不能相同')
  }
}

/* -------------------------------- 账户 -------------------------------- */

export async function listAccounts(): Promise<Account[]> {
  await ensureReady()
  return (await db.accounts.toArray()).filter((a) => !a.archived).sort((a, b) => a.id - b.id)
}

export async function saveAccount(payload: Partial<Account> & { name: string; type: string }) {
  await ensureReady()
  if (payload.id) {
    const old = await db.accounts.get(payload.id)
    if (!old) throw new Error('账户不存在')
    if (old.archived) throw new Error('已归档账户不能编辑')
    await db.accounts.put({
      ...old,
      ...payload,
      id: old.id,
      archived: old.archived,
      balance: old.balance,
      updatedAt: new Date().toISOString(),
    })
    await recalcBalances()
    return true
  }
  const id = await takeId('account')
  const account: Account = {
    id,
    name: payload.name,
    type: payload.type,
    currency: payload.currency || 'CNY',
    initialBalance: Number(payload.initialBalance ?? 0),
    balance: Number(payload.initialBalance ?? 0),
    archived: false,
    icon: payload.icon ?? null,
    note: payload.note ?? null,
  }
  await db.accounts.put(account)
  return account
}

export async function archiveAccount(id: number) {
  await ensureReady()
  const account = await db.accounts.get(id)
  if (!account) return false
  await db.accounts.put({ ...account, archived: true, updatedAt: new Date().toISOString() })
  return true
}

/* -------------------------------- 分类 -------------------------------- */

export async function listCategories(kind?: CategoryKind): Promise<Category[]> {
  await ensureReady()
  const list = (await db.categories.toArray())
    .filter((c) => !c.archived)
    .sort((a, b) => a.id - b.id)
  return kind ? list.filter((c) => c.kind === kind) : list
}

export async function saveCategory(payload: Partial<Category> & { name: string; kind: CategoryKind }) {
  await ensureReady()
  const name = payload.name.trim()
  if (!name) throw new Error('分类名称不能为空')
  const siblings = (await db.categories.toArray()).filter(
    (c) =>
      !c.archived &&
      c.id !== payload.id &&
      c.kind === payload.kind &&
      (c.parentId ?? null) === (payload.parentId ?? null) &&
      c.name === name,
  )
  if (siblings.length) throw new Error('同级下已存在同名分类')

  if (payload.id) {
    const old = await db.categories.get(payload.id)
    if (!old) throw new Error('分类不存在')
    await db.categories.put({
      ...old,
      ...payload,
      id: old.id,
      name,
      archived: old.archived,
    })
    return true
  }
  const id = await takeId('category')
  await db.categories.put({
    id,
    parentId: payload.parentId ?? null,
    kind: payload.kind,
    name,
    icon: payload.icon ?? null,
    archived: false,
  })
  return true
}

export async function deleteCategory(id: number) {
  await ensureReady()
  const category = await db.categories.get(id)
  if (!category) return false
  await db.categories.put({ ...category, archived: true })
  return true
}

/* -------------------------------- 标签 -------------------------------- */

export async function listTags(): Promise<Tag[]> {
  await ensureReady()
  return (await db.tags.toArray()).sort((a, b) => a.id - b.id)
}

export async function saveTag(payload: Partial<Tag> & { name: string }) {
  await ensureReady()
  const name = payload.name.trim()
  if (!name) throw new Error('标签名称不能为空')
  const duplicate = (await db.tags.toArray()).find((t) => t.id !== payload.id && t.name === name)
  if (duplicate) throw new Error('标签名称已存在')

  if (payload.id) {
    const old = await db.tags.get(payload.id)
    if (!old) throw new Error('标签不存在')
    await db.tags.put({ ...old, ...payload, id: old.id, name })
    return true
  }
  const id = await takeId('tag')
  await db.tags.put({ id, name, icon: payload.icon ?? null })
  return true
}

export async function deleteTag(id: number) {
  await ensureReady()
  await db.transaction('rw', db.tags, db.transactions, async () => {
    await db.tags.delete(id)
    const affected = await db.transactions.where('tagId').equals(id).toArray()
    for (const txn of affected) await db.transactions.put({ ...txn, tagId: null })
  })
  return true
}

/* -------------------------------- 流水 -------------------------------- */

export async function pageTransactions(params: TransactionPageQuery): Promise<PageResult<Transaction>> {
  await ensureReady()
  const all = (await db.transactions.toArray()).filter((t) => !t.archived)
  let list = all
  if (params.type) list = list.filter((t) => t.type === params.type)
  if (params.accountId) {
    list = list.filter((t) => t.accountId === params.accountId || t.toAccountId === params.accountId)
  }
  if (params.categoryId) list = list.filter((t) => t.categoryId === params.categoryId)
  if (params.tagId) list = list.filter((t) => t.tagId === params.tagId)
  if (params.payee) {
    const key = params.payee.toLowerCase()
    list = list.filter(
      (t) =>
        (t.payee || '').toLowerCase().includes(key) || (t.note || '').toLowerCase().includes(key),
    )
  }
  // 与后端一致：开始含、结束不含
  if (params.occurredAtBegin) {
    const begin = dayjs(params.occurredAtBegin)
    list = list.filter((t) => !dayjs(t.occurredAt).isBefore(begin))
  }
  if (params.occurredAtEnd) {
    const end = dayjs(params.occurredAtEnd)
    list = list.filter((t) => dayjs(t.occurredAt).isBefore(end))
  }
  list.sort((a, b) => b.occurredAt.localeCompare(a.occurredAt) || b.id - a.id)

  const current = Math.max(params.page || 1, 1)
  const size = Math.max(params.size || 10, 1)
  const start = (current - 1) * size
  const records = await enrich(list.slice(start, start + size))
  const total = list.length
  return {
    records,
    total,
    current,
    size,
    pages: Math.ceil(total / size) || 1,
  }
}

export async function topTransactions(limit = 5): Promise<Transaction[]> {
  await ensureReady()
  const list = (await db.transactions.toArray())
    .filter((t) => !t.archived)
    .sort((a, b) => b.occurredAt.localeCompare(a.occurredAt) || b.id - a.id)
    .slice(0, limit)
  return enrich(list)
}

export async function getTransaction(id: number): Promise<Transaction> {
  await ensureReady()
  const txn = await db.transactions.get(id)
  if (!txn || txn.archived) throw new Error('流水不存在')
  const [result] = await enrich([txn])
  return result
}

export async function createTransaction(payload: Omit<Transaction, 'id'>) {
  await ensureReady()
  const amount = Number(payload.amount)
  validateTransaction({ ...payload, amount })
  const id = await takeId('txn')
  const now = new Date().toISOString()
  const txn: Transaction = {
    ...payload,
    id,
    amount: Number(amount.toFixed(4)),
    archived: false,
    createdAt: now,
    updatedAt: now,
  }
  await db.transaction('rw', db.transactions, db.accounts, async () => {
    await db.transactions.put(txn)
    await recalcBalances()
  })
  return true
}

export async function updateTransaction(payload: Partial<Transaction> & { id: number }) {
  await ensureReady()
  const old = await db.transactions.get(payload.id)
  if (!old || old.archived) throw new Error('流水不存在')
  const next: Transaction = {
    ...old,
    ...payload,
    id: old.id,
    amount: payload.amount != null ? Number(Number(payload.amount).toFixed(4)) : old.amount,
    archived: false,
    updatedAt: new Date().toISOString(),
  }
  validateTransaction(next)
  await db.transaction('rw', db.transactions, db.accounts, async () => {
    await db.transactions.put(next)
    await recalcBalances()
  })
  return true
}

export async function deleteTransaction(id: number) {
  await ensureReady()
  const txn = await db.transactions.get(id)
  if (!txn || txn.archived) return true
  await db.transaction('rw', db.transactions, db.accounts, async () => {
    await db.transactions.put({ ...txn, archived: true, updatedAt: new Date().toISOString() })
    await recalcBalances()
  })
  return true
}

/* -------------------------------- 统计 -------------------------------- */

function monthRange() {
  return {
    start: dayjs().startOf('month'),
    end: dayjs().endOf('month'),
  }
}

function sumByType(list: Transaction[], type: 'INCOME' | 'EXPENSE') {
  return Number(
    list
      .filter((t) => t.type === type)
      .reduce((s, t) => s + t.amount, 0)
      .toFixed(2),
  )
}

async function activeTransactions() {
  return (await db.transactions.toArray()).filter((t) => !t.archived)
}

export async function overview(): Promise<OverviewReport> {
  await ensureReady()
  const list = (await activeTransactions()).filter((t) => t.type !== 'TRANSFER')
  const { start, end } = monthRange()
  const monthList = list.filter((t) => {
    const d = dayjs(t.occurredAt)
    return (d.isAfter(start) || d.isSame(start)) && (d.isBefore(end) || d.isSame(end))
  })
  return {
    totalIncome: sumByType(list, 'INCOME'),
    totalExpense: sumByType(list, 'EXPENSE'),
    monthIncome: sumByType(monthList, 'INCOME'),
    monthExpense: sumByType(monthList, 'EXPENSE'),
  }
}

export async function overviewTrend(): Promise<TrendPoint[]> {
  return reportTrend()
}

export async function monthTrend(): Promise<MonthTrendPoint[]> {
  await ensureReady()
  const list = (await activeTransactions()).filter((t) => t.type !== 'TRANSFER')
  const start = dayjs().startOf('month')
  const today = dayjs()
  const points: MonthTrendPoint[] = []
  for (let d = start; d.isBefore(today) || d.isSame(today, 'day'); d = d.add(1, 'day')) {
    const key = d.format('YYYY-MM-DD')
    const dayList = list.filter((t) => dayjs(t.occurredAt).format('YYYY-MM-DD') === key)
    points.push({
      date: key,
      day: d.date(),
      income: sumByType(dayList, 'INCOME'),
      expense: sumByType(dayList, 'EXPENSE'),
    })
  }
  return points
}

export async function reportSummary(): Promise<ReportSummary> {
  const ov = await overview()
  return {
    monthIncome: ov.monthIncome,
    monthExpense: ov.monthExpense,
    monthBalance: Number((ov.monthIncome - ov.monthExpense).toFixed(2)),
  }
}

export async function reportTrend(): Promise<TrendPoint[]> {
  await ensureReady()
  const list = (await activeTransactions()).filter((t) => t.type !== 'TRANSFER')
  const points: TrendPoint[] = []
  for (let i = 5; i >= 0; i--) {
    const m = dayjs().subtract(i, 'month')
    const key = m.format('YYYY-MM')
    const monthList = list.filter((t) => dayjs(t.occurredAt).format('YYYY-MM') === key)
    points.push({
      period: key,
      income: sumByType(monthList, 'INCOME'),
      expense: sumByType(monthList, 'EXPENSE'),
    })
  }
  return points
}

export async function byCategory(
  kind: CategoryKind = 'EXPENSE',
  start?: string,
  end?: string,
): Promise<CategorySlice[]> {
  await ensureReady()
  const begin = start ? dayjs(start) : dayjs().startOf('month')
  const finish = end ? dayjs(end).endOf('day') : dayjs().endOf('month')
  const categories = await db.categories.toArray()
  const cMap = new Map(categories.map((c) => [c.id, c]))
  const map = new Map<number, number>()
  for (const t of await activeTransactions()) {
    if (t.type !== kind) continue
    const d = dayjs(t.occurredAt)
    if (d.isBefore(begin) || d.isAfter(finish)) continue
    const key = t.categoryId ?? 0
    map.set(key, (map.get(key) || 0) + t.amount)
  }
  const slices: CategorySlice[] = []
  for (const [categoryId, amount] of map) {
    slices.push({
      categoryId,
      categoryName: categoryId ? cMap.get(categoryId)?.name || `#${categoryId}` : '未分类',
      amount: Number(amount.toFixed(2)),
    })
  }
  slices.sort((a, b) => b.amount - a.amount)
  return slices
}

export async function calendarDaily(month?: string): Promise<CalendarDay[]> {
  await ensureReady()
  const cursor = month ? dayjs(`${month}-01`) : dayjs()
  const start = cursor.startOf('month')
  const end = cursor.endOf('month')
  const list = (await activeTransactions()).filter((t) => t.type !== 'TRANSFER')
  const days: CalendarDay[] = []
  for (let d = start; d.isBefore(end) || d.isSame(end, 'day'); d = d.add(1, 'day')) {
    const key = d.format('YYYY-MM-DD')
    const dayList = list.filter((t) => dayjs(t.occurredAt).format('YYYY-MM-DD') === key)
    const income = sumByType(dayList, 'INCOME')
    const expense = sumByType(dayList, 'EXPENSE')
    days.push({ date: key, income, expense, balance: Number((income - expense).toFixed(2)) })
  }
  return days
}

export async function calendarDay(date: string): Promise<Transaction[]> {
  await ensureReady()
  const list = (await activeTransactions())
    .filter((t) => dayjs(t.occurredAt).format('YYYY-MM-DD') === date)
    .sort((a, b) => a.occurredAt.localeCompare(b.occurredAt) || a.id - b.id)
  return enrich(list)
}

/* -------------------------------- 设置 -------------------------------- */

export async function getSettings() {
  await ensureReady()
  const list = (await db.settings.toArray()).sort((a, b) => a.id - b.id)
  const map: Record<string, string> = {}
  for (const item of list) map[item.name] = item.value
  return { list, map }
}

export async function saveSettings(settings: Record<string, string>) {
  await ensureReady()
  for (const [name, value] of Object.entries(settings)) {
    const found = await db.settings.where('name').equals(name).first()
    if (found) await db.settings.put({ ...found, value })
    else await db.settings.put({ id: await takeId('setting'), name, value })
  }
  return true
}

/* ------------------------------ 备份与恢复 ------------------------------ */

export interface BackupPayload {
  app: 'ink-ledger-lite'
  version: number
  exportedAt: string
  accounts: Account[]
  categories: Category[]
  tags: Tag[]
  transactions: Transaction[]
  settings: SysSettingItem[]
  nextIds: NextIds
}

export async function exportBackup(): Promise<BackupPayload> {
  await ensureReady()
  return {
    app: 'ink-ledger-lite',
    version: SEED_VERSION,
    exportedAt: new Date().toISOString(),
    accounts: await db.accounts.toArray(),
    categories: await db.categories.toArray(),
    tags: await db.tags.toArray(),
    transactions: await db.transactions.toArray(),
    settings: await db.settings.toArray(),
    nextIds: await readNextIds(),
  }
}

export async function importBackup(text: string) {
  const data = JSON.parse(text) as Partial<BackupPayload>
  if (!data || !Array.isArray(data.accounts) || !Array.isArray(data.transactions)) {
    throw new Error('备份文件格式不正确')
  }
  const nextIds = data.nextIds ?? {
    account: maxId(data.accounts) + 1,
    category: maxId(data.categories ?? []) + 1,
    tag: maxId(data.tags ?? []) + 1,
    txn: maxId(data.transactions) + 1,
    setting: maxId(data.settings ?? []) + 1,
  }
  await db.transaction(
    'rw',
    db.accounts,
    db.categories,
    db.tags,
    db.transactions,
    db.settings,
    db.meta,
    async () => {
      await db.accounts.clear()
      await db.categories.clear()
      await db.tags.clear()
      await db.transactions.clear()
      await db.settings.clear()
      await db.accounts.bulkPut(data.accounts ?? [])
      await db.categories.bulkPut(data.categories ?? [])
      await db.tags.bulkPut(data.tags ?? [])
      await db.transactions.bulkPut(data.transactions ?? [])
      await db.settings.bulkPut(data.settings ?? seedSettings)
      await db.meta.put({ key: META_SEED, value: SEED_VERSION })
      await db.meta.put({ key: META_NEXT_IDS, value: nextIds })
    },
  )
  await recalcBalances()
  return {
    accounts: data.accounts?.length ?? 0,
    transactions: data.transactions.length,
  }
}

/** 清空全部流水，保留账户/分类/标签/设置 */
export async function clearTransactions() {
  await ensureReady()
  await db.transaction('rw', db.transactions, db.accounts, async () => {
    await db.transactions.clear()
    await recalcBalances()
  })
  return true
}

/** 恢复为内置示例数据 */
export async function resetToSeed() {
  await db.transaction(
    'rw',
    db.accounts,
    db.categories,
    db.tags,
    db.transactions,
    db.settings,
    db.meta,
    async () => {
      await db.accounts.clear()
      await db.categories.clear()
      await db.tags.clear()
      await db.transactions.clear()
      await db.settings.clear()
      await db.accounts.bulkPut(structuredClone(seedAccounts))
      await db.categories.bulkPut(structuredClone(seedCategories))
      await db.tags.bulkPut(structuredClone(seedTags))
      await db.transactions.bulkPut(structuredClone(seedTransactions))
      await db.settings.bulkPut(structuredClone(seedSettings))
      await db.meta.put({ key: META_SEED, value: SEED_VERSION })
      await db.meta.put({ key: META_NEXT_IDS, value: defaultNextIds() })
    },
  )
  await recalcBalances()
  return true
}

/** 数据概览（设置页展示用） */
export async function dataStats() {
  await ensureReady()
  const [accounts, categories, tags, transactions, settings] = [
    await db.accounts.toArray(),
    await db.categories.toArray(),
    await db.tags.toArray(),
    await db.transactions.toArray(),
    await db.settings.toArray(),
  ]
  return {
    accounts: accounts.filter((a) => !a.archived).length,
    categories: categories.filter((c) => !c.archived).length,
    tags: tags.length,
    transactions: transactions.filter((t) => !t.archived).length,
    settings: settings.length,
    estimatedBytes: JSON.stringify({ accounts, categories, tags, transactions }).length,
  }
}
