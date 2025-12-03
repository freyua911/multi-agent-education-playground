import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import ReactMarkdown from 'react-markdown'
import { callDeepSeekAPIWithRole, evaluateAnswer, generateFeedback } from '../utils/api'
import { getTasksArray } from '../utils/tasks'
import {
  clearConversationState,
  exportConversationState,
  getConversationMessages,
  loadConversationState,
  saveConversationState,
  addToUnifiedLog,
  getContextConversationHistory
} from '../utils/conversationStorage'
import './Test.css'

const QUESTION_MARKERS = ['?', '？', '吗', '呢', 'what', 'how', 'why', 'which', 'who', 'when', 'where']

const BLOOM_KEYWORDS = {
  zh: {
    remember: ['回忆', '记住', '列出', '定义', '说出', '识别', '记忆'],
    understand: ['理解', '解释', '说明', '描述', '总结', '概括'],
    apply: ['应用', '使用', '解决', '计算', '执行', '实施'],
    analyze: ['分析', '比较', '对比', '区分', '分解', '检查'],
    evaluate: ['评估', '评价', '判断', '选择', '批评', '辩护'],
    create: ['创造', '设计', '制作', '构建', '发明', '编写']
  },
  en: {
    remember: ['recall', 'remember', 'list', 'define', 'name', 'identify', 'memorize'],
    understand: ['understand', 'explain', 'describe', 'summarize', 'interpret'],
    apply: ['apply', 'use', 'solve', 'calculate', 'execute', 'implement'],
    analyze: ['analyze', 'compare', 'contrast', 'distinguish', 'examine', 'investigate'],
    evaluate: ['evaluate', 'judge', 'critique', 'choose', 'criticize', 'defend'],
    create: ['create', 'design', 'construct', 'invent', 'compose', 'produce']
  }
}

