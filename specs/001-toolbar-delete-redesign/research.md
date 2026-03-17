# Research: 树视图工具栏删除功能重构

**Date**: 2026-03-17  
**Feature**: `001-toolbar-delete-redesign`

---

## R1: ReactFlow 事件模型与工具栏按钮冲突

### 问题

ReactFlow 画布在 `pointerdown` / `mousedown` 阶段会捕获事件，执行：
1. 清除当前节点选中状态（`onSelectionChange({ nodes: [] })`）
2. 开始画布拖拽（panOnDrag）
3. 触发 paneClick

当工具栏按钮位于 ReactFlow 画布容器内或附近时，按钮的 `click` 事件（在 `mouseup` 之后触发）执行时，选中状态可能已被清空。

### 决策

**将工具栏放置在 ReactFlow 容器外部**，作为独立的 DOM 兄弟元素，而非 ReactFlow 的子元素。这从根本上避免了事件冒泡到 ReactFlow 画布的问题。

### 理由

- 当前方案（在 pointerdown 拦截 + stopPropagation）是治标不治本的 workaround
- 工具栏已经在视觉上位于画布下方，只需确保 DOM 结构也在 ReactFlow 外部
- ReactFlow 的 `<Panel>` 组件虽然在画布内渲染 overlay，但会受到画布事件系统影响
- 将工具栏移出 ReactFlow 容器后，`onClick` 正常工作，无需 `onPointerDown` hack

### 替代方案

| 方案 | 优点 | 缺点 | 采纳 |
|------|------|------|------|
| pointerdown + stopPropagation（当前） | 不需改结构 | 脆弱、与 ReactFlow 内部实现耦合、需要多层拦截 | ❌ |
| ReactFlow `<Panel>` 组件 | 官方推荐方式 | 仍在 ReactFlow 事件域内 | ❌ |
| **工具栏作为 ReactFlow 外部兄弟** | 根本解决事件冲突 | 需要调整容器 flex 布局 | ✅ |

---

## R2: 统一删除函数设计 — 单条 vs 批量

### 问题

当前存在两套删除函数：
- `removeMessage`（上游原版）：只搜索 `session.messages` 和 `session.threads`
- `removeTreeMessage`（GitLine 增强版）：搜索 5 个位置，含 fork 结构自动修复

且 `removeTreeMessages` 是简单的串行循环，每删一条都触发 store 更新。

### 决策

1. **统一为 `removeTreeMessage` 作为唯一底层删除入口**，`NodeActionBar`、`MessageDetailPanel`、`MessageDetailDrawer` 也改为使用它
2. **优化批量删除**：`removeTreeMessages` 改为在单次 `updateSessionWithMessages` 事务中处理所有删除，而非逐条调用
3. 保留 `removeMessage`（上游）不做修改，但 GitLine 组件统一不再直接调用它

### 理由

- 使用 `removeMessage` 无法删除非活跃分支消息，这在树视图中是功能缺陷
- 批量删除在单次事务中完成可以避免 N 次 store 更新 + N 次 React 重渲染
- 统一入口便于 debug 和维护

### 替代方案

| 方案 | 优点 | 缺点 | 采纳 |
|------|------|------|------|
| 保持两套函数并存 | 改动小 | 不同入口删除行为不一致 | ❌ |
| **统一为 removeTreeMessage + 优化批量** | 一致性、性能好 | 需修改 3 个额外文件 | ✅ |
| 修改上游 removeMessage | 从源头统一 | 违反宪法 III（最小化上游修改） | ❌ |

---

## R3: 消除闭包 Ref workaround 的策略

### 问题

当前 `handleDeleteSelected` 需要通过 3 个 `useRef` 绕过 Mantine `modals.openConfirmModal` 的 `onConfirm` 回调闭包过时问题。

### 决策

**将选中状态的快照在调用 `modals.openConfirmModal` 前捕获为局部变量**，直接传入 `onConfirm` 回调。这比 ref 更直接、更安全。

具体来说：
```
function handleDeleteSelected() {
  // 在函数入口处立即读取当前选中状态（此刻是最新的）
  const idsToDelete = getIdsToDelete()  // 从 store 同步读取
  if (idsToDelete.length === 0) return
  
  // idsToDelete 作为局部变量被 onConfirm 闭包捕获
  // 因为它在 openConfirmModal 调用前已经确定，不会过时
  modals.openConfirmModal({
    onConfirm: async () => {
      await deleteNodes(sessionId, idsToDelete)
    }
  })
}
```

### 理由

- `handleDeleteSelected` 的函数体执行是同步的（只有 `onConfirm` 回调是异步的）
- 在函数体内同步读取 store 当前状态（`useViewModeStore.getState()`），这个快照是函数调用瞬间的最新值
- 闭包捕获的是这个确定的局部变量值，不存在过时问题
- 3 个 Ref + 3 个同步赋值语句全部可以删除

### 替代方案

| 方案 | 优点 | 缺点 | 采纳 |
|------|------|------|------|
| 保持 Ref（当前） | 已验证能工作 | 冗余、复杂、不直观 | ❌ |
| **局部变量快照 + store.getState()** | 简洁、无额外状态 | 需确保 getState() 返回最新值 | ✅ |
| 使用 useCallback 依赖数组 | React 标准做法 | Mantine modal 回调仍可能闭包过时 | ❌ |

