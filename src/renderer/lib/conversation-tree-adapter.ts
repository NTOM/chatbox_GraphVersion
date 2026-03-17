/**
 * 对话树适配器
 * 将 Session 数据结构转换为 ReactFlow 可用的节点和边结构
 */

import type { Node, Edge } from '@xyflow/react'
import type { Session, Message } from '@shared/types'
// [GitLine] chatStore used for removeTreeMessage — direct messageForksHash manipulation
import * as chatStore from '@/stores/chatStore'

// ============ 类型定义 ============

/** 树节点类型 */
export type TreeNodeType = 'system' | 'user' | 'assistant'

/** 树节点数据 */
export interface TreeNodeData extends Record<string, unknown> {
  message: Message
  type: TreeNodeType
  /** 会话ID */
  sessionId: string
  /** 是否在当前活跃路径上 */
  isActivePath: boolean
  /** 在同级分支中的索引 */
  branchIndex: number
  /** 同级分支总数 */
  branchCount: number
  /** 是否有子分支 */
  hasChildren: boolean
  /** 子节点数量 */
  childrenCount: number
  /** 深度层级 */
  depth: number
  /** 是否被选中（由外部状态管理） */
  isSelected?: boolean
  /** 分支点父消息ID — 即 messageForksHash 中的 key，用于 switchFork 调用 */
  forkParentId: string | null
}

/** ReactFlow 节点类型 */
export type ConversationNode = Node<TreeNodeData, TreeNodeType>

/** 边数据类型 */
export interface ConversationEdgeData extends Record<string, unknown> {
  isActivePath: boolean
  branchIndex: number
}

/** ReactFlow 边类型 */
export type ConversationEdge = Edge<ConversationEdgeData>

/** 对话树结构 */
export interface ConversationTree {
  nodes: ConversationNode[]
  edges: ConversationEdge[]
  /** 根节点ID */
  rootId: string | null
  /** 当前活跃路径的叶子节点ID */
  activeLeafId: string | null
  /** 所有活跃路径上的节点ID集合 */
  activePathIds: Set<string>
}

// ============ 内部辅助类型 ============

interface TreeBuildContext {
  nodes: ConversationNode[]
  edges: ConversationEdge[]
  activePathIds: Set<string>
  depth: number
  sessionId: string
}

// ============ 核心转换函数 ============

/**
 * 将 Session 转换为对话树结构
 */
export function sessionToConversationTree(session: Session): ConversationTree {
  const context: TreeBuildContext = {
    nodes: [],
    edges: [],
    activePathIds: new Set(),
    depth: 0,
    sessionId: session.id,
  }

  if (!session.messages || session.messages.length === 0) {
    return {
      nodes: [],
      edges: [],
      rootId: null,
      activeLeafId: null,
      activePathIds: new Set(),
    }
  }

  // 1. 首先构建活跃路径的节点ID集合
  const activePathIds = buildActivePathIds(session)
  context.activePathIds = activePathIds

  // 2. 构建主消息链的节点
  let prevNodeId: string | null = null
  let activeLeafId: string | null = null

  for (let i = 0; i < session.messages.length; i++) {
    const message = session.messages[i]
    const isActivePath = activePathIds.has(message.id)

    // 检查此消息是否有分支
    const forkData = session.messageForksHash?.[message.id]
    const hasFork = forkData && forkData.lists.length > 1

    // 创建节点
    const node = createNode(message, {
      sessionId: session.id,
      isActivePath,
      branchIndex: 0,
      branchCount: hasFork ? forkData.lists.length : 1,
      hasChildren: i < session.messages.length - 1 || !!hasFork,
      childrenCount: hasFork ? forkData.lists.length : (i < session.messages.length - 1 ? 1 : 0),
      depth: context.depth + i,
      forkParentId: null, // 主链节点没有分支点父消息
    })

    context.nodes.push(node)

    // 创建边
    if (prevNodeId) {
      context.edges.push(createEdge(prevNodeId, message.id, isActivePath, 0))
    }

    // 如果有分支，递归处理分支
    if (hasFork) {
      processForks(session, message.id, forkData, context, i)
    }

    prevNodeId = message.id
    if (isActivePath) {
      activeLeafId = message.id
    }
  }

  // 3. 找到最终的活跃叶子节点
  if (session.messages.length > 0) {
    const lastMessage = session.messages[session.messages.length - 1]
    const lastFork = session.messageForksHash?.[lastMessage.id]

    if (lastFork && lastFork.lists.length > 0) {
      // 当前活跃分支的消息
      const activeBranchMessages = lastFork.lists[lastFork.position]?.messages || []
      if (activeBranchMessages.length > 0) {
        activeLeafId = activeBranchMessages[activeBranchMessages.length - 1].id
      }
    } else {
      activeLeafId = lastMessage.id
    }
  }

  return {
    nodes: context.nodes,
    edges: context.edges,
    rootId: session.messages[0]?.id || null,
    activeLeafId,
    activePathIds,
  }
}

