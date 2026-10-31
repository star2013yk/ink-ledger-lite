import { onUnmounted, shallowRef, type Ref } from 'vue'
import * as echarts from 'echarts/core'
import { BarChart, LineChart, PieChart } from 'echarts/charts'
import {
  DataZoomComponent,
  GridComponent,
  LegendComponent,
  TooltipComponent,
} from 'echarts/components'
import { CanvasRenderer } from 'echarts/renderers'
import type { ECharts, EChartsCoreOption } from 'echarts/core'

/** 仅注册概览/报表实际用到的图与组件，避免全量 echarts ~1MB */
echarts.use([
  BarChart,
  LineChart,
  PieChart,
  GridComponent,
  TooltipComponent,
  LegendComponent,
  DataZoomComponent,
  CanvasRenderer,
])

export function useEchart(elRef: Ref<HTMLElement | null>) {
  const chart = shallowRef<ECharts | null>(null)

  function ensure() {
    if (!elRef.value) return null
    if (!chart.value) {
      chart.value = echarts.init(elRef.value)
    }
    return chart.value
  }

  function setOption(option: EChartsCoreOption) {
    const instance = ensure()
    instance?.setOption(option, { notMerge: true })
  }

  function resize() {
    chart.value?.resize()
  }

  onUnmounted(() => {
    chart.value?.dispose()
    chart.value = null
  })

  return { setOption, resize, chart }
}
