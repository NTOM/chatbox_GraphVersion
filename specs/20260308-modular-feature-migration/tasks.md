# Tasks: Modular Feature Migration

**Input**: Design documents from `/specs/20260308-modular-feature-migration/`
**Prerequisites**: plan.md ✅, spec.md ✅, research.md ✅, data-model.md ✅, quickstart.md ✅

**Tests**: Not requested in feature specification — test tasks omitted.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3, US4)
- Include exact file paths in descriptions

## Path Conventions

- **Single Electron project**: `src/renderer/` at repository root
- Source branch for custom files: `GitTree-Function`
- Target base: `upstream/main`

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: 从 upstream/main 创建干净的迁移工作分支，安装必要依赖

- [x] T001 Fetch upstream and create migration branch from upstream/main (`git fetch upstream && git checkout -b feature/gitline-v2 upstream/main`)
- [x] T002 Add @xyflow/react dependency in `package.json` (`pnpm add @xyflow/react@^12.10.0`)
- [x] T003 Run `pnpm install` and verify clean dependency resolution (no peer dependency errors)

**Checkpoint**: 干净的 upstream/main 分支 + @xyflow/react 已安装，`pnpm build` 应通过

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: 复制所有纯新增的自定义文件（不修改任何上游文件），建立模块化目录结构

**⚠️ CRITICAL**: 本阶段只复制新文件，不修改任何上游文件。所有上游文件修改在 User Story 阶段进行。

### 数据层 & 状态管理

- [x] T004 [P] Copy and adapt `src/renderer/lib/conversation-tree-adapter.ts` from GitTree-Function branch — update imports to match upstream's `stores/session/forks.ts` API (`findMessageLocation`, `createNewFork`, `switchFork`)
- [x] T005 [P] Copy and adapt `src/renderer/lib/tree-layout.ts` from GitTree-Function branch — verify dagre/custom layout algorithm compatibility
- [x] T006 [P] Copy and adapt `src/renderer/stores/viewModeStore.ts` from GitTree-Function branch — Zustand store with persist middleware for ViewMode ('list' | 'tree')
- [x] T007 [P] Copy and adapt `src/renderer/stores/multiModelStore.ts` from GitTree-Function branch — Zustand store for multi-model selection state

### 对话树核心组件 (conversation-tree/)

- [x] T008 [P] Copy `src/renderer/components/conversation-tree/utils/branchColors.ts` from GitTree-Function branch — branch color palette constants
- [x] T009 [P] Copy `src/renderer/components/conversation-tree/utils/index.ts` from GitTree-Function branch — utility barrel export
- [x] T010 [P] Copy and adapt `src/renderer/components/conversation-tree/edges/DefaultEdge.tsx` from GitTree-Function branch — default edge component for ReactFlow
- [x] T011 [P] Copy and adapt `src/renderer/components/conversation-tree/edges/BranchEdge.tsx` from GitTree-Function branch — colored branch edge component
- [x] T012 [P] Copy and adapt `src/renderer/components/conversation-tree/edges/ActivePathEdge.tsx` from GitTree-Function branch — active path highlight edge
- [x] T013 [P] Copy `src/renderer/components/conversation-tree/edges/index.ts` from GitTree-Function branch — edges barrel export
- [x] T014 [P] Copy and adapt `src/renderer/components/conversation-tree/nodes/UserNode.tsx` from GitTree-Function branch — user message node component
- [x] T015 [P] Copy and adapt `src/renderer/components/conversation-tree/nodes/AssistantNode.tsx` from GitTree-Function branch — assistant message node component
- [x] T016 [P] Copy and adapt `src/renderer/components/conversation-tree/nodes/SystemNode.tsx` from GitTree-Function branch — system message node component
- [x] T017 [P] Copy `src/renderer/components/conversation-tree/nodes/index.ts` from GitTree-Function branch — nodes barrel export

### 对话树交互组件

