<script setup lang="ts">
import { nextTick, onMounted, onUnmounted, ref } from 'vue'
import { RouterLink } from 'vue-router'
import dayjs from 'dayjs'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { api } from '@/api'
import type { MonthTrendPoint, OverviewReport, Transaction, TrendPoint } from '@/types'
import { formatMoney, signedMoney } from '@/utils/format'
import { useMetaStore } from '@/stores/meta'
import { useEchart } from '@/composables/useEchart'

const meta = useMetaStore()
const data = ref<OverviewReport | null>(null)
const recent = ref<Transaction[]>([])
const trend = ref<TrendPoint[]>([])
const monthPoints = ref<MonthTrendPoint[]>([])
const narrow = ref(false)

const trendEl = ref<HTMLDivElement | null>(null)
const monthEl = ref<HTMLDivElement | null>(null)
const { setOption: setTrendOption, resize: resizeTrend } = useEchart(trendEl)
const { setOption: setMonthOption, resize: resizeMonth } = useEchart(monthEl)

function isNarrowScreen() {
  return typeof window !== 'undefined' && window.innerWidth < 640
}

/** Y 轴金额缩写，窄屏少占横向空间 */
function compactAxisMoney(value: number) {
  const n = Number(value) || 0
  const abs = Math.abs(n)
  if (abs >= 10000) {
    const v = n / 10000
    return `${Number.isInteger(v) ? v : v.toFixed(1)}万`
  }
  if (abs >= 1000) {
    const v = n / 1000
    return `${Number.isInteger(v) ? v : v.toFixed(1)}k`
  }
  return String(n)
}

function typeLabel(t: Transaction) {
  return t.type === 'INCOME' ? '收入' : t.type === 'EXPENSE' ? '支出' : '转账'
}

function displayName(item: Transaction) {
  return item.payee || item.categoryName || item.note || typeLabel(item)
}

function accountLabel(item: Transaction) {
  return item.accountName || meta.accountName(item.accountId)
}

function categoryLabel(item: Transaction) {
  return item.categoryName || (item.categoryId ? meta.categoryName(item.categoryId) : '')
}

