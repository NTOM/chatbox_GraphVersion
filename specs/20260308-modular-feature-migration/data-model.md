# Data Model: Modular Feature Migration

**Branch**: `20260308-modular-feature-migration`  
**Date**: 2026-03-16

---

## Overview

本迁移涉及的数据模型主要是对话树可视化所需的实体。大部分数据结构直接映射自上游的 `Session` 和 `Message` 类型，额外添加用于可视化的状态数据。

---

## Entities

### 1. TreeNode (可视化节点)

**Purpose**: 表示对话树中的单个节点（消息）

**Mapping**: 从上游 `Message` 类型派生

```typescript
interface TreeNode {
  id: string                    // 消息 ID (来自 Message.id)
  type: 'user' | 'assistant' | 'system'  // 节点类型 (来自 Message.role)
  data: {
    message: Message            // 原始消息对象引用
    isActive: boolean           // 是否在活跃路径上
    branchIndex: number         // 所属分支索引 (用于颜色)
    depth: number               // 在树中的深度
    hasChildren: boolean        // 是否有子节点
    childCount: number          // 子节点数量
  }
  position: { x: number; y: number }  // 布局计算后的位置
}
```

**Validation Rules**:
- `id` 必须非空且唯一
- `type` 必须是三种角色之一
- `position` 由 `tree-layout.ts` 计算，初始为 (0, 0)

---

### 2. TreeEdge (可视化边)

**Purpose**: 表示节点之间的连接关系

```typescript
interface TreeEdge {
  id: string                    // 边 ID: `${sourceId}-${targetId}`
  source: string                // 源节点 ID
  target: string                // 目标节点 ID
  type: 'default' | 'branch' | 'active'  // 边类型
  data: {
    branchIndex: number         // 分支索引 (用于颜色)
    isActivePath: boolean       // 是否属于活跃路径
  }
}
```

**Edge Types**:
- `default`: 普通连接线
- `branch`: 分支点的连接线（使用分支颜色）
- `active`: 活跃路径的高亮连接线

---

### 3. ViewMode (视图模式)

**Purpose**: 控制会话页面的显示模式

```typescript
type ViewMode = 'list' | 'tree'

interface ViewModeState {
  mode: ViewMode                // 当前视图模式
  setMode: (mode: ViewMode) => void
}
```

**Persistence**: 使用 Zustand persist middleware 保存到 localStorage

---

### 4. TreeViewState (树形视图状态)

**Purpose**: 管理树形视图的交互状态

```typescript
interface TreeViewState {
  selectedNodeId: string | null       // 当前选中的节点
  hoveredNodeId: string | null        // 当前悬停的节点
  activePath: string[]                // 活跃路径的节点 ID 列表
  expandedBranches: Set<string>       // 展开的分支 ID 集合
  viewport: {                         // 视口状态
    x: number
    y: number
    zoom: number
  }
}
```

---

### 5. BranchColor (分支颜色)

**Purpose**: 为不同分支分配视觉区分的颜色

```typescript
// 预定义调色板
const BRANCH_COLORS = [
  '#3b82f6', // blue
  '#10b981', // green
  '#f59e0b', // amber
  '#ef4444', // red
  '#8b5cf6', // violet
  '#ec4899', // pink
  '#06b6d4', // cyan
  '#f97316', // orange
] as const

type BranchColor = typeof BRANCH_COLORS[number]
```

---

## Entity Relationships

```
Session (上游)
    │
    ├── messages[]
    │       │
    │       └── Message ──────────────────┐
    │             │                       │
    │             ▼                       │
    │       [conversation-tree-adapter]   │
    │             │                       │
    │             ▼                       │
    │       TreeNode ◄────────────────────┘
    │             │
    │             ▼
    │       TreeEdge
    │
    └── threads[] (if exists)
            │
            └── Thread
                  └── messages[]
```

---

## State Transitions

### ViewMode Transitions

```
┌─────────────────────────────────────┐
│                                     │
│    ┌──────┐        ┌──────┐        │
│    │ List │ ◄────► │ Tree │        │
│    └──────┘        └──────┘        │
│         ▲              ▲            │
│         │              │            │
│         └──── Toggle ──┘            │
│              Button                 │
│                                     │
└─────────────────────────────────────┘
```

### Node Selection Flow

```
User clicks node
       │
       ▼
  Set selectedNodeId
       │
       ▼
  Calculate activePath (path from root to selected)
       │
       ▼
  Update edge highlighting
       │
       ▼
  Show MessageDetailPanel
```

---

## Adapter Interface

`conversation-tree-adapter.ts` 负责将上游数据转换为可视化数据：

```typescript
interface ConversationTreeAdapter {
  /**
   * 将 Session 转换为 ReactFlow 节点和边
   */
  sessionToGraph(session: Session): {
    nodes: TreeNode[]
    edges: TreeEdge[]
  }

  /**
   * 查找从根节点到指定节点的路径
   */
  findPathToNode(session: Session, nodeId: string): string[]

  /**
   * 获取节点的所有子节点
   */
  getChildNodes(session: Session, nodeId: string): Message[]
}
```

---

## Integration with Upstream

### 使用上游 API

| 操作 | 上游函数 | 位置 |
|------|---------|------|
| 查找消息位置 | `findMessageLocation()` | `stores/session/forks.ts` |
| 创建分支 | `createNewFork()` | `stores/session/forks.ts` |
| 切换分支 | `switchFork()` | `stores/session/forks.ts` |
| 获取消息列表 | `getAllMessageList()` | `stores/sessionHelpers.ts` |
| 更新会话 | `updateSessionWithMessages()` | `stores/chatStore.ts` |

### 保持同步

当上游 Session 数据变化时，通过 React 的依赖追踪自动重新计算可视化数据：

```typescript
const { nodes, edges } = useMemo(
  () => sessionToGraph(session),
  [session]
)
```

---

## Notes

- 所有可视化状态都是**派生数据**，源头是上游的 `Session`
- 不需要额外的持久化存储（除 viewMode 偏好外）
- 布局算法使用 dagre 或自定义树形布局