- [x] T018 [P] Copy and adapt `src/renderer/components/conversation-tree/NodeActionBar.tsx` from GitTree-Function branch — node context action buttons (copy, edit, delete)
- [x] T019 [P] Copy and adapt `src/renderer/components/conversation-tree/MessageDetailPanel.tsx` from GitTree-Function branch — selected message detail display panel
- [x] T020 [P] Copy and adapt `src/renderer/components/conversation-tree/MessageDetailDrawer.tsx` from GitTree-Function branch — message detail drawer (mobile/compact layout)
- [x] T021 [P] Copy and adapt `src/renderer/components/conversation-tree/NodeCreatePopover.tsx` from GitTree-Function branch — create new node/branch popover
- [x] T022 [P] Copy and adapt `src/renderer/components/conversation-tree/TargetNodeSelector.tsx` from GitTree-Function branch — target node selection UI
- [x] T023 [P] Copy and adapt `src/renderer/components/conversation-tree/SelectionBoundingBox.tsx` from GitTree-Function branch — multi-select bounding box
- [x] T024 [P] Copy and adapt `src/renderer/components/conversation-tree/TextSelectionQuote.tsx` from GitTree-Function branch — text selection quote UI
- [x] T025 [P] Copy and adapt `src/renderer/components/conversation-tree/TreeToolbar.tsx` from GitTree-Function branch — tree view toolbar (zoom, fit, reset)
- [x] T026 [P] Copy and adapt `src/renderer/components/conversation-tree/ViewModeSwitch.tsx` from GitTree-Function branch — list/tree toggle switch component

### 主视图组件 & 多模型组件

- [x] T027 Copy and adapt `src/renderer/components/conversation-tree/ConversationTreeView.tsx` from GitTree-Function branch — main tree view container (ReactFlow provider, import `@xyflow/react/dist/style.css`), depends on T004-T026
- [x] T028 [P] Copy `src/renderer/components/conversation-tree/index.ts` from GitTree-Function branch — conversation-tree barrel export
- [x] T029 [P] Copy and adapt `src/renderer/components/MultiBranchIndicator.tsx` from GitTree-Function branch — branch indicator badge component
- [x] T030 [P] Copy and adapt `src/renderer/components/MultiModelSelector/index.tsx` from GitTree-Function branch — multi-model selector dropdown
- [x] T031 [P] Copy and adapt `src/renderer/components/MultiModelToggle.tsx` from GitTree-Function branch — multi-model toggle button

### 构建验证

- [x] T032 Run TypeScript type check (`pnpm check`) — fix all import path errors and type mismatches against upstream types in `@shared/types`
- [x] T033 Run lint check (`pnpm lint`) — fix all lint errors in new files
- [x] T034 Run build (`pnpm build`) — verify successful compilation with all new files

**Checkpoint**: 所有 28 个新文件已复制并适配，构建通过。但尚未集成到上游页面（功能不可见）

---

## Phase 3: User Story 1 — 对话树视图完整迁移 (Priority: P1) 🎯 MVP

**Goal**: 用户可以在会话页面切换到树形视图，看到对话以树状结构呈现，节点可点击、可展开、分支有颜色区分

**Independent Test**: 启动 `pnpm dev`，打开任意对话，在 Toolbar 找到视图切换按钮，点击切换到树形视图，验证节点渲染、分支颜色、活跃路径高亮

### Implementation for User Story 1

- [x] T035 [US1] Modify `src/renderer/components/layout/Toolbar.tsx` — add `// [GitLine]` import for ViewModeSwitch, add tree/list toggle ActionIcon button next to existing toolbar buttons
- [x] T036 [US1] Modify `src/renderer/routes/session/$sessionId.tsx` — add `// [GitLine]` conditional rendering: import viewModeStore and ConversationTreeView, render `{viewMode === 'tree' ? <ConversationTreeView session={session} /> : <MessageList ... />}`
- [x] T037 [US1] Verify adapter integration — ensure `conversation-tree-adapter.ts` correctly calls upstream `stores/session/forks.ts` functions (`findMessageLocation`, `createNewFork`, `switchFork`) and `stores/sessionHelpers.ts` (`getAllMessageList`)
- [ ] T038 [US1] Functional verification — run `pnpm dev`, test: (1) view toggle button visible in Toolbar, (2) tree view renders nodes and edges, (3) click node shows MessageDetailPanel, (4) branches use different colors, (5) active path is highlighted
- [x] T039 [US1] Run `pnpm build` — verify no compilation errors after upstream file modifications

