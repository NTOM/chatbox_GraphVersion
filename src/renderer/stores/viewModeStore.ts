/**
 * 视图模式状态管理
 * 用于在列表视图和节点视图之间切换
 */

import { createStore, useStore } from 'zustand'
import { persist } from 'zustand/middleware'
import { safeStorage } from './safeStorage'

export type ViewMode = 'list' | 'tree'

/** 交互模式类型 */
export type InteractionMode = 'click' | 'select'

/** 节点位置类型 */
export type NodePositions = Record<string, { x: number; y: number }>

/** 按会话ID存储的节点位置 */
export type SessionNodePositions = Record<string, NodePositions>

/** 视口状态类型 */
export type ViewportState = { x: number; y: number; zoom: number }

/** 按会话ID存储的视口状态 */
export type SessionViewports = Record<string, ViewportState>

interface ViewModeState {
  /** 当前视图模式 */
  viewMode: ViewMode
  /** 交互模式：单击或框选 */
  interactionMode: InteractionMode
  /** 节点视图中选中的节点ID */
  selectedNodeId: string | null
  /** 框选模式下选中的多个节点ID */
  selectedNodeIds: string[]
  /** 节点视图的缩放级别 (deprecated, 使用 sessionViewports) */
  treeZoom: number
  /** 节点视图的画布位置 (deprecated, 使用 sessionViewports) */
  treePosition: { x: number; y: number }
  /** 按会话ID存储的节点位置 */
  nodePositions: SessionNodePositions
  /** 按会话ID存储的视口状态 */
  sessionViewports: SessionViewports
}

interface ViewModeActions {
  /** 设置视图模式 */
  setViewMode: (mode: ViewMode) => void
  /** 切换视图模式 */
  toggleViewMode: () => void
  /** 设置交互模式 */
  setInteractionMode: (mode: InteractionMode) => void
  /** 设置选中的节点 */
  setSelectedNodeId: (nodeId: string | null) => void
  /** 设置多选节点 */
  setSelectedNodeIds: (nodeIds: string[]) => void
  /** 添加选中节点 */
  addSelectedNodeId: (nodeId: string) => void
  /** 移除选中节点 */
  removeSelectedNodeId: (nodeId: string) => void
  /** 切换节点选中状态 */
  toggleSelectedNodeId: (nodeId: string) => void
  /** 清除所有选中 */
  clearSelection: () => void
  /** 设置树视图缩放 */
  setTreeZoom: (zoom: number) => void
  /** 设置树视图位置 */
  setTreePosition: (position: { x: number; y: number }) => void
  /** 重置树视图状态 */
  resetTreeView: () => void
  /** 更新单个节点位置 */
  updateNodePosition: (sessionId: string, nodeId: string, position: { x: number; y: number }) => void
  /** 批量更新节点位置 */
  updateNodePositions: (sessionId: string, positions: NodePositions) => void
  /** 清除会话的节点位置 */
  clearNodePositions: (sessionId: string) => void
  /** 保存会话的视口状态 */
  saveSessionViewport: (sessionId: string, viewport: ViewportState) => void
  /** 获取会话的视口状态 */
  getSessionViewport: (sessionId: string) => ViewportState | undefined
  /** 清除会话的视口状态 */
  clearSessionViewport: (sessionId: string) => void
}

const initialState: ViewModeState = {
  viewMode: 'list',
  interactionMode: 'click',
  selectedNodeId: null,
  selectedNodeIds: [],
  treeZoom: 1,
  treePosition: { x: 0, y: 0 },
  nodePositions: {},
  sessionViewports: {},
}

export const viewModeStore = createStore<ViewModeState & ViewModeActions>()(
  persist(
    (set, get) => ({
      ...initialState,

      setViewMode: (mode) => set({ viewMode: mode }),

      toggleViewMode: () => {
        const current = get().viewMode
        set({ viewMode: current === 'list' ? 'tree' : 'list' })
      },

      setInteractionMode: (mode) => set({
        interactionMode: mode,
        // 切换模式时清除选中状态
        selectedNodeId: null,
        selectedNodeIds: [],
      }),

      setSelectedNodeId: (nodeId) => set({ selectedNodeId: nodeId }),

      setSelectedNodeIds: (nodeIds) => set({ selectedNodeIds: nodeIds }),

      addSelectedNodeId: (nodeId) => {
        const { selectedNodeIds } = get()
        if (!selectedNodeIds.includes(nodeId)) {
          set({ selectedNodeIds: [...selectedNodeIds, nodeId] })
        }
      },

      removeSelectedNodeId: (nodeId) => {
        const { selectedNodeIds } = get()
        set({ selectedNodeIds: selectedNodeIds.filter(id => id !== nodeId) })
      },

      toggleSelectedNodeId: (nodeId) => {
        const { selectedNodeIds } = get()
        if (selectedNodeIds.includes(nodeId)) {
          set({ selectedNodeIds: selectedNodeIds.filter(id => id !== nodeId) })
        } else {
          set({ selectedNodeIds: [...selectedNodeIds, nodeId] })
        }
      },

      clearSelection: () => set({
        selectedNodeId: null,
        selectedNodeIds: [],
      }),

      setTreeZoom: (zoom) => set({ treeZoom: zoom }),

      setTreePosition: (position) => set({ treePosition: position }),

      resetTreeView: () => set({
        selectedNodeId: null,
        treeZoom: 1,
        treePosition: { x: 0, y: 0 },
      }),

      updateNodePosition: (sessionId, nodeId, position) => {
        const { nodePositions } = get()
        set({
          nodePositions: {
            ...nodePositions,
            [sessionId]: {
              ...nodePositions[sessionId],
              [nodeId]: position,
            },
          },
        })
      },

      updateNodePositions: (sessionId, positions) => {
        const { nodePositions } = get()
        set({
          nodePositions: {
            ...nodePositions,
            [sessionId]: {
              ...nodePositions[sessionId],
              ...positions,
            },
          },
        })
      },

      clearNodePositions: (sessionId) => {
        const { nodePositions } = get()
        const { [sessionId]: _, ...rest } = nodePositions
        set({ nodePositions: rest })
      },

      saveSessionViewport: (sessionId, viewport) => {
        const { sessionViewports } = get()
        set({
          sessionViewports: {
            ...sessionViewports,
            [sessionId]: viewport,
          },
        })
      },

      getSessionViewport: (sessionId) => {
        return get().sessionViewports[sessionId]
      },

      clearSessionViewport: (sessionId) => {
        const { sessionViewports } = get()
        const { [sessionId]: _, ...rest } = sessionViewports
        set({ sessionViewports: rest })
      },
    }),
    {
      name: 'view-mode-store',
      version: 3,
      partialize: (state) => ({
        viewMode: state.viewMode,
        nodePositions: state.nodePositions,
        sessionViewports: state.sessionViewports,
      }),
      storage: safeStorage,
      // 版本迁移
      migrate: (persistedState: unknown, version: number) => {
        const state = persistedState as Partial<ViewModeState>
        if (version < 2) {
          // v1 没有 nodePositions，添加默认值
          return {
            ...state,
            nodePositions: state.nodePositions || {},
            sessionViewports: {},
          }
        }
        if (version < 3) {
          // v2 没有 sessionViewports，添加默认值
          return {
            ...state,
            sessionViewports: {},
          }
        }
        return state as ViewModeState
      },
    }
  )
)

export function useViewModeStore<U>(selector: (state: ViewModeState & ViewModeActions) => U) {
  return useStore(viewModeStore, selector)
}
