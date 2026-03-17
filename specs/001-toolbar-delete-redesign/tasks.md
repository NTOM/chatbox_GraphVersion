# Tasks: 树视图工具栏删除功能重构

**Input**: Design documents from `/specs/001-toolbar-delete-redesign/`
**Prerequisites**: plan.md ✅, spec.md ✅, research.md ✅, data-model.md ✅, contracts/ ✅, quickstart.md ✅

**Tests**: 未在 spec 中明确要求自动化测试，仅包含手动验收测试任务。

**Organization**: 任务按 User Story 分组。由于本次是**重构**（不是新建项目），Phase 1 Setup 和 Phase 2 Foundational 合并为底层基础重构，User Story 按优先级 P1→P2→P3 排列。

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US5)
- Include exact file paths in descriptions

---

## Phase 1: Foundational — 底层删除逻辑统一 (Blocking)

**Purpose**: 统一所有删除入口的底层函数，为后续 User Story 提供一致的基础设施

**⚠️ CRITICAL**: 所有 User Story 依赖本阶段完成

- [X] T001 重构 `removeTreeMessages` 为单事务批量删除：从 `removeTreeMessage` 中提取 `removeMessageFromSession` 纯函数，在单次 `chatStore.updateSessionWithMessages` 调用中循环处理所有待删除 ID，替换当前的串行逐条调用 — `src/renderer/lib/conversation-tree-adapter.ts` (第468-595行)
- [X] T002 [P] 将 NodeActionBar 的删除函数从 `removeMessage` 改为 `removeTreeMessage`：修改 import（第26行）和 handleDelete 调用（第89行） — `src/renderer/components/conversation-tree/NodeActionBar.tsx`
- [X] T003 [P] 将 MessageDetailPanel 的删除函数从 `removeMessage` 改为 `removeTreeMessage`：修改 import（第35行）和 handleDelete 调用（第187行） — `src/renderer/components/conversation-tree/MessageDetailPanel.tsx`
- [X] T004 [P] 将 MessageDetailDrawer 的删除函数从 `removeMessage` 改为 `removeTreeMessage`：修改 import（第33行）和 handleDelete 调用（第113行） — `src/renderer/components/conversation-tree/MessageDetailDrawer.tsx`

**Checkpoint**: 所有删除入口统一使用 `removeTreeMessage`，批量删除为单事务。可通过悬浮删除和详情面板删除非活跃分支节点来验证。

---

## Phase 2: User Story 5 — 删除架构统一 (Priority: P1) 🎯 MVP

**Goal**: 消除闭包 Ref workaround，统一选中状态读取方式，添加防重复触发保护。这是架构层面的统一，为 US1/US2 提供正确可靠的 `handleDeleteSelected` 函数。

**Independent Test**: 在 ConversationTreeView 中调用 `handleDeleteSelected`，验证不再依赖 Ref 读取选中状态，而是通过 `useViewModeStore.getState()` 同步读取最新值。

### Implementation for US5

- [ ] T005 [US5] 消除 3 个闭包 Ref workaround：删除 `selectedNodeIdRef`（第415行）、`selectedNodeIdsRef`（第416行）、`interactionModeRef`（第417行）及其所有同步赋值语句，改用 `useViewModeStore.getState()` 在 `handleDeleteSelected` 入口处同步读取最新选中状态 — `src/renderer/components/conversation-tree/ConversationTreeView.tsx`
- [ ] T006 [US5] 重构 `handleDeleteSelected` 函数（第422-467行）：使用局部变量快照捕获 `idsToDelete`，移除 `saveTreeUndoState` 调用和撤销快照逻辑，添加 `deletingRef = useRef(false)` 防重复触发保护（入口检查 + 完成后重置） — `src/renderer/components/conversation-tree/ConversationTreeView.tsx`

**Checkpoint**: `handleDeleteSelected` 无 Ref workaround、无撤销逻辑、有防重复保护。可在 click 模式下选中节点后调用删除验证。

---

