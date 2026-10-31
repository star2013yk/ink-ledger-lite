# 墨记账 · 本地版

个人自用的纯前端记账应用。无需后端与登录，打开浏览器即可记流水、管账户/分类/标签、看概览与报表；数据保存在本机 IndexedDB，支持导出备份，也可部署到静态站点并通过 PWA 添加到手机主屏幕。

## 技术栈

- Vue 3、Vite 5、TypeScript、Pinia、Vue Router（hash）
- Tailwind CSS 4、shadcn-vue（Reka UI）、Lucide 图标
- ECharts（图表）
- Dexie 4（IndexedDB）
- vite-plugin-pwa（PWA）
