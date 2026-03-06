# 任务清单：20260306_bugfix

**输入文档**：`/specs/20260306_bugfix/` 目录下的设计文档
**前置文档**：plan.md ✅、spec.md ✅、research.md ✅、data-model.md ✅、contracts/ ✅

**测试**：未要求，不包含测试任务。

**组织方式**：按用户故事分组（US1–US6），按优先级排序（P1 → P2 → P3）。

## 格式说明

```
- [ ] [任务ID] [P?] [故事?] 描述 + 文件路径
```

- **[P]**：可并行执行（操作不同文件，无依赖关系）
- **[故事]**：所属用户故事编号（如 US1、US2）
- 每个任务都标注了具体文件路径

## 路径约定

- **渲染进程**：`src/renderer/`
- **共享类型**：`src/shared/`

---

## 第一阶段：环境准备

**目的**：这是现有项目的 bugfix 批次，不需要创建新项目。此阶段仅做环境验证。

- [x] T001 验证开发环境：在项目根目录 `e:/GitHub/chatbox_gitLine/` 执行 `npm install` 和 `npm run dev`，确认应用正常启动无报错
- [x] T002 确认当前分支为 `GitTree-Function`，工作区干净可用

**检查点**：开发环境确认就绪

---

## 第二阶段：基础设施（阻塞性前置任务）

**目的**：US4（导出功能）依赖的共享类型扩展

**⚠️ 重要**：US4 的实现依赖此类型扩展，必须先完成

- [x] T003 扩展 `ExportChatScope` 类型，新增 `'active_path'` 成员，文件位于 `src/shared/types.ts`（或 `src/shared/types/session.ts`，找到现有 `ExportChatScope` 定义并添加）

**检查点**：基础就绪，所有用户故事可以开始

---

## 第三阶段：US1 — Prompt 层级分叉创建（优先级：P1）🎯 MVP

**目标**：允许用户从最顶层的 System Prompt 节点直接创建 Ask 子节点，同时支持 Output Handle 拖拽和右键菜单两种操作方式

**独立验证**：打开任意会话的树状图视图，在 Prompt 节点上分别通过 Output Handle 和右键菜单创建 Ask 节点

### 实施任务

- [x] T004 [US1] 修改 `ConversationTreeView.tsx` 中的 `handleCreateUserNode` 函数，使其正确处理 `role === 'system'` 的节点作为分叉父节点——确保 `createNewFork` 和 `insertMessageAfter` 能接收 System 消息 ID
  - 📁 `src/renderer/components/conversation-tree/ConversationTreeView.tsx`

- [x] T005 [US1] 更新 `NodeCreatePopover` 组件，当从 System 节点触发时显示正确选项（显示"添加用户消息"+"使用主输入框"，禁用"生成 AI 回复"）
  - 📁 `src/renderer/components/conversation-tree/NodeCreatePopover.tsx`

- [x] T006 [US1] 为 System 节点启用右键菜单中的"添加分支"选项（当前可能被过滤掉了 `role === 'system'` 的节点）
  - 📁 `src/renderer/components/conversation-tree/NodeActionBar.tsx`（或上下文菜单组件）

- [x] T007 [US1] 验证 `buildCreateForkPatch` 函数能否正确处理 System 消息 ID 作为 `forkMessageId`，如不支持则添加兼容逻辑
  - 📁 `src/renderer/lib/conversation-tree-adapter.ts`

**检查点**：US1 完成——用户可通过拖拽 Handle 和右键菜单从 Prompt 节点创建分叉

---

## 第四阶段：US2 — 重新生成统一使用当前模型配置（优先级：P1）

**目标**：所有"重新生成"按钮统一读取当前底部聊天框的模型配置（单模型/多模型），不再使用节点的原始模型

**独立验证**：分别在单模型和多模型配置下，对 Assistant 节点点击重新生成，验证生成结果与底部配置一致

### 实施任务

- [x] T008 [P] [US2] 审查并修复 `MessageDetailPanel` 中的重新生成按钮——确保读取 `useMultiModelStore` 并将 `multiModels` 传递给 `regenerateInNewFork`
  - 📁 `src/renderer/components/conversation-tree/MessageDetailPanel.tsx`

- [x] T009 [P] [US2] 审查并修复 `Message.tsx`（列表视图）中的重新生成按钮——确保读取 `useMultiModelStore` 并传递 `multiModels`
  - 📁 `src/renderer/components/Message.tsx`

- [x] T010 [P] [US2] 审查并修复 `AssistantNode` 中的内联重新生成按钮——确保读取 `useMultiModelStore` 并传递 `multiModels`
  - 📁 `src/renderer/components/conversation-tree/nodes/AssistantNode.tsx`

- [x] T011 [US2] 确认 `NodeActionBar.tsx` 已正确传递 `multiModels`（根据研究 R2，该文件可能已正确实现，如无问题则无需修改）
  - 📁 `src/renderer/components/conversation-tree/NodeActionBar.tsx`

