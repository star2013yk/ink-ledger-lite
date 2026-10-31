import { defineStore } from 'pinia'
import { ref } from 'vue'
import { api } from '@/api'
import type { Account, Category, Tag } from '@/types'

export const useMetaStore = defineStore('meta', () => {
  const accounts = ref<Account[]>([])
  const categories = ref<Category[]>([])
  const tags = ref<Tag[]>([])
  const loaded = ref(false)

  async function loadAll() {
    const [a, c, t] = await Promise.all([api.listAccounts(), api.listCategories(), api.listTags()])
    accounts.value = a
    categories.value = c
    tags.value = t
    loaded.value = true
  }

  function accountName(id?: number | null) {
    return accounts.value.find((x) => x.id === id)?.name || '-'
  }

  function categoryName(id?: number | null) {
    return categories.value.find((x) => x.id === id)?.name || '-'
  }

  function leafCategories(kind: 'EXPENSE' | 'INCOME') {
    return categories.value.filter((c) => c.kind === kind && !c.archived)
  }

  return { accounts, categories, tags, loaded, loadAll, accountName, categoryName, leafCategories }
})
