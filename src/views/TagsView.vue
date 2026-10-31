<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { toast } from 'vue-sonner'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { api } from '@/api'
import { useMetaStore } from '@/stores/meta'
import type { Tag } from '@/types'
import MetaIcon from '@/components/MetaIcon.vue'
import IconPicker from '@/components/IconPicker.vue'
import { resolveMetaIcon } from '@/lib/meta-icons'

const meta = useMetaStore()
const open = ref(false)
const saving = ref(false)
const editingId = ref<number | null>(null)

const form = reactive({
  name: '',
  icon: 'Tag',
})

const isEdit = computed(() => editingId.value != null)
const dialogTitle = computed(() => (isEdit.value ? '编辑标签' : '新建标签'))

onMounted(() => meta.loadAll())

function resetForm() {
  editingId.value = null
  form.name = ''
  form.icon = 'Tag'
}

function openCreate() {
  resetForm()
  open.value = true
}

function openEdit(tag: Tag) {
  editingId.value = tag.id
  form.name = tag.name
  form.icon = tag.icon || resolveMetaIcon(null, tag.name)
  open.value = true
}

function syncIconByName() {
  if (!form.name.trim()) return
  form.icon = resolveMetaIcon(null, form.name.trim())
}

async function save() {
  if (!form.name.trim()) {
    toast.error('请输入标签名')
    return
  }
  const updating = isEdit.value
  saving.value = true
  try {
    await api.saveTag({
      id: editingId.value ?? undefined,
      name: form.name.trim(),
      icon: form.icon,
    })
    await meta.loadAll()
    open.value = false
    resetForm()
    toast.success(updating ? '标签已更新' : '标签已创建')
  } finally {
    saving.value = false
  }
}

async function remove(tag: Tag) {
  if (!window.confirm(`确定删除标签「${tag.name}」？`)) return
  await api.deleteTag(tag.id)
  await meta.loadAll()
  toast.success('标签已删除')
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
          <Button @click="openCreate">新建标签</Button>
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

    <Card>
      <CardHeader>
        <CardTitle>全部标签</CardTitle>
        <CardDescription>记一笔时可选用，用于交叉筛选</CardDescription>
      </CardHeader>
      <CardContent>
        <div class="flex flex-wrap gap-2">
          <div
            v-for="t in meta.tags"
            :key="t.id"
            class="border-border bg-card inline-flex items-center gap-1.5 rounded-full border py-1.5 pr-1.5 pl-3 text-sm"
          >
            <MetaIcon :icon="t.icon" :name="t.name" class="size-3.5" />
            <span>{{ t.name }}</span>
            <button
              type="button"
              class="text-muted-foreground hover:text-foreground rounded-full px-1.5 py-0.5 text-xs"
              @click="openEdit(t)"
            >
              编辑
            </button>
            <button
              type="button"
              class="text-muted-foreground hover:text-destructive rounded-full px-1.5 py-0.5 text-xs"
              @click="remove(t)"
            >
              删除
            </button>
          </div>
          <p v-if="!meta.tags.length" class="text-muted-foreground text-sm">暂无标签，点右上角新建</p>
        </div>
      </CardContent>
    </Card>
  </div>
</template>
