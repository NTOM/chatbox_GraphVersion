# Quickstart: Modular Feature Migration

**Branch**: `20260308-modular-feature-migration`  
**Date**: 2026-03-16

---

## Prerequisites

- Git (用于分支操作和 cherry-pick)
- pnpm 10.x (包管理器)
- Node.js 20+ (运行时)
- VSCode 或其他 IDE

---

## Setup Steps

### 1. 同步上游代码

```bash
# 确保上游 remote 已配置
git remote -v
# 应该看到:
# origin    https://github.com/YOUR_USERNAME/chatbox.git
# upstream  https://github.com/chatboxai/chatbox.git

# 获取上游最新代码
git fetch upstream

# 确认本地 main 与 upstream/main 的差距
git rev-list --count main..upstream/main
# 预期: 121 (或更多)
```

### 2. 创建迁移工作分支

```bash
# 从 upstream/main 创建新的迁移分支
git checkout -b feature/gitline-v2 upstream/main

# 验证当前分支
git branch --show-current
# 预期: feature/gitline-v2
```

### 3. 添加依赖

```bash
# 添加 ReactFlow (xyflow)
pnpm add @xyflow/react@^12.10.0

# 验证安装
pnpm list @xyflow/react
```

### 4. 复制新增文件

从 GitTree-Function 分支复制所有新增的自定义文件：

```bash
# 方式 A: 使用 git checkout 从 GitTree-Function 复制文件
git checkout GitTree-Function -- src/renderer/components/conversation-tree/
git checkout GitTree-Function -- src/renderer/lib/conversation-tree-adapter.ts
git checkout GitTree-Function -- src/renderer/lib/tree-layout.ts
git checkout GitTree-Function -- src/renderer/stores/viewModeStore.ts
git checkout GitTree-Function -- src/renderer/stores/multiModelStore.ts
git checkout GitTree-Function -- src/renderer/components/MultiBranchIndicator.tsx
git checkout GitTree-Function -- src/renderer/components/MultiModelSelector/
git checkout GitTree-Function -- src/renderer/components/MultiModelToggle.tsx
```

### 5. 验证构建

```bash
# 安装依赖 (如果需要)
pnpm install

# TypeScript 类型检查
pnpm check

# Lint 检查
pnpm lint

# 构建
pnpm build
```

### 6. 适配集成点

需要手动修改的上游文件（参考 research.md）：

| 文件 | 修改内容 |
|------|---------|
| `src/renderer/components/layout/Toolbar.tsx` | 添加视图切换按钮 |
| `src/renderer/routes/session/$sessionId.tsx` | 条件渲染树形/列表视图 |
| `src/renderer/i18n/locales/en/translation.json` | 添加 `gitline.*` key |
| `src/renderer/i18n/locales/zh-Hans/translation.json` | 添加 `gitline.*` key |

**所有修改必须添加 `// [GitLine]` 标记！**

---

## Development

### 启动开发服务器

```bash
pnpm dev
```

应用将在 Electron 窗口中启动，默认端口 1212。

### 测试视图切换

1. 打开任意会话
2. 在顶部工具栏找到视图切换按钮
3. 点击切换到树形视图
4. 验证对话以树状结构显示

### 调试技巧

```typescript
// 在 ConversationTreeView.tsx 中添加调试日志
console.log('[GitLine Debug] nodes:', nodes)
console.log('[GitLine Debug] edges:', edges)
```

---

## File Checklist

迁移完成后，确保以下文件存在：

### 新增文件 (28 个)

