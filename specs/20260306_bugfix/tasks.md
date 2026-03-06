# Tasks: 20260306_bugfix

**Input**: Design documents from `/specs/20260306_bugfix/`
**Prerequisites**: plan.md ✅, spec.md ✅, research.md ✅, data-model.md ✅, contracts/ ✅

**Tests**: Not requested — no test tasks included.

**Organization**: Tasks grouped by user story (US1–US6), priority order (P1 → P2 → P3).

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2)
- Exact file paths included in descriptions

## Path Conventions

- **Single Electron app**: `src/renderer/` (renderer process), `src/shared/` (shared types)

---

## Phase 1: Setup

**Purpose**: No new project setup needed — this is a bugfix batch on an existing codebase. This phase covers prerequisite verification only.

- [x] T001 Verify dev environment: run `npm install` and `npm run dev` at project root `e:/GitHub/chatbox_gitLine/`, confirm app launches without errors
- [x] T002 Verify branch is `GitTree-Function` and working tree is clean for bugfix work

**Checkpoint**: Dev environment confirmed working

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Shared type extension needed by US4 before story-level work

**⚠️ CRITICAL**: US4 depends on this type extension

- [X] T003 Extend `ExportChatScope` type to add `'active_path'` in `src/shared/types.ts` (or `src/shared/types/session.ts` — locate the existing `ExportChatScope` definition and add the new union member)

**Checkpoint**: Foundation ready — all user stories can proceed

---

## Phase 3: User Story 1 — Prompt 层级分叉创建 (Priority: P1) 🎯 MVP

**Goal**: 允许用户从 System Prompt 节点直接创建 Ask 子节点，支持 Output Handle 拖拽和右键菜单两种方式

**Independent Test**: 打开任意会话树状图，在 Prompt 节点上通过 Output Handle 和右键菜单分别创建 Ask 节点

### Implementation for User Story 1

- [X] T004 [US1] Modify `handleCreateUserNode` in `src/renderer/components/conversation-tree/ConversationTreeView.tsx` to correctly handle `role === 'system'` as fork parent — ensure `createNewFork` and `insertMessageAfter` receive the system message ID
- [X] T005 [US1] Update `NodeCreatePopover` in `src/renderer/components/conversation-tree/NodeCreatePopover.tsx` to display correct options when triggered from System node (show "Add User Message" + "Use Main Input", disable "Generate AI Response")
- [X] T006 [US1] Enable "添加分支" context menu option for System nodes in `src/renderer/components/conversation-tree/NodeActionBar.tsx` (or the context menu component) — currently may be filtered out for `role === 'system'`
- [X] T007 [US1] Verify `buildCreateForkPatch` in `src/renderer/lib/conversation-tree-adapter.ts` handles System message ID as `forkMessageId` — add support if needed

**Checkpoint**: US1 complete — user can fork from Prompt node via Handle drag and right-click menu

---

## Phase 4: User Story 2 — 重新生成统一使用当前模型配置 (Priority: P1)

**Goal**: 所有重新生成调用点统一读取当前底部模型配置（单模型/多模型），不使用节点原始模型

**Independent Test**: 分别在单模型和多模型配置下，对 Assistant 节点点击重新生成，验证结果与底部配置一致

### Implementation for User Story 2

- [X] T008 [P] [US2] Audit and fix regenerate in `src/renderer/components/conversation-tree/MessageDetailPanel.tsx` — ensure regenerate button reads `useMultiModelStore` and passes `multiModels` to `regenerateInNewFork`
- [X] T009 [P] [US2] Audit and fix regenerate in `src/renderer/components/Message.tsx` (list view) — ensure regenerate button reads `useMultiModelStore` and passes `multiModels` to `regenerateInNewFork`
- [X] T010 [P] [US2] Audit and fix regenerate in `src/renderer/components/conversation-tree/nodes/AssistantNode.tsx` — ensure inline regenerate button reads `useMultiModelStore` and passes `multiModels`
- [X] T011 [US2] Confirm `NodeActionBar.tsx` in `src/renderer/components/conversation-tree/NodeActionBar.tsx` already correctly passes `multiModels` (per research R2) — no change needed if already correct

**Checkpoint**: US2 complete — regeneration always uses current bottom-bar model config

