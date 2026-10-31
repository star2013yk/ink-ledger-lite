import Dexie, { type Table } from 'dexie'
import type { Account, Category, SysSettingItem, Tag, Transaction } from '@/types'

export interface MetaRow {
  key: string
  value: unknown
}

/**
 * 账本数据库（IndexedDB）
 * - 主键由应用维护（meta.nextIds），不使用自增，便于导入导出与后端 id 对齐
 * - 所有余额都是派生值，由 repository 统一按流水重算
 */
export class LedgerDB extends Dexie {
  accounts!: Table<Account, number>
  categories!: Table<Category, number>
  tags!: Table<Tag, number>
  transactions!: Table<Transaction, number>
  settings!: Table<SysSettingItem, number>
  meta!: Table<MetaRow, string>

  constructor() {
    super('ink-ledger')
    this.version(1).stores({
      accounts: 'id, name, archived',
      categories: 'id, parentId, kind, archived',
      tags: 'id, name',
      transactions: 'id, occurredAt, type, accountId, toAccountId, categoryId, tagId, archived',
      settings: 'id, &name',
      meta: 'key',
    })
  }
}

export const db = new LedgerDB()
