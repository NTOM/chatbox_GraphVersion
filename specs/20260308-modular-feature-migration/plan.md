# Implementation Plan: Modular Feature Migration

**Branch**: `20260308-modular-feature-migration` | **Date**: 2026-03-16 | **Spec**: [spec.md](./spec.md)  
**Input**: Feature specification from `/specs/20260308-modular-feature-migration/spec.md`

## Summary

将 GitTree-Function 分支开发的 18 个提交（对话树可视化、多模型选择器等）迁移到最新 upstream/main 分支（比当前 main 领先 **121 个提交**）。采用模块化重写策略，确保自定义代码与上游代码有清晰边界，方便未来迁移。

**关键发现**:
- 上游已进行大规模重构：`Header.tsx` 被删除，组件移至 `components/chat/` 和 `components/common/` 子目录
- 上游新增了 `src/renderer/stores/session/` 模块化结构（包含 `forks.ts`）
- 需要重新定位集成点，而非简单 cherry-pick

## Technical Context

**Language/Version**: TypeScript 5.x (strict mode)  
**Primary Dependencies**:
- React 18 + Electron (desktop runtime)
- @xyflow/react ^12.10.0 (对话树可视化，需新增)
- Mantine v7 (UI组件库)
- Zustand + Jotai (状态管理)
- TanStack Router (文件路由)

**Storage**: SQLite (via Electron SQLite adapter) + localStorage  
**Testing**: Vitest  
**Target Platform**: Windows / macOS / Linux (Electron desktop app)  
**Project Type**: Desktop Application (Electron + React)  
**Performance Goals**: 视图切换 < 1秒，树形渲染支持 500+ 节点  
**Constraints**: 
- 迁移不能影响上游官方代码
- 所有改动需 `// [GitLine]` 标记
- 必须通过 `pnpm build` 和 `pnpm lint`

**Scale/Scope**:
- 迁移 18 个提交
- 新增 28 个文件
- 修改约 6 个上游文件

---

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Gate | Status | Notes |
|-----------|------|--------|-------|
| **I. Fork Isolation** | 迁移仅在本地 fork 进行，禁止推送 upstream | ✅ PASS | 所有工作在 origin 分支完成 |
| **II. Upstream Sync Discipline** | 基于最新 upstream/main 创建迁移分支 | ✅ PASS | 将从 upstream/main (1577f1e) 创建新分支 |
| **III. Feature Modularity** | 自定义功能放独立目录 + `[GitLine]` 标记 | ✅ PASS | `conversation-tree/` 已隔离；需检查标记完整性 |
| **IV. Technology Stack Alignment** | 使用项目现有技术栈 | ✅ PASS | @xyflow/react 是成熟库，与 React 18 兼容 |
| **V. Code Quality** | 通过 lint/check，YAGNI | ⚠️ PENDING | 迁移后需验证 |
| **VI. Data Privacy** | 无敏感数据入库 | ✅ PASS | 功能不涉及新数据类型 |

**Gate Result**: ✅ 可进入 Phase 0

---

## Project Structure

### Documentation (this feature)

```text
specs/20260308-modular-feature-migration/
├── plan.md              # This file
├── spec.md              # Feature specification
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── migration-log.md     # Migration tracking document
├── checklists/
│   └── requirements.md  # Spec quality checklist
└── contracts/           # Phase 1 output (if applicable)
```

### Source Code (repository root)

```text
src/renderer/
├── components/
│   ├── conversation-tree/     # [GitLine] 对话树核心组件 (NEW)
│   │   ├── ConversationTreeView.tsx
│   │   ├── MessageDetailDrawer.tsx
│   │   ├── MessageDetailPanel.tsx
│   │   ├── NodeActionBar.tsx
│   │   ├── NodeCreatePopover.tsx
│   │   ├── SelectionBoundingBox.tsx
│   │   ├── TargetNodeSelector.tsx
│   │   ├── TextSelectionQuote.tsx
│   │   ├── TreeToolbar.tsx
│   │   ├── ViewModeSwitch.tsx
│   │   ├── index.ts
│   │   ├── edges/
│   │   │   ├── ActivePathEdge.tsx
│   │   │   ├── BranchEdge.tsx
│   │   │   ├── DefaultEdge.tsx
│   │   │   └── index.ts
│   │   ├── nodes/
│   │   │   ├── AssistantNode.tsx
│   │   │   ├── SystemNode.tsx
│   │   │   ├── UserNode.tsx
│   │   │   └── index.ts
│   │   └── utils/
│   │       ├── branchColors.ts
│   │       └── index.ts
│   ├── MultiBranchIndicator.tsx    # [GitLine] (NEW)
│   ├── MultiModelSelector/         # [GitLine] (NEW)
│   └── MultiModelToggle.tsx        # [GitLine] (NEW)
├── lib/
│   ├── conversation-tree-adapter.ts  # [GitLine] 数据适配器 (NEW)
│   └── tree-layout.ts                # [GitLine] 布局算法 (NEW)
├── stores/
│   ├── viewModeStore.ts              # [GitLine] 视图模式状态 (NEW)
│   └── multiModelStore.ts            # [GitLine] 多模型状态 (NEW)
├── routes/session/
│   └── $sessionId.tsx                # [GitLine] 集成点 (MODIFY)
└── i18n/locales/
    ├── en/translation.json           # [GitLine] 国际化 (MODIFY)
    └── zh-Hans/translation.json      # [GitLine] 国际化 (MODIFY)
```

