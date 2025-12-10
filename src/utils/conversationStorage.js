const STORAGE_KEY = 'aiEduConversationState'

const getDefaultState = () => ({
  conversations: { teacher: [], peer: [] },
  gameLog: [],
  testConversation: [],
  testHistory: [],
  taskScores: {},
  feedbackHistory: [],
  unifiedLog: [], // 统一的对话日志，按时间顺序记录所有agent和用户的消息
  meta: {}
})

const isBrowser = () => typeof window !== 'undefined' && typeof window.localStorage !== 'undefined'

const safeParse = (raw) => {
  try {
    return JSON.parse(raw)
  } catch (error) {
    console.error('Failed to parse conversation state', error)
    return null
  }
}

export const loadConversationState = () => {
  if (!isBrowser()) return null
  const raw = window.localStorage.getItem(STORAGE_KEY)
  return raw ? safeParse(raw) : null
}

export const saveConversationState = (stateUpdates) => {
  if (!isBrowser()) return
  try {
    const existing = loadConversationState() || getDefaultState()
    const defaults = getDefaultState()
    const payload = {
      ...existing,
      ...stateUpdates,
      conversations: stateUpdates?.conversations ?? existing.conversations ?? defaults.conversations,
      gameLog: stateUpdates?.gameLog ?? existing.gameLog ?? defaults.gameLog,
      testConversation: stateUpdates?.testConversation ?? existing.testConversation ?? defaults.testConversation,
      testHistory: stateUpdates?.testHistory ?? existing.testHistory ?? defaults.testHistory,
      taskScores: stateUpdates?.taskScores ?? existing.taskScores ?? defaults.taskScores,
      feedbackHistory: stateUpdates?.feedbackHistory ?? existing.feedbackHistory ?? defaults.feedbackHistory,
      unifiedLog: stateUpdates?.unifiedLog ?? existing.unifiedLog ?? defaults.unifiedLog,
      meta: stateUpdates?.meta ?? existing.meta ?? defaults.meta
    }
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(payload))
  } catch (error) {
    console.error('Failed to save conversation state', error)
  }
}

// 添加消息到统一日志
export const addToUnifiedLog = (entry) => {
  if (!isBrowser()) return
  try {
    const state = loadConversationState() || getDefaultState()
    const updatedLog = [
      ...(state.unifiedLog || []),
      {
        ...entry,
        timestamp: entry.timestamp || new Date().toISOString()
      }
    ].sort((a, b) => {
      // 按时间排序
      const timeA = new Date(a.timestamp || 0).getTime()
      const timeB = new Date(b.timestamp || 0).getTime()
      return timeA - timeB
    })
    saveConversationState({ unifiedLog: updatedLog })
  } catch (error) {
    console.error('Failed to add to unified log', error)
  }
}

const postLogPayload = async (payload, filename, meta = {}) => {
  if (!isBrowser()) return false
  try {
    const response = await fetch('/api/save-log', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        payload,
        filename,
        userId: meta?.username || null,
        sessionId: meta?.sessionId || null,
        meta: {
          language: meta?.language || null,
          version: meta?.version || 'v1',
          ...meta
        }
      })
    })

    if (!response.ok) {
      const text = await response.text()
      console.error('Failed to save conversation log to server:', text)
      return false
    }

    return true
  } catch (error) {
    console.error('Failed to post conversation log to server', error)
    return false
  }
}

// 获取完整的对话历史（按时间排序）- 用于导出JSON，包含所有agent和用户的内容
export const getUnifiedConversationHistory = () => {
  if (!isBrowser()) return []
  const state = loadConversationState()
  if (!state?.unifiedLog?.length) return []
  
  return state.unifiedLog
    .filter(entry => entry && entry.content && typeof entry.content === 'string')
    .map(entry => ({
      role: entry.role || 'assistant',
      content: entry.content,
      timestamp: entry.timestamp || null,
      speaker: entry.speaker || null,
      agentType: entry.agentType || null // 'teacher', 'peer', 'examiner', 'feedback', 'user', 'librarian', 'mindmap', 'evaluator'
    }))
    .sort((a, b) => {
      const timeA = new Date(a.timestamp || 0).getTime()
      const timeB = new Date(b.timestamp || 0).getTime()
      return timeA - timeB
    })
}

