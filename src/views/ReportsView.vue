<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, ref } from 'vue'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { api } from '@/api'
import type { CategorySlice, ReportSummary, TrendPoint } from '@/types'
import { formatMoney } from '@/utils/format'
import { useEchart } from '@/composables/useEchart'

const slices = ref<CategorySlice[]>([])
const trend = ref<TrendPoint[]>([])
const summary = ref<ReportSummary | null>(null)
const loading = ref(true)

const pieEl = ref<HTMLDivElement | null>(null)
const barEl = ref<HTMLDivElement | null>(null)
const { setOption: setPieOption, resize: resizePie } = useEchart(pieEl)
const { setOption: setBarOption, resize: resizeBar } = useEchart(barEl)

const monthIncome = computed(() => Number(summary.value?.monthIncome ?? 0))
const monthExpense = computed(() => Number(summary.value?.monthExpense ?? 0))
const monthBalance = computed(() => Number(summary.value?.monthBalance ?? 0))
const expenseTotal = computed(() => slices.value.reduce((s, i) => s + Number(i.amount || 0), 0))

const ranked = computed(() => {
  const total = expenseTotal.value || 1
  return slices.value.map((s) => ({
    ...s,
    amount: Number(s.amount || 0),
    percent: Math.round((Number(s.amount || 0) / total) * 1000) / 10,
  }))
})

const palette = ['#0f766e', '#2563eb', '#c2410c', '#db2777', '#7c3aed', '#ca8a04', '#64748b']

function renderCharts() {
  setPieOption({
    color: palette,
    tooltip: { trigger: 'item', formatter: '{b}<br/>{c}（{d}%）' },
    legend: {
      type: 'scroll',
      orient: 'horizontal',
      bottom: 0,
      textStyle: { fontSize: 11, color: '#71717a' },
    },
    series: [
      {
        type: 'pie',
        radius: ['48%', '70%'],
        center: ['50%', '45%'],
        avoidLabelOverlap: true,
        itemStyle: { borderRadius: 6, borderColor: '#fff', borderWidth: 2 },
        label: { show: false },
        data: slices.value.map((s) => ({ name: s.categoryName, value: Number(s.amount || 0) })),
      },
    ],
  })

  setBarOption({
    color: ['#059669', '#c2410c'],
    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
    legend: { data: ['收入', '支出'], top: 0, right: 0, textStyle: { fontSize: 12 } },
    grid: { left: 8, right: 12, top: 36, bottom: 8, containLabel: true },
    xAxis: {
      type: 'category',
      data: trend.value.map((t) => t.period.slice(5)),
      axisLine: { lineStyle: { color: '#e4e4e7' } },
      axisLabel: { color: '#71717a' },
    },
    yAxis: {
      type: 'value',
      splitLine: { lineStyle: { type: 'dashed', color: '#f4f4f5' } },
      axisLabel: { color: '#71717a' },
    },
    series: [
      {
        name: '收入',
        type: 'bar',
        barMaxWidth: 28,
        itemStyle: { borderRadius: [6, 6, 0, 0] },
        data: trend.value.map((t) => Number(t.income || 0)),
      },
      {
        name: '支出',
        type: 'bar',
        barMaxWidth: 28,
        itemStyle: { borderRadius: [6, 6, 0, 0] },
        data: trend.value.map((t) => Number(t.expense || 0)),
      },
    ],
  })
}

function onResize() {
  resizePie()
  resizeBar()
}

onMounted(async () => {
  try {
    const [summaryData, s, t] = await Promise.all([
      api.reportSummary(),
      api.byCategory('EXPENSE'),
      api.reportTrend(),
    ])
    summary.value = summaryData
    slices.value = s
    trend.value = t
    await nextTick()
    renderCharts()
  } finally {
    loading.value = false
  }
  window.addEventListener('resize', onResize)
})

onUnmounted(() => {
  window.removeEventListener('resize', onResize)
})
</script>

<template>
  <div class="space-y-4 sm:space-y-6">
    <div class="grid grid-cols-1 gap-3 sm:grid-cols-3 sm:gap-4">
      <Card>
        <CardHeader class="pb-2">
          <CardDescription>本月收入</CardDescription>
          <CardTitle class="font-heading text-2xl tabular-nums text-emerald-600">
            {{ formatMoney(monthIncome) }}
          </CardTitle>
        </CardHeader>
      </Card>
      <Card>
        <CardHeader class="pb-2">
          <CardDescription>本月支出</CardDescription>
          <CardTitle class="font-heading text-2xl tabular-nums text-orange-700">
            {{ formatMoney(monthExpense) }}
          </CardTitle>
        </CardHeader>
      </Card>
      <Card>
        <CardHeader class="pb-2">
          <CardDescription>本月结余</CardDescription>
          <CardTitle
            class="font-heading text-2xl tabular-nums"
            :class="monthBalance >= 0 ? 'text-emerald-600' : 'text-orange-700'"
          >
            {{ formatMoney(monthBalance) }}
          </CardTitle>
        </CardHeader>
      </Card>
    </div>

    <div class="grid gap-4 lg:grid-cols-5">
      <Card class="lg:col-span-2">
        <CardHeader class="pb-2">
          <CardTitle class="text-base">本月支出构成</CardTitle>
          <CardDescription>按分类占比</CardDescription>
        </CardHeader>
        <CardContent>
          <div ref="pieEl" class="h-64 w-full sm:h-72" />
          <p v-if="!loading && !slices.length" class="text-muted-foreground -mt-48 text-center text-sm">
            本月暂无支出分类数据
          </p>
        </CardContent>
      </Card>

      <Card class="lg:col-span-3">
        <CardHeader class="pb-2">
          <CardTitle class="text-base">近 6 个月收支对比</CardTitle>
          <CardDescription>柱状图查看每月收入与支出</CardDescription>
        </CardHeader>
        <CardContent>
          <div ref="barEl" class="h-64 w-full sm:h-72" />
        </CardContent>
      </Card>
    </div>

    <Card>
      <CardHeader class="pb-3">
        <div class="flex flex-wrap items-center justify-between gap-2">
          <div>
            <CardTitle class="text-base">支出分类明细</CardTitle>
            <CardDescription>本月合计 {{ formatMoney(expenseTotal) }}</CardDescription>
          </div>
          <Badge variant="secondary">{{ ranked.length }} 个分类</Badge>
        </div>
      </CardHeader>
      <CardContent class="space-y-4">
        <div v-for="(item, idx) in ranked" :key="item.categoryId" class="space-y-2">
          <div class="flex items-center justify-between gap-3 text-sm">
            <div class="flex min-w-0 items-center gap-2">
              <span
                class="size-2.5 shrink-0 rounded-full"
                :style="{ background: palette[idx % palette.length] }"
              />
              <span class="truncate font-medium">{{ item.categoryName }}</span>
              <span class="text-muted-foreground shrink-0 text-xs">{{ item.percent }}%</span>
            </div>
            <span class="shrink-0 tabular-nums font-semibold">{{ formatMoney(item.amount) }}</span>
          </div>
          <div class="bg-muted h-2 overflow-hidden rounded-full">
            <div
              class="h-full rounded-full transition-all"
              :style="{
                width: `${Math.min(item.percent, 100)}%`,
                background: palette[idx % palette.length],
              }"
            />
          </div>
        </div>
        <p v-if="!ranked.length" class="text-muted-foreground text-sm">暂无分类支出，记几笔支出后再来看报表。</p>
      </CardContent>
    </Card>
  </div>
</template>
