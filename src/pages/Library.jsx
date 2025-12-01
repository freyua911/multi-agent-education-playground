import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import ReactMarkdown from 'react-markdown'
import { callDeepSeekAPIWithRole } from '../utils/api'
import { getUnifiedConversationHistory, addToUnifiedLog } from '../utils/conversationStorage'
import './Library.css'

function Library({ language, username }) {
  const [summary, setSummary] = useState('')
  const [recommendations, setRecommendations] = useState([])
  const [conversation, setConversation] = useState([])
  const [inputValue, setInputValue] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isLibraryHintOpen, setIsLibraryHintOpen] = useState(false)
  const messagesEndRef = useRef(null)
  const navigate = useNavigate()

  const librarianName = language === 'zh' ? '图书管理员' : 'Librarian'

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [conversation])

  const handleSend = async () => {
    if (!inputValue.trim() || isLoading) return
    const userMessage = inputValue.trim()
    setInputValue('')
    setIsLoading(true)

    const updated = [...conversation, { role: 'user', content: userMessage }]
    setConversation(updated)

    // 添加到统一日志
    addToUnifiedLog({
      role: 'user',
      content: userMessage,
      agentType: 'user',
      speaker: username || 'User'
    })

    try {
      // 获取完整的对话历史作为上下文
      const fullHistory = getUnifiedConversationHistory()
      // 构建消息：先包含完整历史，然后是当前对话
      const apiMessages = [
        ...fullHistory.map(msg => ({
          role: msg.role === 'teacher' || msg.role === 'peer' || msg.role === 'examiner' || msg.role === 'feedback' 
            ? 'assistant' 
            : msg.role,
          content: msg.content
        })),
        ...updated.map(msg => ({
          role: msg.role,
          content: msg.content
        }))
      ]
      const response = await callDeepSeekAPIWithRole(apiMessages, 'librarian', language)
      
      // 解析响应：分离推荐书概要和推荐思路
      const separator = language === 'zh' ? '---推荐思路和总结---' : '---Recommendation Summary---'
      const separatorIndex = response.indexOf(separator)
      
      let bookRecommendationsText = ''
      let recommendationSummary = ''
      
      if (separatorIndex !== -1) {
        // 找到分隔符，分离两部分
        bookRecommendationsText = response.substring(0, separatorIndex).trim()
        recommendationSummary = response.substring(separatorIndex + separator.length).trim()
      } else {
        // 没有找到分隔符，尝试其他方式解析
        // 假设最后一段是推荐思路，其余是推荐书
        const parts = response.split(/\n{2,}/)
        if (parts.length > 1) {
          recommendationSummary = parts[parts.length - 1]
          bookRecommendationsText = parts.slice(0, -1).join('\n\n')
        } else {
          bookRecommendationsText = response
        }
      }
      
      // 定义介绍性文字模式（用于过滤）
      const introPatterns = [
        /^Of course[.,]?\s+/i,
        /^Based on your request[.,]?\s+/i,
        /^I have curated[.,]?\s+/i,
        /^These recommendations are designed[.,]?\s+/i,
        /^当然[，,]?\s*/,
        /^根据您的要求[，,]?\s*/,
        /^我已经为您[，,]?\s*/
      ]
      
      // 过滤推荐思路中的介绍性文字
      let cleanedSummary = recommendationSummary || response
      for (const pattern of introPatterns) {
        cleanedSummary = cleanedSummary.replace(pattern, '')
      }
      cleanedSummary = cleanedSummary.trim()
      
      // 将推荐思路添加到对话记录中
      const summaryMessage = { role: 'assistant', content: cleanedSummary }
      setConversation(prev => [...prev, summaryMessage])
      
      // 添加到统一日志（只记录推荐思路部分）
      addToUnifiedLog({
        role: 'assistant',
        content: cleanedSummary,
        agentType: 'librarian',
        speaker: librarianName
      })

      // 清空之前的summary，因为现在不再使用
      setSummary('')

      // 解析推荐书：按空行分割，每本书一个框
      // 过滤掉常见的介绍性文字
      const bookIntroPatterns = [
        /^Of course[.,]?/i,
        /^Based on your request[.,]?/i,
        /^I have curated/i,
        /^These recommendations are designed/i,
        /^当然[，,]?/,
        /^根据您的要求[，,]?/,
        /^我已经为您/i
      ]
      
      const recs = bookRecommendationsText
        .split(/\n{2,}/)
        .map(block => block.trim())
        .filter(block => {
          // 过滤掉纯介绍性段落（不包含书名、作者、链接等特征）
          if (!block) return false
          // 如果段落包含书名特征（括号中的年份）或链接，则保留
          const hasBookInfo = /\([^)]*\d{4}[^)]*\)/.test(block) || /\[.*\]\(https?:\/\//.test(block)
          // 如果段落是纯介绍性文字（匹配常见模式且没有书籍信息），则过滤掉
          const isIntro = bookIntroPatterns.some(pattern => pattern.test(block)) && !hasBookInfo
          return !isIntro
        })
        .filter(Boolean)
      setRecommendations(recs)
    } catch (e) {
      alert(e.message)
    } finally {
      setIsLoading(false)
    }
  }

  const handleReturnToGame = () => {
    navigate('/game')
  }

  const handleStartTest = () => {
    navigate('/test')
  }

  const handleInputKeyDown = (event) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault()
    }
  }

  const libraryHintText = language === 'zh'
    ? '点击按钮进入新房间，再次点击后可以退出。'
    : 'Tap the button to enter the new room; tap it again to exit.'

  return (
    <div className="library-container">
      <header className="library-header">
        <div>
          <h1>{language === 'zh' ? '图书馆' : 'Library'}</h1>
          <p>
            {language === 'zh'
              ? '探索学习资料、阅读推荐并与图书管理员互动。'
              : 'Explore study materials, read tailored suggestions, and chat with the librarian.'}
          </p>
        </div>
      </header>

      <div className="library-content">
        <div className="summary-panel">
          <h2>{language === 'zh' ? '推荐书籍' : 'Recommended Books'}</h2>
          <div className="recommendations-list">
            {recommendations.length === 0 ? (
              <div className="recommendation-placeholder">
                {language === 'zh' ? '推荐书目会显示在这里。' : 'Recommended books will appear here.'}
              </div>
            ) : (
              recommendations.map((rec, index) => (
                <div key={index} className="recommendation-card">
                  <ReactMarkdown>{rec}</ReactMarkdown>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="chat-panel">
          <h2>{language === 'zh' ? '对话记录' : 'Conversation History'}</h2>
          <div className="chat-messages">
            {conversation.map((msg, idx) => (
              <div key={idx} className={`msg ${msg.role}`}>
                <div className="msg-role">{msg.role === 'user' ? username : librarianName}</div>
                <div className="msg-content">
                  <ReactMarkdown>{msg.content}</ReactMarkdown>
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="msg assistant">
                <div className="msg-content thinking">{language === 'zh' ? '思考中...' : 'Thinking...'}</div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        </div>
      </div>

      <footer className="library-bottom">
        <button
          type="button"
          className="library-hint-btn"
          aria-label={language === 'zh' ? '查看图书馆提示' : 'View library hint'}
          onClick={() => setIsLibraryHintOpen(true)}
        >
          ?
        </button>
        <button
          className="nav-btn library-active"
          onClick={handleReturnToGame}
        >
          {language === 'zh' ? '图书馆' : 'Library'}
        </button>
        <button className="nav-btn" onClick={() => navigate('/mindmap')}>
          {language === 'zh' ? '思维导图' : 'Mind Map'}
        </button>
        <textarea
          className="library-input"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleInputKeyDown}
          rows={2}
          placeholder={language === 'zh' ? '输入你的查询...' : 'Type your query...'}
          disabled={isLoading}
        />
        <button
          className="library-send"
          onClick={handleSend}
          disabled={!inputValue.trim() || isLoading}
        >
          {language === 'zh' ? '发送' : 'Send'}
        </button>
        <button
          className="library-test"
          onClick={handleStartTest}
        >
          {language === 'zh' ? '测试' : 'Test'}
        </button>
      </footer>
      {isLibraryHintOpen && (
        <div className="library-hint-overlay" onClick={() => setIsLibraryHintOpen(false)}>
          <div
            className="library-hint-modal"
            onClick={(event) => event.stopPropagation()}
          >
            <button
              className="library-hint-close"
              aria-label={language === 'zh' ? '关闭提示' : 'Close hint'}
              onClick={() => setIsLibraryHintOpen(false)}
            >
              ×
            </button>
            <h3>{language === 'zh' ? '图书馆提示' : 'Library Hint'}</h3>
            <p>{libraryHintText}</p>
          </div>
        </div>
      )}
    </div>
  )
}

export default Library
