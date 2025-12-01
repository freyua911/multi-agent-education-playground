import { useEffect, useRef, useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import ReactMarkdown from 'react-markdown'
import { callDeepSeekAPIWithRole } from '../utils/api'
import {
  loadConversationState,
  saveConversationState,
  addToUnifiedLog,
  getContextConversationHistory
} from '../utils/conversationStorage'
import { getTasksArray } from '../utils/tasks'
import './Game.css'

const MIN_ROUNDS_FOR_TEST = 3

function Game({ language, username }) {
  const initialState = loadConversationState()
  const [currentRole, setCurrentRole] = useState(null) // 'teacher' or 'peer'
  const [conversations, setConversations] = useState(() => initialState?.conversations || {
    teacher: [],
    peer: []
  })
  const [inputValue, setInputValue] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [gameLog, setGameLog] = useState(() => initialState?.gameLog || [])
  const [hasSentFirstMessage, setHasSentFirstMessage] = useState(() =>
    Boolean(initialState?.gameLog?.some(entry => entry.type === 'user_message'))
  )
  const [roleInfo, setRoleInfo] = useState(null)
  const [currentRoundStartIndex, setCurrentRoundStartIndex] = useState(null)
  const [tasks, setTasks] = useState(() => {
    const initialState = loadConversationState()
    const initialTasks = getTasksArray(language)
    if (initialState?.taskScores) {
      return initialTasks.map(task => ({
        ...task,
        points: initialState.taskScores[task.id]?.points || 0,
        completed: initialState.taskScores[task.id]?.completed || false
      }))
    }
    return initialTasks
  })
  const [isTaskInfoOpen, setIsTaskInfoOpen] = useState(false)
  const [isHistoryExpanded, setIsHistoryExpanded] = useState(false)
  const [isLibraryHintOpen, setIsLibraryHintOpen] = useState(false)
  const messagesEndRef = useRef(null)
  const navigate = useNavigate()

  const teacherName = language === 'zh' ? '王老师' : 'Mr. Smith'
  const peerName = language === 'zh' ? '同伴小李' : 'Peer Alex'
  const systemName = language === 'zh' ? '系统' : 'System'

  const getPartnerName = (role) => {
    if (role === 'teacher') return teacherName
    if (role === 'peer') return peerName
    return systemName
  }

  // Calculate completed rounds (each assistant_message is one round)
  const completedRounds = gameLog.filter(entry => entry.type === 'assistant_message').length
  const canStartTest = completedRounds >= MIN_ROUNDS_FOR_TEST

  // Get current round messages only (only the current round's messages)
  // 每轮只显示：用户输入 + 对应agent的回复（只有一条）
  const conversationMessages = useMemo(() => {
    if (currentRoundStartIndex === null) return []
    // 只获取从currentRoundStartIndex开始的消息（当前轮次）
    const roundMessages = []
    for (let i = currentRoundStartIndex; i < gameLog.length; i++) {
      const entry = gameLog[i]
      if (entry.type === 'user_message' || entry.type === 'assistant_message') {
        roundMessages.push(entry)
      }
    }
    return roundMessages
  }, [currentRoundStartIndex, gameLog])
  
  const historyEntries = gameLog

  const roleInfoDetails = {
    teacher: {
      zh: {
        title: '老师',
        description: '老师会专注于回答你的问题、解释概念、提供示例。无论是基础知识还是延伸思考，遇到困惑都可以向老师提问。'
      },
      en: {
        title: 'Teacher',
        description: 'The teacher focuses on answering your questions, clarifying concepts, and offering examples. Whenever you feel stuck, feel free to ask the teacher for direct guidance.'
      }
    },
    peer: {
      zh: {
        title: '同伴',
        description: '和同伴交流是一个梳理自己思维同时拓展新的想法和思考的方式，同伴会给出自己的猜想并提出追问，激发你的思考。'
      },
      en: {
        title: 'Peer',
        description: 'Discussing with peers helps you organize ideas and spark new perspectives. Your peer will share hypotheses, ask follow-ups, and keep the exploration friendly and open.'
      }
    }
  }

  const closeRoleInfo = () => setRoleInfo(null)
  const closeTaskInfo = () => setIsTaskInfoOpen(false)
  const closeLibraryHint = () => setIsLibraryHintOpen(false)

  const taskInfoText = language === 'zh'
    ? '这是当前的测试结果，点击开始测试后，考官会基于你的对话进行延展测试，如果发现自己回答不上来，请回到课堂继续学习讨论哦。'
    : 'This shows your current test performance. After you tap Start Test, the examiner will extend the assessment based on your dialogue. If you feel stuck, return to the classroom and keep learning!'

  const libraryHintText = language === 'zh'
    ? '点击按钮进入新房间，再次点击后可以退出。'
    : 'Tap the button to enter the new room; tap it again to exit.'

  // 在组件挂载时检查localStorage状态，确保与组件状态同步
  useEffect(() => {
    const currentState = loadConversationState()
    if (!currentState) {
      // localStorage已被清空，重置所有状态
      if (conversations.teacher.length > 0 || conversations.peer.length > 0 || gameLog.length > 0) {
        setConversations({ teacher: [], peer: [] })
        setGameLog([])
        setHasSentFirstMessage(false)
        setCurrentRole(null)
        setCurrentRoundStartIndex(null)
      }
    }
  }, []) // 只在挂载时执行一次，检查localStorage是否被清空

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [conversationMessages, isLoading])

  useEffect(() => {
    // 只有在有实际内容时才保存，避免保存空状态覆盖清空操作
    if (conversations.teacher.length > 0 || conversations.peer.length > 0 || gameLog.length > 0) {
      const taskScores = {}
      tasks.forEach(task => {
        taskScores[task.id] = {
          points: task.points || 0,
          completed: task.completed || false
        }
      })
      saveConversationState({
        conversations,
        gameLog,
        taskScores: taskScores,
        meta: {
          language,
          username
        }
      })
    }
  }, [conversations, gameLog, tasks, language, username])
  
  // 监听storage变化，同步task得分
  useEffect(() => {
    const handleStorageChange = () => {
      const currentState = loadConversationState()
      if (currentState?.taskScores) {
        setTasks(prev => prev.map(task => ({
          ...task,
          points: currentState.taskScores[task.id]?.points || task.points || 0,
          completed: currentState.taskScores[task.id]?.completed || task.completed || false
        })))
      }
    }
    
    window.addEventListener('storage', handleStorageChange)
    // 也检查当前标签页的storage变化（通过轮询）
    const interval = setInterval(() => {
      handleStorageChange()
    }, 1000)
    
    return () => {
      window.removeEventListener('storage', handleStorageChange)
      clearInterval(interval)
    }
  }, [])

  const addToGameLog = (entry) => {
    setGameLog(prev => {
      const updated = [
        ...prev,
        {
          ...entry,
          timestamp: new Date().toISOString()
        }
      ]
      return updated
    })
  }

  const handleRoleSelect = (role) => {
    // 切换角色时，不重置round start index，保持当前内容显示
    setCurrentRole(role)
    setInputValue('')
    // 只有在第一次选择角色时才设置round start index
    if (currentRoundStartIndex === null) {
      setCurrentRoundStartIndex(gameLog.length)
    }
  }

  const handleStartTest = () => {
    if (!canStartTest) {
      alert(language === 'zh'
        ? `请先完成至少 ${MIN_ROUNDS_FOR_TEST} 轮对话后再开始测试。当前已完成 ${completedRounds} 轮。`
        : `Please complete at least ${MIN_ROUNDS_FOR_TEST} conversation rounds before starting the test. Currently completed: ${completedRounds} rounds.`)
      return
    }
    navigate('/test')
  }

  const handleSend = async () => {
    if (!inputValue.trim() || !currentRole || isLoading) return

    const userMessage = inputValue.trim()
    setInputValue('')
    setIsLoading(true)

    if (!hasSentFirstMessage) setHasSentFirstMessage(true)

    // 用户发送新内容时，清除前一轮的所有对话内容
    // 重置round start index为当前gameLog长度，这样只显示新的一轮对话
    setCurrentRoundStartIndex(gameLog.length)

    const newUserMessage = {
      role: 'user',
      content: userMessage,
      timestamp: new Date().toISOString()
    }

    const updatedConversations = {
      ...conversations,
      [currentRole]: [...conversations[currentRole], newUserMessage]
    }
    setConversations(updatedConversations)

    addToGameLog({
      type: 'user_message',
      role: currentRole,
      targetRole: currentRole,
      speaker: username,
      content: userMessage
    })

    // 添加到统一日志
    addToUnifiedLog({
      role: 'user',
      content: userMessage,
      agentType: 'user',
      speaker: username
    })

    try {
      // 获取上下文对话历史（只包含 teacher、peer、examiner、user、feedback，不包含 librarian、mindmap、evaluator）
      const contextHistory = getContextConversationHistory()
      // 构建消息：先包含上下文历史，然后是当前对话
      const messages = [
        ...contextHistory.map(msg => ({
          role: msg.role === 'teacher' || msg.role === 'peer' ? 'assistant' : msg.role,
          content: msg.content
        })),
        ...updatedConversations[currentRole].map(msg => ({
          role: msg.role,
          content: msg.content
        }))
      ]
      const response = await callDeepSeekAPIWithRole(messages, currentRole, language)

      const assistantMessage = {
        role: 'assistant',
        content: response,
        timestamp: new Date().toISOString()
      }

      setConversations(prev => ({
        ...prev,
        [currentRole]: [...updatedConversations[currentRole], assistantMessage]
      }))

      addToGameLog({
        type: 'assistant_message',
        role: currentRole,
        targetRole: currentRole,
        speaker: currentRole === 'teacher' ? teacherName : peerName,
        content: response
      })

      // 添加到统一日志
      addToUnifiedLog({
        role: currentRole, // 'teacher' 或 'peer'
        content: response,
        agentType: currentRole,
        speaker: currentRole === 'teacher' ? teacherName : peerName
      })
    } catch (error) {
      console.error('API Error:', error)
      alert(language === 'zh'
        ? `错误: ${error.message}`
        : `Error: ${error.message}`)
    } finally {
      setIsLoading(false)
    }
  }

  const toggleHistoryOverlay = () => {
    setIsHistoryExpanded(prev => !prev)
  }

  const closeHistoryOverlay = () => setIsHistoryExpanded(false)

  return (
    <div className="game-container">
      <div className="game-top-bar">
        <div className="tasks-panel-top">
          <div className="tasks-grid-top">
            {tasks.map(task => {
              const percentage = task.maxPoints
                ? Math.min(100, ((task.points || 0) / task.maxPoints) * 100)
                : 0
              const scoreDisplay = Number.isFinite(task.points)
                ? Number(task.points).toFixed(1).replace(/\.0$/, '')
                : '0'

              return (
                <div key={task.id} className="task-item-top">
                  <div className={`task-circle-top ${task.completed ? 'completed' : ''}`}>
                    <svg className="task-progress-top" viewBox="0 0 100 100">
                      <circle className="task-progress-bg-top" cx="50" cy="50" r="45" />
                      <circle
                        className="task-progress-bar-top"
                        cx="50"
                        cy="50"
                        r="45"
                        strokeDasharray={`${2 * Math.PI * 45}`}
                        strokeDashoffset={`${2 * Math.PI * 45 * (1 - percentage / 100)}`}
                      />
                    </svg>
                    <div className="task-score-top">{scoreDisplay}</div>
                  </div>
                  <div className="task-name-top">{task.name}</div>
                </div>
              )
            })}
          </div>
          <button
            type="button"
            className="task-info-btn"
            onClick={() => setIsTaskInfoOpen(true)}
            aria-label={language === 'zh' ? '查看测试说明' : 'View test info'}
          >
            ?
          </button>
        </div>
        <div className="history-panel-top">
          <div className="history-title-row">
            <h3>{language === 'zh' ? '对话记录' : 'Conversation History'}</h3>
            <button
              type="button"
              className={`history-toggle-btn ${isHistoryExpanded ? 'expanded' : ''}`}
              onClick={toggleHistoryOverlay}
              aria-label={language === 'zh'
                ? (isHistoryExpanded ? '收起对话记录' : '展开对话记录')
                : (isHistoryExpanded ? 'Collapse conversation history' : 'Expand conversation history')}
              title={language === 'zh'
                ? (isHistoryExpanded ? '收起对话记录' : '展开对话记录')
                : (isHistoryExpanded ? 'Collapse conversation history' : 'Expand conversation history')}
            >
              {isHistoryExpanded ? '−' : '+'}
            </button>
          </div>
          <div className="history-content-top">
            {historyEntries.length === 0 ? (
              <div className="empty-history">
                {language === 'zh' ? '暂无记录' : 'No history yet'}
              </div>
            ) : (
              historyEntries.map((entry, index) => (
                <div
                  key={entry.timestamp || index}
                  className="history-entry"
                >
                  <div className="history-summary">
                    {entry.speaker || (entry.role === 'teacher'
                      ? teacherName
                      : entry.role === 'peer'
                        ? peerName
                        : username)}
                  </div>
                  <div className="history-content-text">
                    {entry.content}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      <div className="conversation-area">
        <div className="messages-display">
          {/* 左侧：老师 */}
          <div className="message-column message-column-teacher">
            <div className="message-column-content">
              {currentRole === 'teacher' && conversationMessages.map((entry, index) => {
                if (entry.type === 'assistant_message' && entry.role === 'teacher') {
                  return (
                    <div key={`${entry.timestamp}-${index}`} className="message assistant">
                      <div className="message-content">
                        <ReactMarkdown>{entry.content}</ReactMarkdown>
                      </div>
                    </div>
                  )
                }
                return null
              })}
              {isLoading && currentRole === 'teacher' && (
                <div className="message assistant">
                  <div className="message-content thinking">
                    {language === 'zh' ? '思考中...' : 'Thinking...'}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* 中间：用户 */}
          <div className="message-column message-column-user">
            <div className="message-column-content">
              {currentRole && conversationMessages.map((entry, index) => {
                if (entry.type === 'user_message') {
                  return (
                    <div key={`${entry.timestamp}-${index}`} className="message user">
                      <div className="message-content">
                        <ReactMarkdown>{entry.content}</ReactMarkdown>
                      </div>
                    </div>
                  )
                }
                return null
              })}
            </div>
          </div>

          {/* 右侧：同伴 */}
          <div className="message-column message-column-peer">
            <div className="message-column-content">
              {currentRole === 'peer' && conversationMessages.map((entry, index) => {
                if (entry.type === 'assistant_message' && entry.role === 'peer') {
                  return (
                    <div key={`${entry.timestamp}-${index}`} className="message assistant">
                      <div className="message-content">
                        <ReactMarkdown>{entry.content}</ReactMarkdown>
                      </div>
                    </div>
                  )
                }
                return null
              })}
              {isLoading && currentRole === 'peer' && (
                <div className="message assistant">
                  <div className="message-content thinking">
                    {language === 'zh' ? '思考中...' : 'Thinking...'}
                  </div>
                </div>
              )}
            </div>
          </div>
          <div ref={messagesEndRef} />
        </div>
      </div>

      <div className="bottom-controls">
        {currentRole && !hasSentFirstMessage && (
          <div className="hint-bubble">
            {language === 'zh' ? 'hello~ 你想学习些什么呢？' : 'hi! Welcome:) whats you want to learn?'}
          </div>
        )}
        {!currentRole && (
          <div className="select-role-hint white">
            {language === 'zh' ? '请选择一个角色开始对话' : 'Please select a role to start conversation'}
          </div>
        )}
        <div className="role-selector">
          <div className="role-btn-wrapper">
            <button
              className={`role-btn ${currentRole === 'teacher' ? 'active' : ''}`}
              onClick={() => handleRoleSelect('teacher')}
            >
              {language === 'zh' ? '👨‍🏫 老师' : '👨‍🏫 Teacher'}
            </button>
            <button
              type="button"
              className="role-info-btn"
              aria-label={language === 'zh' ? '查看老师角色说明' : 'View teacher role info'}
              onClick={() => setRoleInfo('teacher')}
            >
              ?
            </button>
          </div>
          <div className="role-btn-wrapper">
            <button
              className={`role-btn ${currentRole === 'peer' ? 'active' : ''}`}
              onClick={() => handleRoleSelect('peer')}
            >
              {language === 'zh' ? '👥 同伴' : '👥 Peer'}
            </button>
            <button
              type="button"
              className="role-info-btn"
              aria-label={language === 'zh' ? '查看同伴角色说明' : 'View peer role info'}
              onClick={() => setRoleInfo('peer')}
            >
              ?
            </button>
          </div>
        </div>
        <div className="input-container">
          <button
            type="button"
            className="nav-info-btn"
            aria-label={language === 'zh' ? '查看图书馆提示' : 'View library hint'}
            onClick={() => setIsLibraryHintOpen(true)}
          >
            ?
          </button>
          <button className="nav-btn" onClick={() => navigate('/library')}>
            {language === 'zh' ? '图书馆' : 'Library'}
          </button>
          <button className="nav-btn" onClick={() => navigate('/mindmap')}>
            {language === 'zh' ? '思维导图' : 'Mind Map'}
          </button>
          <textarea
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder={language === 'zh' ? '输入你的消息...' : 'Type your message...'}
            disabled={!currentRole || isLoading}
            className="message-input"
            rows={3}
          />
          <button
            onClick={handleSend}
            disabled={!currentRole || isLoading || !inputValue.trim()}
            className="send-btn"
          >
            {language === 'zh' ? '发送' : 'Send'}
          </button>
          <button
            onClick={handleStartTest}
            className="test-btn"
          >
            {language === 'zh' ? '测试' : 'Test'}
          </button>
        </div>
      </div>
      {roleInfo && (
        <div className="role-info-overlay" onClick={closeRoleInfo}>
          <div
            className="role-info-modal"
            onClick={(event) => event.stopPropagation()}
          >
            <button
              className="role-info-close"
              aria-label={language === 'zh' ? '关闭角色说明' : 'Close role info'}
              onClick={closeRoleInfo}
            >
              ×
            </button>
            <h3>
              {roleInfoDetails[roleInfo][language === 'zh' ? 'zh' : 'en'].title}
            </h3>
            <p>
              {roleInfoDetails[roleInfo][language === 'zh' ? 'zh' : 'en'].description}
            </p>
          </div>
        </div>
      )}
      {isTaskInfoOpen && (
        <div className="task-info-overlay" onClick={closeTaskInfo}>
          <div
            className="task-info-modal"
            onClick={(event) => event.stopPropagation()}
          >
            <button
              className="task-info-close"
              aria-label={language === 'zh' ? '关闭测试说明' : 'Close test info'}
              onClick={closeTaskInfo}
            >
              ×
            </button>
            <h3>{language === 'zh' ? '测试说明' : 'Test Info'}</h3>
            <p>{taskInfoText}</p>
          </div>
        </div>
      )}
      {isLibraryHintOpen && (
        <div className="nav-info-overlay" onClick={closeLibraryHint}>
          <div
            className="nav-info-modal"
            onClick={(event) => event.stopPropagation()}
          >
            <button
              className="nav-info-close"
              aria-label={language === 'zh' ? '关闭图书馆提示' : 'Close library hint'}
              onClick={closeLibraryHint}
            >
              ×
            </button>
            <h3>{language === 'zh' ? '图书馆提示' : 'Library Hint'}</h3>
            <p>{libraryHintText}</p>
          </div>
        </div>
      )}
      {isHistoryExpanded && (
        <div className="history-overlay" onClick={closeHistoryOverlay}>
          <div
            className="history-modal"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="history-modal-header">
              <h3>{language === 'zh' ? '对话记录' : 'Conversation History'}</h3>
              <button
                className="history-modal-close"
                aria-label={language === 'zh' ? '关闭对话记录' : 'Close conversation history'}
                onClick={closeHistoryOverlay}
              >
                ×
              </button>
            </div>
            <div className="history-modal-content">
              {historyEntries.length === 0 ? (
                <div className="empty-history">
                  {language === 'zh' ? '暂无记录' : 'No history yet'}
                </div>
              ) : (
                historyEntries.map((entry, index) => (
                  <div key={entry.timestamp || index} className="history-entry">
                    <div className="history-summary">
                      {entry.speaker || (entry.role === 'teacher'
                        ? teacherName
                        : entry.role === 'peer'
                          ? peerName
                          : username)}
                    </div>
                    <div className="history-content-text">
                      {entry.content}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default Game

