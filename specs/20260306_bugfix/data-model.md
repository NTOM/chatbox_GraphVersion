# Data Model: 20260306_bugfix

本次 bugfix 不引入新的数据实体，仅扩展现有类型和函数签名。

## 现有实体（不变更）

### Session
```typescript
interface Session {
  id: string
  name: string
  model: string
  modelProvider: ModelProviderType
  sessionSettings: SessionSettings
  threads: SessionThread[]
  messages: Message[]
  messageForksHash: Record<string, MessageForkEntry>
  createdAt: number
  updatedAt: number
}
```

### Message
```typescript
interface Message {
  id: string
  role: 'system' | 'user' | 'assistant' | 'tool'
  contentParts: MessageContentParts
  generating?: boolean
  cancel?: () => void
  usage?: LanguageModelUsage
  files?: FileAttachment[]
  links?: string[]
}
```

### MessageForkEntry
```typescript
interface MessageForkEntry {
  position: number           // 当前活跃分支索引
  lists: MessageForkList[]   // 所有分支列表
  createdAt: number
}
```

### MultiModelState (Zustand Store)
```typescript
interface MultiModelState {
  multiModelEnabled: boolean
  selectedModels: ModelInfo[]  // { provider, modelId }
  maxModels: number
}
```

## 类型扩展

### ExportChatScope（扩展）
```typescript
// 原有
type ExportChatScope = 'all_threads' | 'current_thread'

// 扩展为
type ExportChatScope = 'all_threads' | 'current_thread' | 'active_path'
```

**影响范围**：
- `src/shared/types.ts` — 类型定义
- `src/renderer/stores/sessionHelpers.ts` — `exportChat` 函数
- `src/renderer/modals/ExportChat.tsx` — Scope 选择器

## 新增函数签名

### getActivePathMessages
```typescript
// src/renderer/lib/conversation-tree-adapter.ts (或 sessionHelpers.ts)
function getActivePathMessages(session: Session): Message[]
```
从 Session 中按活跃路径顺序提取消息列表（从 root 到 active leaf），用于导出功能。

**逻辑**：
1. 从 `session.messages` 遍历主消息链
2. 对每个有 fork 的消息，取 `lists[position]` 中的消息
3. 递归直到叶子节点
4. 返回有序 `Message[]`

## 状态转换图

### 节点分叉创建（US1 相关）
```
System Prompt (no children) 
    → User clicks Output Handle 
    → createNewFork(sessionId, systemMsgId) 
    → insertMessageAfter(sessionId, newUserMsg, systemMsgId)
    → generateMore(sessionId, newUserMsg.id, multiModels?)
    → System Prompt now has fork with one branch containing [UserMsg, AssistantMsg]
```

### 重新生成（US2 相关）
```
Current state: ... → UserMsg → AssistantMsg (selected)
    → User clicks Regenerate
    → Read multiModelStore: { multiModelEnabled, selectedModels }
    → regenerateInNewFork(sessionId, assistantMsg, { multiModels })
    → Creates fork at UserMsg, new branch gets new AssistantMsg(s)
```
