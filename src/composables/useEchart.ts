import { onUnmounted, shallowRef, type Ref } from 'vue'
import * as echarts from 'echarts'

export function useEchart(elRef: Ref<HTMLElement | null>) {
  const chart = shallowRef<echarts.ECharts | null>(null)

  function ensure() {
    if (!elRef.value) return null
    if (!chart.value) {
      chart.value = echarts.init(elRef.value)
    }
    return chart.value
  }

  function setOption(option: echarts.EChartsOption) {
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