## Phase 3: User Story 1 — 工具栏单击模式删除 (Priority: P1)

**Goal**: 将工具栏 DOM 移出 ReactFlow 容器，使删除按钮的 `onClick` 事件不再被画布事件系统吞噬，实现可靠的单击删除。

**Independent Test**: 在树视图中点击任意节点使其选中，点击工具栏删除按钮，确认后节点被移除。

### Implementation for US1

- [ ] T007 [US1] 将 `<TreeToolbar>` 从 ReactFlow 容器内（当前在 `<ReactFlow>` 闭合标签之后、但仍在同一 flex 容器中）移到 ReactFlow 容器外部：调整外层 flex 布局，确保 TreeToolbar 作为 ReactFlow 容器的 DOM 兄弟元素渲染，而非子元素 — `src/renderer/components/conversation-tree/ConversationTreeView.tsx` (第645-761行)
- [ ] T008 [US1] 移除工具栏中所有 `onPointerDown`/`onMouseDown` 的 `stopPropagation` 事件拦截代码，移除 `createPressHandler` 和 `stopToolbarClick` 辅助函数 — `src/renderer/components/conversation-tree/TreeToolbar.tsx`

**Checkpoint**: 工具栏在 ReactFlow 外部渲染，单击模式删除按钮可正常触发确认弹窗并执行删除。验收清单 4.3.4 通过。

---

## Phase 4: User Story 2 — 工具栏框选模式批量删除 (Priority: P1)

**Goal**: 框选多个节点后通过工具栏删除按钮一次性批量移除，使用 Phase 1 中重构的单事务 `removeTreeMessages`。

**Independent Test**: 切换到框选模式，拖拽框选 2-3 个节点，点击工具栏删除按钮，确认后节点全部移除。

### Implementation for US2

- [ ] T009 [US2] 验证并确保 `handleDeleteSelected` 在 select 模式下正确读取 `selectedNodeIds`（通过 `getState()`），按 depth 降序排列后调用 `removeTreeMessages`，删除完成后调用 `clearSelection()` — `src/renderer/components/conversation-tree/ConversationTreeView.tsx`

**Checkpoint**: 框选模式批量删除正常工作，确认弹窗显示正确的节点数量，删除后选中状态清空。验收清单 4.3.5 通过。

---

## Phase 5: User Story 3 — 悬浮节点快捷删除 (Priority: P2)

**Goal**: 确保悬浮删除与工具栏删除共享同一底层 `removeTreeMessage`，保持二次点击确认 UX。

**Independent Test**: 悬浮在任意节点上，点击红色垃圾桶图标进入确认态，再次点击完成删除。

### Implementation for US3

- [ ] T010 [US3] 验证 NodeActionBar（T002 中已改为 removeTreeMessage）的悬浮删除在活跃路径和非活跃分支上均正常工作，确认态 3 秒超时重置逻辑不受影响 — `src/renderer/components/conversation-tree/NodeActionBar.tsx`

**Checkpoint**: 悬浮删除使用 `removeTreeMessage`，活跃/非活跃分支节点均可删除。验收清单 4.3.1、4.3.2、4.3.3 通过。

---

## Phase 6: User Story 4 — 键盘快捷键删除 (Priority: P2)

**Goal**: Delete/Backspace 键触发与工具栏相同的 `handleDeleteSelected` 逻辑。

**Independent Test**: 选中节点后按 Delete 键，确认对话框出现，确认后节点被删除。

### Implementation for US4

- [ ] T011 [US4] 验证键盘 Delete/Backspace 事件处理器调用的是重构后的 `handleDeleteSelected`（无 Ref、有防重复保护），确保焦点在输入框时不触发节点删除 — `src/renderer/components/conversation-tree/ConversationTreeView.tsx`

**Checkpoint**: 键盘删除触发确认弹窗，行为与工具栏删除一致。验收清单 4.3.6 通过。

---

## Phase 7: User Story 6 — 工具栏按钮一致性 (Priority: P3)

