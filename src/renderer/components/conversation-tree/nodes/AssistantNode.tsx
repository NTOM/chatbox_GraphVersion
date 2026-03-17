/**
 * AI 助手消息节点
 * // [GitLine] Adapted from GitTree-Function branch
 */

import { memo, useState, useCallback } from 'react'
import { Handle, Position } from '@xyflow/react'
import { IconRobot, IconLoader2, IconGitBranch, IconGitFork, IconCopy, IconQuote, IconReload, IconTrash, IconSwitchHorizontal } from '@tabler/icons-react'
import { ActionIcon, Tooltip, Flex, Paper } from '@mantine/core'
import { useTranslation } from 'react-i18next'

import type { TreeNodeData } from '@/lib/conversation-tree-adapter'
import { getMessagePreviewText } from '@/lib/conversation-tree-adapter'
import { getBranchColor } from '../utils/branchColors'
import { cn } from '@/lib/utils'
import dayjs from 'dayjs'
import { getMessageText } from '@shared/utils/message'
import { copyToClipboard } from '@/packages/navigator'
import * as toastActions from '@/stores/toastActions'
import { useUIStore } from '@/stores/uiStore'
import { useMultiModelStore } from '@/stores/multiModelStore'
// [GitLine] Adapted: removed switchToMessageBranch (not in upstream), using switchFork instead
// [GitLine] Use removeTreeMessage for full-scope deletion (including fork branches)
import { removeTreeMessage } from '@/lib/conversation-tree-adapter'
import { regenerateInNewFork } from '@/stores/sessionActions'
import { switchFork } from '@/stores/session/forks'

type AssistantNodeProps = {
  data: TreeNodeData
  selected?: boolean
}