// 获取上下文对话历史（用于 teacher、peer、examiner、feedback 作为 context 进行输入）
// 只包含：teacher、peer、examiner、user、feedback
// 不包含：librarian、mindmap、evaluator
export const getContextConversationHistory = () => {
  if (!isBrowser()) return []
  const state = loadConversationState()
  if (!state?.unifiedLog?.length) return []
  
  // 允许的 agentType 列表
  const allowedAgentTypes = ['teacher', 'peer', 'examiner', 'user', 'feedback']
  
  return state.unifiedLog
    .filter(entry => {
      // 过滤掉无效条目
      if (!entry || !entry.content || typeof entry.content !== 'string') return false
      // 只保留允许的 agentType
      const agentType = entry.agentType
      // 如果没有 agentType，检查 role 是否为 'user'
      if (!agentType) {
        return entry.role === 'user'
      }
      return allowedAgentTypes.includes(agentType)
    })
    .map(entry => ({
      role: entry.role || 'assistant',
      content: entry.content,
      timestamp: entry.timestamp || null,
      speaker: entry.speaker || null,
      agentType: entry.agentType || null
    }))
    .sort((a, b) => {
      const timeA = new Date(a.timestamp || 0).getTime()
      const timeB = new Date(b.timestamp || 0).getTime()
      return timeA - timeB
    })
}

export const clearConversationState = () => {
  if (!isBrowser()) return
  try {
    window.localStorage.removeItem(STORAGE_KEY)
  } catch (error) {
    console.error('Failed to clear conversation state', error)
  }
}

export const getConversationMessages = () => {
  const state = loadConversationState()
  if (!state?.gameLog?.length) return []

  return state.gameLog
    .filter(entry =>
      entry &&
      (entry.type === 'user_message' || entry.type === 'assistant_message') &&
      typeof entry.content === 'string'
    )
    .map(entry => {
      // 对于assistant_message，使用entry.role（'teacher'或'peer'）作为role
      // 对于user_message，使用'user'
      let role = entry.type === 'user_message' ? 'user' : (entry.role || 'assistant')
      // 如果entry.role是'teacher'或'peer'，保持原样；否则使用'assistant'
      if (entry.type === 'assistant_message' && entry.role && (entry.role === 'teacher' || entry.role === 'peer')) {
        role = entry.role
      } else if (entry.type === 'assistant_message') {
        role = 'assistant'
      }
      return {
        role: role,
        content: entry.content,
        timestamp: entry.timestamp || null,
        speaker: entry.speaker || null,
        partnerRole: entry.role || entry.targetRole || null
      }
    })
}

export const exportConversationState = async (filename = 'conversation-history.json') => {
  if (!isBrowser()) return false
  const state = loadConversationState() || getDefaultState()
  
  // 使用统一日志，按时间顺序导出所有消息
  const allMessages = getUnifiedConversationHistory()
  
  const payload = {
    generatedAt: new Date().toISOString(),
    totalTurns: allMessages.length,
    conversationHistory: allMessages, // 按时间顺序的所有对话
    // 保留原有字段以兼容
    classroomConversation: state.gameLog
      .filter(entry =>
        entry &&
        (entry.type === 'user_message' || entry.type === 'assistant_message') &&
        typeof entry.content === 'string'
      )
      .map(entry => {
        let role = entry.type === 'user_message' ? 'user' : (entry.role || 'assistant')
        if (entry.type === 'assistant_message' && entry.role && (entry.role === 'teacher' || entry.role === 'peer')) {
          role = entry.role
        } else if (entry.type === 'assistant_message') {
          role = 'assistant'
        }
        return {
          role: role,
          content: entry.content,
          timestamp: entry.timestamp || null,
          speaker: entry.speaker || null,
          partnerRole: entry.role || entry.targetRole || null
        }
      }),
    testConversation: state.testConversation || [],
    testHistory: (state.testHistory || []).map(entry => ({
      role: entry.role === 'feedback' ? 'feedback' : (entry.type === 'assistant' ? 'assistant' : 'user'),
      content: entry.content || '',
      timestamp: entry.timestamp || null,
      speaker: entry.speaker || null,
      type: entry.type || null
    })),
    feedbackHistory: state.feedbackHistory || []
  }

  return postLogPayload(payload, filename, state?.meta)
}

