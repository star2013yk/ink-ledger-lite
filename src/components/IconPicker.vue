<script setup lang="ts">
import { META_ICON_OPTIONS, type MetaIconKey } from '@/lib/meta-icons'
import MetaIcon from '@/components/MetaIcon.vue'
import { cn } from '@/lib/utils'

const model = defineModel<string>({ default: 'Tag' })

function pick(key: MetaIconKey) {
  model.value = key
}
</script>

<template>
  <div class="grid max-h-48 grid-cols-6 gap-2 overflow-y-auto sm:grid-cols-8">
    <button
      v-for="item in META_ICON_OPTIONS"
      :key="item.key"
      type="button"
      :title="item.label"
      :class="cn(
        'border-border hover:bg-muted flex aspect-square items-center justify-center rounded-lg border transition-colors',
        model === item.key && 'border-primary bg-muted ring-ring ring-1',
      )"
      @click="pick(item.key)"
    >
      <MetaIcon :icon="item.key" class="size-4" />
    </button>
  </div>
</template>
