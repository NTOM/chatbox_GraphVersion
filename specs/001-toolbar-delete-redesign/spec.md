# Feature Specification: 树视图工具栏删除功能重构

**Feature Branch**: `20260308-modular-feature-migration` (spec 子功能)  
**Created**: 2026-03-17  
**Status**: Draft  
**Input**: User description: "调整工具栏的删除功能，之前有很多冗余的代码和不好的架构，要重新设计并实现"

---

## 背景与动机

当前树视图（ConversationTreeView）的工具栏删除功能经过六轮迭代修复，积累了大量冗余代码和补丁式架构：

1. **两套触发链路**：悬浮节点删除（短链路，直接有 message.id，稳定工作）和工具栏删除（长链路，依赖全局选中态 → TreeToolbar → 确认弹窗，反复出问题）
2. **事件阻断补丁堆叠**：为解决 ReactFlow 事件吞噬问题，工具栏中混合使用 `onPointerDown`、`onMouseDown`、`onClick` 三层拦截，加上 `createPressHandler`、`stopToolbarClick` 等辅助函数
3. **Mantine ActionIcon 与原生 button 混用**：同一个工具栏中，模式切换和布局按钮用 Mantine ActionIcon，而聚焦、删除、撤销按钮用原生 `<button>`，风格和行为不一致
4. **三个冗余 Ref 绕过闭包**：`selectedNodeIdRef`、`selectedNodeIdsRef`、`interactionModeRef` 是为了在 Mantine modal 回调中读取最新选中态而引入的 workaround
5. **撤销功能空实现**：`handleUndo` 只有快照保存逻辑，恢复逻辑因上游 API 缺失而为空，但仍在 UI 上占据按钮位置
6. **批量删除是串行逐条**：`removeTreeMessages` 内部循环调用 `removeTreeMessage`，每次都触发一次 store 更新和视图重渲染

本次重构旨在统一删除架构、消除冗余代码、提升可维护性和用户体验。

---

## User Scenarios & Testing

### User Story 1 - 工具栏单击模式删除 (Priority: P1)

用户在树视图中通过点击选中一个节点，然后使用工具栏的删除按钮将其从对话树中移除。这是最常用的删除流程，必须一击即达、可靠执行。

**Why this priority**: 这是工具栏删除的核心场景，当前六轮修复仍未完全解决，是本次重构的首要目标。

**Independent Test**: 在树视图中点击任意节点使其选中，点击工具栏删除按钮，确认后节点被移除。可独立测试，不依赖框选功能。

**Acceptance Scenarios**:

1. **Given** 树视图中存在多个节点且用户处于点击模式, **When** 用户点击一个节点使其选中后点击工具栏删除按钮, **Then** 弹出确认对话框，显示即将删除 1 个节点
2. **Given** 确认对话框已打开, **When** 用户点击确认, **Then** 该节点从对话树中移除，树视图自动刷新，选中状态清空
3. **Given** 确认对话框已打开, **When** 用户点击取消, **Then** 对话框关闭，节点保持不变，选中状态不变
4. **Given** 用户未选中任何节点, **When** 用户查看工具栏删除按钮, **Then** 删除按钮呈禁用态（视觉灰化），不可交互

---

### User Story 2 - 工具栏框选模式批量删除 (Priority: P1)

用户切换到框选模式，通过拖拽框选多个节点，然后使用工具栏删除按钮一次性批量移除。

**Why this priority**: 批量删除是树视图管理复杂对话分支的关键能力，与 US1 同为核心场景。

**Independent Test**: 切换到框选模式，拖拽框选 2-3 个节点，点击工具栏删除按钮，确认后节点全部移除。

**Acceptance Scenarios**:

1. **Given** 用户处于框选模式且框选了多个节点, **When** 点击工具栏删除按钮, **Then** 确认对话框显示即将删除的节点数量
2. **Given** 确认删除多个节点, **When** 删除执行完毕, **Then** 所有选中节点从树中移除，树视图刷新，选中状态清空
3. **Given** 框选包含父子节点, **When** 确认删除, **Then** 系统按正确顺序（子节点优先）移除，不会出现孤儿节点或引用错误

