# 单元测试待办清单

## 已完成测试

| 文件                    | 函数              | 覆盖率 |
| ----------------------- | ----------------- | ------ |
| `help/format.ts` | `iconMap()` | 100% |
| `help/index.ts` | `typedBoolean()` | 100% |
| `help/linear.ts` | `buildCommentBody()` | 80% |
| `help/mihomo.ts` | `findProxyChain()` | 100% |
| `help/mihomo.ts` | `findCurrentProxy()` | 100% |
| `help/mihomo.ts` | `pickProxy()` | 100% |
| `help/mihomo.ts` | `getDelay()` | 100% |
| `help/mihomo-select.ts` | `getProxyDelay()` | 100% |
| `help/mihomo-select.ts` | `delayLevel()` | 100% |
| `help/mihomo-select.ts` | `choices()` | 100% |
| `help/mihomo-select.ts` | `getChildren()` | 100% |
| `help/mihomo-select.ts` | `searchProxy()` | 100% |

---

## 待测试 - 纯函数（优先级高）

这些函数是纯函数，不依赖外部系统，可以直接测试。

（暂无）

---

## 待测试 - 需要 Mock（优先级中）

这些函数依赖外部系统，需要使用 `vitest` 的 mock 功能。

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

---

## Mock 示例

```typescript
import { describe, expect, test, vi } from "vitest";

// Mock 模块（必须在导入之前调用）
vi.mock("@/fetch/mihomo", () => ({
  mihomo: vi.fn(),
}));

// 导入 mock 模块
import { mihomo } from "@/fetch/mihomo";

// 在测试中使用 vi.mocked() 进行类型安全的访问
const mihomoMock = vi.mocked(mihomo);
mihomoMock.mockResolvedValue({ proxies: {} });
```

---

## 运行测试

```bash
bun test                    # 运行所有测试（带覆盖率）
bun test:watch              # 监听模式
bun test:ui                 # UI 模式
vitest test/help/mihomo     # 运行指定测试文件
```
