# 墨记账 · 本地版

纯前端记账应用：**没有后端、没有数据库服务、没有登录**，账本数据保存在浏览器 IndexedDB 里，部署到任意静态托管（GitHub Pages / OSS / COS / Nginx）即可使用，也可以「添加到主屏幕」当 App 用（PWA）。

由 `frontend/` 的 Vue 3 应用裁剪而来，接口层从 HTTP 换成了本地 IndexedDB 实现，页面与交互保持一致。

## 技术栈

- Vue 3 + Vite 5 + TypeScript + Pinia + Vue Router（hash 模式）
- Tailwind CSS 4 + shadcn-vue（reka-ui）
- ECharts（图表）
- **Dexie 4**（IndexedDB 封装）
- **vite-plugin-pwa**（manifest + Service Worker）

## 与完整版的差异

| 能力 | 完整版（backend + frontend） | 本地版（本项目） |
| --- | --- | --- |
| 数据存储 | MySQL / PostgreSQL | 浏览器 IndexedDB |
| 登录鉴权 | JWT | 无（打开即用） |
| 多设备同步 | 支持 | 不支持，需手动导出/导入 |
| 部署成本 | 服务器 + 数据库 + 备案 | 静态托管，0 元 |
| 数据安全 | 在你自己服务器 | 只在这台设备的浏览器里 |

数据丢失的风险点：清理浏览器数据、换手机、换浏览器、隐私模式下关闭窗口。**请定期在「设置 → 本地数据 → 导出备份」保存 JSON。**

## 本地开发

```bash
cd lite-app
npm install
npm run dev        # http://localhost:5173
```

首次打开会自动写入初始数据：3 个账户（现金 / 银行卡 / 微信 ¥5000）、19 个一级分类（含二级共 37 个）、5 个标签，**不带示例流水**，账本从空白开始。可以在「设置 → 恢复示例数据」重置；如果浏览器里还留着旧版本的示例数据（5 个账户 + 40 条流水），点一次「恢复示例数据」即可换成新的一套。

```bash
npm run build      # 产物在 dist/
npm run preview    # 预览构建结果
npm run typecheck  # 类型检查
```

## 部署到 GitHub Pages

仓库已包含 `.github/workflows/deploy-pages.yml`：

1. 推到 `main`，或在 Actions 里手动 `Run workflow`
2. 仓库 **Settings → Pages → Build and deployment → Source** 选择 **GitHub Actions**
3. 部署完成后访问 `https://<用户名>.github.io/ink-ledger-lite/`

说明：

- `vite.config.ts` 里 `base: './'`，子路径部署不用改配置
- 路由是 hash 模式（`/#/transactions`），刷新任意页面都不会 404
- 若启用自定义域名，在 Pages 设置里填好即可


## 其他静态托管

`npm run build` 后把 `dist/` 整个目录上传即可（OSS / COS / 又拍云 / Nginx）。

注意：**PWA 安装和 Service Worker 需要 HTTPS**（`localhost` 除外）。国内 OSS/COS 绑定自定义域名需要备案；只用默认域名也可以访问，只是地址不好记。

## 手机安装（PWA）

- iOS Safari：打开站点 → 分享 → 「添加到主屏幕」
- Android Chrome：地址栏右侧出现「安装」提示，或菜单 → 「添加到主屏幕」

安装后全屏启动、有独立图标；界面可离线打开（数据本来就在本地）。

## 数据模型

数据库名 `ink-ledger`，Dexie 表结构见 `src/db/database.ts`：

| 表 | 说明 |
| --- | --- |
| `accounts` | 账户，`balance` 是派生值 |
| `categories` | 分类，`parentId` 支持二级 |
| `tags` | 标签 |
| `transactions` | 流水，`archived=true` 表示逻辑删除 |
| `settings` | base_currency / timezone / week_start |
| `meta` | 示例数据标记、自增 id 游标 |

余额口径与后端一致：`balance = initialBalance + Σ收入 - Σ支出 - Σ转出 + Σ转入`，只统计 `archived=false`。任何流水或账户变更后都会全量重算（`src/db/repository.ts` 的 `recalcBalances`），因此编辑/删除流水不需要增量回滚，不存在账实不符。

备份文件是完整快照（含 `nextIds`），导入时会整体覆盖，导入后自动重算余额。

## 目录

```
src/
├── api/index.ts        # 视图调用的统一「接口」入口，直接转发到 db/repository
├── db/
│   ├── database.ts     # Dexie schema
│   ├── repository.ts   # 全部业务逻辑（增删改查、统计、备份恢复）
│   └── seed.ts         # 初始数据（账户/分类/标签，无流水）
├── router/index.ts     # hash 路由，无登录守卫
├── layouts/AppLayout.vue
└── views/              # 概览、记账、流水、日历、账户、分类、标签、报表、设置
```
