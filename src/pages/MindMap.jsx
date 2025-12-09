import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import Viz from 'viz.js'
import { Module, render } from 'viz.js/full.render.js'
import { callDeepSeekAPIWithRole } from '../utils/api'
import { getConversationMessages, getUnifiedConversationHistory } from '../utils/conversationStorage'
import './MindMap.css'

function MindMap({ language, username }) {
  const MAX_HISTORY = 40
  const [conversation, setConversation] = useState(() => getConversationMessages() || [])
  const [isLoading, setIsLoading] = useState(false)
  const [graphCode, setGraphCode] = useState('')
  const [graphSvg, setGraphSvg] = useState('')
  const [graphError, setGraphError] = useState('')
  const [lastGeneratedAt, setLastGeneratedAt] = useState(null)
  const [isLibraryHintOpen, setIsLibraryHintOpen] = useState(false)
  const navigate = useNavigate()
  const vizRef = useRef(null)

  useEffect(() => {
    vizRef.current = new Viz({ Module, render })
    return () => {
      vizRef.current = null
    }
  }, [])

  const fetchConversationHistory = useCallback(() => {
    // 使用统一对话历史
    const messages = (getUnifiedConversationHistory() || []).slice(-MAX_HISTORY)
    setConversation(messages)
    return messages
  }, [])

  const extractGraphviz = (text) => {
    if (!text) return null
    const fenced = text.match(/```(?:dot|graphviz)?\s*([\s\S]*?)```/i)
    if (fenced && fenced[1]) return fenced[1].trim()
    const inline = text.match(/(digraph|graph)\s+[^{]+\{[\s\S]*\}/i)
    if (inline) return inline[0].trim()
    return null
  }

  const renderGraph = async (dot) => {
    if (!dot || !vizRef.current) return
    try {
      const svgString = await vizRef.current.renderString(dot)
      setGraphSvg(svgString)
      setGraphError('')
    } catch (error) {
      vizRef.current = new Viz({ Module, render })
      setGraphSvg('')
      setGraphError(language === 'zh'
        ? `渲染出错：${error.message}`
        : `Render error: ${error.message}`)
    }
  }

  const libraryHintText = language === 'zh'
    ? '点击按钮进入新房间，再次点击后可以退出。'
    : 'Tap the button to enter the new room; tap it again to exit.'

  useEffect(() => {
    fetchConversationHistory()
  }, [fetchConversationHistory])

  const generateMindMap = useCallback(async () => {
    setIsLoading(true)
    setGraphError('')
    setGraphSvg('')

    try {
      const historyMessages = fetchConversationHistory()

      if (!historyMessages.length) {
        setGraphCode('')
        setGraphError(language === 'zh'
          ? '暂无对话记录，无法生成思维导图。'
          : 'No conversation history available for generation.')
        return
      }

      const response = await callDeepSeekAPIWithRole(
        historyMessages.map(({ role, content }) => ({ role, content })),
        'mindmap',
        language
      )

      const dot = extractGraphviz(response)
      if (dot) {
        setGraphCode(dot)
        await renderGraph(dot)
        setLastGeneratedAt(new Date().toISOString())
      } else {
        setGraphCode('')
        setGraphSvg('')
        setGraphError(language === 'zh'
          ? '未从输出中解析到 Graphviz 代码。'
          : 'Could not find Graphviz code in the agent output.')
      }
    } catch (error) {
      setGraphError(error.message)
    } finally {
      setIsLoading(false)
    }
  }, [fetchConversationHistory, language])

  const handleSaveGraph = () => {
    if (!graphSvg) return
    try {
      const blob = new Blob([graphSvg], { type: 'image/svg+xml' })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `mindmap-${new Date().toISOString().replace(/[:.]/g, '-')}.svg`
      link.click()
      URL.revokeObjectURL(url)
    } catch (error) {
      setGraphError(language === 'zh' ? '保存失败，请稍后再试。' : 'Failed to save the mind map. Please try again.')
    }
  }

  const hintText = !conversation.length
    ? (language === 'zh'
        ? '暂无对话记录，请先在课堂中完成一次对话后再生成。'
        : 'No conversation history yet. Have a chat in the classroom before generating.')
    : (language === 'zh'
        ? '点击下方“生成”按钮，会基于你目前的对话生成思维导图。'
        : 'Tap “Generate” below to build a mind map from your latest conversation.')

  return (
    <div className="mindmap-container">
      <header className="mindmap-header">
        <div>
          <h1>{language === 'zh' ? '思维导图' : 'Mind Map'}</h1>
          <p>
            {language === 'zh'
              ? '这是基于我们的历史对话生成的思维导图。'
              : 'This mind map is generated based on our conversation history.'}
          </p>
        </div>
      </header>
      <div className="mindmap-main">
        <div className="mindmap-center">
          <div className="mindmap-graph-area">
            {isLoading && (
              <div className="mm-loading">
                {language === 'zh' ? '生成中，请稍候…' : 'Generating mind map...'}
              </div>
            )}
            {graphSvg ? (
              <div
                className="mindmap-graph"
                dangerouslySetInnerHTML={{ __html: graphSvg }}
              />
            ) : (
              <div className="mm-hint">
                {hintText}
              </div>
            )}
          </div>


          {graphError && (
            <div className="mm-error">{graphError}</div>
          )}
          {conversation.length > 0 && lastGeneratedAt && (
            <div className="mm-meta">
              {language === 'zh'
                ? `基于 ${conversation.length} 条对话生成 · 更新时间 ${new Date(lastGeneratedAt).toLocaleString()}`
                : `Generated from ${conversation.length} turns · Updated ${new Date(lastGeneratedAt).toLocaleString()}`}
              {username && (
                <span className="mm-meta-user">
                  {language === 'zh' ? `（学习者：${username}）` : ` (Learner: ${username})`}
                </span>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="mindmap-bottom">
        <div className="mindmap-nav">
          <button
            type="button"
            className="mindmap-hint-btn"
            aria-label={language === 'zh' ? '查看图书馆提示' : 'View library hint'}
            onClick={() => setIsLibraryHintOpen(true)}
          >
            ?
          </button>
          <button className="nav-btn" onClick={() => navigate('/library')}>
            {language === 'zh' ? '图书馆' : 'Library'}
          </button>
          <button
            className="nav-btn mindmap-active"
            onClick={() => navigate('/game')}
          >
            {language === 'zh' ? '思维导图' : 'Mind Map'}
          </button>
        </div>

        <div className="mindmap-actions">
          <button
            className="mindmap-action-btn"
            onClick={generateMindMap}
            disabled={isLoading}
          >
            {language === 'zh' ? '生成' : 'Generate'}
          </button>
          <button
            className="mindmap-action-btn"
            onClick={handleSaveGraph}
            disabled={!graphSvg}
          >
            {language === 'zh' ? '保存' : 'Save'}
          </button>
          <button
            className="mindmap-test-btn"
            onClick={() => navigate('/test')}
          >
            {language === 'zh' ? '测试' : 'Test'}
          </button>
        </div>
      </div>
      {isLibraryHintOpen && (
        <div className="mindmap-hint-overlay" onClick={() => setIsLibraryHintOpen(false)}>
          <div
            className="mindmap-hint-modal"
            onClick={(event) => event.stopPropagation()}
          >
            <button
              className="mindmap-hint-close"
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

export default MindMap
