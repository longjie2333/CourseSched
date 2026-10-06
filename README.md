# CourseSched Wevu

CourseSched 是课程表微信小程序。当前版本使用 `weapp-vite` 编译 Vue SFC，以 `wevu` 提供 Vue 3 风格的响应式状态、生命周期、组件契约和按业务域拆分的 store。项目不是 uni-app，TDesign Mini Program 继续作为原生第三方组件使用。

## 技术栈

| 范围 | 方案 |
| --- | --- |
| 构建 | weapp-vite 6 |
| 页面与组件 | Vue SFC，`<script setup lang="ts">` |
| 跨页状态 | wevu store，不使用 Pinia |
| 小程序运行时 | wevu 6，`ref/computed/watch` 与小程序生命周期 |
| UI | TDesign Mini Program 1.10.1（pnpm patch） |
| 质量 | TypeScript、ESLint、Vitest、项目结构校验 |

## 快速开始

要求 Node.js `^20.19.0 || >=22.12.0`、pnpm 10，以及已登录并开启服务端口的微信开发者工具。

```powershell
pnpm install
Copy-Item src/env.example.js src/env.js
pnpm dev:open
```

`src/env.js` 仅用于本机环境，不提交版本库。生产构建输出到 `dist/`：

```powershell
pnpm build
```

## 常用命令

| 命令 | 用途 |
| --- | --- |
| `pnpm dev` | 监听并构建 |
| `pnpm open` | 打开微信开发者工具 |
| `pnpm check` | 项目校验、类型、lint、测试和生产构建 |
| `pnpm test:watch` | 监听单元测试 |
| `pnpm g` | 使用 weapp-vite 生成器 |
| `pnpm exec wv prepare` | 刷新 `.weapp-vite` 受管文件 |
| `pnpm exec wv screenshot` | 微信开发者工具真机页面截图 |

## 目录边界

```text
src/
├─ pages/       # 路由页：组合业务能力，管理页面交互状态
├─ features/    # 按业务域组织，域内仓储、类型、服务和组件直接平铺
├─ shared/      # 跨域基础能力直接平铺，避免单文件中间目录
├─ images/      # 静态资源
├─ app.vue
└─ app.wxss
```

新代码只需先判断三个问题：

1. 只服务一个路由且不可复用：留在 `pages/<route>`。
2. 属于明确业务能力：放在 `features/<domain>`。
3. 至少被两个业务域复用且不含业务语义：放在 `shared`。

不要预先创建 `application/data/domain/components/hooks/use-cases/adapters/models/services/stores` 全套目录。当前 feature 和 shared 均采用平铺结构；只有同类文件真实增长、存在多种实现或需要独立发布边界时再局部分层。完整依赖规则、组件化标准与迁移计划见 [ARCHITECTURE.md](./ARCHITECTURE.md)。

## 当前架构边界

- 应用入口、layout、全部路由页和自有组件均使用 Vue SFC。
- 页面使用 `definePageJson`，组件使用 `defineComponentJson`，应用配置使用 `defineAppJson`。
- 复杂页面逻辑允许下沉为同目录 composable，例如 `pages/kb/use-kb-page.ts`。
- 页面通过 account、schedule、report、calendar、notice、feedback 等小领域 Store 使用业务数据，不直接访问 Repository 或 Service。
- Store 使用 wevu 的 `defineStore/storeToRefs`，不引入 Pinia；Repository 仅作为 Store 内部的数据访问与持久化层。
- 持久化仅覆盖账户会话、课表快照、标签、考试、日历订阅与提醒、公告确认和反馈冷却时间；Loading、错误、弹窗和表单草稿不持久化。
- TDesign 仍是原生小程序组件，通过自动导入解析到 `/miniprogram_npm/tdesign-miniprogram`。
- 页面和自有组件不再新增原生 `App/Page/Component` 注册或 WXML/WXSS/JSON 四件套。

## TDesign 补丁

项目依赖定制的 Tabs 行为，补丁位于 `patches/tdesign-miniprogram@1.10.1.patch`，由 pnpm 安装自动应用。不要直接修改 `node_modules`；升级 TDesign 时必须重新验证 Tabs 中间插槽、多插槽和周选择布局。

## CI

`.github/workflows/quality.yml` 使用 pnpm 冻结锁文件安装，并运行 `pnpm check`。本地提交前执行同一命令即可复现质量门禁。