> 💡 T008、T009、T010 操作不同文件，可**并行执行**

**检查点**：US2 完成——重新生成始终使用当前底部模型配置

---

## 第五阶段：US3 — 白天模式 UI 适配（优先级：P2）

**目标**：在 Light（白天）模式下，节点详情面板、节点卡片与画布背景之间有清晰的视觉分隔

**独立验证**：切换到 Light 模式，打开节点详情面板，验证面板边界清晰可见

### 实施任务

- [x] T012 [P] [US3] 为 `MessageDetailPanel` 添加 Light 模式下的边框和阴影（如 `border border-gray-200 shadow-md`）
  - 📁 `src/renderer/components/conversation-tree/MessageDetailPanel.tsx`

- [x] T013 [P] [US3] 增强 `SystemNode` 在 Light 模式下的对比度——添加边框/背景色，与白色画布区分
  - 📁 `src/renderer/components/conversation-tree/nodes/SystemNode.tsx`

- [x] T014 [P] [US3] 增强 `UserNode` 在 Light 模式下的对比度
  - 📁 `src/renderer/components/conversation-tree/nodes/UserNode.tsx`

- [x] T015 [P] [US3] 增强 `AssistantNode` 在 Light 模式下的对比度
  - 📁 `src/renderer/components/conversation-tree/nodes/AssistantNode.tsx`

- [x] T016 [US3] 调整画布在 Light 模式下的背景色（如设为 `bg-gray-50`），使其与白色节点卡片形成差异
  - 📁 `src/renderer/components/conversation-tree/ConversationTreeView.tsx`

> 💡 T012、T013、T014、T015 操作不同文件，可**并行执行**

**检查点**：US3 完成——Light 模式下面板和节点视觉清晰

---

## 第六阶段：US4 — 对话导出适配树状分支（优先级：P2）

**目标**：支持将当前激活路径的对话导出为 Markdown，提供两个入口：原有导出菜单 + 树状图工具栏独立按钮

**独立验证**：在树状图中选中某个叶子节点，分别通过两个入口触发导出，验证 Markdown 仅包含激活路径内容

### 实施任务（需按顺序执行）

- [x] T017 [US4] 在 `conversation-tree-adapter.ts` 中实现 `getActivePathMessages(session)` 函数——遍历 `messages` + `messageForksHash`，沿着活跃 `position` 提取从根节点到活跃叶子节点的有序 `Message[]`
  - 📁 `src/renderer/lib/conversation-tree-adapter.ts`

- [x] T018 [US4] 在 `sessionHelpers.ts` 的 `exportChat` 函数中增加 `active_path` scope 处理分支——调用 `getActivePathMessages` 获取消息，构造单个 `SessionThread` 后交给格式化函数
  - 📁 `src/renderer/stores/sessionHelpers.ts`

- [x] T019 [US4] 在 `ExportChat.tsx` 导出模态框中新增"激活路径"scope 选项——仅在树视图模式下显示（通过 `viewModeStore` 判断）
  - 📁 `src/renderer/modals/ExportChat.tsx`

- [x] T020 [US4] 在 `TreeToolbar.tsx` 中新增导出按钮——点击后直接使用 `getActivePathMessages` + `formatChatAsMarkdown` 导出当前激活路径
  - 📁 `src/renderer/components/conversation-tree/TreeToolbar.tsx`

**检查点**：US4 完成——激活路径可通过两个入口导出

---

## 第七阶段：US5 — Detail 面板表格溢出修复（优先级：P2）

**目标**：Markdown 表格在 Detail 面板内可水平滚动，不会撑破面板布局，面板拖拽调整宽度正常工作

**独立验证**：让 AI 生成一个含宽表格的回答，在 Detail 面板中查看表格是否可滚动、面板是否可拖拽

### 实施任务

- [x] T021 [P] [US5] 在 `Markdown.tsx` 中为 `<table>` 元素包裹 `<div style={{ overflowX: 'auto', maxWidth: '100%' }}>` 容器——修改 react-markdown 的 `components` prop 中的 `table` 组件
  - 📁 `src/renderer/components/Markdown.tsx`

- [x] T022 [P] [US5] 确保 `MessageDetailPanel` 的内容区域有 `max-width: 100%` 和 `overflow: hidden`，防止表格撑开面板宽度
  - 📁 `src/renderer/components/conversation-tree/MessageDetailPanel.tsx`

> 💡 T021、T022 操作不同文件，可**并行执行**

**检查点**：US5 完成——表格水平滚动正常，面板拖拽正常

---

## 第八阶段：US6 — 粘贴报错修复（优先级：P3）

**目标**：粘贴 URL、图片文件、截图时不再弹出错误，异常内容静默降级处理

**独立验证**：从浏览器粘贴 URL、从文件系统粘贴图片、从截图工具粘贴截图，均无报错

### 实施任务（同一文件，按顺序执行）

