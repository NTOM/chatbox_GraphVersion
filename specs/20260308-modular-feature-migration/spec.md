# Feature Specification: Modular Feature Migration

**Feature Branch**: `20260308-modular-feature-migration`  
**Created**: 2026-03-16  
**Status**: Draft  
**Input**: 将 GitTree-Function 分支开发的自定义功能（对话树视图、多模型支持等）迁移到最新 upstream main 分支，采用 cherry-pick + 模块化重写策略，确保代码可维护、易于未来迁移。

## Background & Context

### 当前状态

- **上游分支**: `main` (origin/main, upstream/main)
- **自定义功能分支**: `GitTree-Function` (origin/GitTree-Function)
- **提交数量**: 18 个提交需要分析和迁移
- **主要功能**: 对话树形可视化界面（ConversationTree）、多模型选择器、视图切换等

### 提交演进历史

| 阶段 | 提交 | 内容 |
|------|------|------|
| Phase 1 | `f31c095` | 实现 git 树形界面基础框架（ReactFlow 集成） |
| Phase 2 | `8637cb8` | 添加分支边、活跃路径高亮、分支颜色系统 |
| Phase 3 | `58ea3d4`, `29c1a20`, `da7634c` | 节点交互、消息详情、创建弹窗、目标选择器 |
| Release | `5673d08`, `1d1a13b` | v1.18.1-treeVersion / GraphVersion 发布 |
| Bugfix | `8872e9d` | 多 bug 修复 |

### 文件影响分类

**新增文件（28 个，纯模块化自定义功能）**:
- `src/renderer/components/conversation-tree/*` - 对话树核心组件
- `src/renderer/lib/conversation-tree-adapter.ts` - 数据适配器
- `src/renderer/lib/tree-layout.ts` - 布局算法
- `src/renderer/stores/viewModeStore.ts` - 视图模式状态
- `src/renderer/stores/multiModelStore.ts` - 多模型状态
- `src/renderer/components/Multi*.tsx` - 多模型选择器组件

**修改的上游文件**（需要谨慎适配）:
- `src/renderer/components/Header.tsx` - 添加视图切换入口
- `src/renderer/routes/session/$sessionId.tsx` - 集成树形视图
- `src/renderer/stores/sessionActions.ts` - 扩展 session 操作
- `src/renderer/i18n/locales/*/translation.json` - 国际化文本
- `package.json` - 新增依赖（reactflow）

---

## User Scenarios & Testing *(mandatory)*

### User Story 1 - 对话树视图完整迁移 (Priority: P1)

用户（开发者本人）需要将已开发的对话树可视化功能完整迁移到最新的 upstream main 分支上，使得在新版本基础上仍然可以使用树形视图浏览和管理对话历史。

**Why this priority**: 这是核心功能，占提交历史的主体部分（Phase 1-3），是整个迁移工作的目标所在。

**Independent Test**: 迁移完成后，用户可以在新分支上启动应用，在任意对话中切换到树形视图，看到对话以树状结构呈现，节点可点击、可展开。

**Acceptance Scenarios**:

1. **Given** 新分支基于最新 upstream main 创建，**When** 用户启动应用并进入一个对话，**Then** 用户可以通过 Header 中的切换按钮在列表视图和树形视图之间切换
2. **Given** 用户处于树形视图模式，**When** 用户点击某个消息节点，**Then** 该节点被高亮，消息详情显示在右侧/下方面板中
3. **Given** 用户处于树形视图模式，**When** 用户创建了多轮对话并有分支，**Then** 分支以不同颜色的连线区分，活跃路径有明显高亮

---

### User Story 2 - 模块化代码组织迁移 (Priority: P1)

开发者需要以模块化的方式组织迁移后的代码，使得自定义功能与上游代码有清晰的边界，方便未来再次同步上游更新。

**Why this priority**: 与 Story 1 同级，因为模块化组织是迁移的核心策略，影响长期可维护性。

**Independent Test**: 迁移完成后，所有自定义功能代码位于独立目录（如 `src/renderer/components/conversation-tree/`），对上游文件的修改处都有 `// [GitLine]` 标记。

**Acceptance Scenarios**:

1. **Given** 迁移完成后的代码库，**When** 开发者查看 `src/renderer/components/conversation-tree/` 目录，**Then** 该目录包含对话树的全部组件、工具、边、节点子目录
2. **Given** 迁移完成后的代码库，**When** 开发者搜索 `// [GitLine]` 标记，**Then** 所有对上游文件的修改点都有此标记注释
3. **Given** 未来 upstream 更新需要合并，**When** 开发者查看冲突文件，**Then** 可以通过 `[GitLine]` 标记快速定位自定义代码块

---

### User Story 3 - 迁移文档与追溯 (Priority: P2)

