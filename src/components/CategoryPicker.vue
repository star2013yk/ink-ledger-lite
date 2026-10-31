<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { ChevronDown, ChevronRight } from '@lucide/vue'
import { Button } from '@/components/ui/button'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import type { Category } from '@/types'
import MetaIcon from '@/components/MetaIcon.vue'
import { cn } from '@/lib/utils'

const props = defineProps<{
  modelValue: string
  categories: Category[]
  placeholder?: string
}>()

const emit = defineEmits<{
  'update:modelValue': [value: string]
}>()

const rootEl = ref<HTMLElement | null>(null)
const open = ref(false)
const expanded = ref<Set<number>>(new Set())
const isMobile = ref(false)

function syncViewport() {
  isMobile.value = typeof window !== 'undefined' && window.innerWidth < 640
}

function onDocPointer(e: Event) {
  if (!open.value || isMobile.value || !rootEl.value) return
  if (!rootEl.value.contains(e.target as Node)) open.value = false
}

onMounted(() => {
  syncViewport()
  window.addEventListener('resize', syncViewport)
  document.addEventListener('pointerdown', onDocPointer)
})
onUnmounted(() => {
  window.removeEventListener('resize', syncViewport)
  document.removeEventListener('pointerdown', onDocPointer)
})

const roots = computed(() =>
  props.categories
    .filter((c) => c.parentId == null && !c.archived)
    .slice()
    .sort((a, b) => a.id - b.id),
)

function childrenOf(parentId: number) {
  return props.categories
    .filter((c) => c.parentId === parentId && !c.archived)
    .slice()
    .sort((a, b) => a.id - b.id)
}

/** 有子分类的一级不可选；「其他」或无子项的一级可选 */
function isSelectableRoot(cat: Category) {
  if (/其他/.test(cat.name)) return true
  return childrenOf(cat.id).length === 0
}

function hasChildren(cat: Category) {
  return childrenOf(cat.id).length > 0
}

const selected = computed(() =>
  props.categories.find((c) => String(c.id) === props.modelValue),
)

const selectedLabel = computed(() => selected.value?.name || props.placeholder || '选择分类')

function ensureSelectedExpanded() {
  const cur = selected.value
  if (cur?.parentId != null) {
    const next = new Set(expanded.value)
    next.add(cur.parentId)
    expanded.value = next
  }
}

function toggleExpand(id: number) {
  const next = new Set(expanded.value)
  if (next.has(id)) next.delete(id)
  else next.add(id)
  expanded.value = next
}

function onRootClick(cat: Category) {
  if (hasChildren(cat) && !isSelectableRoot(cat)) {
    toggleExpand(cat.id)
    return
  }
  pick(cat.id)
}

function pick(id: number) {
  emit('update:modelValue', String(id))
  open.value = false
}

function openPicker() {
  ensureSelectedExpanded()
  open.value = true
}

watch(
  () => props.categories,
  () => {
    expanded.value = new Set()
  },
)
</script>