---

### User Story 3 - 悬浮节点快捷删除 (Priority: P2)

用户悬浮在单个节点上，通过节点操作栏中的删除按钮快速删除该节点，无需弹出确认对话框（使用二次点击确认模式）。

**Why this priority**: 悬浮删除目前工作正常，重构时需确保其与工具栏删除共享同一套底层逻辑，同时保持原有的快捷体验。

**Independent Test**: 悬浮在任意节点上，点击红色垃圾桶图标使其进入确认态，再次点击完成删除。

**Acceptance Scenarios**:

1. **Given** 鼠标悬浮在某个节点上, **When** 点击删除图标, **Then** 图标进入确认态（变红/闪烁），等待用户二次确认
2. **Given** 删除图标处于确认态, **When** 用户再次点击, **Then** 该节点从树中移除，使用与工具栏删除相同的底层删除逻辑
3. **Given** 删除图标处于确认态, **When** 3 秒内无操作, **Then** 确认态自动重置

---

### User Story 4 - 键盘快捷键删除 (Priority: P2)

用户选中节点后，通过 Delete 或 Backspace 键触发删除，使用与工具栏删除相同的确认流程。

**Why this priority**: 键盘快捷键是高效用户的常用操作方式，应与工具栏删除走完全相同的逻辑路径。

**Independent Test**: 选中节点后按 Delete 键，确认对话框出现，确认后节点被删除。

**Acceptance Scenarios**:

1. **Given** 节点已被选中（单击或框选）, **When** 按下 Delete 或 Backspace 键, **Then** 弹出与工具栏删除相同的确认对话框
2. **Given** 焦点在输入框或文本区域中, **When** 按下 Delete 键, **Then** 不触发节点删除（仅对画布区域生效）

---

### User Story 5 - 删除功能的一致性与统一架构 (Priority: P1)

所有删除入口（工具栏按钮、悬浮操作栏、键盘快捷键）应共享同一套底层删除逻辑，消除当前的代码分叉和冗余。

**Why this priority**: 这是本次重构的架构目标，直接决定了代码质量和后续可维护性。

**Independent Test**: 分别通过三种方式（工具栏、悬浮、键盘）删除节点，验证底层调用路径完全一致，删除效果（包括 fork 结构修复）完全相同。

**Acceptance Scenarios**:

1. **Given** 工具栏删除、悬浮删除、键盘删除三种方式, **When** 分别删除同类型的节点, **Then** 最终调用的底层删除函数相同，结果一致
2. **Given** 删除一个包含子分支的节点, **When** 通过任意入口删除, **Then** fork 结构自动修复逻辑相同（空分支清理、position 调整等）
3. **Given** 重构完成后的代码, **When** 审查删除相关代码, **Then** 不存在两套独立的删除链路或冗余的状态同步逻辑

---

### User Story 6 - 工具栏按钮状态一致性 (Priority: P3)

工具栏中所有按钮应使用统一的组件和交互模式，而非混用 Mantine ActionIcon 和原生 button。

**Why this priority**: 视觉和行为一致性是良好用户体验的基础，但相比功能正确性优先级稍低。

**Independent Test**: 查看工具栏所有按钮，确认外观风格一致、hover/disabled 状态表现一致。

**Acceptance Scenarios**:

1. **Given** 工具栏展示所有功能按钮, **When** 用户查看工具栏, **Then** 所有按钮具有统一的尺寸、间距、hover 效果和禁用样式
2. **Given** 某些按钮处于禁用状态, **When** 用户悬浮或点击, **Then** 所有禁用按钮的视觉反馈（灰化、cursor 变化）保持一致

---

### Edge Cases

