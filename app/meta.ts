export const completion = "个人开发工作流 CLI";
export const help = `Lychee Quick CLI - 个人开发工作流工具

一个使用 Bun 构建的 CLI 工具，集成 Linear、Vercel、GitHub 和 Mihomo 代理管理。

命令:
  clash   - Mihomo/Clash 代理管理
  linear  - Linear 项目管理
  vercel  - Vercel 部署管理

选项:
  -h, --help  显示帮助信息

示例:
  <cli> clash now        查看当前代理状态
  <cli> linear branch    从 Issue 创建分支
  <cli> vercel release   触发 Vercel 部署

运行 '<cli> <command> -h' 查看子命令帮助。`;