/**
 * 处理分支数据
 */
function processForks(
  session: Session,
  parentMessageId: string,
  forkData: NonNullable<Session['messageForksHash']>[string],
  context: TreeBuildContext,
  parentDepth: number
): void {
  const { lists, position } = forkData

  for (let branchIndex = 0; branchIndex < lists.length; branchIndex++) {
    const branch = lists[branchIndex]
    const isActiveBranch = branchIndex === position

    let prevNodeId = parentMessageId

    for (let i = 0; i < branch.messages.length; i++) {
      const message = branch.messages[i]
      const isActivePath = isActiveBranch && context.activePathIds.has(message.id)

      // 检查此消息是否也有分支
      const nestedFork = session.messageForksHash?.[message.id]
      const hasNestedFork = nestedFork && nestedFork.lists.length > 0

      const node = createNode(message, {
        sessionId: session.id,
        isActivePath,
        branchIndex,
        branchCount: lists.length,
        hasChildren: i < branch.messages.length - 1 || !!hasNestedFork,
        childrenCount: hasNestedFork ? nestedFork.lists.length : (i < branch.messages.length - 1 ? 1 : 0),
        depth: parentDepth + 1 + i,
        forkParentId: parentMessageId, // 分支节点的分支点是 parentMessageId
      })

      context.nodes.push(node)
      context.edges.push(createEdge(prevNodeId, message.id, isActivePath, branchIndex))

      // 递归处理嵌套分支
      if (hasNestedFork) {
        processForks(session, message.id, nestedFork, context, parentDepth + 1 + i)
      }

      prevNodeId = message.id
    }
  }
}

/**
 * 构建活跃路径的节点ID集合
 */
function buildActivePathIds(session: Session): Set<string> {
  const activeIds = new Set<string>()

  // 主消息链都是活跃的
  for (const message of session.messages) {
    activeIds.add(message.id)

    // 如果有分支，只有当前位置的分支是活跃的
    const forkData = session.messageForksHash?.[message.id]
    if (forkData) {
      const activeBranch = forkData.lists[forkData.position]
      if (activeBranch) {
        for (const branchMessage of activeBranch.messages) {
          activeIds.add(branchMessage.id)
        }
      }
    }
  }

  return activeIds
}

/**
 * 创建 ReactFlow 节点
 */
function createNode(
  message: Message,
  options: {
    sessionId: string
    isActivePath: boolean
    branchIndex: number
    branchCount: number
    hasChildren: boolean
    childrenCount: number
    depth: number
    forkParentId: string | null
  }
): ConversationNode {
  const type = getNodeType(message.role)

  return {
    id: message.id,
    type,
    position: { x: 0, y: 0 }, // 位置由布局算法计算
    data: {
      message,
      type,
      sessionId: options.sessionId,
      isActivePath: options.isActivePath,
      branchIndex: options.branchIndex,
      branchCount: options.branchCount,
      hasChildren: options.hasChildren,
      childrenCount: options.childrenCount,
      depth: options.depth,
      forkParentId: options.forkParentId,
    },
  }
}

