# Research: 20260306_bugfix

## R1: Prompt 层级分叉创建 — 当前限制原因

**Decision**: SystemNode 已有 Output Handle（source），技术上支持创建子节点。限制来自 `ConversationTreeView.handleCreateUserNode` 中调用 `createNewFork` 时需要一个 `targetMessageId`，而当前逻辑可能未正确处理 System Prompt 作为分叉点的场景。

**Rationale**: 
- `SystemNode.tsx` 已包含 `<Handle type="source" position={Position.Bottom} />`
- `NodeCreatePopover` 通过 `message.role === 'user'` 判断是否可创建 Assistant 节点
- `handleCreateUserNode` 直接调用 `createNewFork(session.id, targetMessageId)` + `insertMessageAfter`
- 需要确认 `buildCreateForkPatch` 是否能处理 System Prompt（role='system'）作为 forkMessageId

**Alternatives Considered**:
- 在 adapter 层过滤 System 节点的 Handle → 拒绝，会限制功能
- 创建特殊的 "从 System 节点创建" 逻辑 → 不需要，现有 fork 机制应通用

**修复策略**: 
1. 确认 `NodeCreatePopover` 在 System 节点上的触发逻辑（目前 `canCreateAssistant = message.role === 'user'`，System 节点下应只能创建 User 节点）
2. 确认 `buildCreateForkPatch` 对 System 消息的兼容性
3. 如果右键菜单未对 System 节点启用"添加分支"，需要在 `NodeActionBar` 或上下文菜单中启用

---

## R2: 重新生成统一使用当前模型配置 — 现有实现分析

**Decision**: 当前 `regenerateInNewFork` 已接受 `multiModels` 参数，并在 `NodeActionBar.handleRegenerate` 和 `ConversationTreeView.handleCreateAssistantNode` 中已传递 `multiModels`。现有实现**已经**基本正确——重新生成时读取当前 `useMultiModelStore` 的配置。

**Rationale**:
```typescript
// NodeActionBar.tsx
const handleRegenerate = useCallback((e) => {
  const multiModels = multiModelEnabled && selectedModels.length > 0 ? selectedModels : undefined
  regenerateInNewFork(session.id, message, { multiModels })
}, [message, session.id, multiModelEnabled, selectedModels])
```
这段代码已经统一使用当前底部配置。需验证所有调用点是否一致：
- `NodeActionBar.tsx` ✅ 已传递 multiModels
- `MessageDetailPanel.tsx` — 需确认
- `Message.tsx`（列表视图） — 需确认
- `AssistantNode.tsx` 内联按钮 — 需确认

**修复策略**: 审查所有 `regenerateInNewFork` 调用点，确保统一传递当前 multiModel 配置。

---

## R3: 白天模式 UI 适配 — 现有主题系统

**Decision**: 项目使用 Mantine `colorScheme` + Tailwind `dark:` 前缀双重主题系统。`ConversationTreeView` 通过 `isDarkMode` 变量控制样式。

**Rationale**:
- `ConversationTreeView.tsx` 第 74-76 行：
  ```typescript
  const { colorScheme } = useMantineColorScheme()
  const realTheme = useUIStore((state) => state.realTheme)
  const isDarkMode = colorScheme === 'dark' || realTheme === 'dark'
  ```
- 节点组件使用 Tailwind `dark:` 前缀适配暗色模式
- `MessageDetailPanel` 使用固定的 Tailwind 类，可能在 Light 模式下缺少边框/阴影

**修复策略**:
1. `MessageDetailPanel.tsx` — 增加 Light 模式下的边框/阴影（`border`/`shadow-md`）
2. 节点组件（`SystemNode`, `UserNode`, `AssistantNode`）— 确认 Light 模式下与白色背景的对比度
3. `ConversationTreeView` 背景 — 确认 Light 模式画布颜色

---

## R4: 对话导出适配树状分支 — 现有导出架构

**Decision**: 现有 `exportChat` 函数接受 `Session` + `scope`（`all_threads` / `current_thread`），通过 `SessionThread[]` 格式化。树状分支模式需要新增一个 scope（如 `active_path`），提取激活路径消息构造 thread 后复用现有格式化逻辑。

**Rationale**:
- `sessionHelpers.ts` 第 361-380 行：`exportChat` 将 messages 组装为 `SessionThread[]` 后调用 `formatChatAsMarkdown/Txt/Html`
- `conversation-tree-adapter.ts` 已有 `buildActivePathIds` 函数，可获取活跃路径 ID 集合
- 需要新增函数：从 Session 中提取激活路径的有序消息列表

**修复策略**:
1. 新增 `ExportChatScope` 值：`'active_path'`
2. 新增函数 `getActivePathMessages(session)` 返回有序消息列表
3. 在 `exportChat` 中增加 `active_path` 分支处理
4. 在 `ExportChat.tsx` 模态框中新增 scope 选项
5. 在树状图工具栏 `TreeToolbar.tsx` 中新增导出按钮
6. 复用现有 `formatChatAsMarkdown/Txt/Html` 格式化函数

---

## R5: Detail 面板表格溢出 — Markdown 渲染分析

**Decision**: `MessageDetailPanel` 内容区域使用 `<ScrollArea>` + `<Markdown>` 组件渲染。Markdown 组件使用 `remarkGfm` 支持 GFM 表格，但未对表格设置 `overflow-x: auto`，导致宽表格撑破面板布局并阻碍拖拽。

**Rationale**:
- `MessageDetailPanel.tsx` 第 290-305 行：内容区域仅使用 `<ScrollArea>` 包裹
- `Markdown.tsx` 基于 `react-markdown` + `remarkGfm`，渲染 `<table>` 元素
- 渲染的 `<table>` 没有外层 `overflow-x: auto` 容器
- 宽表格导致内容区域宽度超出面板 → 面板整体被撑开 → 拖拽手柄位置偏移

**修复策略**:
1. 在 `Markdown.tsx` 中为 `table` 元素添加包裹容器：`<div style={{ overflowX: 'auto' }}><table>...</table></div>`
2. 或在 `MessageDetailPanel.tsx` 的内容区域添加 `overflow-x: hidden` / `max-width: 100%`
3. 确保 `<ScrollArea>` 的 `offsetScrollbars` 正确处理水平溢出

---

## R6: 粘贴网址/图片报错 — 错误处理分析

**Decision**: `InputBox.tsx` 的 `onPaste` 函数（第 590-637 行）在处理 `clipboardData.items` 时缺少 try-catch 保护。`item.getAsFile()` 或 `item.getAsString()` 可能因浏览器安全策略或异常格式返回 null/抛错。

**Rationale**:
- `onPaste` 遍历 `clipboardData.items`，对 `kind === 'file'` 调用 `item.getAsFile()`
- `insertFiles([file])` 如果 file 为 null 会出错
- URL 检测逻辑 `raw.startsWith('http://')` 在空字符串时不会出错，但 `insertLinks(urls)` 在 urls 为空数组时的行为需确认
- 富文本粘贴（含 HTML + 图片）时，`clipboardData.items` 可能包含 `text/html` 类型，未做处理

**修复策略**:
1. 为 `onPaste` 函数添加 try-catch 包裹
2. 对 `item.getAsFile()` 返回值做 null 检查
3. 对 `insertFiles` 和 `insertLinks` 的输入做空数组/null 过滤
4. 对 `item.getAsString()` 回调中的逻辑做异常保护