**Structure Decision**: 保持原 GitTree-Function 分支的模块化结构，所有自定义组件放在 `conversation-tree/` 目录。由于上游删除了 `Header.tsx`，需要找到新的视图切换入口点。

---

## Upstream Changes Analysis

### 关键重构点（需要重新适配）

| 原集成文件 | 上游变化 | 迁移策略 |
|-----------|---------|----------|
| `components/Header.tsx` | **已删除** | 需找到新入口点（可能在 Sidebar 或 ActionMenu） |
| `components/Message.tsx` | 移至 `components/chat/Message.tsx` | 更新 import 路径 |
| `components/MessageList.tsx` | 移至 `components/chat/MessageList.tsx` | 更新 import 路径 |
| `stores/sessionActions.ts` | 已修改，新增 `stores/session/` 子模块 | 检查 API 兼容性，可能需要适配新结构 |
| `routes/session/$sessionId.tsx` | 已修改 | 需 diff 分析，保守适配 |

### 上游新增功能（可能影响迁移）

- `stores/session/forks.ts` — 上游已有 fork 概念，需检查是否与我们的分支功能冲突
- `stores/session/threads.ts` — 线程管理，可能与对话树有交集
- `components/chat/SummaryMessage.tsx` — 摘要消息组件
- `stores/atoms/compactionAtoms.ts` — 压缩状态原子

---

## Migration Phases

### Phase 0: Research & Analysis
1. 分析上游 121 个提交的关键变更
2. 确认 @xyflow/react 与上游 React 版本兼容性
3. 找到替代 Header.tsx 的视图切换入口点
4. 评估 `stores/session/forks.ts` 与我们功能的关系

### Phase 1: Foundation Setup
1. 从 upstream/main 创建新迁移分支
2. 添加 @xyflow/react 依赖
3. 复制 conversation-tree 目录（纯新增文件）
4. 复制 lib/ 和 stores/ 中的新增文件
5. 验证构建通过

### Phase 2: Integration Points
1. 适配 $sessionId.tsx 集成
2. 找到并实现视图切换入口（替代原 Header.tsx）
3. 适配 i18n 文件（使用 `gitline.` 命名空间前缀）
4. 添加 `// [GitLine]` 标记

### Phase 3: Testing & Polish
1. 功能测试：视图切换、节点交互、分支显示
2. 构建验证：pnpm build, pnpm lint, pnpm check
3. 生成迁移文档 migration-log.md

---

## Complexity Tracking

> 无违反 Constitution 的情况需要 justify

| Aspect | Complexity | Justification |
|--------|------------|---------------|
| 上游重构量大（121 提交） | 高 | 采用保守策略：先复制新文件，再逐个适配集成点 |
| Header.tsx 被删除 | 中 | 需要研究新的入口点，可能在 Sidebar 或顶部 ActionMenu |
| stores/session/ 模块化 | 中 | 上游已有类似结构，需检查 API 兼容性 |

---

## Constitution Check (Post-Design)

*Re-check after Phase 1 design completion.*

| Principle | Gate | Status | Notes |
|-----------|------|--------|-------|
| **I. Fork Isolation** | 迁移仅在本地 fork 进行，禁止推送 upstream | ✅ PASS | 已确认：所有工作在 origin 分支完成 |
| **II. Upstream Sync Discipline** | 基于最新 upstream/main 创建迁移分支 | ✅ PASS | 已确认：从 upstream/main (1577f1e) 创建新分支 |
| **III. Feature Modularity** | 自定义功能放独立目录 + `[GitLine]` 标记 | ✅ PASS | 已设计：conversation-tree/ 隔离；research.md 定义标记策略 |
| **IV. Technology Stack Alignment** | 使用项目现有技术栈 | ✅ PASS | 已验证：@xyflow/react 与 React 18 完全兼容 |
| **V. Code Quality** | 通过 lint/check，YAGNI | ✅ PASS | 已设计：quickstart.md 包含验证步骤 |
| **VI. Data Privacy** | 无敏感数据入库 | ✅ PASS | 已确认：功能不涉及新数据类型 |

**Post-Design Gate Result**: ✅ ALL PASSED — 可进入 Phase 2 (Tasks)

---

## Generated Artifacts

| Phase | Artifact | Status |
|-------|----------|--------|
| Phase 0 | `research.md` | ✅ Complete |
| Phase 1 | `data-model.md` | ✅ Complete |
| Phase 1 | `quickstart.md` | ✅ Complete |
| Phase 1 | `contracts/` | ⏭️ Skipped (Desktop app, no external API) |
| Phase 2 | `tasks.md` | ✅ Complete |

---

## Next Steps

All planning artifacts are complete. Run tasks sequentially starting from Phase 1 (Setup).
Recommended: Achieve MVP milestone (Phase 1 + 2 + 3) first.
