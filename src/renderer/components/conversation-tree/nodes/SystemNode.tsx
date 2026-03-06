/**
 * 系统提示节点
 */

import { memo, useState, useCallback } from 'react'
import { Handle, Position } from '@xyflow/react'
import { IconSettings, IconCopy, IconQuote, IconPlus } from '@tabler/icons-react'
import { ActionIcon, Tooltip, Flex, Paper } from '@mantine/core'
import { useTranslation } from 'react-i18next'

import type { TreeNodeData } from '@/lib/conversation-tree-adapter'
import { getMessagePreviewText } from '@/lib/conversation-tree-adapter'
import { cn } from '@/lib/utils'
import { getMessageText } from 'src/shared/utils/message'
import { copyToClipboard } from '@/packages/navigator'
import * as toastActions from '@/stores/toastActions'
import { useUIStore } from '@/stores/uiStore'

type SystemNodeProps = {
  data: TreeNodeData
  selected?: boolean
}

function SystemNodeComponent({ data, selected: _rfSelected }: SystemNodeProps) {
  const { t } = useTranslation()
  const [isHovered, setIsHovered] = useState(false)
  const setQuote = useUIStore((state) => state.setQuote)
  
  const previewText = getMessagePreviewText(data.message, 80)
  
  // 使用我们自己管理的选中状态，而不是 ReactFlow 的 selected
  const isSelected = data.isSelected ?? false

  const handleMouseEnter = useCallback(() => setIsHovered(true), [])
  const handleMouseLeave = useCallback(() => setIsHovered(false), [])

  // 复制消息
  const handleCopy = useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
    copyToClipboard(getMessageText(data.message, true, false))
    toastActions.add(t('copied to clipboard'), 2000)
  }, [data.message, t])

  // 引用消息
  const handleQuote = useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
    const input = getMessageText(data.message)
      .split('\n')
      .map((line) => `> ${line}`)
      .join('\n')
    setQuote(input + '\n\n')
    toastActions.add(t('Quote added to input'), 2000)
  }, [data.message, setQuote, t])

  // 点击 Handle 创建节点（添加分支）
  const handleSourceClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
    const event = new CustomEvent('node-handle-click', {
      bubbles: true,
      detail: { nodeId: data.message.id, nodeType: 'system', element: e.currentTarget }
    })
    e.currentTarget.dispatchEvent(event)
  }, [data.message.id])

  // 点击添加分支按钮（触发与 Handle 点击相同的行为）
  const handleCreateNode = useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
    // 找到底部 Handle 元素并触发事件
    const container = (e.currentTarget as HTMLElement).closest('[data-id]')
    const sourceHandle = container?.querySelector('[data-handleid="source-handle"]') as HTMLElement | null
    if (sourceHandle) {
      const event = new CustomEvent('node-handle-click', {
        bubbles: true,
        detail: { nodeId: data.message.id, nodeType: 'system', element: sourceHandle }
      })
      sourceHandle.dispatchEvent(event)
    }
  }, [data.message.id])

  return (
    <div
      className={cn(
        'w-[260px] rounded-lg border-2 border-dashed p-3 transition-all relative group',
        'bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600',
        'shadow-sm dark:shadow-none',
        data.isActivePath && 'ring-2 ring-blue-400 ring-offset-2 dark:ring-offset-gray-900',
        isSelected && 'border-gray-500',
        isHovered && 'shadow-md'
      )}
      style={isSelected ? {
        boxShadow: '0 0 20px 4px rgba(107, 114, 128, 0.5), 0 0 40px 8px rgba(107, 114, 128, 0.25)',
        animation: 'node-glow-pulse 2s ease-in-out infinite',
      } : undefined}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {/* 底部透明扩展区域 - 桥接节点和悬浮操作栏之间的空隙 */}
      {isHovered && (
        <div 
          className="absolute -bottom-12 left-0 right-0 h-14"
          style={{ pointerEvents: 'auto' }}
        />
      )}

      {/* 顶部连接点 */}
      <Handle
        type="target"
        position={Position.Top}
        className="!bg-gray-400 !w-3 !h-3"
      />

      {/* 头部 */}
      <div className="flex items-center gap-2 mb-2">
        <div className="w-6 h-6 rounded-full bg-gray-400 dark:bg-gray-600 flex items-center justify-center">
          <IconSettings size={14} className="text-white" />
        </div>
        <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
          System Prompt
        </span>
      </div>

      {/* 内容预览 */}
      <div className="text-sm text-gray-600 dark:text-gray-300 line-clamp-2 italic">
        {previewText || '(Empty system prompt)'}
      </div>

      {/* 多分支点指示器 - 当此节点下有多个分支时显示 */}
      {data.childrenCount > 1 && (
        <div className="absolute -right-1 -bottom-1 flex items-center justify-center">
          <div className={cn(
            'w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold',
            'bg-purple-500 text-white shadow-lg',
            'animate-pulse'
          )}>
            {data.childrenCount}
          </div>
        </div>
      )}

      {/* 悬浮操作按钮栏 */}
      {isHovered && (
        <Paper
          shadow="sm"
          radius="md"
          p={4}
          className="absolute -bottom-10 left-1/2 -translate-x-1/2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 z-[100]"
          onClick={(e) => e.stopPropagation()}
          onMouseDown={(e) => e.stopPropagation()}
          onDoubleClick={(e) => e.stopPropagation()}
          style={{ pointerEvents: 'auto' }}
        >
          <Flex gap={2}>
            <Tooltip label={t('copy')} withArrow openDelay={300}>
              <ActionIcon variant="subtle" size="sm" color="gray" onClick={handleCopy}>
                <IconCopy size={16} />
              </ActionIcon>
            </Tooltip>
            <Tooltip label={t('quote')} withArrow openDelay={300}>
              <ActionIcon variant="subtle" size="sm" color="gray" onClick={handleQuote}>
                <IconQuote size={16} />
              </ActionIcon>
            </Tooltip>
            <Tooltip label={t('Create Node')} withArrow openDelay={300}>
              <ActionIcon variant="subtle" size="sm" color="blue" onClick={handleCreateNode}>
                <IconPlus size={16} />
              </ActionIcon>
            </Tooltip>
          </Flex>
        </Paper>
      )}

      {/* 底部连接点 - 可点击创建新节点 */}
      <Handle
        type="source"
        position={Position.Bottom}
        className={cn(
          '!w-4 !h-4 !bg-gray-400 transition-all cursor-pointer',
          'hover:!w-6 hover:!h-6 hover:!bg-gray-500',
          isHovered && '!w-5 !h-5'
        )}
        id="source-handle"
        onClick={handleSourceClick}
      />
    </div>
  )
}

export const SystemNode = memo(SystemNodeComponent)
