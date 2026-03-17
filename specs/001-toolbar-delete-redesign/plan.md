# Implementation Plan: 树视图工具栏删除功能重构

**Branch**: `20260308-modular-feature-migration` | **Date**: 2026-03-17 | **Spec**: [spec.md](./spec.md)  
**Input**: Feature specification from `specs/001-toolbar-delete-redesign/spec.md`

---

## Summary

重构树视图（ConversationTreeView）的工具栏删除功能，解决经过六轮补丁式修复后积累的架构债务。核心变更：

1. 将工具栏 DOM 移出 ReactFlow 容器，从根本上消除事件冲突
2. 统一所有删除入口（工具栏/悬浮/键盘/详情面板）使用 `removeTreeMessage` 作为唯一底层删除函数
3. 重构批量删除为单事务操作，从 N 次 store 更新降为 1 次
4. 消除闭包 Ref workaround、事件拦截补丁、混用按钮组件等冗余代码
5. 移除无法工作的撤销功能（YAGNI）

## Technical Context

**Language/Version**: TypeScript 5.x  
**Primary Dependencies**: React 18, @xyflow/react 12.x (ReactFlow), Mantine v7, Zustand, Electron  
**Storage**: Zustand store (in-memory) + electron safeStorage (persistence)  
**Testing**: Vitest (unit), 手动验收测试 (docs/gitline-acceptance-checklist.md 4.3.1-4.3.6)  
**Target Platform**: Electron 桌面应用 (Windows/macOS/Linux)  
**Project Type**: Desktop application (Electron + React)  
**Performance Goals**: 批量删除 10 节点 < 2 秒（含视图刷新）  
**Constraints**: 不修改上游文件，所有 GitLine 修改使用 `// [GitLine]` 标记  
**Scale/Scope**: 7 个主要修改文件，预计净减少 50-80 行代码

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Pre-Research | Post-Design | Notes |
|-----------|:----------:|:-----------:|-------|
| I. Fork Isolation | ✅ | ✅ | 在功能分支上工作，不触碰 main/upstream |
| II. Upstream Sync | ✅ | ✅ | 不修改上游 `removeMessage`，GitLine 组件统一用自有的 `removeTreeMessage` |
| III. Feature Modularity | ✅ | ✅ | 所有变更在 `conversation-tree/` 和 `conversation-tree-adapter.ts` 内，保持 `// [GitLine]` 标记 |
| IV. Tech Stack | ✅ | ✅ | 保持 React + Mantine + Zustand + ReactFlow，不引入新依赖 |
| V. Code Quality (YAGNI) | ✅ | ✅ | 移除撤销功能死代码、减少冗余辅助函数 |
| VI. Data Privacy | ✅ | ✅ | 不涉及用户数据或 API 密钥 |

**Result**: ALL GATES PASS ✅

## Project Structure

### Documentation (this feature)

```text
specs/001-toolbar-delete-redesign/
├── spec.md              # Feature specification
├── plan.md              # This file
├── research.md          # Phase 0: Technical research & decisions
├── data-model.md        # Phase 1: Data model documentation
├── quickstart.md        # Phase 1: Quick start guide
├── contracts/
│   └── internal-api.md  # Phase 1: Internal interface contracts
├── checklists/
│   └── requirements.md  # Spec quality checklist
└── tasks.md             # Phase 2 output (created by /speckit.tasks)
```

### Source Code (repository root)

```text
src/renderer/
├── components/conversation-tree/
│   ├── ConversationTreeView.tsx  ← 主要重构：工具栏位置、删除逻辑、移除 Ref
│   ├── TreeToolbar.tsx           ← 重构：统一按钮组件、移除撤销、简化事件
│   ├── NodeActionBar.tsx         ← 小改：removeMessage → removeTreeMessage
│   ├── MessageDetailPanel.tsx    ← 小改：removeMessage → removeTreeMessage
│   ├── MessageDetailDrawer.tsx   ← 小改：removeMessage → removeTreeMessage
│   ├── nodes/
│   │   ├── UserNode.tsx          ← 无改动（已使用 removeTreeMessage）
│   │   ├── AssistantNode.tsx     ← 无改动（已使用 removeTreeMessage）
│   │   └── SystemNode.tsx        ← 无改动（无删除功能）
│   └── ...
├── lib/
│   └── conversation-tree-adapter.ts  ← 重构：removeTreeMessages 单事务化
└── stores/
    └── viewModeStore.ts              ← 清理：移除撤销相关代码
```

**Structure Decision**: 本次重构不改变目录结构，只修改现有文件内容。所有变更文件已在上游迁移时创建，仅需原地重构。

## Complexity Tracking

> No constitution violations. This section is empty.

## Research Findings Summary

详见 [research.md](./research.md)，7 个核心决策：

