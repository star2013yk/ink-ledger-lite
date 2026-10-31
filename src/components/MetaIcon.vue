<script setup lang="ts">
import { computed } from 'vue'
import { getAccountIconComponent, getMetaIconComponent } from '@/lib/meta-icons'
import { cn } from '@/lib/utils'

const props = withDefaults(
  defineProps<{
    icon?: string | null
    name?: string | null
    /** 账户类型，传入时按账户规则解析图标 */
    accountType?: string | null
    class?: string
  }>(),
  {
    icon: null,
    name: null,
    accountType: null,
  },
)

const comp = computed(() =>
  props.accountType
    ? getAccountIconComponent(props.icon, props.name, props.accountType)
    : getMetaIconComponent(props.icon, props.name),
)
</script>

<template>
  <component :is="comp" :class="cn('size-4 shrink-0', props.class)" aria-hidden="true" />
</template>
