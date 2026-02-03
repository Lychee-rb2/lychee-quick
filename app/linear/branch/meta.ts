export const completion = "从 Issue 创建分支";
export const help = `从 Issue 创建分支

从 Linear Issue 创建 Git 分支，自动拉取最新 main 分支。

选项:
  -f  强制刷新 Issue 缓存

功能:
  - 搜索和筛选 Issue (输入 M 筛选我的，N 筛选未分配的)
  - 按负责人分组显示
  - 自动生成分支名并处理重名
  - 执行 git checkout main && git pull && git checkout -b <branch>`;