**Goal**: 工具栏中所有按钮统一使用 Mantine `ActionIcon`，消除混用原生 `<button>` 的问题。

**Independent Test**: 查看工具栏所有按钮，确认外观风格一致、hover/disabled 状态表现一致。

### Implementation for US6

- [ ] T012 [US6] 将 TreeToolbar 中所有原生 `<button>` 替换为 Mantine `ActionIcon`，统一 variant、size、color 属性，确保 `disabled` 属性正确控制禁用态视觉反馈 — `src/renderer/components/conversation-tree/TreeToolbar.tsx`

**Checkpoint**: 所有工具栏按钮外观风格一致。

---

## Phase 8: Polish & 清理验证

**Purpose**: 清理死代码，构建验证，手动验收

- [X] T013 清理 viewModeStore 中所有撤销相关代码：移除 `TreeUndoState` 接口（第28行）、`treeUndoState` 状态字段（第59行、第118行）、`saveTreeUndoState`（第100行、第232-234行）、`getTreeUndoState`（第102行、第236-238行）、`clearTreeUndoState`（第104行、第240-242行）、`canUndoForSession`（第106行、第244-247行） — `src/renderer/stores/viewModeStore.ts`
- [X] T014 清理 ConversationTreeView 中的撤销引用：移除 `handleUndo` 函数、`saveTreeUndoState`/`getTreeUndoState` 导入和使用，从 `<TreeToolbar>` props 中移除 `onUndo` 和 `canUndo` — `src/renderer/components/conversation-tree/ConversationTreeView.tsx`
- [X] T015 从 TreeToolbar props 接口和组件中移除 `onUndo`、`canUndo` 属性，移除撤销按钮 JSX — `src/renderer/components/conversation-tree/TreeToolbar.tsx`
- [X] T016 运行 `pnpm build` 确认零 TypeScript 错误，运行 `pnpm dev` 确认应用正常启动
- [ ] T017 执行手动验收测试清单 `docs/gitline-acceptance-checklist.md` 中 4.3.1-4.3.6 全部通过

---

## Dependencies & Execution Order

### Phase Dependencies

```
Phase 1 (Foundational)
  ├── T001: removeTreeMessages 单事务化
  ├── T002 [P]: NodeActionBar → removeTreeMessage
  ├── T003 [P]: MessageDetailPanel → removeTreeMessage
  └── T004 [P]: MessageDetailDrawer → removeTreeMessage
      ↓
Phase 2 (US5: 架构统一) ← 依赖 Phase 1
  ├── T005: 消除 Ref workaround
  └── T006: 重构 handleDeleteSelected ← 依赖 T005
      ↓
Phase 3 (US1: 单击删除) ← 依赖 Phase 2
  ├── T007: 工具栏移出 ReactFlow
  └── T008: 移除事件拦截代码 ← 依赖 T007
      ↓
Phase 4 (US2: 批量删除) ← 依赖 Phase 2 + Phase 3
  └── T009: 验证 select 模式批量删除
      ↓
Phase 5 (US3: 悬浮删除) ← 依赖 Phase 1 (T002)
  └── T010: 验证悬浮删除
      ↓ (可与 Phase 3/4 并行)
Phase 6 (US4: 键盘删除) ← 依赖 Phase 2
  └── T011: 验证键盘删除
      ↓ (可与 Phase 3/4/5 并行)
Phase 7 (US6: 按钮一致性) ← 依赖 Phase 3 (T008)
  └── T012: 统一 ActionIcon
      ↓
Phase 8 (Polish) ← 依赖所有 Phase
  ├── T013: 清理 viewModeStore 撤销代码
  ├── T014: 清理 ConversationTreeView 撤销引用 ← 依赖 T013
  ├── T015: 清理 TreeToolbar 撤销代码 ← 依赖 T014
  ├── T016: 构建验证 ← 依赖 T013-T015
  └── T017: 手动验收 ← 依赖 T016
```

### User Story Dependencies

