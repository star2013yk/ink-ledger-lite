<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { toast } from 'vue-sonner'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
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
import type { Category, CategoryKind } from '@/types'
import MetaIcon from '@/components/MetaIcon.vue'
import IconPicker from '@/components/IconPicker.vue'
import { resolveMetaIcon } from '@/lib/meta-icons'

const meta = useMetaStore()
const open = ref(false)
const saving = ref(false)
const editingId = ref<number | null>(null)

const form = reactive({
  name: '',
  kind: 'EXPENSE' as CategoryKind,
  parentId: 'NONE',
  icon: 'Utensils',
})

const isEdit = computed(() => editingId.value != null)
const dialogTitle = computed(() => (isEdit.value ? '编辑分类' : '新建分类'))

const expense = computed(() => meta.categories.filter((c) => c.kind === 'EXPENSE'))
const income = computed(() => meta.categories.filter((c) => c.kind === 'INCOME'))

/** 可选父分类：同类型一级，且编辑时排除自身 */
const parents = computed(() =>
  meta.categories.filter(
    (c) =>
      c.kind === form.kind &&
      c.parentId == null &&
      c.id !== editingId.value,
  ),
)

onMounted(() => meta.loadAll())

function childrenOf(list: Category[], parentId: number | null) {
  return list.filter((c) => c.parentId === parentId)
}

function resetForm() {
  editingId.value = null
  form.name = ''
  form.kind = 'EXPENSE'
  form.parentId = 'NONE'
  form.icon = 'Utensils'
}

function openCreate() {
  resetForm()
  open.value = true
}

function openEdit(cat: Category) {
  editingId.value = cat.id
  form.name = cat.name
  form.kind = cat.kind
  form.parentId = cat.parentId == null ? 'NONE' : String(cat.parentId)
  form.icon = cat.icon || resolveMetaIcon(null, cat.name)
  open.value = true
}

function syncIconByName() {
  if (!form.name.trim()) return
  form.icon = resolveMetaIcon(null, form.name.trim())
}

function onKindChange() {
  // 类型切换后，父分类若不属于新类型则清空
  if (form.parentId === 'NONE') return
  const stillValid = parents.value.some((p) => String(p.id) === form.parentId)
  if (!stillValid) form.parentId = 'NONE'
}

async function save() {
  if (!form.name.trim()) {
    toast.error('请输入分类名')
    return
  }
  // 不能把自己设为自己的父分类（已在 parents 排除）；二级不能再挂二级
  if (form.parentId !== 'NONE' && Number(form.parentId) === editingId.value) {
    toast.error('不能选择自身作为父分类')
    return
  }
  const updating = isEdit.value
  saving.value = true
  try {
    await api.saveCategory({
      id: editingId.value ?? undefined,
      name: form.name.trim(),
      kind: form.kind,
      parentId: form.parentId === 'NONE' ? null : Number(form.parentId),
      icon: form.icon,
    })
    await meta.loadAll()
    open.value = false
    resetForm()
    toast.success(updating ? '分类已更新' : '分类已创建')
  } finally {
    saving.value = false
  }
}

async function remove(cat: Category) {
  const kids = meta.categories.filter((c) => c.parentId === cat.id)
  if (kids.length) {
    toast.error('请先删除子分类')
    return
  }
  if (!window.confirm(`确定删除分类「${cat.name}」？`)) return
  await api.deleteCategory(cat.id)
  await meta.loadAll()
  toast.success('分类已删除')
}
</script>

