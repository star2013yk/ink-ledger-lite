<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter, RouterLink } from 'vue-router'
import {
  LayoutDashboard,
  PenLine,
  List,
  CalendarDays,
  Wallet,
  FolderTree,
  Tag,
  ChartColumnIncreasing,
  Settings,
  Menu,
  Ellipsis,
} from '@lucide/vue'
import { Button } from '@/components/ui/button'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet'
import { cn } from '@/lib/utils'
import { useMetaStore } from '@/stores/meta'

const route = useRoute()
const router = useRouter()
const meta = useMetaStore()
const moreOpen = ref(false)

const nav = [
  { to: '/', label: '概览', icon: LayoutDashboard, match: (p: string) => p === '/' },
  { to: '/transaction/new', label: '记一笔', icon: PenLine, match: (p: string) => p === '/transaction/new' },
  { to: '/transactions', label: '流水', icon: List, match: (p: string) => p === '/transactions' },
  { to: '/transactions/calendar', label: '日历', icon: CalendarDays, match: (p: string) => p.includes('calendar') },
  { to: '/accounts', label: '账户', icon: Wallet, match: (p: string) => p.startsWith('/accounts') },
  { to: '/categories', label: '分类', icon: FolderTree, match: (p: string) => p.startsWith('/categories') },
  { to: '/tags', label: '标签', icon: Tag, match: (p: string) => p.startsWith('/tags') },
  { to: '/reports', label: '报表', icon: ChartColumnIncreasing, match: (p: string) => p.startsWith('/reports') },
  { to: '/settings', label: '设置', icon: Settings, match: (p: string) => p.startsWith('/settings') },
]

/** 底部主 Tab：高频入口 */
const mobileTabs = [
  { to: '/', label: '概览', icon: LayoutDashboard, match: (p: string) => p === '/' },
  { to: '/transactions', label: '流水', icon: List, match: (p: string) => p === '/transactions' || p.includes('calendar') },
  { to: '/transaction/new', label: '记账', icon: PenLine, match: (p: string) => p === '/transaction/new', primary: true },
  { to: '/reports', label: '报表', icon: ChartColumnIncreasing, match: (p: string) => p.startsWith('/reports') },
]

const moreNav = [
  { to: '/transactions/calendar', label: '日历', icon: CalendarDays },
  { to: '/accounts', label: '账户', icon: Wallet },
  { to: '/categories', label: '分类', icon: FolderTree },
  { to: '/tags', label: '标签', icon: Tag },
  { to: '/settings', label: '设置', icon: Settings },
]

const pageTitle = computed(() => nav.find((n) => n.match(route.path))?.label || '墨记账')

onMounted(() => {
  meta.loadAll().catch(() => undefined)
})

function goMore(to: string) {
  moreOpen.value = false
  router.push(to)
}
</script>

