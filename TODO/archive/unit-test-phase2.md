# 单元测试待办清单 - Phase 2（已归档）

> **归档时间**: 2025-02-07
> **状态**: Phase 2 已基本完成，meta 模块测试已跳过（优先级低）

## 测试范围总览

| 模块 | 文件数 | 优先级 | 状态 |
| --- | --- | --- | --- |
| `fetch/` | 5 | 高 | ✅ 已完成 |
| `app/` handlers | 8 | 中 | ✅ 已完成 |
| `app/` meta | 12 | 低 | ⏭️ 已跳过 |
| `scripts/` | 6 | 中 | ✅ 已完成 |

**不需要测试的模块：**

- `bin.ts` - 入口文件，无独立逻辑
- `graphql/*/client.ts` - 自动生成的代码
- `types/*.ts` - 纯类型定义

**Phase 1 已完成模块：**

- ✅ `help/` - 所有工具函数已测试
- ✅ `i18n/` - 国际化模块已测试
- ✅ `prompts/` - 交互式提示函数已测试（linear, vercel, mihomo）

---

## Phase 2.1: fetch 模块 ✅

### ✅ `fetch/redis.ts`

- **导出**: `createRedisClient()`
- **测试点**:
  - 单例模式：多次调用返回同一实例
  - 正确调用 `new Redis()` 并传入参数
- **Mock**: `@upstash/redis`

### ✅ `fetch/mihomo.ts`

- **导出**: `mihomo<RES, T>()`
- **测试点**:
  - 成功响应处理
  - JSON 解析错误处理
  - HTTP 错误状态码处理（401、500 等）
  - 自定义 headers 和 body
- **Mock**: `globalThis.fetch`、环境变量

### ✅ `fetch/github.ts`

- **导出**: `createClient()`, `getPullRequestBranches()`
- **测试点**:
  - 单例模式创建 GraphQL 客户端
  - 环境变量验证（zod）
  - Redis 缓存集成
  - 强制刷新（`-f` 参数）
- **Mock**: `@/graphql/github/client`, `@/help/redis`, 环境变量

### ✅ `fetch/linear.ts`

- **导出**: `createClient()`, `getIssues()`
- **测试点**: 与 github.ts 类似
- **Mock**: `@/graphql/linear/client`, `@/help/redis`, 环境变量

### ✅ `fetch/vercel.ts`

- **导出**: `createVercelClient()`, `getProjects()`, `getDeployments()`
- **测试点**:
  - 单例模式
  - Redis 缓存
  - 数据转换（`pick`、`mapValues`）
- **Mock**: `@vercel/sdk`, `@/help/redis`, 环境变量

---

## Phase 2.2: app handlers ✅

### Clash 模块

#### ✅ `app/clash/board/handler.ts`

- **功能**: 打开 Mihomo 网页面板
- **复杂度**: 简单
- **Mock**: `@/help/mihomo`, `@/help/util`

#### ✅ `app/clash/check/handler.ts`

- **功能**: 检查当前代理节点的延迟
- **复杂度**: 中等
- **Mock**: `@/fetch/mihomo`, `@/help/mihomo`

#### ✅ `app/clash/toggle/handler.ts`

- **功能**: 切换 Clash 代理模式
- **复杂度**: 中等
- **Mock**: `@inquirer/prompts`, `@/fetch/mihomo`, `@/help/mihomo`

### Linear 模块

#### ✅ `app/linear/branch/handler.ts`

- **功能**: 从 Linear Issue 创建 Git 分支
- **复杂度**: 复杂
- **Mock**: `@inquirer/prompts`, `@/fetch/linear`, `@/help/cli`, `@/help/git`

#### ✅ `app/linear/preview/handler.ts`

- **功能**: 向 Linear Issue 发送预览链接评论
- **复杂度**: 中等
- **Mock**: `@inquirer/prompts`, `@/fetch/linear`, `@/help/linear`

