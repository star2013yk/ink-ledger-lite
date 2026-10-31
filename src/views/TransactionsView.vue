<script setup lang="ts">
import { computed, nextTick, onMounted, reactive, ref } from 'vue'
import { toast } from 'vue-sonner'
import dayjs from 'dayjs'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { api } from '@/api'
import type { Transaction } from '@/types'
import { signedMoney } from '@/utils/format'
import { useMetaStore } from '@/stores/meta'
import MetaIcon from '@/components/MetaIcon.vue'

/** 与后端 PageRequest 默认 size 一致 */
const PAGE_SIZE = 10

const meta = useMetaStore()
const records = ref<Transaction[]>([])
const total = ref(0)
const pages = ref(1)
const page = ref(1)
const size = ref(PAGE_SIZE)
const loading = ref(false)

const filters = reactive({
  type: 'ALL',
  accountId: 'ALL',
  categoryId: 'ALL',
  payee: '',
  dateBegin: '',
  dateEnd: '',
})

const canPrev = computed(() => page.value > 1 && !loading.value)
const canNext = computed(() => page.value < pages.value && !loading.value)

/** 页码条：始终带首页/末页，中间窗口，例 1 … 3 4 5 … 8 */
const pageItems = computed(() => {
  const totalPages = Math.max(pages.value, 1)
  const cur = page.value
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, i) => i + 1)
  }
  const items: Array<number | 'ellipsis'> = [1]
  const start = Math.max(2, cur - 1)
  const end = Math.min(totalPages - 1, cur + 1)
  if (start > 2) items.push('ellipsis')
  for (let i = start; i <= end; i++) items.push(i)
  if (end < totalPages - 1) items.push('ellipsis')
  items.push(totalPages)
  return items
})

function goPage(p: number) {
  if (loading.value || p < 1 || p > pages.value || p === page.value) return
  page.value = p
  void load()
}

function accountLabel(row: Transaction) {
  return row.accountName || meta.accountName(row.accountId)
}

function categoryLabel(row: Transaction) {
  return row.categoryName || meta.categoryName(row.categoryId) || row.payee || '流水'
}

function categoryMeta(row: Transaction) {
  return meta.categories.find((c) => c.id === row.categoryId)
}

function tagMeta(row: Transaction) {
  return meta.tags.find((t) => t.id === row.tagId)
}

/** 结束日按后端约定转为次日 00:00（不含） */
function occurredAtEndExclusive(date: string) {
  if (!date) return undefined
  return `${dayjs(date).add(1, 'day').format('YYYY-MM-DD')}T00:00:00`
}

function occurredAtBeginInclusive(date: string) {
  if (!date) return undefined
  return `${date}T00:00:00`
}

async function load(resetPage = false) {
  if (resetPage) page.value = 1
  loading.value = true
  try {
    const res = await api.pageTransactions({
      page: page.value,
      size: PAGE_SIZE,
      type: filters.type === 'ALL' ? undefined : filters.type,
      accountId: filters.accountId === 'ALL' ? undefined : Number(filters.accountId),
      categoryId: filters.categoryId === 'ALL' ? undefined : Number(filters.categoryId),
      payee: filters.payee.trim() || undefined,
      occurredAtBegin: occurredAtBeginInclusive(filters.dateBegin),
      occurredAtEnd: occurredAtEndExclusive(filters.dateEnd),
    })
    records.value = res.records ?? []
    total.value = Number(res.total ?? 0)
    size.value = Number(res.size ?? PAGE_SIZE)
    const current = Number(res.current ?? page.value)
    const totalPages = Number(res.pages ?? (Math.ceil(total.value / size.value) || 1))
    pages.value = Math.max(totalPages, 1)
    page.value = Math.min(Math.max(current, 1), pages.value)
  } finally {
    loading.value = false
  }
}

async function search() {
  // 等 Select/v-model 写回 filters 后再查，避免读到旧条件
  await nextTick()
  await load(true)
}

async function resetFilters() {
  filters.type = 'ALL'
  filters.accountId = 'ALL'
  filters.categoryId = 'ALL'
  filters.payee = ''
  filters.dateBegin = ''
  filters.dateEnd = ''
  await search()
}

function goPrev() {
  if (!canPrev.value) return
  page.value -= 1
  void load()
}

function goNext() {
  if (!canNext.value) return
  page.value += 1
  void load()
}

async function remove(id: number) {
  await api.deleteTransaction(id)
  await meta.loadAll()
  toast.success('已删除')
  // 删到空页时回退一页
  if (records.value.length <= 1 && page.value > 1) {
    page.value -= 1
  }
  await load()
}

onMounted(async () => {
  if (!meta.loaded) await meta.loadAll()
  await load(true)
})
</script>