- [x] T023 [US6] 为 `onPaste` 处理函数添加 try-catch 包裹——捕获所有未处理异常，用 `console.warn` 替代抛出错误
  - 📁 `src/renderer/components/InputBox/InputBox.tsx`

- [x] T024 [US6] 对 `item.getAsFile()` 的返回值添加 null 检查——过滤掉 null 文件后再传给 `insertFiles`
  - 📁 `src/renderer/components/InputBox/InputBox.tsx`

- [x] T025 [US6] 对 `insertFiles` 和 `insertLinks` 的输入做空数组过滤——数组为空时跳过调用
  - 📁 `src/renderer/components/InputBox/InputBox.tsx`

- [x] T026 [US6] 为 `item.getAsString()` 回调中的逻辑添加异常保护——回调体用 try-catch 包裹
  - 📁 `src/renderer/components/InputBox/InputBox.tsx`

**检查点**：US6 完成——所有粘贴操作无报错

---

## 第九阶段：收尾与全局验证

**目的**：跨故事的最终验证

- [x] T027 运行 `npm run dev`，按照 `specs/20260306_bugfix/quickstart.md` 的 7 项验证步骤进行完整手动测试
- [x] T028 确认无 TypeScript 编译错误：在项目根目录运行 `npx tsc --noEmit`

---

## 依赖关系与执行顺序

### 阶段依赖

| 阶段 | 依赖 | 说明 |
|------|------|------|
| 第一阶段（环境准备） | 无 | 立即开始 |
| 第二阶段（基础设施） | 第一阶段 | **仅阻塞 US4** |
| 第三阶段（US1） | 仅第一阶段 | 独立 |
| 第四阶段（US2） | 仅第一阶段 | 独立 |
| 第五阶段（US3） | 仅第一阶段 | 独立 |
| 第六阶段（US4） | 第二阶段（T003） | 需要类型扩展 |
| 第七阶段（US5） | 仅第一阶段 | 独立 |
| 第八阶段（US6） | 仅第一阶段 | 独立 |
| 第九阶段（收尾） | 所有前置阶段 | 最后执行 |

### 故事间依赖关系图

```
第一阶段（环境准备）
    │
    ├── 第二阶段（T003 类型扩展） ──→ 第六阶段（US4 导出）
    │
    ├── 第三阶段（US1 分叉） ──┐
    ├── 第四阶段（US2 重新生成）──┤
    ├── 第五阶段（US3 Light UI）──┼──→ 第九阶段（收尾验证）
    ├── 第七阶段（US5 表格）  ──┤
    └── 第八阶段（US6 粘贴）  ──┘
```

- **US1、US2、US3、US5、US6**：完全独立，可并行执行
- **US4**：依赖 T003（类型扩展），T003 完成后可与其他 US 并行

### 并行机会汇总

| 范围 | 可并行任务 | 说明 |
|------|-----------|------|
| 全局（T003 后） | US1–US6 共 6 个故事 | 最大并行度 |
| US2 内部 | T008、T009、T010 | 3 个不同文件 |
| US3 内部 | T012、T013、T014、T015 | 4 个不同文件 |
| US5 内部 | T021、T022 | 2 个不同文件 |

---

## 推荐实施策略

### 策略一：MVP 优先（仅 P1 核心）

1. 完成第一阶段：环境验证
2. 完成第二阶段：类型扩展
3. 完成第三阶段：US1 — Prompt 分叉创建
4. 完成第四阶段：US2 — 重新生成模型配置
5. **暂停验证**：独立测试 US1 + US2
6. 核心功能修复完毕 ✅

### 策略二：增量交付

1. 环境准备 + 基础设施 → 基础就绪
2. US1（Prompt 分叉）→ 测试 → **P1 里程碑**
3. US2（重新生成）→ 测试 → **P1 完成**
4. US3（Light UI）+ US5（表格修复）→ 测试 → **P2 视觉修复**
5. US4（导出功能）→ 测试 → **P2 功能完成**
6. US6（粘贴修复）→ 测试 → **P3 稳定性**
7. 收尾验证 → **全部完成** 🎉

---

## 统计概览

| 指标 | 数值 |
|------|------|
| 总任务数 | 28 |
| 总阶段数 | 9 |
| 涉及文件数 | ~15 |
| 新增依赖 | 无 |
| 数据迁移 | 无 |
| 破坏性变更 | 无 |

| 故事 | 优先级 | 任务数 | 任务编号 |
|------|--------|--------|----------|
| 环境准备 | — | 2 | T001–T002 |
| 基础设施 | — | 1 | T003 |
| US1 Prompt 分叉 | **P1** 🎯 | 4 | T004–T007 |
| US2 重新生成 | **P1** | 4 | T008–T011 |
| US3 Light UI | P2 | 5 | T012–T016 |
| US4 导出适配 | P2 | 4 | T017–T020 |
| US5 表格溢出 | P2 | 2 | T021–T022 |
| US6 粘贴修复 | P3 | 4 | T023–T026 |
| 收尾验证 | — | 2 | T027–T028 |