<template>
  <div ref="rootEl" class="relative">
    <Button
      type="button"
      variant="outline"
      class="min-h-11 w-full justify-between px-3 font-normal sm:h-9 sm:min-h-9"
      @click="openPicker"
    >
      <span class="inline-flex min-w-0 items-center gap-2">
        <MetaIcon
          v-if="selected"
          :icon="selected.icon"
          :name="selected.name"
          class="size-4 shrink-0"
        />
        <span class="truncate" :class="{ 'text-muted-foreground': !selected }">
          {{ selectedLabel }}
        </span>
      </span>
      <ChevronDown class="text-muted-foreground size-4 shrink-0 opacity-60" />
    </Button>

    <!-- 桌面：下拉 -->
    <div
      v-if="open && !isMobile"
      class="border-border bg-popover absolute z-50 mt-1 max-h-72 w-full overflow-y-auto overscroll-contain rounded-lg border p-1 shadow-md"
    >
      <div v-for="root in roots" :key="`d-${root.id}`">
        <button
          type="button"
          :class="cn(
            'hover:bg-accent flex w-full items-center gap-2 rounded-md px-2 py-2 text-left text-sm',
            modelValue === String(root.id) && 'bg-accent font-medium',
          )"
          @click="onRootClick(root)"
        >
          <span class="flex size-4 shrink-0 items-center justify-center">
            <ChevronDown
              v-if="hasChildren(root) && expanded.has(root.id)"
              class="text-muted-foreground size-3.5"
            />
            <ChevronRight
              v-else-if="hasChildren(root)"
              class="text-muted-foreground size-3.5"
            />
          </span>
          <MetaIcon :icon="root.icon" :name="root.name" class="size-4 shrink-0" />
          <span class="min-w-0 flex-1 truncate">{{ root.name }}</span>
          <span
            v-if="hasChildren(root) && !isSelectableRoot(root)"
            class="text-muted-foreground shrink-0 text-[11px]"
          >
            {{ childrenOf(root.id).length }}
          </span>
        </button>

        <div v-if="hasChildren(root) && expanded.has(root.id)" class="mb-1 ml-4 border-l pl-1">
          <button
            v-for="child in childrenOf(root.id)"
            :key="`d-c-${child.id}`"
            type="button"
            :class="cn(
              'hover:bg-accent flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm',
              modelValue === String(child.id) && 'bg-accent font-medium',
            )"
            @click="pick(child.id)"
          >
            <MetaIcon :icon="child.icon" :name="child.name" class="size-3.5 shrink-0" />
            <span class="truncate">{{ child.name }}</span>
          </button>
        </div>
      </div>
      <p v-if="!roots.length" class="text-muted-foreground px-2 py-3 text-center text-xs">暂无分类</p>
    </div>

    <!-- H5：底部抽屉 -->
    <Sheet :open="open && isMobile" @update:open="(v) => { if (!v) open = false }">
      <SheetContent
        side="bottom"
        class="max-h-[78vh] rounded-t-2xl p-0"
        style="padding-bottom: env(safe-area-inset-bottom)"
      >
        <SheetHeader class="border-border border-b px-4 py-3 text-left">
          <SheetTitle>选择分类</SheetTitle>
          <p class="text-muted-foreground text-xs">点一级展开，选二级记账</p>
        </SheetHeader>
        <div class="max-h-[calc(78vh-4.5rem)] overflow-y-auto overscroll-contain px-2 py-2">
          <div v-for="root in roots" :key="`m-${root.id}`">
            <button
              type="button"
              :class="cn(
                'active:bg-accent flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm',
                modelValue === String(root.id) && 'bg-accent font-medium',
              )"
              @click="onRootClick(root)"
            >
              <span class="flex size-5 shrink-0 items-center justify-center">
                <ChevronDown
                  v-if="hasChildren(root) && expanded.has(root.id)"
                  class="text-muted-foreground size-4"
                />
                <ChevronRight
                  v-else-if="hasChildren(root)"
                  class="text-muted-foreground size-4"
                />
              </span>
              <span class="bg-muted inline-flex size-8 shrink-0 items-center justify-center rounded-lg">
                <MetaIcon :icon="root.icon" :name="root.name" class="size-4" />
              </span>
              <span class="min-w-0 flex-1 truncate font-medium">{{ root.name }}</span>
              <span
                v-if="hasChildren(root) && !isSelectableRoot(root)"
                class="text-muted-foreground shrink-0 text-xs"
              >
                {{ childrenOf(root.id).length }} 项
              </span>
            </button>

            <div
              v-if="hasChildren(root) && expanded.has(root.id)"
              class="border-border mb-1 ml-8 space-y-0.5 border-l pl-2"
            >
              <button
                v-for="child in childrenOf(root.id)"
                :key="`m-c-${child.id}`"
                type="button"
                :class="cn(
                  'active:bg-accent flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm',
                  modelValue === String(child.id) && 'bg-accent font-medium',
                )"
                @click="pick(child.id)"
              >
                <MetaIcon :icon="child.icon" :name="child.name" class="size-4 shrink-0" />
                <span class="truncate">{{ child.name }}</span>
              </button>
            </div>
          </div>
          <p v-if="!roots.length" class="text-muted-foreground px-2 py-8 text-center text-sm">
            暂无分类
          </p>
        </div>
      </SheetContent>
    </Sheet>
  </div>
</template>