<template>
  <div class="space-y-4">
    <Card>
      <CardHeader class="flex flex-row items-center justify-between gap-2 space-y-0 px-3 py-2.5 sm:px-6 sm:py-3">
        <CardTitle class="text-sm sm:text-base">筛选</CardTitle>
        <div class="flex shrink-0 gap-1.5">
          <Button
            variant="ghost"
            size="sm"
            class="h-8 px-2.5 text-xs sm:h-9 sm:px-3 sm:text-sm"
            :disabled="loading"
            @click="resetFilters"
          >
            重置
          </Button>
          <Button
            size="sm"
            class="h-8 px-3 text-xs sm:h-9 sm:px-4 sm:text-sm"
            :disabled="loading"
            @click="search()"
          >
            查询
          </Button>
        </div>
      </CardHeader>
      <CardContent class="px-3 pb-3 sm:px-6 sm:pb-4">
        <!-- H5 一行 2 个；桌面一行 4 个 -->
        <div class="grid grid-cols-2 gap-2 lg:grid-cols-4 lg:gap-3">
          <div class="space-y-1">
            <Label class="text-muted-foreground text-[11px] sm:text-xs">类型</Label>
            <Select v-model="filters.type" @update:model-value="search()">
              <SelectTrigger class="!h-9 w-full text-xs sm:text-sm">
                <SelectValue placeholder="类型" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">全部类型</SelectItem>
                <SelectItem value="EXPENSE">支出</SelectItem>
                <SelectItem value="INCOME">收入</SelectItem>
                <SelectItem value="TRANSFER">转账</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div class="space-y-1">
            <Label class="text-muted-foreground text-[11px] sm:text-xs">账户</Label>
            <Select v-model="filters.accountId" @update:model-value="search()">
              <SelectTrigger class="!h-9 w-full text-xs sm:text-sm">
                <SelectValue placeholder="账户" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">全部账户</SelectItem>
                <SelectItem v-for="a in meta.accounts" :key="a.id" :value="String(a.id)">
                  <span class="inline-flex items-center gap-2">
                    <MetaIcon :icon="a.icon" :name="a.name" :account-type="a.type" />
                    {{ a.name }}
                  </span>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div class="space-y-1">
            <Label class="text-muted-foreground text-[11px] sm:text-xs">分类</Label>
            <Select v-model="filters.categoryId" @update:model-value="search()">
              <SelectTrigger class="!h-9 w-full text-xs sm:text-sm">
                <SelectValue placeholder="分类" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">全部分类</SelectItem>
                <SelectItem v-for="c in meta.categories" :key="c.id" :value="String(c.id)">
                  <span class="inline-flex items-center gap-2">
                    <MetaIcon :icon="c.icon" :name="c.name" />
                    {{ c.name }}
                  </span>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div class="space-y-1">
            <Label class="text-muted-foreground text-[11px] sm:text-xs">商户/对方</Label>
            <Input
              v-model="filters.payee"
              class="!h-9 text-xs sm:text-sm"
              placeholder="搜索商户"
              @keyup.enter="search()"
            />
          </div>

          <div class="space-y-1">
            <Label class="text-muted-foreground text-[11px] sm:text-xs">开始日期</Label>
            <Input
              v-model="filters.dateBegin"
              type="date"
              class="!h-9 text-xs sm:text-sm"
              :max="filters.dateEnd || undefined"
              @change="search()"
            />
          </div>

          <div class="space-y-1">
            <Label class="text-muted-foreground text-[11px] sm:text-xs">结束日期</Label>
            <Input
              v-model="filters.dateEnd"
              type="date"
              class="!h-9 text-xs sm:text-sm"
              :min="filters.dateBegin || undefined"
              @change="search()"
            />
          </div>
        </div>
      </CardContent>
    </Card>

    <!-- H5 卡片列表 -->
    <div class="space-y-3 md:hidden">
      <div
        v-for="row in records"
        :key="row.id"
        class="border-border bg-card rounded-xl border p-3 shadow-sm"
      >
        <div class="flex items-start justify-between gap-3">
          <div class="min-w-0">
            <div class="flex flex-wrap items-center gap-2">
              <MetaIcon
                v-if="row.categoryId"
                :icon="categoryMeta(row)?.icon || row.icon"
                :name="categoryLabel(row)"
                class="text-muted-foreground"
              />
              <span class="truncate font-medium">{{ categoryLabel(row) }}</span>
              <Badge variant="secondary">
                {{ row.type === 'INCOME' ? '收入' : row.type === 'EXPENSE' ? '支出' : '转账' }}
              </Badge>
              <Badge v-if="row.tagId || row.tagName" variant="outline" class="gap-1">
                <MetaIcon :icon="tagMeta(row)?.icon || row.icon" :name="row.tagName || tagMeta(row)?.name" class="size-3" />
                {{ row.tagName || tagMeta(row)?.name }}
              </Badge>
            </div>
            <div class="text-muted-foreground mt-1 text-xs">
              {{ dayjs(row.occurredAt).format('MM-DD HH:mm') }} ·
              {{ accountLabel(row) }}
              <template v-if="row.toAccountId"> → {{ meta.accountName(row.toAccountId) }}</template>
            </div>
            <div v-if="row.note" class="text-muted-foreground mt-1 truncate text-xs">{{ row.note }}</div>
          </div>
          <div class="shrink-0 text-right">
            <div
              class="tabular-nums text-base font-semibold"
              :class="{
                'text-emerald-600': row.type === 'INCOME',
                'text-orange-700': row.type === 'EXPENSE',
              }"
            >
              {{ signedMoney(row.type, row.amount) }}
            </div>
            <Button variant="ghost" size="sm" class="text-destructive mt-1 h-8 px-2" @click="remove(row.id)">
              删除
            </Button>
          </div>
        </div>
      </div>
      <p v-if="!loading && !records.length" class="text-muted-foreground py-8 text-center text-sm">暂无流水</p>
      <p v-if="loading" class="text-muted-foreground py-6 text-center text-sm">加载中…</p>
    </div>

    <!-- 桌面表格 -->
    <Card class="hidden md:block">
      <CardContent class="pt-6">
        <div class="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>时间</TableHead>
                <TableHead>类型</TableHead>
                <TableHead>账户</TableHead>
                <TableHead>分类/说明</TableHead>
                <TableHead class="text-right">金额</TableHead>
                <TableHead class="text-right">操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow v-for="row in records" :key="row.id">
                <TableCell class="whitespace-nowrap">{{ dayjs(row.occurredAt).format('YYYY-MM-DD HH:mm') }}</TableCell>
                <TableCell>
                  <Badge variant="secondary">
                    {{ row.type === 'INCOME' ? '收入' : row.type === 'EXPENSE' ? '支出' : '转账' }}
                  </Badge>
                </TableCell>
                <TableCell>
                  {{ accountLabel(row) }}
                  <template v-if="row.toAccountId"> → {{ meta.accountName(row.toAccountId) }}</template>
                </TableCell>
                <TableCell>
                  <div>{{ categoryLabel(row) }}</div>
                  <div v-if="row.note" class="text-muted-foreground text-xs">{{ row.note }}</div>
                </TableCell>
                <TableCell
                  class="text-right tabular-nums font-medium"
                  :class="{
                    'text-emerald-600': row.type === 'INCOME',
                    'text-orange-700': row.type === 'EXPENSE',
                  }"
                >
                  {{ signedMoney(row.type, row.amount) }}
                </TableCell>
                <TableCell class="text-right">
                  <Button variant="ghost" size="sm" class="text-destructive" @click="remove(row.id)">删除</Button>
                </TableCell>
              </TableRow>
              <TableRow v-if="!loading && !records.length">
                <TableCell colspan="6" class="text-muted-foreground py-10 text-center">暂无流水</TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>

    <div class="border-border bg-card flex flex-col gap-2 rounded-xl border px-3 py-2.5 sm:flex-row sm:items-center sm:justify-between sm:gap-3 sm:px-4 sm:py-3">
      <div class="text-muted-foreground flex items-center justify-between gap-2 text-xs sm:justify-start sm:text-sm">
        <span>共 {{ total }} 笔</span>
        <span class="hidden sm:inline">·</span>
        <span>每页 {{ size }} 条</span>
        <span v-if="loading">· 加载中</span>
      </div>
      <div class="flex items-center justify-center gap-1 sm:justify-end sm:gap-1.5">
        <Button
          variant="outline"
          size="sm"
          class="h-8 min-w-8 px-2 text-xs sm:h-9 sm:min-w-9 sm:px-3"
          :disabled="!canPrev"
          @click="goPrev"
        >
          ‹
        </Button>
        <template v-for="(item, idx) in pageItems" :key="`${item}-${idx}`">
          <span v-if="item === 'ellipsis'" class="text-muted-foreground px-0.5 text-xs">…</span>
          <Button
            v-else
            size="sm"
            class="h-8 min-w-8 px-2 text-xs tabular-nums sm:h-9 sm:min-w-9"
            :variant="item === page ? 'default' : 'outline'"
            :disabled="loading"
            @click="goPage(item)"
          >
            {{ item }}
          </Button>
        </template>
        <Button
          variant="outline"
          size="sm"
          class="h-8 min-w-8 px-2 text-xs sm:h-9 sm:min-w-9 sm:px-3"
          :disabled="!canNext"
          @click="goNext"
        >
          ›
        </Button>
      </div>
    </div>
  </div>
</template>
