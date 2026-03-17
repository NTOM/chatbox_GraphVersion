# Interface Contracts: 删除功能内部 API

**Date**: 2026-03-17  
**Feature**: `001-toolbar-delete-redesign`

---

本项目是 Electron 桌面应用，删除功能没有外部 API 接口。以下定义的是**组件间的内部接口契约**，确保重构后各模块的职责边界清晰。

---

## Contract 1: TreeToolbar Props（工具栏组件接口）

工具栏是纯展示组件（`memo` 包裹），通过 props 接收所有状态和行为。

```typescript
interface TreeToolbarProps {
  /** 当前交互模式 */
  mode: InteractionMode
  /** 模式变更回调 */
  onModeChange: (mode: InteractionMode) => void
  /** 选中的节点数量（用于显示） */
  selectedCount: number
  /** 聚焦到选中节点 */
  onFocus: () => void
  /** 删除选中节点（触发确认流程） */
  onDelete: () => void
  /** 自动整理布局 */
  onAutoLayout: () => void
  /** 导出激活路径 */
  onExportActivePath?: () => void
  /** 是否有选中节点可聚焦 */
  canFocus: boolean
  /** 是否有选中节点可删除 */
  canDelete: boolean
}
```

**变更说明（与当前对比）**：
- ✅ 移除 `onUndo: () => void`（撤销功能移除，R5）
- ✅ 移除 `canUndo: boolean`（撤销功能移除，R5）
- ✅ 其余 props 保持不变

**行为约束**：
- `onDelete` 由调用方（ConversationTreeView）负责确认弹窗和实际删除逻辑
- 工具栏只负责在 `canDelete === true` 时调用 `onDelete()`
- `canDelete === false` 时按钮使用 `ActionIcon` 的 `disabled` 属性

---

## Contract 2: removeTreeMessage（单条删除）

```typescript
/**
 * 从会话中删除单条消息（GitLine 增强版）
 * 
 * 搜索范围：session.messages + messageForksHash + threads
 * 自动处理：空分支清理、单分支合并、position 调整
 * 
 * @param sessionId - 会话 ID
 * @param messageId - 待删除的消息 ID
 * @throws 如果 session 不存在
 */
export async function removeTreeMessage(
  sessionId: string, 
  messageId: string
): Promise<void>
```

**不变性保证**：
- 调用后，`messageId` 对应的消息不再存在于 session 任何数据位置
- 如果某个 ForkEntry 的某个分支变空，该分支被移除
- 如果 ForkEntry 只剩一个分支，该分支消息合并回主链，ForkEntry 被移除
- 如果 ForkEntry 的活跃分支被清空，position 自动切换到下一个有效分支

---

## Contract 3: removeTreeMessages（批量删除 — 重构版）

```typescript
/**
 * 从会话中批量删除消息（单事务版）
 * 
 * 在单次 updateSessionWithMessages 调用中处理所有删除，
 * 只触发一次 store 更新和一次 React 重渲染。
 * 
 * @param sessionId - 会话 ID
 * @param messageIds - 待删除的消息 ID 列表（必须已按 depth 降序排列）
 * @throws 如果 session 不存在
 * 
 * @precondition messageIds 已按节点 depth 降序排列（子节点在前）
 */
export async function removeTreeMessages(
  sessionId: string, 
  messageIds: string[]
): Promise<void>
```

**变更说明（与当前对比）**：
- ✅ 从串行多次 `updateSessionWithMessages` 改为单次事务
- ✅ 内部提取出 `removeMessageFromSession` 纯函数（在 session 对象上原地操作）
- ✅ 入参要求不变（messageIds 必须已排序）

---

## Contract 4: 节点组件的删除回调

UserNode 和 AssistantNode 中的悬浮删除按钮共享相同的接口模式：

```typescript
// 在节点组件内部定义
const handleDelete = async (e: React.MouseEvent) => {
  e.preventDefault()
  e.stopPropagation()
  
  if (!confirmingDelete) {
    // 首次点击：进入确认态
    setConfirmingDelete(true)
    return
  }
  
  // 二次点击：执行删除
  await removeTreeMessage(sessionId, message.id)
}
```

**不变性保证**：
- 使用与工具栏删除相同的底层 `removeTreeMessage` 函数
- 确认模式保持二次点击（非弹窗），3 秒超时重置
- 事件必须 `stopPropagation()` 防止触发 ReactFlow 交互

---

## Contract 5: 选中状态读取接口

工具栏删除从 `viewModeStore` 同步读取选中状态：

```typescript
// 在 handleDeleteSelected 中使用
function getIdsToDelete(): string[] {
  const state = useViewModeStore.getState()
  const { interactionMode, selectedNodeId, selectedNodeIds } = state
  
  return interactionMode === 'click'
    ? (selectedNodeId ? [selectedNodeId] : [])
    : [...selectedNodeIds]
}
```

**不变性保证**：
- `getState()` 返回 store 的最新同步快照
- 返回的是值拷贝（不是引用），不受后续 store 变更影响
- 此接口替代 3 个 `useRef` workaround
