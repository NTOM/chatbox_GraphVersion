# Data Model: 树视图工具栏删除功能重构

**Date**: 2026-03-17  
**Feature**: `001-toolbar-delete-redesign`

---

## 实体关系总览

```
Session (会话)
├── messages: Message[]           ← 主链消息列表
├── messageForksHash: Record<string, ForkEntry>  ← 分支结构
│   └── [forkPointId]: ForkEntry
│       ├── position: number      ← 当前活跃分支索引
│       └── lists: ForkBranch[]   ← 分支列表
│           └── messages: Message[]
└── threads: Thread[]             ← 线程（二级对话）
    └── messages: Message[]

TreeNode (树节点，ReactFlow 层)
├── id: string                    ← 对应 Message.id
├── data: TreeNodeData
│   ├── message: Message
│   ├── depth: number
│   ├── isActivePath: boolean
│   ├── forkParentId: string | null
│   └── branchInfo: { index, total, forkPointId }
└── position: { x, y }

SelectionState (选中状态，viewModeStore)
├── interactionMode: 'click' | 'select'
├── selectedNodeId: string | null    ← click 模式
└── selectedNodeIds: string[]        ← select 模式
```

---

## 核心实体详情

### 1. Message（消息）

上游已有类型，不做修改。

| 属性 | 类型 | 说明 |
|------|------|------|
| id | string | 唯一标识符 |
| role | 'user' \| 'assistant' \| 'system' | 消息角色 |
| content | string | 消息内容 |
| timestamp | number | 创建时间戳 |
| ... | ... | 其他上游属性 |

**存储位置**: 可能在 `session.messages`、`session.messageForksHash[*].lists[*].messages`、`session.threads[*].messages` 三处之一。

### 2. ForkEntry（分支入口）

| 属性 | 类型 | 说明 |
|------|------|------|
| position | number | 当前活跃分支的索引（0-based） |
| lists | ForkBranch[] | 分支列表 |

### 3. ForkBranch（分支）

| 属性 | 类型 | 说明 |
|------|------|------|
| messages | Message[] | 该分支中的消息列表 |

### 4. TreeNodeData（树节点数据）

由 `conversation-tree-adapter.ts` 从 Session 数据生成。

| 属性 | 类型 | 说明 |
|------|------|------|
| message | Message | 对应的消息对象 |
| depth | number | 节点在树中的深度（用于删除排序） |
| isActivePath | boolean | 是否在当前活跃路径上 |
| forkParentId | string \| null | 分支点消息 ID（主链节点为 null） |
| branchInfo | BranchInfo \| null | 分支编号信息 |

### 5. SelectionState（选中状态）

来自 `viewModeStore`。

| 属性 | 类型 | 说明 |
|------|------|------|
| interactionMode | 'click' \| 'select' | 当前交互模式 |
| selectedNodeId | string \| null | click 模式下的单选节点 ID |
| selectedNodeIds | string[] | select 模式下的多选节点 ID 数组 |

**状态不持久化**：`selectedNodeId`、`selectedNodeIds` 是运行时状态，不会被持久化到 storage。

---

## 删除操作的数据流

### 删除前状态

```
Session.messages = [M1, M2, M3, M4]
Session.messageForksHash = {
  "M2": {
    position: 0,
    lists: [
      { messages: [M3, M4] },      // 分支0（活跃）
      { messages: [M5, M6] }       // 分支1（非活跃）
    ]
  }
}
```

### 删除 M5（非活跃分支中的消息）后

```
Session.messageForksHash = {
  "M2": {
    position: 0,
    lists: [
      { messages: [M3, M4] },
      { messages: [M6] }           // M5 被移除
    ]
  }
}
```

### 删除 M6 后（分支1 变空）

```
// 空分支被清理
Session.messageForksHash = {
  "M2": {
    position: 0,
    lists: [
      { messages: [M3, M4] }
    ]
  }
}
// 只剩一个分支时，合并回主链：
Session.messages = [M1, M2, M3, M4]
Session.messageForksHash = {}      // M2 的 fork entry 被移除
```

---

## 重构后的删除函数签名

### `removeTreeMessage`（单条，已存在，保持不变）

```
Input:  sessionId: string, messageId: string
Output: Promise<void>
Effect: 在 session 中搜索并移除 messageId 对应的消息，自动修复 fork 结构
```

### `removeTreeMessages`（批量，重构为单事务）

```
Input:  sessionId: string, messageIds: string[] (已按 depth 降序排列)
Output: Promise<void>
Effect: 在单次 updateSessionWithMessages 事务中移除所有 messageIds，
        每个 ID 的删除逻辑与 removeTreeMessage 相同
```

---

## 验证规则

| 规则 | 说明 |
|------|------|
| 删除顺序 | 子节点（depth 大）必须先于父节点（depth 小）删除 |
| 空分支清理 | 删除后如果某个 ForkBranch.messages 为空，该分支应被移除 |
| 单分支合并 | 如果 ForkEntry.lists 只剩一个分支，应将其消息合并回主链并移除 fork entry |
| position 调整 | 如果活跃分支被删空，position 应指向下一个有效分支 |
| 主链完整性 | 删除主链消息后，如果消息是 fork point，需要特殊处理 |
