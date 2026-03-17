/**
 * 消息详情面板组件
 * 右侧常驻显示，点击节点后显示完整消息内容
 * 支持流式文字显示和可拖拽宽度调整
 * // [GitLine] Adapted from GitTree-Function branch
 */

import { useCallback, useMemo, useRef, useState, useEffect } from 'react'
import { Text, Flex, ActionIcon, Tooltip, ScrollArea, Badge, Divider, Stack, Paper } from '@mantine/core'
import {
  IconCopy,
  IconPencil,
  IconReload,
  IconTrash,
  IconQuote,
  IconRobot,
  IconUser,
  IconSettings,
  IconX,
  IconGripVertical,
} from '@tabler/icons-react'
import { useTranslation } from 'react-i18next'
import NiceModal from '@ebay/nice-modal-react'
import dayjs from 'dayjs'

import type { Message, Session } from '@shared/types'
import { getMessageText } from '@shared/utils/message'
import Markdown from '@/components/Markdown'
import { BlockCodeCollapsedStateProvider } from '@/components/Markdown'
import { useSettingsStore } from '@/stores/settingsStore'
import { useUIStore } from '@/stores/uiStore'
import { useMultiModelStore } from '@/stores/multiModelStore'
import { copyToClipboard } from '@/packages/navigator'
import * as toastActions from '@/stores/toastActions'
import { regenerateInNewFork } from '@/stores/sessionActions'
import { removeTreeMessage } from '@/lib/conversation-tree-adapter'
import { cn } from '@/lib/utils'

import TextSelectionQuote from './TextSelectionQuote'

export interface MessageDetailPanelProps {
  message: Message | null
  session: Session | null
  onQuote?: (quotedText: string) => void
  onClose?: () => void
  className?: string
  /** 面板宽度 */
  width?: number
  /** 宽度变化回调 */
  onWidthChange?: (width: number) => void
  /** 最小宽度 */
  minWidth?: number
  /** 最大宽度 */
  maxWidth?: number
}

