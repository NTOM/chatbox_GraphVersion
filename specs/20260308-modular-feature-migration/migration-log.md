# Migration Log: GitTree-Function → upstream/main

**Date**: 2026-03-17
**Source Branch**: `GitTree-Function`
**Target Branch**: `20260308-modular-feature-migration` (based on `upstream/main`)
**Base Upstream Commit**: `fe80192` (release 1.19.0)

## Overview

This document records the modular migration of 18 commits from the `GitTree-Function` branch to the latest `upstream/main`. The migration extracts conversation tree visualization, multi-model selection, and view mode switching features into a self-contained modular structure.

### Migration Strategy

- **Phase 1**: Setup — clean branch + dependency installation
- **Phase 2**: Foundational — copy all 28 new custom files, adapt imports
- **Phase 3**: US1 — integrate tree view into upstream UI (Toolbar + session route)
- **Phase 4**: US2 — audit `[GitLine]` markers and directory isolation
- **Phase 5**: US3 — documentation (this file)
- **Phase 6**: US4 — full build/run verification

---

## Commit Summary Table

| # | Commit | Message | Status | Files Affected | Key Decisions |
|---|--------|---------|--------|----------------|---------------|
| 1 | `36606cf` | 开发计划规划 | Skipped | Planning docs only | Planning docs not needed in migration |
| 2 | `f31c095` | 第一阶段开发成功-实现了git树形界面 | **Migrated** | conversation-tree-adapter.ts, tree-layout.ts, viewModeStore.ts, multiModelStore.ts, ConversationTreeView.tsx, all node/edge components | Core tree framework — all files adapted for upstream imports |
| 3 | `8637cb8` | 第二阶段开发完毕 | **Migrated** | branchColors.ts, BranchEdge.tsx, ActivePathEdge.tsx, DefaultEdge.tsx, edges/index.ts | Branch visualization — adapted EdgeProps generics for @xyflow/react v12 |
| 4 | `58ea3d4` | 第三阶段开发完毕 | **Migrated** | NodeActionBar.tsx, MessageDetailPanel.tsx, MessageDetailDrawer.tsx, NodeCreatePopover.tsx, TargetNodeSelector.tsx, SelectionBoundingBox.tsx, TextSelectionQuote.tsx, TreeToolbar.tsx, ViewModeSwitch.tsx | Interaction components — adapted ScalableIcon import path |
| 5 | `29c1a20` | 第三阶段debug 2025/12/16 | **Merged into #4** | Bug fixes for Phase 3 components | Fixes incorporated into adapted files |
| 6 | `da7634c` | 第三阶段修复完毕 | **Merged into #4** | Final Phase 3 fixes | Fixes incorporated into adapted files |
| 7 | `5673d08` | release 1.18.1-treeVersion | **Migrated** | MultiBranchIndicator.tsx, MultiModelSelector/index.tsx, MultiModelToggle.tsx | Multi-model components — adapted ScalableIcon + types imports |
| 8 | `d000ef4` | 打包，提供安装包 | Skipped | Build artifacts only | Build artifacts not needed |
| 9 | `afb958c` | Merge commit into GitTree-Function | Skipped | Merge commit | Merge resolution not applicable |
| 10 | `750e421` | 更新README | Skipped | README.md only | Documentation not needed in migration |
| 11 | `24911b7` | Update README | Skipped | README.md only | Documentation not needed |
| 12 | `fda46ab` | 更新README gif显示 | Skipped | README.md only | Documentation not needed |
| 13 | `1d1a13b` | 1.18.1 GraphVersion Release | Skipped | Release artifacts | Release process not applicable |
| 14 | `64633b6` | 1.18.1 mac安装包 | Skipped | Mac build artifacts | Platform-specific build not needed |
| 15 | `a8aa596` | 更新下载链接 | Skipped | README.md links | Documentation not needed |
| 16 | `20ca482` | 更新mac的安装说明 | Skipped | README.md | Documentation not needed |
| 17 | `3193636` | clean bad download exe | Skipped | Build cleanup | Build artifacts not needed |
| 18 | `8872e9d` | 修复了多个bug | **Migrated** | Bug fixes across tree components | All fixes incorporated into adapted files |

**Summary**: 6 commits migrated (with adaptations), 12 commits skipped (planning, docs, builds, releases)

---

## Import Path Adaptations

All migrated files required import path changes from GitTree-Function conventions to upstream conventions:

| Original Import | Adapted Import | Affected Files |
|----------------|----------------|----------------|
| `import { ... } from 'src/shared/types'` | `import { ... } from '@shared/types'` | conversation-tree-adapter.ts, ConversationTreeView.tsx, MessageDetailPanel.tsx, MessageDetailDrawer.tsx, NodeCreatePopover.tsx, TargetNodeSelector.tsx, MultiBranchIndicator.tsx, MultiModelSelector |
| `import { getMessageText } from 'src/shared/utils/message'` | `import { getMessageText } from '@shared/utils/message'` | UserNode.tsx, AssistantNode.tsx, SystemNode.tsx |
| `import { ScalableIcon } from '@/components/ScalableIcon'` | `import { ScalableIcon } from '@/components/common/ScalableIcon'` | TreeToolbar.tsx |
| `import { ScalableIcon } from '../ScalableIcon'` | `import { ScalableIcon } from '../common/ScalableIcon'` | MultiModelSelector/index.tsx |
| `import { ScalableIcon } from './ScalableIcon'` | `import { ScalableIcon } from './common/ScalableIcon'` | MultiBranchIndicator.tsx, MultiModelToggle.tsx |