| # | 决策 | 影响 |
|---|------|------|
| R1 | 工具栏移出 ReactFlow 容器 | 根本解决事件冲突，消除 onPointerDown/stopPropagation hack |
| R2 | 统一 removeTreeMessage | 消除 removeMessage/removeTreeMessage 双轨并存 |
| R3 | 局部变量快照 | 消除 3 个 useRef workaround |
| R4 | 统一 Mantine ActionIcon | 消除 ActionIcon/原生 button 混用 |
| R5 | 移除撤销功能 | 消除 ~40 行死代码，符合 YAGNI |
| R6 | 批量删除单事务化 | N 次 store 更新 → 1 次 |
| R7 | useRef 防重复触发 | 保护异步删除流程 |

## Implementation Phases

> Phase 2 task breakdown 由 `/speckit.tasks` 命令生成

### Phase A — 底层统一（P1 优先级，FR-001/FR-005/FR-006）

**目标**：统一删除底层逻辑，确保所有入口共享同一函数

1. **重构 `removeTreeMessages` 为单事务**（R6）
   - 从 `removeTreeMessage` 中提取 `removeMessageFromSession` 纯函数
   - `removeTreeMessages` 在单次 `updateSessionWithMessages` 中循环调用 `removeMessageFromSession`
   - 文件：`conversation-tree-adapter.ts`

2. **统一 NodeActionBar/MessageDetailPanel/MessageDetailDrawer 的删除函数**（R2）
   - 将 `removeMessage` 导入替换为 `removeTreeMessage`
   - 文件：`NodeActionBar.tsx`、`MessageDetailPanel.tsx`、`MessageDetailDrawer.tsx`

### Phase B — 工具栏重构（P1 优先级，FR-002/FR-004/FR-007/FR-008/FR-010）

**目标**：重构工具栏组件和容器布局

3. **工具栏 DOM 移出 ReactFlow**（R1）
   - `ConversationTreeView.tsx` 中将 `<TreeToolbar>` 从 ReactFlow 容器内移到外部（flex 兄弟元素）
   - 移除工具栏的 `onPointerDown`/`onMouseDown` stopPropagation
   - 文件：`ConversationTreeView.tsx`

4. **重构 TreeToolbar 组件**（R4/R5）
   - 所有按钮统一为 `Mantine ActionIcon`
   - 移除 `createPressHandler`、`stopToolbarClick`
   - 所有按钮恢复使用标准 `onClick`
   - 移除撤销按钮和 `canUndo`/`onUndo` props
   - 文件：`TreeToolbar.tsx`

5. **消除闭包 Ref workaround**（R3）
   - 删除 `selectedNodeIdRef`、`selectedNodeIdsRef`、`interactionModeRef`
   - `handleDeleteSelected` 使用 `useViewModeStore.getState()` 同步读取最新状态
   - 文件：`ConversationTreeView.tsx`

6. **添加防重复触发保护**（R7）
   - 新增 `deletingRef = useRef(false)` 标记
   - 在 `handleDeleteSelected` 入口检查，执行完毕后重置
   - 文件：`ConversationTreeView.tsx`

### Phase C — 清理与验证（P3 优先级，FR-009）

**目标**：清理死代码，验证构建和功能

7. **清理 viewModeStore 撤销代码**（R5）
   - 移除 `treeUndoState`、`saveTreeUndoState`、`getTreeUndoState`、`clearTreeUndoState`、`canUndoForSession`
   - 文件：`viewModeStore.ts`

8. **清理 ConversationTreeView 中的撤销引用**
   - 移除 `handleUndo`、`saveTreeUndoState` 导入和使用
   - 从 `<TreeToolbar>` props 中移除 `onUndo`/`canUndo`
   - 文件：`ConversationTreeView.tsx`

9. **构建验证 + 手动测试**
   - `pnpm build` 零 TypeScript 错误
   - `pnpm dev` 功能验证
   - 验收清单 4.3.1-4.3.6 全部通过

## Risk Analysis

| 风险 | 可能性 | 影响 | 缓解措施 |
|------|--------|------|----------|
| 工具栏移出 ReactFlow 后布局变化 | 中 | 低 | 使用 flex 布局保持视觉不变 |
| 单事务批量删除中某条失败 | 低 | 中 | try/catch 包裹每条删除，失败的跳过，最终仍保存 |
| removeTreeMessage 在 NodeActionBar 等处行为差异 | 低 | 中 | 单元测试覆盖 removeTreeMessage 的搜索逻辑 |
| 移除撤销功能后用户误删 | 低 | 中 | 确认对话框已提供保护，且悬浮删除有 3 秒超时 |

## Dependencies

- 无新外部依赖
- 依赖上游 `chatStore.updateSessionWithMessages` API（已验证稳定可用）
- 依赖 Mantine v7 `ActionIcon` 和 `modals.openConfirmModal`（已在项目中广泛使用）
