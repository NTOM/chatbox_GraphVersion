# Implementation Plan: 20260306_bugfix

**Branch**: `GitTree-Function` | **Date**: 2026-03-06 | **Spec**: [specs/20260306_bugfix/spec.md](./spec.md)
**Input**: Feature specification from `/specs/20260306_bugfix/spec.md`

**Note**: This plan covers 6 bugfix items. No new branch created per user request.

## Summary

修复树状图对话系统的 6 个 bug：Prompt 层级分叉创建、重新生成模型配置统一、白天模式 UI 适配、对话导出适配树状分支、Detail 面板表格溢出修复、粘贴报错修复。所有修改均在现有 `conversation-tree` 模块内完成，不新增外部依赖，不修改数据结构。

## Technical Context

**Language/Version**: TypeScript 5.8  
**Primary Dependencies**: React 18.2, @xyflow/react (ReactFlow), Mantine 7.x, Zustand, Jotai, Tailwind CSS 3.x, react-markdown  
**Storage**: electron-store (主进程) + localStorage (渲染进程 Zustand persist)  
**Testing**: Vitest (可选), 手动测试为主  
**Target Platform**: Electron 26.x (Windows/macOS/Linux 桌面端)  
**Project Type**: desktop-app (Electron + React)  
**Performance Goals**: N/A (bugfix, 不涉及性能指标变更)  
**Constraints**: 不引入新依赖，修改范围限制在 tree-view 模块和相关适配层  
**Scale/Scope**: 6 个 bug，涉及 ~15 个文件

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Notes |
|-----------|--------|-------|
| I. Upstream-Compatible Architecture | ✅ PASS | 所有修改在 `conversation-tree/` 和适配层内，不改动上游文件结构 |
| II. Fork Discipline | ✅ PASS | 在当前 `GitTree-Function` 分支工作，不创建新分支，不向上游提 PR |
| III. Tree-View Feature Isolation | ✅ PASS | Bug 修复均在 tree-view 命名空间内，唯一跨模块修改是 `Markdown.tsx` 的表格溢出（通用改进）和 `InputBox.tsx` 的粘贴修复（通用改进） |
| IV. Multi-Model & Context Freedom | ✅ PASS | US2 修复统一了重新生成的多模型行为，US1 增强了分叉能力 |
| V. Simplicity & YAGNI | ✅ PASS | 不引入新依赖，复用现有导出格式化函数和 fork 机制 |

## Project Structure

### Documentation (this feature)

```text
specs/20260306_bugfix/
├── plan.md              # This file
├── spec.md              # Feature specification
├── research.md          # Phase 0 research findings
├── data-model.md        # Phase 1 data model
├── quickstart.md        # Phase 1 quickstart guide
├── contracts/
│   └── ui-contracts.md  # Phase 1 UI contracts
└── checklists/
    └── requirements.md  # Quality checklist
```

### Source Code (repository root)

```text
src/
├── renderer/
│   ├── components/
│   │   ├── conversation-tree/
│   │   │   ├── ConversationTreeView.tsx    # US1: System 节点分叉逻辑
│   │   │   ├── NodeCreatePopover.tsx       # US1: System 节点 Popover 适配
│   │   │   ├── NodeActionBar.tsx           # US1: 右键菜单 + US2: 重新生成
│   │   │   ├── MessageDetailPanel.tsx      # US2: 重新生成 + US3: Light UI + US5: 表格
│   │   │   ├── TreeToolbar.tsx             # US4: 导出按钮
│   │   │   └── nodes/
│   │   │       ├── SystemNode.tsx          # US3: Light mode 对比度
│   │   │       ├── UserNode.tsx            # US3: Light mode 对比度
│   │   │       └── AssistantNode.tsx       # US3: Light mode 对比度
│   │   ├── Markdown.tsx                    # US5: 表格 overflow 修复
│   │   ├── Message.tsx                     # US2: 重新生成 multiModel 确认
│   │   └── InputBox/
│   │       └── InputBox.tsx                # US6: 粘贴报错修复
│   ├── lib/
│   │   └── conversation-tree-adapter.ts    # US4: getActivePathMessages
│   ├── stores/
│   │   ├── sessionHelpers.ts              # US4: exportChat active_path
│   │   └── sessionActions.ts              # US4: exportSessionChat
│   └── modals/
│       └── ExportChat.tsx                  # US4: 新增 active_path scope
└── shared/
    └── types.ts (或 types/session.ts)      # US4: ExportChatScope 扩展
```

**Structure Decision**: 单项目桌面应用，所有修改在现有 `src/renderer/` 结构内，遵循上游文件布局。

## Phase 2: Implementation Tasks (Summary)

### Task Group 1: P1 — 核心功能修复

**Task 1.1: Prompt 层级分叉创建 (US1)**
- 修改 `ConversationTreeView.tsx` — 确保 `handleCreateUserNode` 和 `handleCreateAssistantNode` 正确处理 `role === 'system'` 的节点
- 修改 `NodeCreatePopover.tsx` — 确认 System 节点的 Popover 只显示 "Add User Message"
- 修改 `NodeActionBar.tsx` 或上下文菜单 — 为 System 节点启用 "添加分支" 选项
- 验证 `buildCreateForkPatch` 对 System 消息 ID 的兼容性

**Task 1.2: 重新生成统一使用当前模型配置 (US2)**
- 审查所有 `regenerateInNewFork` 调用点
- 确认 `MessageDetailPanel.tsx` 中的重新生成按钮传递 `multiModels`
- 确认 `Message.tsx`（列表视图）中的重新生成按钮传递 `multiModels`
- 确认 `AssistantNode.tsx` 内联按钮传递 `multiModels`

### Task Group 2: P2 — 体验优化

**Task 2.1: 白天模式 UI 适配 (US3)**
- `MessageDetailPanel.tsx` — Light 模式增加边框 (`border`) 和投影 (`shadow-md`)
- `SystemNode.tsx` / `UserNode.tsx` / `AssistantNode.tsx` — 增强 Light 模式节点边框和背景对比
- `ConversationTreeView.tsx` — 调整 Light 模式画布背景色（如 `bg-gray-50`）

**Task 2.2: 对话导出适配 (US4)**
- 扩展 `ExportChatScope` 类型增加 `'active_path'`
- 在 `conversation-tree-adapter.ts` 中新增 `getActivePathMessages(session)` 函数
- 在 `sessionHelpers.ts` 的 `exportChat` 中增加 `active_path` scope 处理
- 在 `ExportChat.tsx` 中新增 scope 选项（条件显示：仅树视图模式）
- 在 `TreeToolbar.tsx` 中新增导出按钮

**Task 2.3: Detail 面板表格修复 (US5)**
- `Markdown.tsx` — 为 GFM 表格渲染添加 `overflow-x: auto` 包裹容器
- `MessageDetailPanel.tsx` — 确保内容区域 `max-width: 100%` 和正确的 overflow 行为

### Task Group 3: P3 — 稳定性修复

**Task 3.1: 粘贴报错修复 (US6)**
- `InputBox.tsx` — `onPaste` 函数添加 try-catch 包裹
- 对 `item.getAsFile()` 返回值做 null 检查
- 对 `insertFiles` / `insertLinks` 输入做空值过滤
- `item.getAsString()` 回调中添加异常保护

## Complexity Tracking

> No constitution violations detected. No complexity justification needed.

| Check | Result |
|-------|--------|
| New dependencies | None |
| Upstream file modifications | `Markdown.tsx` (通用改进), `InputBox.tsx` (通用改进), `ExportChat.tsx` (新增选项) — 均为增量修改 |
| Data migration | None |
| Breaking changes | None |