<template>
  <div class="space-y-4">
    <div class="flex justify-end">
      <Dialog
        :open="open"
        @update:open="(v) => { open = v; if (!v) resetForm() }"
      >
        <DialogTrigger as-child>
          <Button @click="openCreate">新建分类</Button>
        </DialogTrigger>
        <DialogContent class="max-w-lg">
          <DialogHeader>
            <DialogTitle>{{ dialogTitle }}</DialogTitle>
          </DialogHeader>
          <div class="space-y-4 py-2">
            <div class="space-y-2">
              <Label>名称</Label>
              <Input v-model="form.name" class="min-h-11" @blur="syncIconByName" />
            </div>
            <div class="space-y-2">
              <Label>类型</Label>
              <Select
                v-model="form.kind"
                :disabled="isEdit"
                @update:model-value="onKindChange"
              >
                <SelectTrigger class="min-h-11"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="EXPENSE">支出</SelectItem>
                  <SelectItem value="INCOME">收入</SelectItem>
                </SelectContent>
              </Select>
              <p v-if="isEdit" class="text-muted-foreground text-xs">编辑时不可更改收支类型</p>
            </div>
            <div class="space-y-2">
              <Label>父分类（可选）</Label>
              <Select v-model="form.parentId">
                <SelectTrigger class="min-h-11"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="NONE">无（一级）</SelectItem>
                  <SelectItem v-for="p in parents" :key="p.id" :value="String(p.id)">
                    <span class="inline-flex items-center gap-2">
                      <MetaIcon :icon="p.icon" :name="p.name" />
                      {{ p.name }}
                    </span>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div class="space-y-2">
              <Label>图标</Label>
              <IconPicker v-model="form.icon" />
            </div>
          </div>
          <DialogFooter class="gap-2 sm:gap-0">
            <Button variant="outline" :disabled="saving" @click="open = false">取消</Button>
            <Button class="min-h-11" :disabled="saving" @click="save">
              {{ saving ? '保存中…' : '保存' }}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>

    <div class="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4">
      <Card>
        <CardHeader><CardTitle>支出分类</CardTitle></CardHeader>
        <CardContent class="space-y-3">
          <div v-for="p in childrenOf(expense, null)" :key="p.id" class="space-y-1.5">
            <div class="flex items-center gap-2">
              <span class="bg-muted text-foreground inline-flex size-7 shrink-0 items-center justify-center rounded-md">
                <MetaIcon :icon="p.icon" :name="p.name" />
              </span>
              <span class="min-w-0 flex-1 truncate font-medium">{{ p.name }}</span>
              <Badge variant="secondary" class="shrink-0">一级</Badge>
              <Button variant="ghost" size="sm" class="h-8 shrink-0 px-2" @click="openEdit(p)">编辑</Button>
              <Button variant="ghost" size="sm" class="text-destructive h-8 shrink-0 px-2" @click="remove(p)">删除</Button>
            </div>
            <div class="text-muted-foreground ml-9 space-y-1 text-sm">
              <div
                v-for="c in childrenOf(expense, p.id)"
                :key="c.id"
                class="flex items-center gap-2"
              >
                <MetaIcon :icon="c.icon" :name="c.name" class="size-3.5 shrink-0" />
                <span class="min-w-0 flex-1 truncate">{{ c.name }}</span>
                <Button variant="ghost" size="sm" class="h-7 shrink-0 px-2 text-xs" @click="openEdit(c)">编辑</Button>
                <Button variant="ghost" size="sm" class="text-destructive h-7 shrink-0 px-2 text-xs" @click="remove(c)">删除</Button>
              </div>
            </div>
          </div>
          <p v-if="!childrenOf(expense, null).length" class="text-muted-foreground text-sm">暂无支出分类</p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle>收入分类</CardTitle></CardHeader>
        <CardContent class="space-y-3">
          <div v-for="p in childrenOf(income, null)" :key="p.id" class="space-y-1.5">
            <div class="flex items-center gap-2">
              <span class="bg-muted text-foreground inline-flex size-7 shrink-0 items-center justify-center rounded-md">
                <MetaIcon :icon="p.icon" :name="p.name" />
              </span>
              <span class="min-w-0 flex-1 truncate font-medium">{{ p.name }}</span>
              <Badge variant="secondary" class="shrink-0">一级</Badge>
              <Button variant="ghost" size="sm" class="h-8 shrink-0 px-2" @click="openEdit(p)">编辑</Button>
              <Button variant="ghost" size="sm" class="text-destructive h-8 shrink-0 px-2" @click="remove(p)">删除</Button>
            </div>
            <div class="text-muted-foreground ml-9 space-y-1 text-sm">
              <div
                v-for="c in childrenOf(income, p.id)"
                :key="c.id"
                class="flex items-center gap-2"
              >
                <MetaIcon :icon="c.icon" :name="c.name" class="size-3.5 shrink-0" />
                <span class="min-w-0 flex-1 truncate">{{ c.name }}</span>
                <Button variant="ghost" size="sm" class="h-7 shrink-0 px-2 text-xs" @click="openEdit(c)">编辑</Button>
                <Button variant="ghost" size="sm" class="text-destructive h-7 shrink-0 px-2 text-xs" @click="remove(c)">删除</Button>
              </div>
            </div>
          </div>
          <p v-if="!childrenOf(income, null).length" class="text-muted-foreground text-sm">暂无收入分类</p>
        </CardContent>
      </Card>
    </div>
  </div>
</template>