- 删除操作正在执行时，用户再次点击删除按钮会发生什么？（应防止重复触发）
- 删除节点后 session 数据发生变化，此时如果另一个异步操作（如 AI 回复生成）也在修改 session，会否冲突？
- 框选模式下框选了大量节点（如 50+），批量删除的性能和体验如何？
- 删除主链上的最后一条消息会发生什么？
- 在极端情况下（如网络断开导致 store 更新失败），删除操作是否有适当的错误提示？

---

## Requirements

### Functional Requirements

- **FR-001**: 系统 MUST 提供统一的删除执行入口，所有删除触发方式（工具栏按钮、悬浮操作栏、键盘快捷键）最终调用同一个底层删除函数
- **FR-002**: 系统 MUST 在工具栏删除和键盘删除时弹出确认对话框，显示即将删除的节点数量，用户确认后才执行删除
- **FR-003**: 系统 MUST 在悬浮删除时使用二次点击确认模式（首次点击进入确认态，再次点击执行删除，超时自动重置）
- **FR-004**: 系统 MUST 在无节点被选中时将删除按钮置为禁用态，阻止触发删除流程
- **FR-005**: 系统 MUST 支持删除活跃路径和非活跃分支中的节点，无需先切换分支
- **FR-006**: 系统 MUST 在批量删除时按正确顺序执行（子节点优先于父节点），确保数据结构完整性
- **FR-007**: 系统 MUST 在删除执行期间防止重复触发（防抖/禁用按钮）
- **FR-008**: 系统 MUST 在工具栏中使用统一的按钮组件和交互模式，消除 Mantine ActionIcon 与原生 button 混用的问题
- **FR-009**: 系统 MUST 在删除完成后自动清除选中状态并刷新树视图
- **FR-010**: 系统 MUST 确保删除按钮的事件处理不被 ReactFlow 画布的事件系统干扰或吞噬

### Key Entities

- **TreeNode（树节点）**: 对话树中的一个消息节点，包含消息 ID、内容、所属分支、深度等信息
- **SelectionState（选中状态）**: 当前被选中的节点集合，包括单选（click 模式下的 selectedNodeId）和多选（select 模式下的 selectedNodeIds）
- **DeleteAction（删除动作）**: 一次删除操作的完整描述，包含待删除的节点 ID 列表、触发来源（toolbar/hover/keyboard）、确认状态
- **Session（会话）**: 包含 messages 主链、messageForksHash 分支结构、threads 线程等数据结构

---

## Success Criteria

### Measurable Outcomes

- **SC-001**: 用户通过工具栏删除按钮执行删除操作的成功率达到 100%（当前存在无法触发的问题）
- **SC-002**: 所有三种删除入口（工具栏、悬浮、键盘）的底层代码路径统一为一个共享函数，消除代码分叉
- **SC-003**: 工具栏组件中与删除相关的事件处理辅助函数数量从当前的 3 个（createPressHandler、stopToolbarClick、stopPropagation 层）减少到 0-1 个
- **SC-004**: 与删除功能相关的 workaround 代码（如 Ref 绕过闭包、多层事件拦截）减少 80% 以上
- **SC-005**: 工具栏中所有按钮使用统一的组件类型，不再存在混用现象
- **SC-006**: 批量删除 10 个节点的操作在用户确认后 2 秒内完成（含视图刷新）
- **SC-007**: 删除功能相关的验收清单测试项（4.3.1-4.3.6）全部通过

---

## Assumptions

- 重构在当前分支 `20260308-modular-feature-migration` 上进行，不影响 main 分支
- 上游 chatStore 的 `updateSessionWithMessages` API 保持稳定，仍可用于直接操作 session 数据
- ReactFlow 的事件模型（画布点击清除选中等行为）不会在短期内发生根本性变化
- Mantine UI 库继续作为项目的 UI 框架，但可以选择性地使用或不使用其组件
- 撤销功能（undo）的完整实现不在本次重构范围内（因上游 API 缺失），但应保留扩展点
- 悬浮删除的二次点击确认 UX 保持不变，不改为弹窗确认
