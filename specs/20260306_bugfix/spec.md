# Feature Specification: 20260306 Bugfix 集合

**Feature Branch**: `GitTree-Function` (当前分支，不创建新分支)
**Created**: 2026-03-06
**Status**: Draft
**Input**: 6 项 bug 修复与功能对齐任务

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Prompt 层级分叉创建 (Priority: P1)

用户在树状图中查看对话时，期望从最顶层的 Prompt（System Prompt）
节点下方就能直接创建新的 Ask 节点，从而在对话的最早阶段即可
产生分支。当前行为是 Prompt 层级下不允许创建分叉节点，用户
必须先有一轮对话才能分叉，这限制了灵活性。

**Why this priority**: 这是树状图的核心交互能力缺失。用户无法在
对话起点就进行多模型对比或多方向探索，严重影响核心功能价值。

**Independent Test**: 打开任意会话的树状图视图，在顶层 Prompt
节点上分别通过 Output Handle 拖拽和右键菜单操作，验证能否
直接创建子 Ask 节点。

**Acceptance Scenarios**:

1. **Given** 一个包含 System Prompt 的会话处于树状图视图，
   **When** 用户通过 Prompt 节点底部的 Output Handle 拖拽，
   **Then** 系统允许在 Prompt 节点下直接创建新的 Ask 节点
2. **Given** 一个包含 System Prompt 的会话处于树状图视图，
   **When** 用户右键点击 Prompt 节点并选择"添加分支"，
   **Then** 系统允许在 Prompt 节点下直接创建新的 Ask 节点
3. **Given** Prompt 节点下已有一个 Ask 节点，
   **When** 用户再次通过任一方式（Handle 或右键菜单）分叉，
   **Then** 系统创建第二个 Ask 分支节点，与已有节点并列

---

### User Story 2 - 重新生成时统一使用当前模型配置 (Priority: P1)

用户在任意节点上触发"重新生成"操作时，系统应统一使用当前
聊天框底部用户设置的模型配置。如果用户当前设定为多模型，
则按多模型配置生成多个回答分支；如果设定为单个模型，则
使用该单个模型重新生成。不再区分 Ask/Assistant 节点的
原始模型。

**Why this priority**: 此 bug 导致重新生成行为不可预期，
当前实现在某些场景下不必要地走多模型流程，是功能正确性问题。

**Independent Test**: 分别在单模型配置和多模型配置下，
对 Assistant 节点点击重新生成，验证使用的模型与底部配置一致。

**Acceptance Scenarios**:

1. **Given** 底部聊天框当前配置为单模型（如 GPT-4），
   **When** 用户点击任意 Assistant 节点的"重新生成"按钮，
   **Then** 系统仅使用 GPT-4 重新生成，不触发多模型流程
2. **Given** 底部聊天框当前配置为多模型（如 GPT-4 + Claude），
   **When** 用户从任意节点触发重新生成，
   **Then** 系统按当前多模型配置生成多个 Assistant 回答分支
3. **Given** 用户切换底部模型配置后触发重新生成，
   **When** 重新生成完成，
   **Then** 生成结果反映切换后的新配置，而非原始节点的模型

---

### User Story 3 - 白天模式 UI 适配：节点面板与背景区分 (Priority: P2)

在白天（Light）模式下，节点详细信息面板与树状图背景颜色过于
接近，导致面板边界不清晰，用户难以区分面板内容与画布背景。
需要增强面板在白天模式下的视觉对比度。

**Why this priority**: 影响日常使用体验，但不阻塞功能使用，
属于视觉可用性问题。

**Independent Test**: 切换到白天模式，打开节点详情面板，
验证面板与背景有明显的视觉边界。

**Acceptance Scenarios**:

1. **Given** 应用处于白天模式，用户选中一个节点，
   **When** 节点详情面板展开，
   **Then** 面板边界清晰可见，与画布背景有明确的视觉分隔
   （通过边框、阴影或背景色差异）
2. **Given** 应用处于白天模式，多个节点在画布上显示，
   **When** 用户浏览树状图，
   **Then** 每个节点卡片与画布背景之间有足够的对比度

---

### User Story 4 - 对话导出功能适配树状分支 (Priority: P2)

原版 Chatbox 支持将对话导出为 Markdown 格式。在树状图模式下，
用户期望能将当前激活路径（从根节点到当前选中节点的完整对话链）
导出为 Markdown，而不是导出所有分支的内容。

**Why this priority**: 导出是与上游功能对齐的需求，对日常使用
有实际价值，但非核心交互阻塞。

**Independent Test**: 在树状图中选中某个叶子节点，分别通过原有
导出菜单和树状图界面的导出按钮触发导出，验证导出的 Markdown
仅包含激活路径上的对话内容。

**Acceptance Scenarios**:

1. **Given** 一个包含多分支的树状对话，用户激活了某条路径，
   **When** 用户通过原有导出菜单触发 Markdown 导出，
   **Then** 导出的内容仅包含从根节点到当前激活节点的线性对话
2. **Given** 用户处于树状图视图，
   **When** 用户通过树状图界面的独立导出按钮触发导出，
   **Then** 同样导出当前激活路径的线性对话为 Markdown
3. **Given** 激活路径上包含 System Prompt、多轮 Ask/Assistant，
   **When** 导出为 Markdown，
   **Then** 格式与原版 Chatbox 导出格式一致（角色标注、内容分段）
4. **Given** 用户切换激活路径到另一个分支，
   **When** 再次导出，
   **Then** 导出内容反映新的激活路径

---

### User Story 5 - Detail 面板表格内容显示与交互修复 (Priority: P2)