开发者需要为每个迁移的提交/功能模块留下文档记录，说明原提交内容、迁移决策、适配修改，便于未来回溯和继续迁移。

**Why this priority**: 文档是辅助性工作，重要但不阻塞功能使用。

**Independent Test**: 可以在 `specs/` 或 `docs/` 目录找到迁移日志文件，记录每个原提交的迁移情况。

**Acceptance Scenarios**:

1. **Given** 每个功能模块迁移完成后，**When** 开发者查看迁移日志，**Then** 可以看到原提交 hash、功能描述、迁移决策、涉及文件列表
2. **Given** 某个功能模块迁移过程中遇到冲突或需要重写，**When** 开发者查看迁移日志，**Then** 可以看到冲突描述和解决方案记录

---

### User Story 4 - 依赖管理与构建验证 (Priority: P2)

开发者需要确保新增的依赖（如 reactflow）正确添加到 package.json，且应用能够正常构建运行。

**Why this priority**: 构建成功是功能可用的前提，但相对独立于功能逻辑。

**Independent Test**: 运行 `pnpm install && pnpm build` 能够成功完成，无编译错误。

**Acceptance Scenarios**:

1. **Given** 迁移完成后的代码库，**When** 运行 `pnpm install`，**Then** 所有依赖正确安装，无 peer dependency 警告
2. **Given** 依赖安装完成，**When** 运行 `pnpm build`，**Then** 构建成功，无 TypeScript 错误
3. **Given** 构建成功，**When** 运行 `pnpm dev`，**Then** 应用正常启动，无运行时错误

---

### Edge Cases

- 上游 main 分支的某些文件已被大幅重构，导致 cherry-pick 冲突无法自动解决
  - **处理**: 手动分析冲突，保留上游逻辑，重新实现自定义功能的集成点
- 依赖版本冲突（如 reactflow 与新版 React 不兼容）
  - **处理**: 检查依赖兼容性矩阵，必要时升级或降级相关依赖
- 国际化 key 冲突（上游可能新增了同名 key）
  - **处理**: 为自定义功能的 i18n key 添加 `gitline.` 前缀命名空间

---

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: 系统 MUST 保留对话树视图的全部功能，包括节点展示、分支高亮、路径追踪
- **FR-002**: 系统 MUST 保留视图切换功能，用户可在列表视图和树形视图之间自由切换
- **FR-003**: 系统 MUST 保留消息详情面板，点击节点后可查看完整消息内容
- **FR-004**: 系统 MUST 保留节点操作栏，支持复制、编辑、删除等操作
- **FR-005**: 系统 MUST 保留多模型选择器组件（如果原分支包含此功能）
- **FR-006**: 代码 MUST 遵循模块化组织原则，自定义功能放在独立目录
- **FR-007**: 对上游文件的修改 MUST 使用 `// [GitLine]` 标记注释
- **FR-008**: 迁移过程 MUST 为每个功能模块生成迁移文档
- **FR-009**: 迁移完成后的代码 MUST 通过 lint 检查和 TypeScript 编译
- **FR-010**: 迁移 MUST NOT 引入新的 ESLint 错误或 TypeScript 类型错误

### Key Entities

- **Commit (提交)**: 原 GitTree-Function 分支上的每个提交，包含 hash、message、涉及文件
- **Module (功能模块)**: 按功能划分的代码单元，如"对话树视图"、"多模型选择器"
- **Migration Record (迁移记录)**: 记录每个模块迁移状态、决策、文件变更的文档

---

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% 的对话树视图功能在新分支上可用（视图切换、节点交互、分支显示）
- **SC-002**: 所有自定义组件代码位于 `src/renderer/components/conversation-tree/` 目录下
- **SC-003**: 所有对上游文件的修改点都有 `// [GitLine]` 标记（搜索可验证）
- **SC-004**: `pnpm build` 构建成功，无编译错误
- **SC-005**: `pnpm lint` 检查通过，无新增 lint 错误
- **SC-006**: 迁移文档覆盖全部 18 个原提交，每个提交有对应的迁移记录
- **SC-007**: 应用启动后，可在 5 秒内完成视图切换（用户体验无明显延迟）

---

## Assumptions

1. 上游 main 分支代码结构相对稳定，核心路由和组件架构未发生颠覆性重构
2. reactflow 库与当前项目的 React 版本兼容
3. 原 GitTree-Function 分支的功能是完整可用的，不需要额外功能补充
4. 开发者熟悉 git cherry-pick、rebase 等操作
5. 迁移工作在本地 fork 进行，不影响 upstream 官方仓库

---

## Out of Scope

- 向 upstream 提交 PR 或推送任何代码
- 为对话树功能新增额外特性（本次仅迁移现有功能）
- 更改上游代码的架构或重构上游代码
- 自动化迁移脚本开发（采用手动 cherry-pick + 重写策略）