- [ ] `src/renderer/components/conversation-tree/ConversationTreeView.tsx`
- [ ] `src/renderer/components/conversation-tree/MessageDetailDrawer.tsx`
- [ ] `src/renderer/components/conversation-tree/MessageDetailPanel.tsx`
- [ ] `src/renderer/components/conversation-tree/NodeActionBar.tsx`
- [ ] `src/renderer/components/conversation-tree/NodeCreatePopover.tsx`
- [ ] `src/renderer/components/conversation-tree/SelectionBoundingBox.tsx`
- [ ] `src/renderer/components/conversation-tree/TargetNodeSelector.tsx`
- [ ] `src/renderer/components/conversation-tree/TextSelectionQuote.tsx`
- [ ] `src/renderer/components/conversation-tree/TreeToolbar.tsx`
- [ ] `src/renderer/components/conversation-tree/ViewModeSwitch.tsx`
- [ ] `src/renderer/components/conversation-tree/index.ts`
- [ ] `src/renderer/components/conversation-tree/edges/ActivePathEdge.tsx`
- [ ] `src/renderer/components/conversation-tree/edges/BranchEdge.tsx`
- [ ] `src/renderer/components/conversation-tree/edges/DefaultEdge.tsx`
- [ ] `src/renderer/components/conversation-tree/edges/index.ts`
- [ ] `src/renderer/components/conversation-tree/nodes/AssistantNode.tsx`
- [ ] `src/renderer/components/conversation-tree/nodes/SystemNode.tsx`
- [ ] `src/renderer/components/conversation-tree/nodes/UserNode.tsx`
- [ ] `src/renderer/components/conversation-tree/nodes/index.ts`
- [ ] `src/renderer/components/conversation-tree/utils/branchColors.ts`
- [ ] `src/renderer/components/conversation-tree/utils/index.ts`
- [ ] `src/renderer/lib/conversation-tree-adapter.ts`
- [ ] `src/renderer/lib/tree-layout.ts`
- [ ] `src/renderer/stores/viewModeStore.ts`
- [ ] `src/renderer/stores/multiModelStore.ts`
- [ ] `src/renderer/components/MultiBranchIndicator.tsx`
- [ ] `src/renderer/components/MultiModelSelector/index.tsx`
- [ ] `src/renderer/components/MultiModelToggle.tsx`

### 修改的上游文件 (需要 `// [GitLine]` 标记)

- [ ] `src/renderer/components/layout/Toolbar.tsx`
- [ ] `src/renderer/routes/session/$sessionId.tsx`
- [ ] `src/renderer/i18n/locales/en/translation.json`
- [ ] `src/renderer/i18n/locales/zh-Hans/translation.json`
- [ ] `package.json` (新增 @xyflow/react 依赖)

---

## Verification

### 功能验证

```bash
# 启动应用
pnpm dev

# 测试项:
# 1. 视图切换按钮可见且可点击
# 2. 树形视图正确渲染节点和边
# 3. 点击节点显示详情面板
# 4. 分支使用不同颜色区分
# 5. 活跃路径有高亮效果
```

### 代码质量验证

```bash
# 类型检查
pnpm check
# 预期: 无错误

# Lint 检查
pnpm lint
# 预期: 无新增错误

# 构建
pnpm build
# 预期: 构建成功
```

### 标记完整性验证

```bash
# 搜索 [GitLine] 标记
grep -r "\[GitLine\]" src/renderer/ --include="*.tsx" --include="*.ts"

# 预期: 所有修改的上游文件都有标记
```

---

## Troubleshooting

### 问题: TypeScript 类型错误

**原因**: 上游类型定义可能已更改

**解决**:
1. 检查 `@shared/types` 中的 Session/Message 定义
2. 更新 adapter 和组件中的类型引用
3. 使用 TypeScript 的 `Partial` 或 `Omit` 处理可选字段

### 问题: 样式不生效

**原因**: @xyflow/react 样式未导入

**解决**:
```typescript
// 在 ConversationTreeView.tsx 顶部添加
import '@xyflow/react/dist/style.css'
```

### 问题: 分支操作不工作

**原因**: 上游 API 变更

**解决**:
1. 检查 `stores/session/forks.ts` 的函数签名
2. 更新 adapter 中的调用方式
3. 确认 Session 结构中 `threads` 字段存在

---

## Next Steps

1. 运行 `/speckit.tasks` 生成详细任务列表
2. 按任务逐步实施迁移
3. 每完成一个模块，更新 `migration-log.md`
