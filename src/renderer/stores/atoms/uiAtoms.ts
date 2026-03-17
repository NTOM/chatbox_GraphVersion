import { atom } from 'jotai'
import { atomWithStorage } from 'jotai/utils'
import type React from 'react'
import type { RefObject } from 'react'
import type { VirtuosoHandle } from 'react-virtuoso'
import platform from '@/platform'
import type { KnowledgeBase, MessagePicture, Toast } from '../../../shared/types'
import type { PreConstructedMessageState } from '../../types/input-box'

// Input box related state
const defaultPreConstructedMessageState = (): PreConstructedMessageState => ({
  text: '',
  pictureKeys: [],
  attachments: [],
  links: [],
  preprocessedFiles: [],
  preprocessedLinks: [],
  preprocessingStatus: {
    files: {},
    links: {},
  },
  preprocessingPromises: {
    files: new Map<string, Promise<unknown>>(),
    links: new Map<string, Promise<unknown>>(),
  },
})

const inputBoxLinksAtomCache = new Map<string, ReturnType<typeof atom<{ url: string }[]>>>()
const inputBoxPreConstructedMessageAtomCache = new Map<
  string,
  ReturnType<typeof atom<PreConstructedMessageState>>
>()

export const inputBoxLinksFamily = (sessionId: string) => {
  let cached = inputBoxLinksAtomCache.get(sessionId)
  if (!cached) {
    cached = atom<{ url: string }[]>([])
    inputBoxLinksAtomCache.set(sessionId, cached)
  }
  return cached
}

export const inputBoxPreConstructedMessageFamily = (sessionId: string) => {
  let cached = inputBoxPreConstructedMessageAtomCache.get(sessionId)
  if (!cached) {
    cached = atom(defaultPreConstructedMessageState())
    inputBoxPreConstructedMessageAtomCache.set(sessionId, cached)
  }
  return cached
}

// Atom to store collapsed state of providers
export const collapsedProvidersAtom = atomWithStorage<Record<string, boolean>>('collapsedProviders', {})
