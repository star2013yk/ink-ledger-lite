<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import dayjs from 'dayjs'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { api } from '@/api'
import type { CalendarDay, Transaction } from '@/types'
import { formatMoney } from '@/utils/format'
import { useMetaStore } from '@/stores/meta'
import { cn } from '@/lib/utils'

const meta = useMetaStore()
const cursor = ref(dayjs())
const selected = ref(dayjs().format('YYYY-MM-DD'))
const daily = ref<CalendarDay[]>([])
const dayTxns = ref<Transaction[]>([])

const monthLabel = computed(() => cursor.value.format('YYYY年MM月'))
const dailyMap = computed(() => new Map(daily.value.map((d) => [d.date, d])))

const cells = computed(() => {
  const start = cursor.value.startOf('month')
  const end = cursor.value.endOf('month')
  const firstWeekday = start.day()
  const days: { date: string; inMonth: boolean; expense: number; income: number }[] = []
  for (let i = 0; i < firstWeekday; i++) {
    const d = start.subtract(firstWeekday - i, 'day')
    days.push({ date: d.format('YYYY-MM-DD'), inMonth: false, expense: 0, income: 0 })
  }
  for (let d = start; d.isBefore(end) || d.isSame(end, 'day'); d = d.add(1, 'day')) {
    const key = d.format('YYYY-MM-DD')
    const summary = dailyMap.value.get(key)
    days.push({
      date: key,
      inMonth: true,
      expense: Number(summary?.expense || 0),
      income: Number(summary?.income || 0),
    })
  }
  while (days.length % 7 !== 0) {
    const last = dayjs(days[days.length - 1].date).add(1, 'day')
    days.push({ date: last.format('YYYY-MM-DD'), inMonth: false, expense: 0, income: 0 })
  }
  return days
})

async function loadMonth() {
  daily.value = await api.calendarDaily(cursor.value.format('YYYY-MM'))
}

async function loadDay() {
  dayTxns.value = await api.calendarDay(selected.value)
}

onMounted(async () => {
  if (!meta.loaded) await meta.loadAll()
  await loadMonth()
  await loadDay()
})

watch(selected, () => {
  void loadDay()
})

async function shift(delta: number) {
  cursor.value = cursor.value.add(delta, 'month')
  selected.value = cursor.value.startOf('month').format('YYYY-MM-DD')
  await loadMonth()
  await loadDay()
}
</script>

<template>
  <div class="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
    <Card>
      <CardHeader class="flex flex-row items-center justify-between gap-2 px-4 sm:px-6">
        <CardTitle class="text-base sm:text-lg">{{ monthLabel }}</CardTitle>
        <div class="flex gap-2">
          <Button variant="outline" size="sm" class="min-h-9" @click="shift(-1)">上月</Button>
          <Button variant="outline" size="sm" class="min-h-9" @click="shift(1)">下月</Button>
        </div>
      </CardHeader>
      <CardContent>
        <div class="text-muted-foreground mb-2 grid grid-cols-7 text-center text-xs">
          <span v-for="w in ['日','一','二','三','四','五','六']" :key="w">{{ w }}</span>
        </div>
        <div class="grid grid-cols-7 gap-1">
          <button
            v-for="cell in cells"
            :key="cell.date"
            type="button"
            :class="cn(
              'hover:bg-muted min-h-12 rounded-md border border-transparent p-1 text-left transition-colors sm:min-h-16 sm:rounded-lg sm:p-1.5 md:min-h-20',
              cell.inMonth ? 'bg-card' : 'opacity-40',
              selected === cell.date && 'border-primary bg-muted',
            )"
            @click="selected = cell.date"
          >
            <div class="text-[11px] font-medium sm:text-xs">{{ dayjs(cell.date).date() }}</div>
            <div v-if="cell.expense" class="truncate text-[9px] text-orange-700 tabular-nums sm:text-[10px]">-{{ cell.expense.toFixed(0) }}</div>
            <div v-if="cell.income" class="truncate text-[9px] text-emerald-600 tabular-nums sm:text-[10px]">+{{ cell.income.toFixed(0) }}</div>
          </button>
        </div>
      </CardContent>
    </Card>

    <Card>
      <CardHeader>
        <CardTitle class="text-base">{{ selected }}</CardTitle>
      </CardHeader>
      <CardContent class="space-y-3">
        <div
          v-for="t in dayTxns"
          :key="t.id"
          class="border-border flex items-center justify-between rounded-lg border px-3 py-2"
        >
          <div>
            <div class="font-medium">{{ t.payee || t.categoryName || meta.categoryName(t.categoryId) || t.type }}</div>
            <div class="text-muted-foreground text-xs">{{ t.accountName || meta.accountName(t.accountId) }}</div>
          </div>
          <div class="tabular-nums text-sm font-semibold">{{ formatMoney(t.amount) }}</div>
        </div>
        <p v-if="!dayTxns.length" class="text-muted-foreground text-sm">当天暂无流水</p>
      </CardContent>
    </Card>
  </div>
</template>