export const exportGameConversation = async (filename = 'classroom-history.json', options = {}) => {
  if (!isBrowser()) return false
  const state = loadConversationState() || getDefaultState()
  const gameLog = state.gameLog || []
  if (!gameLog.length) return false

  const meta = state.meta || {}
  
  // 默认使用完整保存模式（forceFullExport: true），每次保存完整的game记录
  // 这样可以确保每次game session都是独立的记录
  // 如果明确设置forceFullExport: false，则使用增量保存模式
  const forceFullExport = options.forceFullExport !== false // 默认true
  const lastCursor = forceFullExport ? 0 : (meta.lastGameUploadCursor || 0)
  
  const mappedConversation = gameLog
    .filter(entry =>
      entry &&
      (entry.type === 'user_message' || entry.type === 'assistant_message') &&
      typeof entry.content === 'string'
    )
    .map(entry => {
      let role = entry.type === 'user_message' ? 'user' : (entry.role || 'assistant')
      if (entry.type === 'assistant_message' && entry.role && (entry.role === 'teacher' || entry.role === 'peer')) {
        role = entry.role
      } else if (entry.type === 'assistant_message') {
        role = 'assistant'
      }
      return {
        role: role,
        content: entry.content,
        timestamp: entry.timestamp || null,
        speaker: entry.speaker || null,
        partnerRole: entry.role || entry.targetRole || null,
        type: entry.type || null
      }
    })

  // 如果使用增量保存且没有新内容，则不保存
  if (!forceFullExport && mappedConversation.length <= lastCursor) return false

  // 构建testHistory格式的对话记录（用于统一格式）
  const testHistory = mappedConversation.slice(lastCursor).map(entry => ({
    role: entry.role === 'user' ? 'user' : 'assistant',
    type: entry.type === 'user_message' ? 'user' : 'assistant',
    content: entry.content,
    speaker: entry.speaker,
    timestamp: entry.timestamp
  }))

  const payload = {
    generatedAt: new Date().toISOString(),
    totalTurns: mappedConversation.length - lastCursor,
    segment: 'classroom',
    testHistory: testHistory, // 使用testHistory格式以保持一致性
    conversation: mappedConversation.slice(lastCursor) // 保留原有字段以兼容
  }

  const success = await postLogPayload(payload, filename, {
    ...meta,
    segment: 'classroom',
    sessionType: 'game'
  })

  // 如果保存成功且使用增量模式，更新cursor
  // 如果使用完整保存模式，不更新cursor，这样下次保存时仍然保存完整记录
  if (success && !forceFullExport) {
    saveConversationState({
      meta: {
        ...meta,
        lastGameUploadCursor: mappedConversation.length
      }
    })
  }

  return success
}

export const exportTestConversation = async (filename = 'test-history.json', options = {}) => {
  if (!isBrowser()) return false
  const state = loadConversationState() || getDefaultState()
  const testConversation = state.testConversation || []
  const testHistory = state.testHistory || []
  const feedbackHistory = state.feedbackHistory || []

  if (!testConversation.length && !testHistory.length && !feedbackHistory.length) return false

  const payload = {
    generatedAt: new Date().toISOString(),
    totalTurns: testHistory.length,
    segment: 'test',
    testConversation,
    testHistory,
    feedbackHistory
  }

  return postLogPayload(payload, filename, {
    ...state.meta,
    segment: 'test',
    sessionType: 'test'
  })
}

export const sendBeaconOnUnload = () => {
  if (!isBrowser()) return
  try {
    const state = loadConversationState() || getDefaultState()
    const payload = {
      generatedAt: new Date().toISOString(),
      segment: 'unload',
      totalTurns: state.unifiedLog?.length || 0,
      conversationHistory: getUnifiedConversationHistory()
    }
    const body = JSON.stringify({
      payload,
      filename: 'unload-log.json',
      userId: state?.meta?.username || null,
      sessionId: state?.meta?.sessionId || null,
      meta: {
        ...(state?.meta || {}),
        segment: 'unload'
      }
    })

    if (navigator.sendBeacon) {
      const blob = new Blob([body], { type: 'application/json' })
      navigator.sendBeacon('/api/save-log', blob)
    } else {
      fetch('/api/save-log', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body,
        keepalive: true
      })
    }
  } catch (error) {
    console.error('Failed to send unload log', error)
  }
}