**Checkpoint**: 对话树视图 MVP 完成 — 视图切换、节点交互、分支高亮全部可用

---

## Phase 4: User Story 2 — 模块化代码组织迁移 (Priority: P1)

**Goal**: 所有自定义功能代码位于独立目录，对上游文件的修改处都有 `// [GitLine]` 标记注释，方便未来同步上游更新

**Independent Test**: 搜索 `// [GitLine]` 标记覆盖所有上游修改点；`conversation-tree/` 目录结构完整且自包含

### Implementation for User Story 2

- [x] T040 [US2] Audit all modified upstream files — search for missing `// [GitLine]` markers in `src/renderer/components/layout/Toolbar.tsx`, `src/renderer/routes/session/$sessionId.tsx`, `package.json`
- [x] T041 [US2] Add `// [GitLine]` block comment markers to `package.json` — mark @xyflow/react dependency line with inline comment (N/A: JSON does not support comments; documented in migration-log instead)
- [x] T042 [US2] Verify directory isolation — confirm all 21 files in `src/renderer/components/conversation-tree/` are self-contained; confirm `src/renderer/lib/conversation-tree-adapter.ts`, `src/renderer/lib/tree-layout.ts`, `src/renderer/stores/viewModeStore.ts`, `src/renderer/stores/multiModelStore.ts` exist as independent modules
- [x] T043 [P] [US2] Verify barrel exports — confirm `src/renderer/components/conversation-tree/index.ts` exports all public components; confirm `edges/index.ts` and `nodes/index.ts` export all sub-components
- [x] T044 [US2] Run `grep -r "\[GitLine\]" src/renderer/ --include="*.tsx" --include="*.ts"` — verify all upstream modification points have markers, count should match number of modified upstream files (minimum 3: Toolbar.tsx, $sessionId.tsx, and any other modified files)

**Checkpoint**: 代码模块化组织完成 — [GitLine] 标记完整，目录结构清晰

---

## Phase 5: User Story 3 — 迁移文档与追溯 (Priority: P2)

**Goal**: 为每个迁移的功能模块留下文档记录，说明原提交内容、迁移决策、适配修改

**Independent Test**: `specs/20260308-modular-feature-migration/migration-log.md` 存在且覆盖全部 18 个原提交

### Implementation for User Story 3

- [x] T045 [US3] Create `specs/20260308-modular-feature-migration/migration-log.md` — document header with migration overview, date, branch info
- [x] T046 [US3] Document Phase 1 commits in migration-log.md — `f31c095` (基础框架): list files migrated, import path changes, adaptation decisions
- [x] T047 [US3] Document Phase 2 commits in migration-log.md — `8637cb8` (分支边/高亮): list files, describe branchColors and ActivePathEdge adaptations
- [x] T048 [US3] Document Phase 3 commits in migration-log.md — `58ea3d4`, `29c1a20`, `da7634c` (交互组件): list files, describe NodeActionBar, MessageDetailPanel, NodeCreatePopover adaptations
- [x] T049 [US3] Document remaining commits in migration-log.md — Release commits (`5673d08`, `1d1a13b`), bugfix (`8872e9d`), and all other commits; note conflicts encountered and resolution decisions
- [x] T050 [US3] Add summary table to migration-log.md — table mapping each of 18 original commits to: status (migrated/adapted/skipped), files affected, key decisions

**Checkpoint**: 迁移日志完成 — 18 个原提交全部有记录

---

## Phase 6: User Story 4 — 依赖管理与构建验证 (Priority: P2)

**Goal**: 确保新增依赖正确配置，应用能够正常构建和运行，无编译错误和运行时错误

**Independent Test**: `pnpm install && pnpm build && pnpm dev` 全部成功，无 TypeScript 错误、无 ESLint 新增错误

### Implementation for User Story 4