/**
 * 创建 ReactFlow 边
 */
function createEdge(
  sourceId: string,
  targetId: string,
  isActivePath: boolean,
  branchIndex = 0
): ConversationEdge {
  // 根据状态选择边类型
  let edgeType: string
  if (isActivePath) {
    edgeType = 'activePath'
  } else if (branchIndex > 0) {
    edgeType = 'branch'
  } else {
    edgeType = 'default'
  }

  return {
    id: `${sourceId}->${targetId}`,
    source: sourceId,
    target: targetId,
    type: edgeType,
    data: { isActivePath, branchIndex },
    animated: false, // 动画由自定义边组件控制
  }
}

/**
 * 根据消息角色获取节点类型
 */
function getNodeType(role: Message['role']): TreeNodeType {
  switch (role) {
    case 'system':
      return 'system'
    case 'user':
      return 'user'
    case 'assistant':
    case 'tool':
      return 'assistant'
    default:
      return 'user'
  }
}

// ============ 辅助函数 ============

/**
 * 获取消息的文本内容（用于节点预览）
 */
export function getMessagePreviewText(message: Message, maxLength = 100): string {
  const textParts = message.contentParts?.filter((part) => part.type === 'text') || []
  const text = textParts.map((part) => part.text).join(' ')

  if (text.length <= maxLength) {
    return text
  }

  return `${text.slice(0, maxLength)}...`
}

/**
 * 根据节点ID查找节点在树中的路径
 */
export function findNodePath(tree: ConversationTree, nodeId: string): string[] {
  const path: string[] = []
  const edgeMap = new Map<string, string>() // target -> source

  for (const edge of tree.edges) {
    edgeMap.set(edge.target, edge.source)
  }

  let currentId: string | undefined = nodeId
  while (currentId) {
    path.unshift(currentId)
    currentId = edgeMap.get(currentId)
  }

  return path
}

/**
 * 检查节点是否是分支点（有多个子节点）
 */
export function isBranchPoint(tree: ConversationTree, nodeId: string): boolean {
  const childEdges = tree.edges.filter((e) => e.source === nodeId)
  return childEdges.length > 1
}

/**
 * 获取节点的所有子节点ID
 */
export function getChildNodeIds(tree: ConversationTree, nodeId: string): string[] {
  return tree.edges.filter((e) => e.source === nodeId).map((e) => e.target)
}

/**
 * 获取当前激活路径上的有序消息列表
 * 从根节点（含 system prompt）沿着活跃分支遍历到叶子节点
 */
export function getActivePathMessages(session: Session): Message[] {
  if (!session.messages || session.messages.length === 0) {
    return []
  }

  const result: Message[] = []

  // 遍历主消息链
  for (const message of session.messages) {
    result.push(message)

    // 如果有分支，沿着活跃分支继续
    const forkData = session.messageForksHash?.[message.id]
    if (forkData && forkData.lists.length > 0) {
      const activeBranch = forkData.lists[forkData.position]
      if (activeBranch) {
        collectActiveBranchMessages(session, activeBranch.messages, result)
      }
    }
  }

  return result
}

/**
 * 递归收集活跃分支中的消息
 */
function collectActiveBranchMessages(
  session: Session,
  branchMessages: Message[],
  result: Message[]
): void {
  for (const message of branchMessages) {
    result.push(message)

    // 检查是否有嵌套分支
    const forkData = session.messageForksHash?.[message.id]
    if (forkData && forkData.lists.length > 0) {
      const activeBranch = forkData.lists[forkData.position]
      if (activeBranch) {
        collectActiveBranchMessages(session, activeBranch.messages, result)
      }
    }
  }
}

/**
 * 调试用：打印树结构
 */