export function MessageDetailPanel({
  message,
  session,
  onQuote,
  onClose,
  className,
  width,
  onWidthChange,
  minWidth = 240,
  maxWidth = 600,
}: MessageDetailPanelProps) {
  const { t } = useTranslation()
  const contentRef = useRef<HTMLDivElement>(null)
  const resizeRef = useRef<HTMLDivElement>(null)
  const [isResizing, setIsResizing] = useState(false)
  const enableMarkdownRendering = useSettingsStore((s) => s.enableMarkdownRendering)
  const enableLaTeXRendering = useSettingsStore((s) => s.enableLaTeXRendering)
  const enableMermaidRendering = useSettingsStore((s) => s.enableMermaidRendering)
  const showTokenCount = useSettingsStore((s) => s.showTokenCount)
  const showWordCount = useSettingsStore((s) => s.showWordCount)
  const setQuote = useUIStore((state) => state.setQuote)
  
  // 多模型配置
  const multiModelEnabled = useMultiModelStore((s) => s.multiModelEnabled)
  const selectedModels = useMultiModelStore((s) => s.selectedModels)

  // 从 session 中实时获取消息（支持流式更新）
  const liveMessage = useMemo(() => {
    if (!message || !session) return message
    
    // 在主消息列表中查找
    const mainMsg = session.messages.find(m => m.id === message.id)
    if (mainMsg) return mainMsg
    
    // 在分支中查找
    if (session.messageForksHash) {
      for (const forkData of Object.values(session.messageForksHash)) {
        for (const branch of forkData.lists) {
          const branchMsg = branch.messages.find(m => m.id === message.id)
          if (branchMsg) return branchMsg
        }
      }
    }
    
    return message
  }, [message, session])

  // 获取消息文本内容
  const messageText = useMemo(() => {
    if (!liveMessage) return ''
    return getMessageText(liveMessage)
  }, [liveMessage])

  // 格式化时间戳
  const formattedTime = useMemo(() => {
    if (!liveMessage?.timestamp) return ''
    return dayjs(liveMessage.timestamp).format('YYYY-MM-DD HH:mm:ss')
  }, [liveMessage?.timestamp])

  // 拖拽调整宽度
  useEffect(() => {
    if (!onWidthChange) return

    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing) return
      
      const containerRect = resizeRef.current?.parentElement?.getBoundingClientRect()
      if (!containerRect) return
      
      // 计算新宽度（从右边界向左拖拽）
      const newWidth = containerRect.right - e.clientX
      const clampedWidth = Math.max(minWidth, Math.min(maxWidth, newWidth))
      onWidthChange(clampedWidth)
    }

    const handleMouseUp = () => {
      setIsResizing(false)
    }

    if (isResizing) {
      document.addEventListener('mousemove', handleMouseMove)
      document.addEventListener('mouseup', handleMouseUp)
      document.body.style.cursor = 'col-resize'
      document.body.style.userSelect = 'none'
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
    }
  }, [isResizing, onWidthChange, minWidth, maxWidth])

  const handleResizeStart = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    setIsResizing(true)
  }, [])

  // 复制消息
  const handleCopy = useCallback(() => {
    if (!liveMessage) return
    copyToClipboard(getMessageText(liveMessage, true, false))
    toastActions.add(t('copied to clipboard'), 2000)
  }, [liveMessage, t])

  // 引用消息
  const handleQuote = useCallback(() => {
    if (!liveMessage) return
    const input = getMessageText(liveMessage)
      .split('\n')
      .map((line) => `> ${line}`)
      .join('\n')
    setQuote(input + '\n\n-------------------\n\n')
  }, [liveMessage, setQuote])

  // 编辑消息
  const handleEdit = useCallback(async () => {
    if (!liveMessage || !session) return
    await NiceModal.show('message-edit', { sessionId: session.id, msg: liveMessage })
  }, [liveMessage, session])

  // 重新生成
  const handleRegenerate = useCallback(() => {
    if (!liveMessage || !session) return
    regenerateInNewFork(session.id, liveMessage)
  }, [liveMessage, session])

  // 删除消息
  const handleDelete = useCallback(() => {
    if (!liveMessage || !session) return
    removeTreeMessage(session.id, liveMessage.id)
    onClose?.()
  }, [liveMessage, session, onClose])

  // 处理文本选中引用
  const handleTextSelectionQuote = useCallback((quotedText: string) => {
    if (onQuote) {
      onQuote(quotedText)
    } else {
      const formattedQuote = quotedText
        .split('\n')
        .map((line) => `> ${line}`)
        .join('\n')
      setQuote(formattedQuote + '\n\n')
    }
  }, [onQuote, setQuote])

  // 空状态
  if (!message || !liveMessage) {
    return (
      <div className={cn(
        'flex flex-col items-center justify-center h-full',
        'text-gray-400 dark:text-gray-500',
        className
      )}>
        <IconRobot size={48} strokeWidth={1} className="mb-3 opacity-50" />
        <Text size="sm" c="dimmed">{t('Click a node to view details')}</Text>
      </div>
    )
  }

  const isUser = liveMessage.role === 'user'
  const isAssistant = liveMessage.role === 'assistant'
  const isSystem = liveMessage.role === 'system'

  return (
    <div className={cn('flex h-full relative', className)}>
      {/* 左侧拖拽手柄 */}
      {onWidthChange && (
        <div
          ref={resizeRef}
          className={cn(
            'absolute left-0 top-0 bottom-0 w-1 cursor-col-resize z-10',
            'hover:bg-blue-400 active:bg-blue-500 transition-colors',
            isResizing && 'bg-blue-500'
          )}
          onMouseDown={handleResizeStart}
        >
          <div className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-1/2 w-3 h-8 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
            <IconGripVertical size={12} className="text-gray-400" />
          </div>
        </div>
      )}
      
      <div className="flex flex-col h-full flex-1">
        {/* 头部 */}
        <div className="flex-shrink-0 px-4 py-3 border-b border-gray-200 dark:border-gray-700">
          <Flex align="center" justify="space-between">
            <Flex align="center" gap="sm">
              {isUser && <IconUser size={18} className="text-blue-500" />}
              {isAssistant && <IconRobot size={18} className="text-green-500" />}
              {isSystem && <IconSettings size={18} className="text-gray-500" />}
              <Text fw={600} size="sm">
                {isUser && t('User Message')}
                {isAssistant && (liveMessage.model || t('Assistant'))}
                {isSystem && t('System Prompt')}
              </Text>
              {liveMessage.generating && (
                <Badge variant="light" color="green" size="xs">
                  {t('Generating...')}
                </Badge>
              )}
            </Flex>
            {onClose && (
              <ActionIcon variant="subtle" size="sm" onClick={onClose}>
                <IconX size={16} />
              </ActionIcon>
            )}
          </Flex>
        </div>

        {/* 元信息区域 */}
        <div className="flex-shrink-0 px-4 py-2 border-b border-gray-100 dark:border-gray-800">
          <Flex gap="xs" wrap="wrap">
            {formattedTime && (
              <Badge variant="light" color="gray" size="xs">
                {formattedTime}
              </Badge>
            )}
            {showWordCount && liveMessage.wordCount !== undefined && (
              <Badge variant="light" color="blue" size="xs">
                {liveMessage.wordCount} {t('words')}
              </Badge>
            )}
            {showTokenCount && liveMessage.tokenCount !== undefined && (
              <Badge variant="light" color="violet" size="xs">
                {liveMessage.tokenCount} tokens
              </Badge>
            )}
            {isAssistant && liveMessage.usage?.totalTokens && (
              <Badge variant="light" color="green" size="xs">
                {liveMessage.usage.totalTokens} tokens
              </Badge>
            )}
          </Flex>
        </div>

        {/* 操作按钮 */}
        <div className="flex-shrink-0 px-4 py-2 border-b border-gray-100 dark:border-gray-800">
          <Flex gap="xs">
            <Tooltip label={t('copy')} withArrow position="bottom">
              <ActionIcon variant="subtle" size="sm" onClick={handleCopy} disabled={liveMessage.generating}>
                <IconCopy size={16} />
              </ActionIcon>
            </Tooltip>
            <Tooltip label={t('quote')} withArrow position="bottom">
              <ActionIcon variant="subtle" size="sm" onClick={handleQuote} disabled={liveMessage.generating}>
                <IconQuote size={16} />
              </ActionIcon>
            </Tooltip>
            {!isSystem && (
              <Tooltip label={t('edit')} withArrow position="bottom">
                <ActionIcon variant="subtle" size="sm" onClick={handleEdit} disabled={liveMessage.generating}>
                  <IconPencil size={16} />
                </ActionIcon>
              </Tooltip>
            )}
            {isAssistant && (
              <Tooltip label={t('Reply Again')} withArrow position="bottom">
                <ActionIcon variant="subtle" size="sm" color="green" onClick={handleRegenerate} disabled={liveMessage.generating}>
                  <IconReload size={16} />
                </ActionIcon>
              </Tooltip>
            )}
            <Tooltip label={t('delete')} withArrow position="bottom">
              <ActionIcon variant="subtle" size="sm" color="red" onClick={handleDelete} disabled={liveMessage.generating}>
                <IconTrash size={16} />
              </ActionIcon>
            </Tooltip>
          </Flex>
        </div>

        {/* 消息内容区域 */}
        <ScrollArea className="flex-1" offsetScrollbars>
          <div ref={contentRef} className="relative px-4 py-3 max-w-full overflow-hidden">
            <TextSelectionQuote
              containerRef={contentRef}
              onQuote={handleTextSelectionQuote}
            />
            <BlockCodeCollapsedStateProvider defaultCollapsed={false}>
              {enableMarkdownRendering ? (
                <Markdown
                  uniqueId={liveMessage.id}
                  enableLaTeXRendering={enableLaTeXRendering}
                  enableMermaidRendering={enableMermaidRendering}
                  generating={liveMessage.generating}
                >
                  {messageText}
                </Markdown>
              ) : (
                <div className="whitespace-pre-wrap break-words text-sm">
                  {messageText}
                  {liveMessage.generating && (
                    <span className="inline-block w-1.5 h-4 bg-green-500 ml-0.5 animate-pulse align-middle" />
                  )}
                </div>
              )}
            </BlockCodeCollapsedStateProvider>
          </div>
        </ScrollArea>

        {/* 附件区域 */}
        {(liveMessage.files?.length || liveMessage.links?.length) && (
          <div className="flex-shrink-0 px-4 py-2 border-t border-gray-200 dark:border-gray-700">
            <Text size="xs" fw={600} mb="xs" c="dimmed">
              {t('Attachments')} ({(liveMessage.files?.length || 0) + (liveMessage.links?.length || 0)})
            </Text>
            <Flex gap="xs" wrap="wrap">
              {liveMessage.files?.map((file) => (
                <Badge key={file.name} variant="outline" size="xs">
                  📎 {file.name}
                </Badge>
              ))}
              {liveMessage.links?.map((link) => (
                <Badge key={link.url} variant="outline" size="xs">
                  🔗 {link.title}
                </Badge>
              ))}
            </Flex>
          </div>
        )}
      </div>
    </div>
  )
}

export default MessageDetailPanel
