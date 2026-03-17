/**
 * 对话树视图组件
 * 使用 ReactFlow 渲染节点式对话界面
 * // [GitLine] Adapted from GitTree-Function branch
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  ReactFlow,
  Controls,
  Background,
  BackgroundVariant,
  useNodesState,
  useEdgesState,
  useReactFlow,
  useOnViewportChange,
  ReactFlowProvider,
  SelectionMode,
  type Node,
  type OnSelectionChangeParams,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import { useTranslation } from 'react-i18next'

import type { Session, Message } from '@shared/types'
import { createMessage } from '@shared/types'
import { sessionToConversationTree, debugPrintTree, removeTreeMessages, type TreeNodeData } from '@/lib/conversation-tree-adapter'
import { applyTreeLayout, forceRelayout } from '@/lib/tree-layout'
import { useViewModeStore } from '@/stores/viewModeStore'
import { useUIStore } from '@/stores/uiStore'
import { useMultiModelStore } from '@/stores/multiModelStore'
import { Button, Group, Modal, Text, useMantineColorScheme } from '@mantine/core'
import { nodeTypes } from './nodes'
import { edgeTypes } from './edges'
import { cn } from '@/lib/utils'
import MessageDetailPanel from './MessageDetailPanel'
import NodeCreatePopover from './NodeCreatePopover'
import SelectionBoundingBox from './SelectionBoundingBox'
import TreeToolbar from './TreeToolbar'
// [GitLine] Adapted: switchFork and createNewFork are available in sessionActions via re-export from session/forks
import { insertMessageAfter, generateMore, switchFork, createNewFork, regenerateInNewFork } from '@/stores/sessionActions'

// ============ 常量 ============

const EMPTY_POSITIONS: Record<string, { x: number; y: number }> = {}

/** 节点默认宽度 */
const NODE_WIDTH = 260
/** 节点默认高度 */
const NODE_HEIGHT = 120
/** 节点间垂直间距 */
const VERTICAL_SPACING = 80

// ============ 类型定义 ============

export interface ConversationTreeViewProps {
  session: Session
  className?: string
  onCreateUserNode?: (content: string, targetMessageId: string) => void
  onCreateAssistantNode?: (targetMessageId: string) => void
  onUseBottomInput?: (targetMessageId: string) => void
}

// ============ 内部组件 ============