---

## Phase 5: User Story 3 — 白天模式 UI 适配 (Priority: P2)

**Goal**: Light 模式下节点面板、节点卡片与画布背景有清晰视觉分隔

**Independent Test**: 切换 Light 模式，打开节点详情面板，验证面板边界清晰

### Implementation for User Story 3

- [X] T012 [P] [US3] Add light-mode border and shadow to `MessageDetailPanel` in `src/renderer/components/conversation-tree/MessageDetailPanel.tsx` — add `border border-gray-200 shadow-md` (or equivalent) for non-dark mode
- [X] T013 [P] [US3] Enhance light-mode contrast for `SystemNode` in `src/renderer/components/conversation-tree/nodes/SystemNode.tsx` — add border/background differentiation against white canvas
- [X] T014 [P] [US3] Enhance light-mode contrast for `UserNode` in `src/renderer/components/conversation-tree/nodes/UserNode.tsx` — add border/background differentiation
- [X] T015 [P] [US3] Enhance light-mode contrast for `AssistantNode` in `src/renderer/components/conversation-tree/nodes/AssistantNode.tsx` — add border/background differentiation
- [X] T016 [US3] Adjust light-mode canvas background in `src/renderer/components/conversation-tree/ConversationTreeView.tsx` — set `bg-gray-50` or similar to differentiate from white node cards

**Checkpoint**: US3 complete — Light mode visually distinct panels and nodes

---

## Phase 6: User Story 4 — 对话导出适配树状分支 (Priority: P2)

**Goal**: 支持将当前激活路径导出为 Markdown，通过原有导出菜单和树状图独立按钮两个入口

**Independent Test**: 在树状图中选中叶子节点，分别通过两个入口导出，验证 Markdown 仅含激活路径

### Implementation for User Story 4

- [X] T017 [US4] Implement `getActivePathMessages(session)` function in `src/renderer/lib/conversation-tree-adapter.ts` — traverse `messages` + `messageForksHash` following active `position` to extract ordered `Message[]` from root to active leaf
- [X] T018 [US4] Add `active_path` scope handling in `exportChat` function in `src/renderer/stores/sessionHelpers.ts` — when scope is `'active_path'`, call `getActivePathMessages` and construct single `SessionThread` for formatting
- [X] T019 [US4] Add "Active Path" scope option in `src/renderer/modals/ExportChat.tsx` — conditionally show when in tree-view mode (check `viewModeStore`), wire to `active_path` scope
- [X] T020 [US4] Add export button to `src/renderer/components/conversation-tree/TreeToolbar.tsx` — on click, directly export current active path as Markdown using `getActivePathMessages` + `formatChatAsMarkdown`

**Checkpoint**: US4 complete — active path exportable via both entry points

---

## Phase 7: User Story 5 — Detail 面板表格溢出修复 (Priority: P2)

**Goal**: Markdown 表格在 Detail 面板内可水平滚动，不撑破面板布局，面板可正常拖拽

**Independent Test**: 让 AI 生成含宽表格的回答，在 Detail 面板查看表格滚动和面板拖拽

### Implementation for User Story 5

- [X] T021 [P] [US5] Wrap `<table>` elements in `src/renderer/components/Markdown.tsx` with `<div style={{ overflowX: 'auto', maxWidth: '100%' }}>` container — modify the `table` component in react-markdown's `components` prop
- [X] T022 [P] [US5] Ensure content area in `src/renderer/components/conversation-tree/MessageDetailPanel.tsx` has `max-width: 100%` and `overflow: hidden` on the outer container to prevent table from pushing panel width

**Checkpoint**: US5 complete — tables scroll horizontally, panel drag works

---

## Phase 8: User Story 6 — 粘贴报错修复 (Priority: P3)

**Goal**: 粘贴 URL、图片文件、截图时不再报错，异常内容静默降级

**Independent Test**: 从浏览器粘贴 URL、从文件系统粘贴图片、从截图工具粘贴截图，无报错

### Implementation for User Story 6