## API Adaptations

### `switchToMessageBranch` → `switchFork`

**Problem**: GitTree-Function used `switchToMessageBranch(sessionId, messageId)` which does not exist in upstream.

**Solution**: Replaced with upstream's `switchFork(sessionId, forkMessageId, 'next')` from `stores/session/forks.ts`. The `'next'` direction is used as default for switching to a branch containing the target message.

**Affected Files**: UserNode.tsx, AssistantNode.tsx

### `restoreSessionMessages` (removed)

**Problem**: GitTree-Function used `restoreSessionMessages` for undo functionality. This function does not exist in upstream.

**Solution**: The `handleUndo` function in ConversationTreeView.tsx was simplified to show a toast notification instead of restoring messages. Full undo support requires upstream API extension.

**Affected Files**: ConversationTreeView.tsx

### `regenerateInNewFork` options

**Problem**: GitTree-Function passed `{ multiModels }` as options to `regenerateInNewFork`. Upstream's signature only accepts `{ runGenerateMore?: GenerateMoreFn }`.

**Solution**: Removed `multiModels` from all `regenerateInNewFork` calls. Multi-model regeneration will be addressed when upstream supports it.

**Affected Files**: NodeActionBar.tsx, MessageDetailPanel.tsx, MessageDetailDrawer.tsx, AssistantNode.tsx, ConversationTreeView.tsx

### `generateMore` arguments

**Problem**: GitTree-Function called `generateMore(sessionId, msgId, multiModels)` with 3 arguments. Upstream only accepts 2: `generateMore(sessionId, msgId)`.

**Solution**: Removed the third `multiModels` argument from all calls.

**Affected Files**: ConversationTreeView.tsx

### Edge type generics

**Problem**: @xyflow/react v12 requires `EdgeProps<T>` where `T extends Edge<Record<string, unknown>>`. Original `interface` definitions did not satisfy this constraint.

**Solution**: Changed from `interface XxxEdgeData {}` + `EdgeProps<XxxEdgeData>` to `type XxxEdgeData = {}` + `type XxxEdgeType = Edge<XxxEdgeData, 'xxx'>` + `EdgeProps<XxxEdgeType>`.

**Affected Files**: DefaultEdge.tsx, BranchEdge.tsx, ActivePathEdge.tsx

---

## New Dependencies Added

| Package | Version | Type | Purpose |
|---------|---------|------|---------|
| `@xyflow/react` | 12.10.1 | devDependency | ReactFlow library for tree visualization |
| `dagre` | ^0.8.5 | devDependency | Graph layout algorithm for automatic tree node positioning |
| `@types/dagre` | ^0.7.54 | devDependency | TypeScript type definitions for dagre |

---

## Modified Upstream Files

Only 2 upstream files were modified (all changes marked with `// [GitLine]`):

1. **`src/renderer/components/layout/Toolbar.tsx`**
   - Added ViewModeSwitch import
   - Added tree/list toggle button in toolbar

2. **`src/renderer/routes/session/$sessionId.tsx`**
   - Added viewModeStore and ConversationTreeView imports
   - Added conditional rendering: tree view or list view based on viewMode state

3. **`package.json`** (JSON, no comment support)
   - Added @xyflow/react, dagre, @types/dagre dependencies

---

## File Inventory

### New Files (28 total)

**Data Layer (4 files)**:
- `src/renderer/lib/conversation-tree-adapter.ts`
- `src/renderer/lib/tree-layout.ts`
- `src/renderer/stores/viewModeStore.ts`
- `src/renderer/stores/multiModelStore.ts`

**Conversation Tree Components (21 files)**:
- `src/renderer/components/conversation-tree/index.ts`
- `src/renderer/components/conversation-tree/ConversationTreeView.tsx`
- `src/renderer/components/conversation-tree/ViewModeSwitch.tsx`
- `src/renderer/components/conversation-tree/TreeToolbar.tsx`
- `src/renderer/components/conversation-tree/NodeActionBar.tsx`
- `src/renderer/components/conversation-tree/MessageDetailPanel.tsx`
- `src/renderer/components/conversation-tree/MessageDetailDrawer.tsx`
- `src/renderer/components/conversation-tree/NodeCreatePopover.tsx`
- `src/renderer/components/conversation-tree/TargetNodeSelector.tsx`
- `src/renderer/components/conversation-tree/SelectionBoundingBox.tsx`
- `src/renderer/components/conversation-tree/TextSelectionQuote.tsx`
- `src/renderer/components/conversation-tree/edges/index.ts`
- `src/renderer/components/conversation-tree/edges/DefaultEdge.tsx`
- `src/renderer/components/conversation-tree/edges/BranchEdge.tsx`
- `src/renderer/components/conversation-tree/edges/ActivePathEdge.tsx`
- `src/renderer/components/conversation-tree/nodes/index.ts`
- `src/renderer/components/conversation-tree/nodes/UserNode.tsx`
- `src/renderer/components/conversation-tree/nodes/AssistantNode.tsx`
- `src/renderer/components/conversation-tree/nodes/SystemNode.tsx`
- `src/renderer/components/conversation-tree/utils/index.ts`
- `src/renderer/components/conversation-tree/utils/branchColors.ts`

**Multi-Model Components (3 files)**:
- `src/renderer/components/MultiBranchIndicator.tsx`
- `src/renderer/components/MultiModelSelector/index.tsx`
- `src/renderer/components/MultiModelToggle.tsx`
