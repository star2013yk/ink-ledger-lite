<script setup lang="ts">
import { onMounted, reactive, ref, watch } from 'vue'
import { toast } from 'vue-sonner'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { api } from '@/api'
import { useMetaStore } from '@/stores/meta'
import { formatMoney } from '@/utils/format'
import MetaIcon from '@/components/MetaIcon.vue'
import IconPicker from '@/components/IconPicker.vue'
import { ACCOUNT_TYPE_ICONS, resolveAccountIcon } from '@/lib/meta-icons'

const TYPE_LABEL: Record<string, string> = {
  CASH: '现金',
  BANK: '银行卡',
  CREDIT_CARD: '信用卡',
  ALIPAY: '支付宝',
  WECHAT: '微信',
  OTHER: '其他',
}

const meta = useMetaStore()
const open = ref(false)
const form = reactive({
  name: '',
  type: 'BANK',
  initialBalance: '0',
  icon: ACCOUNT_TYPE_ICONS.BANK,
})

onMounted(() => meta.loadAll())

watch(
  () => form.type,
  (type) => {
    form.icon = ACCOUNT_TYPE_ICONS[type] || 'Wallet'
  },
)

function syncIconByName() {
  if (!form.name.trim()) return
  form.icon = resolveAccountIcon(null, form.name.trim(), form.type)
}

async function create() {
  if (!form.name.trim()) {
    toast.error('请输入账户名')
    return
  }
  await api.saveAccount({
    name: form.name.trim(),
    type: form.type,
    currency: 'CNY',
    initialBalance: Number(form.initialBalance || 0),
    icon: form.icon,
  })
  await meta.loadAll()
  open.value = false
  form.name = ''
  form.initialBalance = '0'
  form.type = 'BANK'
  form.icon = ACCOUNT_TYPE_ICONS.BANK
  toast.success('账户已创建')
}

async function archive(id: number) {
  await api.archiveAccount(id)
  await meta.loadAll()
  toast.success('已归档')
}
</script>

<template>
  <div class="space-y-4">
    <div class="flex justify-end">
      <Dialog v-model:open="open">
        <DialogTrigger as-child>
          <Button>新建账户</Button>
        </DialogTrigger>
        <DialogContent class="max-w-lg">
          <DialogHeader>
            <DialogTitle>新建账户</DialogTitle>
          </DialogHeader>
          <div class="space-y-4 py-2">
            <div class="space-y-2">
              <Label>名称</Label>
              <Input v-model="form.name" @blur="syncIconByName" />
            </div>
            <div class="space-y-2">
              <Label>类型</Label>
              <Select v-model="form.type">
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="CASH">现金</SelectItem>
                  <SelectItem value="BANK">银行卡</SelectItem>
                  <SelectItem value="CREDIT_CARD">信用卡</SelectItem>
                  <SelectItem value="ALIPAY">支付宝</SelectItem>
                  <SelectItem value="WECHAT">微信</SelectItem>
                  <SelectItem value="OTHER">其他</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div class="space-y-2">
              <Label>期初余额</Label>
              <Input v-model="form.initialBalance" type="number" step="0.01" />
            </div>
            <div class="space-y-2">
              <Label>图标</Label>
              <IconPicker v-model="form.icon" />
            </div>
          </div>
          <DialogFooter>
            <Button @click="create">保存</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>

    <div class="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 xl:grid-cols-3">
      <Card v-for="a in meta.accounts" :key="a.id">
        <CardHeader class="pb-2">
          <div class="flex items-start justify-between gap-2">
            <div class="flex min-w-0 items-start gap-3">
              <span class="bg-muted text-foreground inline-flex size-10 shrink-0 items-center justify-center rounded-xl">
                <MetaIcon :icon="a.icon" :name="a.name" :account-type="a.type" class="size-5" />
              </span>
              <div class="min-w-0">
                <CardTitle class="truncate">{{ a.name }}</CardTitle>
                <CardDescription>{{ TYPE_LABEL[a.type] || a.type }}</CardDescription>
              </div>
            </div>
            <Badge variant="secondary">{{ a.currency || 'CNY' }}</Badge>
          </div>
        </CardHeader>
        <CardContent class="flex items-end justify-between">
          <div class="font-heading text-2xl font-semibold tabular-nums">{{ formatMoney(a.balance) }}</div>
          <Button variant="ghost" size="sm" @click="archive(a.id)">归档</Button>
        </CardContent>
      </Card>
    </div>
  </div>
</template>
