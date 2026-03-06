# UI Contracts: 20260306_bugfix

## C1: System Node 交互合约

### Output Handle 行为
- System 节点底部 Output Handle 点击 → 弹出 `NodeCreatePopover`
- Popover 中仅显示 "Add User Message" 和 "Use Main Input"
- "Generate AI Response" 按钮 **不可用**（因为 `message.role === 'system'`）

### 右键菜单行为
- System 节点右键 → 上下文菜单包含 "添加分支" 选项
- 点击后创建 User 节点作为子节点

---

## C2: 重新生成按钮合约

### 触发点
| 组件 | 位置 | 条件 |
|------|------|------|
| NodeActionBar | 节点悬浮操作栏 | `nodeType === 'assistant'` |
| MessageDetailPanel | 详情面板操作按钮区 | `message.role === 'assistant'` |
| AssistantNode 内联 | 节点内部 | 内联重新生成按钮 |
| Message.tsx | 列表视图消息 | 传统刷新按钮 |

### 统一行为
```
读取 useMultiModelStore → { multiModelEnabled, selectedModels }
if (multiModelEnabled && selectedModels.length > 0):
  multiModels = selectedModels
else:
  multiModels = undefined

regenerateInNewFork(sessionId, message, { multiModels })
```

---

## C3: 导出功能合约

### 入口 1：原有导出菜单
- 位置：会话菜单 → "Export Chat"
- 组件：`ExportChat.tsx` 模态框
- 新增 Scope 选项：`active_path`（"Active Path"）
- 仅在树视图模式下显示该选项

### 入口 2：树状图工具栏
- 位置：`TreeToolbar.tsx` 新增导出按钮
- 行为：直接导出当前激活路径为 Markdown（跳过模态框）
- 使用 `getActivePathMessages(session)` 获取消息列表

### 输出格式
与原版完全一致：`formatChatAsMarkdown` / `formatChatAsTxt` / `formatChatAsHtml`

---

## C4: Detail 面板表格渲染合约

### 表格容器
```html
<div style="overflow-x: auto; max-width: 100%;">
  <table>...</table>
</div>
```

### 面板拖拽
- 拖拽手柄始终位于面板最左侧
- 表格内容溢出不影响拖拽手柄位置
- `minWidth: 240px`, `maxWidth: 600px`

---

## C5: 粘贴处理合约

### 输入类型处理
| 粘贴内容 | 处理方式 | 错误处理 |
|----------|----------|----------|
| URL 文本 | `insertLinks(urls)` | 空 URL 过滤，try-catch |
| 图片文件 | `insertFiles([file])` | null 文件过滤，try-catch |
| 截图 | `insertFiles([file])` | null 文件过滤，try-catch |
| 空/异常内容 | 忽略，不报错 | 全局 try-catch |

### 错误处理原则
- 任何粘贴操作不显示未处理的错误弹窗
- 异常情况静默降级
- 可选：console.warn 记录错误信息
