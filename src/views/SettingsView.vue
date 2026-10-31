<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue'
import dayjs from 'dayjs'
import { toast } from 'vue-sonner'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { api } from '@/api'
import type { SysSettingItem } from '@/types'

const form = reactive({
  base_currency: 'CNY',
  timezone: 'Asia/Shanghai',
  week_start: '1',
})
const settingItems = ref<SysSettingItem[]>([])
const stats = ref({ accounts: 0, categories: 0, tags: 0, transactions: 0, estimatedBytes: 0 })
const fileInput = ref<HTMLInputElement | null>(null)
const busy = ref(false)

async function loadStats() {
  stats.value = await api.dataStats()
}

onMounted(async () => {
  const s = await api.getSettings()
  settingItems.value = s.list
  Object.assign(form, {
    base_currency: s.map.base_currency || form.base_currency,
    timezone: s.map.timezone || form.timezone,
    week_start: s.map.week_start || form.week_start,
  })
  await loadStats()
})

async function save() {
  await api.saveSettings({ ...form }, settingItems.value)
  const s = await api.getSettings()
  settingItems.value = s.list
  toast.success('设置已保存')
}

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`
}

async function exportData() {
  busy.value = true
  try {
    const data = await api.exportBackup()
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `ink-ledger-${dayjs().format('YYYYMMDD-HHmmss')}.json`
    link.click()
    URL.revokeObjectURL(url)
    toast.success('备份已导出，请妥善保存')
  } finally {
    busy.value = false
  }
}

function pickFile() {
  fileInput.value?.click()
}

async function onFileChange(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return
  const text = await file.text()
  input.value = ''
  if (!window.confirm('导入会覆盖当前全部账本数据，确定继续？')) return
  busy.value = true
  try {
    const result = await api.importBackup(text)
    toast.success(`已导入 ${result.transactions} 条流水，正在刷新`)
    setTimeout(() => location.reload(), 600)
  } catch (err) {
    toast.error(err instanceof Error ? err.message : '导入失败，请检查文件')
  } finally {
    busy.value = false
  }
}

async function clearTransactions() {
  if (!window.confirm('将删除全部流水（账户、分类、标签保留），此操作不可撤销，确定继续？')) return
  busy.value = true
  try {
    await api.clearTransactions()
    toast.success('流水已清空')
    await loadStats()
  } finally {
    busy.value = false
  }
}

async function resetToSeed() {
  if (!window.confirm('将用内置示例数据覆盖当前账本，确定继续？')) return
  busy.value = true
  try {
    await api.resetToSeed()
    toast.success('已恢复示例数据，正在刷新')
    setTimeout(() => location.reload(), 600)
  } finally {
    busy.value = false
  }
}
</script>

<template>
  <div class="mx-auto max-w-2xl space-y-4">
    <Card>
      <CardHeader>
        <CardTitle>偏好设置</CardTitle>
        <CardDescription>币种、时区等基础配置</CardDescription>
      </CardHeader>
      <CardContent class="space-y-4">
        <div class="space-y-2">
          <Label>基础币种</Label>
          <Input v-model="form.base_currency" />
        </div>
        <div class="space-y-2">
          <Label>时区</Label>
          <Input v-model="form.timezone" />
        </div>
        <div class="space-y-2">
          <Label>每周起始（0=周日，1=周一）</Label>
          <Input v-model="form.week_start" />
        </div>
        <Button @click="save">保存</Button>
      </CardContent>
    </Card>

    <Card>
      <CardHeader>
        <CardTitle>本地数据</CardTitle>
        <CardDescription>
          全部数据保存在此浏览器的 IndexedDB 中，不会上传任何服务器。清理浏览器数据、换设备或换浏览器都会丢失账本，请定期导出备份。
        </CardDescription>
      </CardHeader>
      <CardContent class="space-y-4">
        <div class="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div class="bg-muted/50 rounded-lg px-3 py-2">
            <div class="text-muted-foreground text-xs">流水</div>
            <div class="text-lg font-semibold tabular-nums">{{ stats.transactions }}</div>
          </div>
          <div class="bg-muted/50 rounded-lg px-3 py-2">
            <div class="text-muted-foreground text-xs">账户</div>
            <div class="text-lg font-semibold tabular-nums">{{ stats.accounts }}</div>
          </div>
          <div class="bg-muted/50 rounded-lg px-3 py-2">
            <div class="text-muted-foreground text-xs">分类</div>
            <div class="text-lg font-semibold tabular-nums">{{ stats.categories }}</div>
          </div>
          <div class="bg-muted/50 rounded-lg px-3 py-2">
            <div class="text-muted-foreground text-xs">标签</div>
            <div class="text-lg font-semibold tabular-nums">{{ stats.tags }}</div>
          </div>
        </div>
        <p class="text-muted-foreground text-xs">数据体积约 {{ formatBytes(stats.estimatedBytes) }}</p>

        <Separator />

        <div class="flex flex-wrap gap-2">
          <Button :disabled="busy" @click="exportData">导出备份</Button>
          <Button variant="outline" :disabled="busy" @click="pickFile">导入备份</Button>
          <input
            ref="fileInput"
            type="file"
            accept="application/json,.json"
            class="hidden"
            @change="onFileChange"
          />
        </div>

        <Separator />

        <div class="flex flex-wrap gap-2">
          <Button variant="outline" :disabled="busy" @click="clearTransactions">清空全部流水</Button>
          <Button variant="destructive" :disabled="busy" @click="resetToSeed">恢复示例数据</Button>
        </div>
      </CardContent>
    </Card>
  </div>
</template>