export function debugPrintTree(tree: ConversationTree): void {
  console.group('🌳 Conversation Tree')
  console.log('Root ID:', tree.rootId)
  console.log('Active Leaf ID:', tree.activeLeafId)
  console.log('Active Path IDs:', Array.from(tree.activePathIds))
  console.log('Nodes:', tree.nodes.length)
  console.log('Edges:', tree.edges.length)

  console.group('Nodes Detail')
  for (const node of tree.nodes) {
    const prefix = tree.activePathIds.has(node.id) ? '✅' : '  '
    console.log(
      `${prefix} [${node.data.type}] ${node.id.slice(0, 8)}... - depth:${node.data.depth} branch:${node.data.branchIndex}/${node.data.branchCount}`
    )
  }
  console.groupEnd()

  console.groupEnd()
}

// ============ [GitLine] 增强删除功能 ============

/**
 * [GitLine] 纯函数：从 session 对象中移除单条消息
 *
 * 全面搜索以下位置并移除目标消息：
 * 1. session.messages（主链/活跃路径）
 * 2. session.threads[*].messages
 * 3. messageForksHash[*].lists[*].messages（非活跃分支）
 *
 * 同时处理：空分支清理、单分支合并、position 调整、compactionPoints 清理
 *
 * @param session 当前 session 对象（不会被修改，返回新对象）
 * @param messageId 要删除的消息ID
 * @returns 删除消息后的新 session 对象
 */
function removeMessageFromSession(session: Session, messageId: string): Session {
  // 1. 先检查消息是否在 messageForksHash 的分支列表中（非活跃分支）
  let foundInForks = false
  let updatedForksHash = session.messageForksHash

  if (updatedForksHash) {
    const newHash: typeof updatedForksHash = {}
    for (const [forkPointId, forkEntry] of Object.entries(updatedForksHash)) {
      const updatedLists = forkEntry.lists.map(list => {
        const msgIndex = list.messages.findIndex(m => m.id === messageId)
        if (msgIndex >= 0) {
          foundInForks = true
          return {
            ...list,
            messages: list.messages.filter(m => m.id !== messageId),
          }
        }
        return list
      })

      // 清理空分支：如果某个分支的消息列表变空了，移除它
      const nonEmptyLists = updatedLists.filter(list => list.messages.length > 0)

      if (nonEmptyLists.length === 0) {
        // 所有分支都空了（或只有当前活跃分支有内容），移除整个 fork entry
        // 但保留当前活跃分支（position 指向的）因为它的消息在 session.messages 中
        newHash[forkPointId] = { ...forkEntry, lists: updatedLists }
      } else {
        // 调整 position 如果需要
        let newPosition = forkEntry.position
        if (updatedLists.length !== forkEntry.lists.length) {
          newPosition = Math.min(forkEntry.position, updatedLists.length - 1)
        }
        newHash[forkPointId] = { ...forkEntry, position: newPosition, lists: updatedLists }
      }
    }
    updatedForksHash = Object.keys(newHash).length > 0 ? newHash : undefined
  }

  // 2. 从 session.messages 中移除（主链）
  const newMessages = session.messages.filter(m => m.id !== messageId)

  // 3. 从 threads 中移除
  const newThreads = session.threads?.map(thread => ({
    ...thread,
    messages: thread.messages.filter(m => m.id !== messageId),
  }))

  // 4. 处理 compactionPoints
  const messageToDelete = session.messages.find(m => m.id === messageId)
  const isSummaryMessage = messageToDelete?.isSummary === true
  const newCompactionPoints = isSummaryMessage
    ? session.compactionPoints?.filter(cp => cp.summaryMessageId !== messageId)
    : session.compactionPoints

  // 5. 如果消息在主链中被删除，处理 fork point 变成最后一条消息的情况
  // 当删除主链消息后，如果某个 fork point 后面没有消息了，需要切换到其他分支
  let finalMessages = newMessages
  let finalForksHash = updatedForksHash

  if (finalForksHash && !foundInForks) {
    // 消息从主链删除了，检查是否有 fork point 变成了最后一条消息
    for (const [forkPointId, forkEntry] of Object.entries(finalForksHash)) {
      const forkIdx = finalMessages.findIndex(m => m.id === forkPointId)
      if (forkIdx >= 0 && forkIdx === finalMessages.length - 1) {
        // fork point 是最后一条消息，当前分支为空
        // 尝试切换到有内容的分支
        const currentPos = forkEntry.position
        const remainingLists = forkEntry.lists.filter((_, i) => i !== currentPos)

        if (remainingLists.length === 0) {
          // 没有其他分支了，移除 fork
          const { [forkPointId]: _, ...rest } = finalForksHash
          finalForksHash = Object.keys(rest).length > 0 ? rest : undefined
        } else if (remainingLists.length === 1 && remainingLists[0]) {
          // 只剩一个分支，加载它的消息并移除 fork
          finalMessages = finalMessages.concat(remainingLists[0].messages)
          const { [forkPointId]: _, ...rest } = finalForksHash
          finalForksHash = Object.keys(rest).length > 0 ? rest : undefined
        } else {
          // 多个分支，切换到下一个有内容的
          const newPos = Math.min(currentPos, remainingLists.length - 1)
          const branchMessages = remainingLists[newPos]?.messages ?? []
          finalMessages = finalMessages.concat(branchMessages)
          const updatedLists = remainingLists.map((list, i) =>
            i === newPos ? { ...list, messages: [] } : list
          )
          finalForksHash = {
            ...finalForksHash,
            [forkPointId]: { ...forkEntry, position: newPos, lists: updatedLists },
          }
        }
      }
    }
  }

  return {
    ...session,
    messages: finalMessages,
    threads: newThreads,
    messageForksHash: finalForksHash,
    compactionPoints: newCompactionPoints,
  }
}

