# Quickstart: 树视图工具栏删除功能重构

**Date**: 2026-03-17  
**Feature**: `001-toolbar-delete-redesign`

---

## 前提条件

- Node.js 18+
- pnpm 10.x
- 当前分支：`20260308-modular-feature-migration`

## 环境启动

```bash
# 安装依赖
pnpm install

# 开发模式（Electron + Vite HMR）
pnpm dev

# 生产构建（验证 TypeScript 无错误）
pnpm build
```

## 涉及文件清单

### 主要修改文件

| 文件 | 修改内容 |
|------|----------|
| `src/renderer/components/conversation-tree/TreeToolbar.tsx` | 统一按钮组件、移除事件 hack、移除撤销按钮 |
| `src/renderer/components/conversation-tree/ConversationTreeView.tsx` | 移除 Ref workaround、工具栏移出 ReactFlow、重构 handleDeleteSelected |
| `src/renderer/lib/conversation-tree-adapter.ts` | 重构 removeTreeMessages 为单事务批量删除 |
| `src/renderer/stores/viewModeStore.ts` | 移除撤销相关状态和 actions |

### 需要统一删除函数的文件

| 文件 | 当前用 `removeMessage` | 改为 `removeTreeMessage` |
|------|----------------------|------------------------|
| `src/renderer/components/conversation-tree/NodeActionBar.tsx` | ✅ | → 改为 removeTreeMessage |
| `src/renderer/components/conversation-tree/MessageDetailPanel.tsx` | ✅ | → 改为 removeTreeMessage |
| `src/renderer/components/conversation-tree/MessageDetailDrawer.tsx` | ✅ | → 改为 removeTreeMessage |

### 不需修改的文件

| 文件 | 原因 |
|------|------|
| `nodes/UserNode.tsx` | 已使用 removeTreeMessage，无需改动 |
| `nodes/AssistantNode.tsx` | 已使用 removeTreeMessage，无需改动 |
| `nodes/SystemNode.tsx` | 无删除功能，无需改动 |

## 验证清单

重构完成后，运行以下验证：

```bash
# 1. TypeScript 编译无错误
pnpm build

# 2. 启动开发模式
pnpm dev
```

然后按照 `docs/gitline-acceptance-checklist.md` 中 4.3.1-4.3.6 执行手动测试：

- [ ] 4.3.1 悬浮删除 - 活跃路径节点
- [ ] 4.3.2 悬浮删除 - 非活跃分支节点
- [ ] 4.3.3 删除确认态 3 秒超时重置
- [ ] 4.3.4 工具栏删除 - 单击模式
- [ ] 4.3.5 工具栏删除 - 框选模式
- [ ] 4.3.6 键盘 Delete/Backspace 删除

## 关键设计决策

详见 `specs/001-toolbar-delete-redesign/research.md`：

1. **R1**: 工具栏移出 ReactFlow 容器（解决事件冲突）
2. **R2**: 统一使用 removeTreeMessage（消除两套删除链路）
3. **R3**: 局部变量快照替代 Ref（消除闭包 workaround）
4. **R4**: 统一使用 Mantine ActionIcon（按钮一致性）
5. **R5**: 移除撤销功能（YAGNI）
6. **R6**: 批量删除单事务化（性能优化）
7. **R7**: useRef 防重复触发（防抖保护）
