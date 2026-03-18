import { app } from 'electron'
import path from 'path'

export const APP_DISPLAY_NAME = 'ChatboxTree'
export const APP_RUNTIME_PACKAGE_NAME = 'chatboxtree'
export const APP_USER_MODEL_ID = 'xyz.chatboxapp.tree'
export const APP_PROTOCOL_SCHEME_BASE = 'chatboxtree'
export const APP_PROTOCOL_SCHEME = process.defaultApp ? `${APP_PROTOCOL_SCHEME_BASE}-dev` : APP_PROTOCOL_SCHEME_BASE
export const APP_PROTOCOL_PREFIXES = [`${APP_PROTOCOL_SCHEME_BASE}://`, `${APP_PROTOCOL_SCHEME_BASE}-dev://`]

// 继续复用原 Chatbox 的桌面数据目录，便于验证共享数据行为
export const SHARED_USER_DATA_BASENAME = 'xyz.chatboxapp.ce'
export const SHARED_USER_DATA_PATH = path.join(app.getPath('appData'), SHARED_USER_DATA_BASENAME)

// Electron 的内置单实例锁与共享数据目录存在冲突，这个验证包先关闭内置锁以允许与原版并行运行
export const ENABLE_SINGLE_INSTANCE_LOCK = false

// 这是一个本地验证包，先关闭自动更新，避免误连到官方更新通道
export const ENABLE_AUTO_UPDATE = false
