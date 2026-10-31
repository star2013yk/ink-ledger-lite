<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { toast } from 'vue-sonner'
import dayjs from 'dayjs'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { api, toLocalDateTime } from '@/api'
import { useMetaStore } from '@/stores/meta'
import type { TransactionType } from '@/types'
import MetaIcon from '@/components/MetaIcon.vue'
import CategoryPicker from '@/components/CategoryPicker.vue'

const meta = useMetaStore()
const router = useRouter()
const saving = ref(false)

const form = reactive({
  type: 'EXPENSE' as TransactionType,
  amount: '',
  accountId: '',
  toAccountId: '',
  categoryId: '',
  tagId: 'NONE',
  payee: '',
  note: '',
  occurredAt: dayjs().format('YYYY-MM-DDTHH:mm'),
})

const categories = computed(() => {
  if (form.type === 'TRANSFER') return []
  const kind = form.type === 'INCOME' ? 'INCOME' : 'EXPENSE'
  return meta.categories.filter((c) => c.kind === kind && !c.archived)
})

onMounted(async () => {
  if (!meta.loaded) await meta.loadAll()
  if (meta.accounts.length && !form.accountId) form.accountId = String(meta.accounts[0].id)
})

async function submit() {
  const amount = Number(form.amount)
  if (!amount || amount <= 0) {
    toast.error('请输入有效金额')
    return
  }
  if (!form.accountId) {
    toast.error('请选择账户')
    return
  }
  if (form.type === 'TRANSFER' && !form.toAccountId) {
    toast.error('请选择转入账户')
    return
  }
  if (form.type !== 'TRANSFER' && !form.categoryId) {
    toast.error('请选择分类')
    return
  }
  saving.value = true
  try {
    await api.createTransaction({
      type: form.type,
      amount,
      accountId: Number(form.accountId),
      toAccountId: form.type === 'TRANSFER' ? Number(form.toAccountId) : null,
      categoryId: form.categoryId ? Number(form.categoryId) : null,
      payee: form.payee || undefined,
      note: form.note || undefined,
      tagId: form.tagId === 'NONE' ? null : Number(form.tagId),
      occurredAt: toLocalDateTime(form.occurredAt) || form.occurredAt,
    })
    await meta.loadAll()
    toast.success('已记账')
    router.push('/transactions')
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <Card class="mx-auto max-w-2xl border-0 shadow-none sm:border sm:shadow-sm">
    <CardHeader class="px-1 pt-1 sm:px-6 sm:pt-6">
      <CardTitle class="text-lg sm:text-xl">记一笔</CardTitle>
      <CardDescription class="hidden sm:block">支出 / 收入 / 转账，尽量一次填完</CardDescription>
    </CardHeader>
    <CardContent class="px-1 sm:px-6">
      <form class="space-y-4 sm:space-y-5" @submit.prevent="submit">
        <div class="grid grid-cols-3 gap-2">
          <Button
            v-for="t in ([
              ['EXPENSE', '支出'],
              ['INCOME', '收入'],
              ['TRANSFER', '转账'],
            ] as const)"
            :key="t[0]"
            type="button"
            class="min-h-11"
            :variant="form.type === t[0] ? 'default' : 'outline'"
            @click="form.type = t[0]; form.categoryId = ''"
          >
            {{ t[1] }}
          </Button>
        </div>

        <div class="space-y-2">
          <Label>金额</Label>
          <Input
            v-model="form.amount"
            type="number"
            inputmode="decimal"
            min="0"
            step="0.01"
            placeholder="0.00"
            class="h-12 text-xl tabular-nums"
          />
        </div>

        <div class="grid gap-4 sm:grid-cols-2">
          <div class="space-y-2">
            <Label>{{ form.type === 'TRANSFER' ? '转出账户' : '账户' }}</Label>
            <Select v-model="form.accountId">
              <SelectTrigger class="min-h-11 w-full sm:h-9 sm:min-h-9">
                <SelectValue placeholder="选择账户" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem v-for="a in meta.accounts" :key="a.id" :value="String(a.id)">
                  <span class="inline-flex items-center gap-2">
                    <MetaIcon :icon="a.icon" :name="a.name" :account-type="a.type" />
                    {{ a.name }}
                  </span>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div v-if="form.type === 'TRANSFER'" class="space-y-2">
            <Label>转入账户</Label>
            <Select v-model="form.toAccountId">
              <SelectTrigger class="min-h-11 w-full sm:h-9 sm:min-h-9">
                <SelectValue placeholder="选择账户" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem v-for="a in meta.accounts" :key="a.id" :value="String(a.id)">
                  <span class="inline-flex items-center gap-2">
                    <MetaIcon :icon="a.icon" :name="a.name" :account-type="a.type" />
                    {{ a.name }}
                  </span>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div v-else class="space-y-2">
            <Label>分类</Label>
            <CategoryPicker v-model="form.categoryId" :categories="categories" placeholder="选择分类" />
          </div>
        </div>

        <div class="grid gap-4 sm:grid-cols-2">
          <div class="space-y-2">
            <Label>时间</Label>
            <Input v-model="form.occurredAt" type="datetime-local" class="min-h-11 sm:min-h-9" />
          </div>
          <div class="space-y-2">
            <Label>商户 / 对方</Label>
            <Input v-model="form.payee" placeholder="可选" class="min-h-11 sm:min-h-9" />
          </div>
        </div>

        <div v-if="form.type !== 'TRANSFER'" class="space-y-2">
          <Label>标签（可选）</Label>
          <Select v-model="form.tagId">
            <SelectTrigger class="min-h-11 w-full sm:h-9 sm:min-h-9">
              <SelectValue placeholder="选择标签" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="NONE">无</SelectItem>
              <SelectItem v-for="t in meta.tags" :key="t.id" :value="String(t.id)">
                <span class="inline-flex items-center gap-2">
                  <MetaIcon :icon="t.icon" :name="t.name" />
                  {{ t.name }}
                </span>
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div class="space-y-2">
          <Label>备注</Label>
          <Textarea v-model="form.note" placeholder="可选" rows="3" class="min-h-20" />
        </div>

        <div class="flex flex-col-reverse gap-2 pt-1 sm:flex-row sm:justify-end">
          <Button type="button" variant="outline" class="min-h-11 w-full sm:w-auto" @click="router.back()">取消</Button>
          <Button type="submit" class="min-h-11 w-full sm:w-auto" :disabled="saving">
            {{ saving ? '保存中…' : '保存' }}
          </Button>
        </div>
      </form>
    </CardContent>
  </Card>
</template>