function AssistantNodeComponent({ data, selected: _rfSelected }: AssistantNodeProps) {
  const { t } = useTranslation()
  const [isHovered, setIsHovered] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const setQuote = useUIStore((state) => state.setQuote)
  
  // 多模型配置
  const multiModelEnabled = useMultiModelStore((s) => s.multiModelEnabled)
  const selectedModels = useMultiModelStore((s) => s.selectedModels)
  
  // 使用我们自己管理的选中状态，而不是 ReactFlow 的 selected
  const isSelected = data.isSelected ?? false
  
  const previewText = getMessagePreviewText(data.message, 100)
  const timestamp = data.message.timestamp
    ? dayjs(data.message.timestamp).format('HH:mm')
    : ''
  const isGenerating = data.message.generating
  const hasError = !!data.message.error
  
  const isBranch = data.branchCount > 1
  const branchColor = isBranch ? getBranchColor(data.branchIndex) : null

  const handleMouseEnter = useCallback(() => setIsHovered(true), [])
  const handleMouseLeave = useCallback(() => {
    setIsHovered(false)
    setIsDeleting(false)
  }, [])

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

  // 重新生成
  const handleRegenerate = useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
    regenerateInNewFork(data.sessionId, data.message)
  }, [data.message, data.sessionId])

  // 删除消息 - 在所有分支都有效（包括非活跃分支）
  const handleDelete = useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
    e.preventDefault()
    if (isDeleting) {
      removeTreeMessage(data.sessionId, data.message.id).catch(err => {
        console.error('[GitLine] Failed to delete message:', err)
      })
      setIsDeleting(false)
    } else {
      setIsDeleting(true)
      setTimeout(() => setIsDeleting(false), 3000)
    }
  }, [data.sessionId, data.message.id, isDeleting])

  // [GitLine] Adapted: 切换到此分支 — 使用 upstream 的 switchFork API
  // 关键：switchFork 的第二个参数是分支点消息 ID（messageForksHash 的 key），
  // 而不是当前节点的消息 ID。forkParentId 在 adapter 中被正确设置。
  const handleSwitchToBranch = useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
    e.preventDefault()
    const forkPointId = data.forkParentId
    if (!forkPointId) {
      console.warn('[GitLine] Cannot switch branch: no forkParentId for message', data.message.id)
      return
    }
    // 使用 switchFork 切换到下一个分支（循环切换）
    switchFork(data.sessionId, forkPointId, 'next').catch(err => {
      console.error('[GitLine] Failed to switch fork:', err)
    })
  }, [data.sessionId, data.message.id, data.forkParentId])

  // 点击 Handle 创建节点
  const handleSourceClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
    // 触发自定义事件，由父组件处理
    const event = new CustomEvent('node-handle-click', {
      bubbles: true,
      detail: { nodeId: data.message.id, nodeType: 'assistant', element: e.currentTarget }
    })
    e.currentTarget.dispatchEvent(event)
  }, [data.message.id])

  return (
    <div
      className={cn(
        'w-[260px] rounded-lg border-2 p-3 transition-all relative group',
        'bg-white dark:bg-green-900/30 border-green-200 dark:border-green-700',
        'shadow-sm dark:shadow-none',
        data.isActivePath && 'ring-2 ring-green-400 ring-offset-2 dark:ring-offset-gray-900',
        !data.isActivePath && 'opacity-70 dark:opacity-80',
        hasError && 'border-red-300 dark:border-red-700 bg-red-50 dark:bg-red-900/30',
        isSelected && 'border-green-500',
        isHovered && 'shadow-md'
      )}
      style={{
        ...(isBranch && !data.isActivePath && !hasError ? {
          borderColor: branchColor?.border,
          backgroundColor: branchColor?.bg,
        } : {}),
        ...(isSelected ? {
          boxShadow: '0 0 20px 4px rgba(34, 197, 94, 0.5), 0 0 40px 8px rgba(34, 197, 94, 0.25)',
          animation: 'node-glow-pulse 2s ease-in-out infinite',
        } : {}),
      }}
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
        className={cn('!w-3 !h-3', hasError ? '!bg-red-400' : '!bg-green-400')}
        style={isBranch && !data.isActivePath && !hasError ? { backgroundColor: branchColor?.border } : undefined}
      />

      {/* 头部 */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <div
            className={cn(
              'w-6 h-6 rounded-full flex items-center justify-center',
              hasError ? 'bg-red-500' : 'bg-green-500'
            )}
          >
            {isGenerating ? (
              <IconLoader2 size={14} className="text-white animate-spin" />
            ) : (
              <IconRobot size={14} className="text-white" />
            )}
          </div>
          <span
            className={cn(
              'text-xs font-medium',
              hasError
                ? 'text-red-600 dark:text-red-400'
                : 'text-green-600 dark:text-green-400',
              // 未激活节点在夜间模式下使用深色文字
              !data.isActivePath && !hasError && 'dark:text-green-700'
            )}
          >
            {data.message.model || 'Assistant'}
          </span>
        </div>
        {timestamp && (
          <span className={cn(
            'text-xs text-gray-400 dark:text-gray-500',
            !data.isActivePath && 'dark:text-gray-600'
          )}>{timestamp}</span>
        )}
      </div>

      {/* 内容预览 */}
      <div
        className={cn(
          'text-sm line-clamp-3',
          hasError
            ? 'text-red-600 dark:text-red-300'
            : 'text-gray-700 dark:text-gray-200',
          // 未激活节点在夜间模式下使用深色文字，因为背景色较亮
          !data.isActivePath && !hasError && 'dark:text-gray-800'
        )}
      >
        {hasError ? (
          <span>⚠️ {data.message.error}</span>
        ) : isGenerating ? (
          // 流式生成时显示实时内容
          <span>
            {previewText || <span className="italic text-gray-400">Generating...</span>}
            <span className="inline-block w-1.5 h-4 bg-green-500 ml-0.5 animate-pulse" />
          </span>
        ) : (
          previewText || '(Empty response)'
        )}
      </div>

      {/* Token 使用信息 */}
      {data.message.usage?.totalTokens && (
        <div className={cn(
          'mt-2 text-xs text-gray-400 dark:text-gray-500',
          !data.isActivePath && 'dark:text-gray-600'
        )}>
          🎯 {data.message.usage.totalTokens} tokens
        </div>
      )}

      {/* 分支指示器 */}
      {isBranch && (
        <div 
          className="mt-2 text-xs flex items-center gap-1 font-medium"
          style={{ color: branchColor?.text }}
        >
          <IconGitBranch size={12} />
          Branch {data.branchIndex + 1}/{data.branchCount}
        </div>
      )}

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
      {isHovered && !isGenerating && (
        <Paper
          shadow="sm"
          radius="md"
          p={4}
          className="absolute -bottom-10 left-1/2 -translate-x-1/2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 z-[100] nopan nodrag"
          onClick={(e) => e.stopPropagation()}
          onMouseDown={(e) => e.stopPropagation()}
          onDoubleClick={(e) => e.stopPropagation()}
          onPointerDown={(e) => e.stopPropagation()}
          style={{ pointerEvents: 'auto' }}
        >
          <Flex gap={2}>
            {/* 有分支点且属于多分支时显示切换按钮（允许从任意分支切换到下一个） */}
            {data.forkParentId && isBranch && (
              <Tooltip label={t('Switch to this branch')} withArrow openDelay={300}>
                <ActionIcon variant="light" size="sm" color="violet" onClick={handleSwitchToBranch}>
                  <IconSwitchHorizontal size={16} />
                </ActionIcon>
              </Tooltip>
            )}
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
            {data.isActivePath && (
              <Tooltip label={t('Reply Again')} withArrow openDelay={300}>
                <ActionIcon variant="subtle" size="sm" color="green" onClick={handleRegenerate}>
                  <IconReload size={16} />
                </ActionIcon>
              </Tooltip>
            )}
            <Tooltip label={isDeleting ? t('Click again to confirm') : t('delete')} withArrow openDelay={300} color={isDeleting ? 'red' : undefined}>
              <ActionIcon variant={isDeleting ? 'filled' : 'subtle'} size="sm" color="red" onClick={handleDelete}>
                <IconTrash size={16} />
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
          '!w-4 !h-4 transition-all cursor-pointer',
          hasError ? '!bg-red-400 hover:!bg-red-500' : '!bg-green-400 hover:!bg-green-500',
          'hover:!w-6 hover:!h-6',
          isHovered && '!w-5 !h-5'
        )}
        style={isBranch && !data.isActivePath && !hasError ? { backgroundColor: branchColor?.border } : undefined}
        id="source-handle"
        onClick={handleSourceClick}
      />
    </div>
  )
}

export const AssistantNode = memo(AssistantNodeComponent)