function renderCharts() {
  const mobile = isNarrowScreen()
  narrow.value = mobile
  const legendFs = mobile ? 11 : 12
  const axisFs = mobile ? 10 : 12
  const days = monthPoints.value.length || 1
  // 窄屏默认看最近约 12 天，左右滑动查看整月
  const visibleDays = 12
  const zoomStart = mobile && days > visibleDays ? Math.max(0, 100 - (visibleDays / days) * 100) : 0

  setTrendOption({
    color: ['#059669', '#c2410c'],
    tooltip: {
      trigger: 'axis',
      confine: true,
      textStyle: { fontSize: mobile ? 12 : 13 },
    },
    legend: {
      data: ['收入', '支出'],
      top: 0,
      right: 0,
      itemWidth: mobile ? 10 : 14,
      itemHeight: mobile ? 8 : 10,
      textStyle: { fontSize: legendFs },
    },
    grid: {
      left: mobile ? 4 : 8,
      right: mobile ? 8 : 12,
      top: 36,
      bottom: 8,
      containLabel: true,
    },
    xAxis: {
      type: 'category',
      boundaryGap: false,
      data: trend.value.map((t) => t.period.slice(5)),
      axisLine: { lineStyle: { color: '#e4e4e7' } },
      axisLabel: { color: '#71717a', fontSize: axisFs },
    },
    yAxis: {
      type: 'value',
      splitLine: { lineStyle: { type: 'dashed', color: '#f4f4f5' } },
      axisLabel: {
        color: '#71717a',
        fontSize: axisFs,
        formatter: (v: number) => compactAxisMoney(v),
      },
    },
    series: [
      {
        name: '收入',
        type: 'line',
        smooth: true,
        symbol: 'circle',
        symbolSize: mobile ? 4 : 6,
        areaStyle: { opacity: 0.08 },
        data: trend.value.map((t) => t.income),
      },
      {
        name: '支出',
        type: 'line',
        smooth: true,
        symbol: 'circle',
        symbolSize: mobile ? 4 : 6,
        areaStyle: { opacity: 0.08 },
        data: trend.value.map((t) => t.expense),
      },
    ],
  })

  setMonthOption({
    color: ['#059669', '#c2410c'],
    tooltip: {
      trigger: 'axis',
      confine: true,
      axisPointer: { type: 'shadow' },
      textStyle: { fontSize: mobile ? 12 : 13 },
      formatter: (params: unknown) => {
        const list = Array.isArray(params) ? params : []
        if (!list.length) return ''
        const day = (list[0] as { axisValue?: string }).axisValue ?? ''
        const lines = list.map((p) => {
          const item = p as { marker?: string; seriesName?: string; value?: number | string }
          return `${item.marker ?? ''}${item.seriesName ?? ''} ${formatMoney(Number(item.value || 0))}`
        })
        return [`${day} 日`, ...lines].join('<br/>')
      },
    },
    legend: {
      data: ['收入', '支出'],
      top: 0,
      right: 0,
      itemWidth: mobile ? 10 : 14,
      itemHeight: mobile ? 8 : 10,
      textStyle: { fontSize: legendFs },
    },
    grid: {
      left: mobile ? 4 : 8,
      right: mobile ? 8 : 12,
      top: 36,
      bottom: mobile ? 28 : 8,
      containLabel: true,
    },
    dataZoom: mobile
      ? [
          {
            type: 'inside',
            xAxisIndex: 0,
            start: zoomStart,
            end: 100,
            zoomOnMouseWheel: false,
            moveOnMouseMove: true,
            moveOnMouseWheel: false,
            preventDefaultMouseMove: true,
          },
          {
            type: 'slider',
            xAxisIndex: 0,
            height: 16,
            bottom: 2,
            start: zoomStart,
            end: 100,
            showDetail: false,
            brushSelect: false,
            borderColor: '#e4e4e7',
            fillerColor: 'rgba(15, 118, 110, 0.18)',
            handleSize: '80%',
            handleStyle: { color: '#0f766e', borderColor: '#0f766e' },
            dataBackground: {
              lineStyle: { color: '#d4d4d8' },
              areaStyle: { color: '#f4f4f5' },
            },
          },
        ]
      : undefined,
    xAxis: {
      type: 'category',
      boundaryGap: true,
      data: monthPoints.value.map((t) => String(t.day)),
      axisLine: { lineStyle: { color: '#e4e4e7' } },
      axisLabel: {
        color: '#71717a',
        fontSize: axisFs,
        interval: mobile ? 1 : 0,
        hideOverlap: true,
      },
    },
    yAxis: {
      type: 'value',
      splitNumber: mobile ? 4 : 5,
      splitLine: { lineStyle: { type: 'dashed', color: '#f4f4f5' } },
      axisLabel: {
        color: '#71717a',
        fontSize: axisFs,
        formatter: (v: number) => compactAxisMoney(v),
      },
    },
    series: [
      {
        name: '收入',
        type: 'bar',
        barMaxWidth: mobile ? 8 : 14,
        barGap: '20%',
        itemStyle: { borderRadius: [3, 3, 0, 0] },
        data: monthPoints.value.map((t) => Number(t.income || 0)),
      },
      {
        name: '支出',
        type: 'bar',
        barMaxWidth: mobile ? 8 : 14,
        itemStyle: { borderRadius: [3, 3, 0, 0] },
        data: monthPoints.value.map((t) => Number(t.expense || 0)),
      },
    ],
  })
}

function onResize() {
  const nextNarrow = isNarrowScreen()
  if (nextNarrow !== narrow.value) {
    renderCharts()
  } else {
    resizeTrend()
    resizeMonth()
  }
}

onMounted(async () => {
  if (!meta.loaded) await meta.loadAll()
  const [overview, trendData, monthData, top] = await Promise.all([
    api.overview(),
    api.overviewTrend(),
    api.monthTrend(),
    api.topTransactions(),
  ])
  data.value = overview
  trend.value = trendData
  monthPoints.value = monthData
  recent.value = top
  await nextTick()
  renderCharts()
  window.addEventListener('resize', onResize)
})

onUnmounted(() => {
  window.removeEventListener('resize', onResize)
})
</script>