- [x] T051 [US4] Verify `package.json` — confirm @xyflow/react@^12.10.0 is in dependencies (not devDependencies), no conflicting peer dependency versions
- [x] T052 [US4] Run full dependency audit — `pnpm install` with no warnings; verify no peer dependency conflicts between @xyflow/react, React 18, and other dependencies
- [x] T053 [US4] Run `pnpm check` (TypeScript) — zero errors; fix any remaining type mismatches
- [x] T054 [US4] Run `pnpm lint` — zero new lint errors introduced by migration; fix any issues
- [x] T055 [US4] Run `pnpm build` — successful production build with no warnings related to GitLine files
- [ ] T056 [US4] Run `pnpm dev` — application starts without runtime errors; verify Electron window opens and basic navigation works

**Checkpoint**: 构建和运行验证完成 — 全部通过

---

## Phase 7: User Story 1+2 — i18n 国际化 (Cross-cutting for US1 & US2)

**Goal**: 为对话树功能添加国际化支持，使用 `gitline.` 命名空间前缀避免与上游 key 冲突

**Independent Test**: 切换语言后，对话树相关 UI 文本正确显示对应语言

### Implementation

- [x] T057 [P] [US1] Add GitLine i18n keys to `src/renderer/i18n/locales/en/translation.json` — add `gitline.treeView`, `gitline.listView`, `gitline.activePath`, `gitline.branchColors`, `gitline.nodeActions` and all other tree-related UI text with `// [GitLine]` comment in JSON (or grouped section)
- [x] T058 [P] [US1] Add GitLine i18n keys to `src/renderer/i18n/locales/zh-Hans/translation.json` — matching Chinese translations for all `gitline.*` keys
- [x] T059 [US1] Update conversation-tree components to use `useTranslation()` with `gitline.*` keys — replace all hardcoded strings in ConversationTreeView, TreeToolbar, ViewModeSwitch, NodeActionBar, MessageDetailPanel, etc.
- [x] T060 [US2] Verify i18n key isolation — confirm no `gitline.*` key conflicts with upstream keys; confirm all GitLine i18n entries are clearly grouped/marked

**Checkpoint**: 国际化完成 — 中英文双语支持

---

## Phase 8: Polish & Cross-Cutting Concerns

**Purpose**: 最终打磨和跨 Story 验证

- [x] T061 [P] Code cleanup — remove any debug `console.log` statements, unused imports, and TODO comments in all GitLine files under `src/renderer/components/conversation-tree/`, `src/renderer/lib/`, `src/renderer/stores/`
- [ ] T062 Full integration test — run `pnpm dev`, execute complete test scenario: (1) open session, (2) switch to tree view, (3) click nodes, (4) verify branch colors, (5) switch back to list view, (6) verify list still works, (7) create new message and verify tree updates
- [ ] T063 Performance check — open a conversation with 50+ messages, switch to tree view, verify rendering completes within 1 second (SC-007)
- [x] T064 Final build validation — `pnpm install && pnpm check && pnpm lint && pnpm build` all pass with zero errors
- [x] T065 Update spec status — update `specs/20260308-modular-feature-migration/spec.md` status from "Draft" to "Complete", update plan.md Generated Artifacts table
- [x] T066 Run quickstart.md validation — follow all steps in `specs/20260308-modular-feature-migration/quickstart.md` File Checklist, confirm all 28 new files + 5 modified files are present

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — can start immediately
- **Foundational (Phase 2)**: Depends on Phase 1 completion — BLOCKS all user stories
- **US1 (Phase 3)**: Depends on Phase 2 — core functionality
- **US2 (Phase 4)**: Depends on Phase 3 — audits modifications made in Phase 3
- **US3 (Phase 5)**: Depends on Phase 2 — can start in parallel with Phase 3/4
- **US4 (Phase 6)**: Depends on Phase 3 — validates full build after integration
- **i18n (Phase 7)**: Depends on Phase 3 — requires component integration to be done
- **Polish (Phase 8)**: Depends on all previous phases

### User Story Dependencies