#### ✅ `app/linear/release/handler.ts`

- **功能**: 批量发布 Linear Issue
- **复杂度**: 中等
- **Mock**: `@inquirer/prompts`, `@/fetch/linear`, `@/help/linear`, `@/help/util`

### Vercel 模块

#### ✅ `app/vercel/check/handler.ts`

- **功能**: 检查指定分支的 Vercel 部署状态
- **复杂度**: 中等
- **Mock**: `@inquirer/prompts`, `@/fetch/vercel`, `@/fetch/github`

#### ✅ `app/vercel/release/handler.ts`

- **功能**: 通过 Deploy Hook 触发 Vercel 部署
- **复杂度**: 复杂
- **Mock**: `@inquirer/prompts`, `@/fetch/vercel`, `@/help/util`

---

## Phase 2.3: app meta ⏭️ 已跳过

meta.ts 文件只导出 `completion` 和 `help` 常量，优先级低，已跳过。

---

## Phase 2.4: scripts ✅

### ✅ `scripts/postinstall.ts`

- **测试文件**: `postinstall.test.ts`, `installCli.test.ts`, `getCompletions.test.ts`, `installZshCompletion.test.ts`
- **测试点**:
  - `validateCommandName()` - 纯函数，验证命令名不含 `-`
  - `getCompletions()` - 目录扫描逻辑
  - `installCli()` - 符号链接创建
  - `installZshCompletion()` - 补全脚本生成
- **Mock**: 文件系统、`Bun.file()`、`Bun.write()`、`import()`

### ✅ `scripts/codegen.ts`

- **测试文件**: `codegen.test.ts`
- **测试点**:
  - 配置文件读取
  - `generate()` 调用参数验证
- **Mock**: `@graphql-codegen/cli`, 文件系统

### ✅ `scripts/buildGlobalEnv.ts`（计划外新增）

- **测试文件**: `buildGlobalEnv.test.ts`

---

## 最终测试文件结构

```
test/
├── help/           # ✅ Phase 1
├── i18n/           # ✅ Phase 1
├── prompts/        # ✅ Phase 1
│   ├── linear.test.ts
│   ├── vercel.test.ts
│   └── mihomo.test.ts
├── fetch/          # ✅ Phase 2.1
│   ├── redis.test.ts
│   ├── mihomo.test.ts
│   ├── github.test.ts
│   ├── linear.test.ts
│   └── vercel.test.ts
├── app/            # ✅ Phase 2.2
│   ├── clash/
│   │   ├── board.test.ts
│   │   ├── check.test.ts
│   │   └── toggle.test.ts
│   ├── linear/
│   │   ├── branch.test.ts
│   │   ├── preview.test.ts
│   │   └── release.test.ts
│   └── vercel/
│       ├── check.test.ts
│       └── release.test.ts
└── scripts/        # ✅ Phase 2.4
    ├── postinstall.test.ts
    ├── installCli.test.ts
    ├── getCompletions.test.ts
    ├── installZshCompletion.test.ts
    ├── buildGlobalEnv.test.ts
    └── codegen.test.ts
```

---

## 执行顺序（实际完成）

1. ✅ `fetch/redis.ts` - 最简单，作为起点
2. ✅ `fetch/mihomo.ts` - HTTP 请求封装
3. ✅ `fetch/github.ts` + ✅ `fetch/linear.ts` - 结构相似
4. ✅ `fetch/vercel.ts` - 完成 fetch 模块
5. ✅ `app/clash/` handlers - 相对简单
6. ✅ `app/linear/` handlers - 中等复杂度
7. ✅ `app/vercel/` handlers - 中等复杂度
8. ✅ `scripts/postinstall.ts` - 拆分为多个测试文件
9. ✅ `scripts/codegen.ts` + `scripts/buildGlobalEnv.ts`
10. ⏭️ `app/meta` - 优先级低，已跳过