<template>
  <div class="space-y-4 sm:space-y-6">
    <div class="grid grid-cols-2 gap-3 sm:gap-4">
      <Card>
        <CardHeader class="space-y-1 px-3 pb-3 sm:px-6 sm:pb-4">
          <CardDescription class="text-xs sm:text-sm">本月收入</CardDescription>
          <CardTitle class="font-heading text-lg leading-tight break-all tabular-nums text-emerald-600 sm:text-3xl sm:break-normal">
            {{ formatMoney(data?.monthIncome ?? 0) }}
          </CardTitle>
        </CardHeader>
      </Card>
      <Card>
        <CardHeader class="space-y-1 px-3 pb-3 sm:px-6 sm:pb-4">
          <CardDescription class="text-xs sm:text-sm">本月支出</CardDescription>
          <CardTitle class="font-heading text-lg leading-tight break-all tabular-nums text-orange-700 sm:text-3xl sm:break-normal">
            {{ formatMoney(data?.monthExpense ?? 0) }}
          </CardTitle>
        </CardHeader>
      </Card>
    </div>

    <div class="grid gap-3 sm:gap-4 lg:grid-cols-2">
      <Card>
        <CardHeader class="px-4 pb-2 sm:px-6">
          <CardTitle class="text-base">近 6 个月收支趋势</CardTitle>
          <CardDescription>收入 / 支出折线对比</CardDescription>
        </CardHeader>
        <CardContent class="px-2 pb-4 sm:px-6 sm:pb-6">
          <div ref="trendEl" class="h-48 w-full touch-pan-y sm:h-60" />
        </CardContent>
      </Card>
      <Card>
        <CardHeader class="px-4 pb-2 sm:px-6">
          <CardTitle class="text-base">本月每日走势</CardTitle>
          <CardDescription class="hidden sm:block">月初至今每天的收入与支出</CardDescription>
          <CardDescription class="sm:hidden">左右滑动查看整月</CardDescription>
        </CardHeader>
        <CardContent class="px-2 pb-4 sm:px-6 sm:pb-6">
          <div ref="monthEl" class="h-52 w-full touch-pan-x sm:h-60" />
        </CardContent>
      </Card>
    </div>

    <Card>
      <CardHeader class="flex flex-row items-center justify-between gap-3 space-y-0 px-4 sm:px-6">
        <div class="min-w-0">
          <CardTitle class="text-base sm:text-lg">最近流水</CardTitle>
          <CardDescription>最新 5 笔记录</CardDescription>
        </div>
        <Button variant="outline" size="sm" class="min-h-9 shrink-0" as-child>
          <RouterLink to="/transactions">全部</RouterLink>
        </Button>
      </CardHeader>
      <CardContent class="space-y-2 px-4 sm:space-y-3 sm:px-6">
        <div
          v-for="item in recent"
          :key="item.id"
          class="border-border flex items-center justify-between gap-2 rounded-lg border px-2.5 py-2.5 sm:gap-3 sm:px-3"
        >
          <div class="min-w-0 flex-1">
            <div class="flex items-center gap-1.5 sm:gap-2">
              <span class="truncate text-sm font-medium sm:text-base">{{ displayName(item) }}</span>
              <Badge variant="secondary" class="shrink-0">{{ typeLabel(item) }}</Badge>
            </div>
            <div class="text-muted-foreground mt-1 truncate text-[11px] sm:text-xs">
              {{ dayjs(item.occurredAt).format('MM-DD HH:mm') }} ·
              {{ accountLabel(item) }}
              <template v-if="item.categoryId || item.categoryName"> · {{ categoryLabel(item) }}</template>
            </div>
          </div>
          <div
            class="shrink-0 text-sm tabular-nums font-semibold sm:text-base"
            :class="{
              'text-emerald-600': item.type === 'INCOME',
              'text-orange-700': item.type === 'EXPENSE',
            }"
          >
            {{ signedMoney(item.type, item.amount) }}
          </div>
        </div>
        <p v-if="!recent.length" class="text-muted-foreground text-sm">暂无流水，先去记一笔吧。</p>
      </CardContent>
    </Card>
  </div>
</template>
