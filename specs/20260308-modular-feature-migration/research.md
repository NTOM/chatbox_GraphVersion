# Research: Modular Feature Migration

**Branch**: `20260308-modular-feature-migration`  
**Date**: 2026-03-16  
**Status**: ✅ Complete

---

## Research Questions

### Q1: 上游 Header.tsx 删除后，视图切换入口放在哪里？

**Context**: GitTree-Function 分支的视图切换按钮原本集成在 `src/renderer/components/Header.tsx`，但上游已将其移动到 `src/renderer/components/layout/Header.tsx` 并重构。

**Research Findings**:

1. **上游新结构**:
   - `Header.tsx` 移至 `components/layout/Header.tsx`
   - 新增 `components/layout/Toolbar.tsx` 作为顶部工具栏右侧区域
   - Toolbar 包含搜索、全宽切换、线程历史、更多操作菜单等按钮

2. **最佳集成点**: `components/layout/Toolbar.tsx`
   - 该文件专门放置会话级别的操作按钮
   - 已有布局宽度切换按钮 (`setWidthFull`)，视图模式切换在逻辑上与之类似
   - 使用 `ActionIcon` 组件，与我们的 `ViewModeSwitch` 设计一致

**Decision**: 在 `Toolbar.tsx` 中添加视图切换入口，使用 `// [GitLine]` 标记

**Alternatives Considered**:
- ❌ 修改 Header.tsx — Header 主要用于标题和侧边栏控制，不适合放操作按钮
- ❌ 创建独立浮动按钮 — 破坏上游 UI 一致性
- ✅ 修改 Toolbar.tsx — 最符合上游设计模式

---

### Q2: @xyflow/react 与上游 React 版本是否兼容？

**Context**: GitTree-Function 使用 `@xyflow/react@^12.10.0`，需确认与上游 React 18 兼容。

**Research Findings**:

1. **@xyflow/react v12.x**:
   - 完全支持 React 18
   - 支持 Concurrent Mode
   - peerDependency: `react >= 17.0.0`

2. **上游 React 版本**: React 18.x (从 package.json 确认)

3. **构建工具兼容性**:
   - 上游使用 electron-vite + Vite 7
   - @xyflow/react 支持 Vite 构建
   - 需要导入样式文件: `import '@xyflow/react/dist/style.css'`

**Decision**: @xyflow/react@^12.10.0 与上游完全兼容，无需版本调整

**Integration Notes**:
- 在 `ConversationTreeView.tsx` 入口导入样式
- 考虑在 `src/renderer/static/index.css` 或组件级别导入

---

### Q3: 上游 `stores/session/forks.ts` 与我们的分支功能是什么关系？

**Context**: 上游新增了 `src/renderer/stores/session/forks.ts`，命名与我们的"对话分支"概念相似。

**Research Findings**:

1. **上游 forks.ts 功能**:
   ```typescript
   // 关键函数
   - findMessageLocation(session, messageId) // 查找消息位置
   - createNewFork(sessionId, forkMessageId) // 在指定消息创建新分支
   - switchFork(sessionId, forkMessageId, direction) // 切换分支
   ```

2. **功能对比**:

   | 功能 | 上游 forks.ts | 我们的 conversation-tree |
   |------|---------------|-------------------------|
   | 消息分支 | ✅ 支持 | ✅ 支持 |
   | 分支切换 | ✅ 支持（prev/next） | ✅ 支持（可视化选择） |
   | 可视化 | ❌ 无 | ✅ ReactFlow 树形图 |
   | 分支高亮 | ❌ 无 | ✅ 活跃路径高亮 |

3. **关系分析**:
   - 上游已有**数据层**的分支功能
   - 我们的贡献是**可视化层**
   - 两者**互补而非冲突**

**Decision**: 
- 复用上游 `stores/session/forks.ts` 的数据操作函数
- 我们的 `conversation-tree-adapter.ts` 适配上游数据结构
- 删除或重构我们原有的分支操作逻辑，改为调用上游函数

**Migration Impact**:
- ✅ 降低代码复杂度（复用上游逻辑）
- ⚠️ 需要更新 adapter 以使用上游 API
- ⚠️ 需要检查 `sessionActions.ts` 的兼容性

---

### Q4: 上游 `$sessionId.tsx` 的变化如何影响集成？

**Context**: 我们需要在会话页面集成树形视图。

**Research Findings**:

1. **上游 $sessionId.tsx 结构**:
   ```tsx
   // 关键 imports
   import MessageList from '@/components/chat/MessageList'
   import Header from '@/components/layout/Header'
   import ThreadHistoryDrawer from '@/components/session/ThreadHistoryDrawer'
   
   // 渲染结构
   <Header session={session} />
   <MessageList ... />
   <InputBox ... />
   <ThreadHistoryDrawer ... />
   ```

2. **集成策略**:
   - 在 `<MessageList>` 和 `<ConversationTreeView>` 之间切换
   - 使用 `viewModeStore` 控制当前视图模式
   - 条件渲染：`{viewMode === 'tree' ? <ConversationTreeView /> : <MessageList />}`

3. **需要修改的地方**:
   - 添加 `viewModeStore` import
   - 添加 `ConversationTreeView` import
   - 添加条件渲染逻辑
   - 所有修改使用 `// [GitLine]` 标记

**Decision**: 采用最小侵入式集成，仅添加条件渲染逻辑

---

### Q5: i18n key 命名空间策略

**Context**: 避免与上游 i18n key 冲突。

**Research Findings**:

1. **上游 i18n 结构**:
   - 扁平 key 结构：`"Search": "搜索"`
   - 无命名空间前缀

2. **我们的 key 示例**（GitTree-Function）:
   - `"Tree View": "树形视图"`
   - `"List View": "列表视图"`
   - `"Active Path": "活跃路径"`

**Decision**: 为所有 GitLine 专属 key 添加 `gitline.` 前缀

**Implementation**:
```json
{
  "gitline.treeView": "树形视图",
  "gitline.listView": "列表视图",
  "gitline.activePath": "活跃路径",
  "gitline.branchColors": "分支颜色",
  "gitline.nodeActions": "节点操作"
}
```

---

## Technology Best Practices

### @xyflow/react 集成最佳实践

1. **样式导入**: 在组件顶部导入 `@xyflow/react/dist/style.css`
2. **性能优化**: 使用 `useCallback` 和 `useMemo` 优化节点/边渲染
3. **自定义节点**: 使用 `memo()` 包装防止不必要重渲染
4. **Viewport 控制**: 使用 `fitView` 和 `panOnScroll` 提升用户体验

### Zustand Store 模式

1. **Store 隔离**: `viewModeStore` 和 `multiModelStore` 保持独立
2. **持久化**: 考虑使用 `persist` middleware 保存用户视图偏好
3. **TypeScript**: 使用 `StateCreator` 类型定义

---

## Unresolved Items

无。所有待澄清事项已解决。

---

## Summary

| Question | Decision | Impact |
|----------|----------|--------|
| 视图切换入口 | `Toolbar.tsx` | 低（单文件修改） |
| @xyflow 兼容性 | 兼容 React 18 | 无 |
| forks.ts 关系 | 复用上游 API | 中（需适配 adapter） |
| $sessionId 集成 | 条件渲染 | 低（最小侵入） |
| i18n 命名空间 | `gitline.` 前缀 | 低（重命名 key） |

**Phase 0 Status**: ✅ Complete  
**Ready for**: Phase 1 (Design & Contracts)
