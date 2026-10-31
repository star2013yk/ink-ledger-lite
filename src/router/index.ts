import { createRouter, createWebHashHistory } from 'vue-router'

/**
 * 纯本地版没有登录态；使用 hash 路由，
 * 部署到 GitHub Pages 子路径时刷新任意页面都不会 404。
 */
const router = createRouter({
  history: createWebHashHistory(),
  routes: [
    {
      path: '/',
      component: () => import('@/layouts/AppLayout.vue'),
      children: [
        { path: '', name: 'overview', component: () => import('@/views/OverviewView.vue') },
        { path: 'transaction/new', name: 'txn-new', component: () => import('@/views/TransactionFormView.vue') },
        { path: 'transactions', name: 'transactions', component: () => import('@/views/TransactionsView.vue') },
        { path: 'transactions/calendar', name: 'calendar', component: () => import('@/views/CalendarView.vue') },
        { path: 'accounts', name: 'accounts', component: () => import('@/views/AccountsView.vue') },
        { path: 'categories', name: 'categories', component: () => import('@/views/CategoriesView.vue') },
        { path: 'tags', name: 'tags', component: () => import('@/views/TagsView.vue') },
        { path: 'reports', name: 'reports', component: () => import('@/views/ReportsView.vue') },
        { path: 'settings', name: 'settings', component: () => import('@/views/SettingsView.vue') },
      ],
    },
    { path: '/:pathMatch(.*)*', redirect: '/' },
  ],
})

export default router
