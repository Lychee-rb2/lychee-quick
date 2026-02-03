# 单元测试待办清单

## 已完成测试

| 文件 | 函数 | 覆盖率 |
|------|------|--------|
| `help/format.ts` | `iconMap()` | 100% |
| `help/index.ts` | `typedBoolean()` | 100% |
| `help/linear.ts` | `buildCommentBody()` | 80% |

---

## 待测试 - 纯函数（优先级高）

这些函数是纯函数，不依赖外部系统，可以直接测试。

### `help/mihomo.ts`

- [ ] `findProxyChain(current, proxies)` - 递归查找代理链
- [ ] `getProxyDelay(proxy)` - 获取代理延迟
- [ ] `delayLevel(delay)` - 根据延迟返回级别图标 key
- [ ] `choices(proxies)` - 生成选择列表
- [ ] `getChildren(proxy, proxies)` - 获取子代理列表

---

## 待测试 - 需要 Mock（优先级中）

这些函数依赖外部系统，需要使用 `bun:test` 的 mock 功能。

### `help/git.ts`

- [ ] `findNextBranch(branch, version)` - 需要 mock `cli()` 函数

### `help/logger.ts`

- [ ] `createLogger()` - 需要 mock `pino`

### `help/redis.ts`

- [ ] `upstashCache(url, token, fetch)` - 需要 mock redis client
  - `get(key, cacheTime, force)`
  - `remove(key)`

### `help/linear.ts`

- [ ] `sendPreview(issue, attachment)` - 需要 mock Linear client 和 inquirer
- [ ] `releaseIssues(items)` - 需要 mock `pbcopy` 和 `logger`

### `help/io.ts`

- [ ] `cli(cmd)` - 需要 mock `Bun.spawnSync`
- [ ] `pbcopy(data)` - 需要 mock `Bun.spawn`
- [ ] `main(meta)` - 需要 mock 文件系统和命令行参数
- [ ] `expandAlias(alias)` - 需要 mock 文件系统

### `help/mihomo.ts`

- [ ] `findCurrentProxy()` - 需要 mock mihomo API
- [ ] `pickProxy(option)` - 需要 mock mihomo API 和 inquirer

---

## Mock 示例

```typescript
import { describe, expect, test, mock, spyOn } from "bun:test";

// Mock 模块
mock.module("@/fetch/mihomo", () => ({
  mihomo: mock(() => Promise.resolve({ proxies: {} })),
}));

// Spy 函数
const logSpy = spyOn(console, "log");
```

---

## 运行测试

```bash
bun test                    # 运行所有测试
bun test --coverage         # 带覆盖率报告
bun test --watch            # 监听模式
bun test test/help/mihomo   # 运行指定测试
```
