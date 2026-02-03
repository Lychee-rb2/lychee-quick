# Lychee Quick CLI

一个使用 Bun 构建的个人开发工作流 CLI 工具，集成 Linear、Vercel、GitHub 和 Mihomo 代理管理。

## 功能特性

- **Linear 集成** - 从 Linear issue 创建分支、发送预览评论、管理发布
- **Vercel 集成** - 检查部署状态、管理发布
- **Mihomo/Clash 代理** - 查看当前代理状态、切换代理、延迟测试
- **自定义命令名** - 通过环境变量自定义 CLI 命令名称

## 前置要求

- [Bun](https://bun.sh/) 运行时
- 确保 `~/.bun/bin` 在 PATH 中（Bun 安装时通常会自动配置）

## 安装

1. 克隆仓库并进入目录

2. 创建 `.env` 文件并配置环境变量：

```bash
cp .env.example .env  # 如果有示例文件
# 或手动创建
```

1. 配置 CLI 命令名称（必需）：

```dotenv
# .env
CLI_NAME="your-cli-name"
```

1. 安装依赖（会自动创建命令链接）：

```bash
bun install
```

安装完成后，可以使用自定义的命令名调用 CLI：

```bash
your-cli-name linear branch
```

## 环境变量配置

| 变量名 | 说明 | 必需 |
|--------|------|------|
| `CLI_NAME` | 自定义 CLI 命令名称 | ✅ |
| `LINEAR_API_KEY` | Linear API 密钥 | Linear 功能需要 |
| `LINEAR_TEAM` | Linear 团队标识 | Linear 功能需要 |
| `VERCEL_PERSONAL_TOKEN` | Vercel 个人令牌 | Vercel 功能需要 |
| `VERCEL_TEAM` | Vercel 团队名称 | Vercel 功能需要 |
| `VERCEL_PROJECT` | Vercel 项目名称 | Vercel 功能需要 |
| `GIT_TOKEN` | GitHub 访问令牌 | GitHub 功能需要 |
| `GIT_ORGANIZATION` | GitHub 组织名称 | GitHub 功能需要 |
| `GIT_REPO` | GitHub 仓库名称 | GitHub 功能需要 |
| `MIHOMO_URL` | Mihomo API 地址 | 代理功能需要 |
| `MIHOMO_TOKEN` | Mihomo API 令牌 | 代理功能需要 |
| `REDIS_URL` | Upstash Redis URL | 缓存功能需要 |
| `REDIS_TOKEN` | Upstash Redis 令牌 | 缓存功能需要 |

## 可用命令

### Linear

```bash
# 从 Linear issue 创建新分支
<cli> linear branch

# 发送预览链接评论到 Linear issue
<cli> linear preview

# 发布相关操作
<cli> linear release
```

### Vercel

```bash
# 检查分支部署状态
<cli> vercel check

# 发布相关操作
<cli> vercel release
```

### Clash/Mihomo 代理

```bash
# 查看当前代理状态，可切换代理
<cli> clash now

# 切换代理
<cli> clash toggle

# 延迟测试
<cli> clash delay
```

## 开发

```bash
# 安装依赖
bun install

# 生成 GraphQL 类型
bun run codegen
```

## 项目结构

```
├── app/                 # CLI 命令实现
│   ├── clash/          # Mihomo 代理命令
│   ├── linear/         # Linear 相关命令
│   └── vercel/         # Vercel 相关命令
├── fetch/              # API 请求封装
├── graphql/            # GraphQL schema 和查询
├── help/               # 工具函数
├── types/              # TypeScript 类型定义
├── scripts/            # 构建脚本
└── bin.ts              # CLI 入口
```

## License

[MIT](LICENSE)