function ConversationTreeViewInner({ 
  session, 
  className,
  onCreateUserNode,
  onCreateAssistantNode,
  onUseBottomInput,
}: ConversationTreeViewProps) {
  const { t } = useTranslation()
  const { fitView, getViewport, setViewport, setCenter } = useReactFlow()
  const { colorScheme } = useMantineColorScheme()
  const realTheme = useUIStore((state) => state.realTheme)
  const isDarkMode = colorScheme === 'dark' || realTheme === 'dark'
  
  // Store selectors
  const setSelectedNodeId = useViewModeStore((s) => s.setSelectedNodeId)
  const selectedNodeId = useViewModeStore((s) => s.selectedNodeId)
  const selectedNodeIds = useViewModeStore((s) => s.selectedNodeIds)
  const setSelectedNodeIds = useViewModeStore((s) => s.setSelectedNodeIds)
  const interactionMode = useViewModeStore((s) => s.interactionMode)
  const setInteractionMode = useViewModeStore((s) => s.setInteractionMode)
  const clearSelection = useViewModeStore((s) => s.clearSelection)
  const updateNodePosition = useViewModeStore((s) => s.updateNodePosition)
  const updateNodePositions = useViewModeStore((s) => s.updateNodePositions)
  const clearNodePositions = useViewModeStore((s) => s.clearNodePositions)
  const nodePositionsFromStore = useViewModeStore((s) => s.nodePositions[session.id]) ?? EMPTY_POSITIONS
  const saveSessionViewport = useViewModeStore((s) => s.saveSessionViewport)
  const sessionViewport = useViewModeStore((s) => s.sessionViewports[session.id])
  const setQuote = useUIStore((state) => state.setQuote)
  
  // 多模型配置
  const multiModelEnabled = useMultiModelStore((s) => s.multiModelEnabled)
  const selectedModels = useMultiModelStore((s) => s.selectedModels)
  
  // Refs
  const prevSessionRef = useRef<string | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const pendingPositionSaveRef = useRef<Record<string, { x: number; y: number }>>({})
  const isInitialMountRef = useRef<boolean>(true)
  const isNodeClickRef = useRef<boolean>(false) // 标记是否是节点点击触发的选中变化
  
  // 消息详情面板状态
  const [selectedMessage, setSelectedMessage] = useState<Message | null>(null)
  const [showDetailPanel, setShowDetailPanel] = useState(true) // 默认显示面板
  const [detailPanelWidth, setDetailPanelWidth] = useState(320) // 默认宽度 320px
  
  // 创建节点 Popover 状态
  const [popoverOpened, setPopoverOpened] = useState(false)
  const [popoverTarget, setPopoverTarget] = useState<HTMLElement | null>(null)
  const [popoverMessage, setPopoverMessage] = useState<Message | null>(null)
  const [popoverIsLeaf, setPopoverIsLeaf] = useState(true)

  // 删除确认状态（组件内管理，避免依赖全局 modals）
  const [deleteDialogState, setDeleteDialogState] = useState<{ opened: boolean; ids: string[] }>({
    opened: false,
    ids: [],
  })
  const [isDeletingSelected, setIsDeletingSelected] = useState(false)

  // 将 Session 转换为树结构并应用布局
  const tree = useMemo(() => {
    const rawTree = sessionToConversationTree(session)
    // 传递保存的节点位置，让布局算法基于已有位置计算新节点位置
    const layoutedTree = applyTreeLayout(rawTree, { savedPositions: nodePositionsFromStore })
    if (process.env.NODE_ENV === 'development') {
      debugPrintTree(layoutedTree)
    }
    return layoutedTree
  }, [session, nodePositionsFromStore])

  // 初始化节点时优先使用保存的位置
  const initialNodes = useMemo(() => {
    return tree.nodes.map(node => {
      const savedPosition = nodePositionsFromStore[node.id]
      return savedPosition ? { ...node, position: savedPosition } : node
    })
  }, [tree.nodes, nodePositionsFromStore])

  // ReactFlow 状态
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes as any)
  const [edges, setEdges, onEdgesChange] = useEdgesState(tree.edges as any)

  // 根据节点 ID 获取消息
  const getMessageById = useCallback((nodeId: string): Message | null => {
    const mainMsg = session.messages.find(m => m.id === nodeId)
    if (mainMsg) return mainMsg
    
    if (session.messageForksHash) {
      for (const forkData of Object.values(session.messageForksHash)) {
        for (const branch of forkData.lists) {
          const branchMsg = branch.messages.find(m => m.id === nodeId)
          if (branchMsg) return branchMsg
        }
      }
    }
    return null
  }, [session.messages, session.messageForksHash])

  // 检查节点是否为叶子节点
  const isLeafNode = useCallback((nodeId: string): boolean => {
    const node = tree.nodes.find(n => n.id === nodeId)
    if (!node) return true
    return !(node.data as TreeNodeData).hasChildren
  }, [tree.nodes])

  // 查找消息的父消息 ID
  const findParentMessageId = useCallback((messageId: string): string | null => {
    const edge = tree.edges.find(e => e.target === messageId)
    return edge?.source || null
  }, [tree.edges])

  // 当树结构变化时更新节点和边（保留已有位置）
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      setNodes((currentNodes) => {
        const currentPositionMap = new Map(currentNodes.map(n => [n.id, n.position]))
        const newPositionsToSave: Record<string, { x: number; y: number }> = {}
        
        const updatedNodes = tree.nodes.map(node => {
          const currentPosition = currentPositionMap.get(node.id)
          const savedPosition = nodePositionsFromStore[node.id]
          const finalPosition = currentPosition || savedPosition || node.position
          
          if (!savedPosition && !currentPosition) {
            newPositionsToSave[node.id] = node.position
          }
          
          // 注入选中状态 - 同时设置 ReactFlow 的 selected 和自定义的 data.isSelected
          const isSelected = interactionMode === 'click' 
            ? node.id === selectedNodeId
            : selectedNodeIds.includes(node.id)
          
          return { 
            ...node, 
            position: finalPosition,
            selected: isSelected, // ReactFlow 的选中状态
            data: { ...node.data, isSelected } // 自定义的选中状态
          }
        })
        
        if (Object.keys(newPositionsToSave).length > 0) {
          pendingPositionSaveRef.current = { ...pendingPositionSaveRef.current, ...newPositionsToSave }
        }
        
        return updatedNodes as any
      })
      setEdges(tree.edges as any)
    }, 0)

    // 会话切换或组件首次挂载时处理视口
    const isSessionChange = prevSessionRef.current !== session.id
    const isFirstMount = isInitialMountRef.current
    
    if (isSessionChange || isFirstMount) {
      prevSessionRef.current = session.id
      
      // 延迟恢复或适配视口
      setTimeout(() => {
        if (sessionViewport) {
          // 恢复保存的视口状态
          setViewport(sessionViewport, { duration: 200 })
        } else if (!isFirstMount) {
          // 切换到新会话（无保存状态）时自动适配视图
          fitView({ padding: 0.2, duration: 300 })
        } else {
          // 首次挂载且无保存状态时自动适配视图
          fitView({ padding: 0.2, duration: 300 })
        }
        isInitialMountRef.current = false
      }, 100)
    }

    return () => clearTimeout(timeoutId)
  }, [tree, session.id, setNodes, setEdges, fitView, nodePositionsFromStore, sessionViewport, setViewport, selectedNodeId, selectedNodeIds, interactionMode])

  // 选中状态变化时更新节点的 isSelected 属性
  useEffect(() => {
    setNodes((currentNodes) => 
      currentNodes.map(node => {
        const isSelected = interactionMode === 'click' 
          ? node.id === selectedNodeId
          : selectedNodeIds.includes(node.id)
        
        // 只有状态真正变化时才更新
        // 同步 ReactFlow 的 selected 属性和自定义的 data.isSelected
        if (node.selected !== isSelected || (node.data as any).isSelected !== isSelected) {
          return {
            ...node,
            selected: isSelected, // 关键：告诉 ReactFlow 这个节点被选中了
            data: { ...node.data, isSelected }
          }
        }
        return node
      }) as any
    )
  }, [selectedNodeId, selectedNodeIds, interactionMode, setNodes])

  // 延迟保存新节点位置（避免循环更新）
  useEffect(() => {
    const saveTimer = setTimeout(() => {
      const pendingPositions = pendingPositionSaveRef.current
      if (Object.keys(pendingPositions).length > 0) {
        updateNodePositions(session.id, pendingPositions)
        pendingPositionSaveRef.current = {}
      }
    }, 100)
    return () => clearTimeout(saveTimer)
  }, [tree.nodes.length, session.id, updateNodePositions])

  // 监听 Handle 点击事件
  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const handleNodeHandleClick = (e: Event) => {
      const { nodeId, element } = (e as CustomEvent<{ nodeId: string; element: HTMLElement }>).detail
      const message = getMessageById(nodeId)
      if (message) {
        setPopoverMessage(message)
        setPopoverTarget(element)
        setPopoverIsLeaf(isLeafNode(nodeId))
        setPopoverOpened(true)
      }
    }

    container.addEventListener('node-handle-click', handleNodeHandleClick)
    return () => container.removeEventListener('node-handle-click', handleNodeHandleClick)
  }, [getMessageById, isLeafNode])

  // 关闭 Popover
  const handleClosePopover = useCallback(() => {
    setPopoverOpened(false)
    setPopoverTarget(null)
    setPopoverMessage(null)
  }, [])

  // 画布视口变化时关闭 Popover 并保存视口状态
  useOnViewportChange({
    onChange: useCallback(() => {
      if (popoverOpened) handleClosePopover()
    }, [popoverOpened, handleClosePopover]),
    onEnd: useCallback(() => {
      // 视口变化结束时保存状态
      const viewport = getViewport()
      saveSessionViewport(session.id, viewport)
    }, [session.id, getViewport, saveSessionViewport]),
  })

  // 节点点击 - 显示详情面板
  const handleNodeClick = useCallback((event: React.MouseEvent, node: Node) => {
    // 阻止事件冒泡，防止触发 handlePaneClick 导致取消选中
    event.stopPropagation?.()
    
    // 标记这是节点点击，防止 onSelectionChange 覆盖我们的选中状态
    isNodeClickRef.current = true
    // 延迟重置标志，确保 onSelectionChange 已经处理完
    setTimeout(() => {
      isNodeClickRef.current = false
    }, 50)
    
    if (interactionMode === 'select') {
      // 框选模式下：
      // - Ctrl/Meta 点击：切换选中状态（多选）
      // - Shift 点击：添加到选中（多选）
      // - 普通点击：替换为单选
      if (event.ctrlKey || event.metaKey) {
        // 切换选中状态
        if (selectedNodeIds.includes(node.id)) {
          setSelectedNodeIds(selectedNodeIds.filter(id => id !== node.id))
        } else {
          setSelectedNodeIds([...selectedNodeIds, node.id])
        }
      } else if (event.shiftKey) {
        // 添加到选中
        if (!selectedNodeIds.includes(node.id)) {
          setSelectedNodeIds([...selectedNodeIds, node.id])
        }
      } else {
        // 普通点击：替换为单选
        setSelectedNodeIds([node.id])
      }
    } else {
      setSelectedNodeId(node.id)
    }

    const message = getMessageById(node.id)
    if (message) {
      setSelectedMessage(message)
      setShowDetailPanel(true)
    }
  }, [interactionMode, setSelectedNodeId, setSelectedNodeIds, selectedNodeIds, getMessageById])

  // 节点双击 - 切换分支
  const handleNodeDoubleClick = useCallback((_event: React.MouseEvent, node: Node) => {
    const nodeData = node.data as TreeNodeData
    if (!nodeData.isActivePath && nodeData.branchCount > 1) {
      switchFork(session.id, node.id, 'next')
    }
  }, [session.id])

  // 节点拖拽结束 - 保存位置
  const handleNodeDragStop = useCallback((_event: React.MouseEvent, node: Node) => {
    updateNodePosition(session.id, node.id, node.position)
  }, [session.id, updateNodePosition])

  // 画布点击 - 在单击模式下取消选中
  const handlePaneClick = useCallback(() => {
    // 只在单击模式下清除选中，框选模式下保持选中状态
    if (interactionMode === 'click') {
      clearSelection()
    } else if (interactionMode === 'select') {
      // 在框选模式下，点击空白处理应清除所有选中
      setSelectedNodeIds([])
    }
  }, [clearSelection, interactionMode, setSelectedNodeIds])

  // 框选变化处理
  // 注意：onSelectionChange 在框选结束后和点击空白区域时都会触发
  const handleSelectionChange = useCallback((params: OnSelectionChangeParams) => {
    // 如果是节点点击触发的，忽略这次变化（由 handleNodeClick 处理）
    if (isNodeClickRef.current) {
      return
    }
    
    if (interactionMode === 'select') {
      const newNodeIds = params.nodes.map(n => n.id)
      
      // 只有有新的选中节点时才更新（避免空数组覆盖有效选中）
      if (newNodeIds.length > 0) {
        setSelectedNodeIds(newNodeIds)
      }
      // 注意：不处理 newNodeIds.length === 0 的情况，
      // 因为空白区域点击由 handlePaneClick 处理
    }
  }, [interactionMode, setSelectedNodeIds])

  // ============ 工具栏功能 ============

  // 聚焦到选中节点
  const handleFocus = useCallback(() => {
    const targetId = interactionMode === 'click' ? selectedNodeId : selectedNodeIds[0]
    if (!targetId) return
    
    const targetNode = nodes.find(n => n.id === targetId)
    if (targetNode) {
      const { x, y } = targetNode.position
      setCenter(x + NODE_WIDTH / 2, y + NODE_HEIGHT / 2, { zoom: 1, duration: 300 })
    }
  }, [interactionMode, selectedNodeId, selectedNodeIds, nodes, setCenter])

  // 删除选中节点
  // [GitLine] 统一删除框架：先快照当前选中，再打开组件内确认弹窗，最后走同一个执行函数
  const deletingRef = useRef(false)

  const getSelectedIdsSnapshot = useCallback(() => {
    return interactionMode === 'click'
      ? (selectedNodeId ? [selectedNodeId] : [])
      : [...selectedNodeIds]
  }, [interactionMode, selectedNodeId, selectedNodeIds])

  const sortIdsForDeletion = useCallback((ids: string[]) => {
    return [...ids].sort((a, b) => {
      const nodeA = tree.nodes.find(n => n.id === a)
      const nodeB = tree.nodes.find(n => n.id === b)
      return (nodeB?.data.depth || 0) - (nodeA?.data.depth || 0)
    })
  }, [tree.nodes])

  const closeDeleteDialog = useCallback(() => {
    setDeleteDialogState({ opened: false, ids: [] })
  }, [])

  const executeDeleteSelected = useCallback(async (idsToDelete: string[]) => {
    if (deletingRef.current || idsToDelete.length === 0) return

    deletingRef.current = true
    setIsDeletingSelected(true)

    try {
      const sortedIds = sortIdsForDeletion(idsToDelete)
      await removeTreeMessages(session.id, sortedIds)
      clearSelection()

      if (selectedMessage && idsToDelete.includes(selectedMessage.id)) {
        setSelectedMessage(null)
      }
    } catch (err) {
      console.error('[GitLine] Failed to delete selected nodes:', idsToDelete, err)
    } finally {
      deletingRef.current = false
      setIsDeletingSelected(false)
    }
  }, [session.id, sortIdsForDeletion, clearSelection, selectedMessage])

  const handleDeleteSelected = useCallback(() => {
    if (deletingRef.current || deleteDialogState.opened) return

    const idsToDelete = getSelectedIdsSnapshot()
    if (idsToDelete.length === 0) {
      return
    }

    setDeleteDialogState({
      opened: true,
      ids: idsToDelete,
    })
  }, [deleteDialogState.opened, getSelectedIdsSnapshot])

  const handleConfirmDeleteSelected = useCallback(async () => {
    const idsToDelete = [...deleteDialogState.ids]
    closeDeleteDialog()
    await executeDeleteSelected(idsToDelete)
  }, [deleteDialogState.ids, closeDeleteDialog, executeDeleteSelected])

  // 自动整理布局
  const handleAutoLayout = useCallback(() => {
    const rawTree = sessionToConversationTree(session)
    const layoutedTree = forceRelayout(rawTree)
    
    // 更新所有节点位置
    const newPositions: Record<string, { x: number; y: number }> = {}
    for (const node of layoutedTree.nodes) {
      newPositions[node.id] = node.position
    }
    
    // 清除旧位置并设置新位置
    clearNodePositions(session.id)
    updateNodePositions(session.id, newPositions)
    
    // 更新 ReactFlow 节点
    setNodes(layoutedTree.nodes as any)
    
    // 适配视图
    setTimeout(() => fitView({ padding: 0.2, duration: 300 }), 50)
  }, [session, clearNodePositions, updateNodePositions, setNodes, fitView])

  // 监听键盘快捷键（Delete 键删除选中节点）
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Delete' || e.key === 'Backspace') {
        // 确保不是在输入框中
        const target = e.target as HTMLElement
        if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) return
        handleDeleteSelected()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [handleDeleteSelected])

  // 边界框节点移动回调
  const handleBoundingBoxMove = useCallback((nodeIds: string[], _deltaX: number, _deltaY: number) => {
    // 保存移动后的位置
    const newPositions: Record<string, { x: number; y: number }> = {}
    for (const nodeId of nodeIds) {
      const node = nodes.find(n => n.id === nodeId)
      if (node) {
        newPositions[nodeId] = node.position
      }
    }
    updateNodePositions(session.id, newPositions)
  }, [nodes, session.id, updateNodePositions])

  // 获取选中的节点对象列表
  const selectedNodesForBbox = useMemo(() => {
    if (interactionMode !== 'select' || selectedNodeIds.length < 2) return []
    return nodes.filter(n => selectedNodeIds.includes(n.id))
  }, [interactionMode, selectedNodeIds, nodes])

  // 关闭详情面板
  const handleClosePanel = useCallback(() => {
    setSelectedMessage(null)
  }, [])

  // 处理引用
  const handleQuote = useCallback((quotedText: string) => {
    const formattedQuote = quotedText.split('\n').map(line => `> ${line}`).join('\n')
    setQuote(formattedQuote + '\n\n')
  }, [setQuote])

  // 获取节点当前位置（优先从 ReactFlow 状态获取，其次从 store 获取）
  const getNodePosition = useCallback((nodeId: string): { x: number; y: number } | null => {
    // 先从当前 ReactFlow 节点状态获取
    const currentNode = nodes.find(n => n.id === nodeId)
    if (currentNode) {
      return currentNode.position
    }
    // 再从 store 获取
    const savedPosition = nodePositionsFromStore[nodeId]
    if (savedPosition) {
      return savedPosition
    }
    // 最后从 tree 获取
    const treeNode = tree.nodes.find(n => n.id === nodeId)
    return treeNode?.position || null
  }, [nodes, nodePositionsFromStore, tree.nodes])

  // 计算新节点位置（基于触发节点位置）
  const calculateNewNodePosition = useCallback((triggerNodeId: string): { x: number; y: number } => {
    const triggerPosition = getNodePosition(triggerNodeId)
    if (!triggerPosition) {
      return { x: 0, y: 0 }
    }
    // 新节点位于触发节点正下方
    return {
      x: triggerPosition.x,
      y: triggerPosition.y + NODE_HEIGHT + VERTICAL_SPACING,
    }
  }, [getNodePosition])

  // 预保存新节点位置（在创建消息之前调用）
  const presaveNewNodePosition = useCallback((newNodeId: string, triggerNodeId: string) => {
    const newPosition = calculateNewNodePosition(triggerNodeId)
    updateNodePosition(session.id, newNodeId, newPosition)
  }, [session.id, calculateNewNodePosition, updateNodePosition])

  // 创建 User 节点
  const handleCreateUserNode = useCallback(async (content: string, targetMessageId: string) => {
    if (onCreateUserNode) {
      onCreateUserNode(content, targetMessageId)
      return
    }
    
    const targetMessage = getMessageById(targetMessageId)
    if (!targetMessage) return
    
    const newMsg = createMessage('user', content)
    
    // 预先保存新节点位置（基于触发节点位置）
    presaveNewNodePosition(newMsg.id, targetMessageId)
    
    // 获取多模型配置
    const multiModels = multiModelEnabled && selectedModels.length > 0 ? selectedModels : undefined
    
    // 在目标节点处创建新分支，新消息作为独立分支
    // 无论目标节点是否有子节点，都会创建并列的新分支
    await createNewFork(session.id, targetMessageId)
    await insertMessageAfter(session.id, newMsg, targetMessageId)
    
    generateMore(session.id, newMsg.id)
  }, [session.id, onCreateUserNode, getMessageById, presaveNewNodePosition])

  // 创建 Assistant 节点
  const handleCreateAssistantNode = useCallback(async (targetMessageId: string) => {
    if (onCreateAssistantNode) {
      onCreateAssistantNode(targetMessageId)
      return
    }
    
    const targetMessage = getMessageById(targetMessageId)
    if (!targetMessage) return
    
    // 获取多模型配置
    const multiModels = multiModelEnabled && selectedModels.length > 0 ? selectedModels : undefined
    
    if (targetMessage.role === 'assistant') {
      await regenerateInNewFork(session.id, targetMessage)
    } else {
      // 在 User 节点下方创建 Assistant，应该始终创建新分支
      // 这样可以避免直接插入到现有对话流中间
      await createNewFork(session.id, targetMessageId)
      generateMore(session.id, targetMessageId)
    }
  }, [session.id, onCreateAssistantNode, getMessageById])

  // 使用底部输入框
  const handleUseBottomInput = useCallback((targetMessageId: string) => {
    onUseBottomInput?.(targetMessageId)
  }, [onUseBottomInput])

  return (
    <div ref={containerRef} className={cn('w-full flex-1 min-h-0 flex flex-col', className)}>
      {/* 主内容区：ReactFlow 画布 + 详情面板 */}
      <div className="flex-1 min-h-0 flex">
        {/* 左侧：ReactFlow 画布 */}
        <div className="flex-1 flex flex-col min-w-0 bg-gray-100 dark:bg-transparent">
          <div className="flex-1 relative">
            <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onNodeClick={handleNodeClick}
            onNodeDoubleClick={handleNodeDoubleClick}
            onNodeDragStop={handleNodeDragStop}
            onPaneClick={handlePaneClick}
            onSelectionChange={handleSelectionChange}
            nodeTypes={nodeTypes as any}
            edgeTypes={edgeTypes as any}
            defaultViewport={sessionViewport || { x: 0, y: 0, zoom: 1 }}
            fitViewOptions={{ padding: 0.2 }}
            minZoom={0.1}
            maxZoom={2}
            nodesDraggable
            nodeDragThreshold={5}
            noDragClassName="nodrag"
            noPanClassName="nopan"
            nodesConnectable={false}
            elementsSelectable
            edgesFocusable={false}
            edgesReconnectable={false}
            selectionMode={SelectionMode.Full}
            selectionOnDrag={interactionMode === 'select'}
            selectNodesOnDrag={interactionMode === 'select'}
            panOnDrag={interactionMode === 'click' ? [0, 1, 2] : [1, 2]}
            proOptions={{ hideAttribution: true }}
          >
            <Controls 
              showZoom 
              showFitView 
              showInteractive={false} 
              position="bottom-right"
              className={cn(
                '[&>button]:!bg-white [&>button]:!border-gray-200 [&>button]:!text-gray-600',
                'dark:[&>button]:!bg-gray-800 dark:[&>button]:!border-gray-600 dark:[&>button]:!text-gray-300',
                '[&>button:hover]:!bg-gray-100 dark:[&>button:hover]:!bg-gray-700'
              )}
            />
            <Background 
              variant={BackgroundVariant.Dots} 
              gap={20} 
              size={1} 
              color={isDarkMode ? '#4b5563' : '#e5e7eb'} 
            />

            {/* 多选边界框 - 必须在 ReactFlow 内部以使用 useReactFlow hooks */}
            <SelectionBoundingBox
              selectedNodes={selectedNodesForBbox}
              nodeWidth={NODE_WIDTH}
              nodeHeight={NODE_HEIGHT}
              onNodesMove={handleBoundingBoxMove}
            />
          </ReactFlow>

          {tree.nodes.length === 0 && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="text-center text-gray-400">
                <div className="text-lg mb-2">No messages yet</div>
                <div className="text-sm">Start a conversation to see the tree view</div>
              </div>
            </div>
          )}

          {process.env.NODE_ENV === 'development' && (
            <div className="absolute top-2 left-2 bg-black/70 text-white text-xs p-2 rounded z-10">
              Nodes: {tree.nodes.length} | Edges: {tree.edges.length}
              {selectedNodeId && <div>Selected: {selectedNodeId.slice(0, 8)}...</div>}
              {selectedNodeIds.length > 0 && <div>Multi-select: {selectedNodeIds.length}</div>}
            </div>
          )}
        </div>
      </div>

      {/* 右侧：消息详情面板 */}
      {showDetailPanel && (
        <div 
          style={{ width: detailPanelWidth }}
          className={cn(
            'flex-shrink-0 border-l',
            'bg-white dark:bg-gray-900',
            'border-gray-200 dark:border-gray-700',
            'shadow-[-4px_0_12px_rgba(0,0,0,0.08)] dark:shadow-none'
          )}
        >
          <MessageDetailPanel
            message={selectedMessage}
            session={session}
            onQuote={handleQuote}
            onClose={handleClosePanel}
            width={detailPanelWidth}
            onWidthChange={setDetailPanelWidth}
            minWidth={240}
            maxWidth={600}
          />
        </div>
      )}
      </div>

      {/* [GitLine] TreeToolbar — 树视图工具栏，位于画布下方 */}
      <TreeToolbar
        mode={interactionMode}
        onModeChange={setInteractionMode}
        selectedCount={interactionMode === 'click' ? (selectedNodeId ? 1 : 0) : selectedNodeIds.length}
        onFocus={handleFocus}
        onDelete={handleDeleteSelected}
        onAutoLayout={handleAutoLayout}
        canFocus={interactionMode === 'click' ? !!selectedNodeId : selectedNodeIds.length > 0}
        canDelete={(interactionMode === 'click' ? !!selectedNodeId : selectedNodeIds.length > 0) && !isDeletingSelected}
        className="shrink-0 border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900"
      />

      <Modal
        opened={deleteDialogState.opened}
        onClose={isDeletingSelected ? () => {} : closeDeleteDialog}
        title={t('Delete nodes')}
        centered
        closeOnClickOutside={!isDeletingSelected}
        closeOnEscape={!isDeletingSelected}
        withCloseButton={!isDeletingSelected}
      >
        <Text size="sm">
          {t('Are you sure you want to delete {{count}} node(s)?', { count: deleteDialogState.ids.length })}
        </Text>
        <Group justify="flex-end" mt="md">
          <Button variant="default" onClick={closeDeleteDialog} disabled={isDeletingSelected}>
            {t('cancel')}
          </Button>
          <Button color="red" onClick={() => void handleConfirmDeleteSelected()} loading={isDeletingSelected}>
            {t('delete')}
          </Button>
        </Group>
      </Modal>

      {popoverMessage && (
        <NodeCreatePopover
          opened={popoverOpened}
          onClose={handleClosePopover}
          target={popoverTarget}
          message={popoverMessage}
          session={session}
          isLeafNode={popoverIsLeaf}
          onCreateUserNode={handleCreateUserNode}
          onCreateAssistantNode={handleCreateAssistantNode}
          onUseBottomInput={handleUseBottomInput}
        />
      )}
    </div>
  )
}

// ============ 导出组件 ============

export function ConversationTreeView(props: ConversationTreeViewProps) {
  return (
    <ReactFlowProvider>
      <ConversationTreeViewInner {...props} />
    </ReactFlowProvider>
  )
}

export default ConversationTreeView