/**
 * [GitLine] 增强版消息删除 — 能删除任意位置的消息
 *
 * 上游的 removeMessage 只能删除 session.messages 和 session.threads 中的消息，
 * 但树视图中的非活跃分支消息存储在 messageForksHash[forkPointId].lists[i].messages 中，
 * 上游的 removeMessage 无法触及。
 *
 * 此函数全面搜索以下位置：
 * 1. session.messages（主链/活跃路径）
 * 2. session.threads[*].messages
 * 3. messageForksHash[*].lists[*].messages（非活跃分支）
 *
 * @param sessionId 会话ID
 * @param messageId 要删除的消息ID
 */
export async function removeTreeMessage(sessionId: string, messageId: string): Promise<void> {
  await chatStore.updateSessionWithMessages(sessionId, (session) => {
    if (!session) {
      throw new Error(`[GitLine] session ${sessionId} not found`)
    }
    return removeMessageFromSession(session, messageId)
  })
}

/**
 * [GitLine] 共享批量删除入口 — 单事务版
 *
 * 在单次 updateSessionWithMessages 调用中处理所有删除，
 * 只触发一次 store 更新和一次 React 重渲染。
 *
 * @param sessionId 会话ID
 * @param messageIds 待删除的消息ID列表（必须已按 depth 降序排列，子节点在前）
 */
export async function removeTreeMessages(sessionId: string, messageIds: string[]): Promise<void> {
  if (messageIds.length === 0) return

  // 单条删除走原有路径，避免不必要的开销
  if (messageIds.length === 1) {
    await removeTreeMessage(sessionId, messageIds[0])
    return
  }

  await chatStore.updateSessionWithMessages(sessionId, (session) => {
    if (!session) {
      throw new Error(`[GitLine] session ${sessionId} not found`)
    }

    // 在同一个 session 对象上依次应用所有删除
    let currentSession = session
    for (const messageId of messageIds) {
      currentSession = removeMessageFromSession(currentSession, messageId)
    }
    return currentSession
  })
}