<template>
  <div class="bg-background text-foreground min-h-svh">
    <!-- Desktop：左右等高，顶栏对齐，右侧内容区内滚动 -->
    <div class="hidden h-svh lg:flex">
      <aside class="border-border bg-sidebar text-sidebar-foreground flex h-full w-60 shrink-0 flex-col border-r">
        <div class="border-border flex h-14 shrink-0 items-center gap-3 border-b px-4">
          <div class="bg-primary text-primary-foreground flex size-8 shrink-0 items-center justify-center rounded-lg text-sm font-semibold">
            墨
          </div>
          <div class="min-w-0">
            <div class="font-heading truncate text-sm font-semibold tracking-tight">墨记账</div>
            <div class="text-muted-foreground truncate text-[11px]">本地账本 · 数据不出浏览器</div>
          </div>
        </div>
        <nav class="min-h-0 flex-1 space-y-0.5 overflow-y-auto overscroll-contain p-3">
          <RouterLink
            v-for="item in nav"
            :key="item.to"
            :to="item.to"
            :class="cn(
              'hover:bg-sidebar-accent hover:text-sidebar-accent-foreground flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors',
              item.match(route.path) && 'bg-sidebar-accent text-sidebar-accent-foreground font-medium',
            )"
          >
            <component :is="item.icon" class="size-4 shrink-0" />
            {{ item.label }}
          </RouterLink>
        </nav>
        <div class="border-border flex h-12 shrink-0 items-center justify-between border-t px-4">
          <span class="text-muted-foreground truncate text-xs">IndexedDB 本地存储</span>
          <span class="text-muted-foreground text-[11px]">v1</span>
        </div>
      </aside>

      <main class="flex h-full min-h-0 min-w-0 flex-1 flex-col">
        <header class="border-border flex h-14 shrink-0 items-center justify-between gap-3 border-b px-6">
          <h1 class="font-heading text-lg font-semibold tracking-tight">{{ pageTitle }}</h1>
          <Button size="sm" class="shrink-0" as-child>
            <RouterLink to="/transaction/new">记一笔</RouterLink>
          </Button>
        </header>
        <div class="min-h-0 flex-1 overflow-y-auto overscroll-contain p-6">
          <div class="mx-auto max-w-6xl">
            <router-view />
          </div>
        </div>
        <footer class="border-border text-muted-foreground flex h-12 shrink-0 items-center justify-center border-t px-6 text-center text-xs">
          <p class="truncate">我只需要花园的一张椅子和一只躺在那里晒太阳的猫</p>
        </footer>
      </main>
    </div>

    <!-- Mobile H5 -->
    <div class="flex min-h-svh flex-col lg:hidden">
      <header
        class="border-border bg-background/95 sticky top-0 z-40 flex items-center justify-between border-b px-4 backdrop-blur"
        style="padding-top: max(0.75rem, env(safe-area-inset-top)); padding-bottom: 0.75rem"
      >
        <div class="flex min-w-0 items-center gap-2">
          <div class="bg-primary text-primary-foreground flex size-8 shrink-0 items-center justify-center rounded-lg text-sm font-semibold">
            墨
          </div>
          <h1 class="font-heading truncate text-lg font-semibold tracking-tight">{{ pageTitle }}</h1>
        </div>

        <Sheet v-model:open="moreOpen">
          <SheetTrigger as-child>
            <Button variant="ghost" size="icon" class="size-10 shrink-0" aria-label="更多菜单">
              <Menu class="size-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="right" class="w-[85vw] max-w-xs p-0">
            <SheetHeader class="border-border border-b px-4 py-4 text-left">
              <SheetTitle>更多</SheetTitle>
              <p class="text-muted-foreground text-xs">本地账本 · 可离线打开</p>
            </SheetHeader>
            <nav class="flex flex-col gap-1 p-3">
              <button
                v-for="item in moreNav"
                :key="item.to"
                type="button"
                class="hover:bg-accent flex items-center gap-3 rounded-xl px-3 py-3 text-left text-sm active:scale-[0.99]"
                @click="goMore(item.to)"
              >
                <component :is="item.icon" class="size-5" />
                {{ item.label }}
              </button>
            </nav>
          </SheetContent>
        </Sheet>
      </header>

      <main
        class="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-4"
        style="padding-bottom: calc(5.5rem + env(safe-area-inset-bottom))"
      >
        <router-view />
      </main>

      <nav
        class="border-border bg-background/95 fixed inset-x-0 bottom-0 z-40 border-t backdrop-blur"
        style="padding-bottom: env(safe-area-inset-bottom)"
      >
        <div class="mx-auto grid max-w-lg grid-cols-5 px-1 pt-1 pb-1">
          <RouterLink
            v-for="item in mobileTabs.slice(0, 2)"
            :key="item.to"
            :to="item.to"
            :class="cn(
              'text-muted-foreground flex flex-col items-center justify-center gap-0.5 rounded-lg py-2 text-[11px] transition-colors',
              item.match(route.path) && 'text-foreground font-medium',
            )"
          >
            <component :is="item.icon" class="size-5" />
            {{ item.label }}
          </RouterLink>

          <RouterLink
            :to="mobileTabs[2].to"
            class="relative -mt-3 flex flex-col items-center justify-center"
          >
            <span
              :class="cn(
                'bg-primary text-primary-foreground flex size-12 items-center justify-center rounded-full shadow-md transition-transform active:scale-95',
                mobileTabs[2].match(route.path) && 'ring-primary/30 ring-4',
              )"
            >
              <PenLine class="size-5" />
            </span>
            <span class="text-foreground mt-1 text-[11px] font-medium">记账</span>
          </RouterLink>

          <RouterLink
            :to="mobileTabs[3].to"
            :class="cn(
              'text-muted-foreground flex flex-col items-center justify-center gap-0.5 rounded-lg py-2 text-[11px] transition-colors',
              mobileTabs[3].match(route.path) && 'text-foreground font-medium',
            )"
          >
            <component :is="mobileTabs[3].icon" class="size-5" />
            {{ mobileTabs[3].label }}
          </RouterLink>

          <button
            type="button"
            class="text-muted-foreground flex flex-col items-center justify-center gap-0.5 rounded-lg py-2 text-[11px]"
            @click="moreOpen = true"
          >
            <Ellipsis class="size-5" />
            更多
          </button>
        </div>
      </nav>
    </div>
  </div>
</template>