- [x] T023 [US6] Add try-catch wrapper around entire `onPaste` handler in `src/renderer/components/InputBox/InputBox.tsx` — catch any unhandled exceptions and `console.warn` instead of throwing
- [x] T024 [US6] Add null check for `item.getAsFile()` return value before passing to `insertFiles` in `src/renderer/components/InputBox/InputBox.tsx` — filter out null files
- [x] T025 [US6] Add empty array filtering for `insertFiles` and `insertLinks` inputs in `src/renderer/components/InputBox/InputBox.tsx` — skip calls when arrays are empty
- [x] T026 [US6] Add exception protection in `item.getAsString()` callback in `src/renderer/components/InputBox/InputBox.tsx` — wrap callback body in try-catch

**Checkpoint**: US6 complete — all paste operations error-free

---

## Phase 9: Polish & Cross-Cutting Concerns

**Purpose**: Final validation across all stories

- [ ] T027 Run `npm run dev` and perform full manual test per `specs/20260306_bugfix/quickstart.md` validation steps (all 7 items)
- [ ] T028 Verify no TypeScript compilation errors: run `npx tsc --noEmit` at project root

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — start immediately
- **Foundational (Phase 2)**: Depends on Phase 1 — BLOCKS US4 only
- **US1 (Phase 3)**: Depends on Phase 1 only — independent
- **US2 (Phase 4)**: Depends on Phase 1 only — independent
- **US3 (Phase 5)**: Depends on Phase 1 only — independent
- **US4 (Phase 6)**: Depends on Phase 2 (T003 type extension)
- **US5 (Phase 7)**: Depends on Phase 1 only — independent
- **US6 (Phase 8)**: Depends on Phase 1 only — independent
- **Polish (Phase 9)**: Depends on all previous phases

### User Story Dependencies

```
Phase 1 (Setup)
    │
    ├── Phase 2 (Foundational: T003) ──→ Phase 6 (US4)
    │
    ├── Phase 3 (US1) ──┐
    ├── Phase 4 (US2) ──┤
    ├── Phase 5 (US3) ──┼──→ Phase 9 (Polish)
    ├── Phase 7 (US5) ──┤
    └── Phase 8 (US6) ──┘
```

- **US1, US2, US3, US5, US6**: Fully independent — can run in parallel
- **US4**: Depends on T003 (type extension) — can run in parallel with US1–US3 after T003

### Within Each User Story

- Tasks marked [P] within a story can run in parallel
- Non-[P] tasks must execute sequentially within their story

### Parallel Opportunities

- **Max parallelism**: After T003, all 6 user stories can proceed simultaneously
- **Within US2**: T008, T009, T010 can all run in parallel (different files)
- **Within US3**: T012, T013, T014, T015 can all run in parallel (different files)
- **Within US5**: T021, T022 can run in parallel (different files)

---

## Parallel Example: After Setup + Foundational

```bash
# All these can launch simultaneously:
Task T004: [US1] ConversationTreeView.tsx — system node fork support
Task T008: [US2] MessageDetailPanel.tsx — regenerate multiModel audit
Task T009: [US2] Message.tsx — regenerate multiModel audit
Task T012: [US3] MessageDetailPanel.tsx — light mode border/shadow
Task T013: [US3] SystemNode.tsx — light mode contrast
Task T017: [US4] conversation-tree-adapter.ts — getActivePathMessages
Task T021: [US5] Markdown.tsx — table overflow wrapper
Task T023: [US6] InputBox.tsx — paste try-catch
```

---

## Implementation Strategy

### MVP First (US1 + US2 — P1 Core)

1. Complete Phase 1: Setup verification
2. Complete Phase 2: Foundational type extension
3. Complete Phase 3: US1 — Prompt fork creation
4. Complete Phase 4: US2 — Regenerate model config
5. **STOP and VALIDATE**: Test US1 + US2 independently
6. Core functionality fixed

### Incremental Delivery

1. Setup + Foundational → Foundation ready
2. US1 (Prompt fork) → Test → **P1 milestone**
3. US2 (Regenerate) → Test → **P1 complete**
4. US3 (Light UI) + US5 (Table fix) → Test → **P2 visual fixes**
5. US4 (Export) → Test → **P2 feature complete**
6. US6 (Paste fix) → Test → **P3 stability**
7. Polish → Full validation → **All done**

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story
- Each user story independently completable and testable
- No new dependencies introduced
- ~15 files modified total
- Commit after each user story completion for clean git history