---

## R4: 工具栏按钮统一组件方案

### 问题

当前工具栏中混用 Mantine `ActionIcon`（模式切换、布局、导出按钮）和原生 `<button>`（聚焦、删除、撤销按钮）。

### 决策

**统一使用 Mantine `ActionIcon`**。删除按钮之前改为原生 button 是为了绕过 disabled 属性阻止 onClick 的问题。但根据 R1 的决策（工具栏移出 ReactFlow），事件冲突根因已解决，不再需要这个 workaround。

### 理由

- Mantine `ActionIcon` 提供一致的 hover、focus、disabled 视觉反馈
- 项目宪法 IV 要求使用 Mantine 组件库
- `ActionIcon` 的 `disabled` 属性在工具栏位于 ReactFlow 外部时正常工作（不再有事件被吞的问题）

### 替代方案

| 方案 | 优点 | 缺点 | 采纳 |
|------|------|------|------|
| 混用（当前） | 无需改动 | 不一致的视觉和行为 | ❌ |
| 统一原生 button | 完全控制 | 需要手写所有样式、不符合 Mantine 规范 | ❌ |
| **统一 Mantine ActionIcon** | 一致性好、符合宪法 | 需确认 disabled 正常 | ✅ |

---

## R5: 撤销功能处理策略

### 问题

当前 `handleUndo` 只保存快照但无法恢复（上游缺少 `restoreSessionMessages` API），但在 UI 上占据按钮位置。

### 决策

**移除撤销按钮和相关代码**（包括 `saveTreeUndoState`、`getTreeUndoState`、`clearTreeUndoState` 在 `viewModeStore` 中的定义）。在删除确认对话框中通过足够清晰的确认文案来替代撤销需求。

### 理由

- 宪法 V (YAGNI) 原则：不建设当前无法使用的功能
- 空实现按钮对用户造成困惑（点击没有效果但没有任何提示）
- 撤销状态管理代码（约 40 行）是纯粹的死代码
- 如果将来上游提供恢复 API，可以作为独立功能重新添加

### 替代方案

| 方案 | 优点 | 缺点 | 采纳 |
|------|------|------|------|
| 保留但禁用 | 预留入口 | 违反 YAGNI、死代码 | ❌ |
| **完全移除** | 清洁、符合 YAGNI | 将来添加需从头来 | ✅ |
| 实现基于 store 的撤销 | 功能完整 | 不在本次重构范围、复杂度高 | ❌ |

---

## R6: 批量删除性能优化 — 事务化方案

### 问题

`removeTreeMessages` 串行调用 `removeTreeMessage`，每次都通过 `chatStore.updateSessionWithMessages` 触发一次完整的 session 更新 → React 重渲染循环。删除 10 个节点 = 10 次更新。

### 决策

**重构 `removeTreeMessages` 为单次事务删除**。在一次 `updateSessionWithMessages` 调用中处理所有待删除 ID，而非循环调用。

```
// 伪代码
export async function removeTreeMessages(sessionId, messageIds) {
  await chatStore.updateSessionWithMessages(sessionId, (session) => {
    for (const id of messageIds) {
      // 在同一个 session 快照上逐个删除
      removeFromSession(session, id)
    }
    return session
  })
}
```

### 理由

- N 条消息只触发 1 次 store 更新 + 1 次 React 重渲染
- `updateSessionWithMessages` 的回调接收当前 session 的可变引用，可以安全地在其上多次操作
- 删除顺序仍然保持子节点优先（由调用方排序传入）

### 替代方案

| 方案 | 优点 | 缺点 | 采纳 |
|------|------|------|------|
| 保持串行（当前） | 简单 | 性能差，N 次重渲染 | ❌ |
| **单事务批量** | 1 次更新 | 需重构内部逻辑从 session 操作中提取 | ✅ |
| 使用 React batch API | 框架层合并 | 不保证跨 await 合并 | ❌ |

---

## R7: 防抖/防重复触发策略

### 问题

用户快速多次点击删除按钮，或者在确认弹窗打开期间再次点击，可能导致重复删除。

### 决策

**使用 `useRef` 标记删除进行中状态**。在 `handleDeleteSelected` 入口检查，如果已有删除操作进行中，直接 return。删除完成（成功或失败）后重置标记。

### 理由

- 比 `useState` + `disabled` 更轻量（不触发重渲染）
- 比 `debounce` 更精准（debounce 可能延迟合法操作）
- 确认弹窗本身就是一道防线，但 `onConfirm` 回调的异步执行阶段需要额外保护

---

## 决策汇总

| # | 主题 | 决策 |
|---|------|------|
| R1 | 事件冲突 | 工具栏移出 ReactFlow 容器 |
| R2 | 删除函数 | 统一到 removeTreeMessage，优化批量为单事务 |
| R3 | 闭包问题 | 局部变量快照替代 Ref workaround |
| R4 | 按钮组件 | 统一使用 Mantine ActionIcon |
| R5 | 撤销功能 | 完全移除（YAGNI） |
| R6 | 批量性能 | 单次事务批量删除 |
| R7 | 防重复 | useRef 标记 + 入口检查 |
