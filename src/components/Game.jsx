import { useEffect, useRef, useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import ReactMarkdown from 'react-markdown'
import { callDeepSeekAPIWithRole } from '../utils/api'
import {
  loadConversationState,
  saveConversationState,
  addToUnifiedLog,
  getContextConversationHistory,
  exportGameConversation,
  saveGameConversationRealTime,
  saveGameConversationImmediate,
  sendBeaconOnUnload
} from '../utils/conversationStorage'
import { getTasksArray } from '../utils/tasks'
import '../styles/Game.css'

const MIN_ROUNDS_FOR_TEST = 3

function Game({ language, username }) {
  const initialState = loadConversationState()
  const [currentRole, setCurrentRole] = useState(null)
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
  const [learningGoal, setLearningGoal] = useState(() => {
    const state = loadConversationState()
    return state?.learningGoal || ''
  })
  const [isEditingGoal, setIsEditingGoal] = useState(false)
  const [tempGoal, setTempGoal] = useState('')
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

  const completedRounds = gameLog.filter(entry => entry.type === 'assistant_message').length
  const canStartTest = learningGoal && learningGoal.trim() !== ''
  const isInFirstThreeRounds = completedRounds < 3

  const conversationMessages = useMemo(() => {
    if (currentRoundStartIndex === null) return []
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
    ? '这里显示当前的测试结果。点击开始测试后，考官会基于测试的主题进行延展测试，如果发现自己回答不上来，请回到课堂继续学习讨论哦。test基于Bloom学习阶段来评估你的学习进展和成果。我们会围绕着你设置的学习主题来从不同阶段的指导和评估你的学习。'
    : 'This shows your current test performance. After you tap Start Test, the examiner will extend the assessment based on your dialogue. If you feel stuck, return to the classroom and keep learning! Test is based on Bloom\'s learning stages to assess your learning progress and outcomes. We will guide and evaluate your learning from different stages around the learning topic you set.'

  const libraryHintText = language === 'zh'
    ? '点击按钮进入新房间，再次点击后可以退出。'
    : 'Tap the button to enter the new room; tap it again to exit.'

  useEffect(() => {
    const currentState = loadConversationState() || {}
    if (learningGoal !== (currentState.learningGoal || '')) {
      saveConversationState({
        ...currentState,
        learningGoal: learningGoal
      })
    }
  }, [learningGoal])

  useEffect(() => {
    const currentState = loadConversationState()
    if (!currentState) {
      if (conversations.teacher.length > 0 || conversations.peer.length > 0 || gameLog.length > 0) {
        setConversations({ teacher: [], peer: [] })
        setGameLog([])
        setHasSentFirstMessage(false)
        setCurrentRole(null)
        setCurrentRoundStartIndex(null)
      }
    }
  }, [])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [conversationMessages, isLoading])

  useEffect(() => {
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
        learningGoal: learningGoal,
        meta: {
          language,
          username
        }
      })
      
      saveGameConversationRealTime(3000)
    }
  }, [conversations, gameLog, tasks, language, username, learningGoal])
  
  useEffect(() => {
    return () => {
      if (gameLog.length > 0) {
        saveGameConversationImmediate().catch(err => {
          console.error('Failed to save game conversation on unmount:', err)
        })
      }
    }
  }, [gameLog.length, language])
  
  useEffect(() => {
    const handleBeforeUnload = () => {
      sendBeaconOnUnload()
    }
    
    window.addEventListener('beforeunload', handleBeforeUnload)
    
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload)
    }
  }, [])
  
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
    setCurrentRole(role)
    if (conversationMessages.length === 0) {
      setCurrentRoundStartIndex(gameLog.length)
    }
  }

  const handleStartTest = async () => {
    if (!canStartTest) {
      alert(language === 'zh'
        ? '请先找到学习目标后再开始测试。'
        : 'Please find your learning goal before starting the test.')
      return
    }
    
    try {
      const filename = language === 'zh' ? '课堂对话记录.json' : 'classroom-history.json'
      await exportGameConversation(filename, { forceFullExport: true })
      console.log('Game conversation saved before navigating to test')
    } catch (error) {
      console.error('Failed to save game conversation before test:', error)
    }
    
    navigate('/test')
  }

  const handleSend = async () => {
    if (!inputValue.trim() || !currentRole || isLoading) return

    const userMessage = inputValue.trim()
    setInputValue('')
    setIsLoading(true)

    if (!hasSentFirstMessage) setHasSentFirstMessage(true)

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

    if (!hasSentFirstMessage && currentRole === 'teacher') {
      try {
        const currentState = loadConversationState() || {}
        const prevMeta = currentState.meta || {}
        saveConversationState({
          meta: {
            ...prevMeta,
            language,
            username,
            examTopic: userMessage
          }
        })
      } catch (e) {
        console.warn('Failed to save exam topic to conversation state from first teacher turn:', e)
      }
    }

    addToGameLog({
      type: 'user_message',
      role: currentRole,
      targetRole: currentRole,
      speaker: username,
      content: userMessage
    })

    addToUnifiedLog({
      role: 'user',
      content: userMessage,
      agentType: 'user',
      speaker: username
    })

    try {
      if (isInFirstThreeRounds && !learningGoal && userMessage.length > 10) {
        const goalPatterns = language === 'zh'
          ? [
              /(?:我想学习|我要学习|学习|了解|研究)(?:一下|关于)?\s*([^，,。！？\n]{5,50})/,
              /(?:学习目标|目标是|我想|我要)(?:是|为)?\s*([^，,。！？\n]{5,50})/
            ]
          : [
              /(?:I (?:want to|would like to|am interested in) (?:learn|study|understand|explore))(?:\s+about)?\s+([^,.!?\n]{5,50})/i,
              /(?:learning goal|goal is|I want|I'd like)\s+(?:is|to)?\s*([^,.!?\n]{5,50})/i
            ]
        
        for (const pattern of goalPatterns) {
          const match = userMessage.match(pattern)
          if (match && match[1]) {
            const extractedGoal = match[1].trim()
            if (extractedGoal.length > 5 && extractedGoal.length < 100) {
              setLearningGoal(extractedGoal)
              const currentState = loadConversationState() || {}
              saveConversationState({
                ...currentState,
                learningGoal: extractedGoal
              })
              break
            }
          }
        }
      }
      
      const contextHistory = getContextConversationHistory()
      const shouldGuideLearningGoal = isInFirstThreeRounds && !learningGoal
      
      const firstTurnSystemMessage = !hasSentFirstMessage
        ? [{
            role: 'system',
            content: language === 'zh'
              ? '现在是与学习者本轮课堂对话的第一轮。请你先根据学习者的需求，给出3-5个更具体的细分学习方向选项（例如不同的子主题、难度层级或应用情境），用简短一句话说明每个方向的重点，然后让学习者在其中选择一个继续深入，而不要立刻直接回答问题或给出完整讲解。'
              : 'This is the first turn of the classroom conversation with the learner. First, propose 3–5 more specific directions (e.g., subtopics, difficulty levels, or application scenarios) that the learner could choose from, with one short sentence explaining the focus of each option. Then ask the learner to pick ONE direction to continue, instead of directly answering the question or giving a full explanation.'
          }]
        : []
      
      const learningGoalGuidanceMessage = shouldGuideLearningGoal
        ? [{
            role: 'system',
            content: language === 'zh'
              ? '这是前三轮对话中的一轮。你的重要任务是帮助学习者确定一个明确的学习目标。学习目标应该包括：1) 学习的主题（例如：机器学习），2) 主题下的具体细分方向（例如：老虎机算法）。请通过提问和引导，帮助学习者明确这两个方面，最终形成一句话的学习目标（例如："学习机器学习中的老虎机算法"）。如果学习者已经表达了明确的主题和细分方向，请总结为一句话的学习目标并确认。'
              : 'This is one of the first three rounds of conversation. Your important task is to help the learner determine a clear learning goal. The learning goal should include: 1) The learning topic (e.g., Machine Learning), 2) A specific sub-direction within that topic (e.g., Multi-armed Bandit Algorithm). Please help the learner clarify these two aspects through questions and guidance, ultimately forming a one-sentence learning goal (e.g., "Learn about Multi-armed Bandit Algorithm in Machine Learning"). If the learner has already expressed a clear topic and sub-direction, please summarize it into a one-sentence learning goal and confirm.'
          }]
        : []
      
      const learningGoalMessage = learningGoal && !shouldGuideLearningGoal
        ? [{
            role: 'system',
            content: language === 'zh'
              ? `当前学习者的学习目标是：「${learningGoal}」。所有对话必须围绕这个学习目标展开。如果学生的话题偏离了学习目标，请温和地提醒学生回到学习目标相关的讨论上。`
              : `The learner's current learning goal is: "${learningGoal}". All conversations must revolve around this learning goal. If the student's topic deviates from the learning goal, gently remind them to return to discussions related to the learning goal.`
          }]
        : []

      const messages = [
        ...firstTurnSystemMessage,
        ...learningGoalGuidanceMessage,
        ...learningGoalMessage,
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

      addToUnifiedLog({
        role: currentRole,
        content: response,
        agentType: currentRole,
        speaker: currentRole === 'teacher' ? teacherName : peerName
      })
      
      if (shouldGuideLearningGoal && !learningGoal) {
        const goalPattern = language === 'zh'
          ? /(?:学习目标是|目标是|你的学习目标[是为]|我们[要来]学习|让我们[要来]学习)[：:：]?\s*([^。！？\n]+)/
          : /(?:learning goal is|your learning goal is|let's (?:learn|focus on|study)|we (?:will|are going to) (?:learn|focus on|study))[：:：]?\s*([^.!?\n]+)/i
        const match = response.match(goalPattern)
        if (match && match[1]) {
          const extractedGoal = match[1].trim()
          if (extractedGoal.length > 5 && extractedGoal.length < 100) {
            setLearningGoal(extractedGoal)
            const currentState = loadConversationState() || {}
            saveConversationState({
              ...currentState,
              learningGoal: extractedGoal
            })
          }
        }
      }
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

  const handleGoalEdit = () => {
    setTempGoal(learningGoal)
    setIsEditingGoal(true)
  }

  const handleGoalSave = async () => {
    const newGoal = tempGoal.trim()
    if (newGoal && newGoal !== learningGoal) {
      const oldGoal = learningGoal
      setLearningGoal(newGoal)
      setIsEditingGoal(false)
      
      const currentState = loadConversationState() || {}
      saveConversationState({
        ...currentState,
        learningGoal: newGoal
      })
      
      if (currentRole && !isLoading) {
        setIsLoading(true)
        try {
          const transitionMessage = language === 'zh'
            ? `你改变了学习目标，我们来聊聊新的话题吧。新的学习目标是：${newGoal}。让我们开始探索这个新主题。`
            : `You've changed the learning goal. Let's talk about the new topic. The new learning goal is: ${newGoal}. Let's start exploring this new topic.`
          
          const transitionEntry = {
            role: 'assistant',
            content: transitionMessage,
            timestamp: new Date().toISOString()
          }
          
          setConversations(prev => ({
            ...prev,
            [currentRole]: [...prev[currentRole], transitionEntry]
          }))
          
          addToGameLog({
            type: 'assistant_message',
            role: currentRole,
            targetRole: currentRole,
            speaker: currentRole === 'teacher' ? teacherName : peerName,
            content: transitionMessage
          })
          
          addToUnifiedLog({
            role: currentRole,
            content: transitionMessage,
            agentType: currentRole,
            speaker: currentRole === 'teacher' ? teacherName : peerName
          })
        } catch (error) {
          console.error('Error generating transition message:', error)
        } finally {
          setIsLoading(false)
        }
      } else {
        setIsEditingGoal(false)
      }
    } else {
      setIsEditingGoal(false)
    }
  }

  const handleGoalCancel = () => {
    setTempGoal('')
    setIsEditingGoal(false)
  }

  return (
    <div className="game-container">
      <div className="game-top-bar">
        <div className="tasks-panel-top">
          <div className="learning-goal-container">
            {isEditingGoal ? (
              <div className="learning-goal-edit">
                <input
                  type="text"
                  className="learning-goal-input"
                  value={tempGoal}
                  onChange={(e) => setTempGoal(e.target.value)}
                  placeholder={language === 'zh' ? '请输入学习目标' : 'Enter learning goal'}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      handleGoalSave()
                    } else if (e.key === 'Escape') {
                      handleGoalCancel()
                    }
                  }}
                  autoFocus
                />
                <button
                  type="button"
                  className="learning-goal-save-btn"
                  onClick={handleGoalSave}
                >
                  {language === 'zh' ? '保存' : 'Save'}
                </button>
                <button
                  type="button"
                  className="learning-goal-cancel-btn"
                  onClick={handleGoalCancel}
                >
                  {language === 'zh' ? '取消' : 'Cancel'}
                </button>
              </div>
            ) : (
              <div className="learning-goal-display">
                <span className="learning-goal-label">
                  {language === 'zh' ? '学习目标：' : 'Learning Goal: '}
                </span>
                <span className="learning-goal-text">
                  {learningGoal || (language === 'zh' ? '（未设置）' : '(Not set)')}
                </span>
                <button
                  type="button"
                  className="learning-goal-edit-btn"
                  onClick={handleGoalEdit}
                  title={language === 'zh' ? '编辑学习目标' : 'Edit learning goal'}
                >
                  {language === 'zh' ? '编辑' : 'Edit'}
                </button>
              </div>
            )}
          </div>
          <div className="tasks-row-container">
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
                        <circle className="task-progress-bg-top" cx="50" cy="50" r="36" />
                        <circle
                          className="task-progress-bar-top"
                          cx="50"
                          cy="50"
                          r="36"
                          strokeDasharray={`${2 * Math.PI * 36}`}
                          strokeDashoffset={`${2 * Math.PI * 36 * (1 - percentage / 100)}`}
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
          <div className="message-column message-column-teacher">
            <div className="message-column-content">
              {currentRole === 'teacher' && conversationMessages.length === 0 && (
                <div className="message greeting-message">
                  <div className="message-content">
                    {hasSentFirstMessage
                      ? (language === 'zh' ? 'hello~' : 'hello~')
                      : (language === 'zh' ? 'hello~ 你想学习些什么呢？' : 'hi! Welcome:) whats you want to learn?')}
                  </div>
                </div>
              )}
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

          <div className="message-column message-column-peer">
            <div className="message-column-content">
              {currentRole === 'peer' && conversationMessages.length === 0 && (
                <div className="message greeting-message">
                  <div className="message-content">
                    {hasSentFirstMessage
                      ? (language === 'zh' ? 'hello~' : 'hello~')
                      : (language === 'zh' ? 'hello~ 你想学习些什么呢？' : 'hi! Welcome:) whats you want to learn?')}
                  </div>
                </div>
              )}
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
              {language === 'zh' ? '老师' : 'Teacher'}
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
              {language === 'zh' ? '同伴' : 'Peer'}
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
          <button className="nav-btn" onClick={() => navigate('/library')}>
            {language === 'zh' ? '图书馆' : 'Library'}
          </button>
          <button className="nav-btn" onClick={() => navigate('/mindmap')}>
            {language === 'zh' ? '思维导图' : 'Mind Map'}
          </button>
          <button
            type="button"
            className="nav-info-btn"
            aria-label={language === 'zh' ? '查看按钮使用提示' : 'View button usage hint'}
            onClick={() => setIsLibraryHintOpen(true)}
          >
            ?
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
              aria-label={language === 'zh' ? '关闭按钮使用提示' : 'Close button usage hint'}
              onClick={closeLibraryHint}
            >
              ×
            </button>
            <h3>{language === 'zh' ? '按钮使用提示' : 'Button Usage Hint'}</h3>
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

