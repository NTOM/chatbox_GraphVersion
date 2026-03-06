# Quickstart: 20260306_bugfix

## 环境准备

```bash
# Node.js >= 20, < 23
node --version

# 安装依赖
cd e:/GitHub/chatbox_gitLine
npm install

# 启动开发模式
npm run dev
```

## 文件修改清单

### Bug 1: Prompt 层级分叉 (US1)
| 文件 | 操作 | 说明 |
|------|------|------|
| `src/renderer/components/conversation-tree/ConversationTreeView.tsx` | 修改 | 确保 handleCreateUserNode 对 system 节点正确工作 |
| `src/renderer/components/conversation-tree/NodeCreatePopover.tsx` | 修改 | System 节点下的 popover 行为调整 |
| `src/renderer/components/conversation-tree/NodeActionBar.tsx` | 修改 | 为 System 节点启用右键"添加分支" |

### Bug 2: 重新生成模型配置 (US2)
| 文件 | 操作 | 说明 |
|------|------|------|
| `src/renderer/components/conversation-tree/NodeActionBar.tsx` | 审查 | 确认 multiModels 传递 |
| `src/renderer/components/conversation-tree/MessageDetailPanel.tsx` | 审查/修改 | 确认 multiModels 传递 |
| `src/renderer/components/Message.tsx` | 审查/修改 | 列表视图重新生成按钮 |

### Bug 3: 白天模式 UI (US3)
| 文件 | 操作 | 说明 |
|------|------|------|
| `src/renderer/components/conversation-tree/MessageDetailPanel.tsx` | 修改 | 增加 light mode 边框/阴影 |
| `src/renderer/components/conversation-tree/nodes/SystemNode.tsx` | 修改 | Light mode 对比度 |
| `src/renderer/components/conversation-tree/nodes/UserNode.tsx` | 修改 | Light mode 对比度 |
| `src/renderer/components/conversation-tree/nodes/AssistantNode.tsx` | 修改 | Light mode 对比度 |
| `src/renderer/components/conversation-tree/ConversationTreeView.tsx` | 修改 | 画布背景色 |

### Bug 4: 对话导出 (US4)
| 文件 | 操作 | 说明 |
|------|------|------|
| `src/shared/types.ts` 或 `src/shared/types/session.ts` | 修改 | 扩展 ExportChatScope |
| `src/renderer/lib/conversation-tree-adapter.ts` | 修改 | 新增 getActivePathMessages |
| `src/renderer/stores/sessionHelpers.ts` | 修改 | exportChat 增加 active_path 分支 |
| `src/renderer/modals/ExportChat.tsx` | 修改 | 新增 scope 选项 |
| `src/renderer/components/conversation-tree/TreeToolbar.tsx` | 修改 | 新增导出按钮 |

### Bug 5: Detail 面板表格 (US5)
| 文件 | 操作 | 说明 |
|------|------|------|
| `src/renderer/components/Markdown.tsx` | 修改 | 表格元素添加 overflow-x 容器 |
| `src/renderer/components/conversation-tree/MessageDetailPanel.tsx` | 修改 | 内容区域 overflow 控制 |

### Bug 6: 粘贴报错 (US6)
| 文件 | 操作 | 说明 |
|------|------|------|
| `src/renderer/components/InputBox/InputBox.tsx` | 修改 | onPaste 增加 try-catch 和 null 检查 |

## 验证步骤

1. `npm run dev` 启动无报错
2. 切换到树视图，在 System Prompt 节点上点击 Output Handle → 能创建 User 节点
3. 切换底部为单模型/多模型，点击 Assistant 节点重新生成 → 遵循当前配置
4. 切换到 Light 模式 → 面板与背景明显区分
5. 选中激活路径，导出 → Markdown 仅包含激活路径
6. 让 AI 生成含表格回答 → Detail 面板表格可滚动，面板可拖拽
7. 粘贴 URL、截图、图片文件 → 无报错