```
Phase 1 (Setup)
    │
    ▼
Phase 2 (Foundational) ──── BLOCKS ALL ────┐
    │                                       │
    ▼                                       ▼
Phase 3 (US1: 对话树迁移) ◄─────── Phase 5 (US3: 文档追溯)
    │                              (可与 Phase 3 并行)
    ▼
Phase 4 (US2: 模块化组织)
    │
    ├──► Phase 6 (US4: 构建验证)
    │
    └──► Phase 7 (i18n 国际化)
              │
              ▼
         Phase 8 (Polish)
```

### Within Each Phase

- Tasks marked [P] can run in parallel (different files, no dependencies)
- Tasks without [P] must be executed sequentially
- Complete current phase before moving to next

### Parallel Opportunities

**Phase 2** has maximum parallelism:
- T004-T007 (data layer) — all [P], different files
- T008-T017 (core components) — all [P], different files
- T018-T031 (interaction components) — all [P], different files
- Only T027 (main view), T032-T034 (build verification) are sequential

**Cross-phase parallelism**:
- Phase 5 (US3: documentation) can start as soon as Phase 2 begins
- Phase 4 (US2: audit) and Phase 7 (i18n) can run in parallel after Phase 3

---

## Parallel Example: Phase 2 (Foundational)

```bash
# Batch 1: All data layer and utility files (parallel)
Task T004: "Copy and adapt conversation-tree-adapter.ts"
Task T005: "Copy and adapt tree-layout.ts"
Task T006: "Copy and adapt viewModeStore.ts"
Task T007: "Copy and adapt multiModelStore.ts"
Task T008: "Copy branchColors.ts"
Task T009: "Copy utils/index.ts"

# Batch 2: All edge and node components (parallel)
Task T010: "Copy DefaultEdge.tsx"
Task T011: "Copy BranchEdge.tsx"
Task T012: "Copy ActivePathEdge.tsx"
Task T014: "Copy UserNode.tsx"
Task T015: "Copy AssistantNode.tsx"
Task T016: "Copy SystemNode.tsx"

# Batch 3: All interaction components (parallel)
Task T018-T026: All interaction components

# Batch 4: Main view (sequential, depends on batch 1-3)
Task T027: "Copy ConversationTreeView.tsx"
Task T028-T031: "Barrel export + Multi* components"

# Batch 5: Build verification (sequential)
Task T032-T034: "pnpm check → pnpm lint → pnpm build"
```

---

## Implementation Strategy

### MVP First (Phase 1 + 2 + 3 = US1 Only)

1. Complete Phase 1: Setup (create branch, add dependency)
2. Complete Phase 2: Foundational (copy all 28 new files, build passes)
3. Complete Phase 3: User Story 1 (integrate into Toolbar + $sessionId)
4. **STOP and VALIDATE**: Test tree view switching, node interaction, branch colors
5. This is the **Minimum Viable Migration** — tree view works on latest upstream

### Incremental Delivery

1. Setup + Foundational → All new files in place, builds pass
2. + US1 (Phase 3) → Tree view works → **MVP milestone** ✅
3. + US2 (Phase 4) → Code organization audited, [GitLine] markers complete
4. + i18n (Phase 7) → Multi-language support for tree view
5. + US3 (Phase 5) → Migration documentation complete
6. + US4 (Phase 6) → Full build/run verification
7. + Polish (Phase 8) → Final cleanup and validation

### Single Developer Strategy

Since this is a solo developer project:
1. Follow phases sequentially in priority order
2. Leverage [P] parallel tasks within each phase for batch operations
3. US3 (documentation) can be done incrementally alongside other phases
4. Aim for MVP (US1 complete) as first milestone before proceeding

---

## Notes

- [P] tasks = different files, no dependencies on incomplete tasks
- [Story] label maps task to specific user story for traceability
- Each user story should be independently completable and testable
- All upstream file modifications MUST include `// [GitLine]` marker
- Commit after each phase completion for clean git history
- "Copy and adapt" means: `git checkout GitTree-Function -- <path>`, then update imports/types to match upstream
- Stop at any checkpoint to validate story independently