function Test({ language, username }) {
  const [tasks, setTasks] = useState(() => getTasksArray(language))
  const [conversation, setConversation] = useState([])
  const [history, setHistory] = useState([])
  const [feedbackHistory, setFeedbackHistory] = useState([])
  const [inputValue, setInputValue] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [currentQuestion, setCurrentQuestion] = useState(null)
  const [currentTaskLevel, setCurrentTaskLevel] = useState(null)
  const [pendingEvaluation, setPendingEvaluation] = useState(false)
  // 保存上一轮的问题，用于评估用户的回答
  const [previousQuestion, setPreviousQuestion] = useState(null)
  const [previousTaskLevel, setPreviousTaskLevel] = useState(null)
  // 使用 useRef 来同步存储 previousQuestion，避免异步更新问题
  const previousQuestionRef = useRef(null)
  const previousTaskLevelRef = useRef(null)
  // 保存当前考题的参考标准答案，仅供评估者使用，不在界面中显示
  const standardAnswerRef = useRef(null)
  // 当前测试进度level，初始值为1（remember）
  const [currentTestLevel, setCurrentTestLevel] = useState('remember')
  // 当前这一轮评估已经完成，等待用户选择“再来一个问题 / 进入下一层级”
  const [awaitingNextAction, setAwaitingNextAction] = useState(false)
  const [endConfirmPending, setEndConfirmPending] = useState(false)
  const [copyNoticeVisible, setCopyNoticeVisible] = useState(false)
  const [testStateLoaded, setTestStateLoaded] = useState(false)
  const copyNoticeTimer = useRef(null)
  const messagesEndRef = useRef(null)
  const feedbackEndRef = useRef(null)
  const navigate = useNavigate()

  const examinerName = language === 'zh' ? '考官' : 'Examiner'
  const systemLabel = language === 'zh' ? '系统' : 'System'
  const evalLabel = language === 'zh' ? '评估' : 'Evaluation'
  const allTasksCompleted = tasks.every(task => task.completed)
  const averageScore = tasks.length
    ? tasks.reduce((sum, task) => sum + (task.points || 0), 0) / tasks.length
    : 0

  useEffect(() => {
    const stored = loadConversationState()
    const newTasks = getTasksArray(language)
    if (stored?.taskScores) {
      setTasks(newTasks.map(task => ({
        ...task,
        points: stored.taskScores[task.id]?.points || 0,
        completed: stored.taskScores[task.id]?.completed || false
      })))
    } else {
      setTasks(newTasks)
    }
    // 不重置对话和反馈，保持状态
    setCurrentQuestion(null)
    setCurrentTaskLevel(null)
    setPendingEvaluation(false)
    // 如果localStorage中没有保存的currentTestLevel，初始化为remember
    if (!stored?.currentTestLevel) {
      setCurrentTestLevel('remember')
    } else {
      setCurrentTestLevel(stored.currentTestLevel)
    }
  }, [language])

  useEffect(() => {
    const stored = loadConversationState()
    if (stored?.testConversation?.length) {
      setConversation(stored.testConversation)
    }
    if (stored?.testHistory?.length) {
      setHistory(stored.testHistory)
    }
    if (stored?.feedbackHistory?.length) {
      setFeedbackHistory(stored.feedbackHistory)
    }
    if (stored?.taskScores) {
      setTasks(prev => prev.map(task => ({
        ...task,
        points: stored.taskScores[task.id]?.points || 0,
        completed: stored.taskScores[task.id]?.completed || false
      })))
    }
    if (stored?.currentTestLevel) {
      setCurrentTestLevel(stored.currentTestLevel)
    }
    setTestStateLoaded(true)
  }, [])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [conversation, history])
  
  useEffect(() => {
    feedbackEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [feedbackHistory])

  useEffect(() => {
    if (!testStateLoaded) return
    const taskScores = {}
    tasks.forEach(task => {
      taskScores[task.id] = {
        points: task.points || 0,
        completed: task.completed || false
      }
    })
    saveConversationState({
      testConversation: conversation,
      testHistory: history,
      feedbackHistory: feedbackHistory,
      taskScores: taskScores,
      currentTestLevel: currentTestLevel
    })
  }, [conversation, history, feedbackHistory, tasks, testStateLoaded, currentTestLevel])

  useEffect(() => {
    return () => {
      clearTimeout(copyNoticeTimer.current)
    }
  }, [])

  const addHistoryEntry = (entry) => {
    setHistory(prev => [
      ...prev,
      {
        ...entry,
        timestamp: new Date().toISOString()
      }
    ])
  }

  const updateTaskScore = (taskId, score, maxPoints) => {
    setTasks(prev => prev.map(task => {
      if (task.id !== taskId) return task
      const normalizedScore = Number(score) || 0
      return {
        ...task,
        points: normalizedScore,
        completed: normalizedScore >= (maxPoints || 10)
      }
    }))
  }

  const detectQuestionFromAssistant = (message) => {
    if (!message) {
      console.log('detectQuestionFromAssistant: 消息为空')
      return
    }
    const trimmed = message.trim()
    console.log('detectQuestionFromAssistant: 考官发送消息，记录为问题。消息:', trimmed.substring(0, 100))
    
    const keywords = BLOOM_KEYWORDS[language === 'zh' ? 'zh' : 'en']
    let matchedLevel = null

    // 检查是否包含层级关键词
    for (const [level, words] of Object.entries(keywords)) {
      if (words.some(word => trimmed.toLowerCase().includes(word.toLowerCase()))) {
        const targetTask = tasks.find(task => task.id === level && !task.completed)
        if (targetTask) {
          matchedLevel = level
          console.log('detectQuestionFromAssistant: 匹配到任务级别:', level)
          break
        }
      }
    }

    // 如果没有匹配到层级，使用currentTestLevel作为fallback
    if (!matchedLevel) {
      matchedLevel = currentTestLevel
      console.log('detectQuestionFromAssistant: 使用当前测试层级作为fallback:', matchedLevel)
    }

    // 只要examiner发送了消息，就记录为问题（不依赖问号）
    if (matchedLevel) {
      console.log('detectQuestionFromAssistant: 设置currentQuestion和currentTaskLevel:', trimmed.substring(0, 50), matchedLevel)
      
      // 使用函数式更新，确保能获取到最新的 currentQuestion
      setCurrentQuestion(prevCurrent => {
        // 如果已经有currentQuestion，先保存为previousQuestion
        if (prevCurrent && currentTaskLevel) {
          setPreviousQuestion(prevCurrent)
          setPreviousTaskLevel(currentTaskLevel)
          // 同步更新 ref，实现立即访问
          previousQuestionRef.current = prevCurrent
          previousTaskLevelRef.current = currentTaskLevel
          console.log('detectQuestionFromAssistant: 保存上一轮问题为previousQuestion')
        }
        // 返回新的问题
        return trimmed
      })
      
      setCurrentTaskLevel(matchedLevel)
      
      // 关键修改：立即将新问题保存为 previousQuestion（等待用户回答）
      // 同时更新 state 和 ref，ref 可以立即访问，避免异步更新问题
      setPreviousQuestion(trimmed)
      setPreviousTaskLevel(matchedLevel)
      previousQuestionRef.current = trimmed
      previousTaskLevelRef.current = matchedLevel
      console.log('detectQuestionFromAssistant: 将新问题保存为previousQuestion，等待用户回答')
    } else {
      console.log('detectQuestionFromAssistant: 无法确定任务级别，使用currentTestLevel')
      // 即使无法确定层级，也记录问题，使用currentTestLevel
      setCurrentQuestion(prevCurrent => {
        if (prevCurrent && currentTaskLevel) {
          setPreviousQuestion(prevCurrent)
          setPreviousTaskLevel(currentTaskLevel)
          // 同步更新 ref
          previousQuestionRef.current = prevCurrent
          previousTaskLevelRef.current = currentTaskLevel
        }
        return trimmed
      })
      setCurrentTaskLevel(currentTestLevel)
      
      // 立即保存为 previousQuestion，同时更新 ref
      setPreviousQuestion(trimmed)
      setPreviousTaskLevel(currentTestLevel)
      previousQuestionRef.current = trimmed
      previousTaskLevelRef.current = currentTestLevel
      console.log('detectQuestionFromAssistant: 将新问题保存为previousQuestion，等待用户回答')
    }
  }

  const buildEvaluationSummary = (taskName, evaluation) => {
    return language === 'zh'
      ? `任务「${taskName}」平均得分 ${evaluation.score.toFixed(1)}/10。`
      : `Task "${taskName}" average score ${evaluation.score.toFixed(1)}/10.`
  }

  // 解析考官输出：拆分为用于展示的问题文本、用于评估的纯问题文本和标准答案
  const parseExaminerOutput = (rawMessage) => {
    if (!rawMessage || typeof rawMessage !== 'string') {
      return {
        displayText: '',
        questionText: '',
        standardAnswer: null
      }
    }
    let displayText = rawMessage.trim()
    let questionText = ''
    let standardAnswer = null

    try {
      let jsonSource = null

      // 优先匹配 ```json ... ``` 代码块，提取其中的 JSON
      const fencedMatch = rawMessage.match(/```json([\s\S]*?)```/i)
      if (fencedMatch && fencedMatch[1]) {
        jsonSource = fencedMatch[1]
        // 移除整个代码块，避免在界面显示
        displayText = displayText.replace(fencedMatch[0], '').trim()
      } else {
        // 回退：匹配第一个看起来像 JSON 的大括号片段
        const jsonMatch = rawMessage.match(/\{[\s\S]*\}/)
        if (jsonMatch) {
          jsonSource = jsonMatch[0]
          displayText = displayText.replace(jsonMatch[0], '').trim()
        }
      }

      if (jsonSource) {
        const obj = JSON.parse(jsonSource)
        if (obj.question) {
          questionText = String(obj.question).trim()
        }
        if (obj.standard_answer) {
          standardAnswer = String(obj.standard_answer).trim()
        }
      }
    } catch (error) {
      console.log('parseExaminerOutput: 解析考官JSON失败，退回使用完整文本', error)
      displayText = rawMessage.trim()
      questionText = ''
    }

    return {
      displayText,
      questionText,
      standardAnswer
    }
  }

  // 统一封装：向考官请求下一道题
  const askExaminerQuestion = async (targetLevel, baseConversation = null) => {
    // targetLevel：希望考官使用的层级；如果未指定则默认 currentTestLevel
    const levelToUse = targetLevel || currentTestLevel
    try {
      setIsLoading(true)
      // 获取上下文对话历史，并过滤为“课堂对话”：只保留 teacher / peer / user
      // 不包含 feedback agent 的总结，也不包含之前考官的问答，避免考官复述反馈或旧题目
      const rawContextHistory = getContextConversationHistory()
      const contextHistory = rawContextHistory.filter(msg =>
        msg.role === 'teacher' || msg.role === 'peer' || msg.role === 'user'
      )
      
      // 使用传入的对话（通常包含最新一条用户消息），否则使用当前 state 中的对话
      const displayConversation = (baseConversation || conversation).filter(entry => entry.role !== 'system')
      const apiMessages = [
        // 添加上下文对话历史作为上下文
        ...contextHistory.map(msg => ({
          role: msg.role === 'teacher' || msg.role === 'peer' || msg.role === 'examiner' || msg.role === 'feedback'
            ? 'assistant'
            : msg.role,
          content: msg.content
        })),
        // 然后是当前测试对话（用户提问 / 回答、考官之前的问题）
        ...displayConversation.map(entry => ({
          role: entry.role,
          content: entry.content
        })),
        // 最后一条由“用户”明确发出指令：不要复述反馈，只出新题
        {
          role: 'user',
          content: language === 'zh'
            ? `基于上面的对话，请你现在只做一件事：在当前 Bloom 测试层级下，提出一条新的测试题目。\n\n要求：\n1. 不要复述、总结或评价之前的反馈内容；\n2. 不要重复之前已经问过的题目；\n3. 直接给出本层级的一道新题目（可以附一句话以内的简短说明），不要输出其他内容。`
            : `Based on the conversation above, please do exactly one thing now: ask ONE new test question at the current Bloom test level.\n\nRequirements:\n1. Do NOT repeat, summarize, or restate any previous feedback;\n2. Do NOT reuse questions that were already asked before;\n3. Directly output a single new question at this level (optionally with a one-sentence explanation), and nothing else.`
        }
      ]

      const response = await callDeepSeekAPIWithRole(apiMessages, 'examiner', language, levelToUse)
      const { displayText, questionText, standardAnswer } = parseExaminerOutput(response)
      // 记录当前标准答案，仅供评估者使用
      standardAnswerRef.current = standardAnswer || null
      const assistantMessage = {
        role: 'assistant',
        // 只在界面上展示自然语言说明 + 链接 + 题目文本，不展示标准答案 JSON
        content: displayText || questionText || response,
        timestamp: new Date().toISOString()
      }

      const finalConversation = [...displayConversation, assistantMessage]
      setConversation(finalConversation)
      addHistoryEntry({
        speaker: examinerName,
        content: displayText || questionText || response,
        type: 'assistant'
      })
      
      // 添加到统一日志
      addToUnifiedLog({
        role: 'examiner',
        // 统一日志中保留完整原始响应（包含标准答案JSON），便于研究与导出
        content: response,
        agentType: 'examiner',
        speaker: examinerName
      })

      // 记录当前问题（为下一次用户回答做准备）——使用纯问题文本，避免带上JSON
      detectQuestionFromAssistant(questionText || displayText || response)
      // 进入“等待用户回答本题”的状态
      setAwaitingNextAction(false)
    } catch (error) {
      console.error('API Error:', error)
      alert(language === 'zh'
        ? `错误: ${error.message}`
        : `Error: ${error.message}`)
    } finally {
      setIsLoading(false)
    }
  }

  // 当所有任务完成时，自动跳转到完成页面，并将对话记录上传到服务器
  useEffect(() => {
    if (allTasksCompleted && !isLoading) {
      const timer = setTimeout(async () => {
        const filename = language === 'zh' ? '学习对话记录.json' : 'conversation-history.json'
        await exportConversationState(filename)
        clearConversationState()
        navigate('/completion')
      }, 2000) // 延迟2秒后跳转，让用户看到完成状态
      return () => clearTimeout(timer)
    }
  }, [allTasksCompleted, isLoading, language, navigate])

  const handleSend = async () => {
    if (!inputValue.trim() || isLoading) return
    if (allTasksCompleted) {
      return
    }

    // 如果当前正在等待用户在反馈后选择“再来一个问题 / 进入下一层级”，则不允许直接继续发送
    if (awaitingNextAction) {
      alert(language === 'zh'
        ? '本轮评估已完成，请先在右侧反馈框中选择“再来一个问题”或“进入下一层级”。'
        : 'The evaluation for this round is finished. Please choose "Another question" or "Next level" in the feedback panel.')
      return
    }

    const userMessage = inputValue.trim()
    setInputValue('')
    setIsLoading(true)

    const userEntry = {
      role: 'user',
      content: userMessage,
      timestamp: new Date().toISOString()
    }

    let workingConversation = [...conversation, userEntry]
    setConversation(workingConversation)
    addHistoryEntry({ speaker: username, content: userMessage, type: 'user' })
    
    // 添加到统一日志
    addToUnifiedLog({
      role: 'user',
      content: userMessage,
      agentType: 'user',
      speaker: username
    })

    // 评估逻辑：检查用户是否在回答考官的问题
    // 方法：优先使用 previousQuestionRef（同步访问），如果不存在则使用 previousQuestion（state），最后从 conversation 中查找
    // 使用 ref 可以立即访问，避免 React state 异步更新的问题
    let questionToEvaluate = previousQuestionRef.current || previousQuestion
    let taskLevelToEvaluate = previousTaskLevelRef.current || previousTaskLevel
    
    // 如果 previousQuestion 不存在（可能是 state 异步更新问题），尝试从 conversation 中获取
    if (!questionToEvaluate || !taskLevelToEvaluate) {
      // 检查 conversation 中最后一条 assistant 消息（应该是 examiner 的消息）
      // 注意：要排除 feedback 消息，只找 examiner 的消息
      const lastExaminerMessage = [...conversation].reverse().find(msg => 
        msg.role === 'assistant' && msg.content
      )
      
      if (lastExaminerMessage) {
        questionToEvaluate = lastExaminerMessage.content
        // 尝试从消息中匹配层级关键词来确定任务级别
        const keywords = BLOOM_KEYWORDS[language === 'zh' ? 'zh' : 'en']
        let matchedLevel = null
        for (const [level, words] of Object.entries(keywords)) {
          if (words.some(word => questionToEvaluate.toLowerCase().includes(word.toLowerCase()))) {
            const targetTask = tasks.find(task => task.id === level && !task.completed)
            if (targetTask) {
              matchedLevel = level
              break
            }
          }
        }
        taskLevelToEvaluate = matchedLevel || currentTestLevel
        console.log('从conversation中获取examiner消息作为问题:', questionToEvaluate.substring(0, 50), '任务级别:', taskLevelToEvaluate)
      } else {
        // 如果 conversation 中也没有 examiner 消息，说明这是第一次交互（打招呼），不触发评估
        console.log('没有previousQuestion且conversation中也没有examiner消息，跳过评估（可能是第一次交互或打招呼）')
        questionToEvaluate = null
        taskLevelToEvaluate = null
      }
    }
    
    // 只有在有明确的问题和任务级别时才触发评估
    if (questionToEvaluate && taskLevelToEvaluate) {
      try {
        console.log('开始评估，问题:', questionToEvaluate, '任务级别:', taskLevelToEvaluate, '当前测试层级:', currentTestLevel)
        const taskMeta = tasks.find(task => task.id === taskLevelToEvaluate)
        // 获取三个评估者的结果，使用currentTestLevel作为评估标准
        const evaluation = await evaluateAnswer(
          questionToEvaluate,
          userMessage,
          currentTestLevel, // 使用currentTestLevel作为评估标准
          language,
          standardAnswerRef.current || null
        )
        console.log('评估结果:', evaluation)

        // 调用反馈agent综合三个评估者的输出，传递currentTestLevel
        const feedbackResult = await generateFeedback(evaluation.details, language, currentTestLevel)
        console.log('反馈结果:', feedbackResult)

        // 更新得分，使用currentTestLevel对应的task
        const currentTaskMeta = tasks.find(task => task.id === currentTestLevel)
        updateTaskScore(currentTestLevel, feedbackResult.score, currentTaskMeta?.maxPoints)

        // 添加反馈到反馈历史（包含三位评估者得分、平均分和反馈总结）
        const feedbackEntry = {
          taskLevel: currentTestLevel,
          taskName: currentTaskMeta?.name || currentTestLevel,
          score: feedbackResult.score,
          // 三位评估者的详细结果
          evaluators: evaluation.details || [],
          // 三位评估者的原始平均分
          averageRawScore: evaluation.averageRawScore,
          // 反馈 agent 综合后的总结性反馈
          summary: feedbackResult.feedback,
          timestamp: new Date().toISOString()
        }
        console.log('添加反馈到历史:', feedbackEntry)
        setFeedbackHistory(prev => [...prev, feedbackEntry])

        // 将反馈agent的内容添加到testHistory中，以便导出到JSON
        const feedbackAgentName = language === 'zh' ? '反馈 Agent' : 'Feedback Agent'
        addHistoryEntry({
          speaker: feedbackAgentName,
          content: feedbackResult.feedback,
          type: 'assistant',
          role: 'feedback'
        })
        
        // 添加到统一日志
        addToUnifiedLog({
          role: 'feedback',
          content: feedbackResult.feedback,
          agentType: 'feedback',
          speaker: feedbackAgentName
        })

        // 清空previousQuestion和previousTaskLevel，因为已经评估过了
        setPreviousQuestion(null)
        setPreviousTaskLevel(null)
        // 同时清空 ref
        previousQuestionRef.current = null
        previousTaskLevelRef.current = null
        // 如果使用的是currentQuestion，也清空它
        if (questionToEvaluate === currentQuestion) {
          setCurrentQuestion(null)
          setCurrentTaskLevel(null)
        }
        setPendingEvaluation(false)

        // 本轮评估流程结束，等待用户在反馈框中选择下一步
        setAwaitingNextAction(true)
        setIsLoading(false)
        return
      } catch (error) {
        console.error('Evaluation error:', error)
        alert(language === 'zh'
          ? `评估出错：${error.message}`
          : `Evaluation failed: ${error.message}`)
        setIsLoading(false)
        return
      }
    } else {
      // 如果没有任务级别，记录日志但不阻止继续流程
      console.log('警告：没有任务级别，无法触发评估。questionToEvaluate:', questionToEvaluate, 'taskLevelToEvaluate:', taskLevelToEvaluate)
    }

    // 如果没有检测到需要评估的问题（例如，用户是打招呼），则让考官根据当前层级出题
    await askExaminerQuestion(currentTestLevel, workingConversation)
  }

  // 反馈面板中的“再来一个问题”：保持当前层级不变，让考官在该层级再出一道题
  const handleAskAnotherQuestion = async () => {
    if (isLoading || allTasksCompleted) return
    await askExaminerQuestion(currentTestLevel)
  }

  // 反馈面板中的“进入下一层级”：层级+1，再让考官在新层级出题
  const handleGoToNextLevel = async () => {
    if (isLoading || allTasksCompleted) return
    const levelOrder = ['remember', 'understand', 'apply', 'analyze', 'evaluate', 'create']
    const currentIndex = levelOrder.indexOf(currentTestLevel)
    if (currentIndex < 0 || currentIndex >= levelOrder.length - 1) {
      // 已经是最高层级，无法再前进
      return
    }
    const nextLevel = levelOrder[currentIndex + 1]
    setCurrentTestLevel(nextLevel)
    await askExaminerQuestion(nextLevel)
  }

  const renderMessage = (entry, index) => {
    const roleClass = entry.role === 'assistant'
      ? 'assistant'
      : entry.role === 'user'
        ? 'user'
        : 'system'

    const speaker =
      entry.role === 'user'
        ? username
        : entry.role === 'assistant'
          ? examinerName
          : systemLabel

    const handleReferenceCopy = async (href) => {
      if (!href) return
      try {
        if (navigator.clipboard?.writeText) {
          await navigator.clipboard.writeText(href)
        } else {
          const textarea = document.createElement('textarea')
          textarea.value = href
          textarea.setAttribute('readonly', '')
          textarea.style.position = 'absolute'
          textarea.style.left = '-9999px'
          document.body.appendChild(textarea)
          textarea.select()
          document.execCommand('copy')
          document.body.removeChild(textarea)
        }
      } catch (error) {
        console.error('Copy failed:', error)
      }
      setCopyNoticeVisible(true)
      clearTimeout(copyNoticeTimer.current)
      copyNoticeTimer.current = setTimeout(() => {
        setCopyNoticeVisible(false)
      }, 2000)
    }

    const markdownComponents = {
      a: ({ href, children }) => (
        <button
          type="button"
          className="test-link-copy"
          onClick={(event) => {
            event.preventDefault()
            handleReferenceCopy(href)
          }}
        >
          {children}
        </button>
      )
    }

    return (
      <div key={`${entry.timestamp}-${index}`} className={`test-message ${roleClass}`}>
        <div className="test-message-role">{speaker}</div>
        <div className="test-message-content">
          <ReactMarkdown components={markdownComponents}>{entry.content}</ReactMarkdown>
        </div>
      </div>
    )
  }

  const handleEndSession = async () => {
    if (!endConfirmPending) {
      setEndConfirmPending(true)
      setTimeout(() => {
        setEndConfirmPending(false)
      }, 5000) // Reset after 5 seconds
      alert(language === 'zh'
        ? '再次点击"结束"即可导出并结束本次学习。'
        : 'Click "End" again to export and finish this session.')
      return
    }

    const filename = language === 'zh' ? '学习对话记录.json' : 'conversation-history.json'
    const exported = await exportConversationState(filename)
    if (!exported) {
      alert(language === 'zh'
        ? '暂无可以导出的对话记录。'
        : 'No conversation history is available to export.')
      setEndConfirmPending(false)
      return
    }
    clearConversationState()
    setEndConfirmPending(false)
    navigate('/completion')
  }

  return (
    <div className="test-container">
      <header className="test-top-bar">
        <div>
          <h1>{language === 'zh' ? 'Bloom 分层测试' : 'Bloom-Level Testing'}</h1>
          <p>
            {language === 'zh'
              ? '考官会根据你的回答依次推进六个层级，并由评估者打分。'
              : 'The examiner guides you through Bloom\'s six levels and relays evaluator feedback.'}
          </p>
        </div>
        <div className="test-top-actions">
          <div className="test-score">
            {language === 'zh' ? '平均得分' : 'Average Score'}: {averageScore.toFixed(1)}/10
          </div>
          <button className="nav-btn" onClick={() => navigate('/game')}>
            {language === 'zh' ? '返回课堂' : 'Back'}
          </button>
          <button className="test-end-btn" onClick={handleEndSession}>
            {language === 'zh'
              ? (endConfirmPending ? '确认结束' : '结束')
              : (endConfirmPending ? 'Confirm End' : 'End')}
          </button>
        </div>
      </header>

      <div className="test-main">
        <div className="left-column">
          <section className="test-panel tasks-panel">
            <div className="panel-header">
              <h2>{language === 'zh' ? '六大任务' : 'Six Tasks'}</h2>
              {allTasksCompleted && (
                <span className="panel-badge">
                  {language === 'zh' ? '全部完成' : 'Completed'}
                </span>
              )}
            </div>
            <div className="tasks-grid">
              {tasks.map(task => {
                const percentage = task.maxPoints
                  ? Math.min(100, ((task.points || 0) / task.maxPoints) * 100)
                  : 0
                const scoreDisplay = Number.isFinite(task.points)
                  ? Number(task.points).toFixed(1).replace(/\.0$/, '')
                  : '0'

                return (
                  <div key={task.id} className="task-item">
                    <div className={`task-circle ${task.completed ? 'completed' : ''}`}>
                      <svg className="task-progress" viewBox="0 0 100 100">
                        <circle className="task-progress-bg" cx="50" cy="50" r="45" />
                        <circle
                          className="task-progress-bar"
                          cx="50"
                          cy="50"
                          r="45"
                          strokeDasharray={`${2 * Math.PI * 45}`}
                          strokeDashoffset={`${2 * Math.PI * 45 * (1 - percentage / 100)}`}
                        />
                      </svg>
                      <div className="task-score">{scoreDisplay}</div>
                    </div>
                    <div className="task-name">{task.name}</div>
                  </div>
                )
              })}
            </div>
          </section>
          <section className="test-panel bloom-intro-panel">
            <div className="bloom-intro-box">
              <h3>{language === 'zh' ? 'Bloom 分类法简介' : 'About Bloom\'s Taxonomy'}</h3>
              <p>
                {language === 'zh'
                  ? 'Bloom 分类法（Bloom\'s Taxonomy）是教育心理学中用于分类教育目标的重要框架，由 Benjamin Bloom 于1956年提出。它将认知能力分为六个层次：记忆（Remember）、理解（Understand）、应用（Apply）、分析（Analyze）、评估（Evaluate）和创造（Create）。从低到高，每个层次代表不同的认知复杂度，帮助教师设计更有效的教学活动和评估方法。'
                  : 'Bloom\'s Taxonomy, proposed by Benjamin Bloom in 1956, is a framework for categorizing educational goals. It divides cognitive abilities into six levels: Remember, Understand, Apply, Analyze, Evaluate, and Create. From lower to higher order, each level represents increasing cognitive complexity, helping educators design effective teaching activities and assessment methods.'}
              </p>
            </div>
          </section>
        </div>

        <section className="test-panel test-chat-panel">
          <div className="panel-header">
            <h2>{language === 'zh' ? '考官对话' : 'Examiner Chat'}</h2>
            {currentTaskLevel && (
              <span className="panel-badge">
                {language === 'zh'
                  ? `待评估层级：${tasks.find(task => task.id === currentTaskLevel)?.name || ''}`
                  : `Pending level: ${tasks.find(task => task.id === currentTaskLevel)?.name || ''}`}
              </span>
            )}
          </div>
          <div className="test-chat-feed">
            {conversation.length === 0 && (
              <div className="test-empty-tip">
                {language === 'zh'
                  ? '向考官打个招呼，他会按照 Bloom 层级来引导你。'
                  : 'Say hello to the examiner to begin the Bloom-level journey.'}
              </div>
            )}
            {conversation.map(renderMessage)}
            {isLoading && (
              <div className="test-message assistant">
                <div className="test-message-role">{examinerName}</div>
                <div className="test-message-content thinking">
                  {language === 'zh' ? '分析中…' : 'Analyzing…'}
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
          <div className="test-input-row">
            <input
              type="text"
              className="message-input"
              placeholder={language === 'zh' ? '输入你的回答或问题…' : 'Type your answer or question…'}
              value={inputValue}
              disabled={isLoading || allTasksCompleted}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            />
            <button
              className="send-btn"
              onClick={handleSend}
              disabled={isLoading || !inputValue.trim() || allTasksCompleted}
            >
              {language === 'zh' ? '发送' : 'Send'}
            </button>
          </div>
        </section>

        <section className="test-panel test-feedback-panel">
          <div className="panel-header">
            <h2>{language === 'zh' ? '反馈记录' : 'Feedback Log'}</h2>
          </div>
          <div className="test-feedback-content">
            {feedbackHistory.length === 0 ? (
              <div className="test-feedback-empty">
                {language === 'zh' ? '暂无反馈' : 'No feedback yet'}
              </div>
            ) : (
              feedbackHistory.map((entry, index) => {
                const isLatest = index === feedbackHistory.length - 1
                const evaluators = entry.evaluators || []
                const hasEvaluators = evaluators.length > 0
                const averageForDisplay = Number.isFinite(entry.averageRawScore)
                  ? entry.averageRawScore
                  : entry.score

                return (
                  <div key={entry.timestamp || index} className="test-feedback-entry">
                    <div className="test-feedback-header">
                      <span className="test-feedback-task">{entry.taskName}</span>
                      <span className="test-feedback-score">{entry.score.toFixed(1)}/10</span>
                    </div>

                    {hasEvaluators && (
                      <div className="test-feedback-evaluators">
                        {evaluators.map(ev => (
                          <div key={ev.id} className="test-feedback-evaluator">
                            <span className="test-feedback-evaluator-label">{ev.label}</span>
                            <span className="test-feedback-evaluator-score">
                              {Number.isFinite(ev.rawScore) ? ev.rawScore.toFixed(1) : '0'}/10
                            </span>
                          </div>
                        ))}
                        <div className="test-feedback-average">
                          {language === 'zh'
                            ? `三位评估者平均分：${Number(averageForDisplay).toFixed(1)}/10`
                            : `Average of three evaluators: ${Number(averageForDisplay).toFixed(1)}/10`}
                        </div>
                      </div>
                    )}

                    <div className="test-feedback-text">
                      {entry.summary || entry.feedback}
                    </div>

                    {/* 只有最新一条反馈时显示控制按钮，始终允许用户选择下一步（评估过程中按钮会被禁用） */}
                    {isLatest && !allTasksCompleted && (
                      <div className="test-feedback-actions">
                        <button
                          type="button"
                          className="test-feedback-btn"
                          disabled={isLoading}
                          onClick={handleAskAnotherQuestion}
                        >
                          {language === 'zh' ? '再来一个问题' : 'Another question'}
                        </button>
                        <button
                          type="button"
                          className="test-feedback-btn primary"
                          disabled={isLoading}
                          onClick={handleGoToNextLevel}
                        >
                          {language === 'zh' ? '进入下一层级' : 'Next level'}
                        </button>
                      </div>
                    )}
                  </div>
                )
              })
            )}
            <div ref={feedbackEndRef} />
          </div>
        </section>
      </div>
      {copyNoticeVisible && (
        <div className="test-copy-notice">
          {language === 'zh'
            ? '已复制，请在测试完成后查看链接'
            : 'Link copied. Please review it after finishing the test.'}
        </div>
      )}
    </div>
  )
}

export default Test