- **US5 (架构统一, P1)**: 依赖 Phase 1 完成 — 是其他 US 的核心前提
- **US1 (单击删除, P1)**: 依赖 US5 — 需要重构后的 handleDeleteSelected
- **US2 (批量删除, P1)**: 依赖 US5 + US1 — 需要工具栏已移出 ReactFlow
- **US3 (悬浮删除, P2)**: 仅依赖 Phase 1 T002 — 可与 US1/US2 并行
- **US4 (键盘删除, P2)**: 依赖 US5 — 可与 US1/US3 并行
- **US6 (按钮一致性, P3)**: 依赖 US1 (T008) — 在事件拦截移除后才能安全统一按钮

### Parallel Opportunities

```
Phase 1 并行:
  T001 → T002, T003, T004 (T002/T003/T004 彼此独立，可同时进行)

Phase 2 后可并行的 User Story:
  US1 (Phase 3) ─┐
  US3 (Phase 5) ─┼── 可并行
  US4 (Phase 6) ─┘

Phase 3 后:
  US2 (Phase 4) ─┐
  US6 (Phase 7) ─┼── 可并行
```

---

## Parallel Example: Phase 1

```bash
# 先完成底层重构（阻塞）:
Task T001: "重构 removeTreeMessages 为单事务 — conversation-tree-adapter.ts"

# 然后并行处理三个文件:
Task T002: "NodeActionBar — removeMessage → removeTreeMessage"
Task T003: "MessageDetailPanel — removeMessage → removeTreeMessage"
Task T004: "MessageDetailDrawer — removeMessage → removeTreeMessage"
```

---

## Implementation Strategy

### MVP First (US5 + US1)

1. Complete Phase 1: 底层统一（4 tasks）
2. Complete Phase 2: US5 架构统一（2 tasks）
3. Complete Phase 3: US1 单击删除（2 tasks）
4. **STOP and VALIDATE**: `pnpm build` + 手动测试 4.3.4
5. 核心删除功能可用

### Incremental Delivery

1. Phase 1 (底层) → 所有删除函数统一
2. + Phase 2 (US5) → handleDeleteSelected 重构完成
3. + Phase 3 (US1) → 单击删除可靠工作 (**MVP!**)
4. + Phase 4 (US2) → 批量删除可靠工作
5. + Phase 5-6 (US3/US4) → 悬浮/键盘删除验证
6. + Phase 7 (US6) → 按钮视觉一致
7. + Phase 8 (Polish) → 死代码清理 + 全面验收

### 文件修改矩阵

| 文件 | T001 | T002 | T003 | T004 | T005 | T006 | T007 | T008 | T009 | T010 | T011 | T012 | T013 | T014 | T015 |
|------|:----:|:----:|:----:|:----:|:----:|:----:|:----:|:----:|:----:|:----:|:----:|:----:|:----:|:----:|:----:|
| conversation-tree-adapter.ts | ✏️ | | | | | | | | | | | | | | |
| NodeActionBar.tsx | | ✏️ | | | | | | | | ✅ | | | | | |
| MessageDetailPanel.tsx | | | ✏️ | | | | | | | | | | | | |
| MessageDetailDrawer.tsx | | | | ✏️ | | | | | | | | | | | |
| ConversationTreeView.tsx | | | | | ✏️ | ✏️ | ✏️ | | ✅ | | ✅ | | | ✏️ | |
| TreeToolbar.tsx | | | | | | | | ✏️ | | | | ✏️ | | | ✏️ |
| viewModeStore.ts | | | | | | | | | | | | | ✏️ | | |

✏️ = 修改, ✅ = 验证（不修改）

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- T010/T011 是验证型任务（确认 Phase 1 的改动在对应 US 场景下正确工作）
- T013-T015 (撤销清理) 放在 Phase 8 而非各自的 Story Phase，因为它们是跨 Story 的横切关注点
- 总计 17 个任务，净减少约 50-80 行代码
- Commit 建议：每个 Phase 完成后提交一次