当 Assistant 回答中包含 Markdown 表格时，Detail 面板出现
内容换行失败、面板无法拖动调整宽度等问题。表格内容溢出
导致布局异常。

**Why this priority**: 影响内容阅读体验，但仅在特定内容
（含表格的回答）时触发。

**Independent Test**: 让 AI 生成一个包含宽表格的回答，
在 Detail 面板中查看，验证表格正常换行/滚动，面板可拖动。

**Acceptance Scenarios**:

1. **Given** Assistant 回答包含一个多列 Markdown 表格，
   **When** 用户在 Detail 面板中查看该回答，
   **Then** 表格内容不溢出面板边界，支持水平滚动
2. **Given** Detail 面板正在显示包含表格的内容，
   **When** 用户拖动面板边缘调整宽度，
   **Then** 拖动操作正常响应，面板宽度随之变化
3. **Given** 表格内容很宽（超过 10 列），
   **When** 面板宽度较窄，
   **Then** 表格区域独立水平滚动，不影响面板整体布局

---

### User Story 6 - 粘贴网址/图片时的报错修复 (Priority: P3)

用户在输入框中粘贴网址或图片时，偶尔会出现报错。需要修复
粘贴处理逻辑，使其能正确处理各种粘贴内容格式。

**Why this priority**: 属于偶发性 bug，不是每次都触发，
但影响输入体验的流畅性。

**Independent Test**: 从浏览器复制网址、从文件系统复制图片、
从截图工具粘贴图片，分别测试粘贴操作。

**Acceptance Scenarios**:

1. **Given** 用户从浏览器地址栏复制了一个 URL，
   **When** 在输入框中粘贴，
   **Then** URL 被正确插入为文本，无报错
2. **Given** 用户从文件管理器复制了一张图片文件，
   **When** 在输入框中粘贴，
   **Then** 图片被正确处理（作为附件或内联图片），无报错
3. **Given** 用户使用截图工具截取屏幕，
   **When** 在输入框中粘贴截图，
   **Then** 截图被正确识别并处理，无报错
4. **Given** 粘贴板内容格式异常或为空，
   **When** 用户执行粘贴操作，
   **Then** 系统优雅降级，不显示错误弹窗

---

### Edge Cases

- Prompt 节点下创建 Ask 节点后立即删除该 Ask 节点，树结构
  应恢复到只有 Prompt 节点的状态
- 重新生成时如果当前配置的模型 API Key 已过期或删除，应给出
  明确的错误提示而非静默失败
- 导出空对话（仅有 System Prompt 无实际对话）时应提示用户
  或导出 Prompt 内容
- 极宽表格（20+ 列）在最小面板宽度下的显示行为
- 同时粘贴图片和文本（富文本粘贴）的处理策略

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: 系统 MUST 允许在 System Prompt 节点下直接
  创建 Ask 子节点，支持从 Prompt 层级开始分叉
- **FR-002**: 系统 MUST 在任意节点触发重新生成时，统一使用
  当前聊天框底部用户设置的模型配置（单模型或多模型）
- **FR-003**: 当底部配置为多模型时，重新生成 MUST 按多模型
  配置生成多个 Assistant 回答分支；配置为单模型时仅生成一个
- **FR-004**: 系统 MUST 在白天模式下为节点详情面板提供与
  画布背景明确区分的视觉样式（边框/阴影/背景色）
- **FR-005**: 系统 MUST 支持将当前激活路径的对话导出为
  Markdown 格式，同时通过原有导出菜单和树状图界面独立导出
  按钮两个入口触发，格式与原版 Chatbox 导出一致
- **FR-006**: 导出 MUST 仅包含从根节点到当前激活节点路径
  上的对话内容，排除其他分支
- **FR-007**: Detail 面板 MUST 正确渲染包含 Markdown 表格
  的内容，表格区域支持独立水平滚动
- **FR-008**: Detail 面板 MUST 在显示任何内容时都支持拖动
  调整宽度
- **FR-009**: 系统 MUST 在粘贴网址时正确将其作为文本插入
  输入框，无报错
- **FR-010**: 系统 MUST 在粘贴图片（文件或截图）时正确
  处理为附件，无报错
- **FR-011**: 系统 MUST 对异常粘贴内容优雅降级，不显示
  未处理的错误弹窗

### Key Entities

- **ConversationNode**: 对话树中的节点，包含类型（system/
  user/assistant）、内容、父节点引用、子节点列表
- **ActivePath**: 从根节点到当前选中节点的有序节点序列，
  用于确定对话上下文和导出范围

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 用户能在 Prompt 节点下直接创建 Ask 节点，
  操作成功率 100%
- **SC-002**: 重新生成时 100% 遵循当前底部模型配置：
  单模型时生成 1 个回答，多模型时按配置生成多个回答
- **SC-003**: 白天模式下节点面板与背景的视觉对比度满足
  WCAG AA 标准（对比度比 ≥ 3:1）
- **SC-004**: 激活路径导出的 Markdown 内容与原版线性导出
  格式完全一致
- **SC-005**: 包含表格的回答在 Detail 面板中 100% 可正常
  查看，面板宽度可自由拖动
- **SC-006**: 粘贴网址和图片的操作成功率从当前偶发失败
  提升到 100% 无报错

### Assumptions

- 原版 Chatbox 的导出接口（ExportChat 组件）仍可用且未被
  重大重构，可基于其进行树状分支适配
- 当前聊天框底部的模型配置（单模型/多模型）在 Session 或
  全局 Store 中可访问，重新生成逻辑可直接读取
- 白天模式的主题变量可通过 Tailwind/CSS 变量调整
- 粘贴报错为前端异常处理不完善导致，非系统级限制
